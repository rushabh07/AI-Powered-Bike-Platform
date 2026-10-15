const mongoose = require("mongoose");
const BikeEnquiry = require("../models/BikeEnquiry");
const Motorcycle = require("../models/Motorcycle");
let MotorcycleVariant = null;
try {
    MotorcycleVariant = require("../models/MotorcycleVariant");
} catch (e) {
    MotorcycleVariant = null;
}
const Dealership = require("../models/Dealership");
const { createNotification } = require("./notificationController");
const {
    sendTestRideBookingEmail,
    sendTestRideStatusUpdateEmail,
    sendPurchaseConfirmationEmail,
    sendTestRideDealerEmail,
    sendDealershipPurchaseNotificationEmail,
} = require("../services/emailService");

const summarizeEmailStatus = (results) => {
    const sent = results.filter((r) => r && r.sent).length;
    if (sent === results.length && results.length > 0) return "sent";
    if (sent > 0) return "partial";
    if (results.some((r) => r && (r.reason === "not_configured" || r.reason === "no_recipient" || r.reason === "email_disabled"))) return "skipped";
    return "failed";
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const shapeEnquiry = (e) => ({
    _id: e._id,
    enquiryId: e.enquiryId,
    enquiryType: e.enquiryType,
    color: e.color,
    colorHex: e.colorHex,
    status: e.status,
    visitDate: e.visitDate,
    timeSlot: e.timeSlot || "",
    contactName: e.contactName,
    contactPhone: e.contactPhone,
    contactEmail: e.contactEmail || "",
    licenceConfirmed: !!e.licenceConfirmed,
    confirmedAt: e.confirmedAt || null,
    notes: e.notes,
    adminNotes: e.adminNotes,
    emailStatus: e.emailStatus || "unknown",
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    user: e.user
        ? { _id: e.user._id, name: e.user.name, email: e.user.email, phone: e.user.phone }
        : null,
    motorcycle: e.motorcycle
        ? {
              _id: e.motorcycle._id,
              name: e.motorcycle.name,
              brand: e.motorcycle.brand,
              image: e.motorcycle.image || "",
              images: e.motorcycle.images || [],
          }
        : null,
    variant: e.variant && e.variant._id
        ? { _id: e.variant._id, variantName: e.variant.variantName, exShowroomPrice: e.variant.exShowroomPrice }
        : null,
    dealership: e.dealership
        ? {
              _id: e.dealership._id,
              name: e.dealership.name,
              city: e.dealership.city,
              address: e.dealership.address,
              phone: e.dealership.phone,
              openingHours: e.dealership.openingHours,
              brands: e.dealership.brands || [],
              googleMapsUrl: e.dealership.googleMapsUrl || "",
              timeSlots: e.dealership.timeSlots || [],
              stockStatus: e.dealership.stockStatus || "unknown",
          }
        : null,
});

const createEnquiry = async (req, res) => {
    try {
        const { motorcycleId, variantId, color, colorHex, enquiryType, dealershipId, visitDate, timeSlot, contactName, contactPhone, contactEmail, licenceConfirmed, notes } = req.body;

        if (!isValidId(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID." });
        }
        if (!["test_ride", "purchase"].includes(enquiryType)) {
            return res.status(400).json({ success: false, message: "Invalid enquiry type." });
        }
        if (!isValidId(dealershipId)) {
            return res.status(400).json({ success: false, message: "Invalid dealership ID." });
        }
        if (!visitDate || isNaN(new Date(visitDate).getTime())) {
            return res.status(400).json({ success: false, message: "Valid visit date is required." });
        }
        if (!contactName || !String(contactName).trim()) {
            return res.status(400).json({ success: false, message: "Contact name is required." });
        }
        if (!contactPhone || !String(contactPhone).trim()) {
            return res.status(400).json({ success: false, message: "Contact phone is required." });
        }
        const phoneDigits = String(contactPhone).replace(/\D/g, "");
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            return res.status(400).json({ success: false, message: "Enter a valid mobile number (10-15 digits)." });
        }
        if (contactEmail && String(contactEmail).trim()) {
            const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contactEmail).trim());
            if (!emailOk) {
                return res.status(400).json({ success: false, message: "Enter a valid email address." });
            }
        }
        const visitDay = new Date(visitDate);
        visitDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (visitDay < today) {
            return res.status(400).json({ success: false, message: "Visit date cannot be in the past." });
        }
        if (enquiryType === "test_ride" && licenceConfirmed !== true) {
            return res.status(400).json({ success: false, message: "Driving licence confirmation is required for a test ride." });
        }

        const bike = await Motorcycle.findById(motorcycleId).select("_id").lean();
        if (!bike) {
            return res.status(404).json({ success: false, message: "Motorcycle not found." });
        }

        const dealership = await Dealership.findOne({ _id: dealershipId, isActive: true }).lean();
        if (!dealership) {
            return res.status(404).json({ success: false, message: "Dealership not found or inactive." });
        }
        if (dealership.approved === false) {
            return res.status(400).json({ success: false, message: "This dealership is not verified yet." });
        }
        if (timeSlot) {
            const slots = dealership.timeSlots || [];
            if (slots.length > 0 && !slots.includes(String(timeSlot))) {
                return res.status(400).json({ success: false, message: "Selected time slot is not available at this dealership." });
            }
        }

        let variantName = "";
        let variantDoc = null;
        if (variantId) {
            if (!isValidId(variantId)) {
                return res.status(400).json({ success: false, message: "Invalid variant ID." });
            }
            if (!MotorcycleVariant) {
                return res.status(400).json({ success: false, message: "Variants are not available." });
            }
            variantDoc = await MotorcycleVariant.findOne({ _id: variantId, motorcycle: motorcycleId }).lean();
            if (!variantDoc) {
                return res.status(404).json({ success: false, message: "Variant not found." });
            }
            variantName = variantDoc.variantName;
        }

        const enquiryId = `ENQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const duplicate = await BikeEnquiry.findOne({
            user: req.user._id,
            motorcycle: motorcycleId,
            dealership: dealershipId,
            enquiryType,
            visitDate: new Date(visitDate),
            timeSlot: String(timeSlot || "").trim(),
            status: { $nin: ["cancelled", "rejected", "completed"] },
        }).select("_id").lean();
        if (duplicate) {
            return res.status(409).json({ success: false, message: "You already have an active booking for this slot." });
        }

        const enquiry = await BikeEnquiry.create({
            user: req.user._id,
            motorcycle: motorcycleId,
            variant: variantDoc ? variantDoc._id : null,
            variantName,
            color: String(color || "").trim(),
            colorHex: String(colorHex || "").trim(),
            enquiryType,
            dealership: dealershipId,
            visitDate: new Date(visitDate),
            timeSlot: String(timeSlot || "").trim(),
            contactName: String(contactName).trim(),
            contactPhone: String(contactPhone).trim(),
            contactEmail: String(contactEmail || "").trim(),
            licenceConfirmed: enquiryType === "test_ride" ? true : licenceConfirmed === true,
            notes: String(notes || "").trim(),
            status: "pending",
            enquiryId,
        });

        const populated = await BikeEnquiry.findById(enquiry._id)
            .populate({ path: "user", select: "name email phone" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "dealership", select: "name brand city address phone openingHours brands googleMapsUrl timeSlots stockStatus" })
            .lean();

        await createNotification(
            req.user._id,
            "enquiry",
            "Enquiry Submitted",
            `Your ${enquiryType === "test_ride" ? "test ride" : "purchase"} enquiry ${enquiryId} has been submitted.`
        );

        // Transactional emails AFTER persistence; failures never undo the booking
        const mailResults =
            enquiryType === "test_ride"
                ? await Promise.all([
                      sendTestRideBookingEmail(populated, populated.dealership),
                      sendTestRideDealerEmail(populated, populated.dealership),
                  ])
                : await Promise.all([
                      sendPurchaseConfirmationEmail(populated, populated.dealership),
                      sendDealershipPurchaseNotificationEmail(populated, populated.dealership),
                  ]);
        const emailStatus = summarizeEmailStatus(mailResults);
        await BikeEnquiry.findByIdAndUpdate(enquiry._id, { $set: { emailStatus } });
        populated.emailStatus = emailStatus;

        res.status(201).json({
            success: true,
            message: "Enquiry submitted successfully.",
            enquiry: shapeEnquiry(populated),
        });
    } catch (error) {
        console.error("Create enquiry error:", error.message);
        res.status(500).json({ success: false, message: "Could not submit enquiry." });
    }
};

const getMyEnquiries = async (req, res) => {
    try {
        const enquiries = await BikeEnquiry.find({ user: req.user._id })
            .populate({ path: "user", select: "name email phone" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "dealership", select: "name brand city address phone openingHours brands googleMapsUrl timeSlots stockStatus" })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: enquiries.length,
            enquiries: enquiries.map(shapeEnquiry),
        });
    } catch (error) {
        console.error("Get my enquiries error:", error.message);
        res.status(500).json({ success: false, message: "Could not load enquiries." });
    }
};

const cancelEnquiry = async (req, res) => {
    try {
        const { enquiryId } = req.params;
        if (!isValidId(enquiryId)) {
            return res.status(400).json({ success: false, message: "Invalid enquiry ID." });
        }

        const enquiry = await BikeEnquiry.findOne({ _id: enquiryId, user: req.user._id });
        if (!enquiry) {
            return res.status(404).json({ success: false, message: "Enquiry not found." });
        }
        if (enquiry.status === "completed" || enquiry.status === "rejected") {
            return res.status(400).json({ success: false, message: "Cannot cancel this enquiry." });
        }

        enquiry.status = "cancelled";
        await enquiry.save();

        await createNotification(
            req.user._id,
            "enquiry",
            "Enquiry Cancelled",
            `Your enquiry ${enquiry.enquiryId} has been cancelled.`
        );

        res.status(200).json({ success: true, message: "Enquiry cancelled." });
    } catch (error) {
        console.error("Cancel enquiry error:", error.message);
        res.status(500).json({ success: false, message: "Could not cancel enquiry." });
    }
};

const getAllEnquiries = async (req, res) => {
    try {
        const { status, enquiryType, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (enquiryType) filter.enquiryType = enquiryType;

        const skip = (Number(page) - 1) * Number(limit);
        const [enquiries, total] = await Promise.all([
            BikeEnquiry.find(filter)
                .populate({ path: "user", select: "name email phone" })
                .populate({ path: "motorcycle", select: "name brand image images" })
                    .populate({ path: "dealership", select: "name brand city address phone openingHours brands googleMapsUrl timeSlots stockStatus" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            BikeEnquiry.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: enquiries.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            enquiries: enquiries.map(shapeEnquiry),
        });
    } catch (error) {
        console.error("Get all enquiries error:", error.message);
        res.status(500).json({ success: false, message: "Could not load enquiries." });
    }
};

const updateEnquiryStatus = async (req, res) => {
    try {
        const { enquiryId } = req.params;
        const { status, adminNotes } = req.body;

        if (!isValidId(enquiryId)) {
            return res.status(400).json({ success: false, message: "Invalid enquiry ID." });
        }
        const validStatuses = ["pending", "submitted", "contacted", "scheduled", "confirmed", "completed", "cancelled", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status." });
        }

        const enquiry = await BikeEnquiry.findById(enquiryId);
        if (!enquiry) {
            return res.status(404).json({ success: false, message: "Enquiry not found." });
        }

        if (status === "confirmed") {
            if (enquiry.enquiryType === "test_ride" && !enquiry.licenceConfirmed) {
                return res.status(400).json({ success: false, message: "Cannot confirm a test ride without licence confirmation." });
            }
            const overlap = await BikeEnquiry.findOne({
                _id: { $ne: enquiry._id },
                dealership: enquiry.dealership,
                visitDate: enquiry.visitDate,
                timeSlot: enquiry.timeSlot,
                status: "confirmed",
            }).select("_id").lean();
            if (overlap) {
                return res.status(409).json({ success: false, message: "This slot already has a confirmed booking." });
            }
            enquiry.confirmedAt = new Date();
        }

        enquiry.status = status;
        if (adminNotes !== undefined) enquiry.adminNotes = String(adminNotes).trim();
        enquiry.updatedBy = req.user._id;
        await enquiry.save();

        await createNotification(
            enquiry.user,
            "enquiry",
            "Enquiry Updated",
            `Your enquiry ${enquiry.enquiryId} status has been updated to "${status}".`
        );

        const populated = await BikeEnquiry.findById(enquiry._id)
            .populate({ path: "user", select: "name email phone" })
            .populate({ path: "motorcycle", select: "name brand image images" })
            .populate({ path: "dealership", select: "name brand city address phone openingHours brands googleMapsUrl timeSlots stockStatus" })
            .lean();

        // Status-change emails: approved/confirmed wording only after the
        // dealership actually confirms; never on frontend claims alone.
        const statusMails =
            populated.enquiryType === "test_ride"
                ? [sendTestRideStatusUpdateEmail(populated, populated.dealership)]
                : status === "completed" || status === "confirmed"
                  ? [sendPurchaseConfirmationEmail(populated, populated.dealership)]
                  : [sendTestRideStatusUpdateEmail(populated, populated.dealership)];
        const mailResults = await Promise.all(statusMails);
        const emailStatus = summarizeEmailStatus(mailResults);
        await BikeEnquiry.findByIdAndUpdate(enquiry._id, { $set: { emailStatus } });
        populated.emailStatus = emailStatus;

        res.status(200).json({
            success: true,
            message: "Enquiry updated.",
            enquiry: shapeEnquiry(populated),
        });
    } catch (error) {
        console.error("Update enquiry error:", error.message);
        res.status(500).json({ success: false, message: "Could not update enquiry." });
    }
};

const getEnquiryStats = async (req, res) => {
    try {
        const [total, pending, confirmed, testRides, purchases, completed] = await Promise.all([
            BikeEnquiry.countDocuments(),
            BikeEnquiry.countDocuments({ status: { $in: ["pending", "submitted"] } }),
            BikeEnquiry.countDocuments({ status: "confirmed" }),
            BikeEnquiry.countDocuments({ enquiryType: "test_ride" }),
            BikeEnquiry.countDocuments({ enquiryType: "purchase" }),
            BikeEnquiry.countDocuments({ status: "completed" }),
        ]);

        res.status(200).json({
            success: true,
            stats: { total, pending, submitted: pending, confirmed, testRides, purchases, completed },
        });
    } catch (error) {
        console.error("Get enquiry stats error:", error.message);
        res.status(500).json({ success: false, message: "Could not load stats." });
    }
};

module.exports = {
    createEnquiry,
    getMyEnquiries,
    cancelEnquiry,
    getAllEnquiries,
    updateEnquiryStatus,
    getEnquiryStats,
};
