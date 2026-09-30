const mongoose = require("mongoose");

const Comparison = require("../models/Comparison");
const Motorcycle = require("../models/Motorcycle");

const BIKE_SELECT =
    "name brand brandLogo category price fuel engine mileage power torque topSpeed transmission weight rating batteryCapacity range chargingTime image";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// =====================================================
// LIST — GET /api/comparisons (own only)
// =====================================================
const listComparisons = async (req, res) => {
    try {
        const items = await Comparison.find({ user: req.user._id })
            .populate({ path: "motorcycles", select: BIKE_SELECT })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: items.length,
            comparisons: items,
        });
    } catch (error) {
        console.error("List comparisons error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load comparisons.",
        });
    }
};

// =====================================================
// GET SINGLE — GET /api/comparisons/:id (owner only)
// =====================================================
const getComparison = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid comparison ID.",
            });
        }

        const item = await Comparison.findOne({
            _id: id,
            user: req.user._id,
        })
            .populate({ path: "motorcycles", select: BIKE_SELECT })
            .lean();

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Comparison not found.",
            });
        }

        res.status(200).json({ success: true, comparison: item });
    } catch (error) {
        console.error("Get comparison error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load comparison.",
        });
    }
};

// =====================================================
// CREATE — POST /api/comparisons { motorcycleIds: [id, id(, id)] }
// Same bike set is never saved twice: the existing record
// is returned instead of a duplicate.
// =====================================================
const createComparison = async (req, res) => {
    try {
        const { motorcycleIds } = req.body;

        if (!Array.isArray(motorcycleIds) || motorcycleIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Select at least 2 motorcycles to compare.",
            });
        }

        const unique = [...new Set(motorcycleIds.map(String))];

        if (unique.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Select at least 2 different motorcycles.",
            });
        }

        if (unique.length > 4) {
            return res.status(400).json({
                success: false,
                message: "You can compare up to 4 motorcycles.",
            });
        }

        if (!unique.every(isValidId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const bikes = await Motorcycle.find({ _id: { $in: unique } }).select(
            "_id"
        );

        if (bikes.length !== unique.length) {
            return res.status(404).json({
                success: false,
                message: "One or more motorcycles were not found.",
            });
        }

        // Same set (any order) already saved → return it, no duplicate
        const existing = await Comparison.findOne({
            user: req.user._id,
            motorcycles: { $all: unique, $size: unique.length },
        }).populate({ path: "motorcycles", select: BIKE_SELECT });

        if (existing) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                message: "This comparison is already saved.",
                comparison: existing,
            });
        }

        const item = await Comparison.create({
            user: req.user._id,
            motorcycles: unique,
        });

        await item.populate({ path: "motorcycles", select: BIKE_SELECT });

        res.status(201).json({
            success: true,
            duplicate: false,
            message: "Comparison saved successfully.",
            comparison: item,
        });
    } catch (error) {
        console.error("Create comparison error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not save comparison.",
        });
    }
};

// =====================================================
// DELETE — DELETE /api/comparisons/:id
// =====================================================
const deleteComparison = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid comparison ID.",
            });
        }

        const item = await Comparison.findOneAndDelete({
            _id: id,
            user: req.user._id,
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Comparison not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Comparison deleted.",
        });
    } catch (error) {
        console.error("Delete comparison error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete comparison.",
        });
    }
};

module.exports = {
    listComparisons,
    getComparison,
    createComparison,
    deleteComparison,
};
