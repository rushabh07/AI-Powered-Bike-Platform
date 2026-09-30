/*
========================================
ROLE AUTHORIZATION MIDDLEWARE
Ensures req.user has one of the allowed roles
Returns HTTP 403 if role is not allowed
========================================
*/
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

module.exports = authorize;
