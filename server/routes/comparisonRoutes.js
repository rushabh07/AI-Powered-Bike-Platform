const express = require("express");

const {
    listComparisons,
    getComparison,
    createComparison,
    deleteComparison,
} = require("../controllers/comparisonController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", listComparisons);
router.get("/:id", getComparison);
router.post("/", createComparison);
router.delete("/:id", deleteComparison);

module.exports = router;
