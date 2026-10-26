const Notification = require("../models/Notification");
const User = require("../models/User");
const Dealership = require("../models/Dealership");
const { sendIdempotentEmail, layout, textLayout, siteUrl, inr } = require("./emailService");

/*
  REFERRAL / COMMISSION NOTIFICATIONS
  ===================================
  Every notification is fired AFTER the database change succeeded and
  is wrapped so that a delivery failure can never roll back or delete a
  saved referral, sale or commission.

  In-app notifications go to the Notification collection; e-mails use
  the existing idempotent sender (a retried request never sends twice).
*/

const pushNotification = async ({ user, type, title, message }) => {
    try {
        if (!user) return;
        await Notification.create({ user, type, title, message });
    } catch (error) {
        console.error("Notification write failed:", error.message);
    }
};

/** Users who should see dealership-side notifications. */
const dealershipRecipients = async (dealership) => {
    if (!dealership) return [];
    try {
        const ids = new Set();
        if (dealership.owner) ids.add(String(dealership.owner));
        (dealership.staff || []).forEach((s) => s?.user && ids.add(String(s.user)));
        if (ids.size === 0) return [];
        return await User.find({ _id: { $in: [...ids] } }).select("_id email name").lean();
    } catch (error) {
        console.error("Dealership recipient lookup failed:", error.message);
        return [];
    }
};

const adminRecipients = async () => {
    try {
        return await User.find({ role: "admin" }).select("_id email name").lean();
    } catch (error) {
        console.error("Admin recipient lookup failed:", error.message);
        return [];
    }
};

const emailDealership = async ({
    idempotencyKey,
    dealershipId,
    entityId,
    event,
    subject,
    heading,
    greeting,
    intro,
    rows,
    cta,
    note,
}) => {
    const recipients = await dealershipRecipients(
        await Dealership.findById(dealershipId).lean()
    );
    if (recipients.length === 0) return;
    const to = recipients.map((r) => r.email).filter(Boolean);
    if (to.length === 0) return;
    await sendIdempotentEmail({
        key: idempotencyKey,
        to,
        subject,
        html: layout({ heading, greeting, intro, rows, cta, note }),
        text: textLayout({ heading, greeting, intro, rows, cta, note }),
        entity: "Referral",
        entityId,
        event,
    });
};

/** New referral handed to a dealership. */
const notifyNewReferral = async ({ referral, dealership, motorcycle }) => {
    try {
        const recipients = await dealershipRecipients(dealership);
        const title = `New referral · ${motorcycle?.brand || ""} ${motorcycle?.name || "motorcycle"}`.trim();
        for (const recipient of recipients) {
            await pushNotification({
                user: recipient._id,
                type: "referral",
                title,
                message: `Referral ${referral.referralCode} was created for ${dealership?.name || "your showroom"}.`,
            });
        }

        const rows = [
            { label: "Referral ID", value: referral.referralCode },
            { label: "Motorcycle", value: `${motorcycle?.brand || ""} ${motorcycle?.name || ""}`.trim() },
            { label: "Source", value: referral.source },
            { label: "Valid until", value: new Date(referral.expiresAt).toLocaleDateString("en-IN") },
        ];
        if (referral.consentToShare && referral.contact?.phone) {
            rows.push({ label: "Customer", value: referral.contact.name || "Customer" });
            rows.push({ label: "Phone", value: referral.contact.phone });
        }

        await emailDealership({
            idempotencyKey: `referral.created:${referral._id}`,
            dealershipId: dealership?._id,
            entityId: referral._id,
            event: "referral.created",
            subject: `New MOTOAI referral ${referral.referralCode}`,
            heading: "New referral received",
            greeting: dealership?.name || "team",
            intro: "A customer selected one of your motorcycles through MOTOAI.",
            rows,
            cta: { label: "Open referral", url: `${siteUrl()}/provider` },
            note: "Please contact the customer within the attribution window.",
        });
    } catch (error) {
        console.error("Referral notification failed:", error.message);
    }
};

/** Customer-facing status update. */
const notifyReferralStatus = async ({ referral, dealership }) => {
    try {
        if (!referral.customer) return;
        await pushNotification({
            user: referral.customer,
            type: "referral",
            title: `Referral ${referral.referralCode} · ${referral.status.replace(/_/g, " ")}`,
            message: `Your enquiry with ${dealership?.name || "the dealership"} is now ${referral.status.replace(/_/g, " ")}.`,
        });
    } catch (error) {
        console.error("Referral status notification failed:", error.message);
    }
};

/** Dealership submitted a sale for verification. */
const notifySaleSubmitted = async ({ sale, dealership, referral }) => {
    try {
        const admins = await adminRecipients();
        const title = `Sale awaiting verification · ${sale.invoiceNo}`;
        for (const admin of admins) {
            await pushNotification({
                user: admin._id,
                type: "commission",
                title,
                message: `${dealership?.name || "A dealership"} submitted a sale of ${inr(sale.amount)} for verification.`,
            });
        }
    } catch (error) {
        console.error("Sale submission notification failed:", error.message);
    }
};

/** Admin approved or rejected a sale / commission. */
const notifySaleDecision = async ({ sale, dealership, approved, reason = "" }) => {
    try {
        const admins = await adminRecipients();
        const title = approved
            ? `Commission approved · ${sale.invoiceNo}`
            : `Commission rejected · ${sale.invoiceNo}`;
        for (const admin of admins) {
            await pushNotification({
                user: admin._id,
                type: "commission",
                title,
                message: approved
                    ? `The sale of ${inr(sale.amount)} from ${dealership?.name || "a dealership"} was verified.`
                    : `The sale of ${inr(sale.amount)} from ${dealership?.name || "a dealership"} was rejected. ${reason}`.trim(),
            });
        }
    } catch (error) {
        console.error("Sale decision notification failed:", error.message);
    }
};

/** Payout recorded. */
const notifyPayoutRecorded = async ({ commission, payout, dealership }) => {
    try {
        const admins = await adminRecipients();
        for (const admin of admins) {
            await pushNotification({
                user: admin._id,
                type: "commission",
                title: `Payout recorded · ${inr(payout.amount)}`,
                message: `Commission for ${dealership?.name || "a dealership"} was paid out (ref ${payout.reference}).`,
            });
        }
    } catch (error) {
        console.error("Payout notification failed:", error.message);
    }
};

module.exports = {
    pushNotification,
    notifyNewReferral,
    notifyReferralStatus,
    notifySaleSubmitted,
    notifySaleDecision,
    notifyPayoutRecorded,
};
