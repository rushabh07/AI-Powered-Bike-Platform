const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        address: {
            type: String,
            default: "",
            trim: true,
        },

        profileImage: {
            type: String,
            default: "",
            trim: true,
        },

        role: {
            type: String,
            enum: ["user", "customer", "provider", "admin"],
            default: "user",
        },

        aiPlan: {
            type: String,
            enum: ["free", "premium"],
            default: "free",
        },

        aiPlanType: {
            type: String,
            enum: ["free", "monthly", "yearly"],
            default: "free",
        },

        aiTokens: {
            type: Number,
            default: () => parseInt(process.env.FREE_AI_TOKENS, 10) || 20,
            min: 0,
        },

        aiTokensUsed: {
            type: Number,
            default: 0,
            min: 0,
        },

        aiPlanStartedAt: {
            type: Date,
            default: null,
        },

        favoriteMotorcycles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Motorcycle",
            },
        ],

        aiPlanExpiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast role, token, and plan lookups
userSchema.index({ role: 1 });
userSchema.index({ aiPlan: 1, aiPlanExpiresAt: 1 });
userSchema.index({ aiTokens: 1 });

module.exports = mongoose.model("User", userSchema);
