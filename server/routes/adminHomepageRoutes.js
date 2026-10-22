const express = require("express");
const {
    getAdminHomepage,
    updateDraftHomepage,
    publishHomepage,
    previewHomepage,
    restorePublished,
} = require("../controllers/homepageController");
const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminOnly = authorize("admin");

const router = express.Router();

router.get("/", protect, adminOnly, requirePermission("settings.manage"), getAdminHomepage);
router.put("/", protect, adminOnly, requirePermission("settings.manage"), updateDraftHomepage);
router.post("/publish", protect, adminOnly, requirePermission("settings.manage"), publishHomepage);
router.post("/preview", protect, adminOnly, requirePermission("settings.manage"), previewHomepage);
router.post("/restore", protect, adminOnly, requirePermission("settings.manage"), restorePublished);

module.exports = router;
