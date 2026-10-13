const mongoose = require("mongoose");
const Review = require("../models/Review");
const Motorcycle = require("../models/Motorcycle");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const REVIEW_SELECT = "name email profileImage";

const shapeReview = (r) => ({
    _id: r._id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user
        ? {
              _id: r.user._id,
              name: r.user.name,
              email: r.user.email,
              profileImage: r.user.profileImage || "",
          }
        : null,
    motorcycle: r.motorcycle
        ? {
              _id: r.motorcycle._id,
              name: r.motorcycle.name,
              brand: r.motorcycle.brand,
              brandLogo: r.motorcycle.brandLogo || "",
              image: r.motorcycle.image || "",
              images: r.motorcycle.images || [],
              category: r.motorcycle.category,
              price: r.motorcycle.price,
          }
        : null,
});

const getRatingStats = async (motorcycleId) => {
    const stats = await Review.aggregate([
        { $match: { motorcycle: new mongoose.Types.ObjectId(motorcycleId) } },
        {
            $group: {
                _id: null,
                average: { $avg: "$rating" },
                total: { $sum: 1 },
                five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                four: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                three: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                two: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                one: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            },
        },
    ]);

    if (stats.length === 0) {
        return {
            average: 0,
            total: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
    }

    const s = stats[0];
    return {
        average: Math.round(s.average * 10) / 10,
        total: s.total,
        distribution: {
            1: s.one,
            2: s.two,
            3: s.three,
            4: s.four,
            5: s.five,
        },
    };
};

const getMotorcycleReviews = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found.",
            });
        }

        const reviews = await Review.find({ motorcycle: motorcycleId })
            .populate({ path: "user", select: REVIEW_SELECT })
            .sort({ createdAt: -1 })
            .lean();

        const stats = await getRatingStats(motorcycleId);

        res.status(200).json({
            success: true,
            reviews: reviews.map(shapeReview),
            stats,
        });
    } catch (error) {
        console.error("Get motorcycle reviews error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load reviews.",
        });
    }
};

const createReview = async (req, res) => {
    try {
        const { motorcycleId, rating, comment } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found.",
            });
        }

        const numRating = Number(rating);
        if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be a whole number between 1 and 5.",
            });
        }

        const trimmedComment = String(comment || "").trim();
        if (!trimmedComment) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot be empty.",
            });
        }
        if (trimmedComment.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Comment must be 1000 characters or fewer.",
            });
        }

        const existing = await Review.findOne({
            user: req.user._id,
            motorcycle: motorcycleId,
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this motorcycle. Edit your existing review.",
            });
        }

        const review = await Review.create({
            user: req.user._id,
            motorcycle: motorcycleId,
            rating: numRating,
            comment: trimmedComment,
        });

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: REVIEW_SELECT })
            .lean();

        const stats = await getRatingStats(motorcycleId);

        res.status(201).json({
            success: true,
            message: "Review submitted successfully.",
            review: shapeReview(populated),
            stats,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this motorcycle. Edit your existing review.",
            });
        }
        console.error("Create review error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not submit review.",
        });
    }
};

const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!isValidId(reviewId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid review ID.",
            });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (String(review.user) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You can only edit your own reviews.",
            });
        }

        const { rating, comment } = req.body;

        const numRating = Number(rating);
        if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be a whole number between 1 and 5.",
            });
        }

        const trimmedComment = String(comment || "").trim();
        if (!trimmedComment) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot be empty.",
            });
        }
        if (trimmedComment.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Comment must be 1000 characters or fewer.",
            });
        }

        review.rating = numRating;
        review.comment = trimmedComment;
        await review.save();

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: REVIEW_SELECT })
            .lean();

        const stats = await getRatingStats(review.motorcycle);

        res.status(200).json({
            success: true,
            message: "Review updated successfully.",
            review: shapeReview(populated),
            stats,
        });
    } catch (error) {
        console.error("Update review error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not update review.",
        });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!isValidId(reviewId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid review ID.",
            });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (String(review.user) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own reviews.",
            });
        }

        const motorcycleId = review.motorcycle;
        await Review.findByIdAndDelete(reviewId);

        const stats = await getRatingStats(motorcycleId);

        res.status(200).json({
            success: true,
            message: "Review deleted successfully.",
            stats,
        });
    } catch (error) {
        console.error("Delete review error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete review.",
        });
    }
};

const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user._id })
            .populate({ path: "user", select: REVIEW_SELECT })
            .populate({
                path: "motorcycle",
                select: "name brand brandLogo image images category price",
            })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            reviews: reviews.map(shapeReview),
        });
    } catch (error) {
        console.error("Get my reviews error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load your reviews.",
        });
    }
};

module.exports = {
    getMotorcycleReviews,
    createReview,
    updateReview,
    deleteReview,
    getMyReviews,
};
