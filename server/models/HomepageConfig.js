const mongoose = require("mongoose");

const SECTION_KEYS = [
    "hero",
    "stats",
    "promotions",
    "featuredMotorcycles",
    "updates",
    "brands",
    "categories",
    "topRated",
    "latestReviews",
    "specialOffers",
    "featuredDealerships",
    "infoSections",
    "footerPromo",
];

const sectionSchema = new mongoose.Schema(
    {
        sectionKey: { type: String, enum: SECTION_KEYS, required: true },
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "", trim: true, maxlength: 120 },
        subtitle: { type: String, default: "", trim: true, maxlength: 300 },
        itemLimit: { type: Number, default: 6, min: 1, max: 24 },
        displayOrder: { type: Number, default: 0, min: 0 },
        ctaText: { type: String, default: "", trim: true, maxlength: 60 },
        ctaUrl: { type: String, default: "", trim: true, maxlength: 300 },
        imageUrl: { type: String, default: "", trim: true, maxlength: 500 },
        // References into existing collections (motorcycle ids, advertisement ids, update ids, dealership ids, review ids)
        selectedItems: [{ type: mongoose.Schema.Types.Mixed, default: undefined }],
        // Extra free-form content for informational/promotional sections
        customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
    },
    { _id: false }
);

const homepageConfigSchema = new mongoose.Schema(
    {
        page: { type: String, default: "homepage", enum: ["homepage"], required: true },
        mode: { type: String, enum: ["draft", "published", "archived"], required: true },
        sections: { type: [sectionSchema], default: [] },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

homepageConfigSchema.index({ page: 1, mode: 1 }, { unique: true });

homepageConfigSchema.statics.SECTION_KEYS = SECTION_KEYS;

module.exports =
    mongoose.models.HomepageConfig || mongoose.model("HomepageConfig", homepageConfigSchema);
