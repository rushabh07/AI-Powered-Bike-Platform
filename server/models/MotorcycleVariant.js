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
        state: { type: String, default: "", trim: true },
        city: { type: String, required: true, trim: true },
        roadTax: { type: Number, required: true, min: 0 },
        insuranceAmount: { type: Number, default: null, min: 0 },
        otherCharges: { type: Number, default: 0, min: 0 },
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
            maxlength: 100,
        },
        variantCode: {
            type: String,
            default: "",
            trim: true,
        },
        modelYear: { type: Number, min: 1900, max: 2200, default: null },
        color: { type: String, default: "", trim: true, maxlength: 80 },
        exShowroomPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        cityPrices: {
            type: [variantCityPriceSchema],
            default: [],
        },
        onRoadPrice: { type: Number, default: null, min: 0 },
        engine: { type: Number, default: 0, min: 0 },
        power: { type: Number, default: 0, min: 0 },
        torque: { type: Number, default: null, min: 0 },
        mileage: { type: Number, default: 0, min: 0 },
        fuel: { type: String, default: "Petrol", trim: true },
        transmission: { type: String, default: "Manual", trim: true },
        weight: { type: Number, default: null, min: 0 },
        features: { type: [String], default: [] },
        images: { type: [variantImageSchema], default: [] },
        description: { type: String, default: "", trim: true, maxlength: 2000 },
        isAvailable: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

motorcycleVariantSchema.index({ motorcycle: 1, variantName: 1 }, { unique: true });

module.exports = mongoose.models.MotorcycleVariant || mongoose.model("MotorcycleVariant", motorcycleVariantSchema);
