const mongoose = require("mongoose");

/*
  Referral — a trackable customer lead handed to a participating dealership.

  Created when a customer picks a dealership for a motorcycle through
  MOTOAI (detail page, test ride enquiry, offline order request). The
  referral is the attribution record: only a verified dealership sale
  linked to a referral can ever earn MOTOAI a commission.

  Contact details are stored as a snapshot and are NEVER exposed
  publicly — only the dealership the referral belongs to (and admins)
  may read them.
*/

const REFERRAL_STATUSES = [
    "new",
    "contacted",
    "visit_scheduled",
    "negotiation",
    "converted",
    "rejected",
    "expired",
];

const REFERRAL_SOURCES = [
    "motorcycle_detail",
    "test_ride",
    "purchase_enquiry",
    "offline_order",
    "compare",
    "homepage",
];

const referralSchema = new mongoose.Schema(
    {
        // Public, hard-to-guess identifier used in conversations.
        referralCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            maxlength: 24,
        },

        // Registered customer behind the referral (null for guest leads).
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            required: true,
        },

        variant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MotorcycleVariant",
            default: null,
        },
        variantName: {
            type: String,
            default: "",
            trim: true,
        },

        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },

        source: {
            type: String,
            enum: REFERRAL_SOURCES,
            default: "motorcycle_detail",
        },

        status: {
            type: String,
            enum: REFERRAL_STATUSES,
            default: "new",
        },

        // Customer consent to share contact details with the dealership.
        consentToShare: {
            type: Boolean,
            default: false,
        },

        // Snapshot of the contact details shared with the dealership.
        contact: {
            name: { type: String, default: "", trim: true, maxlength: 120 },
            phone: { type: String, default: "", trim: true, maxlength: 40 },
            email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
        },

        // Dealership follow-up notes.
        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },

        statusHistory: [
            {
                status: { type: String, enum: REFERRAL_STATUSES, required: true },
                at: { type: Date, default: Date.now },
                by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
                note: { type: String, default: "", trim: true, maxlength: 500 },
            },
        ],

        contactAttempts: [
            {
                at: { type: Date, default: Date.now },
                by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
                channel: {
                    type: String,
                    enum: ["call", "whatsapp", "email", "visit", "other"],
                    default: "call",
                },
                note: { type: String, default: "", trim: true, maxlength: 500 },
            },
        ],

        visitScheduledAt: {
            type: Date,
            default: null,
        },

        // Attribution window: referral is only valid until this date.
        expiresAt: {
            type: Date,
            required: true,
        },

        // Unique key used to block accidental duplicate referrals.
        // Cleared once the referral reaches a terminal state.
        dedupeKey: {
            type: String,
            default: null,
        },

        // Related records.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        enquiry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BikeEnquiry",
            default: null,
        },
        sale: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sale",
            default: null,
        },
        commission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Commission",
            default: null,
        },

        // Disputed / duplicate resolution handled by an admin.
        disputed: {
            type: Boolean,
            default: false,
        },
        disputeReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },

        convertedAt: {
            type: Date,
            default: null,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

// Referral codes must be unique and unguessable.
referralSchema.index({ referralCode: 1 }, { unique: true });

// Duplicate guard: only one ACTIVE referral per customer + motorcycle +
// dealership. Sparse unique index — terminal referrals clear dedupeKey.
referralSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

// Reporting / dashboard indexes.
referralSchema.index({ dealership: 1, status: 1, createdAt: -1 });
referralSchema.index({ customer: 1, createdAt: -1 });
referralSchema.index({ motorcycle: 1, createdAt: -1 });
referralSchema.index({ source: 1, createdAt: -1 });
referralSchema.index({ expiresAt: 1 });

referralSchema.statics.STATUSES = REFERRAL_STATUSES;
referralSchema.statics.SOURCES = REFERRAL_SOURCES;

module.exports = mongoose.models.Referral || mongoose.model("Referral", referralSchema);
