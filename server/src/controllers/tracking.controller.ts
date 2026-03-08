import { Request, Response } from "express";

export async function updateLocation(req: Request, res: Response) {
  // TODO: Update vehicle location
  res.json({ message: "Location updated" });
}

export async function getTrackingInfo(req: Request, res: Response) {
  const { sessionId } = req.params;
  // TODO: Get tracking info for session
  res.json({ message: `Tracking for session ${sessionId}` });
}
