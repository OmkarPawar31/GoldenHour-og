import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";

const sockets: Map<string, Socket> = new Map();

export function getSocket(namespace: string = ""): Socket {
  const key = namespace || "default";
  let socket = sockets.get(key);
  if (!socket || socket.disconnected) {
    socket = io(`${SOCKET_URL}${namespace}`, {
      transports: ["websocket", "polling"],
    });
    sockets.set(key, socket);
  }
  return socket;
}

export function disconnectSocket(namespace?: string) {
  if (namespace) {
    const key = namespace || "default";
    const socket = sockets.get(key);
    socket?.disconnect();
    sockets.delete(key);
  } else {
    sockets.forEach((s) => s.disconnect());
    sockets.clear();
  }
}
