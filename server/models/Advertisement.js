const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        imageUrl: {
            type: String,
            required: true,
            trim: true,
        },
        mobileImageUrl: {
            type: String,
            default: "",
            trim: true,
        },
        ctaText: {
            type: String,
            default: "Explore Bikes",
            trim: true,
            maxlength: 40,
        },
        targetUrl: {
            type: String,
            default: "/motorcycles",
            trim: true,
        },
        badgeText: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
        },
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        priority: {
            type: Number,
            default: 0,
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["draft", "active", "inactive"],
            default: "draft",
        },
        placement: {
            type: String,
            enum: ["homepage", "motorcycles"],
            default: "homepage",
        },
        impressions: {
            type: Number,
            default: 0,
            min: 0,
        },
        clicks: {
            type: Number,
            default: 0,
            min: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

advertisementSchema.index({ status: 1, placement: 1, isDeleted: 1 });
advertisementSchema.index({ priority: -1, displayOrder: 1 });

module.exports = mongoose.models.Advertisement || mongoose.model("Advertisement", advertisementSchema);
