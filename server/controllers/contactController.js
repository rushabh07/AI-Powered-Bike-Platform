const ContactMessage = require("../models/ContactMessage");
const { contactConfirmationEmail, contactSupportEmail } = require("../services/emailService");

const CATEGORIES = ["general", "sales", "support", "test_ride", "feedback", "other"];

// Simple in-memory rate limiter: 5 submissions/hour per IP
const hits = new Map();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const isRateLimited = (ip) => {
    const now = Date.now();
    const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (arr.length >= RATE_LIMIT) {
        hits.set(ip, arr);
        return true;
    }
    arr.push(now);
    hits.set(ip, arr);
    return false;
};

const sanitize = (v, max) => String(v ?? "").trim().slice(0, max);

const makeReference = () => {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `MOTOAI-${year}-${rand}`;
};

const submitContact = async (req, res) => {
    try {
        if (isRateLimited(req.ip)) {
            return res.status(429).json({ success: false, message: "Too many submissions. Please try again later." });
        }

        const name = sanitize(req.body?.name, 100);
        const email = sanitize(req.body?.email, 150).toLowerCase();
        const phone = sanitize(req.body?.phone, 20);
        const subject = sanitize(req.body?.subject, 200);
        const category = sanitize(req.body?.category, 20).toLowerCase() || "general";
        const message = sanitize(req.body?.message, 2000);
        const consent = req.body?.consent === true;

        if (!name) return res.status(400).json({ success: false, message: "Full name is required." });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "A valid email address is required." });
        }
        if (phone && !/^[+\d][\d\s-]{6,18}$/.test(phone)) {
            return res.status(400).json({ success: false, message: "Enter a valid phone number." });
        }
        if (!subject) return res.status(400).json({ success: false, message: "Subject is required." });
        if (!CATEGORIES.includes(category)) {
            return res.status(400).json({ success: false, message: "Invalid inquiry category." });
        }
        if (!message || message.length < 10) {
            return res.status(400).json({ success: false, message: "Message must be at least 10 characters." });
        }
        if (!consent) {
            return res.status(400).json({ success: false, message: "Please accept the privacy policy." });
        }

        // Duplicate prevention: identical message from same email within 10 min
        const recent = await ContactMessage.findOne({
            email,
            subject,
            message,
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
        }).select("referenceNumber").lean();
        if (recent) {
            return res.status(200).json({
                success: true,
                message: "Your enquiry has been received.",
                referenceNumber: recent.referenceNumber,
                duplicate: true,
            });
        }

        let referenceNumber = makeReference();
        for (let i = 0; i < 3; i++) {
            const clash = await ContactMessage.findOne({ referenceNumber }).select("_id").lean();
            if (!clash) break;
            referenceNumber = makeReference();
        }

        const saved = await ContactMessage.create({
            name, email, phone, subject, category, message, consent, referenceNumber,
            emailStatus: "pending",
        });

        // Emails AFTER persistence; failures never undo the save
        let emailStatus = "skipped";
        let emailSent = false;
        try {
            const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
            const supportEmail = process.env.SUPPORT_EMAIL || "";
            const [customer, support] = await Promise.all([
                contactConfirmationEmail(saved, frontendUrl),
                supportEmail ? contactSupportEmail(saved, supportEmail, frontendUrl ? `${frontendUrl}/admin` : "") : { sent: false, reason: "no_support_email" },
            ]);
            if (customer.sent && support.sent) emailStatus = "sent";
            else if (customer.sent || support.sent) emailStatus = "partial";
            else if (customer.reason === "email_disabled") emailStatus = "skipped";
            else emailStatus = supportEmail ? "failed" : "skipped";
            emailSent = customer.sent;
        } catch (e) {
            console.error("Contact email error:", e.message);
            emailStatus = "failed";
        }
        saved.emailStatus = emailStatus;
        await saved.save().catch(() => {});

        return res.status(201).json({
            success: true,
            message: "Your enquiry has been received.",
            referenceNumber: saved.referenceNumber,
            emailSent,
        });
    } catch (error) {
        console.error("Submit contact error:", error.message);
        return res.status(500).json({ success: false, message: "Could not submit your enquiry. Please try again." });
    }
};

const listContactMessages = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            ContactMessage.find({}).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            ContactMessage.countDocuments(),
        ]);
        res.status(200).json({ success: true, count: items.length, total, page: Number(page), messages: items });
    } catch (error) {
        console.error("List contact messages error:", error.message);
        res.status(500).json({ success: false, message: "Could not load messages." });
    }
};

module.exports = { submitContact, listContactMessages };
