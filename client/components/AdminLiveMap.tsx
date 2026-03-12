// components/AdminLiveMap.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TrackedAmbulance } from "../hooks/useOperatorTracking";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };

interface AdminLiveMapProps {
    ambulances: TrackedAmbulance[];
}

export default function AdminLiveMap({ ambulances }: AdminLiveMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObjRef = useRef<google.maps.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Refs for map overlays
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const routesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
    const destMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    // Load Maps API
    useEffect(() => {
        if (!window.google?.maps) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places,geometry`;
            script.async = true;
            script.onload = () => setMapReady(true);
            document.head.appendChild(script);
        } else {
            setMapReady(true);
        }
    }, []);

    // Initialize map
    useEffect(() => {
        if (mapReady && mapRef.current && !mapObjRef.current) {
            mapObjRef.current = new window.google.maps.Map(mapRef.current, {
                center: DEFAULT_CENTER,
                zoom: 13,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
                    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
                    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
                ],
                disableDefaultUI: true,
                zoomControl: true,
            });
        }
    }, [mapReady]);

    // Handle updates to tracked ambulances
    useEffect(() => {
        if (!mapReady || !mapObjRef.current || !window.google) return;
        
        const map = mapObjRef.current;
        const currentIds = new Set(ambulances.map(a => a.ambulanceId));

        // Cleanup removed ambulances
        for (const [id, marker] of markersRef.current) {
            if (!currentIds.has(id)) {
                marker.setMap(null);
                markersRef.current.delete(id);
            }
        }
        for (const [id, polyline] of routesRef.current) {
            if (!currentIds.has(id)) {
                polyline.setMap(null);
                routesRef.current.delete(id);
            }
        }
        for (const [id, marker] of destMarkersRef.current) {
            if (!currentIds.has(id)) {
                marker.setMap(null);
                destMarkersRef.current.delete(id);
            }
        }

        const createEmojiIcon = (emoji: string, size = 36) => {
            return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size - 8}">${emoji}</text></svg>`
            );
        };

        let bounds = new window.google.maps.LatLngBounds();
        let hasPoints = false;

        // Render each ambulance
        ambulances.forEach(a => {
            const pos = { lat: a.lat, lng: a.lng };
            bounds.extend(pos);
            hasPoints = true;

            // Ambulance marker
            if (!markersRef.current.has(a.ambulanceId)) {
                const marker = new window.google.maps.Marker({
                    position: pos,
                    map,
                    icon: {
                        url: createEmojiIcon("🚑", 32),
                        scaledSize: new window.google.maps.Size(32, 32),
                        anchor: new window.google.maps.Point(16, 16),
                    },
                    title: `Ambulance ${a.ambulanceId} (${Math.round(a.speed)} km/h)`,
                    zIndex: 100,
                });
                markersRef.current.set(a.ambulanceId, marker);
            } else {
                markersRef.current.get(a.ambulanceId)!.setPosition(pos);
            }

            // Route polyline
            if (a.routePoints && a.routePoints.length > 0) {
                if (!routesRef.current.has(a.ambulanceId)) {
                    const polyline = new window.google.maps.Polyline({
                        path: a.routePoints,
                        map,
                        strokeColor: "#F97316", // Orange
                        strokeWeight: 4,
                        strokeOpacity: 0.6,
                        zIndex: 80,
                    });
                    routesRef.current.set(a.ambulanceId, polyline);
                } else {
                    routesRef.current.get(a.ambulanceId)!.setPath(a.routePoints);
                }
            }

            // Destination marker
            if (a.destination) {
                const destPos = { lat: a.destination.lat, lng: a.destination.lng };
                bounds.extend(destPos);
                
                if (!destMarkersRef.current.has(a.ambulanceId)) {
                    const marker = new window.google.maps.Marker({
                        position: destPos,
                        map,
                        icon: {
                            url: createEmojiIcon("🏥", 28),
                            scaledSize: new window.google.maps.Size(28, 28),
                            anchor: new window.google.maps.Point(14, 14),
                        },
                        title: a.destination.name,
                        zIndex: 90,
                    });
                    destMarkersRef.current.set(a.ambulanceId, marker);
                }
            }
        });

        // Fit bounds if there are ambulances, only zoom out, don't zoom in fully
        if (hasPoints && ambulances.length > 0) {
           map.fitBounds(bounds);
        }

    }, [ambulances, mapReady]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
            
            {/* Status overlay */}
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'livePulse 1.5s infinite' }}></span>
                    GLOBAL FLEET TRACKING
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                    {ambulances.length} Active Unit{ambulances.length !== 1 ? 's' : ''} Online
                </div>
            </div>

            {ambulances.length === 0 && (
                 <div style={{ position: 'absolute', inset: 0, background: 'rgba(241, 245, 249, 0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                 <div style={{ background: '#fff', padding: '24px 32px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                     <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📡</div>
                     <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '1.1rem' }}>No Active En-Route Ambulances</div>
                     <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>Units will appear here once an emergency is initiated.</div>
                 </div>
             </div>
            )}
            
            <style>{`
                @keyframes livePulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(239,68,68,0); }
                }
            `}</style>
        </div>
    );
}
