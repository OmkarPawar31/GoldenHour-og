import { Request, Response } from "express";

export async function getDashboard(req: Request, res: Response) {
  // TODO: Return admin dashboard data
  res.json({ activeEmergencies: 0, totalUsers: 0, availableVehicles: 0 });
}

export async function getAllUsers(req: Request, res: Response) {
  // TODO: Return all users
  res.json([]);
}

export async function getAllSessions(req: Request, res: Response) {
  // TODO: Return all emergency sessions
  res.json([]);
}
