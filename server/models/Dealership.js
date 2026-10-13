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
        openingHours: {
            type: String,
            default: "Mon-Sat: 10:00 AM - 8:00 PM",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

dealershipSchema.index({ city: 1, isActive: 1 });

module.exports = mongoose.model("Dealership", dealershipSchema);
