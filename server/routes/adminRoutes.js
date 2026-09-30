const express = require("express");

const User = require("../models/User");
const Motorcycle = require("../models/Motorcycle");

let Booking = null;
try {
    Booking = require("../models/Booking");
} catch (e) {
    Booking = null;
}

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminOnly = authorize("admin");

const router = express.Router();

// =====================================================
// GET ADMIN PROFILE
// GET /api/admin/profile
// =====================================================
router.get("/profile", protect, adminOnly, async (req, res) => {
    try {
        const admin = await User.findById(req.user._id).select("-password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        res.status(200).json({
            success: true,
            admin,
        });
    } catch (error) {
        console.error("Get admin profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin profile",
        });
    }
});

// =====================================================
// UPDATE ADMIN PROFILE
// PUT /api/admin/profile
// =====================================================
router.put("/profile", protect, adminOnly, async (req, res) => {
    try {
        const { name, phone, address, profileImage } = req.body;

        const updateFields = {};
        if (name !== undefined) updateFields.name = name.trim();
        if (phone !== undefined) updateFields.phone = phone.trim();
        if (address !== undefined) updateFields.address = address.trim();
        if (profileImage !== undefined) updateFields.profileImage = profileImage.trim();

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update",
            });
        }

        const admin = await User.findByIdAndUpdate(
            req.user._id,
            updateFields,
            { new: true, runValidators: true }
        ).select("-password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            admin,
        });
    } catch (error) {
        console.error("Update admin profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
        });
    }
});

// =====================================================
// GET ADMIN STATS (for Database page)
// GET /api/admin/stats
// =====================================================
router.get("/stats", protect, adminOnly, async (req, res) => {
    try {
        const [totalUsers, totalProviders, totalAdmins, motorcycles] =
            await Promise.all([
                User.countDocuments({ role: { $in: ["user", "customer"] } }),
                User.countDocuments({ role: "provider" }),
                User.countDocuments({ role: "admin" }),
                Motorcycle.find({}).select(
                    "name brand category price engine power rating createdAt"
                ),
            ]);

        let totalBookings = 0;
        if (Booking) {
            totalBookings = await Booking.countDocuments();
        }

        // Brand breakdown
        const brandMap = {};
        const categoryMap = {};
        motorcycles.forEach((bike) => {
            if (bike.brand) {
                brandMap[bike.brand] = (brandMap[bike.brand] || 0) + 1;
            }
            if (bike.category) {
                categoryMap[bike.category] = (categoryMap[bike.category] || 0) + 1;
            }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalProviders,
                totalAdmins,
                totalMotorcycles: motorcycles.length,
                totalBookings,
            },
            brands: brandMap,
            categories: categoryMap,
            motorcycles,
        });
    } catch (error) {
        console.error("Get admin stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin stats",
        });
    }
});

// =====================================================
// GET ALL USERS (for Database page)
// GET /api/admin/users
// =====================================================
router.get("/users", protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({})
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
});

// =====================================================
// TEST ROUTE
// GET /api/admin/test
// =====================================================
router.get("/test", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Admin routes are working 🚀",
    });
});

module.exports = router;
