import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User from "../models/User";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://goldenhour:p96WIDibq86JsNzA@goldenhour.np5fnid.mongodb.net/goldenhour?appName=goldenhour";

// ─── Edit these before running ───────────────────────────────────────────────
const ORG_NAME = "Organizer Default";
const ORG_EMAIL = "org";
const ORG_PASSWORD = "123456";
const ORG_PHONE = "0000000000";
// ─────────────────────────────────────────────────────────────────────────────

async function createOrganizer() {
  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected!");

  const existing = await User.findOne({ email: ORG_EMAIL });
  if (existing) {
    console.log(`⚠️  Organizer with email (username) "${ORG_EMAIL}" already exists.`);
    await mongoose.disconnect();
    return;
  }

  const organizer = new User({
    name: ORG_NAME,
    email: ORG_EMAIL,
    password: ORG_PASSWORD, // will be hashed by the pre-save hook
    role: "organizer",
    phone: ORG_PHONE,
  });

  await organizer.save();
  console.log("🎉 Organizer created successfully!");
  console.log(`   Name     : ${ORG_NAME}`);
  console.log(`   Username : ${ORG_EMAIL}`);
  console.log(`   Pass     : ${ORG_PASSWORD}`);

  await mongoose.disconnect();
}

createOrganizer().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
