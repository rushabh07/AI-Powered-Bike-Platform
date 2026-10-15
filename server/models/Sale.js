const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
    {
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },
        enquiry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BikeEnquiry",
            default: null,
        },
        customerName: {
            type: String,
            required: true,
            trim: true,
        },
        customerPhone: {
            type: String,
            required: true,
            trim: true,
        },
        motorcycleName: {
            type: String,
            default: "",
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "card", "bank_transfer"],
            required: true,
        },
        receiptRef: {
            type: String,
            default: "",
            trim: true,
        },
        invoiceNo: {
            type: String,
            required: true,
            unique: true,
        },
        deliveryStatus: {
            type: String,
            enum: ["pending", "ready", "delivered"],
            default: "pending",
        },
        verified: {
            type: Boolean,
            default: false,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

saleSchema.index({ dealership: 1, createdAt: -1 });

module.exports = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
