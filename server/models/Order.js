const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
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
        variant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MotorcycleVariant",
            default: null,
        },
        variantName: {
            type: String,
            default: "",
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        exShowroomPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        roadTax: {
            type: Number,
            default: 0,
            min: 0,
        },
        insuranceAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        onRoadPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1,
        },
        status: {
            type: String,
            enum: ["pending", "payment_pending", "paid", "cancelled", "failed"],
            default: "pending",
        },
        paymentMethod: {
            type: String,
            enum: ["online", "dealership"],
            default: "online",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            default: null,
        },
        bookingReference: {
            type: String,
            default: "",
        },
        paymentId: {
            type: String,
            default: "",
        },
        orderId: {
            type: String,
            default: "",
        },
        razorpaySignature: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderId: 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
