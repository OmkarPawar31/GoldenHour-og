import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Vehicle from "../models/Vehicle";
import EmergencySession from "../models/EmergencySession";
import Route from "../models/Route";

export async function updateLocation(req: AuthRequest, res: Response) {
  try {
    const { vehicleId, lat, lng } = req.body;

    if (!vehicleId || lat == null || lng == null) {
      return res.status(400).json({ message: "vehicleId, lat, and lng are required" });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { location: { lat, lng } },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({ vehicle });
  } catch (error) {
    res.status(500).json({ message: "Failed to update location" });
  }
}

export async function getTrackingInfo(req: AuthRequest, res: Response) {
  try {
    const { sessionId } = req.params;

    const session = await EmergencySession.findById(sessionId)
      .populate("userId", "name phone")
      .populate("vehicleId");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const route = await Route.findOne({ sessionId });

    res.json({ session, route });
  } catch (error) {
    res.status(500).json({ message: "Failed to get tracking info" });
  }
}
