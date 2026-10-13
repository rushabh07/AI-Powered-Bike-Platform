const express = require("express");

const {
    getMotorcycleReviews,
    createReview,
    updateReview,
    deleteReview,
    getMyReviews,
} = require("../controllers/reviewController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/motorcycle/:motorcycleId", getMotorcycleReviews);
router.get("/my", protect, getMyReviews);
router.post("/", protect, createReview);
router.put("/:reviewId", protect, updateReview);
router.delete("/:reviewId", protect, deleteReview);

module.exports = router;
