"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.formatDate = formatDate;
const crypto_1 = __importDefault(require("crypto"));
function generateId() {
    return crypto_1.default.randomUUID();
}
function formatDate(date) {
    return date.toISOString();
}
