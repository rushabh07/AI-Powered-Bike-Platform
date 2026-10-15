const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            maxlength: 150,
        },
        phone: {
            type: String,
            default: "",
            trim: true,
            maxlength: 20,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        category: {
            type: String,
            enum: ["general", "sales", "support", "test_ride", "feedback", "other"],
            default: "general",
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        consent: {
            type: Boolean,
            required: true,
        },
        referenceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        emailStatus: {
            type: String,
            enum: ["pending", "sent", "partial", "failed", "skipped"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

contactMessageSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
