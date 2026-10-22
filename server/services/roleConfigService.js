/*
========================================
ROLE CONFIG SERVICE
========================================
Central place that reads/writes role configuration.

- Caches role configs in memory (short TTL) so the auth middleware does
  not hit MongoDB on every request.
- Seeds sensible defaults on boot so a fresh install still works.
- Validates every role name and permission key against the catalogue.
- Writes an audit record for every change.
========================================
*/
const RoleConfig = require("../models/RoleConfig");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
    PERMISSION_CATALOG,
    PERMISSION_KEYS,
    DEFAULT_PERMISSIONS,
    MANAGEABLE_ROLES,
    ROLE_META,
    normalizeRole,
    isManageableRole,
    sanitizePermissions,
} = require("../utils/permissions");

const CACHE_TTL_MS = 15 * 1000;
let cache = new Map();
let cacheStamp = 0;

const cacheFresh = () => Date.now() - cacheStamp < CACHE_TTL_MS && cache.size > 0;

const invalidateCache = () => {
    cache = new Map();
    cacheStamp = 0;
};

/* ============================================
   AUDIT
   ============================================ */
const writeAudit = async ({ actor, action, role, previousValue, newValue, result }) => {
    try {
        await AuditLog.create({
            actor: actor ? actor._id : null,
            action,
            entity: "role",
            entityId: null,
            dealership: null,
            details: JSON.stringify({
                role,
                previousValue,
                newValue,
                result,
                actorName: actor ? actor.name : "system",
            }),
        });
    } catch (err) {
        // Audit failures must never break the operation.
        console.error("Role audit write error:", err.message);
    }
};

/* ============================================
   READ
   ============================================ */
const getRoleConfig = async (role) => {
    const canonical = normalizeRole(role);
    if (!canonical) return null;
    if (cacheFresh()) {
        const hit = cache.get(canonical);
        if (hit) return hit;
    }
    const doc = await RoleConfig.findOne({ role: canonical }).lean();
    const result = doc || null;
    cache.set(canonical, result);
    cacheStamp = Date.now();
    return result;
};

/** Permissions for a role, always complete (missing keys = false). */
const getPermissionsForRole = async (role) => {
    const canonical = normalizeRole(role);
    if (!canonical) return {};
    const config = await getRoleConfig(canonical);
    const stored = (config && config.permissions) || {};
    const defaults = DEFAULT_PERMISSIONS[canonical] || {};
    const out = {};
    for (const key of PERMISSION_KEYS) {
        out[key] = typeof stored[key] === "boolean" ? stored[key] : defaults[key] === true;
    }
    return out;
};

const isRoleEnabled = async (role) => {
    const canonical = normalizeRole(role);
    if (!canonical) return false;
    const config = await getRoleConfig(canonical);
    // If the config is missing entirely we must NOT grant extra
    // privileges, but we must not lock everyone out either.
    if (!config) return true;
    return config.enabled !== false;
};

const getAllRoleConfigs = async () => {
    const docs = await RoleConfig.find({}).lean();
    const byRole = new Map(docs.map((d) => [d.role, d]));
    const counts = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    return MANAGEABLE_ROLES.map((role) => {
        const doc = byRole.get(role);
        const meta = ROLE_META[role];
        // "user" and "customer" are the same role — count both.
        const userCount =
            role === "customer"
                ? (countMap.get("customer") || 0) + (countMap.get("user") || 0)
                : countMap.get(role) || 0;
        return {
            role,
            displayName: doc?.displayName || meta.displayName,
            description: doc?.description || meta.description,
            enabled: doc ? doc.enabled !== false : true,
            permissions: doc?.permissions || DEFAULT_PERMISSIONS[role] || {},
            userCount,
            updatedAt: doc?.updatedAt || null,
            updatedBy: doc?.updatedBy || null,
            updatedByName: doc?.updatedByName || "",
            createdAt: doc?.createdAt || null,
        };
    });
};

/* ============================================
   WRITE
   ============================================ */
const setRoleEnabled = async ({ role, enabled, actor }) => {
    const canonical = normalizeRole(role);
    if (!isManageableRole(canonical)) {
        return { error: "Invalid role.", status: 400 };
    }
    const nextEnabled = enabled === true || enabled === "true";

    const config = await RoleConfig.findOne({ role: canonical });

    // --- SAFETY: the admin role must never be disable-able ---
    // The admin role is what grants access to role management itself.
    // Disabling it would lock EVERY administrator out permanently —
    // nobody would be able to re-enable it. Recovery requires the
    // documented database procedure, not an automatic privilege grant.
    if (canonical === "admin" && !nextEnabled) {
        await writeAudit({
            actor,
            action: "role.disable.rejected",
            role: canonical,
            previousValue: config ? config.enabled !== false : true,
            newValue: false,
            result: "rejected: the admin role cannot be disabled",
        });
        return {
            error:
                "The Admin role cannot be disabled — it controls role and permission management. Use the documented recovery procedure if it must be changed.",
            status: 400,
        };
    }

    const updated = await RoleConfig.findOneAndUpdate(
        { role: canonical },
        {
            $set: {
                enabled: nextEnabled,
                displayName: config?.displayName || ROLE_META[canonical].displayName,
                description: config?.description || ROLE_META[canonical].description,
                updatedBy: actor?._id || null,
                updatedByName: actor?.name || "",
            },
            $setOnInsert: {
                permissions: DEFAULT_PERMISSIONS[canonical] || {},
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    invalidateCache();
    await writeAudit({
        actor,
        action: nextEnabled ? "role.enable" : "role.disable",
        role: canonical,
        previousValue: config ? config.enabled !== false : true,
        newValue: nextEnabled,
        result: "success",
    });

    return { config: updated };
};

const setPermissions = async ({ role, permissions, actor }) => {
    const canonical = normalizeRole(role);
    if (!isManageableRole(canonical)) {
        return { error: "Invalid role.", status: 400 };
    }
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
        return { error: "Permissions must be an object.", status: 400 };
    }

    // Reject unknown keys outright — never silently accept them.
    const unknown = Object.keys(permissions).filter((k) => !PERMISSION_KEYS.includes(k));
    if (unknown.length) {
        await writeAudit({
            actor,
            action: "role.permissions.rejected",
            role: canonical,
            previousValue: null,
            newValue: null,
            result: `rejected: unknown permission keys ${unknown.join(", ")}`,
        });
        return {
            error: `Unknown permission key(s): ${unknown.join(", ")}.`,
            status: 400,
        };
    }

    const config = await RoleConfig.findOne({ role: canonical });
    const previous = await getPermissionsForRole(canonical);
    const clean = sanitizePermissions(permissions);
    // A permission that is not mentioned keeps its current value.
    const merged = { ...previous, ...clean };

    // --- SAFETY: the admin role must keep the key that manages roles ---
    // Revoking it would lock every administrator out of role management.
    // It may still be re-granted (that is the repair path).
    if (canonical === "admin" && previous["users.manage"] === true && merged["users.manage"] !== true) {
        await writeAudit({
            actor,
            action: "role.permissions.rejected",
            role: canonical,
            previousValue: previous,
            newValue: merged,
            result: "rejected: the admin role must keep 'users.manage'",
        });
        return {
            error: "The Admin role must keep the 'Manage users and roles' permission, otherwise no admin could restore it.",
            status: 400,
        };
    }

    const updated = await RoleConfig.findOneAndUpdate(
        { role: canonical },
        {
            $set: {
                permissions: merged,
                displayName: config?.displayName || ROLE_META[canonical].displayName,
                description: config?.description || ROLE_META[canonical].description,
                updatedBy: actor?._id || null,
                updatedByName: actor?.name || "",
            },
            $setOnInsert: { enabled: true },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    invalidateCache();
    await writeAudit({
        actor,
        action: "role.permissions.update",
        role: canonical,
        previousValue: previous,
        newValue: merged,
        result: "success",
    });

    return { config: updated };
};

/* ============================================
   SEED
   Creates any missing role config with the default permission set.
   Never overwrites an existing configuration.
   ============================================ */
const ensureRoleConfigs = async () => {
    try {
        for (const role of MANAGEABLE_ROLES) {
            const existing = await RoleConfig.findOne({ role });
            if (existing) continue;
            await RoleConfig.create({
                role,
                displayName: ROLE_META[role].displayName,
                description: ROLE_META[role].description,
                enabled: true,
                permissions: DEFAULT_PERMISSIONS[role],
                updatedByName: "system",
            });
            console.log(`[roles] seeded default configuration for "${role}"`);
        }
        invalidateCache();
    } catch (err) {
        // A seeding failure must never prevent the server from starting.
        console.error("Role config seed error:", err.message);
    }
};

const getAuditLog = async ({ role, limit = 50 } = {}) => {
    const query = { entity: "role" };
    if (role && isManageableRole(role)) {
        query.details = new RegExp(`"role":"${normalizeRole(role)}"`);
    }
    const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .limit(Math.min(200, Math.max(1, limit)))
        .populate("actor", "name email role")
        .lean();

    return logs.map((l) => {
        let details = {};
        try {
            details = JSON.parse(l.details || "{}");
        } catch {
            details = { note: l.details };
        }
        return {
            _id: l._id,
            action: l.action,
            role: details.role || null,
            actor: l.actor ? { id: l.actor._id, name: l.actor.name, role: l.actor.role } : null,
            previousValue: details.previousValue ?? null,
            newValue: details.newValue ?? null,
            result: details.result || "",
            createdAt: l.createdAt,
        };
    });
};

module.exports = {
    getRoleConfig,
    getAllRoleConfigs,
    getPermissionsForRole,
    isRoleEnabled,
    setRoleEnabled,
    setPermissions,
    ensureRoleConfigs,
    getAuditLog,
    invalidateCache,
    PERMISSION_CATALOG,
};
