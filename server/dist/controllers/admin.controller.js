"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = getDashboard;
exports.getAllUsers = getAllUsers;
exports.getAllSessions = getAllSessions;
const EmergencySession_1 = __importDefault(require("../models/EmergencySession"));
const User_1 = __importDefault(require("../models/User"));
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
async function getDashboard(req, res) {
    try {
        const [activeEmergencies, totalUsers, availableVehicles] = await Promise.all([
            EmergencySession_1.default.countDocuments({ status: { $in: ["pending", "active"] } }),
            User_1.default.countDocuments(),
            Vehicle_1.default.countDocuments({ status: "available" }),
        ]);
        const recentSessions = await EmergencySession_1.default.find()
            .populate("userId", "name email")
            .populate("vehicleId")
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({ activeEmergencies, totalUsers, availableVehicles, recentSessions });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
}
async function getAllUsers(req, res) {
    try {
        const users = await User_1.default.find().select("-password").sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
}
async function getAllSessions(req, res) {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && typeof status === "string") {
            filter.status = status;
        }
        const sessions = await EmergencySession_1.default.find(filter)
            .populate("userId", "name email phone")
            .populate("vehicleId")
            .sort({ createdAt: -1 });
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch sessions" });
    }
}
