"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.endSession = endSession;
exports.getSession = getSession;
exports.getActiveSessions = getActiveSessions;
exports.isSessionCached = isSessionCached;
const EmergencySession_1 = __importDefault(require("../models/EmergencySession"));
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
// In-memory cache for fast lookups of active sessions
const activeSessionCache = new Map();
async function createSession(userId, origin, destination, vehicleId, priority) {
    const session = await EmergencySession_1.default.create({
        userId,
        vehicleId,
        status: "active",
        priority,
        origin,
        destination,
    });
    activeSessionCache.set(session._id.toString(), {
        userId,
        vehicleId,
        startedAt: new Date(),
    });
    return session;
}
async function endSession(sessionId) {
    const session = await EmergencySession_1.default.findByIdAndUpdate(sessionId, { status: "resolved", resolvedAt: new Date() }, { new: true });
    if (session?.vehicleId) {
        await Vehicle_1.default.findByIdAndUpdate(session.vehicleId, { status: "available" });
    }
    activeSessionCache.delete(sessionId);
    return session;
}
async function getSession(sessionId) {
    return EmergencySession_1.default.findById(sessionId)
        .populate("userId", "name email phone")
        .populate("vehicleId");
}
async function getActiveSessions() {
    return EmergencySession_1.default.find({ status: { $in: ["pending", "active"] } })
        .populate("userId", "name email phone")
        .populate("vehicleId")
        .sort({ createdAt: -1 });
}
function isSessionCached(sessionId) {
    return activeSessionCache.has(sessionId);
}
