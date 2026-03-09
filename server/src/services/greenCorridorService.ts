import { getIO } from "../config/socket";

// Track active corridors in memory
const activeCorridors = new Map<string, { lat: number; lng: number }[]>();

export function activateGreenCorridor(sessionId: string, routePoints: { lat: number; lng: number }[]) {
  activeCorridors.set(sessionId, routePoints);

  const io = getIO();
  io.of("/emergency").emit("green-corridor:activate", { sessionId, routePoints });
  io.of("/tracking").emit("green-corridor:activate", { sessionId, routePoints });
}

export function deactivateGreenCorridor(sessionId: string) {
  activeCorridors.delete(sessionId);

  const io = getIO();
  io.of("/emergency").emit("green-corridor:deactivate", { sessionId });
  io.of("/tracking").emit("green-corridor:deactivate", { sessionId });
}

export function getActiveCorridor(sessionId: string): { lat: number; lng: number }[] | null {
  return activeCorridors.get(sessionId) ?? null;
}

export function getAllActiveCorridors(): Map<string, { lat: number; lng: number }[]> {
  return activeCorridors;
}
