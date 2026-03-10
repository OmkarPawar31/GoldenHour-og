"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const emergency_socket_1 = require("../sockets/emergency.socket");
const tracking_socket_1 = require("../sockets/tracking.socket");
let io;
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: { origin: "*" },
    });
    (0, emergency_socket_1.setupEmergencySocket)(io);
    (0, tracking_socket_1.setupTrackingSocket)(io);
    return io;
}
function getIO() {
    if (!io)
        throw new Error("Socket.io not initialized");
    return io;
}
