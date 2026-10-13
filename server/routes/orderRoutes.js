const express = require("express");

const {
    createOrder,
    getOrder,
    getMyOrders,
    createPayment,
    verifyPayment,
    cancelOrder,
    createDealershipBooking,
} = require("../controllers/orderController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", authorize("user", "customer"), createOrder);
router.get("/my", authorize("user", "customer"), getMyOrders);
router.get("/:id", getOrder);
router.post("/:id/create-payment", authorize("user", "customer"), createPayment);
router.post("/:id/verify-payment", authorize("user", "customer"), verifyPayment);
router.post("/:id/cancel", cancelOrder);

module.exports = router;
