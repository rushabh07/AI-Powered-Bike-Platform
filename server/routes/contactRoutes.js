const express = require("express");
const { submitContact, listContactMessages } = require("../controllers/contactController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", express.json({ limit: "50kb" }), submitContact);
router.get("/admin/messages", protect, authorize("admin"), listContactMessages);

module.exports = router;
