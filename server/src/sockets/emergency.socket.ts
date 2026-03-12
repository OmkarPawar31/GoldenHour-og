import { Server } from "socket.io";
import EmergencySession from "../models/EmergencySession";
import Vehicle from "../models/Vehicle";
import Route from "../models/Route";
import { computeOptimalRoute } from "../services/routeService";
import { activateGreenCorridor, deactivateGreenCorridor } from "../services/greenCorridorService";

export function setupEmergencySocket(io: Server) {
  const ns = io.of("/emergency");
  const adminNs = io.of("/admin-alerts");

  ns.on("connection", (socket) => {
    console.log("Emergency socket connected:", socket.id);

    socket.on("trigger", async (data: {
      userId: string;
      vehicleId?: string;
      origin: { lat: number; lng: number };
      destination?: { lat: number; lng: number };
    }) => {
      try {
        // Determine priority from vehicle type
        let priority: "critical" | "high" | "medium" | "low" = "medium";
        let vehicleInfo: { type?: string; plateNumber?: string } = {};
        if (data.vehicleId) {
          const vehicle = await Vehicle.findById(data.vehicleId);
          if (vehicle?.type === "ambulance") priority = "critical";
          else if (vehicle?.type === "private") priority = "high";
          vehicleInfo = { type: vehicle?.type, plateNumber: vehicle?.plateNumber };
        }

        const session = await EmergencySession.create({
          userId: data.userId,
          vehicleId: data.vehicleId || null,
          status: "active",
          priority,
          origin: data.origin,
          destination: data.destination || null,
        });

        // Compute route and activate corridor
        if (data.destination) {
          const routeData = await computeOptimalRoute({
            origin: data.origin,
            destination: data.destination,
          });
          await Route.create({
            sessionId: session._id,
            path: routeData.path,
            estimatedTime: routeData.estimatedTime,
            distance: routeData.distance,
          });
          activateGreenCorridor(session._id.toString(), routeData.path);

          // Notify admin about green corridor activation
          adminNs.emit("ambulance-alert", {
            type: "corridor-activated",
            vehicleId: data.vehicleId,
            plateNumber: vehicleInfo.plateNumber || "N/A",
            sessionId: session._id,
            lat: data.origin.lat,
            lng: data.origin.lng,
            speed: 0,
            message: `🟢 Green corridor activated for ${vehicleInfo.plateNumber || "vehicle"} — ${(routeData.distance / 1000).toFixed(1)}km route`,
            severity: "critical",
            timestamp: new Date(),
          });
        }

        if (data.vehicleId) {
          await Vehicle.findByIdAndUpdate(data.vehicleId, { status: "en-route" });
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

        // Alert admin about new emergency
        adminNs.emit("ambulance-alert", {
          type: "new-emergency",
          vehicleId: data.vehicleId,
          plateNumber: vehicleInfo.plateNumber || "N/A",
          sessionId: session._id,
          lat: data.origin.lat,
          lng: data.origin.lng,
          speed: 0,
          message: `🚨 New ${priority.toUpperCase()} emergency triggered — ${vehicleInfo.type || "unknown"} dispatched`,
          severity: priority === "critical" ? "critical" : "warning",
          timestamp: new Date(),
        });

        socket.emit("emergency-created", { sessionId: session._id, priority });
      } catch (error) {
        socket.emit("error", { message: "Failed to create emergency session" });
      }
    });

    socket.on("resolve", async (data: { sessionId: string }) => {
      try {
        const session = await EmergencySession.findByIdAndUpdate(
          data.sessionId,
          { status: "resolved", resolvedAt: new Date() },
          { new: true }
        );

        if (session?.vehicleId) {
          await Vehicle.findByIdAndUpdate(session.vehicleId, { status: "available" });
        }

        deactivateGreenCorridor(data.sessionId);
        ns.emit("emergency-resolved", { sessionId: data.sessionId });

        // Alert admin about resolved emergency
        adminNs.emit("ambulance-alert", {
          type: "emergency-resolved",
          vehicleId: session?.vehicleId?.toString(),
          plateNumber: "N/A",
          sessionId: data.sessionId,
          lat: 0,
          lng: 0,
          speed: 0,
          message: `✅ Emergency ${data.sessionId.slice(-6)} resolved — corridor deactivated`,
          severity: "info",
          timestamp: new Date(),
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to resolve emergency" });
      }
    });

    socket.on("join-session", (sessionId: string) => {
      socket.join(sessionId);
    });

    socket.on("disconnect", () => {
      console.log("Emergency socket disconnected:", socket.id);
    });
  });
}

