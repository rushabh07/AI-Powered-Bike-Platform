const mongoose = require("mongoose");
const Advertisement = require("../models/Advertisement");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isSafeTarget = (url) => {
    if (!url || typeof url !== "string") return false;
    const t = url.trim();
    if (/^\s*javascript:/i.test(t)) return false;
    if (t.startsWith("/")) return true;
    return /^https:\/\//i.test(t);
};

const isValidImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    const t = url.trim();
    if (/^\s*javascript:/i.test(t) || /^\s*data:/i.test(t)) return false;
    return t.startsWith("/") || /^https:\/\//i.test(t);
};

const publicShape = (a) => ({
    _id: a._id,
    title: a.title,
    description: a.description,
    imageUrl: a.imageUrl,
    mobileImageUrl: a.mobileImageUrl || "",
    ctaText: a.ctaText,
    targetUrl: a.targetUrl,
    badgeText: a.badgeText || "",
});

// Eligible = active, not deleted, within [startDate, endDate]
const eligibleFilter = (placement) => {
    const now = new Date();
    return {
        status: "active",
        isDeleted: false,
        placement: placement || "homepage",
        $and: [
            { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
    };
};

// =====================================================
// PUBLIC — GET /api/advertisements
// =====================================================
const getPublicAds = async (req, res) => {
    try {
        const ads = await Advertisement.find(eligibleFilter(req.query.placement))
            .sort({ priority: -1, displayOrder: 1, createdAt: -1 })
            .lean();
        res.status(200).json({ success: true, count: ads.length, advertisements: ads.map(publicShape) });
    } catch (error) {
        console.error("Get public ads error:", error.message);
        res.status(500).json({ success: false, message: "Could not load advertisements." });
    }
};

const recordImpression = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid ID." });
        await Advertisement.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $inc: { impressions: 1 } }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not record impression." });
    }
};

const recordClick = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid ID." });
        await Advertisement.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $inc: { clicks: 1 } }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not record click." });
    }
};

const validateAdInput = (body) => {
    const errors = [];
    if (!body.title || !String(body.title).trim()) errors.push("Title is required.");
    if (!body.imageUrl || !isValidImageUrl(body.imageUrl)) errors.push("A valid banner image URL (https or / path) is required.");
    if (body.mobileImageUrl && String(body.mobileImageUrl).trim() && !isValidImageUrl(body.mobileImageUrl)) {
        errors.push("Mobile image URL is invalid.");
    }
    if (body.targetUrl && String(body.targetUrl).trim() && !isSafeTarget(body.targetUrl)) {
        errors.push("CTA destination must be an internal route (/) or https URL.");
    }
    if (body.status && !["draft", "active", "inactive"].includes(body.status)) errors.push("Invalid status.");
    if (body.placement && !["homepage", "motorcycles"].includes(body.placement)) errors.push("Invalid placement.");
    const start = body.startDate ? new Date(body.startDate) : null;
    const end = body.endDate ? new Date(body.endDate) : null;
    if (body.startDate && isNaN(start.getTime())) errors.push("Invalid start date.");
    if (body.endDate && isNaN(end.getTime())) errors.push("Invalid end date.");
    if (start && end && end < start) errors.push("End date cannot be before start date.");
    return errors;
};

const buildAdDoc = (body, createdBy) => ({
    title: String(body.title).trim().slice(0, 150),
    description: String(body.description || "").trim().slice(0, 500),
    imageUrl: String(body.imageUrl).trim(),
    mobileImageUrl: String(body.mobileImageUrl || "").trim(),
    ctaText: String(body.ctaText || "Explore Bikes").trim().slice(0, 40) || "Explore Bikes",
    targetUrl: String(body.targetUrl || "/motorcycles").trim() || "/motorcycles",
    badgeText: String(body.badgeText || "").trim().slice(0, 40),
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    priority: Number(body.priority) || 0,
    displayOrder: Number(body.displayOrder) || 0,
    status: ["draft", "active", "inactive"].includes(body.status) ? body.status : "draft",
    placement: ["homepage", "motorcycles"].includes(body.placement) ? body.placement : "homepage",
    ...(createdBy ? { createdBy } : {}),
});

module.exports = {
    isSafeTarget,
    isValidImageUrl,
    eligibleFilter,
    publicShape,
    getPublicAds,
    recordImpression,
    recordClick,
    validateAdInput,
    buildAdDoc,
};
