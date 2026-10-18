const mongoose = require("mongoose");
const MotorcycleVariant = require("../models/MotorcycleVariant");
const Motorcycle = require("../models/Motorcycle");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const shapeVariant = (v) => ({
    _id: v._id,
    motorcycle: v.motorcycle,
    variantName: v.variantName,
    variantCode: v.variantCode || "",
    exShowroomPrice: v.exShowroomPrice,
    cityPrices: v.cityPrices || [],
    engine: v.engine,
    power: v.power,
    torque: v.torque,
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    weight: v.weight,
    features: v.features || [],
    images: v.images || [],
    isAvailable: v.isAvailable,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
});

// Public: available variants for a motorcycle + optional city pricing
const getMotorcycleVariants = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const variants = await MotorcycleVariant.find({ motorcycle: motorcycleId, isAvailable: true })
            .sort({ exShowroomPrice: 1 })
            .lean();
        const { city } = req.query;
        const shaped = variants.map((v) => {
            const s = shapeVariant(v);
            if (city) {
                const entry = (v.cityPrices || []).find(
                    (cp) => cp.city.toLowerCase() === String(city).toLowerCase()
                );
                if (entry) {
                    const insurance = Math.round(v.exShowroomPrice * 0.03);
                    s.selectedCity = entry.city;
                    s.roadTax = entry.roadTax;
                    s.insuranceAmount = insurance;
                    s.onRoadPrice = v.exShowroomPrice + entry.roadTax + insurance;
                }
            }
            return s;
        });
        res.status(200).json({ success: true, count: shaped.length, variants: shaped });
    } catch (error) {
        console.error("Get variants error:", error.message);
        res.status(500).json({ success: false, message: "Could not load variants." });
    }
};

const getVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        if (!isValidId(variantId)) {
            return res.status(400).json({ success: false, message: "Invalid variant ID." });
        }
        const variant = await MotorcycleVariant.findById(variantId).lean();
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        const s = shapeVariant(variant);
        const { city } = req.query;
        if (city) {
            const entry = (variant.cityPrices || []).find(
                (cp) => cp.city.toLowerCase() === String(city).toLowerCase()
            );
            if (entry) {
                const insurance = Math.round(variant.exShowroomPrice * 0.03);
                s.selectedCity = entry.city;
                s.roadTax = entry.roadTax;
                s.insuranceAmount = insurance;
                s.onRoadPrice = variant.exShowroomPrice + entry.roadTax + insurance;
            }
        }
        res.status(200).json({ success: true, variant: s });
    } catch (error) {
        console.error("Get variant error:", error.message);
        res.status(500).json({ success: false, message: "Could not load variant." });
    }
};

const createVariant = async (req, res) => {
    try {
        const { motorcycle, variantName, exShowroomPrice } = req.body;
        if (!isValidId(motorcycle)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const bike = await Motorcycle.findById(motorcycle).select("_id");
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }
        if (!variantName || !String(variantName).trim()) {
            return res.status(400).json({ success: false, message: "Variant name is required." });
        }
        const price = Number(exShowroomPrice);
        if (!price || price <= 0) {
            return res.status(400).json({ success: false, message: "Valid ex-showroom price is required." });
        }
        const variant = await MotorcycleVariant.create({
            motorcycle,
            variantName: String(variantName).trim(),
            variantCode: String(req.body.variantCode || "").trim(),
            exShowroomPrice: price,
            cityPrices: Array.isArray(req.body.cityPrices) ? req.body.cityPrices : [],
            engine: Number(req.body.engine) || 0,
            power: Number(req.body.power) || 0,
            torque: req.body.torque != null && req.body.torque !== "" ? Number(req.body.torque) : null,
            mileage: Number(req.body.mileage) || 0,
            fuel: req.body.fuel || "Petrol",
            transmission: req.body.transmission || "Manual",
            weight: req.body.weight != null && req.body.weight !== "" ? Number(req.body.weight) : null,
            features: Array.isArray(req.body.features) ? req.body.features : [],
            images: Array.isArray(req.body.images) ? req.body.images : [],
            isAvailable: req.body.isAvailable !== false,
        });
        res.status(201).json({ success: true, message: "Variant created.", variant: shapeVariant(variant.toObject()) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "This variant already exists for the motorcycle." });
        }
        console.error("Create variant error:", error.message);
        res.status(500).json({ success: false, message: "Could not create variant." });
    }
};

const updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        if (!isValidId(variantId)) {
            return res.status(400).json({ success: false, message: "Invalid variant ID." });
        }
        const allowed = ["variantName", "variantCode", "exShowroomPrice", "cityPrices", "engine", "power", "torque", "mileage", "fuel", "transmission", "weight", "features", "images", "isAvailable"];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        const variant = await MotorcycleVariant.findByIdAndUpdate(variantId, { $set: update }, { new: true, runValidators: true }).lean();
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        res.status(200).json({ success: true, message: "Variant updated.", variant: shapeVariant(variant) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "This variant already exists for the motorcycle." });
        }
        console.error("Update variant error:", error.message);
        res.status(500).json({ success: false, message: "Could not update variant." });
    }
};

const deleteVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        if (!isValidId(variantId)) {
            return res.status(400).json({ success: false, message: "Invalid variant ID." });
        }
        const variant = await MotorcycleVariant.findByIdAndDelete(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        res.status(200).json({ success: true, message: "Variant deleted." });
    } catch (error) {
        console.error("Delete variant error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete variant." });
    }
};

module.exports = {
    getMotorcycleVariants,
    getVariant,
    createVariant,
    updateVariant,
    deleteVariant,
};
