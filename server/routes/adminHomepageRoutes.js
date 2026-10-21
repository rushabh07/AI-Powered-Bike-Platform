const express = require("express");
const {
    getAdminHomepage,
    updateDraftHomepage,
    publishHomepage,
    previewHomepage,
    restorePublished,
} = require("../controllers/homepageController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminOnly = authorize("admin");

const router = express.Router();

router.get("/", protect, adminOnly, getAdminHomepage);
router.put("/", protect, adminOnly, updateDraftHomepage);
router.post("/publish", protect, adminOnly, publishHomepage);
router.post("/preview", protect, adminOnly, previewHomepage);
router.post("/restore", protect, adminOnly, restorePublished);

module.exports = router;
