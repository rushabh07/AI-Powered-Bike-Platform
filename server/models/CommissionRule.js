const mongoose = require("mongoose");

/*
  CommissionRule — a commission POLICY owned by an admin.

  A policy says how much MOTOAI earns from a verified dealership sale.
  Policies are scoped (dealership / brand / category / global), may use
  a fixed amount or a percentage, and are only effective inside a date
  window. The rule is snapshotted onto the commission when a sale is
  approved, so later policy edits never rewrite history.

  `policyKey` is a unique, human-readable scope key used to guarantee
  one policy per scope (and for deterministic policy resolution).
*/

const RULE_SCOPES = ["dealership", "brand", "category", "global"];

const commissionRuleSchema = new mongoose.Schema(
    {
        // Unique scope key, e.g. "d:<dealershipId>", "b:Hero", "g:global".
        policyKey: {
            type: String,
            default: undefined,
        },

        scope: {
            type: String,
            enum: RULE_SCOPES,
            default: "dealership",
        },

        // Required for scope "dealership"; ignored for the other scopes.
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            default: null,
        },

        // Optional narrowing for dealership-scoped policies.
        brand: {
            type: String,
            default: "",
            trim: true,
        },
        category: {
            type: String,
            default: "",
            trim: true,
        },

        ruleType: {
            type: String,
            enum: ["fixed", "percentage"],
            default: "percentage",
        },

        // If percentage: 0–100 (e.g. 2.5 = 2.5%). Stored as basis points
        // internally when calculating (2.5% -> 250 bps) to avoid float drift.
        // If fixed: flat rupee amount per verified sale.
        ruleValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Eligibility window on the sale amount (rupees).
        minEligibleAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxEligibleAmount: {
            type: Number,
            default: 0,
            min: 0, // 0 = no upper cap
        },

        // Hard cap on the commission for a single sale (rupees, 0 = none).
        maxCommissionAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Which part of the invoice counts as the eligible sale amount.
        eligibleAmountBasis: {
            type: String,
            enum: ["ex_showroom", "final_invoice"],
            default: "final_invoice",
        },

        // What the eligible amount includes (documented per agreement).
        includesTaxes: {
            type: Boolean,
            default: true,
        },
        includesAccessories: {
            type: Boolean,
            default: false,
        },
        includesRegistration: {
            type: Boolean,
            default: false,
        },

        // Effective window of the policy.
        effectiveFrom: {
            type: Date,
            default: null,
        },
        effectiveTo: {
            type: Date,
            default: null,
        },

        // Days after approval before the commission becomes payable.
        payoutDelayDays: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Minimum amount that can be paid out in one go (rupees).
        minimumPayoutAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        setBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        notes: {
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

// One policy per scope.
commissionRuleSchema.index(
    { policyKey: 1 },
    { unique: true, partialFilterExpression: { policyKey: { $type: "string" } } }
);
commissionRuleSchema.index({ dealership: 1, isActive: 1 });
commissionRuleSchema.index({ brand: 1, isActive: 1 });
commissionRuleSchema.index({ category: 1, isActive: 1 });

commissionRuleSchema.statics.SCOPES = RULE_SCOPES;

module.exports =
    mongoose.models.CommissionRule ||
    mongoose.model("CommissionRule", commissionRuleSchema);
