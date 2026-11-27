const test = require("node:test");
const assert = require("node:assert/strict");
const Dealership = require("../models/Dealership");
const User = require("../models/User");
const { runDealershipOwnershipMigration } = require("../scripts/migrateDealershipOwnership");

const mockQuery = (rows) => ({
    select() {
        return this;
    },
    lean: async () => rows,
});

test("migration dry-run proposes unambiguous staff provider and reports ambiguous/unassigned records without mutating", async () => {
    const origDealershipFind = Dealership.find;
    const origDealershipUpdateOne = Dealership.updateOne;
    const origUserFind = User.find;

    let updateCalled = 0;

    Dealership.find = () =>
        mockQuery([
            { _id: "d1", name: "Alpha Motors", city: "Pune", owner: "p1", staff: [] },
            { _id: "d2", name: "Beta Bikes", city: "Mumbai", owner: null, staff: [{ user: "p2", role: "manager" }] },
            {
                _id: "d3",
                name: "Gamma Moto",
                city: "Delhi",
                owner: null,
                staff: [
                    { user: "p3", role: "sales" },
                    { user: "p4", role: "sales" },
                ],
            },
            { _id: "d4", name: "Delta Wheels", city: "Bengaluru", owner: null, staff: [] },
        ]);

    Dealership.updateOne = async () => {
        updateCalled += 1;
        return { modifiedCount: 1 };
    };

    User.find = () =>
        mockQuery([
            { _id: "p1", name: "Owner One", email: "p1@test.com", phone: "111" },
            { _id: "p2", name: "Manager Two", email: "p2@test.com", phone: "222" },
            { _id: "p3", name: "Sales Three", email: "p3@test.com", phone: "333" },
            { _id: "p4", name: "Sales Four", email: "p4@test.com", phone: "444" },
            { _id: "p5", name: "Unassigned Five", email: "p5@test.com", phone: "555" },
        ]);

    try {
        const report = await runDealershipOwnershipMigration({ apply: false });
        assert.equal(report.mode, "dry-run");
        assert.equal(updateCalled, 0);
        assert.equal(report.totals.alreadyOwned, 1);
        assert.equal(report.totals.proposedAssignments, 1);
        assert.equal(report.proposedAssignments[0].dealershipId, "d2");
        assert.equal(report.proposedAssignments[0].providerId, "p2");
        assert.equal(report.ambiguousDealerships.length, 1);
        assert.equal(report.ambiguousDealerships[0].dealershipId, "d3");
        assert.equal(report.totals.unassignedDealerships, 2);
        assert.equal(report.totals.unassignedProviders, 1);
        assert.equal(report.unassignedProviders[0].providerId, "p5");
    } finally {
        Dealership.find = origDealershipFind;
        Dealership.updateOne = origDealershipUpdateOne;
        User.find = origUserFind;
    }
});

test("migration apply only updates dealerships with null owner and unambiguous candidate", async () => {
    const origDealershipFind = Dealership.find;
    const origDealershipUpdateOne = Dealership.updateOne;
    const origUserFind = User.find;

    const updates = [];

    Dealership.find = () =>
        mockQuery([
            { _id: "d2", name: "Beta Bikes", city: "Mumbai", owner: null, staff: [{ user: "p2", role: "manager" }] },
            { _id: "d4", name: "Delta Wheels", city: "Bengaluru", owner: null, staff: [] },
        ]);

    Dealership.updateOne = async (filter, update) => {
        updates.push({ filter, update });
        return { modifiedCount: 1 };
    };

    User.find = () =>
        mockQuery([{ _id: "p2", name: "Manager Two", email: "p2@test.com", phone: "222" }]);

    try {
        const report = await runDealershipOwnershipMigration({ apply: true });
        assert.equal(report.mode, "apply");
        assert.equal(report.totals.appliedAssignments, 1);
        assert.equal(updates.length, 1);
        assert.equal(updates[0].filter._id, "d2");
        assert.equal(updates[0].update.$set.owner, "p2");
    } finally {
        Dealership.find = origDealershipFind;
        Dealership.updateOne = origDealershipUpdateOne;
        User.find = origUserFind;
    }
});
