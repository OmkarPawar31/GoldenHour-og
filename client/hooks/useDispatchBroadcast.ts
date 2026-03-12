// hooks/useDispatchBroadcast.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";

/**
 * Hook used by the AMBULANCE page to broadcast its live position
 * to the operator dashboard via the /dispatch Socket.IO namespace.
 */

interface BroadcastOptions {
  /** Unique ambulance identifier (generated per session) */
  ambulanceId: string;
  /** Whether the emergency is currently active */
  isActive: boolean;
}

export function useDispatchBroadcast({ ambulanceId, isActive }: BroadcastOptions) {
  const socketRef = useRef<Socket | null>(null);
  const isConnected = useRef(false);

  // Connect to the dispatch namespace
  useEffect(() => {
    if (!ambulanceId) return;

    const socket = io(`${SOCKET_URL}/dispatch`, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      isConnected.current = true;
      console.log("[DispatchBroadcast] Connected:", socket.id);
    });

    socket.on("disconnect", () => {
      isConnected.current = false;
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      isConnected.current = false;
    };
  }, [ambulanceId]);

  /** Notify operators that this ambulance has activated an emergency */
  const broadcastActivation = useCallback((data: {
    lat: number;
    lng: number;
    destination: { lat: number; lng: number; name: string };
    routePoints: { lat: number; lng: number }[];
    currentLeg: string;
  }) => {
    socketRef.current?.emit("ambulance:activate", {
      ambulanceId,
      ...data,
    });
  }, [ambulanceId]);

  /** Send a position update tick (call every ~1s during simulation) */
  const broadcastPosition = useCallback((data: {
    lat: number;
    lng: number;
    bearing: number;
    speed: number;
    eta: number;
    remainingM: number;
    destination?: { lat: number; lng: number; name: string };
    routePoints?: { lat: number; lng: number }[];
    currentLeg?: string;
    progressPercent?: number;
  }) => {
    socketRef.current?.emit("ambulance:update", {
      ambulanceId,
      ...data,
    });
  }, [ambulanceId]);

  /** Notify operators that the emergency is over */
  const broadcastDeactivation = useCallback(() => {
    socketRef.current?.emit("ambulance:deactivate", { ambulanceId });
  }, [ambulanceId]);

  return {
    broadcastActivation,
    broadcastPosition,
    broadcastDeactivation,
  };
}
