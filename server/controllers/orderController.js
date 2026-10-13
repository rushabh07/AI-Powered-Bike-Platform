const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Motorcycle = require("../models/Motorcycle");
const MotorcycleVariant = require("../models/MotorcycleVariant");
const Dealership = require("../models/Dealership");
const {
    isConfigured: razorpayConfigured,
    getClient: getRazorpay,
} = require("../config/razorpay");
const { createNotification } = require("./notificationController");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const BIKE_SELECT =
    "name brand brandLogo category price exShowroomPrice cityPrices image images fuel engine mileage power rating batteryCapacity range chargingTime";

const shapeOrder = (o) => ({
    _id: o._id,
    city: o.city,
    variant: o.variant || null,
    variantName: o.variantName || "",
    exShowroomPrice: o.exShowroomPrice,
    roadTax: o.roadTax || 0,
    insuranceAmount: o.insuranceAmount || 0,
    onRoadPrice: o.onRoadPrice,
    totalAmount: o.totalAmount,
    quantity: o.quantity,
    status: o.status,
    paymentMethod: o.paymentMethod || "online",
    paymentStatus: o.paymentStatus || "pending",
    dealership: o.dealership || null,
    bookingReference: o.bookingReference || "",
    paymentId: o.paymentId || "",
    orderId: o.orderId || "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    motorcycle: o.motorcycle
        ? {
              _id: o.motorcycle._id,
              name: o.motorcycle.name,
              brand: o.motorcycle.brand,
              brandLogo: o.motorcycle.brandLogo || "",
              image: o.motorcycle.image || "",
              images: o.motorcycle.images || [],
              category: o.motorcycle.category,
              price: o.motorcycle.price,
          }
        : null,
    user: o.user
        ? {
              _id: o.user._id,
              name: o.user.name,
              email: o.user.email,
              phone: o.user.phone,
              address: o.user.address || "",
          }
        : null,
});

const createOrder = async (req, res) => {
    try {
        if (req.user?.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin accounts cannot purchase motorcycles or create orders.",
            });
        }

        const { motorcycleId, city, variantId } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }

        if (!city || !String(city).trim()) {
            return res.status(400).json({
                success: false,
                message: "City is required.",
            });
        }

        const bike = await Motorcycle.findById(motorcycleId).lean();
        if (!bike) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found.",
            });
        }

        const cityName = String(city).trim();

        let exShowroomPrice = bike.exShowroomPrice || bike.price || 0;
        let roadTax = 0;
        let variantName = "";
        let variant = null;

        if (variantId) {
            if (!isValidId(variantId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid variant ID.",
                });
            }

            const variantDoc = await MotorcycleVariant.findOne({
                _id: variantId,
                motorcycle: motorcycleId,
                isAvailable: true,
            }).lean();

            if (!variantDoc) {
                return res.status(404).json({
                    success: false,
                    message: "Variant not found or not available.",
                });
            }

            const variantCityEntry = (variantDoc.cityPrices || []).find(
                (cp) => cp.city.toLowerCase() === cityName.toLowerCase()
            );

            if (!variantCityEntry) {
                return res.status(400).json({
                    success: false,
                    message: `On-road price not available for ${cityName} in this variant.`,
                });
            }

            exShowroomPrice = variantDoc.exShowroomPrice;
            roadTax = variantCityEntry.roadTax;
            variantName = variantDoc.variantName;
            variant = variantDoc._id;
        } else {
            const cityPriceEntry = (bike.cityPrices || []).find(
                (cp) => cp.city.toLowerCase() === cityName.toLowerCase()
            );

            if (!cityPriceEntry) {
                return res.status(400).json({
                    success: false,
                    message: `On-road price not available for ${cityName}.`,
                });
            }

            roadTax = cityPriceEntry.roadTax || 0;
        }

        const insuranceAmount = Math.round(exShowroomPrice * 0.03);
        const onRoadPrice = exShowroomPrice + roadTax + insuranceAmount;
        const quantity = 1;
        const totalAmount = onRoadPrice * quantity;

        const order = await Order.create({
            user: req.user._id,
            motorcycle: motorcycleId,
            variant,
            variantName,
            city: cityName,
            exShowroomPrice,
            roadTax,
            insuranceAmount,
            onRoadPrice,
            totalAmount,
            quantity,
            status: "pending",
        });

        const populated = await Order.findById(order._id)
            .populate({ path: "motorcycle", select: BIKE_SELECT })
            .populate({ path: "user", select: "name email phone address" })
            .lean();

        res.status(201).json({
            success: true,
            message: "Order created successfully.",
            order: shapeOrder(populated),
        });
    } catch (error) {
        console.error("Create order error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not create order.",
        });
    }
};

const createDealershipBooking = async (req, res) => {
    try {
        const { motorcycleId, city, variantId, dealershipId } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid motorcycle ID.",
            });
        }
        if (!city || !String(city).trim()) {
            return res.status(400).json({
                success: false,
                message: "City is required.",
            });
        }
        if (!isValidId(dealershipId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid dealership ID.",
            });
        }

        const bike = await Motorcycle.findById(motorcycleId).lean();
        if (!bike) {
            return res.status(404).json({
                success: false,
                message: "Motorcycle not found.",
            });
        }

        const dealership = await Dealership.findOne({
            _id: dealershipId,
            isActive: true,
        }).lean();
        if (!dealership) {
            return res.status(404).json({
                success: false,
                message: "Dealership not found or inactive.",
            });
        }

        if (dealership.city.toLowerCase() !== String(city).trim().toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: "Dealership does not serve the selected city.",
            });
        }

        const cityName = String(city).trim();
        let exShowroomPrice = bike.exShowroomPrice || bike.price || 0;
        let roadTax = 0;
        let variantName = "";
        let variant = null;

        if (variantId) {
            if (!isValidId(variantId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid variant ID.",
                });
            }

            const variantDoc = await MotorcycleVariant.findOne({
                _id: variantId,
                motorcycle: motorcycleId,
                isAvailable: true,
            }).lean();

            if (!variantDoc) {
                return res.status(404).json({
                    success: false,
                    message: "Variant not found or not available.",
                });
            }

            const variantCityEntry = (variantDoc.cityPrices || []).find(
                (cp) => cp.city.toLowerCase() === cityName.toLowerCase()
            );

            if (!variantCityEntry) {
                return res.status(400).json({
                    success: false,
                    message: `On-road price not available for ${cityName} in this variant.`,
                });
            }

            exShowroomPrice = variantDoc.exShowroomPrice;
            roadTax = variantCityEntry.roadTax;
            variantName = variantDoc.variantName;
            variant = variantDoc._id;
        } else {
            const cityPriceEntry = (bike.cityPrices || []).find(
                (cp) => cp.city.toLowerCase() === cityName.toLowerCase()
            );

            if (!cityPriceEntry) {
                return res.status(400).json({
                    success: false,
                    message: `On-road price not available for ${cityName}.`,
                });
            }

            roadTax = cityPriceEntry.roadTax || 0;
        }

        const insuranceAmount = Math.round(exShowroomPrice * 0.03);
        const onRoadPrice = exShowroomPrice + roadTax + insuranceAmount;
        const bookingReference = `MOTOAI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const order = await Order.create({
            user: req.user._id,
            motorcycle: motorcycleId,
            variant,
            variantName,
            city: cityName,
            dealership: dealershipId,
            bookingReference,
            exShowroomPrice,
            roadTax,
            insuranceAmount,
            onRoadPrice,
            totalAmount: onRoadPrice,
            quantity: 1,
            status: "pending",
            paymentMethod: "dealership",
            paymentStatus: "pending",
        });

        const populated = await Order.findById(order._id)
            .populate({ path: "motorcycle", select: BIKE_SELECT })
            .populate({ path: "user", select: "name email phone address" })
            .populate({ path: "dealership", select: "name city address phone openingHours" })
            .lean();

        await createNotification(
            req.user._id,
            "booking",
            "Dealership Booking Confirmed",
            `Your booking ${bookingReference} at ${dealership.name} is confirmed. Pay ₹${onRoadPrice.toLocaleString("en-IN")} at the dealership.`
        );

        res.status(201).json({
            success: true,
            message: "Dealership booking created successfully.",
            order: shapeOrder(populated),
        });
    } catch (error) {
        console.error("Create dealership booking error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not create dealership booking.",
        });
    }
};

const getOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID.",
            });
        }

        const order = await Order.findOne({ _id: id, user: req.user._id })
            .populate({ path: "motorcycle", select: BIKE_SELECT })
            .populate({ path: "user", select: "name email phone address" })
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        res.status(200).json({
            success: true,
            order: shapeOrder(order),
        });
    } catch (error) {
        console.error("Get order error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load order.",
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate({ path: "motorcycle", select: BIKE_SELECT })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: orders.length,
            orders: orders.map(shapeOrder),
        });
    } catch (error) {
        console.error("Get my orders error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load orders.",
        });
    }
};

const createPayment = async (req, res) => {
    try {
        if (req.user?.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin accounts cannot initiate payments.",
            });
        }

        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID.",
            });
        }

        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        if (order.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "This order has already been paid.",
            });
        }

        if (order.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "This order has been cancelled.",
            });
        }

        const amountPaise = Math.round(order.totalAmount * 100);
        const currency = "INR";

        let razorpayOrderId;
        let provider = "test";
        let keyId = null;

        if (razorpayConfigured()) {
            try {
                const razorpay = getRazorpay();
                const rzOrder = await razorpay.orders.create({
                    amount: amountPaise,
                    currency,
                    receipt: `motoai_order_${order._id}`,
                });
                razorpayOrderId = rzOrder.id;
                provider = "razorpay";
                keyId = process.env.RAZORPAY_KEY_ID;
            } catch (gwError) {
                console.error("Razorpay order error:", gwError.message);
                return res.status(500).json({
                    success: false,
                    message: "Could not create payment order. Please try again.",
                });
            }
        } else {
            razorpayOrderId = `order_test_${order._id}_${Date.now()}`;
        }

        order.orderId = razorpayOrderId;
        order.status = "payment_pending";
        await order.save();

        res.status(200).json({
            success: true,
            mode: provider === "razorpay" ? "razorpay" : "test",
            orderId: razorpayOrderId,
            amount: order.totalAmount,
            amountPaise,
            currency,
            ...(keyId ? { keyId } : {}),
        });
    } catch (error) {
        console.error("Create payment error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not initiate payment.",
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        if (req.user?.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin accounts cannot complete purchase payments.",
            });
        }

        const { id } = req.params;
        const body = req.body || {};
        const paymentId = body.paymentId || body.razorpay_payment_id;
        const signature = body.signature || body.razorpay_signature;
        const razorpayOrderId = body.orderId || body.razorpay_order_id;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID.",
            });
        }

        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        if (order.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "Payment already processed for this order.",
            });
        }

        if (order.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "This order has been cancelled.",
            });
        }

        if (!razorpayOrderId && !order.orderId) {
            return res.status(400).json({
                success: false,
                message: "Payment order ID is missing.",
            });
        }

        const effectiveOrderId = razorpayOrderId || order.orderId;

        if (order.orderId.startsWith("order_test_")) {
            order.status = "paid";
            order.paymentId = paymentId || `pay_test_${Date.now()}`;
            await order.save();

            await createNotification(
                req.user._id,
                "payment",
                "Payment successful",
                `Your ₹${order.totalAmount.toLocaleString("en-IN")} payment for ${order.motorcycle} was received.`
            );

            return res.status(200).json({
                success: true,
                message: "Payment successful.",
                order: shapeOrder(order),
            });
        }

        if (!paymentId || !signature) {
            order.status = "failed";
            await order.save();
            return res.status(400).json({
                success: false,
                message: "Payment verification failed. Missing payment details.",
            });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${effectiveOrderId}|${paymentId}`)
            .digest("hex");

        const expectedBuf = Buffer.from(expectedSignature, "utf8");
        const actualBuf = Buffer.from(String(signature), "utf8");
        const signatureOk =
            expectedBuf.length === actualBuf.length &&
            crypto.timingSafeEqual(expectedBuf, actualBuf);

        if (!signatureOk) {
            order.status = "failed";
            await order.save();
            return res.status(400).json({
                success: false,
                message: "Payment verification failed. Invalid signature.",
            });
        }

        const claimed = await Order.findOneAndUpdate(
            { _id: order._id, status: "payment_pending" },
            {
                $set: {
                    status: "paid",
                    paymentId,
                    razorpaySignature: String(signature),
                },
            },
            { new: true }
        );

        if (!claimed) {
            const current = await Order.findById(order._id).select("status");
            if (current && current.status === "paid") {
                return res.status(409).json({
                    success: false,
                    message: "Payment already processed for this order.",
                });
            }
            return res.status(400).json({
                success: false,
                message: "This order is no longer payable.",
            });
        }

        await createNotification(
            req.user._id,
            "payment",
            "Payment successful",
            `Your ₹${order.totalAmount.toLocaleString("en-IN")} payment for ${order.motorcycle} was received.`
        );

        res.status(200).json({
            success: true,
            message: "Payment successful.",
            order: shapeOrder(claimed),
        });
    } catch (error) {
        console.error("Verify payment error:", error.message);
        res.status(500).json({
            success: false,
            message: "Payment verification failed.",
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID.",
            });
        }

        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        if (order.status === "paid") {
            return res.status(400).json({
                success: false,
                message: "Paid orders cannot be cancelled.",
            });
        }

        order.status = "cancelled";
        await order.save();

        res.status(200).json({
            success: true,
            message: "Order cancelled.",
        });
    } catch (error) {
        console.error("Cancel order error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not cancel order.",
        });
    }
};

module.exports = {
    createOrder,
    getOrder,
    getMyOrders,
    createPayment,
    verifyPayment,
    cancelOrder,
};
