// hooks/useAmbulanceProximityAlert.ts
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useElevenLabsVoice } from "./useElevenLabsVoice";
import { Location } from "../types";
import { useNearbyAmbulances, NearbyAmbulance } from "./useNearbyAmbulances";

interface ProximityAlertOptions {
  thresholdMeters?: number; // Default: 1000m (1km)
  enableVoice?: boolean; // Default: true
  checkIntervalMs?: number; // Default: 2000ms
}

export function useAmbulanceProximityAlert(
  userLocation: Location | null,
  options: ProximityAlertOptions = {}
) {
  const { thresholdMeters = 1000, enableVoice = true, checkIntervalMs = 2000 } = options;
  const { speak } = useElevenLabsVoice();
  const { checkAmbulanceProximity } = useNearbyAmbulances();

  const [isNearby, setIsNearby] = useState(false);
  const [nearestAmbulance, setNearestAmbulance] = useState<NearbyAmbulance | null>(null);

  const hasAlertedRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for ambulance proximity periodically
  useEffect(() => {
    if (!userLocation) return;

    const checkProximity = () => {
      const { hasNearby, nearestAmbulance: ambulance } = checkAmbulanceProximity(
        userLocation,
        thresholdMeters
      );

      setIsNearby(hasNearby);
      setNearestAmbulance(ambulance);

      // Trigger voice alert only once when ambulance first comes within threshold
      if (hasNearby && !hasAlertedRef.current && enableVoice) {
        hasAlertedRef.current = true;
        const alertMessage = `Ambulance nearby at ${ambulance?.distanceKm || 'nearby'}, estimated arrival ${ambulance?.eta || 'soon'}`;
        speak(alertMessage, "ambulance_nearby");
        console.log("[ProximityAlert] Ambulance detected within", thresholdMeters, "meters");
      }

      // Reset alert flag when ambulance moves away
      if (!hasNearby && hasAlertedRef.current) {
        hasAlertedRef.current = false;
      }
    };

    checkProximity(); // Check immediately
    checkIntervalRef.current = setInterval(checkProximity, checkIntervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [userLocation, thresholdMeters, enableVoice, checkIntervalMs, checkAmbulanceProximity, speak]);

  const resetAlert = useCallback(() => {
    hasAlertedRef.current = false;
    setIsNearby(false);
    setNearestAmbulance(null);
  }, []);

  return {
    isNearby,
    nearestAmbulance,
    distanceMeters: nearestAmbulance?.distance || null,
    eta: nearestAmbulance?.eta || null,
    resetAlert,
  };
}
