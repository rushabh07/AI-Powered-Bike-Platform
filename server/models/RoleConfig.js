const mongoose = require("mongoose");

/*
========================================
ROLE CONFIGURATION
========================================
One document per manageable role (admin / provider / customer).
Stores the role's enabled flag and its permission map.

The User model continues to hold each account's role — this collection
only holds the ROLE configuration, not accounts.
========================================
*/

const roleConfigSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["admin", "provider", "customer"],
            required: true,
            unique: true,
        },
        displayName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 300,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        // permission key -> boolean. Keys are validated against the
        // server-side catalogue before they are ever written.
        permissions: {
            type: mongoose.Schema.Types.Mixed,
            default: () => ({}),
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedByName: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// The unique index on `role` is declared on the field above.

module.exports =
    mongoose.models.RoleConfig || mongoose.model("RoleConfig", roleConfigSchema);
