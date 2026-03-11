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
const ORG_NAME = "Organizer Default";
const ORG_EMAIL = "org";
const ORG_PASSWORD = "123456";
const ORG_PHONE = "0000000000";
// ─────────────────────────────────────────────────────────────────────────────
async function createOrganizer() {
    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose_1.default.connect(MONGO_URI);
    console.log("✅ Connected!");
    const existing = await User_1.default.findOne({ email: ORG_EMAIL });
    if (existing) {
        console.log(`⚠️  Organizer with email (username) "${ORG_EMAIL}" already exists.`);
        await mongoose_1.default.disconnect();
        return;
    }
    const organizer = new User_1.default({
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
    await mongoose_1.default.disconnect();
}
createOrganizer().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
