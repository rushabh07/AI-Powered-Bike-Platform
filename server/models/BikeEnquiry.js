const mongoose = require("mongoose");

const bikeEnquirySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
        color: {
            type: String,
            default: "",
            trim: true,
        },
        colorHex: {
            type: String,
            default: "",
            trim: true,
        },
        enquiryType: {
            type: String,
            enum: ["test_ride", "purchase"],
            required: true,
        },
        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            required: true,
        },
        visitDate: {
            type: Date,
            required: true,
        },
        contactName: {
            type: String,
            required: true,
            trim: true,
        },
        contactPhone: {
            type: String,
            required: true,
            trim: true,
        },
        contactEmail: {
            type: String,
            default: "",
            trim: true,
        },
        timeSlot: {
            type: String,
            default: "",
            trim: true,
        },
        licenceConfirmed: {
            type: Boolean,
            default: false,
        },
        confirmedAt: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ["pending", "submitted", "contacted", "scheduled", "confirmed", "completed", "cancelled", "rejected"],
            default: "pending",
        },
        enquiryId: {
            type: String,
            required: true,
            unique: true,
        },
        adminNotes: {
            type: String,
            default: "",
            trim: true,
        },
        emailStatus: {
            type: String,
            enum: ["unknown", "sent", "partial", "failed", "skipped"],
            default: "unknown",
        },
        followUpDate: {
            type: Date,
            default: null,
        },
        converted: {
            type: Boolean,
            default: false,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

bikeEnquirySchema.index({ user: 1, createdAt: -1 });
bikeEnquirySchema.index({ status: 1 });
bikeEnquirySchema.index({ dealership: 1, visitDate: 1, timeSlot: 1, status: 1 });

module.exports = mongoose.models.BikeEnquiry || mongoose.model("BikeEnquiry", bikeEnquirySchema);
