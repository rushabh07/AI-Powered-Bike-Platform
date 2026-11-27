/**
 * Safe, rerunnable migration for Dealership <-> Provider ownership.
 *
 * Usage:
 *   node scripts/migrateDealershipOwnership.js            # dry-run (default)
 *   node scripts/migrateDealershipOwnership.js --dry-run  # explicit dry-run
 *   node scripts/migrateDealershipOwnership.js --apply    # persist unambiguous assignments
 *
 * Rules:
 * - Never deletes any records.
 * - Never overwrites an existing Dealership.owner.
 * - Never invents or guesses ownership when data is missing or ambiguous;
 *   instead, reports every record that requires manual admin assignment.
 */
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Dealership = require("../models/Dealership");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function runDealershipOwnershipMigration({ apply = false } = {}) {
    const [dealerships, providers] = await Promise.all([
        Dealership.find({}).select("name city owner staff").lean(),
        User.find({ role: "provider" }).select("name email phone").lean(),
    ]);

    const providerById = new Map(providers.map((p) => [String(p._id), p]));
    const assignedProviderIds = new Set();

    const report = {
        mode: apply ? "apply" : "dry-run",
        totals: {
            dealerships: dealerships.length,
            providers: providers.length,
            alreadyOwned: 0,
            proposedAssignments: 0,
            appliedAssignments: 0,
            unassignedDealerships: 0,
            unassignedProviders: 0,
        },
        proposedAssignments: [],
        ambiguousDealerships: [],
        unassignedDealerships: [],
        unassignedProviders: [],
    };

    for (const d of dealerships) {
        if (d.owner) {
            report.totals.alreadyOwned += 1;
            assignedProviderIds.add(String(d.owner));
            continue;
        }

        const staffProviders = (d.staff || [])
            .map((s) => ({
                userId: String(s.user),
                staffRole: s.role,
                provider: providerById.get(String(s.user)) || null,
            }))
            .filter((entry) => entry.provider);

        const managers = staffProviders.filter((entry) => entry.staffRole === "manager");
        const candidate =
            managers.length === 1
                ? managers[0]
                : managers.length === 0 && staffProviders.length === 1
                  ? staffProviders[0]
                  : null;

        if (candidate) {
            const entry = {
                dealershipId: String(d._id),
                dealershipName: d.name,
                city: d.city,
                providerId: candidate.userId,
                providerEmail: candidate.provider.email,
                reason: managers.length === 1 ? "unique_staff_manager_provider" : "unique_staff_provider",
            };
            report.proposedAssignments.push(entry);
            report.totals.proposedAssignments += 1;
            assignedProviderIds.add(candidate.userId);

            if (apply) {
                const res = await Dealership.updateOne(
                    { _id: d._id, $or: [{ owner: null }, { owner: { $exists: false } }] },
                    { $set: { owner: candidate.provider._id } }
                );
                if (res.modifiedCount > 0) {
                    report.totals.appliedAssignments += 1;
                }
            }
        } else if (staffProviders.length > 1) {
            report.ambiguousDealerships.push({
                dealershipId: String(d._id),
                dealershipName: d.name,
                city: d.city,
                candidateProviders: staffProviders.map((s) => ({
                    providerId: s.userId,
                    email: s.provider.email,
                    staffRole: s.staffRole,
                })),
            });
            report.unassignedDealerships.push({
                dealershipId: String(d._id),
                dealershipName: d.name,
                city: d.city,
                reason: "multiple_staff_providers_manual_decision_required",
            });
            for (const s of staffProviders) assignedProviderIds.add(s.userId);
        } else {
            report.unassignedDealerships.push({
                dealershipId: String(d._id),
                dealershipName: d.name,
                city: d.city,
                reason: "no_owner_or_staff_provider_manual_assignment_required",
            });
        }
    }

    for (const p of providers) {
        const pid = String(p._id);
        const hasStaffRole = dealerships.some((d) =>
            (d.staff || []).some((s) => String(s.user) === pid)
        );
        if (!assignedProviderIds.has(pid) && !hasStaffRole) {
            report.unassignedProviders.push({
                providerId: pid,
                name: p.name,
                email: p.email,
                reason: "no_owned_or_staff_dealership_manual_assignment_required",
            });
        }
    }

    report.totals.unassignedDealerships = report.unassignedDealerships.length;
    report.totals.unassignedProviders = report.unassignedProviders.length;
    return report;
}

if (require.main === module) {
    const apply = process.argv.includes("--apply");
    mongoose
        .connect(process.env.MONGO_URI)
        .then(async () => {
            const report = await runDealershipOwnershipMigration({ apply });
            console.log(JSON.stringify(report, null, 2));
            await mongoose.disconnect();
            process.exit(0);
        })
        .catch((err) => {
            console.error("Migration failed:", err);
            process.exit(1);
        });
}

module.exports = { runDealershipOwnershipMigration };
