const express = require("express");

const { chat } = require("../controllers/aiAdvisorController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// AI CHAT
// POST /api/ai-advisor/chat
// Login required: only authenticated users can chat
// =====================================================
router.post("/chat", protect, chat);

// =====================================================
// TEST ROUTE
// GET /api/ai-advisor/test
// =====================================================
router.get("/test", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AI Advisor routes are working 🚀",
    });
});

module.exports = router;
