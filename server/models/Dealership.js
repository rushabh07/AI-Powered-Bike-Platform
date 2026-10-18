const mongoose = require("mongoose");

const dealershipSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            default: "",
            lowercase: true,
            trim: true,
        },
        openingHours: {
            type: String,
            default: "Mon-Sat: 10:00 AM - 8:00 PM",
            trim: true,
        },
        brands: {
            type: [String],
            default: [],
        },
        googleMapsUrl: {
            type: String,
            default: "",
            trim: true,
        },
        timeSlots: {
            type: [String],
            default: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"],
        },
        stockStatus: {
            type: String,
            enum: ["in_stock", "limited", "out_of_stock", "unknown"],
            default: "unknown",
        },
        acceptedPaymentMethods: {
            type: [String],
            default: ["cash", "upi", "card", "bank_transfer"],
        },
        approved: {
            type: Boolean,
            default: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        staff: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                role: { type: String, enum: ["manager", "sales"], default: "sales" },
            },
        ],
        showroomImages: {
            type: [String],
            default: [],
        },
        stock: [
            {
                motorcycle: { type: mongoose.Schema.Types.ObjectId, ref: "Motorcycle", required: true },
                quantity: { type: Number, default: 0, min: 0 },
                price: { type: Number, default: 0, min: 0 },
            },
        ],
    },
    {
        timestamps: true,
    }
);

dealershipSchema.index({ city: 1, isActive: 1 });

module.exports = mongoose.models.Dealership || mongoose.model("Dealership", dealershipSchema);
