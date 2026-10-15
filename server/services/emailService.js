/**
 * Email service — Nodemailer + Gmail SMTP.
 *
 * Every helper keeps the same signature and return contract
 * ({ sent, reason, duplicate }) so all existing callers (enquiries,
 * contact, registration, sales, admin retry) work unchanged.
 * Nothing throws; failures are logged safely without secrets.
 */

const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");

const smtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER || "";
const smtpPass = () => process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

const isConfigured = () => !!(smtpUser() && smtpPass());

const senderAddress = () =>
    process.env.EMAIL_FROM || `MOTOAI <${smtpUser() || "noreply@motoai.app"}>`;

let transporter = null;
const getTransporter = () => {
    if (!isConfigured()) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: smtpUser(),
                pass: smtpPass(),
            },
        });
    }
    return transporter;
};

const resetTransporter = () => {
    transporter = null;
};

const sendEmail = async ({ to, subject, html, text }) => {
    if (!isConfigured()) {
        console.warn("Email skipped: SMTP_USER/SMTP_PASS not configured.");
        return { sent: false, reason: "not_configured" };
    }
    if (!to || !subject) {
        console.warn("Email skipped: missing recipient or subject.");
        return { sent: false, reason: "invalid_args" };
    }
    try {
        const info = await getTransporter().sendMail({
            from: senderAddress(),
            to: Array.isArray(to) ? to.join(",") : to,
            subject,
            text: text || undefined,
            html,
        });
        return { sent: true, id: info.messageId || null };
    } catch (error) {
        console.error("Email send failed:", error.code || error.message);
        return { sent: false, reason: "smtp_error" };
    }
};

/**
 * Idempotent send: if this exact event was already sent, skip as duplicate.
 * Otherwise send, persist the attempt (payload included for safe retry),
 * and never throw.
 */
const sendIdempotentEmail = async ({ key, to, subject, html, text, entity, entityId, event }) => {
    try {
        const done = await EmailLog.findOne({ idempotencyKey: key, status: "sent" }).select("_id").lean();
        if (done) {
            return { sent: true, duplicate: true, id: null };
        }
        const result = await sendEmail({ to, subject, html, text });
        await EmailLog.findOneAndUpdate(
            { idempotencyKey: key },
            {
                $set: {
                    to: Array.isArray(to) ? to.join(",") : String(to),
                    subject,
                    html: html || "",
                    text: text || "",
                    entity: entity || "",
                    entityId: entityId || null,
                    event: event || "",
                    status: result.sent ? "sent" : result.reason === "not_configured" ? "skipped" : "failed",
                    providerId: result.id || "",
                    reason: result.reason || "",
                },
                $inc: { attempts: 1 },
            },
            { upsert: true, setDefaultsOnInsert: true }
        );
        return { ...result, duplicate: false };
    } catch (error) {
        console.error("Idempotent email error:", error.message);
        return { sent: false, reason: "log_error", duplicate: false };
    }
};

/**
 * Retry a failed/skipped logged email. Only re-sends when the last known
 * state was NOT sent (the idempotency check inside guarantees no dupes).
 */
const retryEmailLog = async (logId) => {
    const log = await EmailLog.findById(logId);
    if (!log) return { sent: false, reason: "not_found" };
    if (log.status === "sent") return { sent: true, duplicate: true };
    return sendIdempotentEmail({
        key: log.idempotencyKey,
        to: log.to,
        subject: log.subject,
        html: log.html,
        text: log.text,
        entity: log.entity,
        entityId: log.entityId,
        event: log.event,
    });
};

const { esc, layout, textLayout, siteUrl, inr, fmtDate } = require("./emailTemplates");

const enquiryRefs = (enquiry, dealership) => ({
    ref: enquiry.enquiryId,
    name: enquiry.contactName || "rider",
    bike: `${enquiry.motorcycle?.brand || ""} ${enquiry.motorcycle?.name || "motorcycle"}`.trim(),
    color: enquiry.color || "",
    dealer: dealership?.name || "the dealership",
    dealerAddr: dealership?.address || "",
    dealerPhone: dealership?.phone || "",
    when: `${enquiry.visitDate ? new Date(enquiry.visitDate).toDateString() : "—"}${enquiry.timeSlot ? ` at ${enquiry.timeSlot}` : ""}`,
});

// --- Template functions (all fail-safe, all idempotent) ---

const sendWelcomeEmail = (user) => {
    const data = {
        heading: "Welcome to MOTOAI!",
        greeting: user.name || "rider",
        intro: "Your account is ready. Discover motorcycles, compare models, book test rides, and chat with our AI advisor.",
        rows: [{ label: "Account email", value: user.email }],
        cta: { label: "Browse Motorcycles", url: `${siteUrl()}/motorcycles` },
    };
    return sendIdempotentEmail({
        key: `user:${user._id}:welcome`,
        to: user.email,
        subject: "Welcome to MOTOAI!",
        html: layout(data),
        text: textLayout(data),
        entity: "User",
        entityId: user._id,
        event: "welcome",
    });
};

const sendTestRideBookingEmail = (enquiry, dealership) => {
    const r = enquiryRefs(enquiry, dealership);
    const data = {
        heading: "Your Test Ride Booking",
        greeting: r.name,
        intro: `We received your test ride booking for the <strong>${esc(r.bike)}</strong>${r.color ? ` in <strong>${esc(r.color)}</strong>` : ""}.`,
        rows: [
            { label: "Reference", value: r.ref },
            { label: "Motorcycle", value: `${r.bike}${r.color ? ` (${r.color})` : ""}` },
            { label: "Dealership", value: r.dealer },
            { label: "Address", value: r.dealerAddr },
            { label: "Requested", value: r.when },
            { label: "Status", value: "Pending approval" },
        ],
        cta: { label: "View My Booking", url: `${siteUrl()}/user/enquiries` },
        note: "Your booking is <strong>not confirmed</strong> until the dealership approves it. Please bring your valid driving licence.",
    };
    return sendIdempotentEmail({
        key: `enquiry:${enquiry._id}:customer-received`,
        to: enquiry.contactEmail || enquiry.user?.email,
        subject: `Your Test Ride Booking – MOTOAI (${r.ref})`,
        html: layout(data),
        text: textLayout(data),
        entity: "BikeEnquiry",
        entityId: enquiry._id,
        event: "customer-received",
    });
};

const STATUS_COPY = {
    confirmed: "approved and confirmed",
    scheduled: "scheduled",
    contacted: "being reviewed",
    completed: "completed",
    cancelled: "cancelled",
    rejected: "not approved",
};

const sendTestRideStatusUpdateEmail = (enquiry, dealership) => {
    const r = enquiryRefs(enquiry, dealership);
    const wording = STATUS_COPY[enquiry.status] || enquiry.status;
    const data = {
        heading: `Test Ride ${wording.charAt(0).toUpperCase() + wording.slice(1)}`,
        greeting: r.name,
        intro: `Your test ride booking <strong>${esc(r.ref)}</strong> is now <strong>${esc(wording)}</strong>.`,
        rows: [
            { label: "Reference", value: r.ref },
            { label: "Requested", value: r.when },
            { label: "Dealership", value: `${r.dealer}, ${r.dealerAddr}` },
            { label: "Phone", value: r.dealerPhone },
            { label: "Status", value: wording },
        ],
        cta: { label: "View My Booking", url: `${siteUrl()}/user/enquiries` },
        note: enquiry.status === "confirmed" ? "Please bring your valid driving licence." : "",
    };
    return sendIdempotentEmail({
        key: `enquiry:${enquiry._id}:status:${enquiry.status}`,
        to: enquiry.contactEmail || enquiry.user?.email,
        subject: `Test Ride Update: ${wording} – MOTOAI (${r.ref})`,
        html: layout(data),
        text: textLayout(data),
        entity: "BikeEnquiry",
        entityId: enquiry._id,
        event: `status-${enquiry.status}`,
    });
};

const sendPurchaseConfirmationEmail = (enquiry, dealership) => {
    const r = enquiryRefs(enquiry, dealership);
    const confirmed = enquiry.status === "completed" || enquiry.status === "confirmed";
    const subject = confirmed
        ? `Your Motorcycle Purchase is Confirmed – MOTOAI (${r.ref})`
        : `Your Dealership Purchase Request – MOTOAI (${r.ref})`;
    const data = {
        heading: confirmed ? "Purchase Confirmed" : "Purchase Request Received",
        greeting: r.name,
        intro: confirmed
            ? `Your motorcycle purchase of the <strong>${esc(r.bike)}</strong>${r.color ? ` in <strong>${esc(r.color)}</strong>` : ""} is <strong>confirmed</strong>.`
            : `We received your dealership purchase request for the <strong>${esc(r.bike)}</strong>${r.color ? ` in <strong>${esc(r.color)}</strong>` : ""}.`,
        rows: [
            { label: "Reference", value: r.ref },
            { label: "Motorcycle", value: `${r.bike}${r.color ? ` (${r.color})` : ""}` },
            { label: "Dealership", value: `${r.dealer}, ${r.dealerAddr}` },
            { label: "Phone", value: r.dealerPhone },
            { label: "Payment", value: confirmed ? "Confirmed" : "Pending — payable at the showroom" },
        ],
        cta: { label: "View My Enquiries", url: `${siteUrl()}/user/enquiries` },
        note: confirmed ? "" : "Do not treat this as a paid confirmation.",
    };
    return sendIdempotentEmail({
        key: `enquiry:${enquiry._id}:purchase-${confirmed ? "confirmed" : "pending"}`,
        to: enquiry.contactEmail || enquiry.user?.email,
        subject,
        html: layout(data),
        text: textLayout(data),
        entity: "BikeEnquiry",
        entityId: enquiry._id,
        event: confirmed ? "purchase-confirmed" : "purchase-pending",
    });
};

const sendTestRideDealerEmail = (enquiry, dealership) => {
    if (!dealership?.email) return { sent: false, reason: "no_recipient", duplicate: false };
    const r = enquiryRefs(enquiry, dealership);
    const data = {
        heading: "New Test Ride Booking",
        greeting: "Team",
        intro: `A customer booked a test ride at <strong>${esc(r.dealer)}</strong>.`,
        rows: [
            { label: "Reference", value: r.ref },
            { label: "Customer", value: `${enquiry.contactName} (${enquiry.contactPhone}${enquiry.contactEmail ? `, ${enquiry.contactEmail}` : ""})` },
            { label: "Bike", value: `${r.bike}${r.color ? ` (${r.color})` : ""}` },
            { label: "Requested", value: r.when },
            { label: "Licence", value: enquiry.licenceConfirmed ? "Confirmed" : "Not confirmed" },
            { label: "Message", value: enquiry.notes || "—" },
            { label: "Status", value: enquiry.status },
        ],
        cta: { label: "Open Dealership Dashboard", url: `${siteUrl()}/provider` },
    };
    return sendIdempotentEmail({
        key: `enquiry:${enquiry._id}:dealer-testride`,
        to: dealership.email,
        subject: `New Test Ride Booking ${r.ref} – MOTOAI`,
        html: layout(data),
        text: textLayout(data),
        entity: "BikeEnquiry",
        entityId: enquiry._id,
        event: "dealer-testride",
    });
};

const sendDealershipPurchaseNotificationEmail = (enquiry, dealership) => {
    if (!dealership?.email) return { sent: false, reason: "no_recipient", duplicate: false };
    const r = enquiryRefs(enquiry, dealership);
    const data = {
        heading: "New Purchase Request",
        greeting: "Team",
        intro: `A customer requested a dealership purchase at <strong>${esc(r.dealer)}</strong>.`,
        rows: [
            { label: "Reference", value: r.ref },
            { label: "Customer", value: `${enquiry.contactName} (${enquiry.contactPhone}${enquiry.contactEmail ? `, ${enquiry.contactEmail}` : ""})` },
            { label: "Bike", value: `${r.bike}${r.color ? ` (${r.color})` : ""}` },
            { label: "Requested", value: r.when },
            { label: "Payment", value: "Pending — payable at the showroom" },
            { label: "Status", value: enquiry.status },
            { label: "Message", value: enquiry.notes || "—" },
        ],
        cta: { label: "Open Dealership Dashboard", url: `${siteUrl()}/provider` },
    };
    return sendIdempotentEmail({
        key: `enquiry:${enquiry._id}:dealer-new`,
        to: dealership.email,
        subject: `New Purchase Request ${r.ref} – MOTOAI`,
        html: layout(data),
        text: textLayout(data),
        entity: "BikeEnquiry",
        entityId: enquiry._id,
        event: "dealer-new",
    });
};

const sendSupportNotificationEmail = (enquiry, dealership, error) => {
    const supportEmail = process.env.SUPPORT_EMAIL || "";
    if (!supportEmail) return { sent: false, reason: "no_recipient", duplicate: false };
    const r = enquiryRefs(enquiry, dealership);
    const data = {
        heading: `Customer Enquiry ${enquiry.status}`,
        greeting: "Support team",
        intro: `Enquiry <strong>${esc(r.ref)}</strong> needs attention.`,
        rows: [
            { label: "Reference", value: r.ref },
            { label: "Customer", value: `${enquiry.contactName} (${enquiry.contactPhone})` },
            { label: "Bike", value: r.bike },
            { label: "Dealership", value: r.dealer },
            { label: "Status", value: enquiry.status },
            ...(error ? [{ label: "Note", value: error }] : []),
        ],
        cta: { label: "Open Admin Panel", url: `${siteUrl()}/admin` },
    };
    return sendIdempotentEmail({
        key: `enquiry:${enquiry._id}:support-${enquiry.status}`,
        to: supportEmail,
        subject: `Enquiry ${r.ref} — ${enquiry.status}`,
        html: layout(data),
        text: textLayout(data),
        entity: "BikeEnquiry",
        entityId: enquiry._id,
        event: `support-${enquiry.status}`,
    });
};

const enquiryStatusEmail = (enquiry, dealership) =>
    sendTestRideStatusUpdateEmail(enquiry, dealership);

const saleVerifiedEmail = (sale, email) => {
    const data = {
        heading: "Payment Received",
        greeting: sale.customerName || "rider",
        intro: `Your payment for invoice <strong>${esc(sale.invoiceNo)}</strong> has been verified by the dealership.`,
        rows: [
            { label: "Invoice", value: sale.invoiceNo },
            { label: "Amount", value: inr(sale.amount) },
            { label: "Method", value: sale.paymentMethod },
            { label: "Motorcycle", value: sale.motorcycleName || "—" },
            { label: "Delivery", value: sale.deliveryStatus || "pending" },
        ],
        cta: { label: "View My Enquiries", url: `${siteUrl()}/user/enquiries` },
    };
    return sendIdempotentEmail({
        key: `sale:${sale._id}:verified`,
        to: email,
        subject: `Payment received — invoice ${sale.invoiceNo}`,
        html: layout(data),
        text: textLayout(data),
        entity: "Sale",
        entityId: sale._id,
        event: "sale-verified",
    });
};

const contactConfirmationEmail = (msg, frontendUrl) => {
    const ref = msg.referenceNumber;
    const summary = msg.message.length > 200 ? `${msg.message.slice(0, 200)}…` : msg.message;
    const data = {
        heading: "We've Received Your Message",
        greeting: msg.name,
        intro: `Thanks for reaching out — your enquiry is with our team.`,
        rows: [
            { label: "Reference", value: ref },
            { label: "Category", value: msg.category },
            { label: "Subject", value: msg.subject },
            { label: "Summary", value: summary },
        ],
        cta: { label: "Contact Us", url: `${frontendUrl || siteUrl()}/contact` },
    };
    return sendIdempotentEmail({
        key: `contact:${msg._id}:confirmation`,
        to: msg.email,
        subject: "We've Received Your Message – MOTOAI",
        html: layout(data),
        text: textLayout(data),
        entity: "ContactMessage",
        entityId: msg._id,
        event: "confirmation",
    });
};

const contactSupportEmail = (msg, supportEmail, adminUrl) => {
    const data = {
        heading: "New Contact Enquiry",
        greeting: "Support team",
        intro: `A new enquiry needs a response.`,
        rows: [
            { label: "Reference", value: msg.referenceNumber },
            { label: "Name", value: msg.name },
            { label: "Email", value: msg.email },
            { label: "Phone", value: msg.phone || "—" },
            { label: "Category", value: msg.category },
            { label: "Subject", value: msg.subject },
            { label: "Message", value: msg.message },
            { label: "Submitted", value: fmtDate(msg.createdAt) },
        ],
        cta: adminUrl ? { label: "Open in Admin Panel", url: adminUrl } : null,
    };
    return sendIdempotentEmail({
        key: `contact:${msg._id}:support`,
        to: supportEmail,
        subject: `New Contact Enquiry – ${msg.referenceNumber}`,
        html: layout(data),
        text: textLayout(data),
        entity: "ContactMessage",
        entityId: msg._id,
        event: "support",
    });
};

module.exports = {
    isConfigured,
    resetTransporter,
    sendEmail,
    sendIdempotentEmail,
    retryEmailLog: async (logId) => {
        const EmailLog = require("../models/EmailLog");
        const log = await EmailLog.findById(logId);
        if (!log) return { sent: false, reason: "not_found" };
        if (log.status === "sent") return { sent: true, duplicate: true };
        return sendIdempotentEmail({
            key: log.idempotencyKey,
            to: log.to,
            subject: log.subject,
            html: log.html,
            text: log.text,
            entity: log.entity,
            entityId: log.entityId,
            event: log.event,
        });
    },
    esc,
    enquiryStatusEmail,
    saleVerifiedEmail,
    contactConfirmationEmail,
    contactSupportEmail,
    sendWelcomeEmail,
    sendTestRideBookingEmail,
    sendTestRideStatusUpdateEmail,
    sendPurchaseConfirmationEmail,
    sendTestRideDealerEmail,
    sendDealershipPurchaseNotificationEmail,
    sendSupportNotificationEmail,
};
