const express = require("express");

const {
    getMotorcycleReviews,
    getMotorcycleReviewSummary,
    getBulkReviewSummaries,
    createReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    getMyReviews,
    getReviewsGrouped,
    getReviewEligibility,
    adminListReviews,
    adminModerateReview,
    adminRecalculateRatings,
} = require("../controllers/reviewController");
const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Simple in-memory rate limiter for review writes (no new deps).
// 15 write attempts per IP per minute.
const writeBuckets = new Map();
const reviewWriteLimit = (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const windowMs = 60 * 1000;
    const max = 15;
    const hits = (writeBuckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
        return res.status(429).json({ success: false, message: "Too many requests. Please slow down and try again." });
    }
    hits.push(now);
    writeBuckets.set(key, hits);
    next();
};

// Optional auth: attach user when a token is present so the
// public list can flag the viewer's own reviews / helpful votes,
// but never blocks anonymous readers.
const optionalAuth = async (req, _res, next) => {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        try {
            await protect(req, { status: () => ({ json: () => {} }) }, () => {});
        } catch {
            /* anonymous */
        }
        // protect() without a valid user ends the response above;
        // if it called next() then req.user is set. If it errored,
        // fall through anonymously.
        if (!req.user) {
            try {
                const jwt = require("jsonwebtoken");
                const User = require("../models/User");
                const token = header.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select("-password");
                if (user) req.user = user;
            } catch {
                /* anonymous */
            }
        }
    }
    next();
};

// ---- Canonical routes (mounted under /api/reviews) ----
router.get("/motorcycle/:motorcycleId", optionalAuth, getMotorcycleReviews);
router.get("/motorcycle/:motorcycleId/grouped", getReviewsGrouped);
router.get("/motorcycle/:motorcycleId/summary", getMotorcycleReviewSummary);
router.get("/motorcycle/:motorcycleId/eligibility", protect, getReviewEligibility);
// Spec-shaped alias: GET /api/reviews/eligibility/:motorcycleId
router.get("/eligibility/:motorcycleId", protect, getReviewEligibility);
router.get("/summaries", getBulkReviewSummaries);
router.get("/my", protect, getMyReviews);
router.post("/", protect, reviewWriteLimit, requirePermission("reviews.write"), createReview);
router.post("/:reviewId/helpful", protect, toggleHelpful);
router.put("/:reviewId", protect, reviewWriteLimit, requirePermission("reviews.write"), updateReview);
router.delete("/:reviewId", protect, deleteReview);

// ---- Admin moderation ----
router.get("/admin/all", protect, authorize("admin"), requirePermission("reviews.manage"), adminListReviews);
router.patch("/admin/:reviewId/status", protect, authorize("admin"), requirePermission("reviews.manage"), adminModerateReview);
router.post("/admin/recalculate", protect, authorize("admin"), requirePermission("reviews.manage"), adminRecalculateRatings);

module.exports = router;
