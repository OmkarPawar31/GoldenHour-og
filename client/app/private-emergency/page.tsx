"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { useNearbyHospitals } from "../../hooks/useNearbyHospitals";
import { useJsApiLoader } from "@react-google-maps/api";
import HospitalCard from "../../components/HospitalCard";
import HospitalSearch from "../../components/HospitalSearch";
import { useDirectionsRoute } from "../../hooks/useDirectionsRoute";
import RouteInfoBar from "../../components/RouteInfoBar";
import { useAmbulanceSimulation, DummyCar } from "../../hooks/useAmbulanceSimulation";
import { useElevenLabsVoice } from "../../hooks/useElevenLabsVoice";
import { useAmbulanceProximityAlert } from "../../hooks/useAmbulanceProximityAlert";
import { SOCKET_URL } from "../../utils/constants";
import { Hospital, Location } from "../../types";
import { useLocation } from "../../hooks/useLocation";
import { useToast } from "../../hooks/useToast";
import { useDispatchBroadcast } from "../../hooks/useDispatchBroadcast";
import DashboardStats from "../../components/DashboardStats";
import { CarFront, AlertTriangle, Square, Building2, Ambulance, Check, RotateCw } from "lucide-react";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

type SessionState = "idle" | "pending" | "active" | "terminating";

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "warn" | "success" | "error";
}

interface NearbyAmbulance {
  id: string;
  distance: string;
  eta: string;
  status: "en-route" | "available" | "busy";
  lat?: number;
  lng?: number;
}

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const FALLBACK_GPS: Location = { lat: 18.9894, lng: 73.1175 };
const DEFAULT_HOSPITAL = { lat: 18.9904, lng: 73.1165 };

function nowStr() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/* ─────────────────────────────────────────────────────────
   SIMULATED NEARBY AMBULANCES
───────────────────────────────────────────────────────── */
function calculateStartingPoint(origin: Location, distanceStr: string): Location {
  const distKm = parseFloat(distanceStr) || 1.0;
  const bearing = Math.random() * 360 * (Math.PI / 180);
  const R = 6371;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distKm / R) + Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distKm / R) * Math.cos(lat1), Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function generateNearbyAmbulances(origin: Location): NearbyAmbulance[] {
  const statuses: NearbyAmbulance["status"][] = ["en-route", "available", "busy"];
  const count = Math.floor(1 + Math.random() * 3);
  return Array.from({ length: count }, (_, i) => {
    const distanceStr = `${(0.3 + Math.random() * 6).toFixed(1)} km`;
    const loc = calculateStartingPoint(origin, distanceStr);
    return {
      id: `AMB-${String(101 + i).padStart(3, "0")}`,
      distance: distanceStr,
      eta: `${Math.floor(2 + Math.random() * 8)} min`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lat: loc.lat,
      lng: loc.lng
    };
  });
}

// Generate dummy cars (nearby traffic) for simulation — same as ambulance page
function generateDummyCars(origin: Location, count: number = 3): DummyCar[] {
  const dummyCars: DummyCar[] = [];
  for (let i = 0; i < count; i++) {
    const distKm = 0.5 + Math.random() * 1.0;
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
    dummyCars.push({
      id: `CAR-${i}-${Date.now()}`,
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI,
      alerted: false,
    });
  }
  return dummyCars;
}

/* ─────────────────────────────────────────────────────────
   ROUTE GENERATION — Same as ambulance page
───────────────────────────────────────────────────────── */
async function generateRouteFallback(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ lat: number; lng: number }[]> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`
    );
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== "Ok") throw new Error(`OSRM code: ${data.code}`);
    if (!data.routes || data.routes.length === 0) throw new Error("OSRM returned no routes");
    const path = data.routes[0].geometry.coordinates.map((c: number[]) => ({
      lat: c[1], lng: c[0],
    }));
    console.log("[OSRM] Route successful:", path.length, "points");
    return path;
  } catch (err) {
    console.error("[OSRM] Failed:", err instanceof Error ? err.message : String(err));
    console.log("[Fallback] Creating direct path");
    return [origin, dest];
  }
}

async function generateRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ path: { lat: number; lng: number }[]; result: google.maps.DirectionsResult | null }> {
  if (!window.google || !window.google.maps) {
    console.warn("[Route] Google Maps not loaded, using OSRM");
    const path = await generateRouteFallback(origin, dest);
    return { path, result: null };
  }

  return new Promise((resolve) => {
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      { origin, destination: dest, travelMode: window.google.maps.TravelMode.DRIVING },
      async (result, status) => {
        if (status === "OK" && result) {
          console.log("[Google] Route successful");
          const path: { lat: number; lng: number }[] = [];
          result.routes[0].legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              if (step.path && Array.isArray(step.path)) {
                step.path.forEach((p) => { path.push({ lat: p.lat(), lng: p.lng() }); });
              }
            });
          });
          if (path.length === 0 && result.routes[0].overview_path) {
            result.routes[0].overview_path.forEach((p) => {
              path.push({ lat: p.lat(), lng: p.lng() });
            });
          }
          resolve({ path, result });
        } else {
          console.warn(`[Google] Directions API failed (${status}). Falling back to OSRM...`);
          try {
            const fallbackPath = await generateRouteFallback(origin, dest);
            resolve({ path: fallbackPath, result: null });
          } catch (_) {
            resolve({ path: [origin, dest], result: null });
          }
        }
      }
    );
  });
}

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
export default function PrivateEmergencyDashboard() {

  /* ── Core state (mirrors ambulance page) ── */
  const { location, error: gpsError } = useLocation();
  const [gpsFallbackTriggered, setGpsFallbackTriggered] = useState(false);
  const [session, setSession] = useState<SessionState>("idle");

  const demoMode = !location && gpsFallbackTriggered;
  const origin = location || (gpsFallbackTriggered ? FALLBACK_GPS : null);
  const realGpsLocation = origin || FALLBACK_GPS;

  const [destination, setDestination] = useState(DEFAULT_HOSPITAL);
  const [destinationName, setDestinationName] = useState("Civil Hospital");
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [ambulanceAtPatient, setAmbulanceAtPatient] = useState(false);
  const [currentLeg, setCurrentLeg] = useState<'depot-to-patient' | 'patient-to-hospital' | 'idle'>('idle');
  const [ambulanceDepot, setAmbulanceDepot] = useState<Location | null>(null);
  const [dummyCars, setDummyCars] = useState<DummyCar[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  const { showToast, toasts, dismissToast } = useToast();
  const { speak } = useElevenLabsVoice();
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  /* Private-specific state */
  const [plateNumber, setPlateNumber] = useState("");
  const [plateSubmitted, setPlateSubmitted] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [severity, setSeverity] = useState("");
  const [nearbyAmbulances, setNearbyAmbulances] = useState<NearbyAmbulance[]>([]);
  const [adminApproved, setAdminApproved] = useState(false);
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places", "geometry"],
  });

  const { hospitals, setHospitals, fetchHospitals, resetAndRetry, loading: searchingHospitals, error: hospitalsError } = useNearbyHospitals();
  const { directions, routeInfo, fetchRoute } = useDirectionsRoute();
  const hospitalsFetched = useRef(false);
  const lastRerouteTime = useRef<number>(0);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId) || null;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambulanceRefresh = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const ambulancePositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // ─── Dispatch broadcast (same as ambulance page) ───
  const ambulanceId = useMemo(() => `PVT-${Date.now().toString(36).toUpperCase()}`, []);
  const { broadcastActivation, broadcastPosition, broadcastDeactivation } = useDispatchBroadcast({
    ambulanceId,
    isActive: session === "active",
  });

  /* ── helpers ── */
  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLog(prev => [...prev.slice(-49), { time: nowStr(), msg, type }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  /* ── Auto-load from Emergency modal (sessionStorage) ── */
  useEffect(() => {
    const name  = sessionStorage.getItem("em_name") || "";
    const phone = sessionStorage.getItem("em_phone") || "";
    const plate = sessionStorage.getItem("em_plate") || "";
    const sev   = sessionStorage.getItem("em_severity") || "";
    if (name || plate) {
      setPatientName(name);
      setPatientPhone(phone);
      setPlateNumber(plate);
      setSeverity(sev);
      setPlateSubmitted(true);
      ["em_name","em_phone","em_plate","em_severity","em_destination"].forEach(k => sessionStorage.removeItem(k));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS fallback timeout (same as ambulance page)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!location) {
      timer = setTimeout(() => {
        setGpsFallbackTriggered(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [location]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  /* ── Fetch hospitals once when origin is ready ── */
  useEffect(() => {
    if (!origin || hospitalsFetched.current) return;
    hospitalsFetched.current = true;
    fetchHospitals(null, origin);
  }, [origin, fetchHospitals]);

  /* ── Auto-select nearest hospital ── */
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

  /* ── Refresh nearby ambulances periodically ── */
  useEffect(() => {
    setNearbyAmbulances(generateNearbyAmbulances(realGpsLocation));
    ambulanceRefresh.current = setInterval(() => {
      setNearbyAmbulances(generateNearbyAmbulances(realGpsLocation));
    }, 8000);
    return () => { if (ambulanceRefresh.current) clearInterval(ambulanceRefresh.current); };
  }, [realGpsLocation]);

  // Route useEffect — auto-route on first hospital load (same as ambulance page)
  useEffect(() => {
    if (!origin || !selectedHospital || hospitalsFetched.current === false) return;
    if (!routeInfo && session !== "active") {
      fetchRoute(origin, selectedHospital.location);
    }
  }, [selectedHospital, origin, routeInfo, session, fetchRoute]);

  /* ═══════════════════════════════════════════════════════
     CORE ROUTING — Same 2-leg algorithm as ambulance page
     Leg 1: depot → patient
     Leg 2: patient → hospital
  ═══════════════════════════════════════════════════════ */

  // When simulation completes leg 1 (depot→patient), start leg 2 (patient→hospital)
  const handleLegComplete = useCallback(async () => {
    if (currentLeg === 'depot-to-patient') {
      showToast("🚑 Ambulance reached patient! Routing to hospital...", "success");
      addLog("✓ Ambulance arrived at patient location!", "success");
      addLog("📋 Patient onboard - Securing patient...", "info");
      speak("Ambulance has arrived at patient location. Now routing to hospital.");
      setAmbulanceAtPatient(true);
      setCurrentLeg('patient-to-hospital');

      const selectedHosp = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];
      const hospDest = selectedHosp
        ? { lat: selectedHosp.location.lat, lng: selectedHosp.location.lng }
        : destination;
      const hospName = selectedHosp?.name || destinationName;

      addLog(`🚑 PHASE 2: En-Route to ${hospName}`, "success");

      try {
        const startPos = ambulancePositionRef.current ?? realGpsLocation;
        const routeData = await generateRoute(startPos, hospDest);
        setRoutePoints(routeData.path);
        setDirectionsResult(routeData.result);
        addLog(`Route to hospital: ${routeData.path.length} points`, "info");

        broadcastActivation({
          lat: startPos.lat,
          lng: startPos.lng,
          destination: { lat: hospDest.lat, lng: hospDest.lng, name: hospName },
          routePoints: routeData.path,
          currentLeg: 'patient-to-hospital',
        });
      } catch (err) {
        showToast(`Failed to generate route to hospital: ${err}`, "warning");
        addLog(`Route error: ${err}`, "error");
      }
    } else if (currentLeg === 'patient-to-hospital') {
      showToast("🏥 Ambulance arrived at hospital! Patient delivered safely.", "success");
      addLog("🏥 Patient delivered to hospital safely!", "success");
      speak("Patient has been delivered to the hospital safely.");
      setCurrentLeg('idle');
    }
  }, [currentLeg, realGpsLocation, destination, destinationName, hospitals, selectedHospitalId, showToast, addLog, speak, broadcastActivation]);

  const sim = useAmbulanceSimulation({
    routePoints,
    realGpsLocation: realGpsLocation,
    isActive: session === "active",
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

  useEffect(() => {
    ambulancePositionRef.current = sim.ambulancePosition;
  }, [sim.ambulancePosition]);

  // ─── Proximity Alert: same as ambulance page ───
  const proximityAlert = useAmbulanceProximityAlert(
    session === "active" && currentLeg === 'depot-to-patient' ? realGpsLocation : null,
    { thresholdMeters: 1000, enableVoice: false, checkIntervalMs: 1000 }
  );

  useEffect(() => {
    if (proximityAlert.isNearby && session === "active" && currentLeg === 'depot-to-patient') {
      if (dummyCars.length === 0) {
        const newDummyCars = generateDummyCars(realGpsLocation, 3);
        setDummyCars(newDummyCars);
        showToast("⚠️ Nearby traffic detected - slow down", "warning");
        speak("Ambulance approaching nearby patient location. Nearby traffic detected, please reduce speed.");
      }
    } else if (!proximityAlert.isNearby && dummyCars.length > 0) {
      setDummyCars([]);
    }
  }, [proximityAlert.isNearby, session, currentLeg, dummyCars.length, realGpsLocation, showToast, speak]);

  // ─── Broadcast position every 1s (same as ambulance page) ───
  useEffect(() => {
    if (session !== "active" || !sim.ambulancePosition) return;
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
  }, [session, sim.ambulancePosition, sim.bearing, sim.speedKmh,
      sim.etaMinutes, sim.remainingDistanceM, sim.progressPercent,
      destination, destinationName, routePoints, currentLeg, broadcastPosition]);

  /* ── Hospital select handler (matches ambulance page) ── */
  const handleHospitalSelect = (hospital: { lat: number; lng: number; name: string; address: string; id?: string } | Hospital) => {
    const h = 'location' in hospital
      ? { lat: hospital.location.lat, lng: hospital.location.lng, name: hospital.name, address: (hospital as Hospital).address || "", id: hospital.id }
      : hospital;

    const loc = { lat: h.lat, lng: h.lng };
    setDestination(loc);
    setDestinationName(h.name);
    addLog(`Target changed: ${h.name}`, "info");

    if (h.id) {
      setSelectedHospitalId(h.id);
    } else {
      setSelectedHospitalId(null);
    }

    if (origin) {
      fetchRoute(origin, loc);
    }
    showToast(`🏥 Destination changed to ${h.name}`, "success");
  };

  const handleChangeHospital = () => {
    document.getElementById("hospital-cards-panel")?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Submit plate ── */
  const handlePlateSubmit = () => {
    if (!plateNumber.trim()) return;
    setPlateSubmitted(true);
    addLog(`Vehicle plate registered: ${plateNumber.toUpperCase()}`, "success");
  };

  /* ═══════════════════════════════════════════════════════
     ACTIVATE — Same 2-leg flow as ambulance page
     1. Generate route from ambulance depot → patient
     2. On leg complete, auto-generate route patient → hospital
  ═══════════════════════════════════════════════════════ */
  const handleActivate = useCallback(async (ambulance?: NearbyAmbulance) => {
    try {
      addLog("Activating Green Corridor System...", "info");
      showToast("Activating Green Corridor System...", "info");

      // Determine ambulance starting position
      const depot = ambulance && ambulance.lat && ambulance.lng
        ? { lat: ambulance.lat, lng: ambulance.lng }
        : calculateStartingPoint(realGpsLocation, "2.5 km");
      setAmbulanceDepot(depot);

      addLog(`🚑 Dispatching ambulance from ${ambulance?.distance || "nearby"}`, "info");
      showToast("🚑 Dispatching ambulance to patient location...", "info");
      setCurrentLeg('depot-to-patient');
      setAmbulanceAtPatient(false);
      setElapsed(0);

      // Leg 1: depot → patient (same as ambulance page)
      const leg1Route = await generateRoute(depot, realGpsLocation);
      setRoutePoints(leg1Route.path);
      setDirectionsResult(leg1Route.result);
      setSession("active");

      addLog(`Route: ${leg1Route.path.length} points from depot to patient`, "success");
      addLog("🚑 PHASE 1: Ambulance En-Route to Patient", "success");

      // Start elapsed timer
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

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
      addLog(`Route generation failed: ${err}`, "error");
    }
  }, [realGpsLocation, destination, destinationName, addLog, showToast, broadcastActivation]);

  /* ── Assign ambulance (with admin approval simulation) ── */
  const assignAmbulance = useCallback((amb: NearbyAmbulance) => {
    if (!plateSubmitted) {
      addLog("Enter and submit your plate number first", "error");
      return;
    }

    setSession("pending");
    addLog(`🚑 Ambulance Selected: ${amb.id}`, "success");
    addLog(`Distance: ${amb.distance} · ETA: ${amb.eta}`, "info");
    addLog("Awaiting admin approval for dispatch…", "warn");

    // Notify dispatch namespace
    const dispatchSocket = io(`${SOCKET_URL}/dispatch`, { transports: ["websocket", "polling"] });
    dispatchSocket.emit("private:emergency-request", {
      ambulanceId: amb.id,
      location: origin,
      patientName: patientName || "Private User",
      patientPhone, plateNumber, severity
    });
    dispatchSocket.emit("ambulance:dispatch", {
      ambulanceId: amb.id,
      location: origin,
      patientName: patientName || "Private User",
      patientPhone, plateNumber, severity
    });

    // Simulate admin approval after 2.5s
    setTimeout(() => {
      setAdminApproved(true);
      addLog("✓ Admin approved — corridor granted", "success");
      handleActivate(amb);
    }, 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateNumber, plateSubmitted, handleActivate]);

  /* ── Request corridor (auto-find nearest ambulance) ── */
  const requestCorridor = useCallback(() => {
    if (!plateSubmitted) {
      addLog("Enter and submit your plate number first", "error");
      return;
    }

    const searchRadiusKm = 5.0;
    const eligible = nearbyAmbulances
      .filter(a => parseFloat(a.distance) <= searchRadiusKm && (a.status === "available" || a.status === "en-route"))
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    const nearest = eligible[0];

    if (nearest) {
      addLog(`✓ Ambulance ${nearest.id} found (${nearest.distance})`, "success");
      speak(`Ambulance dispatched, estimated arrival ${nearest.eta}`);
      assignAmbulance(nearest);
    } else {
      addLog("No ambulance found nearby. Routing directly to hospital...", "warn");
      speak("No ambulance available. Routing to nearest hospital.");

      setSession("pending");
      setTimeout(() => {
        setAdminApproved(true);
        addLog("✓ Admin approved — Green corridor granted", "success");
        // Direct to hospital mode — skip leg 1
        setCurrentLeg('patient-to-hospital');
        setSession("active");

        const selectedHosp = hospitals[0];
        if (selectedHosp) {
          setSelectedHospitalId(selectedHosp.id);
          setDestination({ lat: selectedHosp.location.lat, lng: selectedHosp.location.lng });
          setDestinationName(selectedHosp.name);
        }

        (async () => {
          try {
            const routeData = await generateRoute(realGpsLocation, destination);
            setRoutePoints(routeData.path);
            setDirectionsResult(routeData.result);
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
            broadcastActivation({
              lat: realGpsLocation.lat, lng: realGpsLocation.lng,
              destination: { lat: destination.lat, lng: destination.lng, name: destinationName },
              routePoints: routeData.path,
              currentLeg: 'patient-to-hospital',
            });
          } catch (err) {
            showToast(`Failed to generate route: ${err}`, "warning");
          }
        })();
      }, 2500);
    }
  }, [plateSubmitted, nearbyAmbulances, hospitals, origin, destination, destinationName, addLog, speak, assignAmbulance, showToast, broadcastActivation]);

  /* ── TERMINATE ── */
  const terminate = useCallback(() => {
    setShowConfirm(false);
    setSession("terminating");
    addLog("Terminating session…", "warn");
    if (timerRef.current) clearInterval(timerRef.current);
    sim.resetSimulation();

    if (backendSessionId) {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = typeof window !== "undefined" ? localStorage.getItem("gh_token") : null;
      if (token) {
        fetch(`${API_BASE}/emergency/${backendSessionId}/resolve`, {
          method: "PATCH", headers: { "Authorization": `Bearer ${token}` },
        }).catch(() => {});
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
    }

    broadcastDeactivation();

    setTimeout(() => {
      setRoutePoints([]);
      setDirectionsResult(null);
      setCurrentLeg('idle');
      setAmbulanceAtPatient(false);
      setAmbulanceDepot(null);
      setDummyCars([]);
      setSession("idle");
      setAdminApproved(false);
      setBackendSessionId(null);
      setElapsed(0);
      addLog("Corridor closed — geo-fence lifted", "success");
      addLog("Session terminated", "info");
    }, 1200);
  }, [addLog, backendSessionId, sim, broadcastDeactivation]);

  /* cleanup on unmount */
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    socketRef.current?.disconnect();
  }, []);

  /* ── TOAST CONTAINER ── */
  const ToastUI = () => (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 pointer-events-auto ${
          t.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-100' :
          t.type === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-100' :
          'bg-blue-500/20 border-blue-500/40 text-blue-100'
        }`}>
          <div className="flex-1 text-sm font-semibold tracking-tight">{t.message}</div>
          <button onClick={() => dismissToast(t.id)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );

  /* ── derived ── */
  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const availableAmbulances = nearbyAmbulances.filter(a => a.status === "available" && parseFloat(a.distance) <= 5.0);
  const isEmergencyActive = session === "active";

  /* ──────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen gh-bg-cream text-slate-800 flex flex-col overflow-hidden relative">
      <ToastUI />
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.03] rounded-full blur-[120px] animate-float" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s', animationDuration: '10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Top Header & Actions */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-2xl px-6 py-3.5 z-50 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[600px] h-[40px] bg-blue-500/[0.03] rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Left: Title + Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center transition-all duration-500 ${
              isEmergencyActive ? "shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-pulse-glow" : "shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            }`}>
              <CarFront size={20} className="text-blue-500" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-[0.2em] text-white uppercase whitespace-nowrap leading-tight">
                GoldenHour
                <span className="text-gray-600 font-light ml-2 text-xs">PRIVATE EMERGENCY</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${location ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-[9px] font-mono text-gray-500 tracking-wider uppercase">
                    {location ? 'GPS LIVE' : 'GPS ACQUIRING'}
                  </span>
                </div>
                {isEmergencyActive && (
                  <div className="flex items-center gap-1 ml-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                    <span className="text-[9px] font-mono text-blue-400 tracking-wider uppercase font-bold">CORRIDOR ACTIVE</span>
                  </div>
                )}
                {plateSubmitted && (
                  <span className="text-[9px] text-emerald-500 font-mono tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded ml-1 border border-emerald-500/20">
                    {plateNumber.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>



          {/* Action button */}
          <div className="act-wrap">
            {session === "idle" && (
              <button
                onClick={requestCorridor}
                disabled={!plateSubmitted || !isLoaded || searchingHospitals}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 flex items-center gap-2 whitespace-nowrap border border-blue-500/30"
              >
                {!isLoaded ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><AlertTriangle size={16} /> Request Emergency Corridor</>
                )}
              </button>
            )}
            {session === "pending" && (
              <button className="px-6 py-2.5 bg-amber-600/20 text-amber-500 border border-amber-500/30 font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl flex items-center gap-2" disabled>
                <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /> Awaiting Approval
              </button>
            )}
            {session === "active" && (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-6 py-2.5 bg-gray-900/60 hover:bg-gray-800/80 text-gray-300 border border-gray-600/50 font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl transition-all duration-300 whitespace-nowrap flex items-center gap-1.5"
              >
                <Square size={14} className="fill-current" /> Terminate
              </button>
            )}
            <Link href="/" className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest transition-colors ml-2">Exit</Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-5 lg:p-6 gap-5 overflow-hidden relative z-10 max-w-[2000px] mx-auto w-full">
        {/* Top: Stats Bar */}
        <div className="shrink-0">
          <DashboardStats
            activeEmergencies={isEmergencyActive ? 1 : 0}
            availableAmbulances={availableAmbulances.length}
            resolvedToday={1}
            greenSignalsActivated={sim.trafficSignals.filter(s => s.status === 'green').length}
          />
        </div>

        {/* Middle/Bottom: Split View */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
          {/* Main Map Area */}
          <div className={`flex-[2] lg:flex-[3] rounded-2xl overflow-hidden shadow-[0_2px_24px_rgba(0,0,0,0.06)] bg-white border relative transition-all duration-1000 ${
            isEmergencyActive
              ? 'border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.1)]'
              : 'border-slate-200'
          }`}>
            {isLoaded ? (
              <MapView
                onMapLoad={handleMapLoad}
                origin={realGpsLocation}
                ambulancePosition={isEmergencyActive ? (sim.ambulancePosition || realGpsLocation) : null}
                destination={destination}
                destinationName={destinationName}
                isDemoMode={demoMode}
                routePoints={routePoints}
                isEmergencyActive={isEmergencyActive}
                bearing={sim.bearing}
                etaMinutes={sim.etaMinutes}
                remainingDistanceM={sim.remainingDistanceM}
                directions={directionsResult}
                routeInfo={routeInfo}
                trafficSignals={sim.trafficSignals}
                dummyCars={isEmergencyActive ? dummyCars : []}
                nearbyAmbulances={!isEmergencyActive ? nearbyAmbulances.filter(a => a.lat && a.lng).map(a => ({ id: a.id, lat: a.lat!, lng: a.lng! })) : []}
                viewMode="ambulance"
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onHospitalSelect={handleHospitalSelect}
                currentLeg={currentLeg}
                ambulanceDepot={ambulanceDepot}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1221]">
                <div className="relative">
                  <div className="w-14 h-14 border-[3px] border-[#2979FF]/15 border-t-[#2979FF] rounded-full animate-spin" />
                  <div className="absolute inset-1 w-12 h-12 border-[3px] border-transparent border-b-blue-400/25 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />
                </div>
                <p className="mt-5 font-mono text-gray-500 text-[10px] tracking-[0.25em] uppercase">Initializing Map Engine</p>
              </div>
            )}
          </div>

          {/* Right Panel: Hospital/Ambulance Cards */}
          <div id="hospital-cards-panel" className="flex-[1] lg:w-[32%] lg:h-full overflow-y-auto dark-scroll p-5 flex flex-col gap-3.5 rounded-2xl border border-white/[0.06] bg-[#0B1221]/80 backdrop-blur-2xl shadow-2xl">
            {/* Nearby Hospitals section (always visible like ambulance page) */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-bold tracking-[0.15em] uppercase text-[11px] flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Building2 size={14} className="text-red-500" />
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
                  <Building2 size={24} className="text-gray-500 opacity-40" />
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
                    className="mt-1 px-5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-bold tracking-[0.15em] uppercase rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 flex items-center gap-1.5"
                  >
                    <RotateCw size={14} /> Retry Search
                  </button>
                )}
              </div>
            )}

            {/* Ambulances & Session-specific sections */}
            {session === "idle" ? (
              <>
                {/* Ambulance section separator */}
                <div className="flex items-center justify-between mb-1 mt-3">
                  <h2 className="text-white font-bold tracking-[0.15em] uppercase text-[11px] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Ambulance size={14} className="text-emerald-500" />
                    </div>
                    Nearby Ambulances
                    {nearbyAmbulances.length > 0 && (
                      <span className="text-[10px] text-gray-500 font-mono font-normal tracking-normal bg-white/[0.03] px-1.5 py-0.5 rounded">{nearbyAmbulances.length}</span>
                    )}
                  </h2>
                </div>

                {!plateSubmitted && (
                  <div className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                    <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2 font-mono flex items-center gap-1.5">
                      <span className="text-[8px] px-1 py-px bg-amber-500/20 text-amber-500 rounded border border-amber-500/30">LOCKED</span>
                      Vehicle Plate Number *
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-[#050b14] border border-white/[0.1] rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-blue-500/50"
                        type="text" placeholder="MH-12-AB-1234" value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)} maxLength={15}
                      />
                      <button onClick={handlePlateSubmit} disabled={!plateNumber.trim()}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold tracking-widest text-[10px] uppercase rounded-lg border border-blue-500/20 transition-all disabled:opacity-50">
                        Set
                      </button>
                    </div>
                  </div>
                )}

                {nearbyAmbulances.map((a) => (
                  <div key={a.id} className="p-3.5 rounded-xl flex flex-col gap-3 transition-colors border bg-[#0B1221] hover:bg-white/[0.04] shadow-lg relative overflow-hidden group border-white/[0.06]">
                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                      a.status === 'available' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' :
                      a.status === 'en-route' ? 'bg-gradient-to-b from-orange-400 to-orange-600' :
                      'bg-gradient-to-b from-red-400 to-red-600'
                    }`} />
                    <div className="flex justify-between items-center pl-2 relative z-10">
                      <div className="flex items-center gap-2.5">
                        <Ambulance size={20} className="text-gray-400 opacity-80" />
                        <div>
                          <div className="text-xs font-mono font-bold text-white tracking-wider">{a.id}</div>
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">{a.distance} · {a.eta} AWAY</div>
                        </div>
                      </div>
                      <div className={`text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${
                        a.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        a.status === 'en-route' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {a.status === 'available' && <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse mr-1.5 inline-block"/>}
                        {a.status}
                      </div>
                    </div>
                    {a.status !== "busy" && (
                      <div className="pl-2 relative z-10">
                        <button onClick={() => assignAmbulance(a)} disabled={!plateSubmitted}
                          className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold tracking-[0.1em] text-[10px] uppercase rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-50">
                          Assign Dispatch Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <h2 className="text-white font-bold tracking-[0.15em] uppercase text-[11px] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Check size={14} className="text-emerald-400" />
                    </div>
                    Ambulance Booked
                  </h2>
                </div>

                <div className="mt-4 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                  <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2 font-mono flex items-center gap-1.5">
                    <span className={`text-[8px] px-1 py-px rounded border ${
                      currentLeg === 'depot-to-patient'
                        ? 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                        : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                    }`}>
                      {currentLeg === 'depot-to-patient' ? 'PHASE 1' : 'PHASE 2'}
                    </span>
                    Journey Status
                  </div>
                  <div className="text-[10px] font-mono text-gray-300">
                    {currentLeg === 'depot-to-patient' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Ambulance approaching patient...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Patient onboard, en route to hospital
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Session Logs Panel */}
            <div className={`mt-auto pt-4 border-t border-white/[0.05] transition-all duration-500 ${session === 'idle' && nearbyAmbulances.length > 0 ? 'h-[140px]' : 'h-1/3'}`}>
              <div className="text-[10px] font-mono tracking-widest text-gray-500 uppercase flex items-center gap-1.5 mb-2">
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Session Logs
              </div>
              <div className="h-full overflow-y-auto dark-scroll flex flex-col gap-1.5 text-[10px] font-mono pr-2 pb-5" ref={logRef}>
                {log.map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-600 shrink-0">[{e.time}]</span>
                    <span className={`leading-snug ${
                      e.type === 'success' ? 'text-emerald-400' :
                      e.type === 'error' ? 'text-red-400' :
                      e.type === 'warn' ? 'text-amber-400' : 'text-gray-400'
                    }`}>
                      {e.type === 'success' && <span className="mr-1">✓</span>}
                      {e.type === 'warn' && <span className="mr-1">⚠</span>}
                      {e.msg}
                    </span>
                  </div>
                ))}
                {log.length === 0 && <div className="text-gray-600 text-center mt-2 lowercase text-[9px] tracking-widest">awaiting action logs...</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Terminate Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-[#0B1221] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold tracking-widest text-red-500 uppercase mb-2">Terminate Session?</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6 font-mono">
              This will close the virtual corridor, lift the geo-fence, and clear all driver alerts.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-[11px] font-bold tracking-wider uppercase transition-colors" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]" onClick={terminate}>Terminate</button>
            </div>
          </div>
        </div>
      )}
      {routeInfo && selectedHospital && (
        <RouteInfoBar
          hospital={selectedHospital}
          routeInfo={routeInfo}
          onChangeHospital={handleChangeHospital}
          onStartEmergency={requestCorridor}
        />
      )}
    </div>
  );
}
