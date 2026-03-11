"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load from server/.env first, then fall back to root .env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../../../.env") });
exports.env = {
    PORT: parseInt(process.env.PORT || "5000", 10),
    MONGO_URI: process.env.MONGO_URI ||
        "mongodb+srv://goldenhour:p96WIDibq86JsNzA@goldenhour.np5fnid.mongodb.net/goldenhour?appName=goldenhour",
    JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production",
    NODE_ENV: process.env.NODE_ENV || "development",
};
