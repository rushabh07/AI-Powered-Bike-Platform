const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
    {
        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
        },
        to: {
            type: String,
            required: true,
            trim: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        html: {
            type: String,
            default: "",
        },
        text: {
            type: String,
            default: "",
        },
        entity: {
            type: String,
            default: "",
            trim: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        event: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["sent", "failed", "skipped"],
            default: "failed",
        },
        providerId: {
            type: String,
            default: "",
        },
        reason: {
            type: String,
            default: "",
        },
        attempts: {
            type: Number,
            default: 1,
            min: 1,
        },
    },
    {
        timestamps: true,
    }
);

emailLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
