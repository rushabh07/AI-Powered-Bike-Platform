const test = require("node:test");
const assert = require("node:assert/strict");

const { makeReviews } = require("../scripts/seedDemoReviews");
const DemoReview = require("../models/DemoReview");

test("seed data creates five distinct, dated, motorcycle-specific demo reviews", () => {
    const bike = {
        _id: "507f1f77bcf86cd799439011",
        brand: "Ather",
        name: "450X",
        category: "Electric",
        range: 150,
    };
    const reviews = makeReviews(bike);

    assert.equal(reviews.length, 5);
    assert.deepEqual(new Set(reviews.map((review) => review.category)).size, 5);
    for (const review of reviews) {
        assert.equal(review.motorcycle, bike._id);
        assert.ok(review.reviewerName);
        assert.ok(review.title.length >= 3);
        assert.ok(review.comment.includes("Ather 450X"));
        assert.ok(review.rating >= 1 && review.rating <= 5);
        assert.ok(review.reviewDate instanceof Date);
        assert.match(review.demoKey, /^sample-.+-v1$/);
    }
    assert.match(reviews.find((review) => review.category === "mileage").comment, /150 km/);
});

test("demo reviews have a separate schema without genuine purchase verification fields", () => {
    assert.equal(DemoReview.schema.path("verifiedPurchase"), undefined);
    assert.equal(DemoReview.schema.path("order"), undefined);
    assert.ok(DemoReview.schema.indexes().some(([index, options]) =>
        index.motorcycle === 1 && index.demoKey === 1 && options.unique === true
    ));
});
