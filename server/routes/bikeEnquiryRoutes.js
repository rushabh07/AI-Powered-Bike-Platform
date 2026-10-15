const express = require("express");

const {
    createEnquiry,
    getMyEnquiries,
    cancelEnquiry,
    getAllEnquiries,
    updateEnquiryStatus,
    getEnquiryStats,
} = require("../controllers/bikeEnquiryController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", protect, createEnquiry);
router.get("/my", protect, getMyEnquiries);
router.post("/:enquiryId/cancel", protect, cancelEnquiry);
router.get("/admin/stats", protect, authorize("admin"), getEnquiryStats);
router.get("/admin/all", protect, authorize("admin"), getAllEnquiries);
router.put("/admin/:enquiryId/status", protect, authorize("admin"), updateEnquiryStatus);

module.exports = router;
