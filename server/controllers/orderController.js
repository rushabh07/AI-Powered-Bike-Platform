const mongoose = require("mongoose");
const Order = require("../models/Order");
const Motorcycle = require("../models/Motorcycle");
const Dealership = require("../models/Dealership");
const { createNotification } = require("./notificationController");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const OFFLINE_METHODS = ["cash", "card", "upi", "bank_transfer"];

const makeOrderNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MO-${year}-${rand}`;
};

const shapeOrder = (o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    variantName: o.variantName || "",
    selectedColor: o.selectedColor || "",
    colorHex: o.colorHex || "",
    quantity: o.quantity || 1,
    unitPrice: o.unitPrice,
    roadTax: o.roadTax,
    insuranceAmount: o.insuranceAmount,
    taxAmount: o.taxAmount,
    totalAmount: o.totalAmount,
    paymentMethod: o.paymentMethod || "offline",
    offlinePaymentType: o.offlinePaymentType || "",
    offlinePaymentReference: o.offlinePaymentReference || "",
    paymentStatus: o.paymentStatus || "pending",
    orderStatus: o.orderStatus || "pending_dealership_confirmation",
    deliveryMethod: o.deliveryMethod || "collection",
    visitDate: o.visitDate || null,
    customerDetails: o.customerDetails || {},
    cancelReason: o.cancelReason || "",
    statusHistory: o.statusHistory || [],
    emailStatus: o.emailStatus || "unknown",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    motorcycle: o.motorcycle && o.motorcycle._id
        ? {
              _id: o.motorcycle._id,
              name: o.motorcycle.name,
              brand: o.motorcycle.brand,
              image: o.motorcycle.image || o.motorcycle.images?.[0]?.url || "",
          }
        : o.motorcycleSnapshot || null,
    dealership: o.dealership && o.dealership._id
        ? {
              _id: o.dealership._id,
              name: o.dealership.name,
              city: o.dealership.city,
              address: o.dealership.address,
              phone: o.dealership.phone,
              email: o.dealership.email || "",
              openingHours: o.dealership.openingHours || "Mon-Sat: 10:00 AM - 8:00 PM",
              acceptedPaymentMethods:
                  o.dealership.acceptedPaymentMethods && o.dealership.acceptedPaymentMethods.length > 0
                      ? o.dealership.acceptedPaymentMethods
                      : OFFLINE_METHODS,
          }
        : null,
});

// Server-side price calculation from MongoDB. Never trust prices from client.
const priceFor = async (motorcycleId, city) => {
    const bike = await Motorcycle.findById(motorcycleId).lean();
    if (!bike) return { error: "Motorcycle not found." };
    const exShowroom = bike.exShowroomPrice || bike.price || 0;
    if (!city || !String(city).trim()) return { error: "City is required." };
    const entry = (bike.cityPrices || []).find(
        (cp) => cp.city.toLowerCase() === String(city).trim().toLowerCase()
    );
    if (!entry) return { error: `On-road pricing not available for ${city}.` };
    const roadTax = entry.roadTax || 0;
    const insurance = Math.round(exShowroom * 0.03);
    return {
        bike,
        exShowroom,
        roadTax,
        insurance,
        total: exShowroom + roadTax + insurance,
    };
};

const validateColor = (bike, colorName) => {
    if (!colorName) return { ok: true, color: null };
    const match = (bike.colors || []).find(
        (c) => c.name.toLowerCase() === String(colorName).trim().toLowerCase()
    );
    if (!match) return { error: "Selected color is not available for this motorcycle." };
    if (match.available === false) return { error: "Selected color is currently out of stock." };
    return { ok: true, color: match };
};

// Release committed stock
const releaseStock = async (dealershipId, motorcycleId, qty) =>
    Dealership.findOneAndUpdate(
        { _id: dealershipId, "stock.motorcycle": motorcycleId },
        { $inc: { "stock.$.quantity": qty } }
    );

const pushHistory = (order, status, by, note) => {
    order.statusHistory.push({
        status,
        at: new Date(),
        by: by || null,
        note: note || "",
    });
};

// Fire-and-forget order emails (never breaks or blocks transaction)
const mailOrder = async (orderId, kind) => {
    try {
        const {
            sendOrderConfirmationEmail,
            sendOrderStatusEmail,
            sendOrderDealerEmail,
        } = require("../services/emailService");

        const full = await Order.findById(orderId)
            .populate({ path: "motorcycle", select: "name brand" })
            .populate({ path: "dealership", select: "name city address phone email" })
            .lean();
        if (!full) return;

        const dlr = full.dealership && full.dealership._id ? full.dealership : null;
        let results = [];

        if (kind === "created-offline" || kind === "request-received") {
            results = await Promise.all([
                sendOrderConfirmationEmail(full, dlr),
                sendOrderDealerEmail(full, dlr),
            ]);
        } else {
            results = [await sendOrderStatusEmail(full, dlr)];
        }

        const sent = results.filter((r) => r && r.sent).length;
        const emailStatus =
            results.length && sent === results.length
                ? "sent"
                : sent > 0
                ? "partial"
                : "skipped";
        await Order.findByIdAndUpdate(orderId, { $set: { emailStatus } });
    } catch (e) {
        console.error("Order email error:", e.message);
    }
};

const staffDealershipIds = async (user) => {
    if (user.role === "admin") {
        return (await Dealership.find({}).select("_id").lean()).map((d) => d._id);
    }
    const list = await Dealership.find({
        $or: [{ owner: user._id }, { "staff.user": user._id }],
    }).select("_id").lean();
    return list.map((d) => d._id);
};

// =====================================================
// CREATE OFFLINE PURCHASE REQUEST — POST /api/orders / /api/orders/offline
// Offline purchase through dealership only
// =====================================================
const createOfflineOrder = async (req, res) => {
    try {
        const {
            motorcycleId,
            city,
            color,
            dealershipId,
            offlinePaymentType,
            deliveryMethod,
            customerDetails,
            visitDate,
        } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }

        const priced = await priceFor(motorcycleId, city);
        if (priced.error) {
            return res.status(400).json({ success: false, message: priced.error });
        }

        const colorCheck = validateColor(priced.bike, color);
        if (colorCheck.error) {
            return res.status(400).json({ success: false, message: colorCheck.error });
        }

        if (!isValidId(dealershipId)) {
            return res.status(400).json({ success: false, message: "Please select an authorized dealership." });
        }

        const dealership = await Dealership.findOne({
            _id: dealershipId,
            isActive: true,
            approved: { $ne: false },
        }).lean();
        if (!dealership) {
            return res.status(404).json({ success: false, message: "Selected dealership is currently unavailable." });
        }

        const method = String(offlinePaymentType || "").toLowerCase().trim();
        if (method && !OFFLINE_METHODS.includes(method)) {
            return res.status(400).json({
                success: false,
                message: "Please choose a valid showroom payment method (cash, card, upi, bank_transfer).",
            });
        }

        const name = String(customerDetails?.name || req.user.name || "").trim();
        const phone = String(customerDetails?.phone || req.user.phone || "").trim();
        const email = String(customerDetails?.email || req.user.email || "").trim();
        const address = String(customerDetails?.address || req.user.address || "").trim();

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: "Customer full name and phone number are required." });
        }

        // Validate preferred visit date
        let parsedVisitDate = null;
        const rawDate = visitDate || customerDetails?.preferredVisitDate;
        if (rawDate) {
            parsedVisitDate = new Date(rawDate);
            if (isNaN(parsedVisitDate.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid visit date format." });
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (parsedVisitDate < today) {
                return res.status(400).json({ success: false, message: "Preferred visit date cannot be in the past." });
            }
        }

        // Prevent accidental rapid duplicate orders by the same user
        const existingPending = await Order.findOne({
            user: req.user._id,
            motorcycle: motorcycleId,
            dealership: dealership._id,
            orderStatus: "pending_dealership_confirmation",
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
        }).lean();

        if (existingPending) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending purchase request for this motorcycle at this dealership. Please await their confirmation.",
                order: shapeOrder(existingPending),
            });
        }

        // Create the order with pending dealership confirmation & pending offline payment
        const order = new Order({
            orderNumber: makeOrderNumber(),
            user: req.user._id,
            motorcycle: motorcycleId,
            motorcycleSnapshot: {
                brand: priced.bike.brand,
                name: priced.bike.name,
                image: priced.bike.image || priced.bike.images?.[0]?.url || "",
            },
            selectedColor: colorCheck.color ? colorCheck.color.name : "",
            colorHex: colorCheck.color ? colorCheck.color.hexCode : "",
            dealership: dealership._id,
            quantity: 1,
            unitPrice: priced.exShowroom,
            roadTax: priced.roadTax,
            insuranceAmount: priced.insurance,
            taxAmount: priced.roadTax,
            totalAmount: priced.total,
            paymentMethod: "offline",
            offlinePaymentType: method,
            paymentStatus: "pending",
            orderStatus: "pending_dealership_confirmation",
            deliveryMethod: deliveryMethod === "delivery" ? "delivery" : "collection",
            visitDate: parsedVisitDate,
            customerDetails: {
                name,
                email,
                phone,
                address,
                preferredVisitDate: rawDate ? String(rawDate) : "",
            },
        });

        const historyNote = `Offline purchase request submitted${method ? ` (preferred method: ${method})` : ""}${parsedVisitDate ? ` (scheduled visit: ${parsedVisitDate.toDateString()})` : ""}`;
        pushHistory(order, "pending_dealership_confirmation", req.user._id, historyNote);
        await order.save();

        const populated = await Order.findById(order._id)
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "dealership", select: "name city address phone email openingHours acceptedPaymentMethods" })
            .lean();

        await createNotification(
            req.user._id,
            "order",
            "Purchase request received",
            `Your offline purchase request ${order.orderNumber} is awaiting dealership confirmation.`
        );
        mailOrder(order._id, "created-offline");

        res.status(201).json({
            success: true,
            message: "Purchase request submitted successfully. The dealership will review and confirm your request.",
            order: shapeOrder(populated),
        });
    } catch (error) {
        console.error("Create offline order error:", error.message);
        res.status(500).json({ success: false, message: "Could not create purchase request." });
    }
};

// Retired online endpoint placeholder to safely handle any stale callers
const createOnlineOrder = async (req, res) => {
    // Gracefully handle any leftover calls by directing them to offline purchase
    return createOfflineOrder(req, res);
};

// =====================================================
// GET MY ORDERS / GET ONE
// =====================================================
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "dealership", select: "name city address phone email openingHours acceptedPaymentMethods" })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: orders.length,
            orders: orders.map(shapeOrder),
        });
    } catch (error) {
        console.error("Get my orders error:", error.message);
        res.status(500).json({ success: false, message: "Could not load orders." });
    }
};

const getOrder = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid order ID." });
        }
        const order = await Order.findById(req.params.id)
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "dealership", select: "name city address phone email openingHours acceptedPaymentMethods" })
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const isOwner = String(order.user) === String(req.user._id);
        if (!isOwner && req.user.role !== "admin") {
            const ids = await staffDealershipIds(req.user);
            if (!ids.map(String).includes(String(order.dealership?._id || order.dealership))) {
                return res.status(403).json({ success: false, message: "Not authorized to view this order." });
            }
        }

        res.status(200).json({ success: true, order: shapeOrder(order) });
    } catch (error) {
        console.error("Get order error:", error.message);
        res.status(500).json({ success: false, message: "Could not load order." });
    }
};

// =====================================================
// CANCEL ORDER (Customer can cancel before payment is completed)
// =====================================================
const cancelOrder = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid order ID." });
        }

        const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (["completed", "cancelled"].includes(order.orderStatus) || order.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "This order cannot be cancelled because it is already paid or closed.",
            });
        }

        const hadCommittedStock = order.orderStatus === "confirmed";
        order.orderStatus = "cancelled";
        order.cancelReason = String(req.body?.reason || "Cancelled by customer.").slice(0, 500);
        pushHistory(order, "cancelled", req.user._id, order.cancelReason);
        await order.save();

        if (hadCommittedStock) {
            await releaseStock(order.dealership, order.motorcycle, order.quantity || 1);
        }

        await createNotification(
            req.user._id,
            "order",
            "Order cancelled",
            `Purchase request ${order.orderNumber} was cancelled.`
        );
        mailOrder(order._id, "cancelled");

        res.status(200).json({ success: true, message: "Order cancelled successfully." });
    } catch (error) {
        console.error("Cancel order error:", error.message);
        res.status(500).json({ success: false, message: "Could not cancel order." });
    }
};

// Staff authorization guard for dealership orders
const requireOrderAccess = async (user, orderId) => {
    const order = await Order.findById(orderId);
    if (!order) return { error: "Order not found.", status: 404 };
    if (user.role === "admin") return { order };
    const ids = await staffDealershipIds(user);
    if (!ids.map(String).includes(String(order.dealership))) {
        return { error: "Not authorized to manage this dealership's orders.", status: 403 };
    }
    return { order };
};

// =====================================================
// DEALER: confirm purchase request & commit stock
// =====================================================
const dealerConfirm = async (req, res) => {
    try {
        const { error, order, status } = await requireOrderAccess(req.user, req.params.id);
        if (error) return res.status(status).json({ success: false, message: error });

        if (order.orderStatus !== "pending_dealership_confirmation") {
            return res.status(400).json({
                success: false,
                message: "Only pending purchase requests can be confirmed.",
            });
        }

        // Atomically commit stock if tracked in dealership stock list
        const dealership = await Dealership.findById(order.dealership);
        const stockItem = dealership?.stock?.find(
            (s) => String(s.motorcycle) === String(order.motorcycle)
        );

        if (stockItem && stockItem.quantity < (order.quantity || 1)) {
            return res.status(409).json({
                success: false,
                message: "Insufficient showroom stock to confirm this purchase request.",
            });
        }

        if (stockItem) {
            await Dealership.findOneAndUpdate(
                {
                    _id: order.dealership,
                    stock: {
                        $elemMatch: {
                            motorcycle: order.motorcycle,
                            quantity: { $gte: order.quantity || 1 },
                        },
                    },
                },
                { $inc: { "stock.$.quantity": -(order.quantity || 1) } }
            );
        }

        order.orderStatus = "confirmed";
        pushHistory(order, "confirmed", req.user._id, "Dealership confirmed purchase request; vehicle reserved");
        await order.save();

        await createNotification(
            order.user,
            "order",
            "Purchase request confirmed",
            `Your purchase request ${order.orderNumber} has been confirmed by the dealership. Please visit the showroom to complete payment.`
        );
        mailOrder(order._id, "confirmed");

        res.status(200).json({ success: true, message: "Purchase request confirmed successfully." });
    } catch (error) {
        console.error("Dealer confirm error:", error.message);
        res.status(500).json({ success: false, message: "Could not confirm purchase request." });
    }
};

// =====================================================
// DEALER: reject purchase request with reason
// =====================================================
const dealerReject = async (req, res) => {
    try {
        const { error, order, status } = await requireOrderAccess(req.user, req.params.id);
        if (error) return res.status(status).json({ success: false, message: error });

        if (order.orderStatus !== "pending_dealership_confirmation") {
            return res.status(400).json({
                success: false,
                message: "Only pending purchase requests can be rejected.",
            });
        }

        order.orderStatus = "cancelled";
        order.cancelReason = String(req.body?.reason || "Rejected by dealership.").slice(0, 500);
        pushHistory(order, "cancelled", req.user._id, order.cancelReason);
        await order.save();

        await createNotification(
            order.user,
            "order",
            "Purchase request update",
            `Purchase request ${order.orderNumber} was not accepted: ${order.cancelReason}`
        );
        mailOrder(order._id, "rejected");

        res.status(200).json({ success: true, message: "Purchase request rejected." });
    } catch (error) {
        console.error("Dealer reject error:", error.message);
        res.status(500).json({ success: false, message: "Could not reject purchase request." });
    }
};

// =====================================================
// DEALER: verify offline payment (authorized staff only)
// Customers CANNOT mark their own orders as paid
// =====================================================
const verifyOfflinePayment = async (req, res) => {
    try {
        const { error, order, status } = await requireOrderAccess(req.user, req.params.id);
        if (error) return res.status(status).json({ success: false, message: error });

        if (order.paymentStatus === "paid") {
            return res.status(409).json({ success: false, message: "Payment has already been verified." });
        }

        if (order.orderStatus !== "confirmed") {
            return res.status(400).json({
                success: false,
                message: "Purchase request must be confirmed before verifying payment.",
            });
        }

        const dealership = await Dealership.findById(order.dealership).lean();
        const allowedMethods =
            dealership?.acceptedPaymentMethods && dealership.acceptedPaymentMethods.length > 0
                ? dealership.acceptedPaymentMethods
                : OFFLINE_METHODS;

        const { offlinePaymentType, offlinePaymentReference } = req.body;
        const selectedType = String(offlinePaymentType || "").toLowerCase().trim();

        if (!selectedType || !OFFLINE_METHODS.includes(selectedType)) {
            return res.status(400).json({
                success: false,
                message: `Please select a valid offline payment method (${OFFLINE_METHODS.join(", ")}).`,
            });
        }

        if (!allowedMethods.includes(selectedType)) {
            return res.status(400).json({
                success: false,
                message: `The dealership does not support "${selectedType}". Accepted: ${allowedMethods.join(", ")}.`,
            });
        }

        const claimed = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: "pending", orderStatus: "confirmed" },
            {
                $set: {
                    paymentStatus: "paid",
                    offlinePaymentType: selectedType,
                    offlinePaymentReference: String(offlinePaymentReference || "").trim().slice(0, 100),
                },
                $push: {
                    statusHistory: {
                        status: "paid",
                        at: new Date(),
                        by: req.user._id,
                        note: `Offline payment (${selectedType}) verified at dealership counter${offlinePaymentReference ? ` [Ref: ${offlinePaymentReference}]` : ""}`,
                    },
                },
            },
            { new: true }
        );

        if (!claimed) {
            return res.status(409).json({ success: false, message: "Payment already processed." });
        }

        await createNotification(
            order.user,
            "order",
            "Payment verified",
            `Your payment for order ${claimed.orderNumber} was verified at the dealership.`
        );
        mailOrder(claimed._id, "payment-verified");

        res.status(200).json({
            success: true,
            message: "Offline payment successfully verified.",
            order: shapeOrder(claimed),
        });
    } catch (error) {
        console.error("Verify offline payment error:", error.message);
        res.status(500).json({ success: false, message: "Could not verify payment." });
    }
};

// =====================================================
// DEALER/ADMIN: fulfilment (ready_for_collection / completed)
// =====================================================
const updateFulfilment = async (req, res) => {
    try {
        const { error, order, status } = await requireOrderAccess(req.user, req.params.id);
        if (error) return res.status(status).json({ success: false, message: error });

        const { orderStatus, note, reason } = req.body;
        if (!["ready_for_collection", "completed", "cancelled"].includes(orderStatus)) {
            return res.status(400).json({ success: false, message: "Invalid fulfilment status." });
        }

        if (order.paymentStatus !== "paid" && orderStatus !== "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Offline payment must be verified before marking the vehicle ready or completed.",
            });
        }

        if (order.orderStatus === "cancelled" || order.orderStatus === "completed") {
            return res.status(400).json({ success: false, message: "This order is already closed." });
        }

        order.orderStatus = orderStatus;
        if (orderStatus === "cancelled") {
            order.cancelReason = String(reason || "Cancelled by dealership staff.").slice(0, 500);
            await releaseStock(order.dealership, order.motorcycle, order.quantity || 1);
        }

        pushHistory(order, orderStatus, req.user._id, String(note || ""));
        await order.save();

        const notifText =
            orderStatus === "ready_for_collection"
                ? `Order ${order.orderNumber} is ready for collection at the showroom!`
                : orderStatus === "completed"
                ? `Order ${order.orderNumber} has been collected / completed. Enjoy your ride!`
                : `Order ${order.orderNumber} was cancelled.`;

        await createNotification(order.user, "order", "Order update", notifText);
        mailOrder(order._id, orderStatus);

        res.status(200).json({
            success: true,
            message: `Order status updated to "${orderStatus.replace(/_/g, " ")}".`,
        });
    } catch (error) {
        console.error("Fulfilment error:", error.message);
        res.status(500).json({ success: false, message: "Could not update order fulfilment." });
    }
};

// =====================================================
// STAFF/ADMIN: list orders with filtering & search
// =====================================================
const listOrders = async (req, res) => {
    try {
        const { paymentMethod, orderStatus, paymentStatus, dealership, page = 1, limit = 20, search } = req.query;
        const filter = {};

        if (paymentMethod) filter.paymentMethod = paymentMethod;
        if (orderStatus) filter.orderStatus = orderStatus;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        if (req.user.role !== "admin") {
            const ids = await staffDealershipIds(req.user);
            filter.dealership = { $in: ids };
        } else if (dealership && isValidId(dealership)) {
            filter.dealership = dealership;
        }

        if (search) {
            filter.$or = [
                { orderNumber: new RegExp(search, "i") },
                { "customerDetails.name": new RegExp(search, "i") },
                { "customerDetails.phone": new RegExp(search, "i") },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            Order.find(filter)
                .populate({ path: "motorcycle", select: "name brand image" })
                .populate({ path: "dealership", select: "name city address phone email openingHours acceptedPaymentMethods" })
                .populate({ path: "user", select: "name email phone" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Order.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: items.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            orders: items.map(shapeOrder),
        });
    } catch (error) {
        console.error("List orders error:", error.message);
        res.status(500).json({ success: false, message: "Could not load orders." });
    }
};

module.exports = {
    createOnlineOrder,
    createOfflineOrder,
    getMyOrders,
    getOrder,
    cancelOrder,
    listOrders,
    dealerConfirm,
    dealerReject,
    verifyOfflinePayment,
    updateFulfilment,
};
