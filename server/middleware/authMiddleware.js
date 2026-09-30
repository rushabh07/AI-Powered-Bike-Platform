const jwt = require("jsonwebtoken");
const User = require("../models/User");

/*
========================================
AUTHENTICATION MIDDLEWARE
Extracts & verifies JWT from Authorization header
Attaches authenticated user object to req.user
========================================
*/
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Extract token from "Bearer <token>"
            token = req.headers.authorization.split(" ")[1];

            // Verify JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find user by ID without password
            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return res.status(401).json({
                    message: "Unauthenticated. User not found.",
                });
            }

            req.user = user;
            return next();
        } catch (error) {
            console.error("Auth Middleware Error:", error.message);
            return res.status(401).json({
                message: "Unauthenticated. Invalid or expired token.",
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            message: "Unauthenticated. No token provided.",
        });
    }
};

module.exports = protect;
