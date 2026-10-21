const mongoose = require("mongoose");
const Update = require("../models/Update");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isValidHttpUrl = (value) => {
    if (!value) return true;
    const t = String(value).trim();
    if (!t) return true;
    try {
        const u = new URL(t);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
};

const makeSlug = (title, brand, modelName) => {
    const base = Update.slugify(`${title} ${brand} ${modelName}`.trim());
    return base || `update-${Date.now()}`;
};

const shapeUpdate = (u) => ({
    _id: u._id,
    title: u.title,
    slug: u.slug,
    motorcycle: u.motorcycle && u.motorcycle._id
        ? {
              _id: u.motorcycle._id,
              brand: u.motorcycle.brand,
              name: u.motorcycle.name,
              image: u.motorcycle.image || u.motorcycle.images?.[0]?.url || "",
          }
        : u.motorcycle,
    brand: u.brand || "",
    modelName: u.modelName || "",
    modelYear: u.modelYear || null,
    updateType: u.updateType,
    imageUrl: u.imageUrl || "",
    shortDescription: u.shortDescription || "",
    content: u.content || "",
    sourceName: u.sourceName || "",
    sourceUrl: u.sourceUrl || "",
    publishedAt: u.publishedAt || null,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
});

// =====================================================
// PUBLIC — GET /api/updates (published only, newest first)
// =====================================================
const getPublicUpdates = async (req, res) => {
    try {
        const { search, updateType, brand, from, to, limit = 6, page = 1, featured } = req.query;

        const filter = { status: "published" };
        if (featured === "true") filter.featured = true;

        if (updateType && Update.UPDATE_TYPES.includes(updateType)) {
            filter.updateType = updateType;
        }
        if (brand && String(brand).trim()) {
            filter.brand = new RegExp(String(brand).trim(), "i");
        }

        // Date range filter on publishedAt
        if (from || to) {
            filter.publishedAt = {};
            if (from && !isNaN(new Date(from).getTime())) {
                filter.publishedAt.$gte = new Date(from);
            }
            if (to && !isNaN(new Date(to).getTime())) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                filter.publishedAt.$lte = end;
            }
        }

        // Text search across title, model, brand, summary
        if (search && String(search).trim()) {
            const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { title: rx },
                { modelName: rx },
                { brand: rx },
                { shortDescription: rx },
            ];
        }

        const lim = limit === "all"
            ? null
            : Math.min(Math.max(parseInt(limit, 10) || 6, 1), 50);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);

        let query = Update.find(filter).sort({ publishedAt: -1, createdAt: -1 });

        if (lim) {
            query = query.skip((pageNum - 1) * lim).limit(lim);
        }

        const [updates, total] = await Promise.all([
            query.populate({ path: "motorcycle", select: "brand name image images" }).lean(),
            Update.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: updates.length,
            total,
            updates: updates.map(shapeUpdate),
        });
    } catch (error) {
        console.error("Get public updates error:", error.message);
        res.status(500).json({ success: false, message: "Could not load updates." });
    }
};

// =====================================================
// PUBLIC — GET /api/updates/:slug (published only)
// =====================================================
const getPublicUpdateBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        if (!slug || typeof slug !== "string") {
            return res.status(400).json({ success: false, message: "Invalid update slug." });
        }

        const update = await Update.findOne({ slug: slug.toLowerCase().trim(), status: "published" })
            .populate({ path: "motorcycle", select: "brand name image images" })
            .lean();

        if (!update) {
            return res.status(404).json({ success: false, message: "Update not found." });
        }

        // Related updates (same type or brand), excluding current
        const related = await Update.find({
            status: "published",
            _id: { $ne: update._id },
            $or: [
                ...(update.brand ? [{ brand: new RegExp(update.brand, "i") }] : []),
                { updateType: update.updateType },
            ],
        })
            .sort({ publishedAt: -1 })
            .limit(3)
            .populate({ path: "motorcycle", select: "brand name image images" })
            .lean();

        res.status(200).json({
            success: true,
            update: shapeUpdate(update),
            related: related.map(shapeUpdate),
        });
    } catch (error) {
        console.error("Get public update error:", error.message);
        res.status(500).json({ success: false, message: "Could not load update." });
    }
};

// =====================================================
// ADMIN — GET /api/admin/updates (all statuses)
// =====================================================
const getAdminUpdates = async (req, res) => {
    try {
        const { search, status, updateType, page = 1, limit = 15, sort = "-publishedAt" } = req.query;

        const filter = {};
        if (status && Update.UPDATE_STATUSES.includes(status)) filter.status = status;
        if (updateType && Update.UPDATE_TYPES.includes(updateType)) filter.updateType = updateType;
        if (search && String(search).trim()) {
            const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { title: rx },
                { brand: rx },
                { modelName: rx },
                { sourceName: rx },
            ];
        }

        const allowedSorts = ["-publishedAt", "publishedAt", "-createdAt", "createdAt", "-updatedAt", "updatedAt", "title", "-title"];
        const sortBy = allowedSorts.includes(sort) ? sort : "-publishedAt";

        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * Math.min(parseInt(limit, 10) || 15, 50);

        const [items, total] = await Promise.all([
            Update.find(filter)
                .populate({ path: "motorcycle", select: "brand name" })
                .populate({ path: "createdBy", select: "name email" })
                .sort(sortBy)
                .skip(skip)
                .limit(Math.min(parseInt(limit, 10) || 15, 50))
                .lean(),
            Update.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: items.length,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            pages: Math.ceil(total / Math.min(parseInt(limit, 10) || 15, 50)) || 1,
            updates: items.map((u) => ({
                ...shapeUpdate(u),
                createdBy: u.createdBy && u.createdBy._id
                    ? { _id: u.createdBy._id, name: u.createdBy.name, email: u.createdBy.email }
                    : null,
            })),
        });
    } catch (error) {
        console.error("Admin list updates error:", error.message);
        res.status(500).json({ success: false, message: "Could not load updates." });
    }
};

// =====================================================
// ADMIN — GET /api/admin/updates/:id
// =====================================================
const getAdminUpdate = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid update ID." });
        }
        const update = await Update.findById(req.params.id)
            .populate({ path: "motorcycle", select: "brand name image images" })
            .lean();
        if (!update) {
            return res.status(404).json({ success: false, message: "Update not found." });
        }
        res.status(200).json({ success: true, update: shapeUpdate(update) });
    } catch (error) {
        console.error("Admin get update error:", error.message);
        res.status(500).json({ success: false, message: "Could not load update." });
    }
};

// =====================================================
// ADMIN — POST /api/admin/updates
// =====================================================
const createUpdate = async (req, res) => {
    try {
        const {
            title,
            motorcycleId,
            brand,
            modelName,
            modelYear,
            updateType,
            imageUrl,
            shortDescription,
            content,
            sourceName,
            sourceUrl,
            publishedAt,
            status,
        } = req.body || {};

        const errors = [];
        if (!title || !String(title).trim()) errors.push("Title is required.");
        if (!shortDescription || !String(shortDescription).trim()) errors.push("Short description is required.");
        if (motorcycleId && !isValidId(motorcycleId)) errors.push("Selected motorcycle is invalid.");
        if (updateType && !Update.UPDATE_TYPES.includes(updateType)) errors.push("Invalid update category.");
        if (status && !Update.UPDATE_STATUSES.includes(status)) errors.push("Invalid status.");
        if (imageUrl && !isValidHttpUrl(imageUrl)) errors.push("Image URL must be a valid http(s) URL.");
        if (sourceUrl && !isValidHttpUrl(sourceUrl)) errors.push("Source URL must be a valid http(s) URL.");
        if (publishedAt && isNaN(new Date(publishedAt).getTime())) errors.push("Invalid publication date.");
        if (modelYear && (isNaN(Number(modelYear)) || Number(modelYear) < 1900 || Number(modelYear) > 2100)) {
            errors.push("Model year must be a valid year.");
        }
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(" ") });
        }

        const finalStatus = Update.UPDATE_STATUSES.includes(status) ? status : "draft";
        const finalPublishedAt = finalStatus === "published"
            ? publishedAt && !isNaN(new Date(publishedAt).getTime()) ? new Date(publishedAt) : new Date()
            : publishedAt && !isNaN(new Date(publishedAt).getTime()) ? new Date(publishedAt) : null;

        // Generate unique slug
        let slug = makeSlug(title, brand, modelName);
        const existing = await Update.findOne({ slug }).lean();
        if (existing) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        // Resolve motorcycle reference (validate it exists)
        let motorcycle = null;
        if (motorcycleId && isValidId(motorcycleId)) {
            const mongoose = require("mongoose");
            const Motorcycle = require("../models/Motorcycle");
            motorcycle = await Motorcycle.findById(motorcycleId).select("_id").lean();
            if (!motorcycle) return res.status(400).json({ success: false, message: "Selected motorcycle does not exist." });
        }

        const update = await Update.create({
            title: String(title).trim().slice(0, 200),
            slug,
            motorcycle: motorcycle ? motorcycle._id : null,
            brand: String(brand || "").trim().slice(0, 80),
            modelName: String(modelName || "").trim().slice(0, 120),
            modelYear: modelYear ? Number(modelYear) : null,
            updateType: Update.UPDATE_TYPES.includes(updateType) ? updateType : "news",
            imageUrl: String(imageUrl || "").trim(),
            shortDescription: String(shortDescription).trim().slice(0, 400),
            content: String(content || "").trim(),
            sourceName: String(sourceName || "").trim().slice(0, 120),
            sourceUrl: String(sourceUrl || "").trim().slice(0, 500),
            publishedAt: finalPublishedAt,
            status: finalStatus,
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, message: "Update created successfully.", update: shapeUpdate(update) });
    } catch (error) {
        console.error("Create update error:", error.message);
        res.status(500).json({ success: false, message: "Could not create update." });
    }
};

// =====================================================
// ADMIN — PUT /api/admin/updates/:id
// =====================================================
const updateUpdate = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid update ID." });
        }

        const update = await Update.findById(req.params.id);
        if (!update) {
            return res.status(404).json({ success: false, message: "Update not found." });
        }

        const {
            title,
            motorcycleId,
            brand,
            modelName,
            modelYear,
            updateType,
            imageUrl,
            shortDescription,
            content,
            sourceName,
            sourceUrl,
            publishedAt,
            status,
        } = req.body || {};

        const errors = [];
        if (title !== undefined && !String(title).trim()) errors.push("Title cannot be empty.");
        if (shortDescription !== undefined && !String(shortDescription).trim()) errors.push("Short description cannot be empty.");
        if (motorcycleId !== undefined && motorcycleId !== null && !isValidId(motorcycleId)) errors.push("Selected motorcycle is invalid.");
        if (updateType !== undefined && !Update.UPDATE_TYPES.includes(updateType)) errors.push("Invalid update category.");
        if (status !== undefined && !Update.UPDATE_STATUSES.includes(status)) errors.push("Invalid status.");
        if (imageUrl !== undefined && imageUrl !== "" && !isValidHttpUrl(imageUrl)) errors.push("Image URL must be a valid http(s) URL.");
        if (sourceUrl !== undefined && sourceUrl !== "" && !isValidHttpUrl(sourceUrl)) errors.push("Source URL must be a valid http(s) URL.");
        if (publishedAt !== undefined && publishedAt !== null && publishedAt !== "" && isNaN(new Date(publishedAt).getTime())) {
            errors.push("Invalid publication date.");
        }
        if (modelYear !== undefined && modelYear !== null && modelYear !== "" &&
            (isNaN(Number(modelYear)) || Number(modelYear) < 1900 || Number(modelYear) > 2100)) {
            errors.push("Model year must be a valid year.");
        }
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(" ") });
        }

        if (title !== undefined) update.title = String(title).trim().slice(0, 200);
        if (shortDescription !== undefined) update.shortDescription = String(shortDescription).trim().slice(0, 400);
        if (content !== undefined) update.content = String(content).trim();
        if (brand !== undefined) update.brand = String(brand || "").trim().slice(0, 80);
        if (modelName !== undefined) update.modelName = String(modelName || "").trim().slice(0, 120);
        if (updateType !== undefined) update.updateType = updateType;
        if (imageUrl !== undefined) update.imageUrl = String(imageUrl).trim();
        if (sourceName !== undefined) update.sourceName = String(sourceName || "").trim().slice(0, 120);
        if (sourceUrl !== undefined) update.sourceUrl = String(sourceUrl || "").trim().slice(0, 500);
        if (modelYear !== undefined) update.modelYear = modelYear === null || modelYear === "" ? null : Number(modelYear);

        // Motorcycle reference: null clears it, otherwise validate existence
        if (motorcycleId !== undefined) {
            if (motorcycleId === null) {
                update.motorcycle = null;
            } else if (isValidId(motorcycleId)) {
                const mongoose = require("mongoose");
                const Motorcycle = require("../models/Motorcycle");
                const bike = await Motorcycle.findById(motorcycleId).select("_id").lean();
                if (!bike) return res.status(400).json({ success: false, message: "Selected motorcycle does not exist." });
                update.motorcycle = bike._id;
            }
        }

        // Status change: auto-manage publishedAt
        if (status !== undefined && status !== update.status) {
            update.status = status;
            if (status === "published" && !update.publishedAt) {
                update.publishedAt = publishedAt && !isNaN(new Date(publishedAt).getTime())
                    ? new Date(publishedAt)
                    : new Date();
            }
            if (status !== "published") {
                update.publishedAt = null;
            }
        } else if (publishedAt !== undefined) {
            update.publishedAt = publishedAt === null || publishedAt === ""
                ? null
                : new Date(publishedAt);
        }

        await update.save();

        res.status(200).json({ success: true, message: "Update saved successfully.", update: shapeUpdate(update) });
    } catch (error) {
        console.error("Update update error:", error.message);
        res.status(500).json({ success: false, message: "Could not update update." });
    }
};

// =====================================================
// ADMIN — PATCH /api/admin/updates/:id/status
// =====================================================
const updateUpdateStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid update ID." });
        }

        const { status } = req.body || {};
        if (!Update.UPDATE_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${Update.UPDATE_STATUSES.join(", ")}.`,
            });
        }

        const update = await Update.findById(req.params.id);
        if (!update) {
            return res.status(404).json({ success: false, message: "Update not found." });
        }

        update.status = status;
        if (status === "published" && !update.publishedAt) {
            update.publishedAt = new Date();
        }
        if (status !== "published") {
            update.publishedAt = null;
        }
        await update.save();

        res.status(200).json({
            success: true,
            message: `Update ${status === "published" ? "published" : status === "archived" ? "archived" : "unpublished"} successfully.`,
            update: shapeUpdate(update),
        });
    } catch (error) {
        console.error("Update status error:", error.message);
        res.status(500).json({ success: false, message: "Could not update status." });
    }
};

// =====================================================
// ADMIN — DELETE /api/admin/updates/:id
// =====================================================
const deleteUpdate = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid update ID." });
        }
        const update = await Update.findByIdAndDelete(req.params.id);
        if (!update) {
            return res.status(404).json({ success: false, message: "Update not found." });
        }
        res.status(200).json({ success: true, message: "Update deleted successfully." });
    } catch (error) {
        console.error("Delete update error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete update." });
    }
};

module.exports = {
    getPublicUpdates,
    getPublicUpdateBySlug,
    getAdminUpdates,
    getAdminUpdate,
    createUpdate,
    updateUpdate,
    updateUpdateStatus,
    deleteUpdate,
};
