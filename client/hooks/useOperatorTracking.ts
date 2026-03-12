// hooks/useOperatorTracking.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";

/**
 * Hook used by the OPERATOR dashboard to subscribe to live ambulance
 * position updates via the /dispatch Socket.IO namespace.
 */

export interface TrackedAmbulance {
  ambulanceId: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  eta: number;
  remainingM: number;
  destination: { lat: number; lng: number; name: string } | null;
  routePoints: { lat: number; lng: number }[];
  currentLeg: string;
  progressPercent: number;
  lastUpdate: number;
}

export function useOperatorTracking() {
  const socketRef = useRef<Socket | null>(null);
  const [activeAmbulances, setActiveAmbulances] = useState<TrackedAmbulance[]>([]);
  const [trackedAmbulanceId, setTrackedAmbulanceId] = useState<string | null>(null);
  const [trackedData, setTrackedData] = useState<TrackedAmbulance | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to the dispatch namespace
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/dispatch`, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[OperatorTracking] Connected:", socket.id);
      // Request the list of active ambulances
      socket.emit("operator:list");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Full ambulance list (sent on initial connection)
    socket.on("ambulance:list", (list: TrackedAmbulance[]) => {
      setActiveAmbulances(list);
    });

    // A new ambulance just activated
    socket.on("ambulance:activated", (data: TrackedAmbulance) => {
      setActiveAmbulances(prev => {
        const exists = prev.find(a => a.ambulanceId === data.ambulanceId);
        if (exists) {
          return prev.map(a => a.ambulanceId === data.ambulanceId ? data : a);
        }
        return [...prev, data];
      });
    });

    // An ambulance deactivated
    socket.on("ambulance:deactivated", (data: { ambulanceId: string }) => {
      setActiveAmbulances(prev => prev.filter(a => a.ambulanceId !== data.ambulanceId));
      setTrackedData(td => {
        if (td?.ambulanceId === data.ambulanceId) return null;
        return td;
      });
      setTrackedAmbulanceId(tid => {
        if (tid === data.ambulanceId) return null;
        return tid;
      });
    });

    // Live position update for a subscribed ambulance
    socket.on("ambulance:position", (data: TrackedAmbulance) => {
      // Update the list
      setActiveAmbulances(prev =>
        prev.map(a => a.ambulanceId === data.ambulanceId ? data : a)
      );
      // Update the tracked data only for the currently tracked ambulance
      setTrackedData(td => {
        if (td && td.ambulanceId === data.ambulanceId) {
          return data;
        }
        return td;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /** Subscribe to live position updates for a specific ambulance */
  const trackAmbulance = useCallback((ambulanceId: string) => {
    // Unsubscribe from the previous one
    if (trackedAmbulanceId && socketRef.current) {
      socketRef.current.emit("operator:unsubscribe", { ambulanceId: trackedAmbulanceId });
    }

    setTrackedAmbulanceId(ambulanceId);
    setTrackedData(activeAmbulances.find(a => a.ambulanceId === ambulanceId) || null);

    if (socketRef.current) {
      socketRef.current.emit("operator:subscribe", { ambulanceId });
    }
  }, [trackedAmbulanceId, activeAmbulances]);

  /** Stop tracking the current ambulance */
  const stopTracking = useCallback(() => {
    if (trackedAmbulanceId && socketRef.current) {
      socketRef.current.emit("operator:unsubscribe", { ambulanceId: trackedAmbulanceId });
    }
    setTrackedAmbulanceId(null);
    setTrackedData(null);
  }, [trackedAmbulanceId]);

  /** Refresh the ambulance list */
  const refreshList = useCallback(() => {
    socketRef.current?.emit("operator:list");
  }, []);

  return {
    isConnected,
    activeAmbulances,
    trackedAmbulanceId,
    trackedData,
    trackAmbulance,
    stopTracking,
    refreshList,
  };
}
