const express = require("express");
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const { authorize, requirePermission } = require("../middleware/roleMiddleware");
const roleService = require("../services/roleConfigService");
const User = require("../models/User");
const {
    PERMISSION_CATALOG,
    PERMISSION_KEYS,
    MANAGEABLE_ROLES,
    ROLE_META,
    normalizeRole,
    isManageableRole,
} = require("../utils/permissions");

const router = express.Router();

/*
========================================
ADMIN ROLE & PERMISSION MANAGEMENT
========================================
Every route requires an authenticated administrator that holds the
"Manage users and roles" permission.

Rate limiting: simple in-memory limiter (no new dependency) so a
misbehaving client cannot hammer the configuration endpoints.
========================================
*/
const buckets = new Map();
const rateLimit = (max = 60, windowMs = 60 * 1000) => (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
        return res.status(429).json({
            success: false,
            message: "Too many requests. Please slow down and try again.",
        });
    }
    hits.push(now);
    buckets.set(key, hits);
    next();
};

const adminOnly = authorize("admin");

// ============================================
// GET /api/admin/roles/permissions/catalog
// The server-defined permission allowlist (for the UI).
// ============================================
router.get("/permissions/catalog", protect, adminOnly, requirePermission("users.manage"), (req, res) => {
    res.status(200).json({
        success: true,
        catalog: PERMISSION_CATALOG,
        keys: PERMISSION_KEYS,
    });
});

// ============================================
// GET /api/admin/roles
// List every manageable role with live user counts and status.
// ============================================
router.get("/", protect, adminOnly, requirePermission("users.manage"), async (req, res) => {
    try {
        const roles = await roleService.getAllRoleConfigs();
        res.status(200).json({
            success: true,
            roles,
            permissionCatalog: PERMISSION_CATALOG,
            manageableRoles: MANAGEABLE_ROLES,
        });
    } catch (error) {
        console.error("Get roles error:", error.message);
        res.status(500).json({ success: false, message: "Could not load role configuration." });
    }
});

// ============================================
// GET /api/admin/roles/:role/permissions
// ============================================
router.get("/:role/permissions", protect, adminOnly, requirePermission("users.manage"), async (req, res) => {
    try {
        const role = normalizeRole(req.params.role);
        if (!isManageableRole(role)) {
            return res.status(400).json({ success: false, message: "Invalid role." });
        }
        const permissions = await roleService.getPermissionsForRole(role);
        res.status(200).json({
            success: true,
            role,
            displayName: ROLE_META[role].displayName,
            permissions,
            catalog: PERMISSION_CATALOG,
        });
    } catch (error) {
        console.error("Get role permissions error:", error.message);
        res.status(500).json({ success: false, message: "Could not load permissions." });
    }
});

// ============================================
// PUT /api/admin/roles/:role/permissions
// Update a role's permission map. Unknown keys are rejected.
// ============================================
router.put("/:role/permissions", protect, adminOnly, requirePermission("users.manage"), rateLimit(30), async (req, res) => {
    try {
        const role = normalizeRole(req.params.role);
        if (!isManageableRole(role)) {
            return res.status(400).json({ success: false, message: "Invalid role." });
        }
        const result = await roleService.setPermissions({
            role,
            permissions: req.body?.permissions,
            actor: req.user,
        });
        if (result.error) {
            return res.status(result.status || 400).json({ success: false, message: result.error });
        }
        res.status(200).json({
            success: true,
            message: `Permissions updated for ${ROLE_META[role].displayName}.`,
            role,
            permissions: result.config.permissions,
        });
    } catch (error) {
        console.error("Update role permissions error:", error.message);
        res.status(500).json({ success: false, message: "Could not update permissions." });
    }
});

// ============================================
// PUT /api/admin/roles/:role/active
// Enable or disable a role.
// ============================================
router.put("/:role/active", protect, adminOnly, requirePermission("users.manage"), rateLimit(30), async (req, res) => {
    try {
        const role = normalizeRole(req.params.role);
        if (!isManageableRole(role)) {
            return res.status(400).json({ success: false, message: "Invalid role." });
        }
        const enabled = req.body?.enabled;
        if (typeof enabled !== "boolean" && enabled !== "true" && enabled !== "false") {
            return res.status(400).json({
                success: false,
                message: "'enabled' must be a boolean.",
            });
        }
        const result = await roleService.setRoleEnabled({
            role,
            enabled: enabled === true || enabled === "true",
            actor: req.user,
        });
        if (result.error) {
            return res.status(result.status || 400).json({ success: false, message: result.error });
        }
        res.status(200).json({
            success: true,
            message: `${ROLE_META[role].displayName} role ${
                result.config.enabled ? "enabled" : "disabled"
            }.`,
            role,
            enabled: result.config.enabled !== false,
        });
    } catch (error) {
        console.error("Update role status error:", error.message);
        res.status(500).json({ success: false, message: "Could not update role status." });
    }
});

// ============================================
// GET /api/admin/roles/:role/users
// Paginated list of users holding a role.
// ============================================
router.get("/:role/users", protect, adminOnly, requirePermission("users.manage"), async (req, res) => {
    try {
        const role = normalizeRole(req.params.role);
        if (!isManageableRole(role)) {
            return res.status(400).json({ success: false, message: "Invalid role." });
        }
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        // "customer" covers both the "user" and "customer" role values.
        const roleFilter = role === "customer" ? { $in: ["user", "customer"] } : role;

        const [users, total] = await Promise.all([
            User.find({ role: roleFilter })
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments({ role: roleFilter }),
        ]);

        res.status(200).json({
            success: true,
            role,
            page,
            limit,
            total,
            pages: Math.max(1, Math.ceil(total / limit)),
            users: users.map((u) => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt,
            })),
        });
    } catch (error) {
        console.error("Get role users error:", error.message);
        res.status(500).json({ success: false, message: "Could not load role users." });
    }
});

// ============================================
// GET /api/admin/roles/audit
// Audit history for role / permission changes.
// ============================================
router.get("/audit", protect, adminOnly, requirePermission("users.manage"), async (req, res) => {
    try {
        const logs = await roleService.getAuditLog({
            role: req.query.role || "",
            limit: parseInt(req.query.limit, 10) || 50,
        });
        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error("Get role audit error:", error.message);
        res.status(500).json({ success: false, message: "Could not load the audit log." });
    }
});

module.exports = router;
