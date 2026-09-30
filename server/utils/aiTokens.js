const User = require("../models/User");

/*
========================================
AI TOKEN / PLAN HELPERS (backend only)

Backend is the source of truth for plan,
balance, deduction and expiry. The
frontend is never trusted with these.
========================================
*/

const numEnv = (key, fallback, min = 0) => {
    const val = process.env[key];
    if (val === undefined || val === "") return fallback;
    const parsed = parseInt(val, 10);
    if (!Number.isFinite(parsed) || parsed < min) {
        console.warn(`Invalid ${key}="${val}" — using default ${fallback}.`);
        return fallback;
    }
    return parsed;
};

const FREE_TOKENS = numEnv("FREE_AI_TOKENS", 20, 1);

// Plan catalog dynamically read from backend environment variables
const getPlansConfig = () => ({
    monthly: {
        price: numEnv("PREMIUM_MONTHLY_PRICE", 199, 0),
        tokens: numEnv("PREMIUM_MONTHLY_TOKENS", 500, 1),
        days: numEnv("PREMIUM_MONTHLY_DAYS", 30, 1),
    },
    yearly: {
        price: numEnv("PREMIUM_YEARLY_PRICE", 1999, 0),
        tokens: numEnv("PREMIUM_YEARLY_TOKENS", 6000, 1),
        days: numEnv("PREMIUM_YEARLY_DAYS", 365, 1),
    },
});

const getPlanConfig = (plan) => {
    const plans = getPlansConfig();
    const normalized = plan === "premium" ? "monthly" : plan;
    return plans[normalized] || null;
};

// Pending payment orders expire after 24 hours
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

// Raw LLM tokens per billable AI credit
const TOKENS_PER_CREDIT = numEnv("AI_TOKENS_PER_CREDIT", 100, 1);

// Rough LLM token estimate (~4 characters per token)
const estimateTokens = (text) =>
    Math.max(1, Math.ceil(String(text || "").length / 4));

// Credits for one exchange, from its billable context
const creditsFor = (promptText, replyText) => {
    const promptTokens = estimateTokens(promptText);
    const completionTokens = estimateTokens(replyText);
    const totalTokens = promptTokens + completionTokens;
    return {
        promptTokens,
        completionTokens,
        totalTokens,
        tokensCharged: Math.max(
            1,
            Math.round(totalTokens / TOKENS_PER_CREDIT)
        ),
    };
};

const planConfig = () => {
    const plans = getPlansConfig();
    return {
        freeTokens: numEnv("FREE_AI_TOKENS", 20, 1),
        currency: "INR",
        monthly: { ...plans.monthly },
        yearly: { ...plans.yearly },
        // Legacy aliases
        premiumTokens: plans.monthly.tokens,
        price: plans.monthly.price,
        days: plans.monthly.days,
    };
};

// Ensure token fields exist on legacy records
const ensureTokenFields = async (user) => {
    let changed = false;
    const freeDefault = numEnv("FREE_AI_TOKENS", 20, 1);

    if (user.aiPlan !== "free" && user.aiPlan !== "premium") {
        user.aiPlan = "free";
        changed = true;
    }
    if (typeof user.aiTokens !== "number") {
        user.aiTokens = freeDefault;
        changed = true;
    }
    if (typeof user.aiTokensUsed !== "number") {
        user.aiTokensUsed = 0;
        changed = true;
    }
    if (user.aiPlanExpiresAt === undefined) {
        user.aiPlanExpiresAt = null;
        changed = true;
    }
    if (
        user.aiPlanType !== "free" &&
        user.aiPlanType !== "monthly" &&
        user.aiPlanType !== "yearly"
    ) {
        user.aiPlanType = user.aiPlan === "premium" ? "monthly" : "free";
        changed = true;
    }
    if (user.aiPlanStartedAt === undefined) {
        user.aiPlanStartedAt = null;
        changed = true;
    }
    if (changed) await user.save();
    return user;
};

// Downgrade expired premium → free (checked on every protected AI & status request)
const effectivePlan = async (user) => {
    await ensureTokenFields(user);
    const freeDefault = numEnv("FREE_AI_TOKENS", 20, 1);

    if (
        user.aiPlan === "premium" &&
        (!user.aiPlanExpiresAt || new Date(user.aiPlanExpiresAt) <= new Date())
    ) {
        user.aiPlan = "free";
        user.aiPlanType = "free";
        user.aiPlanStartedAt = null;
        user.aiPlanExpiresAt = null;
        if (user.aiTokens > freeDefault) {
            user.aiTokens = freeDefault;
        }
        if (user.aiTokens < 0) {
            user.aiTokens = 0;
        }
        await user.save();
    }

    return user.aiPlan;
};

// Whole days left on a premium plan (null when free/expired)
const premiumDaysLeft = (user) => {
    if (
        user.aiPlan !== "premium" ||
        !user.aiPlanExpiresAt ||
        new Date(user.aiPlanExpiresAt) <= new Date()
    ) {
        return null;
    }
    return Math.max(
        0,
        Math.ceil(
            (new Date(user.aiPlanExpiresAt) - new Date()) /
                (24 * 60 * 60 * 1000)
        )
    );
};

const walletOf = (user) => {
    const days = premiumDaysLeft(user);
    return {
        plan: user.aiPlan,
        planType: user.aiPlanType || "free",
        tokens: user.aiTokens,
        tokensUsed: user.aiTokensUsed,
        startedAt: user.aiPlanStartedAt || null,
        expiresAt: user.aiPlanExpiresAt || null,
        daysLeft: user.aiPlan === "premium" ? days : null,
        daysRemaining: user.aiPlan === "premium" ? days : null,
    };
};

const UPGRADE_MESSAGE =
    "You have used all your AI tokens. Upgrade your MOTOAI plan to continue using AI Advisor.";

// Pre-AI gate. Returns null when allowed, otherwise the 402 TOKEN_LIMIT_REACHED payload.
const tokenGate = (user) => {
    if ((user.aiTokens ?? 0) > 0) return null;
    return {
        status: 402,
        body: {
            success: false,
            code: "TOKEN_LIMIT_REACHED",
            message: "You've used all your AI tokens.",
            detail: UPGRADE_MESSAGE,
            showUpgrade: true,
            wallet: walletOf(user),
        },
    };
};

// Deduct `amount` credits after a successful AI response.
// Atomic guarded decrements: full charge when balance covers it,
// otherwise drain remainder to 0. Balance never goes negative.
const deductToken = async (userId, amount = 1) => {
    const charge = Math.max(1, Math.round(Number(amount) || 1));

    const full = await User.findOneAndUpdate(
        { _id: userId, aiTokens: { $gte: charge } },
        { $inc: { aiTokens: -charge, aiTokensUsed: charge } },
        { new: true }
    );
    if (full) return { user: full, charged: charge };

    const current = await User.findById(userId).select("aiTokens");
    const rest = Math.max(0, current?.aiTokens ?? 0);
    if (rest <= 0) return { user: null, charged: 0 };

    const drained = await User.findOneAndUpdate(
        { _id: userId, aiTokens: rest },
        { $inc: { aiTokens: -rest, aiTokensUsed: rest } },
        { new: true }
    );
    if (!drained) return { user: null, charged: 0 };
    return { user: drained, charged: rest };
};

module.exports = {
    FREE_TOKENS,
    ORDER_TTL_MS,
    TOKENS_PER_CREDIT,
    getPlansConfig,
    getPlanConfig,
    planConfig,
    ensureTokenFields,
    effectivePlan,
    premiumDaysLeft,
    walletOf,
    UPGRADE_MESSAGE,
    tokenGate,
    deductToken,
    estimateTokens,
    creditsFor,
};
