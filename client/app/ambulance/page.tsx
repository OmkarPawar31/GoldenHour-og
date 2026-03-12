// app/ambulance/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocation } from "../../hooks/useLocation";
import { useNearbyHospitals } from "../../hooks/useNearbyHospitals";
import { useDirectionsRoute } from "../../hooks/useDirectionsRoute";
import HospitalCard from "../../components/HospitalCard";
import RouteInfoBar from "../../components/RouteInfoBar";
import HospitalSearch from "../../components/HospitalSearch";
import { useAmbulanceSimulation } from "../../hooks/useAmbulanceSimulation";
import { haversineMeters } from "../../utils/geoUtils";
import { Location, Hospital } from "../../types";
import { useToast } from "../../hooks/useToast";
import DashboardStats from "../../components/DashboardStats";
import { useJsApiLoader } from "@react-google-maps/api";
import { useDispatchBroadcast } from "../../hooks/useDispatchBroadcast";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

const FALLBACK_GPS: Location = { lat: 18.9894, lng: 73.1175 };
const DEFAULT_HOSPITAL = { lat: 18.9904, lng: 73.1165 };

// Generate a random ambulance spawn point within 0.3–0.8 km of the patient
function generateNearbyDepot(origin: Location): Location {
  const distKm = 0.3 + Math.random() * 0.5; // 0.3–0.8 km
  const bearingDeg = Math.random() * 360;
  const R = 6371;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distKm / R) +
    Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(brng)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(distKm / R) * Math.cos(lat1),
    Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// Default static depot (fallback)
const STATIC_DEPOT: Location = { lat: 18.9934, lng: 73.1215 };

// ── Toast Notification Component ──
function ToastNotifications({
  toasts,
  dismissToast,
}: {
  toasts: { id: string; message: string; type: string }[];
  dismissToast: (id: string) => void;
}) {
  const typeStyles: Record<string, string> = {
    success: "bg-emerald-500/20 border-emerald-500/50 text-emerald-100",
    warning: "bg-amber-500/20 border-amber-500/50 text-amber-100",
    error: "bg-red-500/20 border-red-500/50 text-red-100",
    info: "bg-blue-500/20 border-blue-500/50 text-blue-100",
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 toast-enter pointer-events-auto ${typeStyles[toast.type] || typeStyles.info}`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Route Generation Utilities ──
async function generateRouteFallback(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ lat: number; lng: number }[]> {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
  );
  if (!response.ok) throw new Error("OSRM failed");
  const data = await response.json();
  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) throw new Error("OSRM no match");
  return data.routes[0].geometry.coordinates.map((c: number[]) => ({
    lat: c[1],
    lng: c[0],
  }));
}

async function generateRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ path: { lat: number; lng: number }[]; result: google.maps.DirectionsResult | null }> {
  if (!window.google || !window.google.maps) {
    const path = await generateRouteFallback(origin, dest);
    return { path, result: null };
  }

  return new Promise((resolve, reject) => {
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
          result.routes[0].legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              if (step.path && Array.isArray(step.path)) {
                step.path.forEach((p) => {
                  path.push({ lat: p.lat(), lng: p.lng() });
                });
              }
            });
          });

          // Fallback to overview_path if steps don't have paths
          if (path.length === 0 && result.routes[0].overview_path) {
            result.routes[0].overview_path.forEach((p) => {
              path.push({ lat: p.lat(), lng: p.lng() });
            });
          }

          resolve({ path, result });
        } else {
          console.warn("Directions API failed (" + status + "). Falling back to OSRM...");
          try {
            const fallbackPath = await generateRouteFallback(origin, dest);
            resolve({ path: fallbackPath, result: null });
          } catch (err) {
            reject(status);
          }
        }
      }
    );
  });
}

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
  const [ambulanceAtPatient, setAmbulanceAtPatient] = useState(false);
  const [currentLeg, setCurrentLeg] = useState<'depot-to-patient' | 'patient-to-hospital' | 'idle'>('idle');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [ambulanceDepot, setAmbulanceDepot] = useState<Location>(STATIC_DEPOT);
  const { toasts, showToast, dismissToast } = useToast();
  const realGpsLocation = origin || FALLBACK_GPS;
  const activeEmergencies = isEmergencyActive ? 1 : 0;
  const greenSignalsActivated = isEmergencyActive ? 4 : 0;

  // ─── Dispatch broadcast (real-time sync with operator dashboard) ───
  const ambulanceId = useMemo(() => `AMB-${Date.now().toString(36).toUpperCase()}`, []);
  const { broadcastActivation, broadcastPosition, broadcastDeactivation } = useDispatchBroadcast({
    ambulanceId,
    isActive: isEmergencyActive,
  });

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

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const hospitalsFetched = useRef(false);
  const lastRerouteTime = useRef<number>(0);

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId) || null;

  // Auto-select nearest hospital when hospitals list changes
  useEffect(() => {
    if (hospitals.length === 0) return;
    setSelectedHospitalId((prev) => {
      const stillExists = hospitals.find((h) => h.id === prev);
      const newId = stillExists ? prev : hospitals[0].id;

      const newHospitalData = hospitals.find(h => h.id === newId);
      if (newHospitalData) {
        setDestination({ lat: newHospitalData.location.lat, lng: newHospitalData.location.lng });
        setDestinationName(newHospitalData.name);
      }

      return newId;
    });
  }, [hospitals]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // Fetch hospitals once when origin is ready
  useEffect(() => {
    if (!origin || hospitalsFetched.current) return;
    hospitalsFetched.current = true;
    fetchHospitals(null, origin);
  }, [origin, fetchHospitals]);

  // When simulation completes leg 1 (depot→patient), start leg 2 (patient→hospital)
  const handleLegComplete = useCallback(async () => {
    if (currentLeg === 'depot-to-patient') {
      showToast("🚑 Ambulance reached patient! Routing to hospital...", "success");
      setAmbulanceAtPatient(true);
      setCurrentLeg('patient-to-hospital');
      try {
        const routeData = await generateRoute(realGpsLocation, destination);
        setRoutePoints(routeData.path);
        setDirectionsResult(routeData.result);
      } catch (err) {
        showToast(`Failed to generate route to hospital: ${err}`, "warning");
      }
    } else if (currentLeg === 'patient-to-hospital') {
      showToast("🏥 Ambulance arrived at hospital! Patient delivered safely.", "success");
      setCurrentLeg('idle');
    }
  }, [currentLeg, realGpsLocation, destination, showToast]);

  const sim = useAmbulanceSimulation({
    routePoints,
    realGpsLocation,
    isActive: isEmergencyActive,
    onToast: showToast,
    onLegComplete: handleLegComplete,
    onRecalculate: async (lat, lng) => {
      showToast("Recalculating route from new position...", "warning");
      try {
        const recalcDest = currentLeg === 'depot-to-patient' ? realGpsLocation : destination;
        const routeData = await generateRoute({ lat, lng }, recalcDest);
        setRoutePoints(routeData.path);
        setDirectionsResult(routeData.result);
      } catch (_) {
        showToast("Failed to recalculate route", "warning");
      }
    }
  });

  const handleHospitalSelect = (hospital: { lat: number; lng: number; name: string; address: string; id?: string } | Hospital) => {
    const h = 'location' in hospital
      ? { lat: hospital.location.lat, lng: hospital.location.lng, name: hospital.name, address: (hospital as Hospital).address || "", id: hospital.id }
      : hospital;

    const loc = { lat: h.lat, lng: h.lng };
    setDestination(loc);
    setDestinationName(h.name);
    showToast(`🏥 Destination changed to ${h.name}`, "success");

    if (h.id) {
      setSelectedHospitalId(h.id);
    } else {
      setSelectedHospitalId(null);
    }

    if (origin) {
      fetchRoute(origin, loc);
    }
  };

  const handleActivate = async () => {
    try {
      showToast("Activating Green Corridor System...", "info");

      const depot = generateNearbyDepot(realGpsLocation);
      setAmbulanceDepot(depot);

      showToast("🚑 Dispatching ambulance to patient location...", "info");
      setCurrentLeg('depot-to-patient');
      setAmbulanceAtPatient(false);

      const leg1Route = await generateRoute(depot, realGpsLocation);
      setRoutePoints(leg1Route.path);
      setDirectionsResult(leg1Route.result);
      setIsEmergencyActive(true);

      // Broadcast activation to operator dashboard
      broadcastActivation({
        lat: depot.lat,
        lng: depot.lng,
        destination: { lat: destination.lat, lng: destination.lng, name: destinationName },
        routePoints: leg1Route.path,
        currentLeg: 'depot-to-patient',
      });

      showToast("Emergency Activated! Ambulance en route to patient.", "success");
    } catch (err) {
      showToast(`Failed to generate route: ${err}`, "warning");
    }
  };

  // Route useEffect — auto-route on first hospital load
  useEffect(() => {
    if (!origin || !selectedHospital || hospitalsFetched.current === false) return;
    if (!routeInfo && !isEmergencyActive) {
      fetchRoute(origin, selectedHospital.location);
    }
  }, [selectedHospital, origin, routeInfo, isEmergencyActive, fetchRoute]);

  // Live rerouting with cooldown to prevent infinite loop
  useEffect(() => {
    if (!location || !selectedHospital || !routeInfo || routeInfo.routePoints.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - lastRerouteTime.current < 10000) return;

    let minDist = Infinity;
    for (const point of routeInfo.routePoints) {
      const distance = haversineMeters(location, point);
      if (distance < minDist) {
        minDist = distance;
      }
    }

    if (minDist > 50) {
      lastRerouteTime.current = now;
      fetchRoute(location, selectedHospital.location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // ─── Broadcast position to operator dashboard every 1s ───
  useEffect(() => {
    if (!isEmergencyActive || !sim.ambulancePosition) return;

    const interval = setInterval(() => {
      if (!sim.ambulancePosition) return;
      broadcastPosition({
        lat: sim.ambulancePosition.lat,
        lng: sim.ambulancePosition.lng,
        bearing: sim.bearing,
        speed: sim.speedKmh,
        eta: sim.etaMinutes,
        remainingM: sim.remainingDistanceM,
        destination: { lat: destination.lat, lng: destination.lng, name: destinationName },
        routePoints,
        currentLeg,
        progressPercent: sim.progressPercent,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEmergencyActive, sim.ambulancePosition, sim.bearing, sim.speedKmh,
      sim.etaMinutes, sim.remainingDistanceM, sim.progressPercent,
      destination, destinationName, routePoints, currentLeg, broadcastPosition]);

  const handleCancel = async () => {
    showToast("Terminating Green Corridor...", "warning");
    setIsEmergencyActive(false);
    setRoutePoints([]);
    setDirectionsResult(null);
    setCurrentLeg('idle');
    setAmbulanceAtPatient(false);
    setAmbulanceDepot(STATIC_DEPOT);
    sim.resetSimulation();

    // Broadcast deactivation to operator dashboard
    broadcastDeactivation();
  };

  const handleChangeHospital = () => {
    document.getElementById("hospital-cards-panel")?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── GPS Acquiring Screen ──
  if (!origin && !gpsFallbackTriggered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-red-600/[0.04] rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-blue-600/[0.04] rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />

        {/* Heartbeat icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center animate-heartbeat shadow-[0_0_40px_rgba(239,68,68,0.15)]">
            <span className="text-4xl">🚑</span>
          </div>
          <div className="absolute -inset-3 border border-red-500/20 rounded-3xl animate-ping opacity-30 pointer-events-none" />
        </div>

        <h1 className="text-xl font-bold tracking-[0.3em] uppercase text-white mb-1">GoldenHour</h1>
        <p className="text-[11px] text-gray-500 font-mono uppercase tracking-[0.2em] mb-6">Emergency Dispatch System</p>

        {/* GPS signal bars */}
        <div className="flex items-end gap-1 mb-3">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className="w-1.5 bg-blue-500/40 rounded-full animate-pulse"
              style={{
                height: `${bar * 5 + 4}px`,
                animationDelay: `${bar * 200}ms`,
              }}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-600">Acquiring GPS Signal</p>
      </div>
    );
  }

  // ── Main Page ──
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col overflow-hidden relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.03] rounded-full blur-[120px] animate-float" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s', animationDuration: '10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Demo mode ribbon */}
      {demoMode && (
        <div className="fixed top-20 right-0 z-[90] bg-amber-500/90 text-black text-[10px] font-bold tracking-[0.2em] uppercase px-6 py-1.5 shadow-lg">
          ⚠ DEMO MODE — Simulated GPS
        </div>
      )}

      {/* Toast Messages */}
      <ToastNotifications toasts={toasts} dismissToast={dismissToast} />

      {/* Top Header & Actions */}
      <header className="border-b border-white/[0.04] bg-[#020617]/90 backdrop-blur-2xl px-6 py-3.5 z-50 shadow-2xl relative overflow-hidden">
        {/* Header gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[600px] h-[40px] bg-red-500/[0.03] rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Left: Title + Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center transition-all duration-500 ${
              isEmergencyActive ? "shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse-glow" : "shadow-[0_0_12px_rgba(239,68,68,0.15)]"
            }`}>
              <span className="text-lg">🚑</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-[0.2em] text-white uppercase whitespace-nowrap leading-tight">
                GoldenHour
                <span className="text-gray-600 font-light ml-2 text-xs">
                  DISPATCH
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Live GPS indicator */}
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${location ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-[9px] font-mono text-gray-500 tracking-wider uppercase">
                    {location ? 'GPS LIVE' : 'GPS ACQUIRING'}
                  </span>
                </div>
                {/* Emergency status */}
                {isEmergencyActive && (
                  <div className="flex items-center gap-1 ml-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    <span className="text-[9px] font-mono text-red-400 tracking-wider uppercase font-bold">
                      EMERGENCY
                    </span>
                  </div>
                )}
                {gpsError && (
                  <span className="text-[9px] text-red-500/70 font-mono">• {gpsError}</span>
                )}
              </div>
            </div>
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
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300 flex items-center gap-2 whitespace-nowrap border border-red-500/30"
              >
                {searchingHospitals || !isLoaded ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>⚡ Activate</>
                )}
              </button>
            ) : (
              <button
                onClick={handleCancel}
                disabled={searchingHospitals}
                className="px-6 py-2.5 bg-gray-900/60 hover:bg-gray-800/80 disabled:opacity-50 text-gray-300 border border-gray-600/50 font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl transition-all duration-300 whitespace-nowrap"
              >
                ⏹ Terminate
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-5 lg:p-6 gap-5 overflow-hidden relative z-10 max-w-[2000px] mx-auto w-full">
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
        <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
          {/* Main Map Area */}
          <div className={`flex-[2] lg:flex-[3] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.4)] bg-[#0B1221] border relative transition-all duration-1000 ${
            isEmergencyActive
              ? 'border-red-500/30 shadow-[0_0_60px_rgba(239,68,68,0.15)] animate-border-glow'
              : 'border-white/[0.06]'
          }`}>
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
                ambulanceDepot={ambulanceDepot}
                currentLeg={currentLeg}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1221]">
                <div className="relative">
                  <div className="w-14 h-14 border-[3px] border-[#2979FF]/15 border-t-[#2979FF] rounded-full animate-spin" />
                  <div className="absolute inset-1 w-12 h-12 border-[3px] border-transparent border-b-blue-400/25 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />
                  <div className="absolute inset-0 w-14 h-14 rounded-full shadow-[0_0_30px_rgba(41,121,255,0.15)]" />
                </div>
                <p className="mt-5 font-mono text-gray-500 text-[10px] tracking-[0.25em] uppercase">
                  Initializing Map Engine
                </p>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-blue-500/40 animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Hospital Cards */}
          <div id="hospital-cards-panel" className="flex-[1] lg:w-[32%] lg:h-full overflow-y-auto dark-scroll p-5 flex flex-col gap-3.5 rounded-2xl border border-white/[0.06] bg-[#0B1221]/80 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-bold tracking-[0.15em] uppercase text-[11px] flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <span className="text-xs">🏥</span>
                </div>
                Nearby Hospitals
                {hospitals.length > 0 && (
                  <span className="text-[10px] text-gray-500 font-mono font-normal tracking-normal bg-white/[0.03] px-1.5 py-0.5 rounded">{hospitals.length}</span>
                )}
              </h2>
              {searchingHospitals && <span className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>}
            </div>

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
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/50 border border-gray-700/30 flex items-center justify-center mb-1">
                  <span className="text-2xl opacity-40">🏥</span>
                </div>
                <p className="text-gray-500 text-sm text-center">
                  {hospitalsError || "No hospitals found nearby."}
                </p>
                <p className="text-gray-600 text-[10px] text-center font-mono tracking-wider uppercase">
                  Try searching or expanding the area
                </p>
                {origin && (
                  <button
                    onClick={() => resetAndRetry(mapInstance, origin)}
                    className="mt-1 px-5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-bold tracking-[0.15em] uppercase rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300"
                  >
                    ↻ Retry Search
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