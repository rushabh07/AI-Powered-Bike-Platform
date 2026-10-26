const crypto = require("crypto");
const mongoose = require("mongoose");
const Referral = require("../models/Referral");

/*
  REFERRAL SERVICE
  ================
  Owns referral creation rules, duplicate prevention, attribution
  windows and the allowed status transitions.

  A referral is the only thing that can attribute a dealership sale to
  MOTOAI — without one, a sale is a normal walk-in sale and never
  earns commission.
*/

const ATTRIBUTION_DAYS = () => {
    const configured = Number(process.env.REFERRAL_ATTRIBUTION_DAYS);
    return Number.isFinite(configured) && configured > 0 ? configured : 30;
};

/** Allowed status transitions. Terminal states cannot move (except by an admin). */
const TRANSITIONS = {
    new: ["contacted", "visit_scheduled", "negotiation", "converted", "rejected", "expired"],
    contacted: ["visit_scheduled", "negotiation", "converted", "rejected", "expired"],
    visit_scheduled: ["negotiation", "converted", "rejected", "expired"],
    negotiation: ["converted", "rejected", "expired"],
    converted: [],
    rejected: [],
    expired: [],
};

const TERMINAL_STATUSES = ["converted", "rejected", "expired"];

/** Generate a hard-to-guess referral code (crypto backed). */
const generateReferralCode = () => {
    const raw = crypto.randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return `REF-${raw.slice(0, 10)}`;
};

/** Unique key used to block accidental duplicate referrals. */
const buildDedupeKey = ({ customer, motorcycle, dealership }) => {
    if (!customer || !motorcycle || !dealership) return null;
    return `${customer}|${motorcycle}|${dealership}`;
};

/**
 * Create a referral.
 * Repeated clicks for the same customer + motorcycle + dealership return
 * the existing referral instead of creating duplicates. Different
 * motorcycles or dealerships always create a new referral.
 */
const createReferral = async ({
    customer = null,
    motorcycle,
    variant = null,
    variantName = "",
    dealership,
    source = "motorcycle_detail",
    consentToShare = false,
    contact = {},
    notes = "",
    actor = null,
    order = null,
    enquiry = null,
    attributionDays = null,
}) => {
    if (!mongoose.Types.ObjectId.isValid(String(motorcycle || ""))) {
        const err = new Error("Invalid motorcycle.");
        err.status = 400;
        throw err;
    }
    if (!mongoose.Types.ObjectId.isValid(String(dealership || ""))) {
        const err = new Error("Invalid dealership.");
        err.status = 400;
        throw err;
    }

    const days = Number.isFinite(Number(attributionDays)) && Number(attributionDays) > 0
        ? Number(attributionDays)
        : ATTRIBUTION_DAYS();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Duplicate guard — an active referral for the same trio is reused.
    const duplicateFilter = {
        motorcycle,
        dealership,
        status: { $nin: TERMINAL_STATUSES },
        expiresAt: { $gt: now },
    };
    if (customer) {
        duplicateFilter.customer = customer;
    } else if (contact?.phone) {
        duplicateFilter["contact.phone"] = contact.phone;
    }

    const existing = await Referral.findOne(duplicateFilter).sort({ createdAt: -1 });
    if (existing) {
        return { referral: existing, created: false, duplicate: true };
    }

    let referralCode = generateReferralCode();
    // Retry on the (extremely unlikely) code collision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await Referral.exists({ referralCode });
        if (!clash) break;
        referralCode = generateReferralCode();
    }

    const payload = {
        referralCode,
        customer,
        motorcycle,
        variant,
        variantName,
        dealership,
        source,
        status: "new",
        consentToShare: !!consentToShare,
        contact: {
            name: String(contact?.name || "").trim().slice(0, 120),
            phone: String(contact?.phone || "").trim().slice(0, 40),
            email: String(contact?.email || "").trim().toLowerCase().slice(0, 160),
        },
        notes: String(notes || "").trim().slice(0, 2000),
        expiresAt,
        dedupeKey: buildDedupeKey({ customer, motorcycle, dealership }),
        order,
        enquiry,
        createdBy: actor?._id || null,
        updatedBy: actor?._id || null,
        statusHistory: [{ status: "new", at: now, by: actor?._id || null, note: "Referral created" }],
    };

    try {
        const referral = await Referral.create(payload);
        return { referral, created: true, duplicate: false };
    } catch (error) {
        // Unique dedupeKey collision — a parallel request won the race.
        if (error.code === 11000 && payload.dedupeKey) {
            const existing = await Referral.findOne({ dedupeKey: payload.dedupeKey }).sort({ createdAt: -1 });
            if (existing) return { referral: existing, created: false, duplicate: true };
        }
        throw error;
    }
};

/**
 * Validate a status transition.
 * @returns {boolean} true when the transition is allowed
 */
const canTransition = (from, to) => {
    if (from === to) return true;
    const allowed = TRANSITIONS[from] || [];
    return allowed.includes(to);
};

/**
 * Apply a status change with history tracking.
 * Terminal referrals release their dedupe key so the customer can
 * legitimately refer the same bike again later.
 */
const applyStatusChange = async (referral, { status, note = "", actor = null, visitScheduledAt = null, allowTerminalOverride = false }) => {
    if (!allowTerminalOverride && !canTransition(referral.status, status)) {
        const err = new Error(`Cannot change referral status from '${referral.status}' to '${status}'.`);
        err.status = 400;
        throw err;
    }

    referral.status = status;
    referral.updatedBy = actor?._id || null;
    referral.statusHistory = referral.statusHistory || [];
    referral.statusHistory.push({
        status,
        at: new Date(),
        by: actor?._id || null,
        note: String(note || "").trim().slice(0, 500),
    });

    if (visitScheduledAt) {
        referral.visitScheduledAt = new Date(visitScheduledAt);
    }
    if (status === "converted") {
        referral.convertedAt = new Date();
    }
    if (TERMINAL_STATUSES.includes(status)) {
        referral.dedupeKey = null;
    }

    await referral.save();
    return referral;
};

/** Record a contact attempt by the dealership. */
const recordContactAttempt = async (referral, { channel = "call", note = "", actor = null }) => {
    referral.contactAttempts = referral.contactAttempts || [];
    referral.contactAttempts.push({
        at: new Date(),
        by: actor?._id || null,
        channel,
        note: String(note || "").trim().slice(0, 500),
    });
    referral.updatedBy = actor?._id || null;
    await referral.save();
    return referral;
};

/**
 * Shape a referral for the API.
 * Contact details are only included for the dealership that owns the
 * referral (and for admins) — they are never public.
 */
const serializeReferral = (referral, { viewer = "public", includeContact = false } = {}) => {
    const base = {
        _id: referral._id,
        referralCode: referral.referralCode,
        customer: referral.customer,
        motorcycle: referral.motorcycle,
        variant: referral.variant,
        variantName: referral.variantName,
        dealership: referral.dealership,
        source: referral.source,
        status: referral.status,
        consentToShare: referral.consentToShare,
        visitScheduledAt: referral.visitScheduledAt,
        expiresAt: referral.expiresAt,
        createdAt: referral.createdAt,
        updatedAt: referral.updatedAt,
        sale: referral.sale,
        commission: referral.commission,
        order: referral.order,
        enquiry: referral.enquiry,
        disputed: referral.disputed,
        disputeReason: referral.disputeReason,
    };

    if (viewer === "customer") {
        // The customer sees progress only — no internal notes or contacts.
        return { ...base, notes: undefined, statusHistory: undefined, contactAttempts: undefined };
    }

    if (viewer === "provider" || viewer === "admin") {
        return {
            ...base,
            contact: includeContact ? referral.contact : undefined,
            notes: referral.notes,
            statusHistory: referral.statusHistory,
            contactAttempts: referral.contactAttempts,
            dedupeKey: undefined,
        };
    }

    return base;
};

module.exports = {
    ATTRIBUTION_DAYS,
    TRANSITIONS,
    TERMINAL_STATUSES,
    generateReferralCode,
    buildDedupeKey,
    createReferral,
    canTransition,
    applyStatusChange,
    recordContactAttempt,
    serializeReferral,
};
