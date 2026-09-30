const mongoose = require("mongoose");

const motorcycleImageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true
        },

        label: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);

const motorcycleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        brand: {
            type: String,
            required: true,
            trim: true
        },

        brandLogo: {
            type: String,
            default: "",
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        engine: {
            type: Number,
            default: 0,
            min: 0
        },

        power: {
            type: Number,
            default: 0,
            min: 0
        },

        torque: {
            type: Number,
            default: null,
            min: 0
        },

        mileage: {
            type: Number,
            default: 0,
            min: 0
        },

        fuel: {
            type: String,
            default: "Petrol",
            trim: true
        },

        // EV-specific fields (used when category is "Electric")
        batteryCapacity: {
            type: Number,
            default: 0,
            min: 0
        },

        range: {
            type: Number,
            default: 0,
            min: 0
        },

        chargingTime: {
            type: Number,
            default: 0,
            min: 0
        },

        topSpeed: {
            type: Number,
            default: 0,
            min: 0
        },

        transmission: {
            type: String,
            default: "Manual",
            trim: true
        },

        weight: {
            type: Number,
            default: null,
            min: 0
        },

        rating: {
            type: Number,
            default: 4.5,
            min: 0,
            max: 5
        },

        // Old single image field.
        // Kept for backward compatibility with existing MongoDB records.
        image: {
            type: String,
            default: "",
            trim: true
        },

        // New dynamic labeled image gallery
        images: {
            type: [motorcycleImageSchema],
            default: []
        },

        description: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Motorcycle", motorcycleSchema);