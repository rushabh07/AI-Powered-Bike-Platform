const crypto = require("crypto");

const Subscription = require("../models/Subscription");
const {
    getPlanConfig,
    ORDER_TTL_MS,
    planConfig,
    walletOf,
    effectivePlan,
    premiumDaysLeft,
} = require("../utils/aiTokens");

// Normalize legacy plan names
const normalizePlan = (plan) => (plan === "premium" ? "monthly" : plan);

/*
========================================
SUBSCRIPTION CONTROLLER

Backend is the single source of truth for:
- Price
- Token allocation
- Duration / Expiry
- Payment verification and Premium activation

The client NEVER dictates price or token balance.
========================================
*/

const razorpayConfigured = () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpay = () => {
    // Optional dependency — only required when live keys are supplied
    // eslint-disable-next-line global-require, import/no-unresolved
    const Razorpay = require("razorpay");
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// =====================================================
// PUBLIC PLANS — GET /api/subscription/plans
// Publicly viewable pricing and token allowances (no secrets)
// =====================================================
const getPlans = (req, res) => {
    try {
        res.status(200).json({
            success: true,
            ...planConfig(),
        });
    } catch (error) {
        console.error("Get plans error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load subscription plans.",
        });
    }
};

// =====================================================
// CREATE ORDER — POST /api/subscription/create-order
// Body: { plan: "monthly" | "yearly" }
// Price, tokens, and duration are strictly determined by the backend.
// =====================================================
const createOrder = async (req, res) => {
    try {
        const plan = normalizePlan(req.body?.plan);
        const config = getPlanConfig(plan);

        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan. Choose "monthly" or "yearly".',
            });
        }

        const amount = config.price;
        const currency = "INR";

        let orderId;
        let provider = "test";
        let keyId = null;

        if (razorpayConfigured()) {
            try {
                const razorpay = getRazorpay();
                const order = await razorpay.orders.create({
                    amount: Math.round(amount * 100), // convert to paise
                    currency,
                    receipt: `motoai_${req.user._id}_${Date.now()}`,
                });
                orderId = order.id;
                provider = "razorpay";
                keyId = process.env.RAZORPAY_KEY_ID;
            } catch (gwError) {
                console.error("Razorpay order error:", gwError.message);
                return res.status(500).json({
                    success: false,
                    message: "Could not create payment order. Please try again.",
                });
            }
        } else {
            orderId = `order_test_${req.user._id}_${Date.now()}`;
        }

        await Subscription.create({
            user: req.user._id,
            plan,
            amount,
            tokens: config.tokens,
            currency,
            orderId,
            provider,
            status: "created",
        });

        res.status(201).json({
            success: true,
            mode: provider === "razorpay" ? "razorpay" : "test",
            plan,
            orderId,
            amount,
            tokens: config.tokens,
            days: config.days,
            currency,
            // Only safe public key exposed if configured
            ...(keyId ? { keyId } : {}),
        });
    } catch (error) {
        console.error("Create order error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not create payment order.",
        });
    }
};

// =====================================================
// VERIFY PAYMENT — POST /api/subscription/verify-payment
// Test mode: { orderId }
// Razorpay mode: { orderId, paymentId, signature }
// =====================================================
const verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body || {};

        if (!orderId || typeof orderId !== "string") {
            return res.status(400).json({
                success: false,
                message: "orderId is required.",
            });
        }

        // Find pending or existing subscription belonging to this user
        const sub = await Subscription.findOne({
            orderId,
            user: req.user._id,
        });

        if (!sub) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        if (sub.status === "paid") {
            return res.status(200).json({
                success: true,
                message: "Subscription is already active.",
                plan: req.user.aiPlan,
                planType: req.user.aiPlanType,
                tokens: req.user.aiTokens,
                tokensUsed: req.user.aiTokensUsed,
                expiresAt: req.user.aiPlanExpiresAt,
                daysRemaining: premiumDaysLeft(req.user),
                wallet: walletOf(req.user),
            });
        }

        // Validate plan against server configuration
        const plan = normalizePlan(sub.plan);
        const config = getPlanConfig(plan);
        if (!config) {
            sub.status = "failed";
            await sub.save();
            return res.status(400).json({
                success: false,
                message: "Invalid plan configuration.",
            });
        }

        // Verify amount & tokens match current server config
        if (
            sub.amount !== config.price ||
            (sub.tokens ?? config.tokens) !== config.tokens
        ) {
            sub.status = "failed";
            await sub.save();
            return res.status(400).json({
                success: false,
                message: "Order validation failed.",
            });
        }

        // Check if order has expired
        if (Date.now() - new Date(sub.createdAt).getTime() > ORDER_TTL_MS) {
            sub.status = "expired";
            await sub.save();
            return res.status(400).json({
                success: false,
                message: "This order has expired. Please create a new one.",
            });
        }

        let paymentRef = "";
        if (sub.provider === "razorpay") {
            if (!paymentId || !signature) {
                return res.status(400).json({
                    success: false,
                    message: "paymentId and signature are required for verification.",
                });
            }

            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(`${orderId}|${paymentId}`)
                .digest("hex");

            if (expectedSignature !== signature) {
                sub.status = "failed";
                await sub.save();
                return res.status(400).json({
                    success: false,
                    message: "Payment verification failed. Invalid signature.",
                });
            }
            paymentRef = paymentId;
        } else {
            // Test Mode: local confirmation
            paymentRef = paymentId || `pay_test_${Date.now()}`;
        }

        const startedAt = new Date();
        const expiresAt = new Date(
            startedAt.getTime() + config.days * 24 * 60 * 60 * 1000
        );

        // Atomic transition from created -> paid
        const claimed = await Subscription.findOneAndUpdate(
            { _id: sub._id, status: "created" },
            {
                $set: {
                    status: "paid",
                    paymentId: paymentRef,
                    startedAt,
                    expiresAt,
                },
            },
            { new: true }
        );

        if (!claimed) {
            const current = await Subscription.findById(sub._id).select("status");
            if (current && current.status === "paid") {
                return res.status(200).json({
                    success: true,
                    message: "Subscription is already active.",
                    plan: req.user.aiPlan,
                    planType: req.user.aiPlanType,
                    tokens: req.user.aiTokens,
                    tokensUsed: req.user.aiTokensUsed,
                    expiresAt: req.user.aiPlanExpiresAt,
                    daysRemaining: premiumDaysLeft(req.user),
                    wallet: walletOf(req.user),
                });
            }
            return res.status(400).json({
                success: false,
                message: "This order is no longer payable. Please create a new one.",
            });
        }

        // Activate Premium on User document
        req.user.aiPlan = "premium";
        req.user.aiPlanType = plan;
        req.user.aiTokens = config.tokens;
        req.user.aiTokensUsed = 0;
        req.user.aiPlanStartedAt = startedAt;
        req.user.aiPlanExpiresAt = expiresAt;
        await req.user.save();

        const {
            createNotification,
        } = require("./notificationController");
        await createNotification(
            req.user._id,
            "payment",
            "Payment successful",
            `Your ₹${config.price} Premium ${plan} payment was received.`
        );
        await createNotification(
            req.user._id,
            "subscription",
            "Premium subscription activated",
            `Premium ${plan} is active with ${config.tokens} AI tokens until ${expiresAt.toLocaleDateString("en-IN")}.`
        );

        res.status(200).json({
            success: true,
            message: `Premium ${plan === "yearly" ? "Yearly" : "Monthly"} activated successfully.`,
            plan: req.user.aiPlan,
            planType: req.user.aiPlanType,
            tokens: req.user.aiTokens,
            tokensUsed: req.user.aiTokensUsed,
            expiresAt: req.user.aiPlanExpiresAt,
            daysRemaining: config.days,
            wallet: walletOf(req.user),
        });
    } catch (error) {
        console.error("Verify payment error:", error.message);
        res.status(500).json({
            success: false,
            message: "Payment was not completed. Your subscription has not been activated.",
        });
    }
};

// =====================================================
// HISTORY — GET /api/subscription/history (own only)
// =====================================================
const getHistory = async (req, res) => {
    try {
        const items = await Subscription.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: items.length,
            subscriptions: items.map((s) => ({
                _id: s._id,
                plan: s.plan,
                amount: s.amount,
                tokens: s.tokens,
                currency: s.currency,
                orderId: s.orderId,
                status: s.status,
                startedAt: s.startedAt,
                expiresAt: s.expiresAt,
                createdAt: s.createdAt,
            })),
        });
    } catch (error) {
        console.error("Subscription history error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load subscription history.",
        });
    }
};

// =====================================================
// STATUS — GET /api/subscription/status
// Effective plan (expiry-aware) + wallet for the navbar
// =====================================================
const getStatus = async (req, res) => {
    try {
        await effectivePlan(req.user);
        const daysLeft = premiumDaysLeft(req.user);

        res.status(200).json({
            success: true,
            plan: req.user.aiPlan,
            planType: req.user.aiPlanType || "free",
            tokens: req.user.aiTokens,
            tokensUsed: req.user.aiTokensUsed || 0,
            expiresAt: req.user.aiPlan === "premium" ? req.user.aiPlanExpiresAt : null,
            daysRemaining: daysLeft,
            startedAt: req.user.aiPlan === "premium" ? req.user.aiPlanStartedAt : null,
            wallet: walletOf(req.user),
        });
    } catch (error) {
        console.error("Subscription status error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load subscription status.",
        });
    }
};

module.exports = {
    getPlans,
    createOrder,
    verifyPayment,
    getStatus,
    getHistory,
};
