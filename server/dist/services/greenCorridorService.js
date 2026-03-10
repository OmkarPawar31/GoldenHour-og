"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateGreenCorridor = activateGreenCorridor;
exports.deactivateGreenCorridor = deactivateGreenCorridor;
exports.getActiveCorridor = getActiveCorridor;
exports.getAllActiveCorridors = getAllActiveCorridors;
const socket_1 = require("../config/socket");
// Track active corridors in memory
const activeCorridors = new Map();
function activateGreenCorridor(sessionId, routePoints) {
    activeCorridors.set(sessionId, routePoints);
    const io = (0, socket_1.getIO)();
    io.of("/emergency").emit("green-corridor:activate", { sessionId, routePoints });
    io.of("/tracking").emit("green-corridor:activate", { sessionId, routePoints });
}
function deactivateGreenCorridor(sessionId) {
    activeCorridors.delete(sessionId);
    const io = (0, socket_1.getIO)();
    io.of("/emergency").emit("green-corridor:deactivate", { sessionId });
    io.of("/tracking").emit("green-corridor:deactivate", { sessionId });
}
function getActiveCorridor(sessionId) {
    return activeCorridors.get(sessionId) ?? null;
}
function getAllActiveCorridors() {
    return activeCorridors;
}
