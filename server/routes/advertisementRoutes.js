const express = require("express");

const {
    getPublicAds,
    recordImpression,
    recordClick,
} = require("../controllers/advertisementController");

const router = express.Router();

// Public — only eligible ads, no admin data
router.get("/", getPublicAds);
router.post("/:id/impression", recordImpression);
router.post("/:id/click", recordClick);

module.exports = router;
