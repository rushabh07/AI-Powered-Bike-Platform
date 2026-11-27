const mongoose = require("mongoose");
const Dealership = require("../models/Dealership");
const User = require("../models/User");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const resolveValidOwner = async (ownerId) => {
    if (ownerId === undefined) return { skip: true };
    if (ownerId === null || ownerId === "") return { owner: null };
    if (!isValidId(ownerId)) return { error: "Invalid provider/owner ID.", status: 400 };
    const user = await User.findById(ownerId).select("_id role").lean();
    if (!user) return { error: "Selected owner user does not exist.", status: 404 };
    if (!["provider", "admin"].includes(user.role)) {
        return { error: "Dealership owner must be a provider or admin account.", status: 400 };
    }
    return { owner: user._id };
};

const getDealershipsByCity = async (req, res) => {
    try {
        const { city } = req.params;
        if (!city || !String(city).trim()) {
            return res.status(400).json({ success: false, message: "City is required." });
        }
        const dealerships = await Dealership.find({
            city: new RegExp(`^${String(city).trim()}$`, "i"),
            isActive: true,
            approved: { $ne: false },
        }).sort({ name: 1 }).lean();
        res.status(200).json({ success: true, count: dealerships.length, dealerships });
    } catch (error) {
        console.error("Get dealerships error:", error.message);
        res.status(500).json({ success: false, message: "Could not load dealerships." });
    }
};

const getAllDealerships = async (req, res) => {
    try {
        const dealerships = await Dealership.find()
            .populate({ path: "owner", select: "name email phone role" })
            .sort({ city: 1, name: 1 })
            .lean();
        res.status(200).json({ success: true, count: dealerships.length, dealerships });
    } catch (error) {
        console.error("Get all dealerships error:", error.message);
        res.status(500).json({ success: false, message: "Could not load dealerships." });
    }
};

const createDealership = async (req, res) => {
    try {
        const { name, city, address, phone, email, openingHours, brands, googleMapsUrl, timeSlots, stockStatus, approved, isActive, owner } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }
        if (!city || !String(city).trim()) {
            return res.status(400).json({ success: false, message: "City is required." });
        }
        if (!address || !String(address).trim()) {
            return res.status(400).json({ success: false, message: "Address is required." });
        }
        if (!phone || !String(phone).trim()) {
            return res.status(400).json({ success: false, message: "Phone is required." });
        }
        const ownerResolution = await resolveValidOwner(owner);
        if (ownerResolution.error) {
            return res.status(ownerResolution.status).json({ success: false, message: ownerResolution.error });
        }
        const dealership = await Dealership.create({
            name: String(name).trim(),
            city: String(city).trim(),
            address: String(address).trim(),
            phone: String(phone).trim(),
            email: String(email || "").trim().toLowerCase(),
            openingHours: openingHours || "Mon-Sat: 10:00 AM - 8:00 PM",
            brands: Array.isArray(brands) ? brands.map((b) => String(b).trim()).filter(Boolean) : [],
            googleMapsUrl: String(googleMapsUrl || "").trim(),
            timeSlots: Array.isArray(timeSlots) && timeSlots.length > 0 ? timeSlots.map((s) => String(s).trim()).filter(Boolean) : ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"],
            stockStatus: ["in_stock", "limited", "out_of_stock", "unknown"].includes(stockStatus) ? stockStatus : "unknown",
            approved: approved !== false,
            isActive: isActive !== false,
            ...(ownerResolution.skip ? {} : { owner: ownerResolution.owner }),
        });
        res.status(201).json({ success: true, message: "Dealership created.", dealership });
    } catch (error) {
        console.error("Create dealership error:", error.message);
        res.status(500).json({ success: false, message: "Could not create dealership." });
    }
};

const updateDealership = async (req, res) => {
    try {
        const { dealershipId } = req.params;
        if (!isValidId(dealershipId)) {
            return res.status(400).json({ success: false, message: "Invalid dealership ID." });
        }
        const dealership = await Dealership.findById(dealershipId);
        if (!dealership) {
            return res.status(404).json({ success: false, message: "Dealership not found." });
        }
        const ownerResolution = await resolveValidOwner(req.body.owner);
        if (ownerResolution.error) {
            return res.status(ownerResolution.status).json({ success: false, message: ownerResolution.error });
        }
        const allowed = ["name", "city", "address", "phone", "email", "openingHours", "brands", "googleMapsUrl", "timeSlots", "stockStatus", "approved", "isActive"];
        for (const key of allowed) {
            if (req.body[key] !== undefined) dealership[key] = req.body[key];
        }
        if (!ownerResolution.skip) {
            dealership.owner = ownerResolution.owner;
        }
        await dealership.save();
        res.status(200).json({ success: true, message: "Dealership updated.", dealership });
    } catch (error) {
        console.error("Update dealership error:", error.message);
        res.status(500).json({ success: false, message: "Could not update dealership." });
    }
};

const deleteDealership = async (req, res) => {
    try {
        const { dealershipId } = req.params;
        if (!isValidId(dealershipId)) {
            return res.status(400).json({ success: false, message: "Invalid dealership ID." });
        }
        const dealership = await Dealership.findByIdAndDelete(dealershipId);
        if (!dealership) {
            return res.status(404).json({ success: false, message: "Dealership not found." });
        }
        res.status(200).json({ success: true, message: "Dealership deleted." });
    } catch (error) {
        console.error("Delete dealership error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete dealership." });
    }
};

module.exports = {
    getDealershipsByCity,
    getAllDealerships,
    createDealership,
    updateDealership,
    deleteDealership,
};
