const express = require("express");
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const Referral = require("../models/Referral");
const Motorcycle = require("../models/Motorcycle");
const Dealership = require("../models/Dealership");
const { createReferral, serializeReferral } = require("../services/referralService");
const { notifyNewReferral } = require("../services/commissionNotificationService");

/*
  CUSTOMER REFERRALS
  ==================
  A customer points MOTOAI at a dealership for a motorcycle they are
  interested in. The referral is the attribution record that can later
  earn MOTOAI a commission once the dealership confirms the sale.

  The customer never sees commission amounts, rates or internal notes.
*/

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const CUSTOMER_SOURCES = [
    "motorcycle_detail",
    "test_ride",
    "purchase_enquiry",
    "offline_order",
    "compare",
    "homepage",
];

/**
 * POST /api/referrals
 * Create (or reuse) a referral for a motorcycle + dealership.
 */
router.post("/", protect, async (req, res) => {
    try {
        const {
            motorcycleId,
            variantId = null,
            dealershipId,
            source = "motorcycle_detail",
            consentToShare = false,
            contact = {},
            notes = "",
        } = req.body || {};

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "A valid motorcycle is required." });
        }
        if (!isValidId(dealershipId)) {
            return res.status(400).json({ success: false, message: "A valid dealership is required." });
        }
        if (!CUSTOMER_SOURCES.includes(source)) {
            return res.status(400).json({ success: false, message: "Invalid referral source." });
        }

        const [motorcycle, dealership] = await Promise.all([
            Motorcycle.findById(motorcycleId).select("_id name brand image isActive").lean(),
            Dealership.findById(dealershipId).select("_id name city isActive approved").lean(),
        ]);

        if (!motorcycle) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }
        if (!dealership || dealership.isActive === false || dealership.approved === false) {
            return res.status(404).json({ success: false, message: "Dealership is not available." });
        }

        // Contact details are only stored when the customer consents.
        const sharedContact = consentToShare
            ? {
                  name: contact?.name || req.user.name || "",
                  phone: contact?.phone || req.user.phone || "",
                  email: contact?.email || req.user.email || "",
              }
            : {};

        const { referral, created, duplicate } = await createReferral({
            customer: req.user._id,
            motorcycle: motorcycle._id,
            variant: isValidId(variantId) ? variantId : null,
            dealership: dealership._id,
            source,
            consentToShare: !!consentToShare,
            contact: sharedContact,
            notes: String(notes || "").trim().slice(0, 500),
            actor: req.user,
        });

        if (created) {
            // Notifications never block or undo the saved referral.
            notifyNewReferral({ referral, dealership, motorcycle }).catch(() => {});
        }

        res.status(created ? 201 : 200).json({
            success: true,
            message: duplicate
                ? "This referral already exists — we reused it instead of creating a duplicate."
                : "Referral created. The dealership will contact you shortly.",
            duplicate,
            referral: serializeReferral(referral, { viewer: "customer" }),
        });
    } catch (error) {
        console.error("Create referral error:", error.message);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || "Could not create referral.",
        });
    }
});

/**
 * GET /api/referrals/my-referrals
 * The signed-in customer's own referrals (progress only).
 */
router.get("/my-referrals", protect, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

        const filter = { customer: req.user._id };

        const [referrals, total] = await Promise.all([
            Referral.find(filter)
                .populate({ path: "motorcycle", select: "name brand image price" })
                .populate({ path: "dealership", select: "name city" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Math.min(Number(limit), 50))
                .lean(),
            Referral.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: referrals.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            referrals: referrals.map((r) => serializeReferral(r, { viewer: "customer" })),
        });
    } catch (error) {
        console.error("My referrals error:", error.message);
        res.status(500).json({ success: false, message: "Could not load your referrals." });
    }
});

module.exports = router;
