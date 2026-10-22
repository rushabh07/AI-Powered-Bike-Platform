/*
========================================
ROLE & PERMISSION CATALOGUE
========================================
Server-side allowlist. Every permission key the API accepts must exist
here — the frontend can never introduce a new one.

Roles are canonical: "admin", "provider", "customer".
The stored user role "user" is an alias of "customer" (the app already
normalises the two in ProtectedRoute).
========================================
*/

// "user" and "customer" are the same role in this application.
const ROLE_ALIASES = {
    user: "customer",
    customer: "customer",
    provider: "provider",
    admin: "admin",
};

const MANAGEABLE_ROLES = ["admin", "provider", "customer"];

/**
 * The permission catalogue.
 * key      — stable identifier used by the API and the UI
 * label    — human label
 * module   — grouping shown in the admin UI
 * desc     — explanation of what the permission actually allows
 */
const PERMISSION_CATALOG = [
    {
        key: "motorcycles.view",
        module: "Motorcycles",
        label: "View motorcycles",
        desc: "Browse the motorcycle catalogue, specs and availability.",
    },
    {
        key: "motorcycles.manage",
        module: "Motorcycles",
        label: "Manage motorcycles",
        desc: "Create, edit and delete motorcycle listings.",
    },
    {
        key: "dealerships.manage",
        module: "Dealerships",
        label: "Manage dealership profile",
        desc: "Edit dealership details, staff and stock for an authorised dealership.",
    },
    {
        key: "orders.manage",
        module: "Orders",
        label: "Manage orders",
        desc: "Confirm, verify payment, update fulfilment and cancel orders.",
    },
    {
        key: "orders.request",
        module: "Orders",
        label: "Place purchase requests",
        desc: "Submit a purchase request for a motorcycle.",
    },
    {
        key: "reviews.write",
        module: "Reviews",
        label: "Write reviews",
        desc: "Submit a review for a motorcycle that was purchased.",
    },
    {
        key: "reviews.manage",
        module: "Reviews",
        label: "Manage reviews",
        desc: "Moderate, approve, reject and remove reviews.",
    },
    {
        key: "ai.advisor",
        module: "AI",
        label: "Use AI Advisor",
        desc: "Use the MotoMind AI Advisor chat and its AI APIs.",
    },
    {
        key: "ai.plans",
        module: "AI",
        label: "Manage AI plans",
        desc: "Configure AI subscription plans and view AI analytics.",
    },
    {
        key: "ads.manage",
        module: "Content",
        label: "Manage advertisements",
        desc: "Create, schedule and remove homepage advertisements.",
    },
    {
        key: "updates.manage",
        module: "Content",
        label: "Manage latest updates",
        desc: "Publish and edit motorcycle news and launches.",
    },
    {
        key: "users.manage",
        module: "Administration",
        label: "Manage users and roles",
        desc: "Manage accounts, roles, permissions and system settings.",
    },
    {
        key: "analytics.view",
        module: "Reporting",
        label: "View analytics",
        desc: "View platform statistics and reporting dashboards.",
    },
    {
        key: "settings.manage",
        module: "Administration",
        label: "Manage system settings",
        desc: "Change site-wide settings such as the homepage configuration.",
    },
];

const PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

// ============================================
// DEFAULT PERMISSIONS
// These preserve the CURRENT behaviour of the application: every
// capability a role has today stays enabled by default, so enabling
// the feature changes nothing until an admin edits it.
// ============================================
const DEFAULT_PERMISSIONS = {
    admin: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])),
    provider: {
        "motorcycles.view": true,
        "motorcycles.manage": false,
        "dealerships.manage": true,
        "orders.manage": true,
        "orders.request": true,
        "reviews.write": true,
        "reviews.manage": false,
        "ai.advisor": true,
        "ai.plans": false,
        "ads.manage": false,
        "updates.manage": false,
        "users.manage": false,
        "analytics.view": true,
        "settings.manage": false,
    },
    customer: {
        "motorcycles.view": true,
        "motorcycles.manage": false,
        "dealerships.manage": false,
        "orders.manage": false,
        "orders.request": true,
        "reviews.write": true,
        "reviews.manage": false,
        "ai.advisor": true,
        "ai.plans": false,
        "ads.manage": false,
        "updates.manage": false,
        "users.manage": false,
        "analytics.view": false,
        "settings.manage": false,
    },
};

const ROLE_META = {
    admin: {
        displayName: "Admin",
        description: "Full platform control — motorcycles, orders, content, users and system settings.",
    },
    provider: {
        displayName: "Provider / Dealership",
        description: "Dealership staff managing their own showroom, stock, orders and bookings.",
    },
    customer: {
        displayName: "Customer",
        description: "Riders browsing bikes, placing purchase requests, writing reviews and using AI tools.",
    },
};

/** Map any stored role value to its canonical role key. */
const normalizeRole = (role) => ROLE_ALIASES[String(role || "").toLowerCase()] || null;

/** True when the role key is one this system manages. */
const isManageableRole = (role) => MANAGEABLE_ROLES.includes(normalizeRole(role));

/** Filter an incoming permission payload down to known keys only. */
const sanitizePermissions = (input) => {
    const out = {};
    if (!input || typeof input !== "object") return out;
    for (const key of PERMISSION_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            out[key] = input[key] === true || input[key] === "true" || input[key] === 1;
        }
    }
    return out;
};

module.exports = {
    PERMISSION_CATALOG,
    PERMISSION_KEYS,
    DEFAULT_PERMISSIONS,
    MANAGEABLE_ROLES,
    ROLE_META,
    normalizeRole,
    isManageableRole,
    sanitizePermissions,
};
