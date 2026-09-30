const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Motorcycle = require("./models/Motorcycle");
  const catalog = await Motorcycle.find({}).lean();
  const { _localRecommend: rec } = require("./controllers/aiAdvisorController");
  const byName = (n) => catalog.find((b) => `${b.brand} ${b.name}`.toLowerCase().includes(n.toLowerCase()));
  const H = (name) => [{ role: "assistant", content: "...", recommendations: [byName(name)._id] }];
  const show = (label, out) => {
    console.log(`--- ${label}`);
    console.log("reply:", out.reply.slice(0, 200).replace(/\n/g, " "));
    console.log("recs:", out.recommendations.map((b) => `${b.brand} ${b.name}`).join(" | ") || "(none)");
  };

  show("follow-up city (budget 2L in history)", rec("Mostly city riding", catalog, [
    { role: "user", content: "I want a bike under Rs.2 lakh" },
    { role: "assistant", content: "What type of riding?", recommendations: [] },
  ]));

  show("budget override 2L->2.5L", rec("Actually, my budget is Rs.2.5 lakh", catalog, [
    { role: "user", content: "I want a bike under Rs.2 lakh" },
  ]));

  const h3 = [
    { role: "user", content: "Suggest a bike under Rs.2 lakh" },
    { role: "assistant", content: "Here you go", recommendations: [byName("Hunter 350")._id, byName("Classic 350")._id] },
  ];
  show("aspect follow-up (mileage)", rec("What about mileage?", catalog, h3));
  show("pronoun (which lighter)", rec("Which one is lighter?", catalog, h3));
  show("ordinal compare (first two)", rec("Compare the first two", catalog, [
    { role: "user", content: "Suggest bikes" },
    { role: "assistant", content: "Here", recommendations: [byName("Hunter 350")._id, byName("Classic 350")._id, byName("MT-15")._id] },
  ]));
  show("its price", rec("What about its price?", catalog, h3));
  show("general (ABS)", rec("How does ABS work?", catalog, [
    { role: "user", content: "Suggest a bike under Rs.2 lakh" },
  ]));
  show("second one", rec("Tell me more about the second one", catalog, h3));

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
