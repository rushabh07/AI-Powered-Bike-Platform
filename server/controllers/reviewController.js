const mongoose = require("mongoose");
const Review = require("../models/Review");
const Motorcycle = require("../models/Motorcycle");
const BikeEnquiry = require("../models/BikeEnquiry");

let Order = null;
try {
    Order = require("../models/Order");
} catch (e) {
    Order = null;
}

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const CATEGORIES = ["performance", "handling", "design", "mileage", "comfort"];
const STATUSES = ["pending", "approved", "rejected"];

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const COMMENT_MIN = 10;
const COMMENT_MAX = 2000;

// ============================================
// Sanitization (backend is the source of truth)
// ============================================
const sanitizeText = (value, max) => {
    if (value === undefined || value === null) return "";
    return String(value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
};

const validateReviewInput = ({ title, rating, comment, category }) => {
    const cleanTitle = sanitizeText(title, TITLE_MAX);
    const cleanComment = sanitizeText(comment, COMMENT_MAX);
    const numRating = Number(rating);

    if (!cleanTitle || cleanTitle.length < TITLE_MIN) {
        return { error: `Title must be at least ${TITLE_MIN} characters.` };
    }
    if (cleanTitle.length > TITLE_MAX) {
        return { error: `Title must be under ${TITLE_MAX} characters.` };
    }
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return { error: "Rating must be an integer between 1 and 5." };
    }
    if (!cleanComment || cleanComment.length < COMMENT_MIN) {
        return { error: `Review must be at least ${COMMENT_MIN} characters.` };
    }
    if (cleanComment.length > COMMENT_MAX) {
        return { error: `Review must be under ${COMMENT_MAX} characters.` };
    }
    if (category !== undefined && category !== null && category !== "" && !CATEGORIES.includes(category)) {
        return { error: "Invalid review category." };
    }
    return { cleanTitle, cleanComment, numRating };
};

// ============================================
// Verified-purchase verification.
// A review earns the badge ONLY when the backend finds a
// qualifying completed purchase of the EXACT motorcycle:
//
// 1. Order collection (primary proof):
//    user + motorcycle match, orderStatus === "completed",
//    paymentStatus === "paid".
//    - Online orders reach this only after Razorpay payment +
//      dealership fulfilment to completed.
//    - Offline orders reach this only after authorized dealership
//      staff confirm payment and mark the order completed/collected.
//    - Cancelled / pending / failed / refunded orders NEVER qualify.
// 2. BikeEnquiry (legacy proof): purchase enquiry with
//    status === "completed" for the same user + motorcycle.
//
// Test rides, wishlists, "Buy Now" clicks, pending or cancelled
// records never qualify. verifiedPurchase is ALWAYS computed
// here — never trusted from the frontend.
// ============================================
const findQualifyingOrder = (userId, motorcycleId) => {
    if (!Order) return Promise.resolve(null);
    return Order.findOne({
        user: userId,
        motorcycle: motorcycleId,
        orderStatus: "completed",
        paymentStatus: "paid",
    })
        .select("_id orderNumber orderStatus paymentStatus")
        .sort({ updatedAt: -1 })
        .lean();
};

const findCompletedPurchaseEnquiry = (userId, motorcycleId) =>
    BikeEnquiry.findOne({
        user: userId,
        motorcycle: motorcycleId,
        enquiryType: "purchase",
        status: "completed",
    })
        .select("_id enquiryId status")
        .lean();

const findQualifyingPurchase = async (userId, motorcycleId) => {
    const [order, enquiry] = await Promise.all([
        findQualifyingOrder(userId, motorcycleId),
        findCompletedPurchaseEnquiry(userId, motorcycleId),
    ]);
    if (!order && !enquiry) return null;
    return { orderId: order ? order._id : null, enquiryId: enquiry ? enquiry._id : null };
};

// ============================================
// PENDING purchase detection.
// Finds a purchase record for this exact motorcycle that exists but
// has NOT yet completed the offline/online fulfilment flow, so the UI
// can say "your review unlocks once the purchase is completed" instead
// of the generic "purchase this motorcycle" message.
//
// A cancelled order is NOT pending — it is simply not a purchase.
// ============================================
const findPendingPurchase = async (userId, motorcycleId) => {
    if (!Order) return null;

    const order = await Order.findOne({
        user: userId,
        motorcycle: motorcycleId,
        orderStatus: { $nin: ["completed", "cancelled"] },
    })
        .select("_id orderNumber orderStatus paymentStatus paymentMethod deliveryMethod visitDate")
        .sort({ updatedAt: -1 })
        .lean();

    if (order) {
        return {
            kind: "order",
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            deliveryMethod: order.deliveryMethod,
        };
    }

    // Legacy purchase enquiry that has not been completed yet.
    const enquiry = await BikeEnquiry.findOne({
        user: userId,
        motorcycle: motorcycleId,
        enquiryType: "purchase",
        status: { $ne: "completed" },
    })
        .select("_id enquiryId status")
        .sort({ updatedAt: -1 })
        .lean();

    if (enquiry) {
        return {
            kind: "enquiry",
            orderNumber: enquiry.enquiryId,
            orderStatus: enquiry.status,
            paymentStatus: "pending",
            paymentMethod: "offline",
            deliveryMethod: "",
        };
    }

    return null;
};

// Human-readable explanation of why a review is (or is not) unlocked.
const purchaseMessage = (state, pending) => {
    if (state === "completed") return "";
    if (state === "pending" && pending) {
        const status = String(pending.orderStatus || "").replace(/_/g, " ");
        if (pending.paymentStatus === "paid") {
            return `Your payment for this motorcycle is verified. The review unlocks once the dealership marks the bike as collected (currently: ${status}).`;
        }
        return `Your purchase request for this motorcycle is still being processed (${status}). The review unlocks once the payment is verified and the bike is collected.`;
    }
    return "Purchase this motorcycle to share your experience.";
};

// ============================================
// Review shaping (single-bike scoped, safe for public)
// ============================================
const shapeReview = (r, currentUserId = null) => {
    const helpfulBy = Array.isArray(r.helpfulBy) ? r.helpfulBy.map(String) : [];
    return {
        _id: r._id,
        // Fallbacks keep partial / legacy records renderable instead of blank.
        title: (r.title && String(r.title).trim()) || "Customer review",
        category: CATEGORIES.includes(r.category) ? r.category : "performance",
        rating: r.rating,
        comment: r.comment,
        isExpert: !!r.isExpert,
        verifiedPurchase: !!r.verifiedPurchase,
        status: r.status || "approved",
        helpfulCount: r.helpfulCount || 0,
        votedHelpful: currentUserId ? helpfulBy.includes(String(currentUserId)) : false,
        dealerResponse: r.dealerResponse && r.dealerResponse.text
            ? { text: r.dealerResponse.text, at: r.dealerResponse.at || null }
            : null,
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
                image: r.motorcycle.image || "",
                images: r.motorcycle.images || [],
            }
            : typeof r.motorcycle === "object"
                ? r.motorcycle
                : { _id: r.motorcycle },
    };
};

// ============================================
// Rating summary (approved reviews ONLY).
// Returns average, total, 1–5 distribution and legacy
// expert/user/category splits for backward compatibility.
// ============================================
const emptySummary = () => ({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    // Legacy aliases kept for existing clients
    expertRating: 0,
    expertCount: 0,
    userRating: 0,
    userCount: 0,
    overallRating: 0,
    totalCount: 0,
    categories: {
        performance: { average: 0, count: 0 },
        handling: { average: 0, count: 0 },
        design: { average: 0, count: 0 },
        mileage: { average: 0, count: 0 },
        comfort: { average: 0, count: 0 },
    },
});

const getRatingSummary = async (motorcycleId) => {
    const pipeline = [
        {
            $match: {
                motorcycle: new mongoose.Types.ObjectId(motorcycleId),
                status: "approved",
            },
        },
        {
            $facet: {
                overall: [
                    {
                        $group: {
                            _id: null,
                            average: { $avg: "$rating" },
                            count: { $sum: 1 },
                        },
                    },
                ],
                stars: [{ $group: { _id: "$rating", count: { $sum: 1 } } }],
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
    const data = results[0] || { overall: [], stars: [], expert: [], user: [], byCategory: [] };
    const summary = emptySummary();

    const total = data.overall.length > 0 ? data.overall[0].count : 0;
    const avg = data.overall.length > 0 ? data.overall[0].average : 0;
    summary.totalReviews = total;
    summary.totalCount = total;
    summary.averageRating = total > 0 ? Math.round(avg * 10) / 10 : 0;
    summary.overallRating = summary.averageRating;

    for (const row of data.stars) {
        const star = Number(row._id);
        if (star >= 1 && star <= 5) {
            summary.distribution[star] = row.count;
            summary.percentages[star] = total > 0 ? Math.round((row.count / total) * 100) : 0;
        }
    }

    if (data.expert.length > 0) {
        summary.expertRating = Math.round(data.expert[0].average * 10) / 10;
        summary.expertCount = data.expert[0].count;
    }
    if (data.user.length > 0) {
        summary.userRating = Math.round(data.user[0].average * 10) / 10;
        summary.userCount = data.user[0].count;
    }
    for (const cat of CATEGORIES) {
        const found = data.byCategory.find((c) => c._id === cat);
        summary.categories[cat] = found
            ? { average: Math.round(found.average * 10) / 10, count: found.count }
            : { average: 0, count: 0 };
    }
    return summary;
};

// Keep the cached Motorcycle.rating / reviewCount / ratingDistribution
// consistent with approved reviews. Single atomic update — no races.
const syncMotorcycleRating = async (motorcycleId) => {
    try {
        const summary = await getRatingSummary(motorcycleId);
        const distributionArray = [1, 2, 3, 4, 5].map((s) => summary.distribution[s] || 0);
        await Motorcycle.findByIdAndUpdate(motorcycleId, {
            $set: {
                rating: summary.averageRating,
                reviewCount: summary.totalReviews,
                ratingDistribution: distributionArray,
            },
        });
        return summary;
    } catch (err) {
        console.error("syncMotorcycleRating error:", err.message);
        return null;
    }
};

// ============================================
// GET public reviews for ONE motorcycle.
// Only approved reviews. Paginated. Never leaks other bikes.
// ============================================
const getMotorcycleReviews = async (req, res) => {
    try {
        const motorcycleId = req.params.motorcycleId || req.params.id;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const sortKey = String(req.query.sort || "newest");
        const sortMap = {
            newest: { isExpert: -1, createdAt: -1 },
            oldest: { isExpert: -1, createdAt: 1 },
            highest: { rating: -1, createdAt: -1 },
            lowest: { rating: 1, createdAt: -1 },
            helpful: { helpfulCount: -1, createdAt: -1 },
        };
        const sort = sortMap[sortKey] || sortMap.newest;

        const filter = { motorcycle: motorcycleId, status: "approved" };
        if (req.query.rating && [1, 2, 3, 4, 5].includes(Number(req.query.rating))) {
            filter.rating = Number(req.query.rating);
        }

        const [reviews, total, summary] = await Promise.all([
            Review.find(filter)
                .populate({ path: "user", select: "name email profileImage" })
                .populate({ path: "motorcycle", select: "name brand image images" })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter),
            getRatingSummary(motorcycleId),
        ]);

        const currentUserId = req.user ? req.user._id : null;
        const grouped = {};
        if (req.query.grouped === "true") {
            const all = await Review.find({ motorcycle: motorcycleId, status: "approved" })
                .populate({ path: "user", select: "name email profileImage" })
                .populate({ path: "motorcycle", select: "name brand image images" })
                .sort({ isExpert: -1, createdAt: -1 })
                .lean();
            for (const cat of CATEGORIES) {
                grouped[cat] = all.filter((r) => r.category === cat).map((r) => shapeReview(r, currentUserId));
            }
        }

        const payload = {
            success: true,
            reviews: reviews.map((r) => shapeReview(r, currentUserId)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit)),
                hasMore: page * limit < total,
            },
            summary,
        };
        if (req.query.grouped === "true") payload.grouped = grouped;
        // Legacy aliases for existing clients
        payload.summary.totalCount = summary.totalReviews;
        payload.summary.overallRating = summary.averageRating;
        return res.status(200).json(payload);
    } catch (error) {
        console.error("Get motorcycle reviews error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

// ============================================
// GET rating summary for ONE motorcycle
// ============================================
const getMotorcycleReviewSummary = async (req, res) => {
    try {
        const motorcycleId = req.params.motorcycleId || req.params.id;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }
        const summary = await getRatingSummary(motorcycleId);
        return res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error("Get review summary error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load rating summary." });
    }
};

// ============================================
// GET bulk summaries: ?ids=id1,id2,... (max 100)
// Powers listing cards / search / related bikes in 1 request.
// ============================================
const getBulkReviewSummaries = async (req, res) => {
    try {
        const raw = String(req.query.ids || "");
        const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(isValidId))].slice(0, 100);
        if (ids.length === 0) {
            return res.status(200).json({ success: true, summaries: {} });
        }
        const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
        const rows = await Review.aggregate([
            { $match: { motorcycle: { $in: objectIds }, status: "approved" } },
            {
                $group: {
                    _id: "$motorcycle",
                    average: { $avg: "$rating" },
                    count: { $sum: 1 },
                },
            },
        ]);
        const summaries = {};
        for (const id of ids) {
            summaries[id] = { averageRating: 0, totalReviews: 0 };
        }
        for (const row of rows) {
            const key = String(row._id);
            summaries[key] = {
                averageRating: Math.round(row.average * 10) / 10,
                totalReviews: row.count,
            };
        }
        return res.status(200).json({ success: true, summaries });
    } catch (error) {
        console.error("Bulk summaries error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load rating summaries." });
    }
};

// ============================================
// POST create a review (auth required).
// Business rule (unchanged): only verified purchasers
// (or admins) may review. One review per user per bike.
// ============================================
const createReview = async (req, res) => {
    try {
        const motorcycleId = req.body.motorcycleId || req.params.motorcycleId;
        const { title, category, rating, comment } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const validated = validateReviewInput({ title, rating, comment, category });
        if (validated.error) {
            return res.status(400).json({ success: false, message: validated.error });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id");
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }

        const existing = await Review.findOne({ user: req.user._id, motorcycle: motorcycleId });
        if (existing) {
            return res.status(409).json({ success: false, message: "You have already reviewed this motorcycle." });
        }

        // Purchase gate — computed from trusted DB records only.
        // Admins bypass the gate but are never marked verified.
        let purchase = null;
        let verified = false;
        if (req.user.role !== "admin") {
            purchase = await findQualifyingPurchase(req.user._id, motorcycleId);
            if (!purchase) {
                const pending = await findPendingPurchase(req.user._id, motorcycleId);
                const state = pending ? "pending" : "none";
                return res.status(403).json({
                    success: false,
                    code: "PURCHASE_REQUIRED",
                    message: purchaseMessage(state, pending),
                    purchaseState: state,
                    pendingPurchase: pending,
                });
            }
            verified = true;
        }

        const review = await Review.create({
            user: req.user._id,
            motorcycle: motorcycleId,
            title: validated.cleanTitle,
            category: category || "performance",
            rating: validated.numRating,
            comment: validated.cleanComment,
            isExpert: false,
            // NEVER trust client-supplied verification / moderation fields
            verifiedPurchase: verified,
            order: purchase ? purchase.orderId : null,
            enquiry: purchase ? purchase.enquiryId : null,
            status: "approved",
            helpfulCount: 0,
        });

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "order", select: "orderNumber orderStatus paymentStatus deliveryMethod" })
            .lean();

        const summary = await syncMotorcycleRating(motorcycleId);

        return res.status(201).json({
            success: true,
            message: "Review submitted.",
            // Owner-scoped shape: includes the qualifying order reference.
            review: shapeMyReview(populated),
            summary,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "You have already reviewed this motorcycle." });
        }
        console.error("Create review error:", error.message);
        return res.status(500).json({ success: false, message: "Could not submit review." });
    }
};

// ============================================
// PUT update own review. Owners can edit title /
// category / rating / comment only. Moderation and
// verification fields are immutable from this route.
// ============================================
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
            return res.status(403).json({ success: false, message: "You can only edit your own review." });
        }

        const { title, category, rating, comment } = req.body;
        if (title !== undefined) {
            const clean = sanitizeText(title, TITLE_MAX);
            if (!clean || clean.length < TITLE_MIN) {
                return res.status(400).json({ success: false, message: `Title must be at least ${TITLE_MIN} characters.` });
            }
            review.title = clean;
        }
        if (category !== undefined) {
            if (!CATEGORIES.includes(category)) {
                return res.status(400).json({ success: false, message: "Invalid category." });
            }
            review.category = category;
        }
        if (rating !== undefined) {
            const numRating = Number(rating);
            if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
                return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5." });
            }
            review.rating = numRating;
        }
        if (comment !== undefined) {
            const clean = sanitizeText(comment, COMMENT_MAX);
            if (!clean || clean.length < COMMENT_MIN) {
                return res.status(400).json({ success: false, message: `Review must be at least ${COMMENT_MIN} characters.` });
            }
            review.comment = clean;
        }

        await review.save();

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "order", select: "orderNumber orderStatus paymentStatus deliveryMethod" })
            .lean();

        const summary = await syncMotorcycleRating(review.motorcycle);

        return res.status(200).json({
            success: true,
            message: "Review updated.",
            review: shapeMyReview(populated),
            summary,
        });
    } catch (error) {
        console.error("Update review error:", error.message);
        return res.status(500).json({ success: false, message: "Could not update review." });
    }
};

// ============================================
// DELETE own review (admins may remove spam/abuse).
// ============================================
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
            return res.status(403).json({ success: false, message: "You can only delete your own review." });
        }

        const motorcycleId = review.motorcycle;
        await Review.findByIdAndDelete(reviewId);

        const summary = await syncMotorcycleRating(motorcycleId);

        return res.status(200).json({ success: true, message: "Review deleted.", summary });
    } catch (error) {
        console.error("Delete review error:", error.message);
        return res.status(500).json({ success: false, message: "Could not delete review." });
    }
};

// ============================================
// POST toggle "helpful" vote (auth required, 1 per user)
// ============================================
const toggleHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!isValidId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review ID." });
        }
        const review = await Review.findById(reviewId).select("_id helpfulBy helpfulCount status");
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }
        if (review.status !== "approved") {
            return res.status(403).json({ success: false, message: "You cannot vote on a review under moderation." });
        }
        const userId = String(req.user._id);
        const already = (review.helpfulBy || []).map(String).includes(userId);
        if (already) {
            review.helpfulBy = (review.helpfulBy || []).filter((id) => String(id) !== userId);
        } else {
            review.helpfulBy = [...(review.helpfulBy || []), req.user._id];
        }
        review.helpfulCount = (review.helpfulBy || []).length;
        await review.save();
        return res.status(200).json({
            success: true,
            helpfulCount: review.helpfulCount,
            votedHelpful: !already,
        });
    } catch (error) {
        console.error("Helpful vote error:", error.message);
        return res.status(500).json({ success: false, message: "Could not record vote." });
    }
};

// ============================================
// My Reviews (owner view).
// Includes the qualifying order reference so the customer can see WHY
// their review is verified. Order numbers are never exposed on the
// public review endpoints — only on the authenticated owner view.
// ============================================
const shapeMyReview = (r) => ({
    ...shapeReview(r, r.user ? r.user._id : null),
    order: r.order
        ? {
              _id: r.order._id,
              orderNumber: r.order.orderNumber,
              orderStatus: r.order.orderStatus,
              paymentStatus: r.order.paymentStatus,
              deliveryMethod: r.order.deliveryMethod,
          }
        : null,
});

const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user._id })
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "order", select: "orderNumber orderStatus paymentStatus deliveryMethod" })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            reviews: reviews.map((r) => shapeMyReview(r)),
        });
    } catch (error) {
        console.error("Get my reviews error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const getReviewsGrouped = async (req, res) => {
    try {
        const motorcycleId = req.params.motorcycleId;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }

        const reviews = await Review.find({ motorcycle: motorcycleId, status: "approved" })
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .sort({ isExpert: -1, createdAt: -1 })
            .lean();

        const summary = await getRatingSummary(motorcycleId);

        const grouped = {};
        for (const cat of CATEGORIES) {
            grouped[cat] = reviews.filter((r) => r.category === cat).map((r) => shapeReview(r, req.user ? req.user._id : null));
        }

        return res.status(200).json({ success: true, grouped, summary });
    } catch (error) {
        console.error("Get grouped reviews error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const getReviewEligibility = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const isAdmin = req.user.role === "admin";
        const [purchase, pending, existing] = await Promise.all([
            isAdmin ? Promise.resolve(null) : findQualifyingPurchase(req.user._id, motorcycleId),
            isAdmin ? Promise.resolve(null) : findPendingPurchase(req.user._id, motorcycleId),
            Review.findOne({ user: req.user._id, motorcycle: motorcycleId })
                .populate({ path: "motorcycle", select: "name brand image images" })
                .lean(),
        ]);

        const purchaseState = isAdmin
            ? "none"
            : purchase
            ? "completed"
            : pending
            ? "pending"
            : "none";

        return res.status(200).json({
            success: true,
            eligible: isAdmin || !!purchase,
            verified: isAdmin ? false : !!purchase,
            hasReviewed: !!existing,
            reviewId: existing ? existing._id : null,
            reviewStatus: existing ? existing.status : null,
            // The customer's OWN review (safe to return — owner only) so the
            // UI can offer "Edit your review" even when it is not on page 1.
            review: existing ? shapeReview(existing, req.user._id) : null,
            // "none" | "pending" | "completed"
            purchaseState,
            pendingPurchase: pending,
            reason: isAdmin
                ? ""
                : purchase
                ? ""
                : purchaseMessage(purchaseState, pending),
        });
    } catch (error) {
        console.error("Get eligibility error:", error.message);
        return res.status(500).json({ success: false, message: "Could not check eligibility." });
    }
};

// ============================================
// ADMIN: list reviews with filters
// GET /api/reviews/admin/all?motorcycle=&user=&rating=&status=&search=&from=&to=&page=&limit=
// Moderation actions are status-only — rating/text are never altered.
// ============================================
const adminListReviews = async (req, res) => {
    try {
        const { motorcycle = "", user = "", rating = "", status = "", search = "", from = "", to = "" } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const filter = {};
        if (motorcycle && isValidId(motorcycle)) filter.motorcycle = motorcycle;
        if (user && isValidId(user)) filter.user = user;
        if (rating && [1, 2, 3, 4, 5].includes(Number(rating))) filter.rating = Number(rating);
        if (status && STATUSES.includes(status)) filter.status = status;
        if (search && search.trim()) {
            const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ title: rx }, { comment: rx }];
        }
        // Date range filter (inclusive of the whole "to" day).
        const dateFilter = {};
        if (from) {
            const d = new Date(from);
            if (!isNaN(d.getTime())) dateFilter.$gte = d;
        }
        if (to) {
            const d = new Date(to);
            if (!isNaN(d.getTime())) {
                d.setHours(23, 59, 59, 999);
                dateFilter.$lte = d;
            }
        }
        if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

        const [reviews, total, counts, stats] = await Promise.all([
            Review.find(filter)
                .populate({ path: "user", select: "name email profileImage" })
                .populate({ path: "motorcycle", select: "name brand image" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter),
            Review.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            // Genuine rating statistics across approved reviews.
            Review.aggregate([
                { $match: { status: "approved" } },
                {
                    $group: {
                        _id: null,
                        average: { $avg: "$rating" },
                        count: { $sum: 1 },
                        verified: { $sum: { $cond: ["$verifiedPurchase", 1, 0] } },
                        distribution: {
                            $push: "$rating",
                        },
                    },
                },
            ]),
        ]);

        const statusCounts = { pending: 0, approved: 0, rejected: 0 };
        for (const row of counts) {
            if (statusCounts[row._id] !== undefined) statusCounts[row._id] = row.count;
        }

        const statRow = stats[0];
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (statRow && Array.isArray(statRow.distribution)) {
            statRow.distribution.forEach((r) => {
                const star = Number(r);
                if (star >= 1 && star <= 5) distribution[star] += 1;
            });
        }
        const ratingStats = statRow
            ? {
                  averageRating: Math.round(statRow.average * 10) / 10,
                  totalReviews: statRow.count,
                  verifiedReviews: statRow.verified,
                  distribution,
              }
            : { averageRating: 0, totalReviews: 0, verifiedReviews: 0, distribution };

        return res.status(200).json({
            success: true,
            count: reviews.length,
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            statusCounts,
            ratingStats,
            reviews: reviews.map((r) => shapeReview(r)),
        });
    } catch (error) {
        console.error("Admin list reviews error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

// ============================================
// ADMIN: approve / reject / re-pend a review.
// Status-only moderation — text and rating untouched.
// ============================================
const adminModerateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;
        if (!isValidId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review ID." });
        }
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be pending, approved or rejected." });
        }
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }
        review.status = status;
        await review.save();

        const summary = await syncMotorcycleRating(review.motorcycle);

        const populated = await Review.findById(review._id)
            .populate({ path: "user", select: "name email profileImage" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .lean();

        return res.status(200).json({
            success: true,
            message: `Review ${status}.`,
            review: shapeReview(populated),
            summary,
        });
    } catch (error) {
        console.error("Admin moderate error:", error.message);
        return res.status(500).json({ success: false, message: "Could not moderate review." });
    }
};

// ============================================
// ADMIN: recalculate cached ratings for all bikes
// ============================================
const adminRecalculateRatings = async (req, res) => {
    try {
        const bikes = await Motorcycle.find({}).select("_id").lean();
        let updated = 0;
        for (const bike of bikes) {
            await syncMotorcycleRating(bike._id);
            updated += 1;
        }
        return res.status(200).json({ success: true, message: `Ratings recalculated for ${updated} motorcycles.`, updated });
    } catch (error) {
        console.error("Recalculate ratings error:", error.message);
        return res.status(500).json({ success: false, message: "Could not recalculate ratings." });
    }
};

module.exports = {
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
    getRatingSummary,
    syncMotorcycleRating,
};
