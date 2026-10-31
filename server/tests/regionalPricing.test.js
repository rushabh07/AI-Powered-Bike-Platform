const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRegionalPricing, validateRegionalPrices } = require("../services/regionalPricingService");
const Motorcycle = require("../models/Motorcycle");
const MotorcycleVariant = require("../models/MotorcycleVariant");
const motorcycleRoutes = require("../routes/motorcycleRoutes");
const variantRoutes = require("../routes/variantRoutes");

test("regional pricing uses configured city charges and computes the final on-road total", () => {
    const price = calculateRegionalPricing({
        exShowroomPrice: 200000,
        state: "Maharashtra",
        city: "Pune",
        cityPrices: [{ state: "Maharashtra", city: "Pune", roadTax: 12000, insuranceAmount: 6500, otherCharges: 1500 }],
    });
    assert.equal(price.onRoadPrice, 220000);
    assert.equal(price.isFallback, false);
    assert.equal(price.rtoCharges, 12000);
    assert.equal(price.insuranceCharges, 6500);
    assert.equal(price.otherCharges, 1500);
    assert.equal(price.label, "On-road in Pune");
});

test("missing or incomplete city pricing is clearly marked as an estimate", () => {
    const price = calculateRegionalPricing({ exShowroomPrice: 200000, state: "Maharashtra", city: "Nagpur", cityPrices: [] });
    assert.equal(price.isFallback, true);
    assert.equal(price.label, "Estimated for Nagpur");
    assert.equal(price.rtoCharges + price.insuranceCharges + price.otherCharges + price.exShowroomPrice, price.onRoadPrice);
});

test("duplicate state/city rows and negative charge values are rejected", () => {
    assert.match(validateRegionalPrices([
        { state: "Maharashtra", city: "Pune", roadTax: 1 },
        { state: " maharashtra ", city: "pune", roadTax: 2 },
    ]), /Duplicate/);
    assert.match(validateRegionalPrices([{ state: "Maharashtra", city: "Pune", roadTax: -1 }]), /non-negative/);
    assert.equal(validateRegionalPrices([
        { state: "Maharashtra", city: "Pune", roadTax: 1 },
        { state: "Goa", city: "Pune", roadTax: 2 },
    ]), null);
});

test("motorcycle and variant schemas store regional charge breakdowns", () => {
    for (const schema of [Motorcycle.schema, MotorcycleVariant.schema]) {
        assert.ok(schema.path("cityPrices"));
        const rowSchema = schema.path("cityPrices").schema;
        assert.ok(rowSchema.path("state"));
        assert.ok(rowSchema.path("city"));
        assert.ok(rowSchema.path("roadTax"));
        assert.ok(rowSchema.path("insuranceAmount"));
        assert.ok(rowSchema.path("otherCharges"));
    }
});

test("regional price and variant write endpoints require authentication and admin role", () => {
    const protectedRoutes = [
        ...motorcycleRoutes.stack.filter((layer) => layer.route?.path === "/:id/regional-pricing"),
        ...variantRoutes.stack.filter((layer) => layer.route && (
            layer.route.path === "/admin/motorcycles/:motorcycleId" ||
            ["post", "put", "delete"].some((method) => layer.route.methods[method])
        )),
    ];
    assert.equal(protectedRoutes.length, 5);
    for (const layer of protectedRoutes) {
        const middlewares = layer.route.stack.map((item) => item.handle);
        assert.equal(layer.route.stack[0].name, "protect");
        const adminOnly = middlewares[1];
        let passed = false;
        const response = { status(code) { this.statusCode = code; return this; }, json() { return this; } };
        for (const role of ["customer", "provider"]) {
            passed = false;
            adminOnly({ user: { role } }, response, () => { passed = true; });
            assert.equal(passed, false);
            assert.equal(response.statusCode, 403);
        }
        adminOnly({ user: { role: "admin" } }, response, () => { passed = true; });
        assert.equal(passed, true);
    }
});
