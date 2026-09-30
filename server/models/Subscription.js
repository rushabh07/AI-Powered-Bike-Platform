const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        plan: {
            type: String,
            enum: ["monthly", "yearly", "premium"],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        tokens: {
            type: Number,
            required: true,
            min: 1,
        },

        currency: {
            type: String,
            default: "INR",
        },

        orderId: {
            type: String,
            default: "",
        },

        paymentId: {
            type: String,
            default: "",
        },

        razorpaySignature: {
            type: String,
            default: "",
        },

        provider: {
            type: String,
            enum: ["razorpay", "test"],
            default: "test",
        },

        status: {
            type: String,
            enum: ["created", "paid", "failed", "expired"],
            default: "created",
        },

        startedAt: {
            type: Date,
            default: null,
        },

        expiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for high-efficiency querying & admin analytics
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });
subscriptionSchema.index({ status: 1, startedAt: -1 });
subscriptionSchema.index({ orderId: 1 });
subscriptionSchema.index({ paymentId: 1 });
subscriptionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
