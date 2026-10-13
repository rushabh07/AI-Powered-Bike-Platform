const express = require("express");

const {
    getMotorcycleVariants,
    getVariant,
    createVariant,
    updateVariant,
    deleteVariant,
} = require("../controllers/variantController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/motorcycles/:motorcycleId", getMotorcycleVariants);
router.get("/:variantId", getVariant);
router.post("/", protect, authorize("admin", "provider"), createVariant);
router.put("/:variantId", protect, authorize("admin", "provider"), updateVariant);
router.delete("/:variantId", protect, authorize("admin", "provider"), deleteVariant);

module.exports = router;
