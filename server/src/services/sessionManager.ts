const activeSessions = new Map<string, { userId: string; vehicleId: string | null; startedAt: Date }>();

export function createSession(sessionId: string, userId: string) {
  activeSessions.set(sessionId, { userId, vehicleId: null, startedAt: new Date() });
}

export function assignVehicle(sessionId: string, vehicleId: string) {
  const session = activeSessions.get(sessionId);
  if (session) session.vehicleId = vehicleId;
}

export function endSession(sessionId: string) {
  activeSessions.delete(sessionId);
}

export function getSession(sessionId: string) {
  return activeSessions.get(sessionId) ?? null;
}
