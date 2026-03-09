"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";

export function useSocket(namespace: string = "") {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(`${SOCKET_URL}${namespace}`, {
      transports: ["websocket", "polling"],
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [namespace]);

  return socketRef.current;
}
