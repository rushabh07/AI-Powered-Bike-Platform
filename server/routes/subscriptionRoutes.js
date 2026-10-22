const express = require("express");

const {
    getPlans,
    createOrder,
    verifyPayment,
    getStatus,
    getHistory,
    razorpayWebhook,
} = require("../controllers/subscriptionController");
const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");

const router = express.Router();

// Public pricing endpoint
router.get("/plans", getPlans);

// Webhook is public (Razorpay signs it) — verified by secret, not JWT
router.post("/webhook", razorpayWebhook);

// Authenticated purchase and status endpoints.
// Buying an AI plan is pointless (and is blocked) when the role does
// not hold the "ai.advisor" permission — same gate as the chat APIs.
router.post("/create-order", protect, requirePermission("ai.advisor"), createOrder);
router.post("/verify-payment", protect, requirePermission("ai.advisor"), verifyPayment);
router.get("/status", protect, getStatus);
router.get("/history", protect, getHistory);

module.exports = router;
