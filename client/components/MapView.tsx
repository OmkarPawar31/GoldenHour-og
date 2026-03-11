// components/MapView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, OverlayView, DirectionsRenderer } from "@react-google-maps/api";
import { Location, Hospital, RouteInfo } from "../types";

export interface TrafficSignal {
  id: string;
  lat: number;
  lng: number;
  status: "red" | "green" | "passed";
}

export interface MapViewProps {
  // Core positions
  origin?: Location | null;
  ambulancePosition?: Location | { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  destinationName?: string;

  // Hospital data
  hospitals?: Hospital[];
  selectedHospitalId?: string | null;
  onHospitalSelect?: (hospital: Hospital) => void;

  // Route data
  routePoints?: { lat: number; lng: number }[];
  routeInfo?: RouteInfo | null;
  directions?: google.maps.DirectionsResult | null;

  // Simulation data
  trafficSignals?: TrafficSignal[];
  isEmergencyActive?: boolean;
  bearing?: number;
  etaMinutes?: number;
  remainingDistanceM?: number;
  isDemoMode?: boolean;

  // Callbacks
  onMapLoad?: (map: google.maps.Map) => void;
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
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
  ],
};

/* ── Helper formatters for the floating info panel ── */
function formatTime(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function MapView({
  origin,
  ambulancePosition,
  destination,
  destinationName,
  hospitals = [],
  selectedHospitalId,
  onHospitalSelect,
  routePoints = [],
  routeInfo,
  directions,
  trafficSignals = [],
  isEmergencyActive = false,
  bearing = 0,
  etaMinutes,
  remainingDistanceM,
  onMapLoad,
}: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const prevDestinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [isAnimatingDestination, setIsAnimatingDestination] = useState(false);
  const [isIntroAnimating, setIsIntroAnimating] = useState(false);

  const prevIsEmergencyRef = useRef(isEmergencyActive);
  const latestAmbulancePos = useRef(ambulancePosition);

  // Keep track of the latest ambulance position for the intro animation starting point
  useEffect(() => {
    latestAmbulancePos.current = ambulancePosition;
  }, [ambulancePosition]);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (onMapLoad) {
      onMapLoad(map);
    }
  };

  const onUnmount = () => {
    mapRef.current = null;
  };

  // fitBounds on route load to show full route (only if not active)
  useEffect(() => {
    if (mapRef.current && !isEmergencyActive && !isIntroAnimating) {
      if (directions) {
        const route = directions.routes[0];
        if (route && route.bounds) {
          mapRef.current.fitBounds(route.bounds, { top: 80, left: 40, right: 40, bottom: 160 });
        }
      } else if (routeInfo && routeInfo.routePoints.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        routeInfo.routePoints.forEach((p) => {
          bounds.extend(new window.google.maps.LatLng(p.lat, p.lng));
        });
        mapRef.current.fitBounds(bounds, { top: 80, left: 40, right: 40, bottom: 160 });
      }
    }
  }, [directions, routeInfo, isEmergencyActive, isIntroAnimating]);

  // Pan to destination when hospital changes (non-emergency preview)
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

    if (!isEmergencyActive && !isIntroAnimating) {
      // Trigger smooth pan and zoom animation for preview
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
    }
  }, [destination, isEmergencyActive, isIntroAnimating]);

  // Slow Cinematic Animation to Hospital when Emergency Starts
  useEffect(() => {
    if (isEmergencyActive && !prevIsEmergencyRef.current && mapRef.current && destination) {
      // Start Intro Sequence
      setIsIntroAnimating(true);
      setIsAnimatingDestination(true);

      const ambPos = latestAmbulancePos.current || origin || defaultCenter;
      const startLat = typeof ambPos.lat === 'function' ? (ambPos as any).lat() : ambPos.lat;
      const startLng = typeof ambPos.lng === 'function' ? (ambPos as any).lng() : ambPos.lng;
      const endLat = typeof destination.lat === 'function' ? (destination as any).lat() : destination.lat;
      const endLng = typeof destination.lng === 'function' ? (destination as any).lng() : destination.lng;

      const duration = 3500; // 3.5s cinematic pan
      const startTime = performance.now();

      const animatePan = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Custom easing (smooth step)
        const ease = progress * progress * (3 - 2 * progress);
        
        const currentLat = startLat + (endLat - startLat) * ease;
        const currentLng = startLng + (endLng - startLng) * ease;
        
        mapRef.current?.setCenter({ lat: currentLat, lng: currentLng });
        
        if (progress < 1) {
          requestAnimationFrame(animatePan);
        } else {
          // Reached hospital; zoom in slightly and hold focus
          if (mapRef.current) {
            mapRef.current.setZoom(18);
          }
          setTimeout(() => {
            setIsIntroAnimating(false);
            setIsAnimatingDestination(false);
          }, 2000); // Wait 2s at hospital before snapping back to driver
        }
      };
      
      requestAnimationFrame(animatePan);
    }
    prevIsEmergencyRef.current = isEmergencyActive;
  }, [isEmergencyActive, destination, origin]);

  // Follow ambulance when active and intro is done
  useEffect(() => {
    if (mapRef.current && ambulancePosition && isEmergencyActive && !isIntroAnimating) {
      mapRef.current.panTo(ambulancePosition);
      // Dynamically zoom based on speed if we want, or keep fixed
      if (mapRef.current.getZoom()! < 18) {
         mapRef.current.setZoom(18);
      }
    }
  }, [ambulancePosition, isEmergencyActive, isIntroAnimating]);

  // Compute map center prop: only control it natively if we aren't handling it manually
  const [computedCenter, setComputedCenter] = useState(ambulancePosition || origin || destination || defaultCenter);
  useEffect(() => {
    if (!isEmergencyActive && !isIntroAnimating) {
      setComputedCenter(ambulancePosition || origin || destination || defaultCenter);
    }
  }, [ambulancePosition, origin, destination, isEmergencyActive, isIntroAnimating]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={computedCenter}
        zoom={15}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Origin marker (when no ambulance simulation is running) */}
        {origin && !ambulancePosition && (
          <Marker
            position={origin}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#2979FF",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
              scale: 8,
            }}
            zIndex={200}
          />
        )}

        {/* Hospital markers */}
        {hospitals.map((h) => (
          <Marker
            key={h.id}
            position={h.location}
            onClick={() => onHospitalSelect?.(h)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: h.id === selectedHospitalId ? "#ff4444" : "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: h.id === selectedHospitalId ? 10 : 7,
            }}
            zIndex={h.id === selectedHospitalId ? 100 : 1}
          />
        ))}

        {/* Route polyline from routeInfo (non-emergency preview) */}
        {routeInfo && routeInfo.routePoints.length > 0 && !directions && (
          <Polyline
            path={routeInfo.routePoints}
            options={{
              strokeColor: "#4285F4",
              strokeWeight: 6,
              strokeOpacity: 1.0,
              zIndex: 10,
            }}
          />
        )}

        {/* Route polyline for emergency simulation */}
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

        {/* Fallback to DirectionsRenderer if directions exist */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              suppressInfoWindows: true,
              polylineOptions: {
                strokeColor: "#4285F4",
                strokeWeight: 6,
                strokeOpacity: 1.0,
                zIndex: 10,
              },
            }}
          />
        )}

        {/* Render Traffic Signals */}
        {trafficSignals.map((signal) => {
          let color = "#ff4444";
          let scale = 7;
          let zIndex = 2;

          if (signal.status === "green") {
            color = "#00e676";
            scale = 9;
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
