const mongoose = require("mongoose");

const UPDATE_TYPES = [
    "new_launch",
    "updated_model",
    "price_update",
    "new_variant",
    "news",
];

const UPDATE_STATUSES = ["draft", "published", "archived"];

const slugify = (text) =>
    String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120);

const updateSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required."],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters."],
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            default: null,
        },
        brand: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
        },
        modelName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },
        modelYear: {
            type: Number,
            default: null,
            min: 1900,
            max: 2100,
        },
        updateType: {
            type: String,
            enum: UPDATE_TYPES,
            default: "news",
        },
        imageUrl: {
            type: String,
            default: "",
            trim: true,
        },
        shortDescription: {
            type: String,
            default: "",
            trim: true,
            maxlength: [400, "Short description cannot exceed 400 characters."],
        },
        content: {
            type: String,
            default: "",
            trim: true,
        },
        sourceName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },
        sourceUrl: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: UPDATE_STATUSES,
            default: "draft",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

updateSchema.index({ status: 1, publishedAt: -1 });
updateSchema.index({ updateType: 1, status: 1 });
updateSchema.index({ brand: 1, status: 1 });

updateSchema.statics.slugify = slugify;
updateSchema.statics.UPDATE_TYPES = UPDATE_TYPES;
updateSchema.statics.UPDATE_STATUSES = UPDATE_STATUSES;

module.exports = mongoose.models.Update || mongoose.model("Update", updateSchema);
