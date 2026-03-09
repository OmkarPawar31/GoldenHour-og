import { Server } from "socket.io";
import Vehicle from "../models/Vehicle";
import { isInsideGeoFence } from "../services/geoFencingService";
import { getActiveCorridor } from "../services/greenCorridorService";

export function setupTrackingSocket(io: Server) {
  const ns = io.of("/tracking");

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
        await Vehicle.findByIdAndUpdate(data.vehicleId, {
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
            }
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
