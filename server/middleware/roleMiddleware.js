/*
========================================
ROLE AUTHORIZATION MIDDLEWARE
========================================
Ensures req.user has one of the allowed roles
Returns HTTP 403 if role is not allowed
========================================
*/
const { PERMISSION_KEYS } = require("../utils/permissions");

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Unauthorized. Insufficient permissions for this resource.",
            });
        }
        next();
    };
};

/*
========================================
PERMISSION AUTHORIZATION MIDDLEWARE
========================================
Requires the caller's role to hold a specific permission key.

The permission map is attached to req.permissions by the `protect`
middleware. When no permission is configured for the caller's role the
request is rejected with 403 — a missing configuration never grants
access.
========================================
*/
const requirePermission = (...keys) => {
    const middleware = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthenticated. Please sign in again.",
            });
        }

        const unknown = keys.filter((k) => !PERMISSION_KEYS.includes(k));
        if (unknown.length) {
            // Misconfigured route — fail closed rather than open.
            console.error(`requirePermission called with unknown key(s): ${unknown.join(", ")}`);
            return res.status(500).json({
                success: false,
                message: "Permission check is misconfigured.",
            });
        }

        const perms = req.permissions || {};
        const allowed = keys.some((k) => perms[k] === true);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                code: "PERMISSION_DENIED",
                message: "Your role does not have permission to perform this action.",
                permission: keys.length === 1 ? keys[0] : keys,
            });
        }
        next();
    };

    // Mark the gate so it can be introspected (route audits, tests).
    middleware.permissionKeys = keys;
    middleware.isPermissionGate = true;
    return middleware;
};

module.exports = authorize;
module.exports.authorize = authorize;
module.exports.requirePermission = requirePermission;
