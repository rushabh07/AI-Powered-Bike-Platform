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
const { requirePermission } = require("../middleware/roleMiddleware");
const authorize = require("../middleware/roleMiddleware");

const dealerOnly = authorize("provider", "admin");

const router = express.Router();

// Customer offline purchase requests
router.post("/", protect, requirePermission("orders.request"), createOfflineOrder);
router.post("/offline", protect, requirePermission("orders.request"), createOfflineOrder);
router.get("/my", protect, getMyOrders);
router.get("/:id", protect, getOrder);
router.post("/:id/cancel", protect, cancelOrder);

// Staff / Admin order management
router.get("/", protect, dealerOnly, requirePermission("orders.manage"), listOrders);
router.post("/:id/confirm", protect, dealerOnly, requirePermission("orders.manage"), dealerConfirm);
router.post("/:id/reject", protect, dealerOnly, requirePermission("orders.manage"), dealerReject);
router.post("/:id/verify-offline-payment", protect, dealerOnly, requirePermission("orders.manage"), verifyOfflinePayment);
router.put("/:id/fulfilment", protect, dealerOnly, requirePermission("orders.manage"), updateFulfilment);

module.exports = router;
