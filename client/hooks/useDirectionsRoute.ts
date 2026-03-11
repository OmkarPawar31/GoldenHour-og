// hooks/useDirectionsRoute.ts
import { useState, useCallback } from "react";
import { Location, RouteInfo } from "../types";

export function useDirectionsRoute() {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRoute = useCallback((origin: Location, destination: Location) => {
        setLoading(true);
        setError(null);
        const directionsService = new window.google.maps.DirectionsService();

        // FIX 1: Use DirectionsService with driving options for road-snapped routes
        directionsService.route(
            {
                origin: new window.google.maps.LatLng(origin.lat, origin.lng),
                destination: new window.google.maps.LatLng(destination.lat, destination.lng),
                travelMode: window.google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
                },
                provideRouteAlternatives: false,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                    setDirections(result);
                    const leg = result.routes[0].legs[0];

                    // FIX 5: Extract high-resolution points from ALL steps, not just overview_path
                    const routePoints: Location[] = [];
                    result.routes[0].legs.forEach((routeLeg) => {
                        routeLeg.steps.forEach((step) => {
                            step.path.forEach((p) => {
                                routePoints.push({
                                    lat: p.lat(),
                                    lng: p.lng(),
                                });
                            });
                        });
                    });

                    setRouteInfo({
                        distanceText: leg.distance?.text || "",
                        durationText: leg.duration?.text || "",
                        distanceValue: leg.distance?.value || 0,
                        durationValue: leg.duration?.value || 0,
                        routePoints,
                    });
                } else {
                    setError(`Route error: ${status}`);
                    setDirections(null);
                    setRouteInfo(null);
                }
                setLoading(false);
            }
        );
    }, []);

    return { directions, routeInfo, fetchRoute, loading, error };
}
