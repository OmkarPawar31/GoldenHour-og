"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "../../.env" });
exports.env = {
    PORT: parseInt(process.env.PORT || "5000", 10),
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/golden-hour",
    JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production",
    NODE_ENV: process.env.NODE_ENV || "development",
};
