const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const motorcycleRoutes = require("./routes/motorcycleRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminSubscriptionRoutes = require("./routes/adminSubscriptionRoutes");
const aiAdvisorRoutes = require("./routes/aiAdvisorRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiTokenRoutes = require("./routes/aiTokenRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const userRoutes = require("./routes/userRoutes");
const comparisonRoutes = require("./routes/comparisonRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const advertisementRoutes = require("./routes/advertisementRoutes");
const variantRoutes = require("./routes/variantRoutes");
const bikeEnquiryRoutes = require("./routes/bikeEnquiryRoutes");
const dealershipRoutes = require("./routes/dealershipRoutes");
const orderRoutes = require("./routes/orderRoutes");
const updateRoutes = require("./routes/updateRoutes");
const adminUpdateRoutes = require("./routes/adminUpdateRoutes");
const homepageRoutes = require("./routes/homepageRoutes");
const adminHomepageRoutes = require("./routes/adminHomepageRoutes");
const roleRoutes = require("./routes/roleRoutes");
const adminRoleRoutes = require("./routes/adminRoleRoutes");
const { ensureRoleConfigs } = require("./services/roleConfigService");

dotenv.config();

const app = express();

// ========================================
// CORS
// ========================================
// In development the Vite dev server can land on any port
// (5173, 5174, ...) if the preferred one is taken, so a single
// hard-coded origin breaks every API call. Allow any loopback
// origin in dev, and an explicit allow-list in production.
//
// Set CLIENT_ORIGIN (comma separated) to lock this down, e.g.
//   CLIENT_ORIGIN=https://motoai.com,https://www.motoai.com
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const isLoopbackOrigin = (origin) => {
    try {
        const { hostname } = new URL(origin);
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    } catch {
        return false;
    }
};

const corsOrigin = (origin, callback) => {
    // Same-origin / non-browser requests (curl, mobile app) send no Origin.
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length > 0) {
        return callback(null, ALLOWED_ORIGINS.includes(origin));
    }
    return callback(null, isLoopbackOrigin(origin));
};

// ========================================
// Middleware
// ========================================

app.use(
    cors({
        origin: corsOrigin,
        credentials: true,
    })
);

// Raw body for the subscription webhook signature check.
// MUST be mounted before express.json().
app.use("/api/subscription/webhook", express.raw({ type: "*/*" }));

app.use(express.json());


// ========================================
// Routes
// ========================================

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "MOTOAI Backend is running 🚀",
    });
});

// Authentication
app.use("/api/auth", authRoutes);

// Motorcycle routes
app.use("/api/motorcycles", motorcycleRoutes);

// Provider routes
app.use("/api/provider", providerRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminSubscriptionRoutes);

// AI Advisor routes
app.use("/api/ai-advisor", aiAdvisorRoutes);

// Persistent chat routes
app.use("/api/chats", chatRoutes);

// AI token wallet routes
app.use("/api/ai-tokens", aiTokenRoutes);

// Customer panel routes
app.use("/api/user", userRoutes);

// Saved comparisons routes
app.use("/api/comparisons", comparisonRoutes);

// In-app notifications routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
// Spec-shaped nested aliases: /api/motorcycles/:motorcycleId/reviews[/summary]
app.use("/api/motorcycles", require("./routes/motorcycleReviewRoutes"));
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/bike-enquiries", bikeEnquiryRoutes);
app.use("/api/dealerships", dealershipRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", require("./routes/contactRoutes"));

// Motorcycle updates (news/launches) — public + admin
app.use("/api/updates", updateRoutes);
app.use("/api/admin/updates", adminUpdateRoutes);

// Homepage configuration — public + admin
app.use("/api/homepage", homepageRoutes);
app.use("/api/admin/homepage", adminHomepageRoutes);

// Subscription / Premium routes
app.use("/api/subscription", subscriptionRoutes);

// Role & permission management
app.use("/api/roles", roleRoutes);
app.use("/api/admin/roles", adminRoleRoutes);

// Self-hosted user assets (avatars) — served same-origin from the API
// so the browser never makes third-party requests (no tracking notices).
app.use(
    "/uploads",
    express.static(require("path").join(__dirname, "public", "uploads"), {
        maxAge: "7d",
        fallthrough: true,
    })
);

// ========================================
// 404 Handler
// ========================================

app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});


// ========================================
// Global Error Handler
// ========================================

app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(500).json({
        message: "Internal server error",
        error: err.message,
    });
});


// ========================================
// MongoDB Connection
// ========================================

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("MongoDB connected successfully");

        // Seed the default role configuration. Missing configs fall back
        // to safe defaults, so a seeding failure never locks anyone out.
        await ensureRoleConfigs();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error
        );
    });