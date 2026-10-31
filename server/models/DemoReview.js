const mongoose = require("mongoose");

const demoReviewSchema = new mongoose.Schema(
    {
        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            required: true,
            index: true,
        },
        demoKey: {
            type: String,
            required: true,
            trim: true,
        },
        reviewerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
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
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: Number.isInteger,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 2000,
        },
        reviewDate: {
            type: Date,
            required: true,
        },
    },
    { timestamps: false, versionKey: false }
);

demoReviewSchema.index({ motorcycle: 1, demoKey: 1 }, { unique: true });
demoReviewSchema.index({ motorcycle: 1, rating: 1, reviewDate: -1 });

module.exports = mongoose.models.DemoReview || mongoose.model("DemoReview", demoReviewSchema, "demoreviews");
