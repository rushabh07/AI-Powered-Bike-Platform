const express = require("express");
const {
    getSubscriptionStats,
    getSubscriptionAnalytics,
    getSubscriptions,
    getSubscriptionDetails,
    getExpiringSubscriptions,
    getLowTokenUsers,
    exportSubscriptions,
} = require("../controllers/adminSubscriptionController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();
const adminOnly = authorize("admin");

/*
========================================
ADMIN AI SUBSCRIPTIONS & ANALYTICS ROUTES
All routes require:
1. Valid JWT Authentication (protect)
2. Admin Role Authorization (adminOnly)
========================================
*/

// Overview statistics & plan breakdown
router.get("/subscription-stats", protect, adminOnly, getSubscriptionStats);

// Time-series and distribution analytics
router.get("/subscription-analytics", protect, adminOnly, getSubscriptionAnalytics);

// Subscriptions expiring soon
router.get("/subscriptions/expiring", protect, adminOnly, getExpiringSubscriptions);

// Low token users
router.get("/subscriptions/low-tokens", protect, adminOnly, getLowTokenUsers);

// Export subscriptions to CSV
router.get("/subscriptions/export", protect, adminOnly, exportSubscriptions);

// Subscriptions list (paginated, filtered, sorted)
router.get("/subscriptions", protect, adminOnly, getSubscriptions);

// Subscription details by ID
router.get("/subscriptions/:id", protect, adminOnly, getSubscriptionDetails);

module.exports = router;
