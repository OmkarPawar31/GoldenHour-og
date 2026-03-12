import { Server } from "socket.io";
import Vehicle from "../models/Vehicle";
import { isInsideGeoFence } from "../services/geoFencingService";
import { getActiveCorridor } from "../services/greenCorridorService";

export function setupTrackingSocket(io: Server) {
  const ns = io.of("/tracking");
  const adminNs = io.of("/admin-alerts");

  // Admin alerts namespace — admin dashboard connects here
  adminNs.on("connection", (socket) => {
    console.log("Admin alerts socket connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Admin alerts socket disconnected:", socket.id);
    });
  });

  ns.on("connection", (socket) => {
    console.log("Tracking socket connected:", socket.id);

    socket.on("location-update", async (data: {
      vehicleId: string;
      sessionId?: string;
      lat: number;
      lng: number;
      speed?: number;
    }) => {
      try {
        // Persist location to DB
        const vehicle = await Vehicle.findByIdAndUpdate(data.vehicleId, {
          location: { lat: data.lat, lng: data.lng },
        }, { new: true });

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
          const corridor = getActiveCorridor(data.sessionId);
          if (corridor && corridor.length > 0) {
            // Check against corridor waypoints (200m radius per SRS FR18)
            const isNearCorridor = corridor.some((point) =>
              isInsideGeoFence({ lat: data.lat, lng: data.lng }, { center: point, radiusMeters: 200 })
            );

            if (isNearCorridor) {
              socket.emit("corridor-proximity", {
                sessionId: data.sessionId,
                inRange: true,
                message: "You are within the emergency corridor. Please clear the way.",
              });

              // Broadcast ambulance alert to admin dashboard
              adminNs.emit("ambulance-alert", {
                type: "corridor-proximity",
                vehicleId: data.vehicleId,
                plateNumber: vehicle?.plateNumber || data.vehicleId,
                sessionId: data.sessionId,
                lat: data.lat,
                lng: data.lng,
                speed: data.speed || 0,
                message: `Ambulance ${vehicle?.plateNumber || data.vehicleId.slice(-6)} detected in emergency corridor`,
                severity: "critical",
                timestamp: new Date(),
              });
            }
          }

          // Always notify admin of active ambulance movement
          if (vehicle?.type === "ambulance") {
            adminNs.emit("ambulance-alert", {
              type: "ambulance-moving",
              vehicleId: data.vehicleId,
              plateNumber: vehicle?.plateNumber || data.vehicleId,
              sessionId: data.sessionId,
              lat: data.lat,
              lng: data.lng,
              speed: data.speed || 0,
              message: `Ambulance ${vehicle?.plateNumber || data.vehicleId.slice(-6)} en-route — ${data.speed || 0} km/h`,
              severity: "warning",
              timestamp: new Date(),
            });
          }
        } else {
          ns.emit("vehicle-moved", payload);
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to update location" });
      }
    });

    socket.on("join-session", (sessionId: string) => {
      socket.join(sessionId);
    });

    socket.on("leave-session", (sessionId: string) => {
      socket.leave(sessionId);
    });

    socket.on("disconnect", () => {
      console.log("Tracking socket disconnected:", socket.id);
    });
  });
}
