const mongoose = require("mongoose");

const Chat = require("../models/Chat");
const { generateAdvisorReply } = require("./aiAdvisorController");
const {
    effectivePlan,
    walletOf,
    tokenGate,
    deductToken,
} = require("../utils/aiTokens");

/*
========================================
CHAT CONTROLLER — persistent ChatGPT-style
conversations stored in MongoDB.

Every endpoint requires JWT (protect) and
scopes all access to req.user._id. The
frontend never sends a userId.
========================================
*/

const RECO_SELECT =
    "name brand brandLogo category price fuel engine mileage power torque rating image batteryCapacity range chargingTime topSpeed weight";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Load a chat owned by this user (or send 400/404)
const getOwnedChat = async (req, res, populateRecos = false) => {
    const { chatId } = req.params;

    if (!isValidId(chatId)) {
        res.status(400).json({
            success: false,
            message: "Invalid chat ID.",
        });
        return null;
    }

    let query = Chat.findOne({
        _id: chatId,
        user: req.user._id,
    });

    if (populateRecos) {
        query = query.populate({
            path: "messages.recommendations",
            select: RECO_SELECT,
        });
    }

    const chat = await query;

    if (!chat) {
        res.status(404).json({
            success: false,
            message: "Chat not found.",
        });
        return null;
    }

    return chat;
};

const shapeMessage = (m) => {
    const reasons =
        m.reasons instanceof Map
            ? m.reasons
            : new Map(Object.entries(m.reasons || {}));
    const recommendations = (m.recommendations || []).map((b) => {
        const bike =
            b && typeof b.toObject === "function" ? b.toObject() : b;
        // Plain ObjectIds (or missing docs) pass through untouched
        if (!bike || !bike.brand) return bike;
        return {
            ...bike,
            reason: reasons.get(String(bike._id)) || bike.reason || "",
        };
    });
    return {
        _id: m._id,
        role: m.role,
        content: m.content,
        recommendations,
        feedback: m.feedback ?? null,
        tokensUsed: m.tokensUsed ?? 0,
        createdAt: m.createdAt,
    };
};

// History entry for AI context. Recommendation ids ride along
// so follow-ups like "the first two" resolve against
// previously discussed bikes.
const toHistoryEntry = (m) => ({
    role: m.role,
    content: m.content,
    recommendations: (m.recommendations || []).map((r) =>
        String((r && r._id) || r)
    ),
});

// Split generated docs into storable ids + reasons map
const splitRecs = (recommendations) => {
    const ids = [];
    const reasons = {};
    (recommendations || []).forEach((b) => {
        if (!b || !b._id) return;
        ids.push(b._id);
        if (b.reason) reasons[String(b._id)] = String(b.reason);
    });
    return { ids, reasons };
};

// Short title from the first user message (no extra AI call)
const makeTitle = (text) => {
    const words = String(text || "")
        .replace(/₹/g, "Rs ")
        .replace(/[?"'"“”‘’!…:;,]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 7)
        .join(" ");
    if (!words) return "New Chat";
    const titled = words.charAt(0).toUpperCase() + words.slice(1);
    return titled.length > 60 ? `${titled.slice(0, 60)}…` : titled;
};

// =====================================================
// CREATE CHAT — POST /api/chats
// =====================================================
const createChat = async (req, res) => {
    try {
        const chat = await Chat.create({
            user: req.user._id,
            title: "New Chat",
            messages: [],
        });

        res.status(201).json({
            success: true,
            chat: {
                _id: chat._id,
                title: chat.title,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
            },
        });
    } catch (error) {
        console.error("Create chat error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not create chat.",
        });
    }
};

// =====================================================
// LIST CHATS — GET /api/chats (updatedAt DESC)
// =====================================================
const listChats = async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.user._id })
            .select("title createdAt updatedAt messages")
            .sort({ updatedAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            chats: chats.map((chat) => {
                const last =
                    chat.messages && chat.messages.length > 0
                        ? chat.messages[chat.messages.length - 1]
                        : null;
                return {
                    _id: chat._id,
                    title: chat.title,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    preview: last
                        ? String(last.content).slice(0, 80)
                        : "",
                };
            }),
        });
    } catch (error) {
        console.error("List chats error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load chats.",
        });
    }
};

// =====================================================
// GET CHAT — GET /api/chats/:chatId
// =====================================================
const getChat = async (req, res) => {
    try {
        const chat = await getOwnedChat(req, res, true);
        if (!chat) return;

        res.status(200).json({
            success: true,
            chat: {
                _id: chat._id,
                title: chat.title,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
                messages: chat.messages.map(shapeMessage),
            },
        });
    } catch (error) {
        console.error("Get chat error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load chat.",
        });
    }
};

// Re-populate recommendation docs on a chat's messages
const populateChat = async (chat) =>
    chat.populate({
        path: "messages.recommendations",
        select: RECO_SELECT,
    });

// =====================================================
// SEND MESSAGE — POST /api/chats/:chatId/messages
// =====================================================
const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please type a message.",
            });
        }

        const chat = await getOwnedChat(req, res, false);
        if (!chat) return;

        // 0. Subscription + token gate (before spending anything)
        await effectivePlan(req.user);
        const blocked = tokenGate(req.user);
        if (blocked) {
            return res.status(blocked.status).json(blocked.body);
        }

        const text = message.trim();

        // 1. Save the user message
        chat.messages.push({ role: "user", content: text });

        // History BEFORE this message for AI context
        const history = chat.messages.slice(0, -1).map(toHistoryEntry);

        // 2-3. Catalog + AI answer (throws safe errors)
        let result;
        try {
            result = await generateAdvisorReply(text, history);
        } catch (genError) {
            await chat.save();
            const status = genError.statusCode || 500;
            return res.status(status).json({
                success: false,
                message:
                    genError.statusCode === 400
                        ? genError.message
                        : "AI Advisor is temporarily unavailable.",
            });
        }

        // 4. Deduct context-based credits — only after success
        const charge = result.tokensCharged || 1;
        const { user: walletUser } = await deductToken(
            req.user._id,
            charge
        );

        // 5. Save the assistant response (cost + reasons stamped on it)
        const split = splitRecs(result.recommendations);
        chat.messages.push({
            role: "assistant",
            content: result.reply,
            recommendations: split.ids,
            reasons: split.reasons,
            tokensUsed: charge,
        });

        // Auto-title on the first exchange
        if (chat.title === "New Chat") {
            chat.title = makeTitle(text);
        }

        await chat.save();
        await populateChat(chat);

        const saved = chat.messages.slice(-2).map(shapeMessage);

        // 6. updatedAt bumps automatically via timestamps
        res.status(200).json({
            success: true,
            userMessage: saved[0],
            assistantMessage: saved[1],
            usage: result.usage,
            tokensCharged: charge,
            wallet: walletUser ? walletOf(walletUser) : walletOf(req.user),
        });
    } catch (error) {
        console.error("Send message error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not send message.",
        });
    }
};

// =====================================================
// EDIT MESSAGE — PUT /api/chats/:chatId/messages/:messageId
// Replaces a user message, drops the branch after it,
// and generates a fresh AI response.
// =====================================================
const editMessage = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || typeof content !== "string" || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Edited message cannot be empty.",
            });
        }

        if (!isValidId(req.params.messageId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid message ID.",
            });
        }

        const chat = await getOwnedChat(req, res, false);
        if (!chat) return;

        const index = chat.messages.findIndex(
            (m) => String(m._id) === req.params.messageId
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Message not found.",
            });
        }

        if (chat.messages[index].role !== "user") {
            return res.status(400).json({
                success: false,
                message: "Only your own messages can be edited.",
            });
        }

        // Token gate BEFORE regenerating (no tokens → upgrade modal)
        await effectivePlan(req.user);
        const blocked = tokenGate(req.user);
        if (blocked) {
            return res.status(blocked.status).json(blocked.body);
        }

        const text = content.trim();

        // Replace + drop everything after (old branch is gone)
        chat.messages[index].content = text;
        chat.messages = chat.messages.slice(0, index + 1);

        const history = chat.messages.slice(0, -1).map(toHistoryEntry);

        let result;
        try {
            result = await generateAdvisorReply(text, history);
        } catch (genError) {
            await chat.save();
            const status = genError.statusCode || 500;
            return res.status(status).json({
                success: false,
                message:
                    genError.statusCode === 400
                        ? genError.message
                        : "AI Advisor is temporarily unavailable.",
            });
        }

        // Deduct context-based credits — only after success
        const charge = result.tokensCharged || 1;
        const { user: walletUser } = await deductToken(
            req.user._id,
            charge
        );

        const split = splitRecs(result.recommendations);
        chat.messages.push({
            role: "assistant",
            content: result.reply,
            recommendations: split.ids,
            reasons: split.reasons,
            tokensUsed: charge,
        });

        await chat.save();
        await populateChat(chat);

        res.status(200).json({
            success: true,
            messages: chat.messages.map(shapeMessage),
            usage: result.usage,
            tokensCharged: charge,
            wallet: walletUser ? walletOf(walletUser) : walletOf(req.user),
        });
    } catch (error) {
        console.error("Edit message error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not edit message.",
        });
    }
};

// =====================================================
// REGENERATE — POST /api/chats/:chatId/messages/:messageId/regenerate
// The message must be an assistant message; a new answer
// is generated from the previous user message + context.
// =====================================================
const regenerateMessage = async (req, res) => {
    try {
        if (!isValidId(req.params.messageId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid message ID.",
            });
        }

        const chat = await getOwnedChat(req, res, false);
        if (!chat) return;

        const index = chat.messages.findIndex(
            (m) => String(m._id) === req.params.messageId
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Message not found.",
            });
        }

        const target = chat.messages[index];

        if (target.role !== "assistant") {
            return res.status(400).json({
                success: false,
                message: "Only AI responses can be regenerated.",
            });
        }

        if (index === 0 || chat.messages[index - 1].role !== "user") {
            return res.status(400).json({
                success: false,
                message: "No user message found to regenerate from.",
            });
        }

        // Token gate BEFORE regenerating (no tokens → upgrade modal)
        await effectivePlan(req.user);
        const blocked = tokenGate(req.user);
        if (blocked) {
            return res.status(blocked.status).json(blocked.body);
        }

        const userMsg = chat.messages[index - 1];
        const history = chat.messages
            .slice(0, index - 1)
            .map(toHistoryEntry);

        let result;
        try {
            result = await generateAdvisorReply(userMsg.content, history);
        } catch (genError) {
            const status = genError.statusCode || 500;
            return res.status(status).json({
                success: false,
                message:
                    genError.statusCode === 400
                        ? genError.message
                        : "AI Advisor is temporarily unavailable.",
            });
        }

        // Deduct context-based credits — only after success
        const charge = result.tokensCharged || 1;
        const { user: walletUser } = await deductToken(
            req.user._id,
            charge
        );

        // Replace the old assistant response in place
        const split = splitRecs(result.recommendations);
        target.content = result.reply;
        target.recommendations = split.ids;
        target.reasons = split.reasons;
        target.feedback = null;
        target.tokensUsed = charge;

        await chat.save();
        await populateChat(chat);

        const updated = chat.messages.find(
            (m) => String(m._id) === req.params.messageId
        );

        res.status(200).json({
            success: true,
            assistantMessage: shapeMessage(updated),
            usage: result.usage,
            tokensCharged: charge,
            wallet: walletUser ? walletOf(walletUser) : walletOf(req.user),
        });
    } catch (error) {
        console.error("Regenerate error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not regenerate response.",
        });
    }
};

// =====================================================
// FEEDBACK — POST /api/chats/:chatId/messages/:messageId/feedback
// { feedback: "like" | "dislike" | null }
// =====================================================
const setFeedback = async (req, res) => {
    try {
        const { feedback } = req.body;

        if (![null, "like", "dislike"].includes(feedback ?? null)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feedback value.",
            });
        }

        if (!isValidId(req.params.messageId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid message ID.",
            });
        }

        const chat = await getOwnedChat(req, res, false);
        if (!chat) return;

        const msg = chat.messages.find(
            (m) => String(m._id) === req.params.messageId
        );

        if (!msg) {
            return res.status(404).json({
                success: false,
                message: "Message not found.",
            });
        }

        if (msg.role !== "assistant") {
            return res.status(400).json({
                success: false,
                message: "Only AI responses can receive feedback.",
            });
        }

        msg.feedback = feedback ?? null;
        await chat.save();

        res.status(200).json({
            success: true,
            feedback: msg.feedback,
        });
    } catch (error) {
        console.error("Feedback error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not save feedback.",
        });
    }
};

// =====================================================
// RENAME — PUT /api/chats/:chatId { title }
// =====================================================
const renameChat = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title cannot be empty.",
            });
        }

        const chat = await getOwnedChat(req, res, false);
        if (!chat) return;

        chat.title = title.trim().slice(0, 80);
        await chat.save();

        res.status(200).json({
            success: true,
            chat: {
                _id: chat._id,
                title: chat.title,
                updatedAt: chat.updatedAt,
            },
        });
    } catch (error) {
        console.error("Rename chat error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not rename chat.",
        });
    }
};

// =====================================================
// DELETE — DELETE /api/chats/:chatId
// =====================================================
const deleteChat = async (req, res) => {
    try {
        const chat = await getOwnedChat(req, res, false);
        if (!chat) return;

        await chat.deleteOne();

        res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
        });
    } catch (error) {
        console.error("Delete chat error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete chat.",
        });
    }
};

module.exports = {
    createChat,
    listChats,
    getChat,
    sendMessage,
    editMessage,
    regenerateMessage,
    setFeedback,
    renameChat,
    deleteChat,
};
