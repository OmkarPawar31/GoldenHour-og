// app/ambulance/page.tsx
"use client";

import { useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { useLocation } from "../../hooks/useLocation";
import { useEmergency } from "../../hooks/useEmergency";
import { useAmbulanceSimulation } from "../../hooks/useAmbulanceSimulation";
import { useToast } from "../../hooks/useToast";
import MapView from "../../components/MapView";
import LiveTracker from "../../components/LiveTracker";
import DashboardStats from "../../components/DashboardStats";
import ToastContainer from "../../components/ToastContainer";
import HospitalSearch from "../../components/HospitalSearch";

const FALLBACK_GPS = { lat: 18.9894, lng: 73.1175 }; // Panvel Station
const DEFAULT_HOSPITAL = { lat: 19.0144, lng: 73.0980 }; // MGM Hospital Panvel

const LIBRARIES: ("geometry" | "places")[] = ["geometry", "places"];

export default function AmbulancePage() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const { location: gpsLoc, error: gpsError } = useLocation();
  const { triggerEmergency, cancelEmergency, loading } = useEmergency();
  const { toasts, showToast, dismissToast } = useToast();

  const [destination, setDestination] = useState(DEFAULT_HOSPITAL);
  const [destinationName, setDestinationName] = useState("MGM Hospital Panvel");
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  const realGpsLocation = gpsLoc || FALLBACK_GPS;

  // Use Maps DirectionsService directly for the route
  const generateRoute = async (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    return new Promise<{ path: { lat: number; lng: number }[]; result: google.maps.DirectionsResult }>((resolve, reject) => {
      if (!window.google || !window.google.maps) return reject("Google Maps not loaded");

      const svc = new window.google.maps.DirectionsService();
      svc.route(
        {
          origin,
          destination: dest,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
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
            console.error("Directions request failed due to " + status);
            reject(status);
          }
        }
      );
    });
  };

  const sim = useAmbulanceSimulation({
    routePoints,
    realGpsLocation,
    isActive: isEmergencyActive,
    onToast: showToast,
    onRecalculate: async (lat, lng) => {
      showToast("Recalculating route from new position...", "warning");
      try {
        const { path: newPath, result: newResult } = await generateRoute({ lat, lng }, destination);
        setRoutePoints(newPath);
        setDirectionsResult(newResult);
      } catch (_) {
        showToast("Failed to recalculate route", "warning");
      }
    },
  });

  const handleHospitalSelect = (hospital: { lat: number; lng: number; name: string; address: string }) => {
    setDestination(hospital);
    setDestinationName(hospital.name);
    showToast(`🏥 Destination changed to ${hospital.name}`, "success");
  };

  const handleActivate = async () => {
    try {
      showToast("Activating Green Corridor System...", "info");

      // Try hitting the backend first
      let pathFromBackend = null;
      try {
        const res = await triggerEmergency({ origin: realGpsLocation, destination });
        if (res && res.route && res.route.path && res.route.path.length > 0) {
          pathFromBackend = res.route.path;
        }
      } catch (err) {
        console.warn("Backend emergency call failed, falling back to local simulation", err);
      }

      // Always generate a DirectionsResult client-side for road-following display
      // Even if backend provided a path, we need the DirectionsResult for proper road rendering
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

  const handleCancel = async () => {
    showToast("Terminating Green Corridor...", "warning");
    await cancelEmergency();
    setIsEmergencyActive(false);
    setRoutePoints([]);
    setDirectionsResult(null);
    sim.resetSimulation();
  };

  // Setup Dashboard Stats
  const activeEmergencies = isEmergencyActive ? 1 : 0;
  const greenSignalsActivated = sim.greenSignalCount;

  return (
    <div className="min-h-screen bg-[#050B14] text-white flex flex-col font-sans overflow-hidden relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/[0.02] rounded-full blur-[150px]" />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
                disabled={loading || !isLoaded}
                className="w-full lg:w-auto px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-widest text-sm uppercase rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4),0_0_60px_rgba(220,38,38,0.15)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6),0_0_80px_rgba(220,38,38,0.25)] transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap border border-red-500/30"
              >
                {loading || !isLoaded ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "⚡ Activate"
                )}
              </button>
            ) : (
              <button
                onClick={handleCancel}
                disabled={loading}
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
        <div className="flex-1 flex max-lg:flex-col gap-4 min-h-0">
          {/* Main Map Area */}
          <div className="flex-[2] lg:flex-[3] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-[#0a0e1a]">
            {isLoaded ? (
              <MapView
                ambulancePosition={sim.ambulancePosition || realGpsLocation}
                destination={destination}
                routePoints={routePoints}
                directionsResult={directionsResult}
                trafficSignals={sim.trafficSignals}
                isEmergencyActive={isEmergencyActive}
                bearing={sim.bearing}
                destinationName={destinationName}
                etaMinutes={sim.etaMinutes}
                remainingDistanceM={sim.remainingDistanceM}
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

          {/* Right Panel: Live Tracker */}
          <div className="lg:w-[360px] xl:w-[420px] shrink-0 h-full">
            <LiveTracker
              isEmergencyActive={isEmergencyActive}
              remainingDistanceM={sim.remainingDistanceM}
              etaMinutes={sim.etaMinutes}
              nextSignalDistanceM={sim.nextSignalDistanceM}
              greenSignalCount={sim.greenSignalCount}
              totalSignalCount={sim.totalSignalCount}
              speedKmh={sim.speedKmh}
              onSpeedChange={sim.setSpeed}
              gpsLocation={realGpsLocation}
              isComplete={sim.isComplete}
              progressPercent={sim.progressPercent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}