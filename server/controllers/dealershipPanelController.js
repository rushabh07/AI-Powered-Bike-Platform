const mongoose = require("mongoose");
const Dealership = require("../models/Dealership");
const BikeEnquiry = require("../models/BikeEnquiry");
const Sale = require("../models/Sale");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const { enquiryStatusEmail, saleVerifiedEmail } = require("../services/emailService");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Dealerships this user may manage: owner, staff, or admin (all)
const scopedDealerships = async (user) => {
    if (user.role === "admin") {
        return Dealership.find({}).select("_id").lean().then((d) => d.map((x) => x._id));
    }
    const list = await Dealership.find({
        $or: [{ owner: user._id }, { "staff.user": user._id }],
    }).select("_id").lean();
    return list.map((x) => x._id);
};

const requireDealershipAccess = async (user, dealershipId) => {
    if (!isValidId(dealershipId)) return null;
    const query = { _id: dealershipId };
    if (user.role !== "admin") {
        query.$or = [{ owner: user._id }, { "staff.user": user._id }];
    }
    return Dealership.findOne(query);
};

const audit = (actor, action, entity, entityId, dealership, details) => {
    AuditLog.create({ actor, action, entity, entityId, dealership, details }).catch((e) =>
        console.error("Audit write failed:", e.message)
    );
};

const notify = (userId, type, title, message) => {
    if (!userId) return;
    Notification.create({ user: userId, type, title, message }).catch((e) =>
        console.error("Notify failed:", e.message)
    );
};

// =====================================================
// OVERVIEW — GET /api/provider/panel/overview
// =====================================================
const getOverview = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const [bookings, sales, reviews, stockAgg] = await Promise.all([
            BikeEnquiry.find({ dealership: { $in: ids } }).select("status enquiryType").lean(),
            Sale.find({ dealership: { $in: ids } }).select("amount verified").lean(),
            Review.countDocuments(),
            Dealership.aggregate([
                { $match: { _id: { $in: ids } } },
                { $unwind: { path: "$stock", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: null,
                        units: { $sum: { $ifNull: ["$stock.quantity", 0] } },
                        models: { $addToSet: "$stock.motorcycle" },
                    },
                },
            ]),
        ]);

        const byStatus = {};
        for (const b of bookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        const revenue = sales.filter((s) => s.verified).reduce((t, s) => t + Number(s.amount || 0), 0);
        const converted = await BikeEnquiry.countDocuments({ dealership: { $in: ids }, converted: true });
        const leads = await BikeEnquiry.countDocuments({
            dealership: { $in: ids },
            status: { $in: ["pending", "submitted", "contacted", "scheduled"] },
        });

        res.status(200).json({
            success: true,
            stats: {
                inventoryUnits: stockAgg[0]?.units || 0,
                inventoryModels: (stockAgg[0]?.models || []).filter(Boolean).length,
                totalBookings: bookings.length,
                pendingBookings: (byStatus.pending || 0) + (byStatus.submitted || 0),
                confirmedBookings: byStatus.confirmed || 0,
                completedBookings: byStatus.completed || 0,
                leads,
                converted,
                conversionRate: leads + converted > 0 ? Math.round((converted / (leads + converted)) * 100) : 0,
                totalSales: sales.length,
                verifiedSales: sales.filter((s) => s.verified).length,
                revenue,
                reviews,
            },
        });
    } catch (error) {
        console.error("Panel overview error:", error.message);
        res.status(500).json({ success: false, message: "Could not load overview." });
    }
};

// =====================================================
// DEALERSHIPS (owner-scoped)
// =====================================================
const listMyDealerships = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const list = await Dealership.find({ _id: { $in: ids } }).sort({ name: 1 }).lean();
        res.status(200).json({ success: true, count: list.length, dealerships: list });
    } catch (error) {
        console.error("List my dealerships error:", error.message);
        res.status(500).json({ success: false, message: "Could not load dealerships." });
    }
};

const createMyDealership = async (req, res) => {
    try {
        const { name, city, address, phone, email, openingHours, brands, googleMapsUrl, timeSlots, stockStatus } = req.body;
        if (!name?.trim() || !city?.trim() || !address?.trim() || !phone?.trim()) {
            return res.status(400).json({ success: false, message: "Name, city, address and phone are required." });
        }
        const d = await Dealership.create({
            name: name.trim(),
            city: city.trim(),
            address: address.trim(),
            phone: phone.trim(),
            email: String(email || "").trim().toLowerCase(),
            openingHours: openingHours || "Mon-Sat: 10:00 AM - 8:00 PM",
            brands: Array.isArray(brands) ? brands.map((b) => String(b).trim()).filter(Boolean) : [],
            googleMapsUrl: String(googleMapsUrl || "").trim(),
            timeSlots: Array.isArray(timeSlots) && timeSlots.length ? timeSlots.map((s) => String(s).trim()).filter(Boolean) : undefined,
            stockStatus: stockStatus || "unknown",
            owner: req.user.role === "admin" ? null : req.user._id,
            approved: req.user.role === "admin",
            isActive: true,
        });
        audit(req.user._id, "dealership.create", "Dealership", d._id, d._id, d.name);
        res.status(201).json({ success: true, message: "Dealership created.", dealership: d });
    } catch (error) {
        console.error("Create my dealership error:", error.message);
        res.status(500).json({ success: false, message: "Could not create dealership." });
    }
};

const updateMyDealership = async (req, res) => {
    try {
        const d = await requireDealershipAccess(req.user, req.params.dealershipId);
        if (!d) return res.status(404).json({ success: false, message: "Dealership not found." });
        const allowed = ["name", "city", "address", "phone", "email", "openingHours", "brands", "googleMapsUrl", "timeSlots", "stockStatus", "showroomImages"];
        if (req.user.role === "admin") allowed.push("approved", "isActive", "owner");
        for (const k of allowed) {
            if (req.body[k] !== undefined) d[k] = req.body[k];
        }
        await d.save();
        audit(req.user._id, "dealership.update", "Dealership", d._id, d._id, d.name);
        res.status(200).json({ success: true, message: "Dealership updated.", dealership: d });
    } catch (error) {
        console.error("Update my dealership error:", error.message);
        res.status(500).json({ success: false, message: "Could not update dealership." });
    }
};

const addStaff = async (req, res) => {
    try {
        const d = await requireDealershipAccess(req.user, req.params.dealershipId);
        if (!d) return res.status(404).json({ success: false, message: "Dealership not found." });
        const { email, role } = req.body;
        const User = require("../models/User");
        const member = await User.findOne({ email: String(email || "").trim().toLowerCase() }).select("_id name email").lean();
        if (!member) return res.status(404).json({ success: false, message: "No user found with that email." });
        if (d.staff.some((s) => String(s.user) === String(member._id))) {
            return res.status(409).json({ success: false, message: "User is already staff." });
        }
        d.staff.push({ user: member._id, role: role === "manager" ? "manager" : "sales" });
        await d.save();
        audit(req.user._id, "dealership.staff.add", "Dealership", d._id, d._id, member.email);
        res.status(200).json({ success: true, message: "Staff added.", staff: d.staff });
    } catch (error) {
        console.error("Add staff error:", error.message);
        res.status(500).json({ success: false, message: "Could not add staff." });
    }
};

const removeStaff = async (req, res) => {
    try {
        const d = await requireDealershipAccess(req.user, req.params.dealershipId);
        if (!d) return res.status(404).json({ success: false, message: "Dealership not found." });
        d.staff = d.staff.filter((s) => String(s.user) !== String(req.params.userId));
        await d.save();
        audit(req.user._id, "dealership.staff.remove", "Dealership", d._id, d._id, req.params.userId);
        res.status(200).json({ success: true, message: "Staff removed.", staff: d.staff });
    } catch (error) {
        console.error("Remove staff error:", error.message);
        res.status(500).json({ success: false, message: "Could not remove staff." });
    }
};

// =====================================================
// STOCK (per-dealership inventory)
// =====================================================
const updateStock = async (req, res) => {
    try {
        const d = await requireDealershipAccess(req.user, req.params.dealershipId);
        if (!d) return res.status(404).json({ success: false, message: "Dealership not found." });
        const { motorcycle, quantity, price } = req.body;
        if (!isValidId(motorcycle)) return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        const idx = d.stock.findIndex((s) => String(s.motorcycle) === String(motorcycle));
        if (Number(quantity) <= 0) {
            if (idx >= 0) d.stock.splice(idx, 1);
        } else if (idx >= 0) {
            d.stock[idx].quantity = Number(quantity);
            if (price !== undefined) d.stock[idx].price = Number(price);
        } else {
            d.stock.push({ motorcycle, quantity: Number(quantity), price: Number(price) || 0 });
        }
        await d.save();
        await d.populate({ path: "stock.motorcycle", select: "name brand price image" });
        audit(req.user._id, "dealership.stock.update", "Dealership", d._id, d._id, `${motorcycle}:${quantity}`);
        res.status(200).json({ success: true, stock: d.stock });
    } catch (error) {
        console.error("Update stock error:", error.message);
        res.status(500).json({ success: false, message: "Could not update stock." });
    }
};

const getStock = async (req, res) => {
    try {
        const d = await requireDealershipAccess(req.user, req.params.dealershipId);
        if (!d) return res.status(404).json({ success: false, message: "Dealership not found." });
        await d.populate({ path: "stock.motorcycle", select: "name brand price image category" });
        res.status(200).json({ success: true, stock: d.stock });
    } catch (error) {
        console.error("Get stock error:", error.message);
        res.status(500).json({ success: false, message: "Could not load stock." });
    }
};

// =====================================================
// BOOKINGS (test rides + purchase enquiries, scoped)
// =====================================================
const shapeBooking = (e) => ({
    _id: e._id,
    enquiryId: e.enquiryId,
    enquiryType: e.enquiryType,
    status: e.status,
    visitDate: e.visitDate,
    timeSlot: e.timeSlot || "",
    contactName: e.contactName,
    contactPhone: e.contactPhone,
    contactEmail: e.contactEmail || "",
    licenceConfirmed: !!e.licenceConfirmed,
    notes: e.notes,
    adminNotes: e.adminNotes,
    followUpDate: e.followUpDate || null,
    converted: !!e.converted,
    color: e.color,
    variantName: e.variantName || "",
    createdAt: e.createdAt,
    user: e.user ? { _id: e.user._id, name: e.user.name, email: e.user.email, phone: e.user.phone } : null,
    motorcycle: e.motorcycle ? { _id: e.motorcycle._id, name: e.motorcycle.name, brand: e.motorcycle.brand, image: e.motorcycle.image || "" } : null,
    dealership: e.dealership ? { _id: e.dealership._id, name: e.dealership.name, city: e.dealership.city } : null,
});

const listBookings = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { status, enquiryType, dealership, page = 1, limit = 20, search } = req.query;
        const filter = { dealership: { $in: ids } };
        if (status) filter.status = status;
        if (enquiryType) filter.enquiryType = enquiryType;
        if (dealership && ids.map(String).includes(String(dealership))) filter.dealership = dealership;
        if (search) {
            filter.$or = [
                { enquiryId: new RegExp(search, "i") },
                { contactName: new RegExp(search, "i") },
                { contactPhone: new RegExp(search, "i") },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            BikeEnquiry.find(filter)
                .populate({ path: "user", select: "name email phone" })
                .populate({ path: "motorcycle", select: "name brand image" })
                .populate({ path: "dealership", select: "name city" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            BikeEnquiry.countDocuments(filter),
        ]);
        res.status(200).json({ success: true, count: items.length, total, page: Number(page), pages: Math.ceil(total / Number(limit)), bookings: items.map(shapeBooking) });
    } catch (error) {
        console.error("List bookings error:", error.message);
        res.status(500).json({ success: false, message: "Could not load bookings." });
    }
};

const updateBooking = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const booking = await BikeEnquiry.findOne({ _id: req.params.bookingId, dealership: { $in: ids } });
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        const { status, visitDate, timeSlot, followUpDate, converted, adminNotes } = req.body;
        const valid = ["pending", "submitted", "contacted", "scheduled", "confirmed", "completed", "cancelled", "rejected"];
        if (status !== undefined) {
            if (!valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });
            if (status === "confirmed" && booking.enquiryType === "test_ride" && !booking.licenceConfirmed) {
                return res.status(400).json({ success: false, message: "Cannot confirm without licence confirmation." });
            }
            if (status === "confirmed") {
                const overlap = await BikeEnquiry.findOne({
                    _id: { $ne: booking._id },
                    dealership: booking.dealership,
                    visitDate: booking.visitDate,
                    timeSlot: booking.timeSlot,
                    status: "confirmed",
                }).select("_id").lean();
                if (overlap) return res.status(409).json({ success: false, message: "Slot already has a confirmed booking." });
                booking.confirmedAt = new Date();
            }
            booking.status = status;
        }
        if (visitDate !== undefined) {
            const d = new Date(visitDate);
            if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: "Invalid date." });
            booking.visitDate = d;
        }
        if (timeSlot !== undefined) {
            const dealer = await Dealership.findById(booking.dealership).select("timeSlots").lean();
            if (dealer?.timeSlots?.length && !dealer.timeSlots.includes(String(timeSlot))) {
                return res.status(400).json({ success: false, message: "Time slot not offered by this dealership." });
            }
            booking.timeSlot = String(timeSlot);
        }
        if (followUpDate !== undefined) booking.followUpDate = followUpDate ? new Date(followUpDate) : null;
        if (converted !== undefined) booking.converted = !!converted;
        if (adminNotes !== undefined) booking.adminNotes = String(adminNotes);
        await booking.save();

        notify(booking.user, "booking", "Booking updated", `Your booking ${booking.enquiryId} is now "${booking.status}".`);
        const populated = await BikeEnquiry.findById(booking._id)
            .populate({ path: "user", select: "name email phone" })
            .populate({ path: "motorcycle", select: "name brand image" })
            .populate({ path: "dealership", select: "name city" })
            .lean();
        if (populated) {
            const { enquiryStatusEmail } = require("../services/emailService");
            enquiryStatusEmail(populated, populated.dealership);
        }
        audit(req.user._id, "booking.update", "BikeEnquiry", booking._id, booking.dealership, `status=${booking.status}`);
        res.status(200).json({ success: true, message: "Booking updated.", booking: shapeBooking(populated) });
    } catch (error) {
        console.error("Update booking error:", error.message);
        res.status(500).json({ success: false, message: "Could not update booking." });
    }
};

// =====================================================
// SALES (offline payment records)
// =====================================================
const listSales = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { page = 1, limit = 20, verified } = req.query;
        const filter = { dealership: { $in: ids } };
        if (verified !== undefined && verified !== "") filter.verified = verified === "true";
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            Sale.find(filter).populate({ path: "dealership", select: "name city" }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            Sale.countDocuments(filter),
        ]);
        res.status(200).json({ success: true, count: items.length, total, page: Number(page), pages: Math.ceil(total / Number(limit)), sales: items });
    } catch (error) {
        console.error("List sales error:", error.message);
        res.status(500).json({ success: false, message: "Could not load sales." });
    }
};

const createSale = async (req, res) => {
    try {
        const { dealership, enquiry, customerName, customerPhone, motorcycleName, amount, paymentMethod, receiptRef, deliveryStatus } = req.body;
        const d = await requireDealershipAccess(req.user, dealership);
        if (!d) return res.status(404).json({ success: false, message: "Dealership not found." });
        if (!customerName?.trim() || !customerPhone?.trim()) {
            return res.status(400).json({ success: false, message: "Customer name and phone are required." });
        }
        if (!Number(amount) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Valid amount is required." });
        }
        if (!["cash", "upi", "card", "bank_transfer"].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "Invalid payment method." });
        }
        const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const sale = await Sale.create({
            dealership,
            enquiry: enquiry && isValidId(enquiry) ? enquiry : null,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            motorcycleName: String(motorcycleName || "").trim(),
            amount: Number(amount),
            paymentMethod,
            receiptRef: String(receiptRef || "").trim(),
            invoiceNo,
            deliveryStatus: ["pending", "ready", "delivered"].includes(deliveryStatus) ? deliveryStatus : "pending",
            createdBy: req.user._id,
        });
        audit(req.user._id, "sale.create", "Sale", sale._id, dealership, `${invoiceNo}:${sale.amount}`);
        res.status(201).json({ success: true, message: "Sale recorded.", sale });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "Duplicate invoice. Please retry." });
        }
        console.error("Create sale error:", error.message);
        res.status(500).json({ success: false, message: "Could not record sale." });
    }
};

const verifySale = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const sale = await Sale.findOne({ _id: req.params.saleId, dealership: { $in: ids } });
        if (!sale) return res.status(404).json({ success: false, message: "Sale not found." });
        if (sale.verified) return res.status(409).json({ success: false, message: "Sale already verified." });
        sale.verified = true;
        sale.verifiedBy = req.user._id;
        sale.verifiedAt = new Date();
        if (req.body.deliveryStatus && ["pending", "ready", "delivered"].includes(req.body.deliveryStatus)) {
            sale.deliveryStatus = req.body.deliveryStatus;
        }
        await sale.save();
        const { saleVerifiedEmail } = require("../services/emailService");
        let email = null;
        if (sale.enquiry) {
            const enq = await BikeEnquiry.findById(sale.enquiry).select("contactEmail user").populate({ path: "user", select: "email" }).lean();
            email = enq?.contactEmail || enq?.user?.email || null;
        }
        if (email) saleVerifiedEmail(sale, email);
        audit(req.user._id, "sale.verify", "Sale", sale._id, sale.dealership, sale.invoiceNo);
        res.status(200).json({ success: true, message: "Payment verified.", sale });
    } catch (error) {
        console.error("Verify sale error:", error.message);
        res.status(500).json({ success: false, message: "Could not verify sale." });
    }
};

// =====================================================
// REVIEWS (bikes in own stock) + responses
// =====================================================
const listReviews = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const dealers = await Dealership.find({ _id: { $in: ids } }).select("stock.motorcycle").lean();
        const bikeIds = [...new Set(dealers.flatMap((d) => (d.stock || []).map((s) => String(s.motorcycle))))];
        const filter = bikeIds.length ? { motorcycle: { $in: bikeIds } } : { _id: null };
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            Review.find(filter)
                .populate({ path: "user", select: "name" })
                .populate({ path: "motorcycle", select: "name brand" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Review.countDocuments(filter),
        ]);
        res.status(200).json({ success: true, count: items.length, total, page: Number(page), pages: Math.ceil(total / Number(limit)), reviews: items });
    } catch (error) {
        console.error("List dealer reviews error:", error.message);
        res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const respondReview = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const review = await Review.findById(req.params.reviewId).populate({ path: "motorcycle", select: "_id" }).lean();
        if (!review) return res.status(404).json({ success: false, message: "Review not found." });
        const dealers = await Dealership.find({ _id: { $in: ids } }).select("stock.motorcycle").lean();
        const bikeIds = new Set(dealers.flatMap((d) => (d.stock || []).map((s) => String(s.motorcycle))));
        if (!bikeIds.has(String(review.motorcycle?._id || review.motorcycle))) {
            return res.status(403).json({ success: false, message: "Not your inventory." });
        }
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ success: false, message: "Response text is required." });
        await Review.findByIdAndUpdate(req.params.reviewId, {
            $set: { dealerResponse: { text: String(text).trim().slice(0, 1000), by: req.user._id, at: new Date() } },
        });
        audit(req.user._id, "review.respond", "Review", review._id, null, "response added");
        res.status(200).json({ success: true, message: "Response posted." });
    } catch (error) {
        console.error("Respond review error:", error.message);
        res.status(500).json({ success: false, message: "Could not post response." });
    }
};

// =====================================================
// NOTIFICATIONS (in-app center)
// =====================================================
const listNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total, unread] = await Promise.all([
            Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            Notification.countDocuments({ user: req.user._id }),
            Notification.countDocuments({ user: req.user._id, read: false }),
        ]);
        res.status(200).json({ success: true, count: items.length, total, unread, page: Number(page), notifications: items });
    } catch (error) {
        console.error("List notifications error:", error.message);
        res.status(500).json({ success: false, message: "Could not load notifications." });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { read: true } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not update notification." });
    }
};

// =====================================================
// REPORTS (CSV download, no new deps)
// =====================================================
const downloadReport = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { type = "sales" } = req.query;
        const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        let csv = "";
        let filename = "report.csv";
        if (type === "sales") {
            const items = await Sale.find({ dealership: { $in: ids } }).populate({ path: "dealership", select: "name" }).sort({ createdAt: -1 }).lean();
            csv = "Invoice,Date,Dealership,Customer,Phone,Bike,Amount,Method,Receipt,Verified,Delivery\n" +
                items.map((s) => [s.invoiceNo, new Date(s.createdAt).toISOString().slice(0, 10), s.dealership?.name, s.customerName, s.customerPhone, s.motorcycleName, s.amount, s.paymentMethod, s.receiptRef, s.verified ? "yes" : "no", s.deliveryStatus].map(esc).join(",")).join("\n");
            filename = "sales-report.csv";
        } else if (type === "bookings") {
            const items = await BikeEnquiry.find({ dealership: { $in: ids } }).populate({ path: "dealership", select: "name" }).populate({ path: "motorcycle", select: "name brand" }).sort({ createdAt: -1 }).lean();
            csv = "EnquiryID,Date,Type,Customer,Phone,Bike,Dealership,Visit,Slot,Status,Converted\n" +
                items.map((e) => [e.enquiryId, new Date(e.createdAt).toISOString().slice(0, 10), e.enquiryType, e.contactName, e.contactPhone, `${e.motorcycle?.brand || ""} ${e.motorcycle?.name || ""}`.trim(), e.dealership?.name, e.visitDate ? new Date(e.visitDate).toISOString().slice(0, 10) : "", e.timeSlot, e.status, e.converted ? "yes" : "no"].map(esc).join(",")).join("\n");
            filename = "bookings-report.csv";
        } else if (type === "leads") {
            const items = await BikeEnquiry.find({ dealership: { $in: ids }, status: { $in: ["pending", "submitted", "contacted", "scheduled"] } }).sort({ followUpDate: 1 }).lean();
            csv = "EnquiryID,Customer,Phone,Email,Type,Status,FollowUp,Created\n" +
                items.map((e) => [e.enquiryId, e.contactName, e.contactPhone, e.contactEmail, e.enquiryType, e.status, e.followUpDate ? new Date(e.followUpDate).toISOString().slice(0, 10) : "", new Date(e.createdAt).toISOString().slice(0, 10)].map(esc).join(",")).join("\n");
            filename = "leads-report.csv";
        } else {
            return res.status(400).json({ success: false, message: "Invalid report type." });
        }
        audit(req.user._id, "report.download", "Report", null, null, type);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error("Report error:", error.message);
        res.status(500).json({ success: false, message: "Could not generate report." });
    }
};

// =====================================================
// AUDIT LOG
// =====================================================
const listAudit = async (req, res) => {
    try {
        const ids = await scopedDealerships(req.user);
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = req.user.role === "admin" ? {} : { $or: [{ dealership: { $in: ids } }, { actor: req.user._id }] };
        const [items, total] = await Promise.all([
            AuditLog.find(filter).populate({ path: "actor", select: "name email" }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            AuditLog.countDocuments(filter),
        ]);
        res.status(200).json({ success: true, count: items.length, total, page: Number(page), audit: items });
    } catch (error) {
        console.error("List audit error:", error.message);
        res.status(500).json({ success: false, message: "Could not load audit log." });
    }
};

module.exports = {
    getOverview,
    listMyDealerships,
    createMyDealership,
    updateMyDealership,
    addStaff,
    removeStaff,
    getStock,
    updateStock,
    listBookings,
    updateBooking,
    listSales,
    createSale,
    verifySale,
    listReviews,
    respondReview,
    listNotifications,
    markNotificationRead,
    downloadReport,
    listAudit,
};
