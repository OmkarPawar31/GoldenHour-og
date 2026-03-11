// components/MapView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, DirectionsRenderer, OverlayView, useJsApiLoader } from "@react-google-maps/api";

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
  directionsResult?: google.maps.DirectionsResult | null;
  trafficSignals: TrafficSignal[];
  isEmergencyActive: boolean;
  bearing?: number;
  destinationName?: string;
  etaMinutes?: number;
  remainingDistanceM?: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// Fallback center if everything else fails (Panvel)
const defaultCenter = { lat: 18.9894, lng: 73.1175 };

// Premium dark theme with subtle road visibility
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  zoomControl: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#7dd3c0" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f1729" }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#1e3a5f" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0c1e3a" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#162544" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#5b8a94" }] },
    { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#0c2e3a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8ba4bf" }] },
    { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a4565" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#164050" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9ecec5" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#0c2e3a" }] },
    { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#8ba4bf" }] },
    { featureType: "transit", elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { featureType: "transit.line", elementType: "geometry.fill", stylers: [{ color: "#162544" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#1e3050" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#080e1a" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a5060" }] },
  ],
};

// Route polyline — vibrant blue with glow
const directionsPolylineOptions: google.maps.PolylineOptions = {
  strokeColor: "#3b82f6",
  strokeWeight: 6,
  strokeOpacity: 0.95,
  zIndex: 2,
};

// Glow underlay
const glowPolylineOptions: google.maps.PolylineOptions = {
  strokeColor: "#3b82f6",
  strokeWeight: 16,
  strokeOpacity: 0.12,
  zIndex: 1,
};

// Outer glow
const outerGlowOptions: google.maps.PolylineOptions = {
  strokeColor: "#60a5fa",
  strokeWeight: 24,
  strokeOpacity: 0.05,
  zIndex: 0,
};

export default function MapView({
  ambulancePosition,
  destination,
  routePoints,
  directionsResult,
  trafficSignals,
  isEmergencyActive,
  bearing = 0,
  destinationName,
  etaMinutes,
  remainingDistanceM,
}: MapViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["geometry", "places"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [isAnimatingDestination, setIsAnimatingDestination] = useState(false);
  const prevDestinationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Smooth animation when ambulance position changes
  useEffect(() => {
    if (mapRef.current && ambulancePosition) {
      mapRef.current.panTo(ambulancePosition);
    }
  }, [ambulancePosition]);

  // Smooth animation when destination changes
  useEffect(() => {
    if (!mapRef.current || !destination) return;

    if (
      prevDestinationRef.current &&
      prevDestinationRef.current.lat === destination.lat &&
      prevDestinationRef.current.lng === destination.lng
    ) {
      return;
    }

    prevDestinationRef.current = destination;
    setIsAnimatingDestination(true);
    mapRef.current.panTo(destination);

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setZoom(17);
      }
    }, 300);

    const timer = setTimeout(() => {
      setIsAnimatingDestination(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [destination]);

  // Format helpers for overlay
  const formatDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const formatTime = (mins: number) => {
    if (mins < 1) return "< 1 min";
    const mm = Math.floor(mins);
    const ss = Math.round((mins - mm) * 60);
    return `${mm}m ${ss.toString().padStart(2, "0")}s`;
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-[60vh] bg-[#060a14] border border-gray-800/60 rounded-xl relative overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="font-mono text-gray-500 text-sm tracking-widest uppercase">Initializing Map System...</p>
        </div>
      </div>
    );
  }

  const center = ambulancePosition || destination || defaultCenter;
  const useDirectionsRenderer = isEmergencyActive && directionsResult;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800/50 shadow-[0_0_60px_rgba(0,0,0,0.4)] relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        options={mapOptions}
        onLoad={(map) => { mapRef.current = map; }}
        onUnmount={() => { mapRef.current = null; }}
      >
        {/* Road-following route via DirectionsRenderer */}
        {useDirectionsRenderer && (
          <DirectionsRenderer
            directions={directionsResult}
            options={{
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: directionsPolylineOptions,
            }}
          />
        )}

        {/* Multi-layer glow for route */}
        {useDirectionsRenderer && routePoints.length > 0 && (
          <>
            <Polyline path={routePoints} options={outerGlowOptions} />
            <Polyline path={routePoints} options={glowPolylineOptions} />
          </>
        )}

        {/* Fallback polyline when no DirectionsResult */}
        {isEmergencyActive && !directionsResult && routePoints.length > 0 && (
          <>
            <Polyline path={routePoints} options={outerGlowOptions} />
            <Polyline path={routePoints} options={glowPolylineOptions} />
            <Polyline
              path={routePoints}
              options={{
                strokeColor: "#3b82f6",
                strokeWeight: 6,
                strokeOpat: 0.95,
                zIndex: 2,
              } as google.maps.PolylineOptions}
            />
          </>
        )}

        {/* Traffic Signals — Enhanced	*/}
        {trafficSignals.map((signal) => {
          let color = "#ef4444";
          let scale = 8;
          let zIndex = 2;
          let strokeW = 2;

          if (signal.status === "green") {
            color = "#00ff88";
            scale = 10;
            zIndex = 3;
            strokeW = 2.5;
          } else if (signal.status === "passed") {
            color = "#374151";
            scale = 5;
            zIndex = 1;
            strokeW = 1;
          }

          return (
            <Marker
              key={signal.id}
              position={{ lat: signal.lat, lng: signal.lng }}
              zIndex={zIndex}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: signal.status === "passed" ? 0.4 : 1,
                strokeColor: signal.status === "green" ? "#ffffff" : "#1e293b",
                strokeWeight: strokeW,
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
                <div className="w-16 h-16 rounded-full border-2 border-[#00ff88]/60 animate-ping" />
                <div className="absolute inset-0 w-24 h-24 -translate-x-1 -translate-y-1 rounded-full bg-[#00ff88]/10 animate-pulse" />
              </div>
            </OverlayView>
          );
        })}

        {/* Destination Marker — Premium hospital pin */}
        {destination && (
          <OverlayView
            position={destination}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-[100%] drop-shadow-lg">
              {/* Animated pulse rings */}
              {isAnimatingDestination && (
                <>
                  <div className="absolute -inset-4 bg-red-500/20 rounded-full animate-ping pointer-events-none" />
                  <div className="absolute -inset-7 border border-red-400/20 rounded-full animate-ping pointer-events-none" style={{ animationDelay: "0.3s" }} />
                </>
              )}
              <div
                className={`w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full border-[3px] border-white flex items-center justify-center relative shadow-lg transition-all duration-500 ${
                  isAnimatingDestination
                    ? "scale-125 shadow-[0_0_30px_rgba(220,38,38,0.9)]"
                    : "shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                }`}
              >
                <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
                {/* Pointer tip */}
                <div className="absolute -bottom-2.5 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-red-600" />
              </div>
              {/* Hospital name tooltip */}
              {destinationName && (
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-gradient-to-r from-red-600/95 to-red-500/95 backdrop-blur-sm text-white text-xs font-mono rounded-lg whitespace-nowrap shadow-[0_4px_20px_rgba(220,38,38,0.4)] border border-red-400/20 transition-opacity duration-500 ${isAnimatingDestination ? "opacity-100" : "opacity-90"}`}>
                  {destinationName}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
                </div>
              )}
            </div>
          </OverlayView>
        )}

        {/* Ambulance Marker — Premium multi-ring glow */}
        {ambulancePosition && (
          <OverlayView
            position={ambulancePosition}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 z-[100] drop-shadow-2xl">
              {/* Triple pulse rings */}
              <div className="absolute inset-[-20px] bg-red-500/12 rounded-full animate-ping pointer-events-none" />
              <div className="absolute inset-[-14px] border-2 border-red-500/30 rounded-full animate-ping pointer-events-none" style={{ animationDelay: "0.4s" }} />
              <div className="absolute inset-[-7px] bg-red-400/8 rounded-full animate-pulse pointer-events-none" />

              {/* Ambulance icon with bearing rotation */}
              <div
                className="w-10 h-10 bg-white rounded-full border-[3px] border-red-600 flex items-center justify-center transition-transform duration-[1500ms] ease-linear shadow-[0_0_24px_rgba(255,59,59,0.7),0_0_50px_rgba(255,59,59,0.2)]"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                {/* Medical cross */}
                <div className="relative w-4.5 h-4.5">
                  <div className="absolute top-1/2 left-0 w-full h-[4px] -translate-y-1/2 bg-red-600 rounded-sm" />
                  <div className="absolute left-1/2 top-0 h-full w-[4px] -translate-x-1/2 bg-red-600 rounded-sm" />
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
