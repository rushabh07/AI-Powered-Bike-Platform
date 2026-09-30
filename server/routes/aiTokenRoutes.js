const express = require("express");

const { getWallet } = require("../controllers/aiTokenController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getWallet);

module.exports = router;
