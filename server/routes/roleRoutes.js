const express = require("express");

const protect = require("../middleware/authMiddleware");
const roleService = require("../services/roleConfigService");
const { normalizeRole, ROLE_META } = require("../utils/permissions");

const router = express.Router();

/*
========================================
CURRENT USER'S ROLE & PERMISSIONS
========================================
GET /api/roles/me

Returns the caller's effective role configuration so the frontend can
show or hide modules. This is convenience only — every API route is
still enforced server-side.
========================================
*/
router.get("/me", protect, async (req, res) => {
    try {
        const role = normalizeRole(req.user.role);
        const [permissions, config] = await Promise.all([
            roleService.getPermissionsForRole(req.user.role),
            roleService.getRoleConfig(req.user.role),
        ]);

        res.status(200).json({
            success: true,
            role: role || req.user.role,
            displayName: config?.displayName || (role ? ROLE_META[role].displayName : ""),
            enabled: config ? config.enabled !== false : true,
            permissions,
        });
    } catch (error) {
        console.error("Get my role error:", error.message);
        res.status(500).json({ success: false, message: "Could not load your permissions." });
    }
});

module.exports = router;
