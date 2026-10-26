const mongoose = require("mongoose");

/*
  Sale — a completed OFFLINE dealership sale.

  A sale is NOT a MOTOAI order and NOT a commission by itself: it only
  earns commission when it is linked to a referral AND an admin approves
  the verification. Walk-in sales can be recorded without any referral.

  Existing fields (customerName, customerPhone, amount, invoiceNo,
  paymentMethod, deliveryStatus, verified) are kept as-is so the current
  dealership panel keeps working.
*/

const saleSchema = new mongoose.Schema(
    {
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },
        enquiry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BikeEnquiry",
            default: null,
        },

        // Attribution links.
        referral: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Referral",
            default: null,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            default: null,
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

        customerName: {
            type: String,
            required: true,
            trim: true,
        },
        customerPhone: {
            type: String,
            required: true,
            trim: true,
        },
        motorcycleName: {
            type: String,
            default: "",
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "card", "bank_transfer"],
            required: true,
        },
        receiptRef: {
            type: String,
            default: "",
            trim: true,
        },
        invoiceNo: {
            type: String,
            required: true,
            unique: true,
        },

        // Date the vehicle was actually sold / invoiced.
        saleDate: {
            type: Date,
            default: null,
        },

        // What "amount" means for commission eligibility.
        saleAmountMeaning: {
            type: String,
            enum: ["ex_showroom", "final_invoice"],
            default: "final_invoice",
        },

        // Amount the commission is calculated on (rupees + integer paise).
        eligibleAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        eligibleAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Invoice evidence (URL to an existing secure file store — never
        // binary data in MongoDB).
        evidenceUrl: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        evidenceName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 200,
        },

        // Commission lifecycle for this sale.
        commissionStatus: {
            type: String,
            enum: [
                "none",
                "pending_verification",
                "approved",
                "payable",
                "paid",
                "rejected",
                "disputed",
                "reversed",
            ],
            default: "none",
        },
        commission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Commission",
            default: null,
        },

        deliveryStatus: {
            type: String,
            enum: ["pending", "ready", "delivered"],
            default: "pending",
        },
        verified: {
            type: Boolean,
            default: false,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        verificationNotes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

saleSchema.index({ dealership: 1, createdAt: -1 });
// One sale per referral — a referral can never earn two commissions.
saleSchema.index({ referral: 1 }, { unique: true, sparse: true });
saleSchema.index({ commissionStatus: 1, createdAt: -1 });
saleSchema.index({ saleDate: -1 });

module.exports = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
