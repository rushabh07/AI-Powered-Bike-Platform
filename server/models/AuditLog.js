const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            required: true,
            trim: true,
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
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            default: null,
        },
        details: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
        capped: false,
    }
);

auditLogSchema.index({ dealership: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
