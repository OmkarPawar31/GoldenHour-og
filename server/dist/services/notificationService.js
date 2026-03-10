"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
exports.broadcastAlert = broadcastAlert;
const socket_1 = require("../config/socket");
const Notification_1 = __importDefault(require("../models/Notification"));
async function sendNotification(userId, message) {
    // Persist to DB
    await Notification_1.default.create({ userId, message });
    // Push via socket
    const io = (0, socket_1.getIO)();
    io.to(userId).emit("notification", { message, timestamp: new Date() });
}
function broadcastAlert(message, sessionId) {
    const io = (0, socket_1.getIO)();
    const payload = { message, sessionId, timestamp: new Date() };
    if (sessionId) {
        // Emit to the specific session room + globally
        io.of("/emergency").emit("alert", payload);
        io.of("/tracking").to(sessionId).emit("alert", payload);
    }
    else {
        io.emit("alert", payload);
    }
}
