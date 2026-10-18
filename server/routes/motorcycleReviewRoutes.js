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
router.post("/:motorcycleId/reviews", protect, createReview);

module.exports = router;
