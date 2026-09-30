const express = require("express");

const {
    getDashboard,
    getProfile,
    updateProfile,
    getFavorites,
    addFavorite,
    removeFavorite,
    changePassword,
    deleteAccount,
} = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/favorites", getFavorites);
router.post("/favorites/:motorcycleId", addFavorite);
router.delete("/favorites/:motorcycleId", removeFavorite);
router.put("/change-password", changePassword);
router.delete("/account", deleteAccount);

module.exports = router;
