const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Motorcycle = require("../models/Motorcycle");
const Review = require("../models/Review");
const DemoReview = require("../models/DemoReview");

const reviewers = ["Aarav Mehta", "Priya Nair", "Kunal Shah", "Sana Iyer", "Rohan Das"];
const ageDays = [18, 39, 67, 98, 137];

const makeReviews = (bike) => {
    const label = `${bike.brand} ${bike.name}`.trim();
    const isElectric = String(bike.category || "").toLowerCase().includes("electric");
    const rangeText = Number(bike.range) > 0 ? ` The listed range is about ${bike.range} km` : " The range is useful for regular local trips";
    const mileageText = Number(bike.mileage) > 0 ? ` The listed mileage is around ${bike.mileage} km/l` : " Mileage feels reasonable for this class";
    return [
        {
            category: "performance", rating: 5, title: "Responsive power for everyday rides",
            comment: `The ${label} pulls away smoothly and feels composed when accelerating. It has enough performance for my usual commute without feeling tiring in traffic.`,
        },
        {
            category: "mileage", rating: 4,
            title: isElectric ? "Useful range for regular trips" : "Practical mileage for daily use",
            comment: isElectric
                ? `I find the ${label} easy to plan around for regular city trips.${rangeText}. Charging access still matters for longer rides.`
                : `The ${label} feels practical for daily commuting.${mileageText}; riding style and traffic make a noticeable difference, so I would not expect the same figure on every route.`,
        },
        {
            category: "comfort", rating: 4, title: "Comfortable through a longer ride",
            comment: `The ${label} has a relaxed riding position and the seat stays comfortable on a longer stretch. Bumpy roads are noticeable, but it works well for everyday use.`,
        },
        {
            category: "design", rating: 5, title: "Well-finished design for the price",
            comment: `The ${label} looks distinctive in person and the finish feels thoughtfully put together. Considering what it offers, it comes across as good value for money.`,
        },
        {
            category: "handling", rating: 4, title: "Easy to place and handle",
            comment: `The ${label} feels predictable while turning and is easy to place in slower traffic. It stays stable at normal road speeds and feels approachable for everyday rides.`,
        },
    ].map((review, index) => ({
        motorcycle: bike._id,
        demoKey: `sample-${review.category}-v1`,
        reviewerName: reviewers[index],
        ...review,
        reviewDate: new Date(Date.now() - ageDays[index] * 24 * 60 * 60 * 1000),
    }));
};

const syncCachedRating = async (motorcycleId) => {
    const [genuine, demo] = await Promise.all([
        Review.find({ motorcycle: motorcycleId, status: "approved" }).select("rating").lean(),
        DemoReview.find({ motorcycle: motorcycleId }).select("rating").lean(),
    ]);
    const reviews = [...genuine, ...demo];
    const distribution = [1, 2, 3, 4, 5].map((star) => reviews.filter((review) => review.rating === star).length);
    const average = reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
        : 0;
    await Motorcycle.findByIdAndUpdate(motorcycleId, {
        $set: { rating: average, reviewCount: reviews.length, ratingDistribution: distribution },
    });
};

const seedDemoReviews = async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required.");
    await mongoose.connect(process.env.MONGO_URI);
    const motorcycles = await Motorcycle.find({}).select("_id name brand category mileage range").sort({ brand: 1, name: 1 }).lean();
    let upserted = 0;
    for (const bike of motorcycles) {
        for (const review of makeReviews(bike)) {
            await DemoReview.updateOne(
                { motorcycle: bike._id, demoKey: review.demoKey },
                { $setOnInsert: review },
                { upsert: true, runValidators: true }
            );
            upserted += 1;
        }
        await syncCachedRating(bike._id);
    }
    console.log(`Ensured ${upserted} demo review slots across ${motorcycles.length} motorcycles; existing demo records were preserved.`);
};

if (require.main === module) {
    seedDemoReviews()
        .catch((error) => {
            console.error("Demo review seeding failed:", error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.disconnect();
        });
}

module.exports = { makeReviews, seedDemoReviews };
