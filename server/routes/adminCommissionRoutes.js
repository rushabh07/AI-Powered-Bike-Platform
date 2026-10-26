const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const Dealership = require("../models/Dealership");
const Sale = require("../models/Sale");
const Commission = require("../models/Commission");
const CommissionRule = require("../models/CommissionRule");
const AuditLog = require("../models/AuditLog");
const Referral = require("../models/Referral");
const CommissionPayout = require("../models/CommissionPayout");
const {
    buildCommissionSummary,
    toPaise,
    fromPaise,
    resolvePolicy,
    createCommissionForSale,
    buildCsv,
} = require("../services/commissionService");

const adminOnly = authorize("admin");

router.get("/report.csv", protect, adminOnly, async (req, res) => {
    try {
        const filter = {};
        if (req.query.dealership && isValidId(req.query.dealership)) filter.dealership = req.query.dealership;
        if (req.query.from || req.query.to) {
            filter.createdAt = {};
            if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
            if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
        }
        const rows = await Commission.find(filter)
            .populate({ path: "dealership", select: "name" })
            .populate({ path: "sale", select: "invoiceNo motorcycleName saleDate saleAmountMeaning eligibleAmount customerName" })
            .sort({ createdAt: -1 }).limit(10000).lean();
        const csv = buildCsv([
            { label: "Commission ID", key: "_id" },
            { label: "Referral ID", value: (row) => row.referral || "" },
            { label: "Dealership", value: (row) => row.dealership?.name || "" },
            { label: "Invoice", value: (row) => row.sale?.invoiceNo || "" },
            { label: "Motorcycle", value: (row) => row.sale?.motorcycleName || "" },
            { label: "Sale Date", value: (row) => row.sale?.saleDate || "" },
            { label: "Eligible Amount", value: (row) => row.saleAmount },
            { label: "Commission Amount", value: (row) => row.commissionAmount },
            { label: "Status", key: "status" },
            { label: "Created At", key: "createdAt" },
        ], rows);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=motoai-commission-report.csv");
        res.status(200).send(csv);
    } catch (error) {
        console.error("Commission CSV export error:", error.message);
        res.status(500).json({ success: false, message: "Could not export commission report." });
    }
});

// GET /api/admin/commissions/summary — database-backed referral and ledger totals.
router.get("/summary", protect, adminOnly, async (_req, res) => {
    try {
        res.status(200).json({ success: true, summary: await buildCommissionSummary() });
    } catch (error) {
        console.error("Commission summary error:", error.message);
        res.status(500).json({ success: false, message: "Could not load commission summary." });
    }
});

// GET /api/admin/commissions/referrals — paginated admin referral register.
router.get("/referrals", protect, adminOnly, async (req, res) => {
    try {
        const { status, dealership, search = "", page = 1, limit = 20 } = req.query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
        const filter = {};
        if (status && Referral.STATUSES.includes(status)) filter.status = status;
        if (dealership && isValidId(dealership)) filter.dealership = dealership;
        if (String(search).trim()) {
            const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = new RegExp(escaped, "i");
            filter.$or = [{ referralCode: rx }, { "contact.name": rx }, { "contact.phone": rx }];
        }
        const [referrals, total] = await Promise.all([
            Referral.find(filter)
                .populate({ path: "dealership", select: "name city" })
                .populate({ path: "motorcycle", select: "name brand" })
                .populate({ path: "customer", select: "name email phone" })
                .sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
            Referral.countDocuments(filter),
        ]);
        res.status(200).json({ success: true, referrals, total, page: pageNumber, pages: Math.ceil(total / pageSize) || 1 });
    } catch (error) {
        console.error("Admin referrals list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load referrals." });
    }
});

router.patch("/referrals/:id/dispute", protect, adminOnly, async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid referral ID." });
        const referral = await Referral.findById(req.params.id);
        if (!referral) return res.status(404).json({ success: false, message: "Referral not found." });
        const disputed = req.body?.disputed === true;
        const reason = String(req.body?.reason || "").trim();
        if (disputed && !reason) return res.status(400).json({ success: false, message: "A dispute reason is required." });
        referral.disputed = disputed;
        if (disputed) referral.disputeReason = reason.slice(0, 500);
        else {
            referral.resolvedBy = req.user._id;
            referral.resolvedAt = new Date();
        }
        referral.updatedBy = req.user._id;
        await referral.save();
        audit(req.user._id, disputed ? "referral.dispute" : "referral.resolve", "Referral", referral._id, referral.dealership, reason || "Dispute resolved");
        return res.status(200).json({ success: true, referral });
    } catch (error) {
        console.error("Referral dispute update error:", error.message);
        return res.status(500).json({ success: false, message: "Could not update referral dispute." });
    }
});

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── Helpers ────────────────────────────────────────────────────────────────

const audit = (actor, action, entity, entityId, dealership, details) => {
    AuditLog.create({ actor, action, entity, entityId, dealership, details }).catch((e) =>
        console.error("Commission audit write failed:", e.message)
    );
};

// ─── COMMISSION RULES ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/commissions/rules
 * List all commission rules with dealership info
 */
router.get("/rules", protect, adminOnly, async (req, res) => {
    try {
        const { search = "", page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Get all dealerships (optionally filtered)
        const dealerFilter = {};
        if (search.trim()) {
            dealerFilter.$or = [
                { name: new RegExp(search.trim(), "i") },
                { city: new RegExp(search.trim(), "i") },
            ];
        }

        const [dealerships, totalDealerships] = await Promise.all([
            Dealership.find(dealerFilter).select("name city email phone isActive").sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
            Dealership.countDocuments(dealerFilter),
        ]);

        // Get all rules for these dealerships
        const dealershipIds = dealerships.map((d) => d._id);
        const rules = await CommissionRule.find({ dealership: { $in: dealershipIds } }).sort({ createdAt: -1 }).lean();
        const ruleMap = {};
        for (const r of rules) {
            if (!ruleMap[String(r.dealership)]) ruleMap[String(r.dealership)] = r;
        }

        const result = dealerships.map((d) => ({
            dealership: d,
            rule: ruleMap[String(d._id)] || null,
        }));

        res.status(200).json({
            success: true,
            count: result.length,
            total: totalDealerships,
            page: Number(page),
            pages: Math.ceil(totalDealerships / Number(limit)) || 1,
            data: result,
        });
    } catch (error) {
        console.error("Commission rules list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load commission rules." });
    }
});

/**
 * PUT /api/admin/commissions/rules/:dealershipId
 * Upsert commission rule for a dealership (admin only)
 */
router.put("/rules/:dealershipId", protect, adminOnly, async (req, res) => {
    try {
        const { dealershipId } = req.params;
        if (!isValidId(dealershipId)) {
            return res.status(400).json({ success: false, message: "Invalid dealership ID." });
        }

        const {
            ruleType, ruleValue, isActive, notes,
            eligibleAmountBasis = "final_invoice",
            effectiveFrom = null, effectiveTo = null,
            minEligibleAmount = 0, maxEligibleAmount = 0, maxCommissionAmount = 0,
            payoutDelayDays = 0,
            includesTaxes = true, includesAccessories = false, includesRegistration = false,
        } = req.body || {};

        if (!["fixed", "percentage"].includes(ruleType)) {
            return res.status(400).json({ success: false, message: "ruleType must be 'fixed' or 'percentage'." });
        }
        if (typeof ruleValue !== "number" || !Number.isFinite(ruleValue) || ruleValue <= 0) {
            return res.status(400).json({ success: false, message: "Enter a positive commission amount or rate." });
        }
        if (ruleType === "percentage" && ruleValue > 100) {
            return res.status(400).json({ success: false, message: "Percentage cannot exceed 100." });
        }
        if (!["ex_showroom", "final_invoice"].includes(eligibleAmountBasis)) {
            return res.status(400).json({ success: false, message: "Invalid eligible amount basis." });
        }
        const start = effectiveFrom ? new Date(effectiveFrom) : new Date();
        const end = effectiveTo ? new Date(effectiveTo) : null;
        if (!Number.isFinite(start.getTime()) || (end && (!Number.isFinite(end.getTime()) || end <= start))) {
            return res.status(400).json({ success: false, message: "Policy effective dates are invalid." });
        }
        const numericTerms = { minEligibleAmount, maxEligibleAmount, maxCommissionAmount, payoutDelayDays };
        for (const [field, value] of Object.entries(numericTerms)) {
            if (!Number.isFinite(Number(value)) || Number(value) < 0) {
                return res.status(400).json({ success: false, message: `${field} must be a non-negative number.` });
            }
        }

        const dealership = await Dealership.findById(dealershipId).select("_id name").lean();
        if (!dealership) {
            return res.status(404).json({ success: false, message: "Dealership not found." });
        }

        // Close the previous version at the new start date. Never rewrite
        // the commission terms applied to an already verified sale.
        await CommissionRule.updateMany(
            { dealership: dealershipId, isActive: true, $or: [{ effectiveTo: null }, { effectiveTo: { $gt: start } }] },
            { $set: { effectiveTo: start } }
        );
        const rule = await CommissionRule.create({
            policyKey: `d:${dealershipId}:${start.getTime()}:${Date.now()}`,
            scope: "dealership",
            dealership: dealershipId,
            ruleType,
            ruleValue: Number(ruleValue),
            isActive: isActive !== false,
            notes: String(notes || "").trim().slice(0, 500),
            eligibleAmountBasis,
            effectiveFrom: start,
            effectiveTo: end,
            minEligibleAmount: Number(minEligibleAmount),
            maxEligibleAmount: Number(maxEligibleAmount),
            maxCommissionAmount: Number(maxCommissionAmount),
            payoutDelayDays: Number(payoutDelayDays),
            includesTaxes: includesTaxes === true,
            includesAccessories: includesAccessories === true,
            includesRegistration: includesRegistration === true,
            setBy: req.user._id,
        });

        audit(req.user._id, "commission.rule.set", "CommissionRule", rule._id, dealershipId,
            `${ruleType}:${ruleValue}${ruleType === "percentage" ? "%" : " fixed"}`);

        res.status(200).json({ success: true, message: "Commission rule saved.", rule });
    } catch (error) {
        console.error("Commission rule upsert error:", error.message);
        res.status(500).json({ success: false, message: "Could not save commission rule." });
    }
});

// ─── SALES (admin view) ───────────────────────────────────────────────────────

/**
 * GET /api/admin/commissions/sales
 * All sales across all dealerships with commission status
 */
router.get("/sales", protect, adminOnly, async (req, res) => {
    try {
        const { dealership, verified, commissionStatus, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {};
        if (dealership && isValidId(dealership)) filter.dealership = dealership;
        if (verified !== undefined && verified !== "") filter.verified = verified === "true";

        const [sales, total] = await Promise.all([
            Sale.find(filter)
                .populate({ path: "dealership", select: "name city" })
                .populate({ path: "createdBy", select: "name email" })
                .populate({ path: "verifiedBy", select: "name email" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Sale.countDocuments(filter),
        ]);

        // Attach commission data to each sale
        const saleIds = sales.map((s) => s._id);
        const commissions = await Commission.find({ sale: { $in: saleIds } })
            .populate({ path: "approvedBy", select: "name" })
            .populate({ path: "paidBy", select: "name" })
            .lean();
        const commissionMap = {};
        for (const c of commissions) commissionMap[String(c.sale)] = c;

        let result = sales.map((s) => ({
            ...s,
            commission: commissionMap[String(s._id)] || null,
        }));

        // Filter by commission status if requested
        if (commissionStatus) {
            if (commissionStatus === "none") {
                result = result.filter((s) => !s.commission);
            } else {
                result = result.filter((s) => s.commission?.status === commissionStatus);
            }
        }

        res.status(200).json({
            success: true,
            count: result.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            sales: result,
        });
    } catch (error) {
        console.error("Admin commission sales list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load sales." });
    }
});

/**
 * POST /api/admin/commissions/sales/:saleId/approve
 * Approve a verified sale and create/update commission record.
 * Admin cannot approve sales from their own dealership (security).
 */
router.post("/sales/:saleId/approve", protect, adminOnly, async (req, res) => {
    try {
        const { saleId } = req.params;
        if (!isValidId(saleId)) {
            return res.status(400).json({ success: false, message: "Invalid sale ID." });
        }

        const sale = await Sale.findById(saleId)
            .populate({ path: "motorcycle", select: "brand category" })
            .lean();
        if (!sale) return res.status(404).json({ success: false, message: "Sale not found." });
        if (!sale.verified) {
            return res.status(400).json({ success: false, message: "Sale must be verified before approving commission." });
        }
        if (!sale.referral) {
            return res.status(400).json({ success: false, message: "Walk-in sales without a MOTOAI referral do not earn commission." });
        }
        const referral = await Referral.findOne({ _id: sale.referral, sale: sale._id, dealership: sale.dealership }).lean();
        if (!referral) {
            return res.status(400).json({ success: false, message: "The sale is not linked to a valid referral for this dealership." });
        }
        const attributionDate = sale.saleDate || sale.createdAt;
        if (referral.expiresAt && attributionDate > referral.expiresAt) {
            return res.status(400).json({ success: false, message: "The sale falls outside the referral attribution period." });
        }

        // Prevent duplicate commission
        const existing = await Commission.findOne({ sale: saleId }).lean();
        if (existing && !["pending_verification", "rejected"].includes(existing.status)) {
            return res.status(409).json({ success: false, message: "This sale already has a final commission record." });
        }

        const policy = await resolvePolicy({
            dealershipId: sale.dealership,
            brand: sale.motorcycle?.brand || "",
            category: sale.motorcycle?.category || "",
            at: attributionDate,
        });
        if (!policy) {
            return res.status(400).json({
                success: false,
                message: "No effective commission policy applies to this dealership and motorcycle.",
            });
        }
        if (policy.eligibleAmountBasis !== sale.saleAmountMeaning) {
            return res.status(400).json({
                success: false,
                message: `The policy is based on ${policy.eligibleAmountBasis}; the submitted sale amount is ${sale.saleAmountMeaning}.`,
            });
        }

        const { commission } = await createCommissionForSale({ sale, policy, actor: req.user, referralId: referral._id });
        await Sale.findByIdAndUpdate(sale._id, { $set: { commissionStatus: "approved", commission: commission._id } });
        await Referral.findByIdAndUpdate(referral._id, { $set: { commission: commission._id } });

        audit(req.user._id, "commission.approve", "Commission", commission._id, sale.dealership,
            `sale:${saleId} amountPaise:${commission.commissionAmountPaise}`);

        res.status(200).json({
            success: true,
            message: "Commission approved.",
            commission,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "Commission already exists for this sale." });
        }
        console.error("Commission approve error:", error.message);
        res.status(500).json({ success: false, message: "Could not approve commission." });
    }
});

/**
 * POST /api/admin/commissions/sales/:saleId/reject
 * Reject a commission (must be in 'approved' status)
 */
router.post("/sales/:saleId/reject", protect, adminOnly, async (req, res) => {
    try {
        const { saleId } = req.params;
        if (!isValidId(saleId)) {
            return res.status(400).json({ success: false, message: "Invalid sale ID." });
        }

        const { reason } = req.body;
        if (!String(reason || "").trim()) {
            return res.status(400).json({ success: false, message: "Rejection reason is required." });
        }

        const commission = await Commission.findOne({ sale: saleId });
        if (!commission) {
            return res.status(404).json({ success: false, message: "No commission found for this sale." });
        }
        if (commission.status === "paid") {
            return res.status(400).json({ success: false, message: "Cannot reject a paid commission." });
        }

        commission.status = "rejected";
        commission.rejectedBy = req.user._id;
        commission.rejectedAt = new Date();
        commission.rejectionReason = String(reason).trim().slice(0, 500);
        await commission.save();
        await Sale.findByIdAndUpdate(saleId, { $set: { commissionStatus: "rejected" } });

        audit(req.user._id, "commission.reject", "Commission", commission._id, commission.dealership,
            `sale:${saleId} reason:${reason}`);

        res.status(200).json({ success: true, message: "Commission rejected.", commission });
    } catch (error) {
        console.error("Commission reject error:", error.message);
        res.status(500).json({ success: false, message: "Could not reject commission." });
    }
});

/**
 * POST /api/admin/commissions/:commissionId/payout
 * Record a payout for an approved commission
 */
router.post("/:commissionId/payout", protect, adminOnly, async (req, res) => {
    try {
        const { commissionId } = req.params;
        if (!isValidId(commissionId)) {
            return res.status(400).json({ success: false, message: "Invalid commission ID." });
        }

        const { paymentReference, paymentNotes, paidAt, method = "bank_transfer" } = req.body;
        if (!String(paymentReference || "").trim()) {
            return res.status(400).json({ success: false, message: "Payment reference is required." });
        }
        if (!["bank_transfer", "upi", "cash", "cheque", "adjustment"].includes(method)) {
            return res.status(400).json({ success: false, message: "Invalid payout method." });
        }

        const commission = await Commission.findById(commissionId);
        if (!commission) {
            return res.status(404).json({ success: false, message: "Commission not found." });
        }
        if (!["approved", "payable"].includes(commission.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot record payout for a commission in '${commission.status}' status.`,
            });
        }
        const payoutDate = paidAt ? new Date(paidAt) : new Date();
        if (!Number.isFinite(payoutDate.getTime())) {
            return res.status(400).json({ success: false, message: "Payout date is invalid." });
        }
        if (commission.payableFrom && payoutDate < commission.payableFrom) {
            return res.status(400).json({ success: false, message: "This commission is not payable yet." });
        }
        if (commission.payoutAmountPaise || commission.status === "paid") {
            return res.status(409).json({ success: false, message: "A payout has already been recorded." });
        }

        const amountPaise = commission.commissionAmountPaise || toPaise(commission.commissionAmount);
        const payout = await CommissionPayout.create({
            commission: commission._id,
            dealership: commission.dealership,
            amountPaise,
            amount: fromPaise(amountPaise),
            paidAt: payoutDate,
            reference: String(paymentReference).trim(),
            method,
            notes: String(paymentNotes || "").trim().slice(0, 1000),
            recordedBy: req.user._id,
        });

        commission.status = "paid";
        commission.paidBy = req.user._id;
        commission.paidAt = payoutDate;
        commission.payoutAmountPaise = amountPaise;
        commission.payoutAmount = fromPaise(amountPaise);
        commission.paymentReference = String(paymentReference).trim();
        commission.paymentNotes = String(paymentNotes || "").trim().slice(0, 1000);
        await commission.save();

        await Sale.findByIdAndUpdate(commission.sale, { $set: { commissionStatus: "paid" } });

        audit(req.user._id, "commission.payout", "Commission", commission._id, commission.dealership,
            `ref:${paymentReference} amount:${commission.commissionAmount}`);

        res.status(200).json({ success: true, message: "Payout recorded.", payout, commission });
    } catch (error) {
        console.error("Commission payout error:", error.message);
        res.status(500).json({ success: false, message: "Could not record payout." });
    }
});

router.post("/:commissionId/reverse", protect, adminOnly, async (req, res) => {
    try {
        const { commissionId } = req.params;
        const reason = String(req.body?.reason || "").trim();
        if (!isValidId(commissionId)) return res.status(400).json({ success: false, message: "Invalid commission ID." });
        if (!reason) return res.status(400).json({ success: false, message: "A reversal reason is required." });
        const commission = await Commission.findById(commissionId);
        if (!commission) return res.status(404).json({ success: false, message: "Commission not found." });
        if (commission.status !== "paid") return res.status(400).json({ success: false, message: "Only paid commissions can be reversed." });
        const original = await CommissionPayout.findOne({ commission: commission._id, isReversal: false });
        if (!original) return res.status(409).json({ success: false, message: "No original payout ledger entry exists." });
        const reversal = await CommissionPayout.create({
            commission: commission._id,
            dealership: commission.dealership,
            amountPaise: original.amountPaise,
            amount: original.amount,
            reference: `REV-${commission._id}-${Date.now()}`,
            method: "adjustment",
            notes: reason.slice(0, 1000),
            isReversal: true,
            reversalOf: original._id,
            recordedBy: req.user._id,
        });
        commission.status = "reversed";
        commission.reversedBy = req.user._id;
        commission.reversedAt = new Date();
        commission.reversalReason = reason.slice(0, 500);
        await commission.save();
        await Sale.findByIdAndUpdate(commission.sale, { $set: { commissionStatus: "reversed" } });
        audit(req.user._id, "commission.reverse", "Commission", commission._id, commission.dealership, reason);
        return res.status(200).json({ success: true, message: "Commission reversal recorded.", reversal, commission });
    } catch (error) {
        console.error("Commission reversal error:", error.message);
        return res.status(500).json({ success: false, message: "Could not reverse the commission." });
    }
});

router.get("/:commissionId/audit", protect, adminOnly, async (req, res) => {
    try {
        if (!isValidId(req.params.commissionId)) return res.status(400).json({ success: false, message: "Invalid commission ID." });
        const [commission, entries, payouts] = await Promise.all([
            Commission.findById(req.params.commissionId).select("_id").lean(),
            AuditLog.find({ entity: "Commission", entityId: req.params.commissionId })
                .populate({ path: "actor", select: "name email" }).sort({ createdAt: -1 }).limit(100).lean(),
            CommissionPayout.find({ commission: req.params.commissionId })
                .populate({ path: "recordedBy", select: "name email" }).sort({ createdAt: 1 }).lean(),
        ]);
        if (!commission) return res.status(404).json({ success: false, message: "Commission not found." });
        return res.status(200).json({ success: true, entries, payouts });
    } catch (error) {
        console.error("Commission audit read error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load commission audit history." });
    }
});

// ─── COMMISSIONS LIST (admin) ─────────────────────────────────────────────────

/**
 * GET /api/admin/commissions
 * All commissions with optional filters
 */
router.get("/", protect, adminOnly, async (req, res) => {
    try {
        const { dealership, status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {};
        if (dealership && isValidId(dealership)) filter.dealership = dealership;
        if (status && Commission.STATUSES.includes(status)) filter.status = status;

        const [commissions, total] = await Promise.all([
            Commission.find(filter)
                .populate({ path: "dealership", select: "name city" })
                .populate({ path: "sale", select: "invoiceNo customerName motorcycleName amount paymentMethod" })
                .populate({ path: "approvedBy", select: "name email" })
                .populate({ path: "paidBy", select: "name email" })
                .populate({ path: "rejectedBy", select: "name email" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Commission.countDocuments(filter),
        ]);

        // Summary stats
        const [totalApproved, totalPaid, totalAmounts] = await Promise.all([
            Commission.countDocuments({ ...filter, status: { $in: ["approved", "payable"] } }),
            Commission.countDocuments({ ...filter, status: "paid" }),
            Commission.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$status",
                        total: { $sum: "$commissionAmount" },
                    },
                },
            ]),
        ]);

        const amountByStatus = {};
        for (const a of totalAmounts) amountByStatus[a._id] = a.total;

        res.status(200).json({
            success: true,
            count: commissions.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            summary: {
                totalApproved,
                totalPaid,
                pendingAmount: (amountByStatus.approved || 0) + (amountByStatus.payable || 0),
                paidAmount: amountByStatus.paid || 0,
            },
            commissions,
        });
    } catch (error) {
        console.error("Admin commissions list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load commissions." });
    }
});

/**
 * GET /api/admin/commissions/report
 * Per-dealership commission summary for reporting
 */
router.get("/report", protect, adminOnly, async (req, res) => {
    try {
        const summary = await Commission.aggregate([
            {
                $group: {
                    _id: { dealership: "$dealership", status: "$status" },
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$commissionAmount" },
                },
            },
            {
                $group: {
                    _id: "$_id.dealership",
                    statuses: {
                        $push: {
                            status: "$_id.status",
                            count: "$count",
                            totalAmount: "$totalAmount",
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "dealerships",
                    localField: "_id",
                    foreignField: "_id",
                    as: "dealership",
                },
            },
            { $unwind: { path: "$dealership", preserveNullAndEmptyArrays: true } },
            { $sort: { "dealership.name": 1 } },
        ]);

        res.status(200).json({ success: true, count: summary.length, report: summary });
    } catch (error) {
        console.error("Commission report error:", error.message);
        res.status(500).json({ success: false, message: "Could not generate report." });
    }
});

module.exports = router;
