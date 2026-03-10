"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEmergencySocket = setupEmergencySocket;
const EmergencySession_1 = __importDefault(require("../models/EmergencySession"));
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const Route_1 = __importDefault(require("../models/Route"));
const routeService_1 = require("../services/routeService");
const greenCorridorService_1 = require("../services/greenCorridorService");
function setupEmergencySocket(io) {
    const ns = io.of("/emergency");
    ns.on("connection", (socket) => {
        console.log("Emergency socket connected:", socket.id);
        socket.on("trigger", async (data) => {
            try {
                // Determine priority from vehicle type
                let priority = "medium";
                if (data.vehicleId) {
                    const vehicle = await Vehicle_1.default.findById(data.vehicleId);
                    if (vehicle?.type === "ambulance")
                        priority = "critical";
                    else if (vehicle?.type === "private")
                        priority = "high";
                }
                const session = await EmergencySession_1.default.create({
                    userId: data.userId,
                    vehicleId: data.vehicleId || null,
                    status: "active",
                    priority,
                    origin: data.origin,
                    destination: data.destination || null,
                });
                // Compute route and activate corridor
                if (data.destination) {
                    const routeData = await (0, routeService_1.computeOptimalRoute)({
                        origin: data.origin,
                        destination: data.destination,
                    });
                    await Route_1.default.create({
                        sessionId: session._id,
                        path: routeData.path,
                        estimatedTime: routeData.estimatedTime,
                        distance: routeData.distance,
                    });
                    (0, greenCorridorService_1.activateGreenCorridor)(session._id.toString(), routeData.path);
                }
                if (data.vehicleId) {
                    await Vehicle_1.default.findByIdAndUpdate(data.vehicleId, { status: "en-route" });
                }
                // Join the session room
                socket.join(session._id.toString());
                // Broadcast to all connected clients
                ns.emit("new-emergency", {
                    sessionId: session._id,
                    priority,
                    origin: data.origin,
                    destination: data.destination,
                });
                socket.emit("emergency-created", { sessionId: session._id, priority });
            }
            catch (error) {
                socket.emit("error", { message: "Failed to create emergency session" });
            }
        });
        socket.on("resolve", async (data) => {
            try {
                const session = await EmergencySession_1.default.findByIdAndUpdate(data.sessionId, { status: "resolved", resolvedAt: new Date() }, { new: true });
                if (session?.vehicleId) {
                    await Vehicle_1.default.findByIdAndUpdate(session.vehicleId, { status: "available" });
                }
                (0, greenCorridorService_1.deactivateGreenCorridor)(data.sessionId);
                ns.emit("emergency-resolved", { sessionId: data.sessionId });
            }
            catch (error) {
                socket.emit("error", { message: "Failed to resolve emergency" });
            }
        });
        socket.on("join-session", (sessionId) => {
            socket.join(sessionId);
        });
        socket.on("disconnect", () => {
            console.log("Emergency socket disconnected:", socket.id);
        });
    });
}
