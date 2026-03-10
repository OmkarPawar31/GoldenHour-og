import dotenv from "dotenv";
import path from "path";

// Load from server/.env first, then fall back to root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGO_URI:
    process.env.MONGO_URI ||
    "mongodb+srv://goldenhour:p96WIDibq86JsNzA@goldenhour.np5fnid.mongodb.net/goldenhour?appName=goldenhour",
  JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production",
  NODE_ENV: process.env.NODE_ENV || "development",
};
