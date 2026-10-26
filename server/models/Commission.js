const mongoose = require("mongoose");

/*
  Commission model — one record per verified sale that earns commission.

  Created by the backend when an admin approves a dealership sale that
  is linked to a referral. Providers and admins never write financial
  fields directly: amounts are computed from the policy snapshot taken
  at approval time and stored in integer paise to avoid rounding drift.

  Lifecycle:
    pending_verification -> approved -> payable -> paid
                          -> rejected
                          -> disputed (from approved/payable)
                          -> reversed (from paid)
*/

const COMMISSION_STATUSES = [
    "pending_verification",
    "rejected",
    "approved",
    "payable",
    "paid",
    "disputed",
    "reversed",
];

const commissionSchema = new mongoose.Schema(
    {
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },
        sale: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sale",
            required: true,
        },
        referral: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Referral",
            default: null,
        },

        // Policy that was applied (snapshot keeps history immutable).
        policy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CommissionRule",
            default: null,
        },
        policySnapshot: {
            scope: { type: String, default: "" },
            ruleType: { type: String, default: "" },
            ruleValue: { type: Number, default: 0 },
            brand: { type: String, default: "" },
            category: { type: String, default: "" },
            eligibleAmountBasis: { type: String, default: "" },
            effectiveFrom: { type: Date, default: null },
            effectiveTo: { type: Date, default: null },
            minEligibleAmount: { type: Number, default: 0 },
            maxEligibleAmount: { type: Number, default: 0 },
            maxCommissionAmount: { type: Number, default: 0 },
            payoutDelayDays: { type: Number, default: 0 },
            includesTaxes: { type: Boolean, default: true },
            includesAccessories: { type: Boolean, default: false },
            includesRegistration: { type: Boolean, default: false },
        },

        ruleType: {
            type: String,
            enum: ["fixed", "percentage"],
            default: "fixed",
        },
        ruleValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Calculated amounts — integer paise is the source of truth.
        // They stay 0 until an admin approves the sale.
        saleAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
        },
        commissionAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Rupee mirrors kept for backwards compatibility with existing UI.
        saleAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        commissionAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Lifecycle
        status: {
            type: String,
            enum: COMMISSION_STATUSES,
            default: "pending_verification",
        },

        // Audit: who approved / rejected
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },

        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        paidAt: {
            type: Date,
            default: null,
        },
        payoutAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
        },
        payoutAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        paymentReference: {
            type: String,
            default: "",
            trim: true,
        },
        paymentNotes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },

        // Date from which the commission may be paid out.
        payableFrom: {
            type: Date,
            default: null,
        },

        // Optional rejection
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rejectedAt: {
            type: Date,
            default: null,
        },
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },

        // Dispute / reversal bookkeeping — history is never deleted.
        disputedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        disputedAt: {
            type: Date,
            default: null,
        },
        disputeReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        reversedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        reversedAt: {
            type: Date,
            default: null,
        },
        reversalReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

commissionSchema.index({ dealership: 1, status: 1, createdAt: -1 });
commissionSchema.index({ sale: 1 }, { unique: true });
commissionSchema.index({ status: 1, createdAt: -1 });
commissionSchema.index({ referral: 1 });
commissionSchema.index({ approvedAt: -1 });

commissionSchema.statics.STATUSES = COMMISSION_STATUSES;

module.exports =
    mongoose.models.Commission ||
    mongoose.model("Commission", commissionSchema);
