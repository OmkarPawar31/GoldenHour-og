import EmergencySession, { IEmergencySession } from "../models/EmergencySession";
import Vehicle from "../models/Vehicle";

// In-memory cache for fast lookups of active sessions
const activeSessionCache = new Map<string, { userId: string; vehicleId: string | null; startedAt: Date }>();

export async function createSession(
  userId: string,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number } | null,
  vehicleId: string | null,
  priority: "critical" | "high" | "medium" | "low"
): Promise<IEmergencySession> {
  const session = await EmergencySession.create({
    userId,
    vehicleId,
    status: "active",
    priority,
    origin,
    destination,
  });

  activeSessionCache.set(session._id.toString(), {
    userId,
    vehicleId,
    startedAt: new Date(),
  });

  return session;
}

export async function endSession(sessionId: string): Promise<IEmergencySession | null> {
  const session = await EmergencySession.findByIdAndUpdate(
    sessionId,
    { status: "resolved", resolvedAt: new Date() },
    { new: true }
  );

  if (session?.vehicleId) {
    await Vehicle.findByIdAndUpdate(session.vehicleId, { status: "available" });
  }

  activeSessionCache.delete(sessionId);
  return session;
}

export async function getSession(sessionId: string): Promise<IEmergencySession | null> {
  return EmergencySession.findById(sessionId)
    .populate("userId", "name email phone")
    .populate("vehicleId");
}

export async function getActiveSessions(): Promise<IEmergencySession[]> {
  return EmergencySession.find({ status: { $in: ["pending", "active"] } })
    .populate("userId", "name email phone")
    .populate("vehicleId")
    .sort({ createdAt: -1 });
}

export function isSessionCached(sessionId: string): boolean {
  return activeSessionCache.has(sessionId);
}
