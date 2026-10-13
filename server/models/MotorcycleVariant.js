const mongoose = require("mongoose");

const variantImageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const variantCityPriceSchema = new mongoose.Schema(
    {
        city: { type: String, required: true, trim: true },
        roadTax: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const motorcycleVariantSchema = new mongoose.Schema(
    {
        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            required: true,
        },
        variantName: {
            type: String,
            required: true,
            trim: true,
        },
        variantCode: {
            type: String,
            default: "",
            trim: true,
        },
        exShowroomPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        cityPrices: {
            type: [variantCityPriceSchema],
            default: [],
        },
        engine: { type: Number, default: 0, min: 0 },
        power: { type: Number, default: 0, min: 0 },
        torque: { type: Number, default: null, min: 0 },
        mileage: { type: Number, default: 0, min: 0 },
        fuel: { type: String, default: "Petrol", trim: true },
        transmission: { type: String, default: "Manual", trim: true },
        weight: { type: Number, default: null, min: 0 },
        features: { type: [String], default: [] },
        images: { type: [variantImageSchema], default: [] },
        isAvailable: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

motorcycleVariantSchema.index({ motorcycle: 1, variantName: 1 }, { unique: true });

module.exports = mongoose.model("MotorcycleVariant", motorcycleVariantSchema);
