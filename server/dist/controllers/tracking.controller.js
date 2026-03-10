"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocation = updateLocation;
exports.getTrackingInfo = getTrackingInfo;
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const EmergencySession_1 = __importDefault(require("../models/EmergencySession"));
const Route_1 = __importDefault(require("../models/Route"));
async function updateLocation(req, res) {
    try {
        const { vehicleId, lat, lng } = req.body;
        if (!vehicleId || lat == null || lng == null) {
            return res.status(400).json({ message: "vehicleId, lat, and lng are required" });
        }
        const vehicle = await Vehicle_1.default.findByIdAndUpdate(vehicleId, { location: { lat, lng } }, { new: true });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        res.json({ vehicle });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update location" });
    }
}
async function getTrackingInfo(req, res) {
    try {
        const { sessionId } = req.params;
        const session = await EmergencySession_1.default.findById(sessionId)
            .populate("userId", "name phone")
            .populate("vehicleId");
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        const route = await Route_1.default.findOne({ sessionId });
        res.json({ session, route });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to get tracking info" });
    }
}
