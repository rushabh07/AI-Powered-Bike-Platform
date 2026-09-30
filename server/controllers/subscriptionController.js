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

const {
    isConfigured: razorpayConfigured,
    getClient: getRazorpay,
} = require("../config/razorpay");

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

        // Prevent duplicate active purchases of the SAME plan.
        // Different-plan switches and post-expiry renewals are allowed.
        await effectivePlan(req.user);
        if (
            req.user.aiPlan === "premium" &&
            req.user.aiPlanType === plan &&
            req.user.aiPlanExpiresAt &&
            new Date(req.user.aiPlanExpiresAt) > new Date()
        ) {
            return res.status(409).json({
                success: false,
                code: "ALREADY_PREMIUM",
                message: `You already have an active Premium ${plan} plan until ${new Date(req.user.aiPlanExpiresAt).toLocaleDateString("en-IN")}.`,
                wallet: walletOf(req.user),
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
            // Spec-shaped order object (authoritative id + paise amount)
            order: {
                id: orderId,
                amount: Math.round(amount * 100),
                currency,
            },
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
        // Accept both flat names and Razorpay webhook-style names
        const body = req.body || {};
        const orderId = body.orderId || body.razorpay_order_id;
        const paymentId = body.paymentId || body.razorpay_payment_id;
        const signature = body.signature || body.razorpay_signature;

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
            return res.status(409).json({
                success: false,
                code: "ALREADY_PAID",
                message: "Payment already processed for this order.",
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
        let signatureStored = "";
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

            // Timing-safe comparison (never a plain === on secrets)
            const expectedBuf = Buffer.from(expectedSignature, "utf8");
            const actualBuf = Buffer.from(String(signature), "utf8");
            const signatureOk =
                expectedBuf.length === actualBuf.length &&
                crypto.timingSafeEqual(expectedBuf, actualBuf);

            if (!signatureOk) {
                sub.status = "failed";
                await sub.save();
                return res.status(400).json({
                    success: false,
                    message: "Payment verification failed. Invalid signature.",
                });
            }
            paymentRef = paymentId;
            signatureStored = String(signature);
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
                    razorpaySignature: signatureStored,
                    startedAt,
                    expiresAt,
                },
            },
            { new: true }
        );

        if (!claimed) {
            const current = await Subscription.findById(sub._id).select("status");
            if (current && current.status === "paid") {
                return res.status(409).json({
                    success: false,
                    code: "ALREADY_PAID",
                    message: "Payment already processed for this order.",
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
                paymentId: s.paymentId || "",
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
            active:
                req.user.aiPlan === "premium" &&
                !!req.user.aiPlanExpiresAt &&
                new Date(req.user.aiPlanExpiresAt) > new Date(),
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

// =====================================================
// RAZORPAY WEBHOOK — POST /api/subscription/webhook
// No JWT (Razorpay calls this). Trust comes ONLY from the
// webhook signature (RAZORPAY_WEBHOOK_SECRET). Idempotent:
// already-paid orders are acknowledged without re-activating.
// =====================================================
const razorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: "Webhook is not configured.",
            });
        }

        // Razorpay signs the RAW request body — server.js mounts
        // express.raw() for this path before express.json().
        const rawBody = Buffer.isBuffer(req.body)
            ? req.body
            : null;
        try {
            req.body = rawBody
                ? JSON.parse(rawBody.toString("utf8"))
                : req.body;
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Invalid webhook payload.",
            });
        }

        const signature = req.headers["x-razorpay-signature"];
        if (!signature || !rawBody) {
            return res.status(400).json({
                success: false,
                message: "Missing webhook signature.",
            });
        }

        const expected = crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");

        const expectedBuf = Buffer.from(expected, "utf8");
        const actualBuf = Buffer.from(String(signature), "utf8");
        if (
            expectedBuf.length !== actualBuf.length ||
            !crypto.timingSafeEqual(expectedBuf, actualBuf)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid webhook signature.",
            });
        }

        const event = req.body?.event || "";
        if (event !== "payment.captured" && event !== "order.paid") {
            // Acknowledge everything else without action
            return res.status(200).json({ success: true });
        }

        const entity = req.body?.payload?.payment?.entity || {};
        const orderId = entity.order_id || "";
        const paymentId = entity.id || "";
        if (!orderId) {
            return res.status(200).json({ success: true });
        }

        const sub = await Subscription.findOne({ orderId });
        if (!sub || sub.status === "paid") {
            // Unknown or already handled — idempotent ack
            return res.status(200).json({ success: true });
        }
        if (sub.status !== "created") {
            return res.status(200).json({ success: true });
        }

        const plan = normalizePlan(sub.plan);
        const config = getPlanConfig(plan);
        if (!config) {
            return res.status(200).json({ success: true });
        }

        const startedAt = new Date();
        const expiresAt = new Date(
            startedAt.getTime() + config.days * 24 * 60 * 60 * 1000
        );

        const claimed = await Subscription.findOneAndUpdate(
            { _id: sub._id, status: "created" },
            {
                $set: {
                    status: "paid",
                    paymentId,
                    startedAt,
                    expiresAt,
                },
            },
            { new: true }
        );
        if (!claimed) {
            return res.status(200).json({ success: true });
        }

        const User = require("../models/User");
        await User.findByIdAndUpdate(sub.user, {
            $set: {
                aiPlan: "premium",
                aiPlanType: plan,
                aiTokens: config.tokens,
                aiTokensUsed: 0,
                aiPlanStartedAt: startedAt,
                aiPlanExpiresAt: expiresAt,
            },
        });

        const {
            createNotification,
        } = require("./notificationController");
        await createNotification(
            sub.user,
            "subscription",
            "Premium subscription activated",
            `Premium ${plan} is active with ${config.tokens} AI tokens.`
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        // Never leak internals to the payment provider
        console.error("Webhook error:", error.message);
        return res.status(500).json({ success: false });
    }
};

module.exports = {
    getPlans,
    createOrder,
    verifyPayment,
    getStatus,
    getHistory,
    razorpayWebhook,
};
