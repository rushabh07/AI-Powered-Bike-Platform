const Motorcycle = require("../models/Motorcycle");
const mongoose = require("mongoose");

// =====================================================
// GET ALL MOTORCYCLES
// GET /api/motorcycles
// =====================================================
const getMotorcycles = async (req, res) => {
    try {
        const {
            search,
            category,
            brand,
            maxPrice,
            minEngine,
            sort
        } = req.query;

        const filter = {};

        // =====================================================
        // SEARCH
        // =====================================================
        if (search && search.trim()) {
            const searchText = search.trim();

            const searchConditions = [
                {
                    name: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    brand: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    category: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    fuel: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    transmission: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: searchText,
                        $options: "i"
                    }
                }
            ];

            // Search by numeric specifications
            if (!isNaN(searchText)) {
                const number = Number(searchText);

                searchConditions.push(
                    { engine: number },
                    { power: number },
                    { torque: number }
                );
            }

            filter.$or = searchConditions;
        }

        // =====================================================
        // CATEGORY
        // =====================================================
        if (category && category !== "All") {
            filter.category = {
                $regex: `^${category}$`,
                $options: "i"
            };
        }

        // =====================================================
        // BRAND
        // =====================================================
        if (brand && brand !== "All") {
            filter.brand = {
                $regex: `^${brand}$`,
                $options: "i"
            };
        }

        // =====================================================
        // MAXIMUM PRICE
        // =====================================================
        if (maxPrice) {
            filter.price = {
                ...filter.price,
                $lte: Number(maxPrice)
            };
        }

        // =====================================================
        // MINIMUM ENGINE
        // =====================================================
        if (minEngine) {
            filter.engine = {
                ...filter.engine,
                $gte: Number(minEngine)
            };
        }

        // =====================================================
        // SORTING
        // =====================================================
        let sortOption = {
            createdAt: -1
        };

        switch (sort) {
            case "price-low":
                sortOption = { price: 1 };
                break;

            case "price-high":
                sortOption = { price: -1 };
                break;

            case "rating":
                sortOption = { rating: -1 };
                break;

            case "mileage":
                sortOption = { mileage: -1 };
                break;

            case "engine-low":
                sortOption = { engine: 1 };
                break;

            case "engine-high":
                sortOption = { engine: -1 };
                break;

            case "power-high":
                sortOption = { power: -1 };
                break;

            default:
                sortOption = { createdAt: -1 };
        }

        const motorcycles = await Motorcycle
            .find(filter)
            .sort(sortOption);

        res.status(200).json({
            success: true,
            count: motorcycles.length,
            motorcycles
        });

    } catch (error) {
        console.error("Get motorcycles error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch motorcycles"
        });
    }
};


// =====================================================
// GET SINGLE MOTORCYCLE
// GET /api/motorcycles/:id
// =====================================================
const getMotorcycleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID"
            });
        }

        const motorcycle = await Motorcycle.findById(id);

        if (!motorcycle) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found"
            });
        }

        res.status(200).json({
            success: true,
            motorcycle
        });

    } catch (error) {
        console.error("Get motorcycle by ID error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch motorcycle"
        });
    }
};


// =====================================================
// CREATE MOTORCYCLE
// POST /api/motorcycles
// =====================================================
const createMotorcycle = async (req, res) => {
    try {
        const {
            name,
            brand,
            brandLogo,
            category,
            price,
            engine,
            mileage,
            power,
            torque,
            rating,
            fuel,
            transmission,
            weight,
            batteryCapacity,
            range,
            chargingTime,
            topSpeed,
            image,
            images,
            description
        } = req.body;

        // =====================================================
        // REQUIRED FIELDS
        // (engine / mileage / power default to 0 so that
        //  Electric bikes without an ICE engine can be saved)
        // =====================================================
        if (
            !name ||
            !brand ||
            !category ||
            price === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required motorcycle details"
            });
        }

        // =====================================================
        // VALIDATE IMAGES
        // =====================================================
        let formattedImages = [];

        if (Array.isArray(images)) {
            formattedImages = images
                .filter(
                    (item) =>
                        item &&
                        typeof item.url === "string" &&
                        item.url.trim() &&
                        typeof item.label === "string" &&
                        item.label.trim()
                )
                .map((item) => ({
                    url: item.url.trim(),
                    label: item.label.trim()
                }));
        }

        // =====================================================
        // CREATE MOTORCYCLE
        // =====================================================
        const motorcycle = await Motorcycle.create({
            name: name.trim(),
            brand: brand.trim(),
            brandLogo: brandLogo ? brandLogo.trim() : "",
            category: category.trim(),
            price,
            engine: engine ?? 0,
            mileage: mileage ?? 0,
            power: power ?? 0,
            torque,
            rating,
            fuel,
            transmission,
            weight,
            batteryCapacity: batteryCapacity ?? 0,
            range: range ?? 0,
            chargingTime: chargingTime ?? 0,
            topSpeed: topSpeed ?? 0,

            // Old image support
            image: image ? image.trim() : "",

            // New labeled images
            images: formattedImages,

            description: description || ""
        });

        res.status(201).json({
            success: true,
            message: "Motorcycle created successfully",
            motorcycle
        });

    } catch (error) {
        console.error("Create motorcycle error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create motorcycle"
        });
    }
};


// =====================================================
// UPDATE MOTORCYCLE
// PUT /api/motorcycles/:id
// =====================================================
const updateMotorcycle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID"
            });
        }

        const updateData = { ...req.body };

        // =====================================================
        // VALIDATE LABELED IMAGES
        // =====================================================
        if (Array.isArray(updateData.images)) {
            updateData.images = updateData.images
                .filter(
                    (item) =>
                        item &&
                        typeof item.url === "string" &&
                        item.url.trim() &&
                        typeof item.label === "string" &&
                        item.label.trim()
                )
                .map((item) => ({
                    url: item.url.trim(),
                    label: item.label.trim()
                }));
        }

        const motorcycle = await Motorcycle.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!motorcycle) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Motorcycle updated successfully",
            motorcycle
        });

    } catch (error) {
        console.error("Update motorcycle error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update motorcycle"
        });
    }
};


// =====================================================
// DELETE MOTORCYCLE
// DELETE /api/motorcycles/:id
// =====================================================
const deleteMotorcycle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID"
            });
        }

        const motorcycle = await Motorcycle.findByIdAndDelete(id);

        if (!motorcycle) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Motorcycle deleted successfully"
        });

    } catch (error) {
        console.error("Delete motorcycle error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete motorcycle"
        });
    }
};


// =====================================================
// EXPORT
// =====================================================
module.exports = {
    getMotorcycles,
    getMotorcycleById,
    createMotorcycle,
    updateMotorcycle,
    deleteMotorcycle
};