// hooks/useNearbyAmbulances.ts
import { useMemo, useCallback } from "react";
import { Location } from "../types";
import { haversineMeters } from "../utils/geoUtils";

export interface NearbyAmbulance {
  id: string;
  distance: number;
  distanceKm: string;
  eta: string;
  status: "en-route" | "available" | "busy";
  lat: number;
  lng: number;
}

const AMBULANCE_SPEED_KMH = 60; // Average ambulance speed

/**
 * Generate random nearby ambulances for simulation
 * In production, this would fetch from a live ambulance tracking system
 */
function generateRandomAmbulances(origin: Location, count: number = 3): NearbyAmbulance[] {
  const ambulances: NearbyAmbulance[] = [];

  for (let i = 0; i < count; i++) {
    // Generate random distance between 0.3km and 2.5km
    const distKm = 0.3 + Math.random() * 2.2;
    const distMeters = distKm * 1000;

    // Generate random bearing (0-360 degrees)
    const bearing = Math.random() * 360;
    const bearingRad = (bearing * Math.PI) / 180;

    // Calculate position using haversine formula
    const R = 6371; // Earth's radius in km
    const lat1Rad = (origin.lat * Math.PI) / 180;
    const lon1Rad = (origin.lng * Math.PI) / 180;

    const lat2Rad = Math.asin(
      Math.sin(lat1Rad) * Math.cos(distKm / R) +
      Math.cos(lat1Rad) * Math.sin(distKm / R) * Math.cos(bearingRad)
    );

    const lon2Rad = lon1Rad + Math.atan2(
      Math.sin(bearingRad) * Math.sin(distKm / R) * Math.cos(lat1Rad),
      Math.cos(distKm / R) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

    const lat2 = (lat2Rad * 180) / Math.PI;
    const lon2 = (lon2Rad * 180) / Math.PI;

    // Calculate ETA in minutes
    const etaMinutes = Math.ceil((distKm / AMBULANCE_SPEED_KMH) * 60);

    ambulances.push({
      id: `AMB-${Date.now().toString(36).toUpperCase()}-${i}`,
      distance: distMeters,
      distanceKm: `${distKm.toFixed(1)} km`,
      eta: `${etaMinutes} min`,
      status: Math.random() > 0.5 ? "available" : "en-route",
      lat: lat2,
      lng: lon2,
    });
  }

  // Sort by distance (nearest first)
  return ambulances.sort((a, b) => a.distance - b.distance);
}

export function useNearbyAmbulances() {
  /**
   * Get nearby ambulances within specified radius
   * @param origin - User's current location
   * @param radiusMeters - Search radius in meters (default: 2500m = 2.5km)
   * @param count - Number of ambulances to generate (default: 3)
   * @returns Sorted array of nearby ambulances (nearest first)
   */
  const getNearbyAmbulances = useCallback(
    (origin: Location, radiusMeters: number = 2500, count: number = 3): NearbyAmbulance[] => {
      const allAmbulances = generateRandomAmbulances(origin, Math.max(count, 5));

      // Filter to only those within specified radius
      return allAmbulances.filter(amb => amb.distance <= radiusMeters).slice(0, count);
    },
    []
  );

  /**
   * Check if any ambulance is within a specific distance threshold
   * @param origin - User's current location
   * @param thresholdMeters - Distance threshold in meters (default: 1000m = 1km)
   * @returns {hasNearby: boolean, nearestAmbulance?: NearbyAmbulance}
   */
  const checkAmbulanceProximity = useCallback(
    (origin: Location, thresholdMeters: number = 1000) => {
      const nearby = getNearbyAmbulances(origin, thresholdMeters, 1);
      return {
        hasNearby: nearby.length > 0,
        nearestAmbulance: nearby[0] || null,
      };
    },
    [getNearbyAmbulances]
  );

  /**
   * Get ambulances separated by category
   */
  const getAmbulancesByStatus = useCallback(
    (origin: Location, radiusMeters: number = 2500) => {
      const ambulances = getNearbyAmbulances(origin, radiusMeters, 5);
      return {
        available: ambulances.filter(a => a.status === "available"),
        enRoute: ambulances.filter(a => a.status === "en-route"),
        all: ambulances,
      };
    },
    [getNearbyAmbulances]
  );

  return {
    getNearbyAmbulances,
    checkAmbulanceProximity,
    getAmbulancesByStatus,
  };
}
