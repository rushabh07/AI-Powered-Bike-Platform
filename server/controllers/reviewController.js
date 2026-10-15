const mongoose = require("mongoose");
const Review = require("../models/Review");
const Motorcycle = require("../models/Motorcycle");
const BikeEnquiry = require("../models/BikeEnquiry");

const findCompletedPurchase = (userId, motorcycleId) =>
    BikeEnquiry.findOne({
        user: userId,
        motorcycle: motorcycleId,
        enquiryType: "purchase",
        status: "completed",
    })
        .select("_id enquiryId status")
        .lean();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const CATEGORIES = ["performance", "handling", "design", "mileage", "comfort"];

const shapeReview = (r) => ({
    _id: r._id,
    title: r.title,
    category: r.category,
    rating: r.rating,
    comment: r.comment,
    isExpert: r.isExpert,
    verifiedPurchase: !!r.verifiedPurchase,
    dealerResponse: r.dealerResponse?.text
        ? { text: r.dealerResponse.text, at: r.dealerResponse.at || null }
        : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user
        ? { _id: r.user._id, name: r.user.name, email: r.user.email, profileImage: r.user.profileImage || "" }
        : null,
    motorcycle: r.motorcycle
        ? { _id: r.motorcycle._id, name: r.motorcycle.name, brand: r.motorcycle.brand, image: r.motorcycle.image || "", images: r.motorcycle.images || [] }
        : null,
});

const getRatingSummary = async (motorcycleId) => {
    const pipeline = [
        { $match: { motorcycle: new mongoose.Types.ObjectId(motorcycleId) } },
        {
            $facet: {
                expert: [
                    { $match: { isExpert: true } },
                    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
                ],
                user: [
                    { $match: { isExpert: false } },
                    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
                ],
                byCategory: [
                    {
                        $group: {
                            _id: "$category",
                            average: { $avg: "$rating" },
                            count: { $sum: 1 },
                        },
                    },
                ],
            },
        },
    ];

    const results = await Review.aggregate(pipeline);
    const data = results[0];

    const expertAvg = data.expert.length > 0 ? Math.round(data.expert[0].average * 10) / 10 : 0;
    const expertCount = data.expert.length > 0 ? data.expert[0].count : 0;
    const userAvg = data.user.length > 0 ? Math.round(data.user[0].average * 10) / 10 : 0;
    const userCount = data.user.length > 0 ? data.user[0].count : 0;

    const categories = {};
    for (const cat of CATEGORIES) {
        const found = data.byCategory.find((c) => c._id === cat);
        categories[cat] = found
            ? { average: Math.round(found.average * 10) / 10, count: found.count }
            : { average: 0, count: 0 };
    }

    const totalCount = expertCount + userCount;
    const overallAvg =
        totalCount > 0
            ? Math.round(((expertAvg * expertCount + userAvg * userCount) / totalCount) * 10) / 10
            : 0;

    return {
        expertRating: expertAvg,
        expertCount,
        userRating: userAvg,
        userCount,
        overallRating: overallAvg,
        totalCount,
        categories,
    };
};

const getMotorcycleReviews = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }

        const reviews = await Review.find({ motorcycle: motorcycleId })
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .sort({ isExpert: -1, createdAt: -1 })
            .lean();

        const summary = await getRatingSummary(motorcycleId);

        const grouped = {};
        for (const cat of CATEGORIES) {
            grouped[cat] = reviews.filter((r) => r.category === cat).map(shapeReview);
        }

        res.status(200).json({
            success: true,
            reviews: reviews.map(shapeReview),
            grouped,
            summary,
        });
    } catch (error) {
        console.error("Get motorcycle reviews error:", error.message);
        res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const createReview = async (req, res) => {
    try {
        const { motorcycleId, title, category, rating, comment } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, message: "Title is required." });
        }
        const numRating = Number(rating);
        if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be 1-5." });
        }
        if (!comment || !String(comment).trim()) {
            return res.status(400).json({ success: false, message: "Comment is required." });
        }
        if (category && !CATEGORIES.includes(category)) {
            return res.status(400).json({ success: false, message: "Invalid category." });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }

        const existing = await Review.findOne({ user: req.user._id, motorcycle: motorcycleId });
        if (existing) {
            return res.status(409).json({ success: false, message: "You have already reviewed this motorcycle." });
        }

        // Purchase verification: only users with a dealership-confirmed
        // completed purchase enquiry for THIS motorcycle may review it.
        // Admins bypass the gate (e.g. expert/moderation reviews) but their
        // reviews are never marked as verified purchases.
        let purchase = null;
        let verified = false;
        if (req.user.role !== "admin") {
            purchase = await findCompletedPurchase(req.user._id, motorcycleId);
            if (!purchase) {
                return res.status(403).json({
                    success: false,
                    code: "PURCHASE_REQUIRED",
                    message: "You can only review motorcycles you have purchased. Purchase this motorcycle to share your review.",
                });
            }
            verified = true;
        }

        const review = await Review.create({
            user: req.user._id,
            motorcycle: motorcycleId,
            title: String(title).trim(),
            category: category || "performance",
            rating: numRating,
            comment: String(comment).trim(),
            isExpert: false,
            verifiedPurchase: verified,
            enquiry: purchase ? purchase._id : null,
        });

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .lean();

        const summary = await getRatingSummary(motorcycleId);

        res.status(201).json({
            success: true,
            message: "Review submitted.",
            review: shapeReview(populated),
            summary,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "You have already reviewed this motorcycle." });
        }
        console.error("Create review error:", error.message);
        res.status(500).json({ success: false, message: "Could not submit review." });
    }
};

const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!isValidId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review ID." });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }
        if (String(review.user) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your review." });
        }

        const { title, category, rating, comment } = req.body;
        if (title !== undefined) review.title = String(title).trim();
        if (category !== undefined) {
            if (!CATEGORIES.includes(category)) {
                return res.status(400).json({ success: false, message: "Invalid category." });
            }
            review.category = category;
        }
        if (rating !== undefined) {
            const numRating = Number(rating);
            if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
                return res.status(400).json({ success: false, message: "Rating must be 1-5." });
            }
            review.rating = numRating;
        }
        if (comment !== undefined) review.comment = String(comment).trim();

        await review.save();

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .lean();

        const summary = await getRatingSummary(review.motorcycle);

        res.status(200).json({
            success: true,
            message: "Review updated.",
            review: shapeReview(populated),
            summary,
        });
    } catch (error) {
        console.error("Update review error:", error.message);
        res.status(500).json({ success: false, message: "Could not update review." });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!isValidId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review ID." });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }
        if (String(review.user) !== String(req.user._id) && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized." });
        }

        const motorcycleId = review.motorcycle;
        await Review.findByIdAndDelete(reviewId);

        const summary = await getRatingSummary(motorcycleId);

        res.status(200).json({ success: true, message: "Review deleted.", summary });
    } catch (error) {
        console.error("Delete review error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete review." });
    }
};

const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user._id })
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, reviews: reviews.map(shapeReview) });
    } catch (error) {
        console.error("Get my reviews error:", error.message);
        res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const getReviewsGrouped = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }

        const reviews = await Review.find({ motorcycle: motorcycleId })
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .sort({ isExpert: -1, createdAt: -1 })
            .lean();

        const summary = await getRatingSummary(motorcycleId);

        const grouped = {};
        for (const cat of CATEGORIES) {
            grouped[cat] = reviews.filter((r) => r.category === cat).map(shapeReview);
        }

        res.status(200).json({ success: true, grouped, summary });
    } catch (error) {
        console.error("Get grouped reviews error:", error.message);
        res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const getReviewEligibility = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const [purchase, existing] = await Promise.all([
            findCompletedPurchase(req.user._id, motorcycleId),
            Review.findOne({ user: req.user._id, motorcycle: motorcycleId }).select("_id").lean(),
        ]);
        res.status(200).json({
            success: true,
            eligible: req.user.role === "admin" || !!purchase,
            hasReviewed: !!existing,
            reviewId: existing ? existing._id : null,
        });
    } catch (error) {
        console.error("Get eligibility error:", error.message);
        res.status(500).json({ success: false, message: "Could not check eligibility." });
    }
};

module.exports = {
    getMotorcycleReviews,
    createReview,
    updateReview,
    deleteReview,
    getMyReviews,
    getReviewsGrouped,
    getReviewEligibility,
};
