const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const Dealership = require("../models/Dealership");
const Sale = require("../models/Sale");
const Commission = require("../models/Commission");
const CommissionRule = require("../models/CommissionRule");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Returns the list of dealership IDs the signed-in provider may access */
const scopedDealerships = async (user) => {
    if (user.role === "admin") {
        return Dealership.find({}).select("_id").lean().then((d) => d.map((x) => x._id));
    }
    const list = await Dealership.find({
        $or: [{ owner: user._id }, { "staff.user": user._id }],
    }).select("_id").lean();
    return list.map((x) => x._id);
};

/** Panel access guard — providers, admins, or dealership staff */
const panelOnly = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ message: "Unauthorized. Insufficient permissions for this resource." });
        }
        if (["provider", "admin"].includes(req.user.role)) return next();
        const count = await Dealership.countDocuments({ "staff.user": req.user._id });
        if (count > 0) return next();
        return res.status(403).json({ message: "Unauthorized. Insufficient permissions for this resource." });
    } catch {
        return res.status(500).json({ message: "Authorization check failed." });
    }
};

// ─── COMMISSION RULE (read-only for providers) ────────────────────────────────

/**
 * GET /api/provider/commissions/rule?dealershipId=
 * Returns the commission rule for the provider's dealership(s).
 * Providers see their rule but cannot modify it.
 */
router.get("/rule", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { dealershipId } = req.query;

        let filter = { dealership: { $in: ids } };
        if (dealershipId && isValidId(dealershipId) && ids.map(String).includes(dealershipId)) {
            filter = { dealership: dealershipId };
        }

        const rules = await CommissionRule.find(filter)
            .populate({ path: "dealership", select: "name city" })
            .lean();

        res.status(200).json({ success: true, count: rules.length, rules });
    } catch (error) {
        console.error("Provider commission rule fetch error:", error.message);
        res.status(500).json({ success: false, message: "Could not load commission rule." });
    }
});

// ─── PROVIDER COMMISSIONS ─────────────────────────────────────────────────────

/**
 * GET /api/provider/commissions
 * Commissions for this provider's dealerships only
 */
router.get("/", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { status, dealership, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = { dealership: { $in: ids } };
        if (dealership && isValidId(dealership) && ids.map(String).includes(dealership)) {
            filter.dealership = dealership;
        }
        if (status && Commission.STATUSES.includes(status)) filter.status = status;

        const [commissions, total] = await Promise.all([
            Commission.find(filter)
                .populate({ path: "dealership", select: "name city" })
                .populate({ path: "sale", select: "invoiceNo customerName motorcycleName amount paymentMethod createdAt" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Commission.countDocuments(filter),
        ]);

        // Summary stats for provider dashboard
        const [approvedCount, paidCount, totals] = await Promise.all([
            Commission.countDocuments({ ...filter, status: { $in: ["approved", "payable"] } }),
            Commission.countDocuments({ ...filter, status: "paid" }),
            Commission.aggregate([
                { $match: { dealership: { $in: ids }, ...(dealership && isValidId(dealership) ? { dealership: new mongoose.Types.ObjectId(dealership) } : {}) } },
                {
                    $group: {
                        _id: "$status",
                        total: { $sum: "$commissionAmount" },
                    },
                },
            ]),
        ]);

        const amountByStatus = {};
        for (const t of totals) amountByStatus[t._id] = t.total;

        res.status(200).json({
            success: true,
            count: commissions.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            summary: {
                approvedCount,
                paidCount,
                pendingAmount: (amountByStatus.approved || 0) + (amountByStatus.payable || 0),
                paidAmount: amountByStatus.paid || 0,
            },
            commissions,
        });
    } catch (error) {
        console.error("Provider commissions list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load commissions." });
    }
});

/**
 * GET /api/provider/commissions/sales
 * Sales view with commission status for provider's dealerships
 */
router.get("/sales", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { dealership, verified, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = { dealership: { $in: ids } };
        if (dealership && isValidId(dealership) && ids.map(String).includes(dealership)) {
            filter.dealership = dealership;
        }
        if (verified !== undefined && verified !== "") filter.verified = verified === "true";

        const [sales, total] = await Promise.all([
            Sale.find(filter)
                .populate({ path: "dealership", select: "name city" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Sale.countDocuments(filter),
        ]);

        // Attach commission data
        const saleIds = sales.map((s) => s._id);
        const commissions = await Commission.find({ sale: { $in: saleIds } }).lean();
        const commissionMap = {};
        for (const c of commissions) commissionMap[String(c.sale)] = c;

        const result = sales.map((s) => ({
            ...s,
            commission: commissionMap[String(s._id)] || null,
        }));

        res.status(200).json({
            success: true,
            count: result.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            sales: result,
        });
    } catch (error) {
        console.error("Provider commission sales list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load sales." });
    }
});

module.exports = router;
