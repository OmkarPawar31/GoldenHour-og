import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { setupEmergencySocket } from "../sockets/emergency.socket";
import { setupTrackingSocket } from "../sockets/tracking.socket";

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  setupEmergencySocket(io);
  setupTrackingSocket(io);

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
