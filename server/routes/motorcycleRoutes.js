const express = require("express");

const {
    getMotorcycles,
    getMotorcycleById,
    createMotorcycle,
    updateMotorcycle,
    deleteMotorcycle,
    updateMotorcycleColors,
} = require("../controllers/motorcycleController");

const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================
// GET ALL MOTORCYCLES (PUBLIC)
// GET /api/motorcycles
// =====================================
router.get("/", getMotorcycles);


// =====================================
// GET SINGLE MOTORCYCLE (PUBLIC)
// GET /api/motorcycles/:id
// =====================================
router.get("/:id", getMotorcycleById);


// =====================================
// CREATE MOTORCYCLE (PROTECTED - ADMIN & PROVIDER)
// POST /api/motorcycles
// =====================================
router.post("/", protect, authorize("admin", "provider"), requirePermission("motorcycles.manage"), createMotorcycle);


// =====================================
// UPDATE MOTORCYCLE (PROTECTED - ADMIN & PROVIDER)
// PUT /api/motorcycles/:id
// =====================================
router.put("/:id", protect, authorize("admin", "provider"), requirePermission("motorcycles.manage"), updateMotorcycle);
router.put("/:id/colors", protect, authorize("admin", "provider"), requirePermission("motorcycles.manage"), updateMotorcycleColors);


// =====================================
// DELETE MOTORCYCLE (PROTECTED - ADMIN & PROVIDER)
// DELETE /api/motorcycles/:id
// =====================================
router.delete("/:id", protect, authorize("admin", "provider"), requirePermission("motorcycles.manage"), deleteMotorcycle);


module.exports = router;