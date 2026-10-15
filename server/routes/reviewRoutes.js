const express = require("express");

const {
    getMotorcycleReviews,
    getReviewsGrouped,
    createReview,
    updateReview,
    deleteReview,
    getMyReviews,
    getReviewEligibility,
} = require("../controllers/reviewController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/motorcycle/:motorcycleId", getMotorcycleReviews);
router.get("/motorcycle/:motorcycleId/grouped", getReviewsGrouped);
router.get("/motorcycle/:motorcycleId/eligibility", protect, getReviewEligibility);
router.get("/my", protect, getMyReviews);
router.post("/", protect, createReview);
router.put("/:reviewId", protect, updateReview);
router.delete("/:reviewId", protect, deleteReview);

module.exports = router;
