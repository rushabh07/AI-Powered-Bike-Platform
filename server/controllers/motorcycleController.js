const Motorcycle = require("../models/Motorcycle");
const Review = require("../models/Review");
const DemoReview = require("../models/DemoReview");
const mongoose = require("mongoose");
const { calculateRegionalPricing, validateRegionalPrices } = require("../services/regionalPricingService");

// Live approved-review aggregates keyed by motorcycle id string.
// Single aggregation — used to enrich list/detail responses so
// cards never show fabricated ratings.
const fetchReviewSummaryMap = async (motorcycleIds) => {
    const objectIds = motorcycleIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length === 0) return {};
    const [rows, demoRows] = await Promise.all([Review.aggregate([
        { $match: { motorcycle: { $in: objectIds }, status: "approved" } },
        {
            $group: {
                _id: "$motorcycle",
                average: { $avg: "$rating" },
                count: { $sum: 1 },
                d1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
                d2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                d3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                d4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                d5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            },
        },
    ]), DemoReview.aggregate([
        { $match: { motorcycle: { $in: objectIds } } },
        {
            $group: {
                _id: "$motorcycle",
                average: { $avg: "$rating" },
                count: { $sum: 1 },
                d1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
                d2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                d3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                d4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                d5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            },
        },
    ])]);
    const map = {};
    for (const row of [...rows, ...demoRows]) {
        const key = String(row._id);
        const current = map[key] || { ratingSum: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        current.ratingSum += row.average * row.count;
        current.totalReviews += row.count;
        for (let star = 1; star <= 5; star += 1) current.distribution[star] += row[`d${star}`] || 0;
        current.averageRating = Math.round((current.ratingSum / current.totalReviews) * 10) / 10;
        map[key] = current;
    }
    for (const summary of Object.values(map)) delete summary.ratingSum;
    return map;
};

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

        const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = hasPagination
            ? Math.min(60, Math.max(1, Number.parseInt(req.query.limit, 10) || 24))
            : null;
        const query = Motorcycle.find(filter).sort(sortOption);
        if (hasPagination) query.skip((page - 1) * limit).limit(limit);
        const [motorcycles, total] = await Promise.all([
            query.lean(),
            hasPagination ? Motorcycle.countDocuments(filter) : Promise.resolve(null),
        ]);

        // Attach live rating summaries (approved reviews only) so
        // listing cards / search results show real database ratings.
        let summaryMap = {};
        try {
            summaryMap = await fetchReviewSummaryMap(motorcycles.map((m) => String(m._id)));
        } catch (e) {
            console.error("Review summary enrichment error:", e.message);
        }
        const state = String(req.query.state || "Maharashtra");
        const city = String(req.query.city || "Pune");
        const enriched = motorcycles.map((m) => ({
            ...m,
            reviewSummary: summaryMap[String(m._id)] || { averageRating: 0, totalReviews: 0 },
            regionalPricing: calculateRegionalPricing({ exShowroomPrice: m.exShowroomPrice || m.price, cityPrices: m.cityPrices, state, city }),
        }));

        res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
        res.status(200).json({
            success: true,
            count: hasPagination ? total : enriched.length,
            motorcycles: enriched,
            ...(hasPagination ? {
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasMore: page * limit < total,
                },
            } : {}),
        });

    } catch (error) {
        console.error("Get motorcycles error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch motorcycles"
        });
    }
};

const getMotorcycleMetadata = async (_req, res) => {
    try {
        const brands = await Motorcycle.aggregate([
            { $match: { brand: { $type: "string", $ne: "" } } },
            { $sort: { brand: 1, brandLogo: 1 } },
            {
                $group: {
                    _id: { $toLower: "$brand" },
                    brand: { $first: "$brand" },
                    brandLogo: { $first: "$brandLogo" },
                },
            },
            { $sort: { brand: 1 } },
            { $project: { _id: 0, brand: 1, brandLogo: 1 } },
        ]);
        res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        return res.status(200).json({ success: true, brands });
    } catch (error) {
        console.error("Motorcycle metadata error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch motorcycle filters." });
    }
};

const getHomepageMotorcycleData = async (req, res) => {
    try {
        const state = String(req.query.state || "Maharashtra");
        const city = String(req.query.city || "Pune");
        const [categories, motorcycles] = await Promise.all([
            Motorcycle.aggregate([
                { $match: { category: { $type: "string", $ne: "" } } },
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Motorcycle.find({}).sort({ rating: -1, createdAt: -1 }).limit(3).lean(),
        ]);
        let summaryMap = {};
        try {
            summaryMap = await fetchReviewSummaryMap(motorcycles.map((bike) => String(bike._id)));
        } catch (error) {
            console.error("Homepage review summary error:", error.message);
        }
        const featuredBikes = motorcycles.map((bike) => ({
            ...bike,
            reviewSummary: summaryMap[String(bike._id)] || { averageRating: 0, totalReviews: 0 },
            regionalPricing: calculateRegionalPricing({
                exShowroomPrice: bike.exShowroomPrice || bike.price,
                cityPrices: bike.cityPrices,
                state,
                city,
            }),
        }));
        res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
        return res.status(200).json({
            success: true,
            featuredBikes,
            categories: categories.map(({ _id, count }) => ({ name: _id, count })),
        });
    } catch (error) {
        console.error("Homepage motorcycle data error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch homepage motorcycles." });
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

        let reviewSummary = { averageRating: 0, totalReviews: 0 };
        try {
            const map = await fetchReviewSummaryMap([String(motorcycle._id)]);
            if (map[String(motorcycle._id)]) reviewSummary = map[String(motorcycle._id)];
        } catch (e) {
            console.error("Review summary enrichment error:", e.message);
        }

        const state = String(req.query.state || "Maharashtra");
        const city = String(req.query.city || "Pune");
        res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
        res.status(200).json({
            success: true,
            motorcycle: {
                ...motorcycle.toObject(),
                regionalPricing: calculateRegionalPricing({ exShowroomPrice: motorcycle.exShowroomPrice || motorcycle.price, cityPrices: motorcycle.cityPrices, state, city }),
            },
            reviewSummary
        });

    } catch (error) {
        console.error("Get motorcycle by ID error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch motorcycle"
        });
    }
};

const updateMotorcycleRegionalPricing = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        const error = validateRegionalPrices(req.body.cityPrices);
        if (error) return res.status(400).json({ success: false, message: error });
        const motorcycle = await Motorcycle.findByIdAndUpdate(
            id,
            { $set: { cityPrices: req.body.cityPrices } },
            { new: true, runValidators: true }
        ).lean();
        if (!motorcycle) return res.status(404).json({ success: false, message: "Motorcycle not found." });
        return res.status(200).json({ success: true, message: "Regional pricing saved.", cityPrices: motorcycle.cityPrices });
    } catch (error) {
        console.error("Update regional pricing error:", error.message);
        return res.status(500).json({ success: false, message: "Could not save regional pricing." });
    }
};


// =====================================================
// CREATE MOTORCYCLE
// POST /api/motorcycles
// =====================================================
const createMotorcycle = async (req, res) => {
    try {
        if (req.body.cityPrices !== undefined && req.user?.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can set regional pricing." });
        }
        if (req.body.cityPrices !== undefined) {
            const pricingError = validateRegionalPrices(req.body.cityPrices);
            if (pricingError) return res.status(400).json({ success: false, message: pricingError });
        }
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
            description,
            colors
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
        // Keep regional prices admin-configured. Missing city entries use
        // the clearly labeled estimate in regionalPricingService.
        const basePrice = Number(price) || 0;
        const initialCityPrices = Array.isArray(req.body.cityPrices) ? req.body.cityPrices : [];


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

            description: description || "",

            ...(Array.isArray(colors) ? { colors } : {}),

            cityPrices: initialCityPrices,
            exShowroomPrice: basePrice,
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

        if (req.body.cityPrices !== undefined && req.user?.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can change regional pricing." });
        }
        if (req.body.cityPrices !== undefined) {
            const pricingError = validateRegionalPrices(req.body.cityPrices);
            if (pricingError) return res.status(400).json({ success: false, message: pricingError });
        }

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
const updateMotorcycleColors = async (req, res) => {
    try {
        const { id } = req.params;
        const { colors } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }

        if (!Array.isArray(colors)) {
            return res.status(400).json({ success: false, message: "Colors must be an array." });
        }

        for (const c of colors) {
            if (!c.name || !String(c.name).trim()) {
                return res.status(400).json({ success: false, message: "Each color must have a name." });
            }
            if (!c.hexCode || !String(c.hexCode).trim()) {
                return res.status(400).json({ success: false, message: "Each color must have a hex code." });
            }
        }

        const updated = await Motorcycle.findByIdAndUpdate(
            id,
            { $set: { colors } },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }

        res.status(200).json({
            success: true,
            message: "Colors updated successfully.",
            colors: updated.colors,
        });
    } catch (error) {
        console.error("Update colors error:", error.message);
        res.status(500).json({ success: false, message: "Could not update colors." });
    }
};

module.exports = {
    getMotorcycles,
    getMotorcycleMetadata,
    getHomepageMotorcycleData,
    getMotorcycleById,
    createMotorcycle,
    updateMotorcycle,
    updateMotorcycleRegionalPricing,
    deleteMotorcycle,
    updateMotorcycleColors,
};
