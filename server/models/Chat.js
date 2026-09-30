const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },

        content: {
            type: String,
            required: true,
        },

        recommendations: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Motorcycle",
            },
        ],

        // Why each recommended bike matches, keyed by bike id.
        // Stored beside the ids so history reloads keep reasons.
        reasons: {
            type: Map,
            of: String,
            default: {},
        },

        feedback: {
            type: String,
            enum: ["like", "dislike", null],
            default: null,
        },

        // AI credits charged for generating this message (0 for user msgs)
        tokensUsed: {
            type: Number,
            default: 0,
            min: 0,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const chatSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: {
            type: String,
            default: "New Chat",
            trim: true,
        },

        messages: [chatMessageSchema],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Chat", chatSchema);
