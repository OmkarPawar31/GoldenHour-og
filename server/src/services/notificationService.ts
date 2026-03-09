import { getIO } from "../config/socket";
import Notification from "../models/Notification";

export async function sendNotification(userId: string, message: string) {
  // Persist to DB
  await Notification.create({ userId, message });

  // Push via socket
  const io = getIO();
  io.to(userId).emit("notification", { message, timestamp: new Date() });
}

export function broadcastAlert(message: string, sessionId?: string) {
  const io = getIO();
  const payload = { message, sessionId, timestamp: new Date() };

  if (sessionId) {
    // Emit to the specific session room + globally
    io.of("/emergency").emit("alert", payload);
    io.of("/tracking").to(sessionId).emit("alert", payload);
  } else {
    io.emit("alert", payload);
  }
}
