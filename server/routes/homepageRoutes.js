const express = require("express");
const { getPublicHomepage } = require("../controllers/homepageController");

const router = express.Router();

router.get("/", getPublicHomepage);

module.exports = router;
