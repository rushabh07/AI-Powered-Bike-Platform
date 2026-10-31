const mongoose = require("mongoose");
const MotorcycleVariant = require("../models/MotorcycleVariant");
const Motorcycle = require("../models/Motorcycle");
const { calculateRegionalPricing, validateRegionalPrices } = require("../services/regionalPricingService");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const optionalNumberIsValid = (value) => value == null || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0);

const shapeVariant = (v) => ({
    _id: v._id,
    motorcycle: v.motorcycle,
    variantName: v.variantName,
    variantCode: v.variantCode || "",
    modelYear: v.modelYear ?? null,
    color: v.color || "",
    exShowroomPrice: v.exShowroomPrice,
    cityPrices: v.cityPrices || [],
    onRoadPrice: v.onRoadPrice ?? null,
    engine: v.engine,
    power: v.power,
    torque: v.torque,
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    weight: v.weight,
    features: v.features || [],
    images: v.images || [],
    description: v.description || "",
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
            s.regionalPricing = calculateRegionalPricing({
                exShowroomPrice: v.exShowroomPrice,
                cityPrices: v.cityPrices,
                state: req.query.state || "Maharashtra",
                city: city || "Pune",
            });
            s.onRoadPrice = s.regionalPricing.onRoadPrice;
            s.rtoCharges = s.regionalPricing.rtoCharges;
            s.insuranceAmount = s.regionalPricing.insuranceCharges;
            s.otherCharges = s.regionalPricing.otherCharges;
            if (city) {
                const entry = (v.cityPrices || []).find((cp) =>
                    cp.city.toLowerCase() === String(city).toLowerCase() &&
                    (!cp.state || !req.query.state || cp.state.toLowerCase() === String(req.query.state).toLowerCase())
                );
                if (entry) {
                    s.selectedCity = entry.city;
                    s.roadTax = entry.roadTax;
                    s.insuranceAmount = s.regionalPricing.insuranceCharges;
                    s.otherCharges = s.regionalPricing.otherCharges;
                    s.onRoadPrice = s.regionalPricing.onRoadPrice;
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

// Admin: include unavailable variants so they can be reviewed and re-enabled.
const getAdminMotorcycleVariants = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        const bike = await Motorcycle.findById(motorcycleId).select("_id").lean();
        if (!bike) return res.status(404).json({ success: false, message: "Motorcycle not found." });
        const variants = await MotorcycleVariant.find({ motorcycle: motorcycleId }).sort({ createdAt: 1 }).lean();
        return res.status(200).json({ success: true, count: variants.length, variants: variants.map(shapeVariant) });
    } catch (error) {
        console.error("Get admin variants error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load variants." });
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
        s.regionalPricing = calculateRegionalPricing({
            exShowroomPrice: variant.exShowroomPrice,
            cityPrices: variant.cityPrices,
            state: req.query.state || "Maharashtra",
            city: req.query.city || "Pune",
        });
        s.onRoadPrice = s.regionalPricing.onRoadPrice;
        s.rtoCharges = s.regionalPricing.rtoCharges;
        s.insuranceAmount = s.regionalPricing.insuranceCharges;
        s.otherCharges = s.regionalPricing.otherCharges;
        const { city } = req.query;
        if (city) {
            const entry = (variant.cityPrices || []).find((cp) =>
                cp.city.toLowerCase() === String(city).toLowerCase() &&
                (!cp.state || !req.query.state || cp.state.toLowerCase() === String(req.query.state).toLowerCase())
            );
            if (entry) {
                s.selectedCity = entry.city;
                s.roadTax = entry.roadTax;
                s.insuranceAmount = s.regionalPricing.insuranceCharges;
                s.otherCharges = s.regionalPricing.otherCharges;
                s.onRoadPrice = s.regionalPricing.onRoadPrice;
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
        if (String(variantName).trim().length > 100) {
            return res.status(400).json({ success: false, message: "Variant name must be 100 characters or fewer." });
        }
        const price = Number(exShowroomPrice);
        if (!price || price <= 0) {
            return res.status(400).json({ success: false, message: "Valid ex-showroom price is required." });
        }
        const { modelYear, onRoadPrice, engine, power, mileage } = req.body;
        if (modelYear != null && modelYear !== "" && (!Number.isInteger(Number(modelYear)) || Number(modelYear) < 1900 || Number(modelYear) > 2200)) {
            return res.status(400).json({ success: false, message: "Model year must be a valid year." });
        }
        if (![onRoadPrice, engine, power, mileage].every(optionalNumberIsValid)) {
            return res.status(400).json({ success: false, message: "Variant prices and specifications must be valid non-negative numbers." });
        }
        const cityPriceError = validateRegionalPrices(req.body.cityPrices || []);
        if (cityPriceError) return res.status(400).json({ success: false, message: cityPriceError });
        const variant = await MotorcycleVariant.create({
            motorcycle,
            variantName: String(variantName).trim(),
            variantCode: String(req.body.variantCode || "").trim(),
            modelYear: req.body.modelYear !== "" && req.body.modelYear != null ? Number(req.body.modelYear) : null,
            color: String(req.body.color || "").trim(),
            exShowroomPrice: price,
            cityPrices: Array.isArray(req.body.cityPrices) ? req.body.cityPrices : [],
            onRoadPrice: req.body.onRoadPrice !== "" && req.body.onRoadPrice != null ? Number(req.body.onRoadPrice) : null,
            engine: Number(req.body.engine) || 0,
            power: Number(req.body.power) || 0,
            torque: req.body.torque != null && req.body.torque !== "" ? Number(req.body.torque) : null,
            mileage: Number(req.body.mileage) || 0,
            fuel: req.body.fuel || "Petrol",
            transmission: req.body.transmission || "Manual",
            weight: req.body.weight != null && req.body.weight !== "" ? Number(req.body.weight) : null,
            features: Array.isArray(req.body.features) ? req.body.features : [],
            images: Array.isArray(req.body.images) ? req.body.images : [],
            description: String(req.body.description || "").trim(),
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
        const allowed = ["variantName", "variantCode", "modelYear", "color", "exShowroomPrice", "cityPrices", "onRoadPrice", "engine", "power", "torque", "mileage", "fuel", "transmission", "weight", "features", "images", "description", "isAvailable"];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        for (const key of ["modelYear", "onRoadPrice", "torque", "weight"]) {
            if (update[key] === "") update[key] = null;
        }
        if (update.variantName !== undefined && (!String(update.variantName).trim() || String(update.variantName).trim().length > 100)) {
            return res.status(400).json({ success: false, message: "Variant name must be between 1 and 100 characters." });
        }
        if (update.exShowroomPrice !== undefined && (!Number.isFinite(Number(update.exShowroomPrice)) || Number(update.exShowroomPrice) <= 0)) {
            return res.status(400).json({ success: false, message: "Valid ex-showroom price is required." });
        }
        if (update.modelYear != null && update.modelYear !== "" && (!Number.isInteger(Number(update.modelYear)) || Number(update.modelYear) < 1900 || Number(update.modelYear) > 2200)) {
            return res.status(400).json({ success: false, message: "Model year must be a valid year." });
        }
        if (![update.onRoadPrice, update.engine, update.power, update.mileage, update.torque, update.weight].every(optionalNumberIsValid)) {
            return res.status(400).json({ success: false, message: "Variant prices and specifications must be valid non-negative numbers." });
        }
        if (update.cityPrices !== undefined) {
            const cityPriceError = validateRegionalPrices(update.cityPrices);
            if (cityPriceError) return res.status(400).json({ success: false, message: cityPriceError });
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
    getAdminMotorcycleVariants,
    getVariant,
    createVariant,
    updateVariant,
    deleteVariant,
};
