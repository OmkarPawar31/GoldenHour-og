import { Server } from "socket.io";

export function setupEmergencySocket(io: Server) {
  const ns = io.of("/emergency");

  ns.on("connection", (socket) => {
    console.log("Emergency socket connected:", socket.id);

    socket.on("trigger", (data) => {
      // TODO: Handle incoming emergency trigger
      ns.emit("new-emergency", data);
    });

    socket.on("resolve", (data) => {
      ns.emit("emergency-resolved", data);
    });

    socket.on("disconnect", () => {
      console.log("Emergency socket disconnected:", socket.id);
    });
  });
}
