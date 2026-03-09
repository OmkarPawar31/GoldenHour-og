import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import EmergencySession from "../models/EmergencySession";
import User from "../models/User";
import Vehicle from "../models/Vehicle";

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const [activeEmergencies, totalUsers, availableVehicles] = await Promise.all([
      EmergencySession.countDocuments({ status: { $in: ["pending", "active"] } }),
      User.countDocuments(),
      Vehicle.countDocuments({ status: "available" }),
    ]);

    const recentSessions = await EmergencySession.find()
      .populate("userId", "name email")
      .populate("vehicleId")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ activeEmergencies, totalUsers, availableVehicles, recentSessions });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
}

export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

export async function getAllSessions(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status && typeof status === "string") {
      filter.status = status;
    }

    const sessions = await EmergencySession.find(filter)
      .populate("userId", "name email phone")
      .populate("vehicleId")
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
}
