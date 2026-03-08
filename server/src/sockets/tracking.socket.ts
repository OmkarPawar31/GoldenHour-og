import { Server } from "socket.io";

export function setupTrackingSocket(io: Server) {
  const ns = io.of("/tracking");

  ns.on("connection", (socket) => {
    console.log("Tracking socket connected:", socket.id);

    socket.on("location-update", (data) => {
      // Broadcast location to relevant rooms
      socket.broadcast.emit("vehicle-moved", data);
    });

    socket.on("join-session", (sessionId: string) => {
      socket.join(sessionId);
    });

    socket.on("disconnect", () => {
      console.log("Tracking socket disconnected:", socket.id);
    });
  });
}
