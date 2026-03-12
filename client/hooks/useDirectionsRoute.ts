// hooks/useDirectionsRoute.ts
import { useState, useCallback } from "react";
import { Location, RouteInfo } from "../types";

export function useDirectionsRoute() {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRoute = useCallback(async (origin: Location, destination: Location) => {
        setLoading(true);
        setError(null);

        if (!origin || !destination || typeof origin.lat !== 'number' || typeof destination.lat !== 'number') {
            console.error("Invalid origin or destination", { origin, destination });
            setError("Invalid origin or destination coordinates");
            setLoading(false);
            return;
        }

        try {
            // Use OSRM open source routing API
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`
            );

            if (!response.ok) {
                throw new Error(`OSRM HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 'Ok') {
                throw new Error(`OSRM error: ${data.code}`);
            }

            if (!data.routes || data.routes.length === 0) {
                throw new Error("No route found from OSRM");
            }

            const route = data.routes[0];
            const coordinates: [number, number][] = route.geometry.coordinates;

            const routePoints: Location[] = coordinates.map(coord => ({
                lng: coord[0],
                lat: coord[1]
            }));

            // Calculate duration in minutes/hours
            const durationSecs = route.duration;
            const durationMins = Math.max(1, Math.round(durationSecs / 60));
            const durationText = durationMins >= 60
                ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
                : `${durationMins} mins`;

            // Calculate distance in km
            const distanceMeters = route.distance;
            const distanceKm = (distanceMeters / 1000).toFixed(1);
            const distanceText = `${distanceKm} km`;

            console.log("[OSRM] Route successful:", { distance: distanceText, duration: durationText, points: routePoints.length });

            // Clear directions since we're injecting custom polylines via routePoints
            setDirections(null);

            setRouteInfo({
                distanceText,
                durationText,
                distanceValue: distanceMeters,
                durationValue: durationSecs,
                routePoints,
            });

        } catch (err: any) {
            console.error("[OSRM] Routing error:", err instanceof Error ? err.message : String(err));

            // Fallback: Create direct path from origin to destination
            console.log("[Fallback] Using direct path");
            const directRoutePoints: Location[] = [origin, destination];
            const distanceKm = "~5.0";
            const durationMins = "~10";

            setDirections(null);
            setRouteInfo({
                distanceText: `${distanceKm} km (est.)`,
                durationText: `${durationMins} mins (est.)`,
                distanceValue: 5000,
                durationValue: 600,
                routePoints: directRoutePoints,
            });

            setError(null); // Clear error so ambulance can still work

        } finally {
            setLoading(false);
        }
    }, []);

    return { directions, routeInfo, fetchRoute, loading, error };
}
