const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { isRoleEnabled } = require("../services/roleConfigService");

const router = express.Router();

/*
========================================
REGISTER
POST /api/auth/register
========================================
*/

router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check required fields
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                message: "Please fill in all fields.",
            });
        }

        // Check existing user
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered.",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Role assignment is CONTROLLED SERVER-SIDE.
        // A public registration may only create a customer ("user") or a
        // provider account. "admin" is NEVER assignable by the client —
        // otherwise anyone could self-register as an administrator.
        const requestedRole = String(req.body.role || "").toLowerCase().trim();
        let role = "user";
        if (requestedRole === "provider") {
            role = "provider";
        } else if (requestedRole === "customer" || requestedRole === "user") {
            role = "user";
        }

        // A role disabled by an administrator cannot be registered for.
        const roleEnabled = await isRoleEnabled(role);
        if (!roleEnabled) {
            return res.status(403).json({
                success: false,
                code: "ROLE_DISABLED",
                message:
                    "Registration for this account type is currently unavailable. Please contact support.",
            });
        }

        // Create user (Free plan + token allowance via schema defaults)
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            role,
            aiPlan: "free",
        });

        // Welcome email AFTER the account exists; failures never undo registration
        try {
            const { sendWelcomeEmail } = require("../services/emailService");
            await sendWelcomeEmail(user);
        } catch (e) {
            console.error("Welcome email error:", e.message);
        }

        res.status(201).json({
            message: "Registration successful.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address || "",
                profileImage: user.profileImage || "",
                role: user.role,
                aiPlan: user.aiPlan || "free",
                aiPlanType: user.aiPlanType || "free",
            },
        });
    } catch (error) {
        console.error("Registration Error:", error);

        res.status(500).json({
            message: "Server error during registration.",
        });
    }
});


/*
========================================
LOGIN
POST /api/auth/login
========================================
*/

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        // Find user
        const user = await User.findOne({
            email: email.toLowerCase(),
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // A role disabled by an administrator cannot sign in.
        const roleEnabled = await isRoleEnabled(user.role);
        if (!roleEnabled) {
            return res.status(403).json({
                success: false,
                code: "ROLE_DISABLED",
                message:
                    "This account type is currently unavailable. Please contact support.",
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.status(200).json({
            message: "Login successful.",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address || "",
                profileImage: user.profileImage || "",
                role: user.role,
                aiPlan: user.aiPlan || "free",
                aiPlanType: user.aiPlanType || "free",
            },
        });
    } catch (error) {
        console.error("Login Error:", error);

        res.status(500).json({
            message: "Server error during login.",
        });
    }
});

module.exports = router;
