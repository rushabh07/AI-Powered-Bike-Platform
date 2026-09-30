const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const motorcycleRoutes = require("./routes/motorcycleRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiAdvisorRoutes = require("./routes/aiAdvisorRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiTokenRoutes = require("./routes/aiTokenRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const userRoutes = require("./routes/userRoutes");
const comparisonRoutes = require("./routes/comparisonRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();

const app = express();

// ========================================
// Middleware
// ========================================

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

// Raw body for the Razorpay webhook signature check.
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

// Subscription / Premium routes
app.use("/api/subscription", subscriptionRoutes);


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
    .then(() => {
        console.log("MongoDB connected successfully");

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