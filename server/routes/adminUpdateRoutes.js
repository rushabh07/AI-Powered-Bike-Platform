const express = require("express");

const {
    getAdminUpdates,
    getAdminUpdate,
    createUpdate,
    updateUpdate,
    updateUpdateStatus,
    deleteUpdate,
} = require("../controllers/updateController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminOnly = authorize("admin");
const { requirePermission } = require("../middleware/roleMiddleware");

const router = express.Router();

// Admin endpoints — all mounted under /api/admin, admin role required
router.get("/", protect, adminOnly, requirePermission("updates.manage"), getAdminUpdates);
router.get("/:id", protect, adminOnly, requirePermission("updates.manage"), getAdminUpdate);
router.post("/", protect, adminOnly, requirePermission("updates.manage"), createUpdate);
router.put("/:id", protect, adminOnly, requirePermission("updates.manage"), updateUpdate);
router.patch("/:id/status", protect, adminOnly, requirePermission("updates.manage"), updateUpdateStatus);
router.delete("/:id", protect, adminOnly, requirePermission("updates.manage"), deleteUpdate);

module.exports = router;
