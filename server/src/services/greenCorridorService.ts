import { getIO } from "../config/socket";

export function activateGreenCorridor(sessionId: string, routePoints: { lat: number; lng: number }[]) {
  const io = getIO();
  io.emit("green-corridor:activate", { sessionId, routePoints });
  // TODO: Notify traffic systems along the corridor
}

export function deactivateGreenCorridor(sessionId: string) {
  const io = getIO();
  io.emit("green-corridor:deactivate", { sessionId });
}
