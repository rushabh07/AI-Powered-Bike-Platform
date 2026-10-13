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

const getMotorcycleVariants = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const variants = await MotorcycleVariant.find({
            motorcycle: motorcycleId,
            isAvailable: true,
        }).sort({ exShowroomPrice: 1 }).lean();

        res.status(200).json({
            success: true,
            count: variants.length,
            variants: variants.map(shapeVariant),
        });
    } catch (error) {
        console.error("Get variants error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load variants.",
        });
    }
};

const getVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { city } = req.query;

        if (!isValidId(variantId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid variant ID.",
            });
        }

        const variant = await MotorcycleVariant.findById(variantId).lean();
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found.",
            });
        }

        const result = shapeVariant(variant);

        if (city) {
            const cityEntry = (variant.cityPrices || []).find(
                (cp) => cp.city.toLowerCase() === String(city).toLowerCase()
            );
            if (cityEntry) {
                const insurance = Math.round(variant.exShowroomPrice * 0.03);
                result.selectedCity = cityEntry.city;
                result.roadTax = cityEntry.roadTax;
                result.insuranceAmount = insurance;
                result.onRoadPrice =
                    variant.exShowroomPrice + cityEntry.roadTax + insurance;
            } else {
                result.selectedCity = null;
                result.roadTax = 0;
                result.insuranceAmount = 0;
                result.onRoadPrice = 0;
            }
        }

        res.status(200).json({
            success: true,
            variant: result,
        });
    } catch (error) {
        console.error("Get variant error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load variant.",
        });
    }
};

const createVariant = async (req, res) => {
    try {
        const {
            motorcycle,
            variantName,
            variantCode,
            exShowroomPrice,
            cityPrices,
            engine,
            power,
            torque,
            mileage,
            fuel,
            transmission,
            weight,
            features,
            images,
            isAvailable,
        } = req.body;

        if (!isValidId(motorcycle)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const bike = await Motorcycle.findById(motorcycle).select("_id");
        if (!bike) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found.",
            });
        }

        if (!variantName || !String(variantName).trim()) {
            return res.status(400).json({
                success: false,
                message: "Variant name is required.",
            });
        }

        const price = Number(exShowroomPrice);
        if (!price || price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid ex-showroom price is required.",
            });
        }

        const existing = await MotorcycleVariant.findOne({
            motorcycle,
            variantName: String(variantName).trim(),
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A variant with this name already exists for this motorcycle.",
            });
        }

        const variant = await MotorcycleVariant.create({
            motorcycle,
            variantName: String(variantName).trim(),
            variantCode: variantCode || "",
            exShowroomPrice: price,
            cityPrices: cityPrices || [],
            engine: engine || 0,
            power: power || 0,
            torque: torque || null,
            mileage: mileage || 0,
            fuel: fuel || "Petrol",
            transmission: transmission || "Manual",
            weight: weight || null,
            features: features || [],
            images: images || [],
            isAvailable: isAvailable !== false,
        });

        res.status(201).json({
            success: true,
            message: "Variant created successfully.",
            variant: shapeVariant(variant),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A variant with this name already exists for this motorcycle.",
            });
        }
        console.error("Create variant error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not create variant.",
        });
    }
};

const updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        if (!isValidId(variantId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid variant ID.",
            });
        }

        const variant = await MotorcycleVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found.",
            });
        }

        const allowed = [
            "variantName",
            "variantCode",
            "exShowroomPrice",
            "cityPrices",
            "engine",
            "power",
            "torque",
            "mileage",
            "fuel",
            "transmission",
            "weight",
            "features",
            "images",
            "isAvailable",
        ];

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                variant[key] = req.body[key];
            }
        }

        await variant.save();

        res.status(200).json({
            success: true,
            message: "Variant updated successfully.",
            variant: shapeVariant(variant),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A variant with this name already exists for this motorcycle.",
            });
        }
        console.error("Update variant error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not update variant.",
        });
    }
};

const deleteVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        if (!isValidId(variantId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid variant ID.",
            });
        }

        const variant = await MotorcycleVariant.findByIdAndDelete(variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Variant deleted successfully.",
        });
    } catch (error) {
        console.error("Delete variant error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete variant.",
        });
    }
};

module.exports = {
    getMotorcycleVariants,
    getVariant,
    createVariant,
    updateVariant,
    deleteVariant,
};
