// components/MapView.tsx
"use client";

import { useEffect, useRef } from "react";
import { useJsApiLoader, GoogleMap, DirectionsRenderer, Marker, Polyline } from "@react-google-maps/api";
import { Location, Hospital, RouteInfo } from "../types";

const LIBRARIES: ("geometry" | "places")[] = ["geometry", "places"];

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

interface MapViewProps {
  origin: Location;
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  directions: google.maps.DirectionsResult | null;
  routeInfo: RouteInfo | null;
  isDemoMode: boolean;
  onMapLoad: (map: google.maps.Map) => void;
  onHospitalSelect: (hospital: Hospital) => void;
  ambulancePosition?: Location;
}

export default function MapView({
  origin,
  hospitals,
  selectedHospitalId,
  directions,
  routeInfo,
  isDemoMode,
  onMapLoad,
  onHospitalSelect,
  ambulancePosition
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
    if (mapRef.current) {
        if (directions) {
          const route = directions.routes[0];
          if (route && route.bounds) {
            mapRef.current.fitBounds(route.bounds, { top: 80, left: 40, right: 40, bottom: 160 });
          }
        } else if (routeInfo && routeInfo.routePoints.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            routeInfo.routePoints.forEach(p => {
                bounds.extend(new window.google.maps.LatLng(p.lat, p.lng));
            });
            mapRef.current.fitBounds(bounds, { top: 80, left: 40, right: 40, bottom: 160 });
        }
    }
  }, [directions, routeInfo]);

  // FIX 4: pan to current location during navigation
  useEffect(() => {
    if (mapRef.current && origin && !directions) {
      mapRef.current.panTo(origin);
    }
  }, [origin, directions]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a] border border-red-900 rounded-xl">
        <div className="text-red-500 font-mono text-center p-4">Error loading maps: {loadError.message}</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[65vh] flex items-center justify-center bg-[#0a0e1a] border border-gray-800 rounded-xl animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[65vh] rounded-xl overflow-hidden shadow-2xl bg-[#0a0e1a]">
      {isDemoMode && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-xs font-bold tracking-widest uppercase rounded shadow backdrop-blur-sm pointer-events-none">
          Demo Mode
        </div>
      )}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={origin}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {origin && !ambulancePosition && (
          <Marker
            position={origin}
            icon={ambulanceIcon}
            zIndex={200}
          />
        )}
        
        {ambulancePosition && (
          <Marker
            position={ambulancePosition}
            icon={ambulanceIcon}
            zIndex={200}
          />
        )}

        {hospitals.map(h => (
          <Marker
            key={h.id}
            position={h.location}
            onClick={() => onHospitalSelect(h)}
            icon={h.id === selectedHospitalId ? hospitalSelectedIcon : hospitalDefaultIcon}
            zIndex={h.id === selectedHospitalId ? 100 : 1}
          />
        ))}

        {/* FIX 2: White border polyline behind route for outline effect */}
        {routeInfo && routeInfo.routePoints.length > 0 && (
          <Polyline
            path={routeInfo.routePoints}
            options={{
              strokeColor: "#FFFFFF",
              strokeWeight: 10,
              strokeOpacity: 0.3,
              zIndex: 9,
            }}
          />
        )}

        {/* Custom blue style polyline because we bypassed DirectionsRenderer */}
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
      </GoogleMap>
    </div>
  );
}
