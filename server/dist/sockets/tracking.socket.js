"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTrackingSocket = setupTrackingSocket;
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const geoFencingService_1 = require("../services/geoFencingService");
const greenCorridorService_1 = require("../services/greenCorridorService");
function setupTrackingSocket(io) {
    const ns = io.of("/tracking");
    ns.on("connection", (socket) => {
        console.log("Tracking socket connected:", socket.id);
        socket.on("location-update", async (data) => {
            try {
                // Persist location to DB
                await Vehicle_1.default.findByIdAndUpdate(data.vehicleId, {
                    location: { lat: data.lat, lng: data.lng },
                });
                // Broadcast to session room and globally
                const payload = {
                    vehicleId: data.vehicleId,
                    lat: data.lat,
                    lng: data.lng,
                    speed: data.speed || 0,
                    timestamp: new Date(),
                };
                if (data.sessionId) {
                    ns.to(data.sessionId).emit("vehicle-moved", payload);
                    // Check if vehicle is within geo-fence of the corridor
                    const corridor = (0, greenCorridorService_1.getActiveCorridor)(data.sessionId);
                    if (corridor && corridor.length > 0) {
                        // Check against corridor waypoints (200m radius per SRS FR18)
                        const isNearCorridor = corridor.some((point) => (0, geoFencingService_1.isInsideGeoFence)({ lat: data.lat, lng: data.lng }, { center: point, radiusMeters: 200 }));
                        if (isNearCorridor) {
                            socket.emit("corridor-proximity", {
                                sessionId: data.sessionId,
                                inRange: true,
                                message: "You are within the emergency corridor. Please clear the way.",
                            });
                        }
                    }
                }
                else {
                    ns.emit("vehicle-moved", payload);
                }
            }
            catch (error) {
                socket.emit("error", { message: "Failed to update location" });
            }
        });
        socket.on("join-session", (sessionId) => {
            socket.join(sessionId);
        });
        socket.on("leave-session", (sessionId) => {
            socket.leave(sessionId);
        });
        socket.on("disconnect", () => {
            console.log("Tracking socket disconnected:", socket.id);
        });
    });
}
