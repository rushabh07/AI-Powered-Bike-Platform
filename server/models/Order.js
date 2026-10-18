const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
    {
        status: { type: String, required: true, trim: true },
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        note: { type: String, default: "", trim: true, maxlength: 500 },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
        },
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
        motorcycleSnapshot: {
            brand: { type: String, default: "" },
            name: { type: String, default: "" },
            image: { type: String, default: "" },
        },
        variantName: {
            type: String,
            default: "",
            trim: true,
        },
        selectedColor: {
            type: String,
            default: "",
            trim: true,
        },
        colorHex: {
            type: String,
            default: "",
            trim: true,
        },
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1,
        },
        unitPrice: {
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
        taxAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMethod: {
            type: String,
            enum: ["offline", "online"],
            default: "offline",
            required: true,
        },
        offlinePaymentType: {
            type: String,
            enum: ["cash", "card", "upi", "bank_transfer", ""],
            default: "",
        },
        offlinePaymentReference: {
            type: String,
            default: "",
            trim: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        orderStatus: {
            type: String,
            enum: [
                "pending_dealership_confirmation",
                "confirmed",
                "ready_for_collection",
                "completed",
                "cancelled",
                "pending_payment",
            ],
            default: "pending_dealership_confirmation",
        },
        razorpayOrderId: {
            type: String,
            default: "",
        },
        razorpayPaymentId: {
            type: String,
            default: "",
        },
        razorpaySignature: {
            type: String,
            default: "",
        },
        deliveryMethod: {
            type: String,
            enum: ["collection", "delivery"],
            default: "collection",
        },
        visitDate: {
            type: Date,
            default: null,
        },
        customerDetails: {
            name: { type: String, default: "" },
            email: { type: String, default: "" },
            phone: { type: String, default: "" },
            address: { type: String, default: "" },
            preferredVisitDate: { type: String, default: "" },
        },
        cancelReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        statusHistory: {
            type: [statusHistorySchema],
            default: [],
        },
        expiresAt: {
            type: Date,
            default: null,
        },
        emailStatus: {
            type: String,
            enum: ["unknown", "sent", "partial", "failed", "skipped"],
            default: "unknown",
        },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ dealership: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, orderStatus: 1 });
orderSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
