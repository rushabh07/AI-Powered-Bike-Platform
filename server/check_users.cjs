const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const User = require("./models/User");

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const users = await User.find({}, "-password");
        console.log(`Found ${users.length} users in database:`);
        users.forEach((u) => {
            console.log(`- Email: ${u.email} | Name: ${u.name} | Role: ${u.role}`);
        });

        const adminUsers = users.filter((u) => u.role === "admin");
        if (adminUsers.length === 0 && users.length > 0) {
            console.log("\nNo admin user found! Updating first user to admin role...");
            users[0].role = "admin";
            await users[0].save();
            console.log(`Updated user ${users[0].email} to role: 'admin'`);
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
