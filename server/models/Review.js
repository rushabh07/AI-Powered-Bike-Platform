const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 120,
        },
        category: {
            type: String,
            enum: ["performance", "handling", "design", "mileage", "comfort"],
            default: "performance",
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 2000,
        },
        // Verified Order reference (preferred proof of purchase).
        // Legacy completed purchase enquiries are also accepted.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        // Moderation workflow: only "approved" reviews are public.
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
            index: true,
        },
        helpfulCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        helpfulBy: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            default: [],
            select: false,
        },
        isExpert: {
            type: Boolean,
            default: false,
        },
        verifiedPurchase: {
            type: Boolean,
            default: false,
        },
        enquiry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BikeEnquiry",
            default: null,
        },
        dealerResponse: {
            text: { type: String, default: "", trim: true, maxlength: 1000 },
            by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            at: { type: Date, default: null },
        },
    },
    {
        timestamps: true,
    }
);

reviewSchema.index({ user: 1, motorcycle: 1 }, { unique: true });
reviewSchema.index({ motorcycle: 1, category: 1 });
reviewSchema.index({ motorcycle: 1, status: 1, createdAt: -1 });
reviewSchema.index({ motorcycle: 1, status: 1, rating: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
