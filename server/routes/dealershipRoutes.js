const express = require("express");
const {
    getDealershipsByCity,
    createDealership,
    updateDealership,
    deleteDealership,
    getAllDealerships,
} = require("../controllers/dealershipController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/city/:city", protect, getDealershipsByCity);
router.get("/admin/all", protect, authorize("admin"), getAllDealerships);
router.post("/", protect, authorize("admin"), createDealership);
router.put("/:dealershipId", protect, authorize("admin"), updateDealership);
router.delete("/:dealershipId", protect, authorize("admin"), deleteDealership);

module.exports = router;
