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
            // Bypass Google Cloud Directions API completely to avoid billing REQUEST_DENIED
            // using OSRM open source routing API
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
            );
            
            if (!response.ok) {
                throw new Error(`OSRM API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
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
            console.error("OSRM Routing error:", err);
            setError(`Route error: ${err.message}`);
            setDirections(null);
            setRouteInfo(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return { directions, routeInfo, fetchRoute, loading, error };
}
