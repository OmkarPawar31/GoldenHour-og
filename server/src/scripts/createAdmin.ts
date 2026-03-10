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
const ADMIN_NAME = "Admin";
const ADMIN_EMAIL = "admin@goldenhour.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_PHONE = "0000000000";
// ─────────────────────────────────────────────────────────────────────────────

async function createAdmin() {
  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected!");

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`⚠️  Admin with email "${ADMIN_EMAIL}" already exists.`);
    await mongoose.disconnect();
    return;
  }

  const admin = new User({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD, // will be hashed by the pre-save hook
    role: "admin",
    phone: ADMIN_PHONE,
  });

  await admin.save();
  console.log("🎉 Admin created successfully!");
  console.log(`   Name  : ${ADMIN_NAME}`);
  console.log(`   Email : ${ADMIN_EMAIL}`);
  console.log(`   Pass  : ${ADMIN_PASSWORD}`);

  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
