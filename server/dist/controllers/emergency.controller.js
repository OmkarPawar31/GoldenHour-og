"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmergency = createEmergency;
exports.getEmergency = getEmergency;
exports.getActiveEmergencies = getActiveEmergencies;
exports.updateEmergency = updateEmergency;
exports.resolveEmergency = resolveEmergency;
const EmergencySession_1 = __importDefault(require("../models/EmergencySession"));
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const Route_1 = __importDefault(require("../models/Route"));
const routeService_1 = require("../services/routeService");
const greenCorridorService_1 = require("../services/greenCorridorService");
const notificationService_1 = require("../services/notificationService");
async function createEmergency(req, res) {
    try {
        const { origin, destination, vehicleId } = req.body;
        const userId = req.user.id;
        if (!origin?.lat || !origin?.lng) {
            return res.status(400).json({ message: "Origin coordinates are required" });
        }
        // Determine priority based on vehicle type
        let priority = "medium";
        if (vehicleId) {
            const vehicle = await Vehicle_1.default.findById(vehicleId);
            if (vehicle?.type === "ambulance")
                priority = "critical";
            else if (vehicle?.type === "private")
                priority = "high";
        }
        const session = await EmergencySession_1.default.create({
            userId,
            vehicleId: vehicleId || null,
            status: "active",
            priority,
            origin,
            destination: destination || null,
        });
        // Compute route if destination provided
        let route = null;
        if (destination?.lat && destination?.lng) {
            const routeData = await (0, routeService_1.computeOptimalRoute)({ origin, destination });
            route = await Route_1.default.create({
                sessionId: session._id,
                path: routeData.path,
                estimatedTime: routeData.estimatedTime,
                distance: routeData.distance,
            });
            // Activate green corridor along route
            (0, greenCorridorService_1.activateGreenCorridor)(session._id.toString(), routeData.path);
        }
        // Mark vehicle as en-route
        if (vehicleId) {
            await Vehicle_1.default.findByIdAndUpdate(vehicleId, { status: "en-route" });
        }
        // Broadcast alert to nearby drivers
        (0, notificationService_1.broadcastAlert)(`Emergency ${priority} alert: ${priority === "critical" ? "Ambulance" : "Emergency vehicle"} en route. Please clear the way.`, session._id.toString());
        res.status(201).json({ session, route });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create emergency session" });
    }
}
async function getEmergency(req, res) {
    try {
        const { id } = req.params;
        const session = await EmergencySession_1.default.findById(id)
            .populate("userId", "name email phone role")
            .populate("vehicleId");
        if (!session) {
            return res.status(404).json({ message: "Emergency session not found" });
        }
        const route = await Route_1.default.findOne({ sessionId: id });
        res.json({ session, route });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch emergency session" });
    }
}
async function getActiveEmergencies(req, res) {
    try {
        const sessions = await EmergencySession_1.default.find({ status: { $in: ["pending", "active"] } })
            .populate("userId", "name email phone")
            .populate("vehicleId")
            .sort({ priority: 1, createdAt: -1 });
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch active emergencies" });
    }
}
async function updateEmergency(req, res) {
    try {
        const { id } = req.params;
        const { destination, status } = req.body;
        const session = await EmergencySession_1.default.findById(id);
        if (!session) {
            return res.status(404).json({ message: "Emergency session not found" });
        }
        if (destination) {
            session.destination = destination;
            // Recompute route
            const routeData = await (0, routeService_1.computeOptimalRoute)({ origin: session.origin, destination });
            await Route_1.default.findOneAndUpdate({ sessionId: id }, { path: routeData.path, estimatedTime: routeData.estimatedTime, distance: routeData.distance }, { upsert: true });
            (0, greenCorridorService_1.activateGreenCorridor)(id, routeData.path);
        }
        if (status && ["pending", "active", "cancelled"].includes(status)) {
            session.status = status;
        }
        await session.save();
        res.json({ session });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update emergency session" });
    }
}
async function resolveEmergency(req, res) {
    try {
        const { id } = req.params;
        const session = await EmergencySession_1.default.findById(id);
        if (!session) {
            return res.status(404).json({ message: "Emergency session not found" });
        }
        session.status = "resolved";
        session.resolvedAt = new Date();
        await session.save();
        // Release vehicle
        if (session.vehicleId) {
            await Vehicle_1.default.findByIdAndUpdate(session.vehicleId, { status: "available" });
        }
        // Deactivate green corridor
        (0, greenCorridorService_1.deactivateGreenCorridor)(id);
        // Notify all listeners
        (0, notificationService_1.broadcastAlert)(`Emergency session resolved.`, id);
        res.json({ session });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to resolve emergency session" });
    }
}
