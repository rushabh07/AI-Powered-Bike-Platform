const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isRoleEnabled, getPermissionsForRole } = require("../services/roleConfigService");

/*
========================================
AUTHENTICATION MIDDLEWARE
========================================
Extracts & verifies JWT from Authorization header
Attaches authenticated user object to req.user

Also enforces the ADMIN-CONTROLLED ROLE STATUS:
if the user's role has been disabled by an administrator, the request
is rejected with 403 — this invalidates EXISTING sessions for that
role, not just future logins.
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

            // --- Role status enforcement (admin-controlled) ---
            // A role disabled by an administrator blocks every request
            // from accounts holding it, even with a valid token.
            const roleEnabled = await isRoleEnabled(user.role);
            if (!roleEnabled) {
                return res.status(403).json({
                    success: false,
                    code: "ROLE_DISABLED",
                    message:
                        "Access to the application is currently restricted for your account type. Please contact support.",
                });
            }

            req.user = user;
            // Attach the role's effective permissions for downstream
            // permission middleware (cheap — served from cache).
            req.permissions = await getPermissionsForRole(user.role);
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
