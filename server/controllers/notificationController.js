const mongoose = require("mongoose");

const Notification = require("../models/Notification");

// In-app notification helper (no email). Best-effort: never throws.
const createNotification = async (userId, type, title, message = "") => {
    try {
        if (!userId || !title) return null;
        return await Notification.create({
            user: userId,
            type: type || "info",
            title: String(title).slice(0, 120),
            message: String(message).slice(0, 500),
        });
    } catch (error) {
        console.error("Notification create error:", error.message);
        return null;
    }
};

// =====================================================
// LIST — GET /api/notifications (own only, newest first)
// =====================================================
const listNotifications = async (req, res) => {
    try {
        const items = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.status(200).json({
            success: true,
            count: items.length,
            unread: items.filter((n) => !n.read).length,
            notifications: items,
        });
    } catch (error) {
        console.error("List notifications error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load notifications.",
        });
    }
};

// =====================================================
// MARK READ — PUT /api/notifications/:id/read
// =====================================================
const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID.",
            });
        }

        const item = await Notification.findOneAndUpdate(
            { _id: id, user: req.user._id },
            { $set: { read: true } },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        res.status(200).json({ success: true, notification: item });
    } catch (error) {
        console.error("Mark read error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not update notification.",
        });
    }
};

// =====================================================
// MARK ALL READ — PUT /api/notifications/read-all
// =====================================================
const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
        });
    } catch (error) {
        console.error("Mark all read error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not update notifications.",
        });
    }
};

// =====================================================
// DELETE — DELETE /api/notifications/:id
// =====================================================
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID.",
            });
        }

        const item = await Notification.findOneAndDelete({
            _id: id,
            user: req.user._id,
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification deleted.",
        });
    } catch (error) {
        console.error("Delete notification error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete notification.",
        });
    }
};

module.exports = {
    createNotification,
    listNotifications,
    markRead,
    markAllRead,
    deleteNotification,
};
