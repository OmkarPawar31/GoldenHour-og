import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/golden-hour",
  JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production",
  NODE_ENV: process.env.NODE_ENV || "development",
};
