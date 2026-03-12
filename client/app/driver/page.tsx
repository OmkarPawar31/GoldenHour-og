"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import { useElevenLabsVoice } from "../../hooks/useElevenLabsVoice";
import { useJsApiLoader } from "@react-google-maps/api";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
interface AlertEntry {
  id: string;
  time: string;
  vehicleId: string;
  type: "ambulance" | "private";
  direction: string;
  distance: string;
  eta: string;
  instruction: string;
  priority: number;
  active: boolean;
}

interface VehicleInfo {
  plateNumber: string;
  model: string;
  color: string;
  fuelType: string;
}

interface AmbulancePosition {
  ambulanceId: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  eta: number;
  remainingM: number;
  currentLeg?: string;
  routePoints?: { lat: number; lng: number }[];
}

function nowStr() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/* ── Haversine distance in meters ── */
function haversineM(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
    Math.cos((p2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROXIMITY_ALERT_RADIUS_M = 800; // Alert when ambulance is within 800m
const ALERT_COOLDOWN_MS = 15000; // Don't re-alert for same ambulance within 15s

/* ─────────────────────────────────────────────────────────
   SIMULATED ALERTS (fallback for demo)
───────────────────────────────────────────────────────── */
const ALERT_TEMPLATES: Omit<AlertEntry, "id" | "time" | "active">[] = [
  {
    vehicleId: "AMB-001",
    type: "ambulance",
    direction: "Behind you — approaching from South",
    distance: "800m",
    eta: "~45s",
    instruction: "🚨 EMERGENCY VEHICLE APPROACHING! Move your vehicle to the LEFT side. Clear the RIGHT lane immediately.",
    priority: 100,
  },
  {
    vehicleId: "AMB-014",
    type: "ambulance",
    direction: "Approaching from East on cross-road",
    distance: "1.2km",
    eta: "~1m 30s",
    instruction: "🚨 EMERGENCY VEHICLE APPROACHING! Move your vehicle to the LEFT side. Clear the RIGHT lane immediately.",
    priority: 100,
  },
  {
    vehicleId: "PVT-MH12-AB-7890",
    type: "private",
    direction: "Behind you — approaching from South-West",
    distance: "600m",
    eta: "~35s",
    instruction: "⚠️ Private emergency vehicle approaching. Please move LEFT and clear the RIGHT lane if possible.",
    priority: 70,
  },
];

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
export default function DriverDashboard() {

  /* ── state ── */
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    plateNumber: "",
    model: "",
    color: "",
    fuelType: "Petrol",
  });
  const [infoSaved, setInfoSaved] = useState(false);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [listening, setListening] = useState(false);
  const [connected, setConnected] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [lastAlertTime, setLastAlertTime] = useState("--");
  const [showFullAlert, setShowFullAlert] = useState<AlertEntry | null>(null);

  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const simulateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertListRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const dispatchSocketRef = useRef<Socket | null>(null);
  const { speak } = useElevenLabsVoice();
  const speakRef = useRef(speak);
  speakRef.current = speak;

  // GPS state for driver's location
  const [driverGps, setDriverGps] = useState<{ lat: number; lng: number } | null>(null);
  const driverGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"acquiring" | "live" | "error">("acquiring");

  const [activeAmbulance, setActiveAmbulance] = useState<{ lat: number; lng: number, bearing: number } | null>(null);
  const [activeAmbulanceRoute, setActiveAmbulanceRoute] = useState<{ lat: number; lng: number }[]>([]);

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  // Track which ambulances we've already alerted for (cooldown)
  const alertedAmbulancesRef = useRef<Record<string, number>>({});

  // Keep driverGpsRef in sync
  useEffect(() => {
    driverGpsRef.current = driverGps;
  }, [driverGps]);

  /* ── Acquire driver GPS on mount ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      // Fallback GPS for demo (Panvel area)
      const fallback = { lat: 18.9894, lng: 73.1175 };
      setDriverGps(fallback);
      driverGpsRef.current = fallback;
      return;
    }

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverGps(loc);
        driverGpsRef.current = loc;
        setGpsStatus("live");
      },
      () => {
        setGpsStatus("error");
        // Fallback GPS for demo
        const fallback = { lat: 18.9894, lng: 73.1175 };
        setDriverGps(fallback);
        driverGpsRef.current = fallback;
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
    };
  }, []);

  /* auto-scroll alerts */
  useEffect(() => {
    if (alertListRef.current) alertListRef.current.scrollTop = 0;
  }, [alerts]);

  /* ── Save vehicle info ── */
  const handleSaveInfo = () => {
    if (!vehicleInfo.plateNumber.trim() || !vehicleInfo.model.trim()) return;
    setInfoSaved(true);
  };

  /* ── Start listening ── */
  const startListening = useCallback(() => {
    setListening(true);

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    // ─── 1. Connect to /emergency namespace (existing alerts) ───
    socketRef.current = io(`${SOCKET_URL}/emergency`, { transports: ["websocket", "polling"] });

    socketRef.current.on("connect", () => {
      setConnected(true);
    });

    socketRef.current.on("disconnect", () => {
      setConnected(false);
    });

    // Listen for real emergency alerts
    socketRef.current.on("alert", (data: { message: string; sessionId?: string; timestamp: string }) => {
      const newAlert: AlertEntry = {
        id: `alert-${Date.now()}`,
        time: nowStr(),
        vehicleId: data.sessionId?.slice(-8) || "UNKNOWN",
        type: "ambulance",
        direction: "Emergency vehicle approaching",
        distance: "< 1km",
        eta: "< 1 min",
        instruction: data.message,
        priority: 100,
        active: true,
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      setAlertCount(c => c + 1);
      setLastAlertTime(nowStr());
      setShowFullAlert(newAlert);
      speakRef.current(
        "Attention! Emergency ambulance approaching your location. Please move your vehicle to the left side and clear the right lane immediately.",
        `voice-alert-${newAlert.id}`
      );
      setTimeout(() => {
        setShowFullAlert(prev => prev?.id === newAlert.id ? null : prev);
        setAlerts(prev => prev.map(a => a.id === newAlert.id ? { ...a, active: false } : a));
      }, 8000);
    });

    socketRef.current.on("new-emergency", (data: { sessionId: string; priority: string; origin: { lat: number; lng: number } }) => {
      const newAlert: AlertEntry = {
        id: `alert-${Date.now()}`,
        time: nowStr(),
        vehicleId: data.sessionId?.slice(-8) || "EMG",
        type: data.priority === "critical" ? "ambulance" : "private",
        direction: "Emergency vehicle en route",
        distance: "< 1km",
        eta: "Approaching",
        instruction: data.priority === "critical"
          ? "🚨 EMERGENCY VEHICLE APPROACHING! Move your vehicle to the LEFT side. Clear the RIGHT lane immediately."
          : "⚠️ Private emergency vehicle approaching. Please move LEFT and clear the RIGHT lane if possible.",
        priority: data.priority === "critical" ? 100 : 70,
        active: true,
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      setAlertCount(c => c + 1);
      setLastAlertTime(nowStr());
      setShowFullAlert(newAlert);
      speakRef.current(
        data.priority === "critical"
          ? "Attention! Emergency vehicle approaching. Move your vehicle to the left side and clear the right lane immediately."
          : "Warning. Private emergency vehicle approaching. Please move left and clear the right lane if possible.",
        `voice-emergency-${newAlert.id}`
      );
      setTimeout(() => {
        setShowFullAlert(prev => prev?.id === newAlert.id ? null : prev);
        setAlerts(prev => prev.map(a => a.id === newAlert.id ? { ...a, active: false } : a));
      }, 8000);
    });

    socketRef.current.on("green-corridor:activate", () => {
      // Corridor activated nearby — keep listening
    });

    socketRef.current.on("emergency-resolved", (data: { sessionId: string }) => {
      setAlerts(prev => prev.map(a =>
        a.vehicleId === data.sessionId?.slice(-8) ? { ...a, active: false } : a
      ));
    });

    // ─── 2. Connect to /dispatch namespace (ambulance position broadcasts) ───
    dispatchSocketRef.current = io(`${SOCKET_URL}/dispatch`, { transports: ["websocket", "polling"] });

    dispatchSocketRef.current.on("connect", () => {
      console.log("[Driver] Connected to /dispatch for ambulance proximity tracking");
    });

    // Listen for live ambulance position updates
    dispatchSocketRef.current.on("ambulance:update", (data: AmbulancePosition) => {
      // Keep track of ambulance position for map rendering
      setActiveAmbulance({ lat: data.lat, lng: data.lng, bearing: data.bearing });
      if (data.routePoints) {
        setActiveAmbulanceRoute(data.routePoints);
      }

      const myPos = driverGpsRef.current;
      if (!myPos) return;

      const dist = haversineM(myPos, { lat: data.lat, lng: data.lng });

      // Check if ambulance is within proximity radius
      if (dist <= PROXIMITY_ALERT_RADIUS_M) {
        const now = Date.now();
        const lastAlerted = alertedAmbulancesRef.current[data.ambulanceId] || 0;

        // Cooldown: don't re-alert for same ambulance within 15s
        if (now - lastAlerted < ALERT_COOLDOWN_MS) return;
        alertedAmbulancesRef.current[data.ambulanceId] = now;

        const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
        const etaStr = data.speed > 0 ? `~${Math.ceil((dist / 1000) / data.speed * 60)}min` : "< 1 min";

        const newAlert: AlertEntry = {
          id: `proximity-${Date.now()}`,
          time: nowStr(),
          vehicleId: data.ambulanceId,
          type: "ambulance",
          direction: `Emergency ambulance approaching — ${distStr} away`,
          distance: distStr,
          eta: etaStr,
          instruction: "🚨 EMERGENCY AMBULANCE NEARBY! Move your vehicle to the LEFT side. Clear the RIGHT lane immediately.",
          priority: 100,
          active: true,
        };

        setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
        setAlertCount(c => c + 1);
        setLastAlertTime(nowStr());
        setShowFullAlert(newAlert);

        // Voice alert via ElevenLabs
        speakRef.current(
          `Attention driver! Emergency ambulance is ${distStr} away from your location and approaching fast. Please move your vehicle to the left side and clear the right lane immediately.`,
          `voice-proximity-${data.ambulanceId}`
        );

        console.log(`[Driver] 🚨 Ambulance ${data.ambulanceId} is ${distStr} away — ALERT triggered!`);

        setTimeout(() => {
          setShowFullAlert(prev => prev?.id === newAlert.id ? null : prev);
          setAlerts(prev => prev.map(a => a.id === newAlert.id ? { ...a, active: false } : a));
        }, 10000);
      }
    });

    // Listen for ambulance activation
    dispatchSocketRef.current.on("ambulance:activate", (data: { ambulanceId: string; lat: number; lng: number, routePoints?: { lat: number, lng: number }[] }) => {
      const myPos = driverGpsRef.current;
      if (!myPos) return;

      const dist = haversineM(myPos, { lat: data.lat, lng: data.lng });
      if (dist <= PROXIMITY_ALERT_RADIUS_M * 2) {
        // Ambulance activated nearby — pre-warn driver
        const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
        const newAlert: AlertEntry = {
          id: `activate-${Date.now()}`,
          time: nowStr(),
          vehicleId: data.ambulanceId,
          type: "ambulance",
          direction: `Emergency activated ${distStr} away — ambulance dispatched`,
          distance: distStr,
          eta: "Approaching",
          instruction: "🚑 Emergency ambulance has been dispatched near your area. Stay alert and be ready to move aside.",
          priority: 80,
          active: true,
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
        setAlertCount(c => c + 1);
        setLastAlertTime(nowStr());

        speakRef.current(
          "Heads up! An emergency ambulance has been dispatched in your area. Please stay alert.",
          `voice-activate-${data.ambulanceId}`
        );

        // Store the route to show on the map
        if (data.routePoints) {
          setActiveAmbulanceRoute(data.routePoints);
        }

        setTimeout(() => {
          setAlerts(prev => prev.map(a => a.id === newAlert.id ? { ...a, active: false } : a));
        }, 10000);
      }
    });

    dispatchSocketRef.current.on("ambulance:deactivate", () => {
      setActiveAmbulance(null);
      setActiveAmbulanceRoute([]);
    });

    // ─── 3. Simulation fallback for demo/offline mode ───
    setTimeout(() => {
      if (!socketRef.current?.connected) {
        setConnected(true); // simulate connected for demo
      }
    }, 1200);

    simulateRef.current = setInterval(() => {
      const template = ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)];
      const newAlert: AlertEntry = {
        ...template,
        id: `alert-${Date.now()}`,
        time: nowStr(),
        distance: `${(0.3 + Math.random() * 1.2).toFixed(1)}km`,
        eta: `~${Math.floor(20 + Math.random() * 90)}s`,
        active: true,
      };

      setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      setAlertCount(c => c + 1);
      setLastAlertTime(nowStr());
      setShowFullAlert(newAlert);

      // Voice alert via ElevenLabs
      speakRef.current(
        newAlert.type === "ambulance"
          ? "Attention! Emergency ambulance approaching your location. Please move your vehicle to the left side and clear the right lane immediately."
          : "Warning. Private emergency vehicle approaching. Please move left and clear the right lane if possible.",
        `voice-sim-${newAlert.id}`
      );

      setTimeout(() => {
        setShowFullAlert(prev => prev?.id === newAlert.id ? null : prev);
        setAlerts(prev => prev.map(a => a.id === newAlert.id ? { ...a, active: false } : a));
      }, 8000);
    }, 12000 + Math.random() * 8000);
  }, []);

  /* ── Stop listening ── */
  const stopListening = useCallback(() => {
    setListening(false);
    setConnected(false);
    if (simulateRef.current) clearInterval(simulateRef.current);
    socketRef.current?.disconnect();
    socketRef.current = null;
    dispatchSocketRef.current?.disconnect();
    dispatchSocketRef.current = null;
  }, []);

  /* cleanup on unmount */
  useEffect(() => () => {
    if (simulateRef.current) clearInterval(simulateRef.current);
    socketRef.current?.disconnect();
    dispatchSocketRef.current?.disconnect();
  }, []);

  /* ──────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --midnight: #FFFBF5;
          --navy:     #FFFFFF;
          --navy2:    #F1F5F9;
          --orange:   #E8571A;
          --amber:    #F59E0B;
          --white:    #1E293B;
          --muted:    #64748B;
          --success:  #059669;
          --danger:   #DC2626;
          --blue:     #3B82F6;
          --border:   #E2E8F0;
        }

        html, body { height: 100%; overflow: hidden; }
        body { background: var(--midnight); color: var(--white); font-family: 'DM Sans', sans-serif; }

        /* Grid bg */
        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(59,130,246,0.08) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* ── TOP BAR ── */
        .topbar {
          position: fixed; top: 0; left: 0; right: 0;
          height: 52px; z-index: 60;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.5rem;
          background: rgba(255,255,255,0.95);
          border-bottom: 1px solid rgba(226,232,240,1);
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 8px rgba(0,0,0,0.05);
        }
        .tb-left, .tb-right { display: flex; align-items: center; gap: 0.85rem; }

        .logo-link { font-family:'Bebas Neue',cursive; font-size:1.3rem; letter-spacing:0.08em; color:var(--white); text-decoration:none; }
        .logo-link em { color:#60A5FA; font-style:normal; }

        .tb-badge {
          font-family:'JetBrains Mono',monospace; font-size:0.6rem; letter-spacing:0.1em;
          padding:0.22rem 0.6rem; border-radius:4px;
          background:rgba(96,165,250,0.1); border:1px solid rgba(96,165,250,0.25); color:#60A5FA;
        }
        .tb-plate {
          font-family:'JetBrains Mono',monospace; font-size:0.62rem; letter-spacing:0.08em;
          padding:0.22rem 0.6rem; border-radius:4px;
          background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.22); color:#34D399;
        }

        .sp {
          display:flex; align-items:center; gap:0.4rem;
          font-family:'JetBrains Mono',monospace; font-size:0.62rem; letter-spacing:0.07em;
          padding:0.22rem 0.65rem; border-radius:100px;
        }
        .sp.offline { background:rgba(138,155,181,0.08); border:1px solid rgba(138,155,181,0.18); color:var(--muted); }
        .sp.connected { background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.28); color:var(--success); }
        .sp-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .sp-dot.on { background:var(--success); animation:blink 1.2s infinite; }
        .sp-dot.off { background:var(--muted); }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .exit-btn { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--muted); text-decoration:none; letter-spacing:0.04em; transition:color 0.2s; }
        .exit-btn:hover { color:#60A5FA; }

        /* ── PAGE GRID ── */
        .page {
          padding-top: 52px;
          height: 100vh;
          display: grid;
          grid-template-columns: 340px 1fr;
          overflow: hidden;
          position: relative; z-index: 1;
        }

        /* ── LEFT SIDEBAR ── */
        .sidebar {
          border-right: 1px solid var(--border);
          background: var(--navy);
          display: flex; flex-direction: column; overflow-y: auto;
          scrollbar-width: thin; scrollbar-color: rgba(226,232,240,1) transparent;
          box-shadow: 2px 0 8px rgba(0,0,0,0.04);
        }

        .sb-sec { padding: 1rem 1.15rem; border-bottom: 1px solid var(--border); }
        .sb-title {
          font-family:'JetBrains Mono',monospace; font-size:0.57rem;
          color:var(--muted); text-transform:uppercase; letter-spacing:0.12em;
          margin-bottom:0.7rem; display:flex; align-items:center; gap:0.5rem;
        }
        .sb-title-dot { width:5px; height:5px; border-radius:50%; }

        /* Vehicle info form */
        .vi-field { margin-bottom: 0.75rem; }
        .vi-label {
          font-family:'JetBrains Mono',monospace; font-size:0.58rem;
          color:var(--muted); text-transform:uppercase; letter-spacing:0.1em;
          display:block; margin-bottom:0.35rem;
        }
        .vi-input {
          width:100%; padding:0.65rem 0.8rem; border-radius:7px;
          background:var(--navy2); border:1px solid rgba(255,255,255,0.08);
          color:var(--white); font-family:'JetBrains Mono',monospace; font-size:0.78rem;
          letter-spacing:0.06em; text-transform:uppercase; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .vi-input::placeholder { color:rgba(138,155,181,0.35); text-transform:none; }
        .vi-input:focus { border-color:#60A5FA; box-shadow:0 0 0 3px rgba(96,165,250,0.1); }
        .vi-input:disabled { opacity:0.5; cursor:not-allowed; }
        .vi-select {
          width:100%; padding:0.65rem 0.8rem; border-radius:7px;
          background:var(--navy2); border:1px solid rgba(255,255,255,0.08);
          color:var(--white); font-family:'JetBrains Mono',monospace; font-size:0.78rem;
          outline:none; cursor:pointer; appearance:none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238A9BB5' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.8rem center;
        }
        .vi-select:disabled { opacity:0.5; cursor:not-allowed; }

        .vi-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.65rem; }

        .vi-save-btn {
          width:100%; padding:0.75rem; border-radius:8px; border:none;
          font-family:'DM Sans',sans-serif; font-size:0.88rem; font-weight:700;
          cursor:pointer; transition:all 0.2s; margin-top:0.3rem;
        }
        .vi-save-active { background:#60A5FA; color:#050C1A; box-shadow:0 4px 20px rgba(96,165,250,0.35); }
        .vi-save-active:hover { background:#93C5FD; transform:translateY(-1px); }
        .vi-save-active:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .vi-save-done { background:rgba(52,211,153,0.1); color:#34D399; border:1px solid rgba(52,211,153,0.2); cursor:default; }

        /* Saved vehicle display */
        .vi-display {
          background:var(--navy2); border-radius:9px; padding:1rem;
          border:1px solid rgba(96,165,250,0.12);
        }
        .vi-plate-big {
          font-family:'Bebas Neue',cursive; font-size:2rem; color:#60A5FA;
          letter-spacing:0.06em; line-height:1; margin-bottom:0.6rem;
        }
        .vi-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; }
        .vi-detail {
          background:rgba(255,255,255,0.02); border-radius:6px; padding:0.5rem 0.65rem;
          border:1px solid rgba(255,255,255,0.04);
        }
        .vi-detail-val { font-family:'JetBrains Mono',monospace; font-size:0.72rem; font-weight:600; color:var(--white); margin-bottom:0.15rem; }
        .vi-detail-label { font-family:'JetBrains Mono',monospace; font-size:0.5rem; color:var(--muted); letter-spacing:0.08em; text-transform:uppercase; }

        /* Listen button */
        .listen-sec { padding:1rem 1.15rem; border-bottom:1px solid rgba(255,255,255,0.04); }
        .listen-btn {
          width:100%; padding:0.9rem; border-radius:10px; border:none;
          font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:700;
          cursor:pointer; transition:all 0.2s;
          display:flex; align-items:center; justify-content:center; gap:0.6rem;
        }
        .listen-start {
          background:#60A5FA; color:#050C1A;
          box-shadow:0 4px 28px rgba(96,165,250,0.4);
          animation:listenGlow 2s ease-in-out infinite;
        }
        @keyframes listenGlow { 0%,100%{box-shadow:0 4px 28px rgba(96,165,250,0.35)} 50%{box-shadow:0 4px 44px rgba(96,165,250,0.65)} }
        .listen-start:hover { background:#93C5FD; transform:translateY(-1px); }
        .listen-start:disabled { opacity:0.45; cursor:not-allowed; animation:none; transform:none; }
        .listen-stop { background:rgba(255,68,68,0.1); color:var(--danger); border:1px solid rgba(255,68,68,0.3); }
        .listen-stop:hover { background:rgba(255,68,68,0.18); transform:translateY(-1px); }

        /* Stat cards in sidebar */
        .stat-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem; }
        .stat-card {
          background:var(--navy2); border-radius:8px; padding:0.7rem;
          border:1px solid rgba(255,255,255,0.04); text-align:center;
        }
        .stat-val { font-family:'Bebas Neue',cursive; font-size:1.8rem; line-height:1; }
        .stat-label { font-family:'JetBrains Mono',monospace; font-size:0.5rem; color:var(--muted); letter-spacing:0.08em; margin-top:0.2rem; }

        /* Priority card */
        .prio-card {
          background:var(--navy2); border-radius:8px; padding:0.75rem;
          border:1px solid rgba(96,165,250,0.12);
          display:flex; align-items:center; gap:0.75rem;
        }
        .prio-num { font-family:'Bebas Neue',cursive; font-size:2rem; color:#60A5FA; line-height:1; flex-shrink:0; }
        .prio-right { flex:1; }
        .prio-bar-bg   { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; margin-bottom:0.35rem; }
        .prio-bar-fill { height:3px; border-radius:2px; }
        .prio-label { font-family:'JetBrains Mono',monospace; font-size:0.58rem; letter-spacing:0.06em; }

        /* ── MAIN AREA ── */
        .main-area {
          display: flex; flex-direction: row; overflow: hidden;
          background: #F8FAFC;
        }
        .main-col-left {
          flex: 1; display: flex; flex-direction: column; overflow: hidden;
          border-right: 1px solid var(--border);
        }
        .main-col-right {
          flex: 1.5; position: relative;
        }

        /* ── FULL-SCREEN ALERT OVERLAY ── */
        .alert-overlay {
          position: fixed; inset: 0; z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
        }
        .alert-overlay-bg {
          position: absolute; inset: 0;
          animation: alertFlash 1s ease-in-out infinite;
        }
        @keyframes alertFlash {
          0%, 100% { background: rgba(255,68,68,0.15); }
          50% { background: rgba(255,68,68,0.25); }
        }
        .alert-overlay.private .alert-overlay-bg {
          animation-name: alertFlashAmber;
        }
        @keyframes alertFlashAmber {
          0%, 100% { background: rgba(255,179,71,0.12); }
          50% { background: rgba(255,179,71,0.22); }
        }

        .alert-card-full {
          position: relative; z-index: 1;
          background: var(--navy);
          border-radius: 18px; padding: 2.5rem 3rem;
          max-width: 580px; width: 100%;
          text-align: center;
          animation: alertSlideIn 0.4s ease-out;
        }
        .alert-card-full.ambulance { border: 2px solid rgba(255,68,68,0.5); box-shadow: 0 0 60px rgba(255,68,68,0.2); }
        .alert-card-full.private { border: 2px solid rgba(255,179,71,0.5); box-shadow: 0 0 60px rgba(255,179,71,0.2); }

        @keyframes alertSlideIn {
          from { transform: translateY(40px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }

        .alert-siren {
          font-size: 3.5rem; margin-bottom: 1rem;
          animation: sirenPulse 0.5s ease-in-out infinite alternate;
        }
        @keyframes sirenPulse { from { transform: scale(1); } to { transform: scale(1.15); } }

        .alert-title-full {
          font-family:'Bebas Neue',cursive; font-size:2.8rem; line-height:0.95;
          margin-bottom:0.5rem;
        }
        .alert-title-full.ambulance { color: var(--danger); }
        .alert-title-full.private { color: var(--amber); }

        .alert-vehicle-id {
          font-family:'JetBrains Mono',monospace; font-size:0.75rem;
          padding:0.3rem 0.8rem; border-radius:5px; display:inline-block;
          margin-bottom:1.2rem; letter-spacing:0.08em;
        }
        .alert-vehicle-id.ambulance { background:rgba(255,68,68,0.12); color:var(--danger); border:1px solid rgba(255,68,68,0.3); }
        .alert-vehicle-id.private { background:rgba(255,179,71,0.12); color:var(--amber); border:1px solid rgba(255,179,71,0.3); }

        .alert-instruction {
          font-size: 1.15rem; font-weight: 700; line-height: 1.6;
          padding: 1.2rem 1.5rem; border-radius: 10px;
          margin-bottom: 1.5rem;
        }
        .alert-instruction.ambulance { background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.2); color: #FF8888; }
        .alert-instruction.private { background: rgba(255,179,71,0.08); border: 1px solid rgba(255,179,71,0.2); color: #FFD088; }

        .alert-meta-row {
          display: flex; justify-content: center; gap: 2rem;
          margin-bottom: 1.5rem;
        }
        .alert-meta-item { text-align: center; }
        .alert-meta-val { font-family:'Bebas Neue',cursive; font-size:1.8rem; line-height:1; }
        .alert-meta-val.ambulance { color: var(--danger); }
        .alert-meta-val.private { color: var(--amber); }
        .alert-meta-label { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--muted); letter-spacing:0.06em; margin-top:0.15rem; }

        .alert-dismiss-btn {
          padding: 0.7rem 2rem; border-radius: 8px; border: none;
          font-family:'DM Sans',sans-serif; font-size:0.85rem; font-weight:600;
          cursor:pointer; transition:all 0.2s;
          background: rgba(255,255,255,0.06); color: var(--muted);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .alert-dismiss-btn:hover { color: var(--white); background: rgba(255,255,255,0.1); }

        /* ── ALERT LIST (main area) ── */
        .alert-header {
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
          background: #fff;
        }
        .alert-header-title {
          font-family:'Bebas Neue',cursive; font-size:1.8rem; letter-spacing:0.04em;
        }
        .alert-header-title span { color: #60A5FA; }
        .alert-header-sub { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--muted); }

        .alert-list-wrap {
          flex: 1; overflow-y: auto; padding: 1rem 1.5rem;
          scrollbar-width: thin; scrollbar-color: rgba(96,165,250,0.12) transparent;
        }

        .alert-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; gap: 1.2rem; text-align: center;
        }
        .alert-empty-icon { font-size: 4rem; opacity: 0.3; }
        .alert-empty-title { font-family:'Bebas Neue',cursive; font-size:2rem; color:var(--muted); }
        .alert-empty-sub { font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:rgba(138,155,181,0.4); max-width:320px; line-height:1.7; }

        .alert-empty-pulse {
          width: 80px; height: 80px; border-radius: 50%; position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .pulse-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(96,165,250,0.3);
          animation: pulseExpand 2.5s ease-out infinite;
        }
        .pulse-ring:nth-child(2) { animation-delay: 0.8s; }
        .pulse-ring:nth-child(3) { animation-delay: 1.6s; }
        @keyframes pulseExpand { 0%{transform:scale(0.5);opacity:1} 100%{transform:scale(1.5);opacity:0} }
        .pulse-center { width:14px; height:14px; background:#60A5FA; border-radius:50%; box-shadow:0 0 12px rgba(96,165,250,0.5); }

        /* Alert list item */
        .al-item {
          padding: 1rem 1.2rem; border-radius: 10px; margin-bottom: 0.65rem;
          border: 1px solid var(--border);
          background: #fff;
          transition: all 0.2s; cursor: default;
          position: relative; overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .al-item:hover { background: #FFF7ED; border-color: rgba(232,87,26,0.2); }
        .al-item.active { animation: alertItemPulse 1.5s ease-in-out infinite; }
        .al-item.active.ambulance { border-color: rgba(255,68,68,0.3); }
        .al-item.active.private { border-color: rgba(255,179,71,0.3); }
        @keyframes alertItemPulse {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 20px rgba(255,68,68,0.1); }
        }

        .al-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .al-top-left { display: flex; align-items: center; gap: 0.6rem; }
        .al-icon { font-size: 1.3rem; }
        .al-vid { font-family:'JetBrains Mono',monospace; font-size:0.72rem; font-weight:600; }
        .al-pri {
          font-family:'JetBrains Mono',monospace; font-size:0.55rem; letter-spacing:0.06em;
          padding:0.15rem 0.45rem; border-radius:3px;
        }
        .al-pri.ambulance { background:rgba(255,68,68,0.1); color:var(--danger); }
        .al-pri.private { background:rgba(255,179,71,0.1); color:var(--amber); }
        .al-time { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--muted); }

        .al-instruction {
          font-size: 0.82rem; font-weight: 600; line-height: 1.55;
          padding: 0.7rem 0.85rem; border-radius: 7px; margin-bottom: 0.55rem;
        }
        .al-instruction.ambulance { background:rgba(220,38,38,0.06); color:#B91C1C; border:1px solid rgba(220,38,38,0.15); }
        .al-instruction.private { background:rgba(245,158,11,0.06); color:#92400E; border:1px solid rgba(245,158,11,0.15); }

        .al-meta { display:flex; gap:1.5rem; }
        .al-meta-item { display:flex; align-items:center; gap:0.35rem; font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:var(--muted); }

        .al-active-badge {
          font-family:'JetBrains Mono',monospace; font-size:0.52rem;
          padding:0.15rem 0.45rem; border-radius:3px; letter-spacing:0.06em;
        }
        .al-active-badge.is-active { background:rgba(255,68,68,0.1); color:var(--danger); animation:blink 1s infinite; }
        .al-active-badge.dismissed { background:rgba(138,155,181,0.06); color:var(--muted); }

        /* Spinner */
        .spinner { width:16px; height:16px; border-radius:50%; border:2.5px solid currentColor; border-top-color:transparent; animation:spin 0.7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }

        @media (max-width: 900px) {
          .page { grid-template-columns: 1fr; }
          .sidebar { border-right:none; border-bottom:1px solid rgba(96,165,250,0.1); max-height:45vh; }
        }
      `}</style>

      {/* Grid background */}
      <div className="bg-grid" />

      {/* ── FULL-SCREEN ALERT OVERLAY ── */}
      {showFullAlert && (
        <div className={`alert-overlay ${showFullAlert.type}`}>
          <div className="alert-overlay-bg" />
          <div className={`alert-card-full ${showFullAlert.type}`}>
            <div className="alert-siren">
              {showFullAlert.type === "ambulance" ? "🚨" : "⚠️"}
            </div>
            <div className={`alert-title-full ${showFullAlert.type}`}>
              {showFullAlert.type === "ambulance" ? "Emergency Vehicle Approaching!" : "Private Emergency Nearby!"}
            </div>
            <div className={`alert-vehicle-id ${showFullAlert.type}`}>
              {showFullAlert.vehicleId}
            </div>
            <div className={`alert-instruction ${showFullAlert.type}`}>
              {showFullAlert.instruction}
            </div>
            <div className="alert-meta-row">
              <div className="alert-meta-item">
                <div className={`alert-meta-val ${showFullAlert.type}`}>{showFullAlert.distance}</div>
                <div className="alert-meta-label">DISTANCE</div>
              </div>
              <div className="alert-meta-item">
                <div className={`alert-meta-val ${showFullAlert.type}`}>{showFullAlert.eta}</div>
                <div className="alert-meta-label">ETA</div>
              </div>
              <div className="alert-meta-item">
                <div className={`alert-meta-val ${showFullAlert.type}`}>P-{showFullAlert.priority}</div>
                <div className="alert-meta-label">PRIORITY</div>
              </div>
            </div>
            <button className="alert-dismiss-btn" onClick={() => setShowFullAlert(null)}>
              ✓ Acknowledged
            </button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="tb-left">
          <Link href="/" className="logo-link">Golden<em>Hour</em></Link>
          <span className="tb-badge">🙋 NORMAL DRIVER</span>
          {infoSaved && (
            <span className="tb-plate">{vehicleInfo.plateNumber.toUpperCase()}</span>
          )}
        </div>
        <div className="tb-right">
          <div className={`sp ${connected ? "connected" : "offline"}`}>
            <div className={`sp-dot ${connected ? "on" : "off"}`} />
            {connected ? "LISTENING" : "OFFLINE"}
          </div>
          {driverGps && (
            <div className="sp connected" style={{ gap: "0.3rem" }}>
              <div className="sp-dot on" style={{ background: gpsStatus === "live" ? "#34D399" : "#F59E0B" }} />
              GPS {gpsStatus === "live" ? "LIVE" : gpsStatus === "error" ? "DEMO" : "..."}
            </div>
          )}
          <Link href="/auth" className="exit-btn">← Exit</Link>
        </div>
      </header>

      {/* ── PAGE ── */}
      <div className="page">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="sidebar">

          {/* Vehicle Info */}
          <div className="sb-sec">
            <div className="sb-title">
              <div className="sb-title-dot" style={{ background: "#60A5FA" }} />
              Vehicle Information
            </div>

            {!infoSaved ? (
              <>
                <div className="vi-field">
                  <label className="vi-label">Plate Number *</label>
                  <input
                    className="vi-input"
                    type="text"
                    placeholder="MH-12-AB-1234"
                    value={vehicleInfo.plateNumber}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, plateNumber: e.target.value })}
                    maxLength={15}
                  />
                </div>
                <div className="vi-field">
                  <label className="vi-label">Vehicle Model *</label>
                  <input
                    className="vi-input"
                    type="text"
                    placeholder="Maruti Swift"
                    value={vehicleInfo.model}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                    style={{ textTransform: "none" }}
                  />
                </div>
                <div className="vi-grid">
                  <div className="vi-field">
                    <label className="vi-label">Color</label>
                    <input
                      className="vi-input"
                      type="text"
                      placeholder="White"
                      value={vehicleInfo.color}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, color: e.target.value })}
                      style={{ textTransform: "none" }}
                    />
                  </div>
                  <div className="vi-field">
                    <label className="vi-label">Fuel Type</label>
                    <select
                      className="vi-select"
                      value={vehicleInfo.fuelType}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, fuelType: e.target.value })}
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <button
                  className={`vi-save-btn vi-save-active`}
                  onClick={handleSaveInfo}
                  disabled={!vehicleInfo.plateNumber.trim() || !vehicleInfo.model.trim()}
                >
                  Save Vehicle Info
                </button>
              </>
            ) : (
              <div className="vi-display">
                <div className="vi-plate-big">{vehicleInfo.plateNumber.toUpperCase()}</div>
                <div className="vi-detail-grid">
                  <div className="vi-detail">
                    <div className="vi-detail-val">{vehicleInfo.model}</div>
                    <div className="vi-detail-label">Model</div>
                  </div>
                  <div className="vi-detail">
                    <div className="vi-detail-val">{vehicleInfo.color || "—"}</div>
                    <div className="vi-detail-label">Color</div>
                  </div>
                  <div className="vi-detail">
                    <div className="vi-detail-val">{vehicleInfo.fuelType}</div>
                    <div className="vi-detail-label">Fuel</div>
                  </div>
                  <div className="vi-detail">
                    <div className="vi-detail-val">P-10</div>
                    <div className="vi-detail-label">Priority</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Listen Toggle */}
          <div className="listen-sec">
            {!listening ? (
              <button
                className="listen-btn listen-start"
                onClick={startListening}
                disabled={!infoSaved}
              >
                📡 Start Listening for Alerts
              </button>
            ) : (
              <button className="listen-btn listen-stop" onClick={stopListening}>
                ⏹ Stop Listening
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="sb-sec">
            <div className="sb-title">
              <div className="sb-title-dot" style={{ background: connected ? "#34D399" : "var(--muted)" }} />
              Session Stats
            </div>
            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#60A5FA" }}>{alertCount}</div>
                <div className="stat-label">ALERTS</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: connected ? "#34D399" : "var(--muted)", fontSize: "1rem", paddingTop: "0.3rem" }}>
                  {connected ? "LIVE" : "OFF"}
                </div>
                <div className="stat-label">STATUS</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "var(--amber)", fontSize: "0.85rem", paddingTop: "0.35rem" }}>
                  {lastAlertTime}
                </div>
                <div className="stat-label">LAST ALERT</div>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="sb-sec">
            <div className="sb-title">
              <div className="sb-title-dot" style={{ background: "#60A5FA" }} />
              Your Priority
            </div>
            <div className="prio-card">
              <div className="prio-num">10</div>
              <div className="prio-right">
                <div className="prio-bar-bg">
                  <div className="prio-bar-fill" style={{ width: "10%", background: "#60A5FA" }} />
                </div>
                <div className="prio-label" style={{ color: "#60A5FA" }}>STANDARD — NORMAL DRIVER</div>
              </div>
            </div>
          </div>

          {/* Connection info */}
          <div className="sb-sec">
            <div className="sb-title">
              <div className="sb-title-dot" style={{ background: connected ? "#34D399" : "var(--muted)" }} />
              Connection
            </div>
            <div style={{
              background: "var(--navy2)", borderRadius: "8px", padding: "0.75rem",
              border: `1px solid ${connected ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)"}`,
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", lineHeight: 1.8,
              color: "var(--muted)"
            }}>
              <div>Protocol: <span style={{ color: connected ? "#34D399" : "var(--muted)" }}>WebSocket</span></div>
              <div>Channel: <span style={{ color: "var(--white)" }}>corridor-alerts</span></div>
              <div>Status: <span style={{ color: connected ? "#34D399" : "var(--danger)" }}>{connected ? "CONNECTED" : "DISCONNECTED"}</span></div>
              <div>Geo-fence: <span style={{ color: "var(--white)" }}>1km radius</span></div>
            </div>
          </div>
        </aside>

        {/* ── MAIN AREA: SPLIT (ALERTS + MAP) ── */}
        <div className="main-area">
          <div className="main-col-left">
            <div className="alert-header">
              <div>
                <div className="alert-header-title">Alert <span>Feed</span></div>
                <div className="alert-header-sub">
                  {connected
                    ? `Listening for corridor alerts within 1km · ${alertCount} received`
                    : "Not connected — start listening to receive alerts"}
                </div>
              </div>
              {connected && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: "#34D399"
                }}>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: "#34D399", borderTopColor: "transparent" }} />
                  MONITORING
                </div>
              )}
            </div>

            <div className="alert-list-wrap" ref={alertListRef}>
              {alerts.length === 0 ? (
                <div className="alert-empty">
                  <div className="alert-empty-pulse">
                    <div className="pulse-ring" />
                    <div className="pulse-ring" />
                    <div className="pulse-ring" />
                    <div className="pulse-center" />
                  </div>
                  <div className="alert-empty-icon">📡</div>
                  <div className="alert-empty-title">
                    {connected ? "Listening for Alerts…" : "No Alerts Yet"}
                  </div>
                  <div className="alert-empty-sub">
                    {connected
                      ? "You are connected to the corridor network. When an emergency vehicle is nearby, you'll receive an immediate alert here."
                      : "Save your vehicle info and start listening to receive real-time emergency corridor alerts."}
                  </div>
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className={`al-item ${a.active ? "active" : ""} ${a.type}`}>
                    <div className="al-top">
                      <div className="al-top-left">
                        <span className="al-icon">{a.type === "ambulance" ? "🚑" : "🚗"}</span>
                        <span className="al-vid" style={{ color: a.type === "ambulance" ? "var(--danger)" : "var(--amber)" }}>
                          {a.vehicleId}
                        </span>
                        <span className={`al-pri ${a.type}`}>P-{a.priority}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span className={`al-active-badge ${a.active ? "is-active" : "dismissed"}`}>
                          {a.active ? "● ACTIVE" : "CLEARED"}
                        </span>
                        <span className="al-time">{a.time}</span>
                      </div>
                    </div>
                    <div className={`al-instruction ${a.type}`}>
                      {a.instruction}
                    </div>
                    <div className="al-meta">
                      <div className="al-meta-item">📍 {a.direction}</div>
                      <div className="al-meta-item">↔ {a.distance}</div>
                      <div className="al-meta-item">⏱ ETA {a.eta}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="main-col-right">
            {isMapLoaded && driverGps ? (
              <MapView 
                origin={driverGps}
                ambulancePosition={activeAmbulance}
                bearing={activeAmbulance?.bearing}
                isEmergencyActive={!!activeAmbulance}
                routePoints={activeAmbulanceRoute}
                viewMode="driver"
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1221", color: "white" }}>
                <span>Loading map...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio for future alert sounds */}
      <audio ref={alertSoundRef} preload="none" />
    </>
  );
}
