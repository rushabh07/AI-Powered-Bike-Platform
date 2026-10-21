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

const router = express.Router();

// Admin endpoints — all mounted under /api/admin, admin role required
router.get("/", protect, adminOnly, getAdminUpdates);
router.get("/:id", protect, adminOnly, getAdminUpdate);
router.post("/", protect, adminOnly, createUpdate);
router.put("/:id", protect, adminOnly, updateUpdate);
router.patch("/:id/status", protect, adminOnly, updateUpdateStatus);
router.delete("/:id", protect, adminOnly, deleteUpdate);

module.exports = router;
