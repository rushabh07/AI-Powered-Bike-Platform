const express = require("express");
const {
    getDealershipsByCity,
    createDealership,
    updateDealership,
    deleteDealership,
    getAllDealerships,
} = require("../controllers/dealershipController");
const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/city/:city", protect, getDealershipsByCity);
router.get("/admin/all", protect, authorize("admin"), getAllDealerships);
router.post("/", protect, authorize("admin"), requirePermission("dealerships.manage"), createDealership);
router.put("/:dealershipId", protect, authorize("admin"), requirePermission("dealerships.manage"), updateDealership);
router.delete("/:dealershipId", protect, authorize("admin"), requirePermission("dealerships.manage"), deleteDealership);

module.exports = router;
