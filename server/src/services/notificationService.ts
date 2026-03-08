import { getIO } from "../config/socket";

export function sendNotification(userId: string, message: string) {
  const io = getIO();
  io.to(userId).emit("notification", { message, timestamp: new Date() });
}

export function broadcastAlert(message: string) {
  const io = getIO();
  io.emit("alert", { message, timestamp: new Date() });
}
