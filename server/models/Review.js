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
            maxlength: 200,
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
            maxlength: 2000,
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

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
