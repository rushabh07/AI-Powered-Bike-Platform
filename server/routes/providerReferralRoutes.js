const express = require("express");
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const Dealership = require("../models/Dealership");
const Referral = require("../models/Referral");
const Sale = require("../models/Sale");
const Commission = require("../models/Commission");
const Motorcycle = require("../models/Motorcycle");
const {
    applyStatusChange,
    recordContactAttempt,
    serializeReferral,
} = require("../services/referralService");
const { toPaise, fromPaise } = require("../services/commissionService");
const {
    notifyReferralStatus,
    notifySaleSubmitted,
} = require("../services/commissionNotificationService");

/*
  PROVIDER REFERRALS & SALES
  ==========================
  A dealership sees ONLY its own referrals, sales and commissions.
  Ownership is verified on the server for every request — the client
  cannot widen its own scope.

  A dealership may:
    - read and progress its referrals
    - record contact attempts and notes
    - submit a completed sale for admin verification
  A dealership may NOT:
    - approve a sale, approve a commission or record a payout
    - see another dealership's referrals, customers or financials
*/

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

/** Dealership IDs the signed-in user may act on. */
const scopedDealerships = async (user) => {
    if (user.role === "admin") {
        const all = await Dealership.find({}).select("_id").lean();
        return all.map((d) => d._id);
    }
    const list = await Dealership.find({
        $or: [{ owner: user._id }, { "staff.user": user._id }],
    })
        .select("_id")
        .lean();
    return list.map((d) => d._id);
};

/** Panel access guard — providers, admins or dealership staff. */
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

/**
 * GET /api/provider/referrals
 * Referrals assigned to the provider's dealerships.
 */
router.get("/referrals", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { status, search = "", dealership, page = 1, limit = 20 } = req.query;
        const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

        const filter = { dealership: { $in: ids } };
        if (dealership && isValidId(dealership) && ids.map(String).includes(String(dealership))) {
            filter.dealership = dealership;
        }
        if (status && Referral.STATUSES.includes(status)) filter.status = status;
        if (search.trim()) {
            const term = search.trim();
            const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { referralCode: rx },
                { "contact.name": rx },
                { "contact.phone": rx },
                { variantName: rx },
            ];
        }

        const [referrals, total] = await Promise.all([
            Referral.find(filter)
                .populate({ path: "motorcycle", select: "name brand image price" })
                .populate({ path: "customer", select: "name email phone" })
                .populate({ path: "dealership", select: "name city" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Math.min(Number(limit), 100))
                .lean(),
            Referral.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: referrals.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            referrals: referrals.map((r) => {
                // A dealership may see customer contact details only after
                // the customer explicitly consented to sharing them.
                const serialized = serializeReferral(r, {
                    viewer: "provider",
                    includeContact: r.consentToShare === true,
                });
                if (!r.consentToShare) {
                    serialized.customer = r.customer?._id || r.customer || null;
                    serialized.contact = undefined;
                }
                return serialized;
            }),
        });
    } catch (error) {
        console.error("Provider referrals list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load referrals." });
    }
});

/**
 * GET /api/provider/referrals/:id
 */
router.get("/referrals/:id", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const referral = await Referral.findById(req.params.id)
            .populate({ path: "motorcycle", select: "name brand image price" })
            .populate({ path: "dealership", select: "name city" })
            .populate({ path: "customer", select: "name email phone" })
            .lean();

        if (!referral) {
            return res.status(404).json({ success: false, message: "Referral not found." });
        }
        if (!ids.map(String).includes(String(referral.dealership?._id || referral.dealership))) {
            return res.status(403).json({ success: false, message: "This referral belongs to another dealership." });
        }

        const serialized = serializeReferral(referral, {
            viewer: "provider",
            includeContact: referral.consentToShare === true,
        });
        if (!referral.consentToShare) {
            serialized.customer = referral.customer?._id || referral.customer || null;
            serialized.contact = undefined;
        }
        res.status(200).json({ success: true, referral: serialized });
    } catch (error) {
        console.error("Provider referral detail error:", error.message);
        res.status(500).json({ success: false, message: "Could not load the referral." });
    }
});

/**
 * PATCH /api/provider/referrals/:id/status
 * Move a referral forward (contacted, visit_scheduled, negotiation, ...).
 */
router.patch("/referrals/:id/status", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { status, note = "", visitScheduledAt = null } = req.body || {};

        if (!Referral.STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid referral status." });
        }

        const referral = await Referral.findById(req.params.id);
        if (!referral) {
            return res.status(404).json({ success: false, message: "Referral not found." });
        }
        if (!ids.map(String).includes(String(referral.dealership))) {
            return res.status(403).json({ success: false, message: "This referral belongs to another dealership." });
        }
        if (referral.sale) {
            return res.status(400).json({
                success: false,
                message: "This referral is already linked to a submitted sale.",
            });
        }

        await applyStatusChange(referral, {
            status,
            note,
            actor: req.user,
            visitScheduledAt,
        });

        const dealership = await Dealership.findById(referral.dealership).lean();
        notifyReferralStatus({ referral, dealership }).catch(() => {});

        res.status(200).json({
            success: true,
            message: "Referral updated.",
            referral: serializeReferral(referral, { viewer: "provider", includeContact: true }),
        });
    } catch (error) {
        console.error("Provider referral status error:", error.message);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || "Could not update the referral.",
        });
    }
});

/**
 * POST /api/provider/referrals/:id/contact-attempt
 */
router.post("/referrals/:id/contact-attempt", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { channel = "call", note = "" } = req.body || {};

        const referral = await Referral.findById(req.params.id);
        if (!referral) {
            return res.status(404).json({ success: false, message: "Referral not found." });
        }
        if (!ids.map(String).includes(String(referral.dealership))) {
            return res.status(403).json({ success: false, message: "This referral belongs to another dealership." });
        }

        await recordContactAttempt(referral, { channel, note, actor: req.user });

        res.status(200).json({ success: true, message: "Contact attempt recorded." });
    } catch (error) {
        console.error("Provider contact attempt error:", error.message);
        res.status(500).json({ success: false, message: "Could not record the contact attempt." });
    }
});

/**
 * PATCH /api/provider/referrals/:id/notes
 */
router.patch("/referrals/:id/notes", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { notes = "" } = req.body || {};

        const referral = await Referral.findById(req.params.id);
        if (!referral) {
            return res.status(404).json({ success: false, message: "Referral not found." });
        }
        if (!ids.map(String).includes(String(referral.dealership))) {
            return res.status(403).json({ success: false, message: "This referral belongs to another dealership." });
        }

        referral.notes = String(notes).trim().slice(0, 2000);
        referral.updatedBy = req.user._id;
        await referral.save();

        res.status(200).json({ success: true, message: "Notes saved." });
    } catch (error) {
        console.error("Provider referral notes error:", error.message);
        res.status(500).json({ success: false, message: "Could not save the notes." });
    }
});

/**
 * POST /api/provider/sales
 * Submit a completed offline sale.
 *
 * With a referralId  -> a commission record is created in
 *                       "pending_verification" (no amount yet).
 * Without one         -> a normal walk-in sale, no commission ever.
 */
router.post("/sales", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const {
            referralId = null,
            dealershipId,
            customerName,
            customerPhone,
            motorcycleId = null,
            variantId = null,
            variantName = "",
            motorcycleName = "",
            amount,
            saleAmountMeaning = "final_invoice",
            saleDate = null,
            invoiceNo = null,
            paymentMethod = "upi",
            receiptRef = "",
            evidenceUrl = "",
            evidenceName = "",
            deliveryStatus = "pending",
        } = req.body || {};

        if (!dealershipId || !ids.map(String).includes(String(dealershipId))) {
            return res.status(403).json({
                success: false,
                message: "You can only record sales for your own dealership.",
            });
        }
        if (!String(customerName || "").trim()) {
            return res.status(400).json({ success: false, message: "Customer name is required." });
        }
        if (!String(customerPhone || "").trim()) {
            return res.status(400).json({ success: false, message: "Customer phone is required." });
        }
        const saleAmount = Number(amount);
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
            return res.status(400).json({ success: false, message: "A valid sale amount is required." });
        }
        if (saleAmount > 50000000) {
            return res.status(400).json({ success: false, message: "Sale amount exceeds the allowed limit." });
        }
        if (!["ex_showroom", "final_invoice"].includes(saleAmountMeaning)) {
            return res.status(400).json({ success: false, message: "Invalid sale amount meaning." });
        }
        if (!["cash", "upi", "card", "bank_transfer"].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "Invalid payment method." });
        }

        // Referral must belong to this dealership.
        let referral = null;
        if (referralId) {
            referral = await Referral.findById(referralId);
            if (!referral) {
                return res.status(404).json({ success: false, message: "Referral not found." });
            }
            if (!ids.map(String).includes(String(referral.dealership))) {
                return res.status(403).json({
                    success: false,
                    message: "This referral belongs to another dealership.",
                });
            }
            if (referral.sale) {
                return res.status(409).json({
                    success: false,
                    message: "A sale has already been submitted for this referral.",
                });
            }
            if (referral.status === "expired" || referral.expiresAt <= new Date()) {
                return res.status(400).json({ success: false, message: "This referral has expired and cannot attribute a sale." });
            }
            if (motorcycleId && isValidId(motorcycleId) && String(motorcycleId) !== String(referral.motorcycle)) {
                return res.status(400).json({ success: false, message: "The sale motorcycle must match the referral." });
            }
        }

        const parsedSaleDate = saleDate ? new Date(saleDate) : new Date();
        if (!Number.isFinite(parsedSaleDate.getTime()) || parsedSaleDate > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
            return res.status(400).json({ success: false, message: "Sale date is invalid." });
        }

        // Invoice numbers are unique — a retry must not create a second sale.
        let finalInvoiceNo = String(invoiceNo || "").trim();
        if (finalInvoiceNo) {
            const clash = await Sale.exists({ invoiceNo: finalInvoiceNo });
            if (clash) {
                return res.status(409).json({ success: false, message: "That invoice number already exists." });
            }
        } else {
            finalInvoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase()}`;
        }

        // The dealership cannot choose a separate eligible base. Admin
        // verification checks this submitted invoice amount against policy.
        const eligibleAmountPaise = toPaise(saleAmount);

        let motorcycle = null;
        if (motorcycleId && isValidId(motorcycleId)) {
            motorcycle = await Motorcycle.findById(motorcycleId).select("_id name brand").lean();
        }

        const sale = await Sale.create({
            dealership: dealershipId,
            referral: referral ? referral._id : null,
            customer: referral?.customer || null,
            motorcycle: motorcycle?._id || (referral?.motorcycle || null),
            variant: variantId && isValidId(variantId) ? variantId : referral?.variant || null,
            variantName: variantName || referral?.variantName || "",
            customerName: String(customerName).trim(),
            customerPhone: String(customerPhone).trim(),
            motorcycleName: motorcycleName || (motorcycle ? `${motorcycle.brand} ${motorcycle.name}` : ""),
            amount: saleAmount,
            saleAmountMeaning,
            eligibleAmount: fromPaise(eligibleAmountPaise),
            eligibleAmountPaise,
            saleDate: parsedSaleDate,
            invoiceNo: finalInvoiceNo,
            paymentMethod,
            receiptRef: String(receiptRef || "").trim(),
            evidenceUrl: String(evidenceUrl || "").trim().slice(0, 500),
            evidenceName: String(evidenceName || "").trim().slice(0, 200),
            deliveryStatus: ["pending", "ready", "delivered"].includes(deliveryStatus)
                ? deliveryStatus
                : "pending",
            commissionStatus: referral ? "pending_verification" : "none",
            submittedBy: req.user._id,
            createdBy: req.user._id,
        });

        // A referral-backed sale opens a pending commission record. The
        // amount is calculated only after an admin verifies the sale.
        if (referral) {
            const commission = await Commission.create({
                dealership: sale.dealership,
                sale: sale._id,
                referral: referral._id,
                status: "pending_verification",
                saleAmountPaise: eligibleAmountPaise,
                saleAmount: fromPaise(eligibleAmountPaise),
                commissionAmountPaise: 0,
                commissionAmount: 0,
            });

            referral.sale = sale._id;
            referral.commission = commission._id;
            referral.updatedBy = req.user._id;
            if (referral.status !== "converted") {
                referral.status = "converted";
                referral.convertedAt = new Date();
                referral.statusHistory = referral.statusHistory || [];
                referral.statusHistory.push({
                    status: "converted",
                    at: new Date(),
                    by: req.user._id,
                    note: `Sale ${sale.invoiceNo} submitted for verification`,
                });
            }
            referral.dedupeKey = null;
            await referral.save();

            sale.commission = commission._id;
            await sale.save();
        }

        const dealership = await Dealership.findById(dealershipId).lean();
        notifySaleSubmitted({ sale, dealership, referral }).catch(() => {});

        res.status(201).json({
            success: true,
            message: referral
                ? "Sale submitted for admin verification."
                : "Sale recorded.",
            sale,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This sale or invoice number already exists.",
            });
        }
        console.error("Provider sale submit error:", error.message);
        res.status(500).json({ success: false, message: "Could not record the sale." });
    }
});

/**
 * GET /api/provider/sales
 * Sales submitted by the provider's dealerships (newest first).
 */
router.get("/sales", protect, panelOnly, async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

        const filter = { dealership: { $in: ids } };
        if (status && ["none", "pending_verification", "approved", "payable", "paid", "rejected", "disputed", "reversed"].includes(status)) {
            filter.commissionStatus = status;
        }

        const [sales, total] = await Promise.all([
            Sale.find(filter)
                .populate({ path: "referral", select: "referralCode status customer" })
                .populate({ path: "motorcycle", select: "name brand" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Math.min(Number(limit), 100))
                .lean(),
            Sale.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: sales.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            sales,
        });
    } catch (error) {
        console.error("Provider sales list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load sales." });
    }
});

module.exports = router;
