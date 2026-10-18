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

// =====================================================
// EMAIL LOG + RETRY (persistent queue inspection)
// GET /api/admin/email-log
// POST /api/admin/email-log/:id/retry
// =====================================================
router.get("/email-log", protect, adminOnly, async (req, res) => {
    try {
        const EmailLog = require("../models/EmailLog");
        const { page = 1, limit = 20, status } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            EmailLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            EmailLog.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            count: items.length,
            total,
            page: Number(page),
            logs: items.map((l) => ({
                _id: l._id,
                to: l.to,
                subject: l.subject,
                entity: l.entity,
                event: l.event,
                status: l.status,
                providerId: l.providerId,
                reason: l.reason,
                attempts: l.attempts,
                createdAt: l.createdAt,
            })),
        });
    } catch (error) {
        console.error("Email log error:", error.message);
        res.status(500).json({ success: false, message: "Could not load email log." });
    }
});

router.post("/email-log/:id/retry", protect, adminOnly, async (req, res) => {
    try {
        const { retryEmailLog } = require("../services/emailService");
        const result = await retryEmailLog(req.params.id);
        res.status(result.sent ? 200 : 502).json({ success: result.sent, ...result });
    } catch (error) {
        console.error("Email retry error:", error.message);
        res.status(500).json({ success: false, message: "Retry failed." });
    }
});

// =====================================================
// ADVERTISEMENTS (admin management)
// =====================================================
const Advertisement = require("../models/Advertisement");
const {
    validateAdInput,
    buildAdDoc,
    isSafeTarget,
} = require("../controllers/advertisementController");

const isValidAdId = (id) => require("mongoose").Types.ObjectId.isValid(id);

// Dashboard counts + filtered list
// GET /api/admin/advertisements?search=&status=&placement=&sort=&page=&limit=
router.get("/advertisements", protect, adminOnly, async (req, res) => {
    try {
        const { search = "", status = "", placement = "", sort = "order", page = 1, limit = 20 } = req.query;
        const filter = { isDeleted: false };
        if (status) filter.status = status;
        if (placement) filter.placement = placement;
        if (search.trim()) {
            filter.$or = [
                { title: new RegExp(search.trim(), "i") },
                { description: new RegExp(search.trim(), "i") },
            ];
        }
        const sortMap = {
            order: { priority: -1, displayOrder: 1, createdAt: -1 },
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            clicks: { clicks: -1 },
            impressions: { impressions: -1 },
        };
        const skip = (Number(page) - 1) * Number(limit);
        const now = new Date();
        const [items, total, counts] = await Promise.all([
            Advertisement.find(filter).sort(sortMap[sort] || sortMap.order).skip(skip).limit(Number(limit)).lean(),
            Advertisement.countDocuments(filter),
            (async () => {
                const base = { isDeleted: false };
                const [all, active, drafts, scheduled, expired] = await Promise.all([
                    Advertisement.countDocuments(base),
                    Advertisement.countDocuments({ ...base, status: "active" }),
                    Advertisement.countDocuments({ ...base, status: "draft" }),
                    Advertisement.countDocuments({ ...base, status: "active", startDate: { $gt: now } }),
                    Advertisement.countDocuments({ ...base, endDate: { $lt: now } }),
                ]);
                return { all, active, drafts, scheduled, expired };
            })(),
        ]);
        res.status(200).json({
            success: true,
            count: items.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            counts,
            advertisements: items,
        });
    } catch (error) {
        console.error("Admin ads list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load advertisements." });
    }
});

// GET /api/admin/advertisements/:id
router.get("/advertisements/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!isValidAdId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid advertisement ID." });
        }
        const ad = await Advertisement.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!ad) return res.status(404).json({ success: false, message: "Advertisement not found." });
        res.status(200).json({ success: true, advertisement: ad });
    } catch (error) {
        console.error("Admin ad get error:", error.message);
        res.status(500).json({ success: false, message: "Could not load advertisement." });
    }
});

// POST /api/admin/advertisements
router.post("/advertisements", protect, adminOnly, async (req, res) => {
    try {
        const errors = validateAdInput(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }
        const ad = await Advertisement.create(buildAdDoc(req.body, req.user._id));
        res.status(201).json({ success: true, message: "Advertisement created.", advertisement: ad });
    } catch (error) {
        console.error("Admin ad create error:", error.message);
        res.status(500).json({ success: false, message: "Could not create advertisement." });
    }
});

// PUT /api/admin/advertisements/:id
router.put("/advertisements/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!isValidAdId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid advertisement ID." });
        }
        const errors = validateAdInput(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }
        const ad = await Advertisement.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: buildAdDoc(req.body) },
            { new: true, runValidators: true }
        );
        if (!ad) return res.status(404).json({ success: false, message: "Advertisement not found." });
        res.status(200).json({ success: true, message: "Advertisement updated.", advertisement: ad });
    } catch (error) {
        console.error("Admin ad update error:", error.message);
        res.status(500).json({ success: false, message: "Could not update advertisement." });
    }
});

// PATCH /api/admin/advertisements/:id/status
router.patch("/advertisements/:id/status", protect, adminOnly, async (req, res) => {
    try {
        if (!isValidAdId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid advertisement ID." });
        }
        const { status } = req.body;
        if (!["draft", "active", "inactive"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status." });
        }
        const ad = await Advertisement.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: { status } },
            { new: true }
        );
        if (!ad) return res.status(404).json({ success: false, message: "Advertisement not found." });
        res.status(200).json({ success: true, message: `Advertisement ${status}.`, advertisement: ad });
    } catch (error) {
        console.error("Admin ad status error:", error.message);
        res.status(500).json({ success: false, message: "Could not update status." });
    }
});

// PATCH /api/admin/advertisements/reorder  { order: [{ id, displayOrder }] }
router.patch("/advertisements/reorder", protect, adminOnly, async (req, res) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order) || order.length === 0) {
            return res.status(400).json({ success: false, message: "Order array is required." });
        }
        const ops = order
            .filter((o) => o && isValidAdId(o.id) && Number.isFinite(Number(o.displayOrder)))
            .map((o) => ({
                updateOne: {
                    filter: { _id: o.id, isDeleted: false },
                    update: { $set: { displayOrder: Number(o.displayOrder) } },
                },
            }));
        if (ops.length === 0) {
            return res.status(400).json({ success: false, message: "No valid order entries." });
        }
        await Advertisement.bulkWrite(ops);
        res.status(200).json({ success: true, message: "Display order saved.", updated: ops.length });
    } catch (error) {
        console.error("Admin ad reorder error:", error.message);
        res.status(500).json({ success: false, message: "Could not save order." });
    }
});

// DELETE /api/admin/advertisements/:id (soft delete)
router.delete("/advertisements/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!isValidAdId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid advertisement ID." });
        }
        const ad = await Advertisement.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: new Date(), status: "inactive" } },
            { new: true }
        );
        if (!ad) return res.status(404).json({ success: false, message: "Advertisement not found." });
        res.status(200).json({ success: true, message: "Advertisement deleted." });
    } catch (error) {
        console.error("Admin ad delete error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete advertisement." });
    }
});

module.exports = router;
