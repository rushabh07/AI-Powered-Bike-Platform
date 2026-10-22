const mongoose = require("mongoose");
const HomepageConfig = require("../models/HomepageConfig");
const Motorcycle = require("../models/Motorcycle");
const Advertisement = require("../models/Advertisement");
const Review = require("../models/Review");
const Update = require("../models/Update");
const Dealership = require("../models/Dealership");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isSafePath = (url) => {
    if (!url) return true;
    const t = String(url).trim();
    if (!t) return true;
    if (/^\s*javascript:/i.test(t)) return false;
    return t.startsWith("/") || /^https:\/\//i.test(t);
};

const shapeSection = (s) => ({
    sectionKey: s.sectionKey,
    enabled: !!s.enabled,
    title: s.title || "",
    subtitle: s.subtitle || "",
    itemLimit: s.itemLimit || 6,
    displayOrder: s.displayOrder || 0,
    ctaText: s.ctaText || "",
    ctaUrl: s.ctaUrl || "",
    imageUrl: s.imageUrl || "",
    selectedItems: Array.isArray(s.selectedItems) ? s.selectedItems : [],
    customFields: s.customFields || {},
    startDate: s.startDate || null,
    endDate: s.endDate || null,
});

// ---------- content resolvers (always from MongoDB) ----------

const resolveMotorcycles = async (ids, limit) => {
    const valid = (ids || []).filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));
    let query = valid.length > 0 ? { _id: { $in: valid } } : {};
    const bikes = await Motorcycle.find(query).lean();
    // attach ratings from reviews
    const bikeIds = bikes.map((b) => b._id);
    const reviewAgg = await Review.aggregate([
        { $match: { motorcycle: { $in: bikeIds }, $or: [{ status: null }, { status: "approved" }] } },
        { $group: { _id: "$motorcycle", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(reviewAgg.map((r) => [String(r._id), { avg: r.avg, count: r.count }]));
    return bikes.slice(0, limit || bikes.length).map((b) => ({
        _id: b._id,
        brand: b.brand,
        name: b.name,
        image: b.image || b.images?.[0]?.url || "",
        price: b.price || b.exShowroomPrice || 0,
        engine: b.engine || "",
        power: b.power || "",
        rating: ratingMap.get(String(b._id))?.avg || 0,
        ratingCount: ratingMap.get(String(b._id))?.count || 0,
    }));
};

const resolveAds = async (ids, limit) => {
    const valid = (ids || []).filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));
    let ads;
    if (valid.length > 0) {
        ads = await Advertisement.find({ _id: { $in: valid }, isDeleted: false }).lean();
    } else {
        const now = new Date();
        ads = await Advertisement.find({
            status: "active",
            isDeleted: false,
            placement: "homepage",
            $and: [
                { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
                { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
            ],
        }).sort({ priority: -1, displayOrder: 1 }).lean();
    }
    return ads.slice(0, limit || ads.length).map((a) => ({
        _id: a._id,
        title: a.title,
        description: a.description,
        imageUrl: a.imageUrl,
        ctaText: a.ctaText,
        targetUrl: a.targetUrl,
    }));
};

const resolveUpdates = async (ids, limit) => {
    const valid = (ids || []).filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));
    let query = { status: "published" };
    if (valid.length > 0) query._id = { $in: valid };
    const updates = await Update.find(query).sort({ publishedAt: -1 }).limit(limit || 6).lean();
    return updates.map((u) => ({
        _id: u._id,
        title: u.title,
        slug: u.slug,
        imageUrl: u.imageUrl || "",
        shortDescription: u.shortDescription || "",
        updateType: u.updateType,
        publishedAt: u.publishedAt,
    }));
};

const resolveDealerships = async (ids, limit) => {
    const valid = (ids || []).filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));
    const query = { isActive: true };
    if (valid.length > 0) query._id = { $in: valid };
    const dealers = await Dealership.find(query).sort({ createdAt: -1 }).limit(limit || 6).lean();
    return dealers.map((d) => ({
        _id: d._id,
        name: d.name,
        city: d.city || "",
        phone: d.phone || "",
    }));
};

const approvedReviewMatch = { $or: [{ status: null }, { status: "approved" }] };

const resolveStats = async () => {
    const [totalBikes, brandAgg, activeDealers, reviewAgg, publishedUpdates] = await Promise.all([
        Motorcycle.countDocuments({}),
        Motorcycle.distinct("brand"),
        Dealership.countDocuments({ isActive: true }),
        Review.aggregate([
            { $match: approvedReviewMatch },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]),
        Update.countDocuments({ status: "published" }),
    ]);
    const review = reviewAgg[0] || { avg: 0, count: 0 };
    return {
        totalMotorcycles: totalBikes,
        totalBrands: brandAgg.length,
        activeDealerships: activeDealers,
        averageRating: Math.round(review.avg * 10) / 10,
        totalReviews: review.count,
        publishedUpdates,
    };
};

const resolveTopRated = async (limit = 6) => {
    const agg = await Review.aggregate([
        { $match: approvedReviewMatch },
        { $group: { _id: "$motorcycle", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $match: { count: { $gte: 1 } } },
        { $sort: { avg: -1 } },
        { $limit: limit || 6 },
    ]);
    const bikeIds = agg.map((r) => r._id);
    const bikes = await Motorcycle.find({ _id: { $in: bikeIds } }).lean();
    const bikeMap = new Map(bikes.map((b) => [String(b._id), b]));
    return agg
        .map((r) => {
            const b = bikeMap.get(String(r._id));
            if (!b) return null;
            return {
                _id: b._id,
                brand: b.brand,
                name: b.name,
                image: b.image || b.images?.[0]?.url || "",
                price: b.price || b.exShowroomPrice || 0,
                rating: Math.round(r.avg * 10) / 10,
                ratingCount: r.count,
            };
        })
        .filter(Boolean);
};

const resolveLatestReviews = async (limit = 6) => {
    const reviews = await Review
        .find({ $or: [{ status: null }, { status: "approved" }] })
        .sort({ createdAt: -1 })
        .limit(limit || 6)
        .populate({ path: "motorcycle", select: "brand name image images" })
        .populate({ path: "user", select: "name" })
        .lean();
    return reviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        title: r.title || "",
        comment: r.comment || "",
        createdAt: r.createdAt,
        user: r.user && r.user._id ? r.user.name : "Verified Rider",
        motorcycle: r.motorcycle && r.motorcycle._id
            ? {
                  _id: r.motorcycle._id,
                  brand: r.motorcycle.brand,
                  name: r.motorcycle.name,
                  image: r.motorcycle.image || r.motorcycle.images?.[0]?.url || "",
              }
            : null,
    }));
};

const resolveBrands = async (limit = 12) => {
    const agg = await Motorcycle.aggregate([
        { $group: { _id: "$brand", logo: { $first: "$brandLogo" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit || 12 },
    ]);
    return agg.map((b) => ({ name: b._id, logo: b.logo || "", count: b.count }));
};

const resolveCategories = async (limit = 10) => {
    const agg = await Motorcycle.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit || 10 },
    ]);
    return agg.map((c) => ({ name: c._id, count: c.count }));
};

// ---------- section resolution ----------

const resolveSectionContent = async (section) => {
    const key = section.sectionKey;
    const limit = section.itemLimit || 6;
    switch (key) {
        case "hero":
            return {
                title: section.title || "",
                subtitle: section.subtitle || "",
                ctaText: section.ctaText || "",
                ctaUrl: section.ctaUrl || "",
                imageUrl: section.imageUrl || "",
            };
        case "stats":
            return { ...(await resolveStats()), customFields: section.customFields || {} };
        case "promotions":
            return { advertisements: await resolveAds(section.selectedItems, limit) };
        case "featuredMotorcycles":
            return { motorcycles: await resolveMotorcycles(section.selectedItems, limit) };
        case "updates":
            return { updates: await resolveUpdates(section.selectedItems, limit) };
        case "topRated":
            return { motorcycles: await resolveTopRated(limit) };
        case "latestReviews":
            return { reviews: await resolveLatestReviews(limit) };
        case "featuredDealerships":
            return { dealerships: await resolveDealerships(section.selectedItems, limit) };
        case "brands":
            return { brands: await resolveBrands(limit) };
        case "categories":
            return { categories: await resolveCategories(limit) };
        case "specialOffers":
        case "infoSections":
        case "footerPromo":
            return { customFields: section.customFields || {}, title: section.title || "", subtitle: section.subtitle || "" };
        default:
            return {};
    }
};

// ---------- public endpoint ----------

const getPublicHomepage = async (req, res) => {
    try {
        const config = await HomepageConfig.findOne({ page: "homepage", mode: "published" }).lean();
        if (!config) {
            return res.status(200).json({ success: true, configured: false, sections: [] });
        }
        const sections = [...config.sections]
            .filter((s) => s.enabled)
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        // A published config with no visible sections is a broken state
        // (e.g. an empty draft got published). Fall back to the default,
        // non-CMS homepage instead of returning an empty page.
        if (sections.length === 0) {
            return res.status(200).json({ success: true, configured: false, sections: [] });
        }

        const resolved = [];
        for (const section of sections) {
            try {
                const content = await resolveSectionContent(section);
                resolved.push({ ...shapeSection(section), content });
            } catch (err) {
                console.error(`Homepage section ${section.sectionKey} error:`, err.message);
                // skip broken section, never break the homepage
            }
        }

        res.status(200).json({ success: true, configured: true, sections: resolved });
    } catch (error) {
        console.error("Get public homepage error:", error.message);
        res.status(500).json({ success: false, message: "Could not load homepage." });
    }
};

// ---------- admin endpoints ----------

const DEFAULT_SECTIONS = HomepageConfig.SECTION_KEYS.map((key, i) => ({
    sectionKey: key,
    enabled: ["hero", "stats", "promotions", "featuredMotorcycles", "updates", "categories"].includes(key),
    title: "",
    subtitle: "",
    itemLimit: 6,
    displayOrder: i,
    selectedItems: [],
    customFields: {},
}));

const getOrCreateDraft = async () => {
    let draft = await HomepageConfig.findOne({ page: "homepage", mode: "draft" }).lean();
    if (!draft) {
        const created = await HomepageConfig.create({ page: "homepage", mode: "draft", sections: DEFAULT_SECTIONS });
        draft = created.toObject();
    } else if ((draft.sections || []).length === 0) {
        const healed = await HomepageConfig.findByIdAndUpdate(
            draft._id,
            { $set: { sections: DEFAULT_SECTIONS } },
            { new: true, runValidators: true }
        );
        draft = healed.toObject();
    }
    return draft;
};

const getAdminHomepage = async (req, res) => {
    try {
        const draft = await getOrCreateDraft();
        const published = await HomepageConfig.findOne({ page: "homepage", mode: "published" }).lean();
        res.status(200).json({
            success: true,
            draft: { _id: draft._id, sections: (draft.sections || []).map(shapeSection), updatedAt: draft.updatedAt },
            published: published
                ? { _id: published._id, sections: (published.sections || []).map(shapeSection), updatedAt: published.updatedAt }
                : null,
        });
    } catch (error) {
        console.error("Admin get homepage error:", error.message);
        res.status(500).json({ success: false, message: "Could not load homepage configuration." });
    }
};

const validateSections = (sections) => {
    const errors = [];
    if (!Array.isArray(sections)) return ["Sections must be an array."];
    const seen = new Set();
    for (const s of sections) {
        if (!HomepageConfig.SECTION_KEYS.includes(s.sectionKey)) {
            errors.push(`Unknown section: ${s.sectionKey}`);
            continue;
        }
        if (seen.has(s.sectionKey)) errors.push(`Duplicate section: ${s.sectionKey}`);
        seen.add(s.sectionKey);
        if (s.ctaUrl && !isSafePath(s.ctaUrl)) errors.push(`Invalid CTA URL in ${s.sectionKey}.`);
        if (s.imageUrl && !isSafePath(s.imageUrl)) errors.push(`Invalid image URL in ${s.sectionKey}.`);
        if (s.itemLimit !== undefined && (isNaN(Number(s.itemLimit)) || Number(s.itemLimit) < 1 || Number(s.itemLimit) > 24)) {
            errors.push(`Item limit for ${s.sectionKey} must be between 1 and 24.`);
        }
        if (s.selectedItems !== undefined && !Array.isArray(s.selectedItems)) {
            errors.push(`Selected items for ${s.sectionKey} must be an array.`);
        }
    }
    return errors;
};

const updateDraftHomepage = async (req, res) => {
    try {
        const { sections, updatedBy } = req.body || {};
        const errors = validateSections(sections);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(" ") });
        }
        const normalized = sections.map((s, i) => ({
            sectionKey: s.sectionKey,
            enabled: !!s.enabled,
            title: String(s.title || "").trim().slice(0, 120),
            subtitle: String(s.subtitle || "").trim().slice(0, 300),
            itemLimit: Math.min(Math.max(Number(s.itemLimit) || 6, 1), 24),
            displayOrder: Number.isFinite(Number(s.displayOrder)) ? Number(s.displayOrder) : i,
            ctaText: String(s.ctaText || "").trim().slice(0, 60),
            ctaUrl: String(s.ctaUrl || "").trim().slice(0, 300),
            imageUrl: String(s.imageUrl || "").trim().slice(0, 500),
            selectedItems: Array.isArray(s.selectedItems) ? s.selectedItems.slice(0, 50).map(String) : [],
            customFields: s.customFields && typeof s.customFields === "object" ? s.customFields : {},
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null,
        }));

        const draft = await HomepageConfig.findOneAndUpdate(
            { page: "homepage", mode: "draft" },
            { $set: { sections: normalized, updatedBy: req.user._id } },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Draft saved.",
            draft: { _id: draft._id, sections: draft.sections.map(shapeSection), updatedAt: draft.updatedAt },
        });
    } catch (error) {
        console.error("Save homepage draft error:", error.message);
        res.status(500).json({ success: false, message: "Could not save draft." });
    }
};

const publishHomepage = async (req, res) => {
    try {
        const { updatedBy } = req.body || {};
        const draft = await HomepageConfig.findOne({ page: "homepage", mode: "draft" }).lean();
        if (!draft) {
            return res.status(404).json({ success: false, message: "No draft configuration found." });
        }

        // validate before publishing
        const errors = validateSections(draft.sections);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(" ") });
        }

        // Never publish an empty homepage — it would blank the live site.
        if ((draft.sections || []).length === 0) {
            return res.status(400).json({ success: false, message: "Cannot publish an empty homepage configuration." });
        }

        const now = new Date();
        const publishedSections = draft.sections.map((s) => ({
            ...s,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null,
        }));

        // Keep the previous published config for rollback (only one snapshot retained)
        await HomepageConfig.deleteMany({ page: "homepage", mode: "archived" });
        const previous = await HomepageConfig.findOne({ page: "homepage", mode: "published" }).lean();
        if (previous) {
            await HomepageConfig.findByIdAndUpdate(previous._id, {
                $set: { page: "homepage", mode: "archived" },
            });
        }

        const published = await HomepageConfig.findOneAndUpdate(
            { page: "homepage", mode: "published" },
            {
                $set: {
                    sections: publishedSections,
                    updatedBy: req.user._id || updatedBy,
                    page: "homepage",
                    mode: "published",
                },
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Homepage published successfully.",
            published: { _id: published._id, sections: published.sections.map(shapeSection), updatedAt: published.updatedAt },
            previousPublishedId: previous?._id || null,
        });
    } catch (error) {
        console.error("Publish homepage error:", error.message);
        res.status(500).json({ success: false, message: "Could not publish homepage." });
    }
};

const previewHomepage = async (req, res) => {
    try {
        const bodySections = Array.isArray(req.body?.sections) ? req.body.sections : null;
        const errors = bodySections ? validateSections(bodySections) : [];
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(" ") });
        }
        const baseSections = bodySections || (await getOrCreateDraft()).sections;
        const sections = [...baseSections]
            .filter((s) => s.enabled)
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        const resolved = [];
        for (const section of sections) {
            try {
                const content = await resolveSectionContent(section);
                resolved.push({ ...shapeSection(section), content });
            } catch (err) {
                console.error(`Preview section ${section.sectionKey} error:`, err.message);
            }
        }
        res.status(200).json({ success: true, sections: resolved });
    } catch (error) {
        console.error("Preview homepage error:", error.message);
        res.status(500).json({ success: false, message: "Could not generate preview." });
    }
};

const restorePublished = async (req, res) => {
    try {
        // Roll back: copy archived snapshot content into the published doc, then drop the snapshot
        const archived = await HomepageConfig.findOne({ page: "homepage", mode: "archived" }).sort({ updatedAt: -1 }).lean();
        if (!archived) {
            return res.status(404).json({ success: false, message: "No previous published configuration found." });
        }
        const restored = await HomepageConfig.findOneAndUpdate(
            { page: "homepage", mode: "published" },
            { $set: { sections: archived.sections, updatedBy: archived.updatedBy } },
            { new: true, upsert: true }
        );
        await HomepageConfig.deleteOne({ _id: archived._id });
        res.status(200).json({ success: true, message: "Previous published configuration restored." });
    } catch (error) {
        console.error("Restore homepage error:", error.message);
        res.status(500).json({ success: false, message: "Could not restore configuration." });
    }
};

module.exports = {
    getPublicHomepage,
    getAdminHomepage,
    updateDraftHomepage,
    publishHomepage,
    previewHomepage,
    restorePublished,
};

