const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const {
    getPlansConfig,
    FREE_TOKENS,
} = require("../utils/aiTokens");

const LOW_TOKEN_THRESHOLD = parseInt(
    process.env.LOW_AI_TOKEN_THRESHOLD || "5",
    10
);

// Normalize legacy plan names
const normalizePlan = (plan) => (plan === "premium" ? "monthly" : plan);

/*
========================================
ADMIN SUBSCRIPTION CONTROLLER
Provides complete MongoDB-driven subscription
and AI token analytics, filtering, sorting,
and lifecycle inspection for administrators.
========================================
*/

// =====================================================
// GET SUBSCRIPTION STATS & OVERVIEW
// GET /api/admin/subscription-stats
// =====================================================
const getSubscriptionStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const plansConfig = getPlansConfig();

        const [
            totalUsers,
            activePremiumUsers,
            monthlySubscribers,
            yearlySubscribers,
            freeUsers,
            expiredSubscriptionsCount,
            totalRevenueAgg,
            thisMonthRevenueAgg,
            prevMonthRevenueAgg,
            monthlyRevenueAgg,
            yearlyRevenueAgg,
            userTokenAgg,
            lowTokenUsersCount,
            zeroTokenUsersCount,
            distinctSubscribers,
            allPaidCount,
            allCreatedCount,
            allFailedCount,
        ] = await Promise.all([
            // Total registered users
            User.countDocuments({}),

            // Active Premium users (not expired)
            User.countDocuments({
                aiPlan: "premium",
                aiPlanExpiresAt: { $gt: now },
            }),

            // Active Monthly
            User.countDocuments({
                aiPlan: "premium",
                aiPlanType: "monthly",
                aiPlanExpiresAt: { $gt: now },
            }),

            // Active Yearly
            User.countDocuments({
                aiPlan: "premium",
                aiPlanType: "yearly",
                aiPlanExpiresAt: { $gt: now },
            }),

            // Free or Expired users
            User.countDocuments({
                $or: [
                    { aiPlan: "free" },
                    { aiPlanExpiresAt: { $lte: now } },
                    { aiPlanExpiresAt: null, aiPlan: { $ne: "premium" } },
                ],
            }),

            // Expired subscriptions
            Subscription.countDocuments({
                $or: [
                    { status: "expired" },
                    { status: "paid", expiresAt: { $lte: now } },
                ],
            }),

            // Total revenue from paid subscriptions
            Subscription.aggregate([
                { $match: { status: "paid" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // This month revenue
            Subscription.aggregate([
                {
                    $match: {
                        status: "paid",
                        $or: [
                            { startedAt: { $gte: startOfMonth, $lt: startOfNextMonth } },
                            { createdAt: { $gte: startOfMonth, $lt: startOfNextMonth }, startedAt: null },
                        ],
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // Previous month revenue
            Subscription.aggregate([
                {
                    $match: {
                        status: "paid",
                        $or: [
                            { startedAt: { $gte: startOfPrevMonth, $lt: startOfMonth } },
                            { createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth }, startedAt: null },
                        ],
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // Monthly plan total revenue
            Subscription.aggregate([
                { $match: { status: "paid", plan: { $in: ["monthly", "premium"] } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // Yearly plan total revenue
            Subscription.aggregate([
                { $match: { status: "paid", plan: "yearly" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // Token stats across all users
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRemainingTokens: { $sum: { $ifNull: ["$aiTokens", 0] } },
                        totalTokensUsed: { $sum: { $ifNull: ["$aiTokensUsed", 0] } },
                        avgTokensUsed: { $avg: { $ifNull: ["$aiTokensUsed", 0] } },
                        count: { $sum: 1 },
                    },
                },
            ]),

            // Low token users count
            User.countDocuments({
                aiTokens: { $gt: 0, $lte: LOW_TOKEN_THRESHOLD },
            }),

            // Zero token users count
            User.countDocuments({
                aiTokens: { $lte: 0 },
            }),

            // Distinct users with at least 1 paid subscription
            Subscription.distinct("user", { status: "paid", user: { $ne: null } }),

            // Status counts
            Subscription.countDocuments({ status: "paid" }),
            Subscription.countDocuments({ status: "created" }),
            Subscription.countDocuments({ status: "failed" }),
        ]);

        const totalRevenue = totalRevenueAgg[0]?.total || 0;
        const thisMonthRevenue = thisMonthRevenueAgg[0]?.total || 0;
        const prevMonthRevenue = prevMonthRevenueAgg[0]?.total || 0;
        const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;
        const yearlyRevenue = yearlyRevenueAgg[0]?.total || 0;

        const tokenStats = userTokenAgg[0] || {
            totalRemainingTokens: 0,
            totalTokensUsed: 0,
            avgTokensUsed: 0,
            count: 0,
        };

        const totalTokensAllocated =
            tokenStats.totalRemainingTokens + tokenStats.totalTokensUsed;

        // Plan breakdown details
        const planBreakdown = [
            {
                plan: "Free",
                id: "free",
                users: freeUsers,
                price: 0,
                tokens: FREE_TOKENS,
                activeUsers: freeUsers,
                revenue: 0,
            },
            {
                plan: "Premium Monthly",
                id: "monthly",
                users: monthlySubscribers,
                price: plansConfig.monthly.price,
                tokens: plansConfig.monthly.tokens,
                activeUsers: monthlySubscribers,
                revenue: monthlyRevenue,
            },
            {
                plan: "Premium Yearly",
                id: "yearly",
                users: yearlySubscribers,
                price: plansConfig.yearly.price,
                tokens: plansConfig.yearly.tokens,
                activeUsers: yearlySubscribers,
                revenue: yearlyRevenue,
            },
        ];

        res.status(200).json({
            success: true,
            overview: {
                totalSubscribers: distinctSubscribers.length,
                totalUsers,
                activePremiumUsers,
                monthlySubscribers,
                yearlySubscribers,
                freeUsers,
                expiredSubscriptions: expiredSubscriptionsCount,
                totalRevenue,
                thisMonthRevenue,
                prevMonthRevenue,
                monthlyRevenue,
                yearlyRevenue,
            },
            tokens: {
                totalAllocated: totalTokensAllocated,
                totalUsed: tokenStats.totalTokensUsed,
                totalRemaining: tokenStats.totalRemainingTokens,
                avgUsedPerUser: Number(tokenStats.avgTokensUsed.toFixed(1)),
                lowTokenUsersCount,
                zeroTokenUsersCount,
                lowTokenThreshold: LOW_TOKEN_THRESHOLD,
            },
            statusCounts: {
                paid: allPaidCount,
                created: allCreatedCount,
                failed: allFailedCount,
                expired: expiredSubscriptionsCount,
            },
            planBreakdown,
            pricing: {
                freeTokens: FREE_TOKENS,
                monthly: plansConfig.monthly,
                yearly: plansConfig.yearly,
            },
        });
    } catch (error) {
        console.error("Get subscription stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to calculate subscription statistics.",
        });
    }
};

// =====================================================
// GET SUBSCRIPTION ANALYTICS & CHARTS
// GET /api/admin/subscription-analytics?range=30d
// =====================================================
const getSubscriptionAnalytics = async (req, res) => {
    try {
        const { range = "30d", startDate, endDate } = req.query;
        const now = new Date();
        let fromDate = new Date();
        let toDate = now;

        if (startDate && endDate) {
            fromDate = new Date(startDate);
            toDate = new Date(endDate);
            // End of selected day
            toDate.setHours(23, 59, 59, 999);
        } else if (range === "today") {
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (range === "7d") {
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === "30d") {
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (range === "month") {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (range === "year") {
            fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        } else if (range === "all") {
            fromDate = new Date(0);
        } else {
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Daily paid subscription & revenue timeline
        const timeline = await Subscription.aggregate([
            {
                $match: {
                    status: "paid",
                    createdAt: { $gte: fromDate, $lte: toDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    subscriptions: { $sum: 1 },
                    revenue: { $sum: "$amount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Monthly vs Yearly paid in range
        const planDistributionAgg = await Subscription.aggregate([
            {
                $match: {
                    status: "paid",
                    createdAt: { $gte: fromDate, $lte: toDate },
                },
            },
            {
                $group: {
                    _id: "$plan",
                    count: { $sum: 1 },
                    revenue: { $sum: "$amount" },
                },
            },
        ]);

        // Current active users distribution
        const [activeMonthly, activeYearly, freeUsers] = await Promise.all([
            User.countDocuments({
                aiPlan: "premium",
                aiPlanType: "monthly",
                aiPlanExpiresAt: { $gt: now },
            }),
            User.countDocuments({
                aiPlan: "premium",
                aiPlanType: "yearly",
                aiPlanExpiresAt: { $gt: now },
            }),
            User.countDocuments({
                $or: [
                    { aiPlan: "free" },
                    { aiPlanExpiresAt: { $lte: now } },
                    { aiPlanExpiresAt: null, aiPlan: { $ne: "premium" } },
                ],
            }),
        ]);

        // AI Token summary
        const tokenAgg = await User.aggregate([
            {
                $group: {
                    _id: null,
                    remaining: { $sum: { $ifNull: ["$aiTokens", 0] } },
                    used: { $sum: { $ifNull: ["$aiTokensUsed", 0] } },
                },
            },
        ]);

        const remainingTokens = tokenAgg[0]?.remaining || 0;
        const usedTokens = tokenAgg[0]?.used || 0;
        const allocatedTokens = remainingTokens + usedTokens;

        // Total revenue in the queried range
        const rangeRevenue = timeline.reduce((acc, curr) => acc + curr.revenue, 0);
        const rangeSubscriptions = timeline.reduce(
            (acc, curr) => acc + curr.subscriptions,
            0
        );

        res.status(200).json({
            success: true,
            range,
            fromDate,
            toDate,
            summary: {
                revenue: rangeRevenue,
                subscriptions: rangeSubscriptions,
            },
            timeline: timeline.map((item) => ({
                date: item._id,
                subscriptions: item.subscriptions,
                revenue: item.revenue,
            })),
            activeUserDistribution: [
                { name: "Free", value: freeUsers, color: "#71717a" },
                { name: "Monthly", value: activeMonthly, color: "#f97316" },
                { name: "Yearly", value: activeYearly, color: "#fb923c" },
            ],
            planSalesInRange: planDistributionAgg.map((p) => ({
                plan: normalizePlan(p._id),
                count: p.count,
                revenue: p.revenue,
            })),
            tokenBreakdown: {
                allocated: allocatedTokens,
                used: usedTokens,
                remaining: remainingTokens,
            },
        });
    } catch (error) {
        console.error("Get subscription analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate subscription analytics.",
        });
    }
};

// =====================================================
// GET SUBSCRIPTIONS LIST (PAGINATED, FILTERED, SORTED)
// GET /api/admin/subscriptions
// =====================================================
const getSubscriptions = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const {
            search = "",
            plan = "all",
            status = "all",
            sort = "newest",
            startDate,
            endDate,
            datePreset,
        } = req.query;

        const query = {};

        // Plan filter
        if (plan && plan !== "all") {
            if (plan === "monthly") {
                query.plan = { $in: ["monthly", "premium"] };
            } else if (plan === "yearly") {
                query.plan = "yearly";
            } else {
                query.plan = plan;
            }
        }

        // Status filter
        if (status && status !== "all") {
            query.status = status;
        }

        // Date filtering
        const now = new Date();
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (datePreset && datePreset !== "all") {
            if (datePreset === "today") {
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                query.createdAt = { $gte: todayStart };
            } else if (datePreset === "7d") {
                const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                query.createdAt = { $gte: d7 };
            } else if (datePreset === "30d") {
                const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                query.createdAt = { $gte: d30 };
            }
        }

        // Search by User Name / Email or Razorpay Order ID / Payment ID
        if (search && search.trim()) {
            const term = search.trim();
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: term, $options: "i" } },
                    { email: { $regex: term, $options: "i" } },
                    { phone: { $regex: term, $options: "i" } },
                ],
            }).select("_id");

            const userIds = matchingUsers.map((u) => u._id);

            query.$or = [
                { orderId: { $regex: term, $options: "i" } },
                { paymentId: { $regex: term, $options: "i" } },
                { user: { $in: userIds } },
            ];
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === "oldest") {
            sortOption = { createdAt: 1 };
        } else if (sort === "highest_amount") {
            sortOption = { amount: -1, createdAt: -1 };
        } else if (sort === "lowest_amount") {
            sortOption = { amount: 1, createdAt: -1 };
        } else if (sort === "expiry_soon") {
            sortOption = { expiresAt: 1 };
        } else if (sort === "newest") {
            sortOption = { createdAt: -1 };
        }

        const [total, subscriptions] = await Promise.all([
            Subscription.countDocuments(query),
            Subscription.find(query)
                .populate("user", "name email phone role aiPlan aiPlanType aiTokens aiTokensUsed aiPlanExpiresAt")
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const pages = Math.ceil(total / limit) || 1;

        res.status(200).json({
            success: true,
            subscriptions: subscriptions.map((s) => ({
                _id: s._id,
                user: s.user || {
                    name: "Unknown User",
                    email: "deleted-user@motoai.local",
                    phone: "—",
                    aiPlan: "free",
                    aiTokens: 0,
                    aiTokensUsed: 0,
                },
                plan: normalizePlan(s.plan),
                rawPlan: s.plan,
                amount: s.amount,
                tokens: s.tokens,
                currency: s.currency || "INR",
                orderId: s.orderId || "—",
                paymentId: s.paymentId || "—",
                provider: s.provider || "test",
                status: s.status,
                startedAt: s.startedAt,
                expiresAt: s.expiresAt,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages,
            },
        });
    } catch (error) {
        console.error("Get subscriptions error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions.",
        });
    }
};

// =====================================================
// GET SUBSCRIPTION DETAILS & USER HISTORY
// GET /api/admin/subscriptions/:id
// =====================================================
const getSubscriptionDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid subscription ID format.",
            });
        }

        const subscription = await Subscription.findById(id)
            .populate("user", "name email phone role address profileImage aiPlan aiPlanType aiTokens aiTokensUsed aiPlanStartedAt aiPlanExpiresAt createdAt")
            .lean();

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found.",
            });
        }

        // Fetch user subscription history if user exists
        let userHistory = [];
        if (subscription.user && subscription.user._id) {
            userHistory = await Subscription.find({
                user: subscription.user._id,
            })
                .sort({ createdAt: -1 })
                .lean();
        }

        res.status(200).json({
            success: true,
            subscription: {
                _id: subscription._id,
                plan: normalizePlan(subscription.plan),
                amount: subscription.amount,
                tokens: subscription.tokens,
                currency: subscription.currency || "INR",
                orderId: subscription.orderId || "—",
                paymentId: subscription.paymentId || "—",
                provider: subscription.provider,
                status: subscription.status,
                startedAt: subscription.startedAt,
                expiresAt: subscription.expiresAt,
                createdAt: subscription.createdAt,
            },
            user: subscription.user || null,
            userHistory: userHistory.map((h) => ({
                _id: h._id,
                plan: normalizePlan(h.plan),
                amount: h.amount,
                tokens: h.tokens,
                status: h.status,
                orderId: h.orderId,
                paymentId: h.paymentId,
                startedAt: h.startedAt,
                expiresAt: h.expiresAt,
                createdAt: h.createdAt,
            })),
        });
    } catch (error) {
        console.error("Get subscription details error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscription details.",
        });
    }
};

// =====================================================
// GET SUBSCRIPTIONS EXPIRING SOON
// GET /api/admin/subscriptions/expiring?days=7
// =====================================================
const getExpiringSubscriptions = async (req, res) => {
    try {
        const days = Math.max(1, parseInt(req.query.days, 10) || 7);
        const now = new Date();
        const futureLimit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        // Find active premium users expiring within specified days
        const expiringUsers = await User.find({
            aiPlan: "premium",
            aiPlanExpiresAt: { $gt: now, $lte: futureLimit },
        })
            .select("name email phone role aiPlan aiPlanType aiTokens aiTokensUsed aiPlanStartedAt aiPlanExpiresAt")
            .sort({ aiPlanExpiresAt: 1 })
            .lean();

        const formatted = expiringUsers.map((u) => {
            const msLeft = new Date(u.aiPlanExpiresAt).getTime() - now.getTime();
            const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

            return {
                _id: u._id,
                userId: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone || "—",
                plan: u.aiPlanType || "monthly",
                expiresAt: u.aiPlanExpiresAt,
                remainingDays: daysLeft,
                tokensRemaining: u.aiTokens ?? 0,
                tokensUsed: u.aiTokensUsed ?? 0,
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            thresholdDays: days,
            expiring: formatted,
        });
    } catch (error) {
        console.error("Get expiring subscriptions error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch expiring subscriptions.",
        });
    }
};

// =====================================================
// GET LOW TOKEN USERS
// GET /api/admin/subscriptions/low-tokens?threshold=5
// =====================================================
const getLowTokenUsers = async (req, res) => {
    try {
        const threshold = parseInt(
            req.query.threshold || String(LOW_TOKEN_THRESHOLD),
            10
        );

        const users = await User.find({
            aiTokens: { $lte: threshold },
        })
            .select("name email phone role aiPlan aiPlanType aiTokens aiTokensUsed aiPlanExpiresAt createdAt")
            .sort({ aiTokens: 1, aiTokensUsed: -1 })
            .limit(100)
            .lean();

        res.status(200).json({
            success: true,
            count: users.length,
            threshold,
            users: users.map((u) => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone || "—",
                plan: u.aiPlan === "premium" ? (u.aiPlanType || "monthly") : "free",
                tokensRemaining: u.aiTokens ?? 0,
                tokensUsed: u.aiTokensUsed ?? 0,
                expiresAt: u.aiPlanExpiresAt,
            })),
        });
    } catch (error) {
        console.error("Get low token users error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch low token users.",
        });
    }
};

// =====================================================
// EXPORT SUBSCRIPTIONS AS CSV
// GET /api/admin/subscriptions/export
// =====================================================
const exportSubscriptions = async (req, res) => {
    try {
        const { search = "", plan = "all", status = "all" } = req.query;

        const query = {};
        if (plan && plan !== "all") {
            if (plan === "monthly") query.plan = { $in: ["monthly", "premium"] };
            else if (plan === "yearly") query.plan = "yearly";
            else query.plan = plan;
        }
        if (status && status !== "all") query.status = status;

        if (search && search.trim()) {
            const term = search.trim();
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: term, $options: "i" } },
                    { email: { $regex: term, $options: "i" } },
                ],
            }).select("_id");
            query.$or = [
                { orderId: { $regex: term, $options: "i" } },
                { paymentId: { $regex: term, $options: "i" } },
                { user: { $in: matchingUsers.map((u) => u._id) } },
            ];
        }

        const subscriptions = await Subscription.find(query)
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        const headers = [
            "Subscription ID",
            "User Name",
            "User Email",
            "Plan",
            "Amount (INR)",
            "Tokens",
            "Order ID",
            "Payment ID",
            "Status",
            "Started At",
            "Expires At",
            "Created At",
        ];

        const rows = subscriptions.map((s) => [
            `"${s._id}"`,
            `"${(s.user?.name || "Unknown").replace(/"/g, '""')}"`,
            `"${(s.user?.email || "—").replace(/"/g, '""')}"`,
            `"${normalizePlan(s.plan)}"`,
            s.amount,
            s.tokens || 0,
            `"${s.orderId || "—"}"`,
            `"${s.paymentId || "—"}"`,
            `"${s.status}"`,
            s.startedAt ? `"${new Date(s.startedAt).toISOString()}"` : '""',
            s.expiresAt ? `"${new Date(s.expiresAt).toISOString()}"` : '""',
            `"${new Date(s.createdAt).toISOString()}"`,
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="motoai_subscriptions_${Date.now()}.csv"`
        );
        res.status(200).send(csvContent);
    } catch (error) {
        console.error("Export subscriptions error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export subscriptions.",
        });
    }
};

module.exports = {
    getSubscriptionStats,
    getSubscriptionAnalytics,
    getSubscriptions,
    getSubscriptionDetails,
    getExpiringSubscriptions,
    getLowTokenUsers,
    exportSubscriptions,
};
