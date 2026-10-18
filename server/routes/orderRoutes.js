const express = require("express");

const {
    createOfflineOrder,
    getMyOrders,
    getOrder,
    cancelOrder,
    listOrders,
    dealerConfirm,
    dealerReject,
    verifyOfflinePayment,
    updateFulfilment,
} = require("../controllers/orderController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const dealerOnly = authorize("provider", "admin");

const router = express.Router();

// Customer offline purchase requests
router.post("/", protect, createOfflineOrder);
router.post("/offline", protect, createOfflineOrder);
router.get("/my", protect, getMyOrders);
router.get("/:id", protect, getOrder);
router.post("/:id/cancel", protect, cancelOrder);

// Staff / Admin order management
router.get("/", protect, dealerOnly, listOrders);
router.post("/:id/confirm", protect, dealerOnly, dealerConfirm);
router.post("/:id/reject", protect, dealerOnly, dealerReject);
router.post("/:id/verify-offline-payment", protect, dealerOnly, verifyOfflinePayment);
router.put("/:id/fulfilment", protect, dealerOnly, updateFulfilment);

module.exports = router;
