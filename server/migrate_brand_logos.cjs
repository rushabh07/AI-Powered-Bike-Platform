// One-time migration: backfills brandLogo for existing motorcycles
// that don't have one yet. Only verified live URLs are used;
// brands without a verified logo keep "" (UI shows monogram).
// Run: node migrate_brand_logos.cjs
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Motorcycle = require("./models/Motorcycle");

const LOGOS = {
    KTM: "https://cdn.worldvectorlogo.com/logos/ktm.svg",
    Yamaha: "https://cdn.worldvectorlogo.com/logos/yamaha.svg",
    Kawasaki: "https://cdn.worldvectorlogo.com/logos/kawasaki.svg",
    TVS: "https://cdn.worldvectorlogo.com/logos/tvs.svg",
    "Royal Enfield":
        "https://www.google.com/s2/favicons?domain=royalenfield.com&sz=128",
};

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    for (const [brand, logo] of Object.entries(LOGOS)) {
        const res = await Motorcycle.updateMany(
            {
                brand: new RegExp(`^${brand}$`, "i"),
                $or: [{ brandLogo: { $exists: false } }, { brandLogo: "" }],
            },
            { $set: { brandLogo: logo } }
        );
        console.log(`${brand}: updated ${res.modifiedCount} doc(s).`);
    }

    await mongoose.disconnect();
    console.log("Done.");
}

migrate().catch((e) => {
    console.error(e);
    process.exit(1);
});
