const express = require("express");

const {
    getPublicUpdates,
    getPublicUpdateBySlug,
} = require("../controllers/updateController");

const router = express.Router();

// Public endpoints — published updates only
router.get("/", getPublicUpdates);
router.get("/:slug", getPublicUpdateBySlug);

module.exports = router;
