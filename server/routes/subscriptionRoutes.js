const express = require("express");

const {
    getPlans,
    createOrder,
    verifyPayment,
    getStatus,
    getHistory,
} = require("../controllers/subscriptionController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Public pricing endpoint
router.get("/plans", getPlans);

// Authenticated purchase and status endpoints
router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
router.get("/status", protect, getStatus);
router.get("/history", protect, getHistory);

module.exports = router;
