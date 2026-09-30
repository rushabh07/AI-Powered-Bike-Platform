const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Motorcycle = require("../models/Motorcycle");
const Chat = require("../models/Chat");
const Comparison = require("../models/Comparison");
const Notification = require("../models/Notification");
const Subscription = require("../models/Subscription");

const {
    effectivePlan,
    walletOf,
} = require("../utils/aiTokens");
const { createNotification } = require("./notificationController");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const BIKE_SELECT =
    "name brand brandLogo category price fuel engine mileage power rating image batteryCapacity range chargingTime";

// Public-safe user shape (never password, never plan internals beyond display)
const shapeUser = (u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address || "",
    profileImage: u.profileImage || "",
    role: u.role,
    aiPlan: u.aiPlan,
    aiPlanType: u.aiPlanType || "free",
    createdAt: u.createdAt,
});

// =====================================================
// DASHBOARD — GET /api/user/dashboard
// All stats counted live from MongoDB.
// =====================================================
const getDashboard = async (req, res) => {
    try {
        await effectivePlan(req.user);
        const userId = req.user._id;

        const [
            chatCount,
            comparisonCount,
            subscriptionCount,
            recentChats,
            subscription,
            favoritesUser,
            recentActivity,
        ] = await Promise.all([
            Chat.countDocuments({ user: userId }),
            Comparison.countDocuments({ user: userId }),
            Subscription.countDocuments({ user: userId }),
            Chat.find({ user: userId })
                .select("title updatedAt messages")
                .sort({ updatedAt: -1 })
                .limit(5)
                .lean(),
            Subscription.findOne({ user: userId, status: "paid" })
                .sort({ createdAt: -1 })
                .lean(),
            User.findById(userId)
                .populate({ path: "favoriteMotorcycles", select: BIKE_SELECT })
                .select("favoriteMotorcycles")
                .lean(),
            Notification.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);

        const favorites = favoritesUser?.favoriteMotorcycles || [];

        res.status(200).json({
            success: true,
            user: shapeUser(req.user),
            stats: {
                aiTokens: req.user.aiTokens,
                aiTokensUsed: req.user.aiTokensUsed,
                savedMotorcycles: favorites.length,
                chats: chatCount,
                comparisons: comparisonCount,
                subscriptions: subscriptionCount,
                bookings: 0, // No customer booking system exists
            },
            subscription: subscription || null,
            recentChats: (recentChats || []).map((c) => ({
                _id: c._id,
                title: c.title,
                updatedAt: c.updatedAt,
                preview:
                    c.messages && c.messages.length > 0
                        ? String(
                              c.messages[c.messages.length - 1].content
                          ).slice(0, 80)
                        : "",
            })),
            favorites,
            recentActivity: (recentActivity || []).map((n) => ({
                _id: n._id,
                type: n.type,
                title: n.title,
                message: n.message,
                read: n.read,
                createdAt: n.createdAt,
            })),
        });
    } catch (error) {
        console.error("User dashboard error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load dashboard.",
        });
    }
};

// =====================================================
// PROFILE — GET /api/user/profile
// =====================================================
const getProfile = async (req, res) => {
    try {
        await effectivePlan(req.user);
        res.status(200).json({
            success: true,
            user: shapeUser(req.user),
            wallet: walletOf(req.user),
        });
    } catch (error) {
        console.error("Get profile error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load profile.",
        });
    }
};

// =====================================================
// UPDATE PROFILE — PUT /api/user/profile
// Editable: name, phone, address, profileImage ONLY.
// role / plan / tokens can never change here.
// =====================================================
const updateProfile = async (req, res) => {
    try {
        const allowed = {};
        if (req.body.name !== undefined)
            allowed.name = String(req.body.name).trim();
        if (req.body.phone !== undefined)
            allowed.phone = String(req.body.phone).trim();
        if (req.body.address !== undefined)
            allowed.address = String(req.body.address).trim();
        if (req.body.profileImage !== undefined)
            allowed.profileImage = String(req.body.profileImage).trim();

        if (!allowed.name) {
            return res.status(400).json({
                success: false,
                message: "Name is required.",
            });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            allowed,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user: shapeUser(updated),
        });
    } catch (error) {
        console.error("Update profile error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not update profile.",
        });
    }
};

// =====================================================
// FAVORITES — GET /api/user/favorites
// =====================================================
const getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({ path: "favoriteMotorcycles", select: BIKE_SELECT })
            .select("favoriteMotorcycles")
            .lean();

        res.status(200).json({
            success: true,
            count: (user?.favoriteMotorcycles || []).length,
            favorites: user?.favoriteMotorcycles || [],
        });
    } catch (error) {
        console.error("Get favorites error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load favorites.",
        });
    }
};

// =====================================================
// ADD FAVORITE — POST /api/user/favorites/:motorcycleId
// =====================================================
const addFavorite = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const bike = await Motorcycle.findById(motorcycleId).select(
            "_id"
        );
        if (!bike) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found.",
            });
        }

        // $addToSet prevents duplicates atomically
        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { favoriteMotorcycles: bike._id } },
            { new: true }
        )
            .populate({ path: "favoriteMotorcycles", select: BIKE_SELECT })
            .select("favoriteMotorcycles");

        res.status(200).json({
            success: true,
            message: "Saved to favorites.",
            count: updated.favoriteMotorcycles.length,
            favorites: updated.favoriteMotorcycles,
        });
    } catch (error) {
        console.error("Add favorite error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not save favorite.",
        });
    }
};

// =====================================================
// REMOVE FAVORITE — DELETE /api/user/favorites/:motorcycleId
// =====================================================
const removeFavorite = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { favoriteMotorcycles: motorcycleId } },
            { new: true }
        )
            .populate({ path: "favoriteMotorcycles", select: BIKE_SELECT })
            .select("favoriteMotorcycles");

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Removed from favorites.",
            count: updated.favoriteMotorcycles.length,
            favorites: updated.favoriteMotorcycles,
        });
    } catch (error) {
        console.error("Remove favorite error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not remove favorite.",
        });
    }
};

// =====================================================
// CHANGE PASSWORD — PUT /api/user/change-password
// =====================================================
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } =
            req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message:
                    "Current, new and confirm passwords are required.",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match.",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters.",
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const matches = await bcrypt.compare(
            currentPassword,
            user.password
        );
        if (!matches) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect.",
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        await createNotification(
            user._id,
            "security",
            "Password changed",
            "Your MOTOAI account password was changed successfully."
        );

        res.status(200).json({
            success: true,
            message: "Password changed successfully.",
        });
    } catch (error) {
        console.error("Change password error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not change password.",
        });
    }
};

// =====================================================
// DELETE ACCOUNT — DELETE /api/user/account
// Removes user + chats + comparisons + notifications.
// Subscriptions are KEPT for audit (ownership stays).
// =====================================================
const deleteAccount = async (req, res) => {
    try {
        const { confirm } = req.body || {};
        if (confirm !== true) {
            return res.status(400).json({
                success: false,
                message:
                    'Account deletion requires { "confirm": true }.',
            });
        }

        const userId = req.user._id;

        await Chat.deleteMany({ user: userId });
        await Comparison.deleteMany({ user: userId });
        await Notification.deleteMany({ user: userId });
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: "Account deleted successfully.",
        });
    } catch (error) {
        console.error("Delete account error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete account.",
        });
    }
};

module.exports = {
    getDashboard,
    getProfile,
    updateProfile,
    getFavorites,
    addFavorite,
    removeFavorite,
    changePassword,
    deleteAccount,
};
