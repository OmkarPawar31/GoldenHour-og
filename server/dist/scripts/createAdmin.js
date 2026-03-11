"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
const MONGO_URI = process.env.MONGO_URI ||
    "mongodb+srv://goldenhour:p96WIDibq86JsNzA@goldenhour.np5fnid.mongodb.net/goldenhour?appName=goldenhour";
// ─── Edit these before running ───────────────────────────────────────────────
const ADMIN_NAME = "Admin";
const ADMIN_EMAIL = "admin@goldenhour.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_PHONE = "0000000000";
// ─────────────────────────────────────────────────────────────────────────────
async function createAdmin() {
    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose_1.default.connect(MONGO_URI);
    console.log("✅ Connected!");
    const existing = await User_1.default.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        console.log(`⚠️  Admin with email "${ADMIN_EMAIL}" already exists.`);
        await mongoose_1.default.disconnect();
        return;
    }
    const admin = new User_1.default({
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
    await mongoose_1.default.disconnect();
}
createAdmin().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
