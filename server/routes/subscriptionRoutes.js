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

const router = express.Router();

// Public pricing endpoint
router.get("/plans", getPlans);

// Webhook is public (Razorpay signs it) — verified by secret, not JWT
router.post("/webhook", razorpayWebhook);

// Authenticated purchase and status endpoints
router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
router.get("/status", protect, getStatus);
router.get("/history", protect, getHistory);

module.exports = router;
