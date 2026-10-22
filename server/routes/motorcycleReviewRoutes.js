// Spec-shaped nested review endpoints.
// Mounted under /api/motorcycles so clients can use:
//   GET  /api/motorcycles/:motorcycleId/reviews
//   GET  /api/motorcycles/:motorcycleId/reviews/summary
//   POST /api/motorcycles/:motorcycleId/reviews
const express = require("express");

const {
    getMotorcycleReviews,
    getMotorcycleReviewSummary,
    createReview,
} = require("../controllers/reviewController");
const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");

// Reuse the optional-auth behaviour from reviewRoutes.
const optionalAuth = async (req, _res, next) => {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
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
    next();
};

const router = express.Router();

router.get("/:motorcycleId/reviews", optionalAuth, getMotorcycleReviews);
router.get("/:motorcycleId/reviews/summary", getMotorcycleReviewSummary);
// Writing a review is gated by the "reviews.write" permission, exactly
// like the canonical POST /api/reviews route. Both aliases must enforce
// the same rule, otherwise revoking the permission would be bypassed
// by calling this nested endpoint instead.
router.post(
    "/:motorcycleId/reviews",
    protect,
    requirePermission("reviews.write"),
    createReview
);

module.exports = router;
