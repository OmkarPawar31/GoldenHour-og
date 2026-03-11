"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";

export interface UseGreenCorridorReturn {
  sessionId: string | null;
  isConnected: boolean;
  activate: (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => Promise<string>;
  deactivate: () => void;
  reportSignals: (
    signals: { id: string; lat: number; lng: number }[]
  ) => void;
  reportSignalGreen: (signalId: string) => void;
  reportLocation: (position: { lat: number; lng: number }) => void;
}

export function useGreenCorridor(): UseGreenCorridorReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const activate = useCallback(
    (
      origin: { lat: number; lng: number },
      destination: { lat: number; lng: number }
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        // Disconnect any previous socket
        if (socketRef.current) {
          socketRef.current.disconnect();
        }

        const socket = io(`${SOCKET_URL}/emergency`, {
          transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("[GreenCorridor] Socket connected:", socket.id);
          setIsConnected(true);

          // Emit trigger to create a server-side emergency session
          socket.emit("trigger", {
            userId: "ambulance-client",
            origin,
            destination,
          });
        });

        socket.on("emergency-created", (data: { sessionId: string; priority: string }) => {
          console.log("[GreenCorridor] Session created:", data.sessionId);
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;

          // Join the session room
          socket.emit("join-session", data.sessionId);

          resolve(data.sessionId);
        });

        // Listen for signal updates (multi-client sync)
        socket.on("green-corridor:signal-update", (data: {
          sessionId: string;
          signalId: string;
          status: string;
        }) => {
          console.log("[GreenCorridor] Signal update from server:", data.signalId, "→", data.status);
        });

        socket.on("error", (data: { message: string }) => {
          console.error("[GreenCorridor] Server error:", data.message);
          reject(new Error(data.message));
        });

        socket.on("disconnect", () => {
          console.log("[GreenCorridor] Socket disconnected");
          setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
          console.warn("[GreenCorridor] Connection error:", err.message);
          setIsConnected(false);
          // Don't reject — server may not be running, corridor still works client-side
        });

        // Timeout if server doesn't respond within 8s
        setTimeout(() => {
          if (!sessionIdRef.current) {
            console.warn("[GreenCorridor] Session creation timed out — continuing without server");
            resolve("local-" + Date.now());
          }
        }, 8000);
      });
    },
    []
  );

  const deactivate = useCallback(() => {
    const socket = socketRef.current;
    const sid = sessionIdRef.current;

    if (socket && sid) {
      socket.emit("resolve", { sessionId: sid });
      console.log("[GreenCorridor] Deactivated session:", sid);
    }

    // Cleanup
    if (socket) {
      socket.disconnect();
      socketRef.current = null;
    }

    setSessionId(null);
    setIsConnected(false);
    sessionIdRef.current = null;
  }, []);

  const reportSignals = useCallback(
    (signals: { id: string; lat: number; lng: number }[]) => {
      const socket = socketRef.current;
      const sid = sessionIdRef.current;
      if (!socket || !sid) return;

      socket.emit("corridor:update-signals", {
        sessionId: sid,
        signals,
      });
      console.log(`[GreenCorridor] Reported ${signals.length} signals to server`);
    },
    []
  );

  const reportSignalGreen = useCallback((signalId: string) => {
    const socket = socketRef.current;
    const sid = sessionIdRef.current;
    if (!socket || !sid) return;

    socket.emit("corridor:signal-green", {
      sessionId: sid,
      signalId,
    });
  }, []);

  const reportLocation = useCallback(
    (position: { lat: number; lng: number }) => {
      const socket = socketRef.current;
      const sid = sessionIdRef.current;
      if (!socket || !sid) return;

      socket.emit("corridor:location-update", {
        sessionId: sid,
        lat: position.lat,
        lng: position.lng,
      });
    },
    []
  );

  return {
    sessionId,
    isConnected,
    activate,
    deactivate,
    reportSignals,
    reportSignalGreen,
    reportLocation,
  };
}
