const mongoose = require("mongoose");

/*
  CommissionPayout — an immutable record of money moved to MOTOAI
  (or a correction/reversal of such a move).

  A commission can never be marked "paid" without at least one payout
  record, and payouts are never edited: a correction is stored as a
  reversal entry so the financial history stays auditable.
*/

const commissionPayoutSchema = new mongoose.Schema(
    {
        commission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Commission",
            required: true,
        },
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },

        // Integer minor units (paise) — source of truth for the amount.
        amountPaise: {
            type: Number,
            required: true,
            min: 0,
        },
        // Convenience mirror in rupees (never used for arithmetic).
        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        paidAt: {
            type: Date,
            default: Date.now,
        },

        reference: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },

        method: {
            type: String,
            enum: ["bank_transfer", "upi", "cash", "cheque", "adjustment"],
            default: "bank_transfer",
        },

        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },

        // Reversal entries point at the payout they undo.
        isReversal: {
            type: Boolean,
            default: false,
        },
        reversalOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CommissionPayout",
            default: null,
        },

        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Idempotency: the same reference cannot be recorded twice for a commission.
commissionPayoutSchema.index({ commission: 1, reference: 1 }, { unique: true });
// A qualifying sale has one original payout; corrections use reversal entries.
commissionPayoutSchema.index(
    { commission: 1 },
    { unique: true, partialFilterExpression: { isReversal: false } }
);
commissionPayoutSchema.index({ dealership: 1, paidAt: -1 });
commissionPayoutSchema.index({ paidAt: -1 });

module.exports =
    mongoose.models.CommissionPayout ||
    mongoose.model("CommissionPayout", commissionPayoutSchema);
