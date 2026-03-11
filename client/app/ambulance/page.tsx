// app/ambulance/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useLocation } from "../../hooks/useLocation";
import { useNearbyHospitals } from "../../hooks/useNearbyHospitals";
import { useDirectionsRoute } from "../../hooks/useDirectionsRoute";
import HospitalCard from "../../components/HospitalCard";
import RouteInfoBar from "../../components/RouteInfoBar";
import HospitalSearch from "../../components/HospitalSearch";
import LiveTracker from "../../components/LiveTracker";
import { useAmbulanceSimulation } from "../../hooks/useAmbulanceSimulation";
import { haversineMeters } from "../../utils/geoUtils";
import { Location, Hospital } from "../../types";
import { useToast } from "../../hooks/useToast";
import DashboardStats from "../../components/DashboardStats";
import { useJsApiLoader } from "@react-google-maps/api";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

const FALLBACK_GPS: Location = { lat: 18.9894, lng: 73.1175 };
const DEFAULT_HOSPITAL = { lat: 18.9904, lng: 73.1165 };

export default function AmbulancePage() {
  const { location, error: gpsError } = useLocation();
  const [gpsFallbackTriggered, setGpsFallbackTriggered] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const demoMode = !location && gpsFallbackTriggered;
  const origin = location || (gpsFallbackTriggered ? FALLBACK_GPS : null);

  const [destination, setDestination] = useState(DEFAULT_HOSPITAL);
  const [destinationName, setDestinationName] = useState("MGM Hospital Panvel");
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  const realGpsLocation = origin || FALLBACK_GPS;
  const activeEmergencies = isEmergencyActive ? 1 : 0;
  const greenSignalsActivated = isEmergencyActive ? 4 : 0;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!location) {
      timer = setTimeout(() => {
        setGpsFallbackTriggered(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [location]);

  const { hospitals, setHospitals, fetchHospitals, resetAndRetry, loading: searchingHospitals, error: hospitalsError } = useNearbyHospitals();
  const { directions, routeInfo, fetchRoute } = useDirectionsRoute();
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places", "geometry"],
  });

  // Helper to generate an OSRM route as a fallback, instead of Google Maps API which might throw REQUEST_DENIED
  const generateRouteFallback = async (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }): Promise<{ lat: number; lng: number }[]> => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error("OSRM failed");
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error("OSRM no match");
      return data.routes[0].geometry.coordinates.map((c: number[]) => ({
        lat: c[1],
        lng: c[0]
      }));
    } catch (err) {
      console.error("OSRM Route fallback error:", err);
      throw err;
    }
  };

  // Use Maps DirectionsService directly for the route, with OSRM fallback
  const generateRoute = async (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    return new Promise<{ path: { lat: number; lng: number }[]; result: google.maps.DirectionsResult | null }>((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        generateRouteFallback(origin, dest)
          .then(path => resolve({ path, result: null }))
          .catch(reject);
        return;
      }

      const svc = new window.google.maps.DirectionsService();
      svc.route(
        {
          origin,
          destination: dest,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        async (result, status) => {
          if (status === "OK" && result) {
            const path: { lat: number; lng: number }[] = [];
            result.routes[0].legs[0].steps.forEach((step) => {
              if (step.polyline && step.polyline.points) {
                window.google.maps.geometry.encoding
                  .decodePath(step.polyline.points)
                  .forEach((p) => {
                    path.push({ lat: p.lat(), lng: p.lng() });
                  });
              }
            });
            resolve({ path, result });
          } else {
            console.error("Directions request failed due to " + status + ". Falling back to OSRM...");
            try {
              const fallbackPath = await generateRouteFallback(origin, dest);
              resolve({ path: fallbackPath, result: null });
            } catch (fallbackError) {
              reject(status);
            }
          }
        }
      );
    });
  };

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const hospitalsFetched = useRef(false);
  const lastRerouteTime = useRef<number>(0);

  // Auto-select nearest hospital when hospitals list changes
  useEffect(() => {
    if (hospitals.length === 0) return;
    setSelectedHospitalId((prev) => {
      const stillExists = hospitals.find((h) => h.id === prev);
      return stillExists ? prev : hospitals[0].id;
    });
  }, [hospitals]);

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId) || null;

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // Fetch hospitals once when origin is ready
  useEffect(() => {
    if (!origin || hospitalsFetched.current) return;
    hospitalsFetched.current = true;
    fetchHospitals(null, origin);
  }, [origin, fetchHospitals]);

  const sim = useAmbulanceSimulation({
    routePoints,
    realGpsLocation,
    isActive: isEmergencyActive,
    onToast: showToast,
    onRecalculate: async (lat, lng) => {
      showToast("Recalculating route from new position...", "warning");
      try {
        const routeData = await generateRoute({ lat, lng }, destination);
        setRoutePoints(routeData.path);
        setDirectionsResult(routeData.result);
      } catch (_) {
        showToast("Failed to recalculate route", "warning");
      }
    }
  });
  const handleHospitalSelect = (hospital: { lat: number; lng: number; name: string; address: string } | Hospital) => {
    // Adapter to work with both types
    const h = 'id' in hospital 
      ? { lat: hospital.location.lat, lng: hospital.location.lng, name: hospital.name, address: (hospital as any).vicinity || "" }
      : hospital;

    setDestination({ lat: h.lat, lng: h.lng });
    setDestinationName(h.name);
    showToast(`🏥 Destination changed to ${h.name}`, "success");
    
    // Also sync the selected id if it came from a card
    if ('id' in hospital) {
      setSelectedHospitalId(hospital.id);
      if (origin && mapInstance && !directions) {
        fetchRoute(origin, hospital.location);
      }
    }
  };

  const handleActivate = async () => {
    try {
      showToast("Activating Green Corridor System...", "info");

      // Removed backend trigger function that was deleted in other branch
      
      // Always generate a DirectionsResult client-side for road-following display
      showToast("Generating optimal dispatch route...", "info");
      const routeData = await generateRoute(realGpsLocation, destination);
      const finalPath = routeData.path;
      const finalDirections = routeData.result;

      setRoutePoints(finalPath);
      setDirectionsResult(finalDirections);
      setIsEmergencyActive(true);
      showToast("Emergency Activated! System Live.", "success");
    } catch (err) {
      showToast(`Failed to generate route: ${err}`, "warning");
    }
  };

  // FIX 2: Route useEffect — only for auto-route on first hospital load
  useEffect(() => {
    if (!origin || !selectedHospital || !mapInstance) return;
    // Only auto-route if no route exists yet (first load)
    if (!directions) {
      fetchRoute(origin, selectedHospital.location);
    }
  }, [selectedHospital, mapInstance, origin, directions, fetchRoute]);

  // BUG 4: Live rerouting with cooldown to prevent infinite loop
  useEffect(() => {
    if (!location || !selectedHospital || !routeInfo || routeInfo.routePoints.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - lastRerouteTime.current < 10000) return; // cooldown 10s

    // Find minimum distance from GPS position to any point on the route
    let minDist = Infinity;
    for (const point of routeInfo.routePoints) {
      const distance = haversineMeters(location, point);
      if (distance < minDist) {
        minDist = distance;
      }
    }

    // If GPS is more than 50m away from route → reroute
    if (minDist > 50) {
      lastRerouteTime.current = now;
      fetchRoute(location, selectedHospital.location);
    }
  }, [location]); // ONLY depend on location to prevent infinite loops



  // ----------------------------------------------------------------  
  const handleCancel = async () => {
    showToast("Terminating Green Corridor...", "warning");
    // Removed cancelEmergency since it was part of backend call that failed
    setIsEmergencyActive(false);
    setRoutePoints([]);
    setDirectionsResult(null);
    sim.resetSimulation();
  };

  const handleChangeHospital = () => {
    document.getElementById("hospital-cards-panel")?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!origin && !gpsFallbackTriggered) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col font-sans items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="font-mono text-xs mt-4 uppercase tracking-widest text-gray-500">Acquiring GPS Signal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-white flex flex-col font-sans overflow-hidden relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Toast Messages UI using traditional Next.js methods */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-right pointer-events-auto ${toast.type === "success" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-100" : toast.type === "warning" ? "bg-amber-500/20 border-amber-500/50 text-amber-100" : toast.type === "error" ? "bg-red-500/20 border-red-500/50 text-red-100" : "bg-blue-500/20 border-blue-500/50 text-blue-100"}`}>
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Top Header & Actions — Glassmorphism */}
      <header className="h-auto border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-6 py-4 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
        {/* Header gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          {/* Left: Title */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-bold tracking-widest text-white uppercase flex items-center gap-2 whitespace-nowrap">
              <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">🚑</span> GoldenHour
              <span className="text-gray-500 font-light ml-2 border-l border-gray-700/50 pl-3">
                DISPATCH
              </span>
            </h1>
            {gpsError && (
              <span className="text-[10px] text-red-500 font-mono mt-1">GPS Error: {gpsError}</span>
            )}
          </div>

          {/* Center: Hospital Search */}
          <div className="flex-1 max-w-md">
            <HospitalSearch
              onHospitalSelect={handleHospitalSelect}
              isLoaded={isLoaded}
              currentLocation={realGpsLocation}
            />
          </div>

          {/* Right: Activation Button */}
          <div className="flex-shrink-0">
            {!isEmergencyActive ? (
              <button
                onClick={handleActivate}
                disabled={searchingHospitals || !isLoaded}
                className="w-full lg:w-auto px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-widest text-sm uppercase rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4),0_0_60px_rgba(220,38,38,0.15)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6),0_0_80px_rgba(220,38,38,0.25)] transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap border border-red-500/30"
              >
                {searchingHospitals || !isLoaded ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "⚡ Activate"
                )}
              </button>
            ) : (
              <button
                onClick={handleCancel}
                disabled={searchingHospitals}
                className="w-full lg:w-auto px-8 py-2.5 bg-gray-900/60 hover:bg-gray-800/80 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 border border-gray-600/50 font-bold tracking-widest text-sm uppercase rounded-lg transition-all duration-300 whitespace-nowrap backdrop-blur-sm"
              >
                ⏹ Terminate
              </button>
            )}
          </div>
        </div>
      </header>


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative z-10">
        {/* Top: Stats Bar */}
        <div className="shrink-0">
          <DashboardStats
            activeEmergencies={activeEmergencies}
            availableAmbulances={42}
            resolvedToday={12}
            greenSignalsActivated={greenSignalsActivated}
          />
        </div>

        {/* Middle/Bottom: Split View */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Main Map Area */}
          <div className="flex-[2] lg:flex-[3] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-[#0a0e1a]">
            {isLoaded ? (
              <MapView
                origin={realGpsLocation}
                ambulancePosition={sim.ambulancePosition || realGpsLocation}
                destination={destination}
                routePoints={routePoints}
                routeInfo={routeInfo}
                trafficSignals={sim.trafficSignals}
                isEmergencyActive={isEmergencyActive}
                bearing={sim.bearing}
                destinationName={destinationName}
                etaMinutes={sim.etaMinutes}
                remainingDistanceM={sim.remainingDistanceM}
                directions={directionsResult}
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onHospitalSelect={handleHospitalSelect}
                onMapLoad={handleMapLoad}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center border border-gray-800 rounded-xl">
                <div className="w-10 h-10 border-4 border-[#2979FF]/30 border-t-[#2979FF] rounded-full animate-spin" />
                <p className="mt-4 font-mono text-gray-500 text-sm tracking-widest uppercase">
                  Loading Google Maps...
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Hospital Cards */}
          <div id="hospital-cards-panel" className="flex-[1] lg:w-[35%] lg:h-full overflow-y-auto p-4 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-gray-800 bg-[#050B14]">
            <h2 className="text-white font-bold tracking-widest uppercase mb-1 text-sm flex items-center justify-between">
              <span>Nearby Hospitals</span>
              {searchingHospitals && <span className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>}
            </h2>

            {hospitals.map((h, i) => (
              <HospitalCard
                key={h.id}
                hospital={h}
                isNearest={i === 0}
                isSelected={h.id === selectedHospitalId}
                onSelect={(hospital) => handleHospitalSelect(hospital)}
              />
            ))}

            {hospitals.length === 0 && !searchingHospitals && (
              <div className="flex flex-col gap-2">
                <p className="text-gray-500 text-sm italic py-2">
                  {hospitalsError || "No hospitals found nearby."}
                </p>
                {origin && (
                  <button
                    onClick={() => resetAndRetry(mapInstance, origin)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 
                      text-white text-xs font-bold rounded-lg w-fit"
                  >
                    RETRY
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {routeInfo && selectedHospital && (
        <RouteInfoBar
          hospital={selectedHospital}
          routeInfo={routeInfo}
          onChangeHospital={handleChangeHospital}
          onStartEmergency={handleActivate}
        />
      )}
    </div>
  );
}