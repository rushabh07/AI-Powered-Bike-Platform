// One-time seed: inserts sample Electric motorcycles if none exist.
// Run: node seed_evs.cjs
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Motorcycle = require("./models/Motorcycle");

const EVS = [
    {
        name: "S1 Pro",
        brand: "Ola Electric",
        category: "Electric",
        price: 134999,
        engine: 0,
        mileage: 0,
        power: 11,
        torque: 58,
        rating: 4.5,
        fuel: "Electric",
        transmission: "Automatic",
        weight: 125,
        batteryCapacity: 4,
        range: 195,
        chargingTime: 6.5,
        image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=70",
        description: "Smart electric scooter with 195 km range, cruise control and a 7-inch touchscreen.",
    },
    {
        name: "450X",
        brand: "Ather",
        category: "Electric",
        price: 149999,
        engine: 0,
        mileage: 0,
        power: 8.7,
        torque: 26,
        rating: 4.7,
        fuel: "Electric",
        transmission: "Automatic",
        weight: 111,
        batteryCapacity: 3.7,
        range: 150,
        chargingTime: 5.5,
        image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=900&q=70",
        description: "Premium electric scooter with fast charging, 150 km range and connected ride stats.",
    },
    {
        name: "iQube",
        brand: "TVS",
        category: "Electric",
        price: 119999,
        engine: 0,
        mileage: 0,
        power: 5.9,
        torque: 33,
        rating: 4.4,
        fuel: "Electric",
        transmission: "Automatic",
        weight: 119,
        batteryCapacity: 3.4,
        range: 145,
        chargingTime: 4.5,
        image: "https://images.unsplash.com/photo-1615172282427-9a57ef2d142e?auto=format&fit=crop&w=900&q=70",
        description: "Practical city electric scooter with 145 km range and spacious underseat storage.",
    },
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const existing = await Motorcycle.countDocuments({ category: /^electric$/i });
    console.log(`Existing Electric bikes: ${existing}`);

    if (existing === 0) {
        await Motorcycle.insertMany(EVS);
        console.log(`Inserted ${EVS.length} Electric motorcycles.`);
    } else {
        console.log("Seed skipped — Electric bikes already present.");
    }

    await mongoose.disconnect();
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
