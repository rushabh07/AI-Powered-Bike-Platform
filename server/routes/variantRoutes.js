const express = require("express");

const {
    getMotorcycleVariants,
    getAdminMotorcycleVariants,
    getVariant,
    createVariant,
    updateVariant,
    deleteVariant,
} = require("../controllers/variantController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminOnly = authorize("admin");

const router = express.Router();

// Public
router.get("/motorcycles/:motorcycleId", getMotorcycleVariants);
router.get("/admin/motorcycles/:motorcycleId", protect, adminOnly, getAdminMotorcycleVariants);
router.get("/:variantId", getVariant);

// Admin
router.post("/", protect, adminOnly, createVariant);
router.put("/:variantId", protect, adminOnly, updateVariant);
router.delete("/:variantId", protect, adminOnly, deleteVariant);

module.exports = router;
