import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import EmergencySession from "../models/EmergencySession";
import Vehicle from "../models/Vehicle";
import Route from "../models/Route";
import { computeOptimalRoute } from "../services/routeService";
import { activateGreenCorridor, deactivateGreenCorridor } from "../services/greenCorridorService";
import { broadcastAlert } from "../services/notificationService";

export async function createEmergency(req: AuthRequest, res: Response) {
  try {
    const { origin, destination, vehicleId } = req.body;
    const userId = req.user!.id;

    if (!origin?.lat || !origin?.lng) {
      return res.status(400).json({ message: "Origin coordinates are required" });
    }

    // Determine priority based on vehicle type
    let priority: "critical" | "high" | "medium" | "low" = "medium";
    if (vehicleId) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle?.type === "ambulance") priority = "critical";
      else if (vehicle?.type === "private") priority = "high";
    }

    const session = await EmergencySession.create({
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
      const routeData = await computeOptimalRoute({ origin, destination });
      route = await Route.create({
        sessionId: session._id,
        path: routeData.path,
        estimatedTime: routeData.estimatedTime,
        distance: routeData.distance,
      });

      // Activate green corridor along route
      activateGreenCorridor(session._id.toString(), routeData.path);
    }

    // Mark vehicle as en-route
    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, { status: "en-route" });
    }

    // Broadcast alert to nearby drivers
    broadcastAlert(
      `Emergency ${priority} alert: ${priority === "critical" ? "Ambulance" : "Emergency vehicle"} en route. Please clear the way.`,
      session._id.toString()
    );

    res.status(201).json({ session, route });
  } catch (error) {
    res.status(500).json({ message: "Failed to create emergency session" });
  }
}

export async function getEmergency(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const session = await EmergencySession.findById(id)
      .populate("userId", "name email phone role")
      .populate("vehicleId");

    if (!session) {
      return res.status(404).json({ message: "Emergency session not found" });
    }

    const route = await Route.findOne({ sessionId: id });
    res.json({ session, route });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch emergency session" });
  }
}

export async function getActiveEmergencies(req: AuthRequest, res: Response) {
  try {
    const sessions = await EmergencySession.find({ status: { $in: ["pending", "active"] } })
      .populate("userId", "name email phone")
      .populate("vehicleId")
      .sort({ priority: 1, createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active emergencies" });
  }
}

export async function updateEmergency(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { destination, status } = req.body;

    const session = await EmergencySession.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Emergency session not found" });
    }

    if (destination) {
      session.destination = destination;
      // Recompute route
      const routeData = await computeOptimalRoute({ origin: session.origin, destination });
      await Route.findOneAndUpdate(
        { sessionId: id },
        { path: routeData.path, estimatedTime: routeData.estimatedTime, distance: routeData.distance },
        { upsert: true }
      );
      activateGreenCorridor(id, routeData.path);
    }

    if (status && ["pending", "active", "cancelled"].includes(status)) {
      session.status = status;
    }

    await session.save();
    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: "Failed to update emergency session" });
  }
}

export async function resolveEmergency(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const session = await EmergencySession.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Emergency session not found" });
    }

    session.status = "resolved";
    session.resolvedAt = new Date();
    await session.save();

    // Release vehicle
    if (session.vehicleId) {
      await Vehicle.findByIdAndUpdate(session.vehicleId, { status: "available" });
    }

    // Deactivate green corridor
    deactivateGreenCorridor(id);

    // Notify all listeners
    broadcastAlert(`Emergency session resolved.`, id);

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: "Failed to resolve emergency session" });
  }
}
