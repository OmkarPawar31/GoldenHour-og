// components/MapView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, OverlayView, useJsApiLoader } from "@react-google-maps/api";

export interface TrafficSignal {
  id: string;
  lat: number;
  lng: number;
  status: "red" | "green" | "passed";
}

interface MapViewProps {
  ambulancePosition: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  routePoints: { lat: number; lng: number }[];
  trafficSignals: TrafficSignal[];
  isEmergencyActive: boolean;
  bearing?: number;
  destinationName?: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// Fallback center if everything else fails (Panvel)
const defaultCenter = { lat: 18.9894, lng: 73.1175 };

// Aubergine Dark Theme
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  mapTypeControl: false,
  streetViewControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64779e" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#334e87" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#023e58" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
    { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3C7680" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0d5ce" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#023e58" }] },
    { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "transit", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "transit.line", elementType: "geometry.fill", stylers: [{ color: "#283d6a" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#3a4762" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] }
  ]
};

export default function MapView({
  ambulancePosition,
  destination,
  routePoints,
  trafficSignals,
  isEmergencyActive,
  bearing = 0,
  destinationName,
}: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  // BUG 1: Define icons after isLoaded check to avoid window.google crash
  const ambulanceIcon = isLoaded
    ? {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#3B82F6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      }
    : undefined;

  const hospitalSelectedIcon = isLoaded
    ? {
        path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z",
        fillColor: "#EF4444",
        fillOpacity: 1,
        strokeColor: "#000000",
        strokeWeight: 1,
        scale: 1,
        labelOrigin: new google.maps.Point(0, -30),
      }
    : undefined;

  const hospitalDefaultIcon = isLoaded
    ? {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: "#94A3B8",
        fillOpacity: 1,
        strokeColor: "#000000",
        strokeWeight: 1,
      }
    : undefined;

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    onMapLoad(map);
  };

  const onUnmount = () => {
    mapRef.current = null;
  };

  // FIX 4: fitBounds on route load to show full route
  useEffect(() => {
    if (mapRef.current && directions) {
      const route = directions.routes[0];
      if (route && route.bounds) {
        mapRef.current.fitBounds(route.bounds, { top: 80, left: 40, right: 40, bottom: 160 });
      }
    }
  }, [directions]);

  // FIX 4: pan to current location during navigation
  useEffect(() => {
    if (!mapRef.current || !destination) return;

    // Check if destination actually changed
    if (
      prevDestinationRef.current &&
      prevDestinationRef.current.lat === destination.lat &&
      prevDestinationRef.current.lng === destination.lng
    ) {
      return;
    }

    prevDestinationRef.current = destination;

    // Trigger smooth pan and zoom animation
    setIsAnimatingDestination(true);

    // Pan to destination with smooth animation
    mapRef.current.panTo(destination);

    // Zoom in on destination
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setZoom(17);
      }
    }, 300);

    // End animation state after 1.5 seconds
    const timer = setTimeout(() => {
      setIsAnimatingDestination(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [destination]);

  if (!isLoaded) {
    return (
      <div className="w-full h-[60vh] bg-[#0a0e1a] border border-gray-800 rounded-xl relative overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#2979FF]/30 border-t-[#2979FF] rounded-full animate-spin" />
          <p className="font-mono text-gray-500 text-sm tracking-widest uppercase">Initializing Map System...</p>
        </div>
      </div>
    );
  }

  const center = ambulancePosition || destination || defaultCenter;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        options={mapOptions}
        onLoad={(map) => { mapRef.current = map; }}
        onUnmount={() => { mapRef.current = null; }}
      >
        {/* Render Route Polyline */}
        {isEmergencyActive && routePoints.length > 0 && (
          <Polyline
            path={routePoints}
            options={{
              strokeColor: "#2979FF",
              strokeWeight: 6,
              strokeOpacity: 0.9,
              zIndex: 1,
            }}
          />
        )}

        {/* Render Traffic Signals */}
        {trafficSignals.map((signal) => {
          let color = "#ff4444";
          let scale = 7;
          let glow = false;
          let zIndex = 2;

          if (signal.status === "green") {
            color = "#00e676";
            scale = 9;
            glow = true;
            zIndex = 3;
          } else if (signal.status === "passed") {
            color = "#555555";
            scale = 5;
            zIndex = 1;
          }

          return (
            <Marker
              key={signal.id}
              position={{ lat: signal.lat, lng: signal.lng }}
              zIndex={zIndex}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: signal.status === "passed" ? 0.6 : 1,
                strokeColor: "#ffffff",
                strokeWeight: signal.status === "passed" ? 1 : 2,
                scale: scale,
              }}
            />
          );
        })}

        {/* Green Signal Pulse Overlays */}
        {trafficSignals.map((signal) => {
          if (signal.status !== "green") return null;
          return (
            <OverlayView
              key={`pulse-${signal.id}`}
              position={{ lat: signal.lat, lng: signal.lng }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-20 h-20 rounded-full border-2 border-[#00e676] animate-ping opacity-60" />
              </div>
            </OverlayView>
          );
        })}

        {/* Destination Marker */}
        {destination && (
          <OverlayView
            position={destination}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-[100%] drop-shadow-lg">
              {/* Glow effect when destination is animated */}
              {isAnimatingDestination && (
                <div className="absolute -inset-3 bg-red-500/30 rounded-full animate-pulse pointer-events-none" />
              )}
              <div className={`w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center relative shadow-lg transition-all duration-300 ${
                isAnimatingDestination ? "scale-110 shadow-[0_0_20px_rgba(220,38,38,0.8)]" : ""
              }`}>
                <span className="text-white font-bold font-mono text-sm">H</span>
                {/* Pointer tip */}
                <div className="absolute -bottom-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600" />
              </div>
              {/* Hospital name tooltip */}
              {isAnimatingDestination && destinationName && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-xs font-mono rounded whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {destinationName}
                </div>
              )}
            </div>
          </OverlayView>
        )}

        {/* Ambulance Marker */}
        {ambulancePosition && (
          <OverlayView
            position={ambulancePosition}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 z-[100] drop-shadow-2xl">
              {/* Pulse Ring */}
              <div className="absolute inset-[-15px] bg-red-500/20 rounded-full animate-ping pointer-events-none" />
              <div className="absolute inset-[-8px] border border-red-500/50 rounded-full animate-ping pointer-events-none" style={{ animationDelay: "0.5s" }} />

              {/* Custom SVG Ambulance rotating */}
              <div
                className="w-8 h-8 bg-white rounded-full border-[3px] border-red-600 flex items-center justify-center transition-transform duration-[1500ms] ease-linear shadow-[0_0_15px_rgba(255,59,59,0.5)]"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                {/* Cross */}
                <div className="relative w-4 h-4">
                  <div className="absolute top-1/2 left-0 w-full h-[4px] -translate-y-1/2 bg-red-600" />
                  <div className="absolute left-1/2 top-0 h-full w-[4px] -translate-x-1/2 bg-red-600" />
                </div>
              </div>
            </div>
          </OverlayView>
        )}
      </GoogleMap>

      {/* Floating Info Panel — Top-left glassmorphism overlay */}
      {isEmergencyActive && destinationName && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="bg-[#0a0e1a]/85 backdrop-blur-xl border border-white/[0.08] rounded-xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto min-w-[200px]">
            {/* Status dot + label */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[10px] text-red-400 font-mono uppercase tracking-[0.2em] font-bold">En Route</span>
            </div>
            {/* Destination name */}
            <p className="text-white font-mono text-sm font-semibold truncate max-w-[240px]">
              {destinationName}
            </p>
            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.06]">
              {etaMinutes !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-[10px]">⏱</span>
                  <span className="text-amber-400 font-mono text-xs font-semibold">
                    {formatTime(etaMinutes)}
                  </span>
                </div>
              )}
              {remainingDistanceM !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-400 text-[10px]">📍</span>
                  <span className="text-blue-400 font-mono text-xs font-semibold">
                    {formatDist(remainingDistanceM)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map attribution gradient bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#050b14]/60 to-transparent pointer-events-none" />
    </div>
  );
}
