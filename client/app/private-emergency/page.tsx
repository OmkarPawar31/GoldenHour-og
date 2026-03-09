"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
type SessionState = "idle" | "pending" | "active" | "terminating";

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
}

declare global {
  interface Window {
    google: typeof google;
    initGoldenHourPrivateMap: () => void;
  }
}

/* ─────────────────────────────────────────────────────────
   ✏️  PASTE YOUR KEY HERE
───────────────────────────────────────────────────────── */
const MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const ORIGIN = { lat: 18.5204, lng: 73.8567 };
const DESTINATION = { lat: 18.5314, lng: 73.8446 };

function nowStr() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/* ─────────────────────────────────────────────────────────
   MAP DARK STYLE
───────────────────────────────────────────────────────── */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a1628" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a9bb5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#050c1a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0f2040" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#162840" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#162840" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#060e1c" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#08121e" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a3050" }] },
];

/* ─────────────────────────────────────────────────────────
   SIMULATED NEARBY AMBULANCES
───────────────────────────────────────────────────────── */
function generateNearbyAmbulances(): NearbyAmbulance[] {
  const statuses: NearbyAmbulance["status"][] = ["en-route", "available", "busy"];
  const count = Math.floor(1 + Math.random() * 3);
  return Array.from({ length: count }, (_, i) => ({
    id: `AMB-${String(101 + i).padStart(3, "0")}`,
    distance: `${(0.3 + Math.random() * 2.5).toFixed(1)} km`,
    eta: `${Math.floor(2 + Math.random() * 8)} min`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  }));
}

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
export default function PrivateEmergencyDashboard() {

  /* ── state ── */
  const [session, setSession] = useState<SessionState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [gps, setGps] = useState(ORIGIN);
  const [etaText, setEtaText] = useState("--");
  const [distText, setDistText] = useState("--");
  const [nearbyCount, setNearbyCount] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  /* private-specific */
  const [plateNumber, setPlateNumber] = useState("");
  const [plateSubmitted, setPlateSubmitted] = useState(false);
  const [nearbyAmbulances, setNearbyAmbulances] = useState<NearbyAmbulance[]>([]);
  const [adminApproved, setAdminApproved] = useState(false);
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);

  /* ── refs ── */
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const vehicleMarker = useRef<google.maps.Marker | null>(null);
  const corridorPoly = useRef<google.maps.Polyline | null>(null);
  const geofenceCircle = useRef<google.maps.Circle | null>(null);
  const destMarker = useRef<google.maps.Marker | null>(null);
  const routePath = useRef<google.maps.LatLng[]>([]);
  const routeIndex = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambulanceRefresh = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  /* ── helpers ── */
  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLog(prev => [...prev.slice(-49), { time: nowStr(), msg, type }]);
  }, []);

  /* auto-scroll log */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  /* refresh nearby ambulances periodically */
  useEffect(() => {
    setNearbyAmbulances(generateNearbyAmbulances());
    ambulanceRefresh.current = setInterval(() => {
      setNearbyAmbulances(generateNearbyAmbulances());
    }, 8000);
    return () => { if (ambulanceRefresh.current) clearInterval(ambulanceRefresh.current); };
  }, []);

  /* ── Load Google Maps SDK ── */
  useEffect(() => {
    if (!MAPS_API_KEY || MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      addLog("Add your API key to MAPS_API_KEY constant", "error");
      return;
    }
    if (window.google?.maps) { setMapReady(true); return; }

    window.initGoldenHourPrivateMap = () => setMapReady(true);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=geometry,places&callback=initGoldenHourPrivateMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Init map ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapObj.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: ORIGIN,
      zoom: 14,
      styles: MAP_STYLES,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    mapObj.current = map;

    destMarker.current = new window.google.maps.Marker({
      position: DESTINATION,
      map,
      title: "Civil Hospital",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: "#34D399",
        fillOpacity: 1,
        strokeColor: "#34D399",
        strokeWeight: 2,
        scale: 10,
      },
    });

    addLog("Map initialised", "success");
    addLog("GPS lock acquired", "success");
  }, [mapReady, addLog]);

  /* ── Place / move vehicle marker ── */
  const placeVehicle = useCallback(
    (pos: google.maps.LatLng | google.maps.LatLngLiteral, heading = 0) => {
      if (!mapObj.current) return;
      const icon: google.maps.Symbol = {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: "#FFB347",
        fillOpacity: 1,
        strokeColor: "#FFB347",
        strokeWeight: 2,
        scale: 7,
        rotation: heading,
      };
      if (vehicleMarker.current) {
        vehicleMarker.current.setPosition(pos);
        vehicleMarker.current.setIcon(icon);
      } else {
        vehicleMarker.current = new window.google.maps.Marker({
          position: pos, map: mapObj.current,
          title: plateNumber || "PRIVATE", icon, zIndex: 100,
        });
      }
    },
    [plateNumber]
  );

  /* ── Draw corridor + geofence ── */
  const drawCorridor = useCallback((path: google.maps.LatLng[]) => {
    if (!mapObj.current) return;

    corridorPoly.current?.setMap(null);
    corridorPoly.current = new window.google.maps.Polyline({
      path,
      map: mapObj.current,
      strokeColor: "#FFB347",
      strokeOpacity: 0.85,
      strokeWeight: 5,
      icons: [{
        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 },
        offset: "0",
        repeat: "24px",
      }],
    });

    geofenceCircle.current?.setMap(null);
    geofenceCircle.current = new window.google.maps.Circle({
      center: path[0],
      radius: 200,
      map: mapObj.current,
      fillColor: "#FFB347",
      fillOpacity: 0.07,
      strokeColor: "#FFB347",
      strokeOpacity: 0.35,
      strokeWeight: 1.5,
    });
  }, []);

  /* ── Submit plate ── */
  const handlePlateSubmit = () => {
    if (!plateNumber.trim()) return;
    setPlateSubmitted(true);
    addLog(`Vehicle plate registered: ${plateNumber.toUpperCase()}`, "success");
  };

  /* ── REQUEST (with simulated admin approval) ── */
  const requestCorridor = useCallback(() => {
    if (!mapObj.current) {
      addLog("Map not ready yet", "error");
      return;
    }
    if (!plateSubmitted) {
      addLog("Enter and submit your plate number first", "error");
      return;
    }
    setSession("pending");
    addLog("Emergency corridor requested", "info");
    addLog(`Vehicle: ${plateNumber.toUpperCase()} — Priority P-70`, "info");
    addLog("Awaiting admin approval…", "warn");

    /* simulate admin approval after 2.5s */
    setTimeout(() => {
      setAdminApproved(true);
      addLog("✓ Admin approved — corridor granted", "success");
      activateCorridor();
    }, 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateNumber, plateSubmitted]);

  /* ── ACTIVATE CORRIDOR ── */
  const activateCorridor = useCallback(() => {
    setSession("active");
    setElapsed(0);
    setNearbyCount(0);
    addLog("Emergency session started", "success");
    addLog("JWT role verified: PRIVATE P-70", "info");
    addLog("Requesting fastest route via Directions API…", "info");

    // Create session on backend
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("gh_token") : null;

    if (token) {
      fetch(`${API_BASE}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ origin: ORIGIN, destination: DESTINATION }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.session?._id) {
            setBackendSessionId(data.session._id);
            addLog(`Backend session: ${data.session._id.slice(-8)}`, "success");
            socketRef.current = io(`${SOCKET_URL}/tracking`, { transports: ["websocket", "polling"] });
            socketRef.current.emit("join-session", data.session._id);
          }
        })
        .catch(() => addLog("Backend unavailable — running in simulation mode", "warn"));
    } else {
      addLog("No auth token — running in simulation mode", "warn");
    }

    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin: ORIGIN,
        destination: DESTINATION,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        if (status !== "OK" || !result) {
          addLog("Route request failed: " + status, "error");
          setSession("idle");
          return;
        }

        const leg = result.routes[0].legs[0];

        const fullPath: google.maps.LatLng[] = [];
        result.routes[0].legs[0].steps.forEach(step => {
          if (step.polyline) {
            window.google.maps.geometry.encoding
              .decodePath(step.polyline.points)
              .forEach(p => fullPath.push(p));
          }
        });

        routePath.current = fullPath;
        routeIndex.current = 0;

        setEtaText(leg.duration_in_traffic?.text ?? leg.duration?.text ?? "--");
        setDistText(leg.distance?.text ?? "--");

        addLog(`Route: ${leg.distance?.text ?? "?"} · ${leg.duration?.text ?? "?"}`, "success");
        addLog("Green corridor activating (P-70)…", "warn");

        drawCorridor(fullPath);
        placeVehicle(ORIGIN, 0);

        const bounds = new window.google.maps.LatLngBounds();
        fullPath.forEach(p => bounds.extend(p));
        mapObj.current!.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 40 });

        setTimeout(() => {
          addLog("Geo-fence active: 200m radius", "success");
          addLog("Broadcasting alerts to nearby drivers", "info");
          setNearbyCount(Math.floor(3 + Math.random() * 5));
        }, 900);

        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

        moveRef.current = setInterval(() => {
          routeIndex.current = Math.min(routeIndex.current + 2, fullPath.length - 1);
          const pos = fullPath[routeIndex.current];
          const next = fullPath[Math.min(routeIndex.current + 1, fullPath.length - 1)];

          const heading = window.google.maps.geometry.spherical.computeHeading(pos, next);
          placeVehicle(pos, heading);
          geofenceCircle.current?.setCenter(pos);

          setGps({ lat: pos.lat(), lng: pos.lng() });
          setSpeed(Math.floor(38 + Math.random() * 32));
          setNearbyCount(Math.floor(2 + Math.random() * 7));

          if (routeIndex.current >= fullPath.length - 1) {
            clearInterval(moveRef.current!);
            addLog("Destination reached", "success");
          }
        }, 700);
      }
    );
  }, [addLog, drawCorridor, placeVehicle]);

  /* ── TERMINATE ── */
  const terminate = useCallback(() => {
    setShowConfirm(false);
    setSession("terminating");
    addLog("Terminating session…", "warn");
    [timerRef, moveRef].forEach(r => { if (r.current) clearInterval(r.current); });

    // Resolve on backend
    if (backendSessionId) {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = typeof window !== "undefined" ? localStorage.getItem("gh_token") : null;
      if (token) {
        fetch(`${API_BASE}/emergency/${backendSessionId}/resolve`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` },
        }).catch(() => { });
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
    }

    setTimeout(() => {
      corridorPoly.current?.setMap(null);
      geofenceCircle.current?.setMap(null);
      vehicleMarker.current?.setMap(null);
      vehicleMarker.current = null;
      corridorPoly.current = null;
      geofenceCircle.current = null;
      routePath.current = [];
      routeIndex.current = 0;

      mapObj.current?.panTo(ORIGIN);
      mapObj.current?.setZoom(14);

      setSession("idle");
      setSpeed(0);
      setEtaText("--");
      setDistText("--");
      setNearbyCount(0);
      setGps(ORIGIN);
      setAdminApproved(false);
      setBackendSessionId(null);
      addLog("Corridor closed — geo-fence lifted", "success");
      addLog("All driver alerts cleared", "success");
      addLog("Session terminated", "info");
    }, 1200);
  }, [addLog, backendSessionId]);

  /* cleanup on unmount */
  useEffect(() => () => {
    [timerRef, moveRef].forEach(r => { if (r.current) clearInterval(r.current); });
    socketRef.current?.disconnect();
  }, []);

  /* ── derived ── */
  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const noKey = !MAPS_API_KEY || MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY";
  const availableAmbulances = nearbyAmbulances.filter(a => a.status === "available");
  const ambulancesNearby = nearbyAmbulances.length > 0;

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
        .logo-link em { color:#FFB347; font-style:normal; }

        .tb-badge {
          font-family:'JetBrains Mono',monospace; font-size:0.6rem; letter-spacing:0.1em;
          padding:0.22rem 0.6rem; border-radius:4px;
          background:rgba(255,179,71,0.12); border:1px solid rgba(255,179,71,0.28); color:#FFB347;
        }
        .tb-timer { font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:var(--muted); }
        .tb-timer.live { color:var(--success); }

        .sp {
          display:flex; align-items:center; gap:0.4rem;
          font-family:'JetBrains Mono',monospace; font-size:0.62rem; letter-spacing:0.07em;
          padding:0.22rem 0.65rem; border-radius:100px;
        }
        .sp.idle { background:rgba(138,155,181,0.08); border:1px solid rgba(138,155,181,0.18); color:var(--muted); }
        .sp.pending { background:rgba(255,179,71,0.08); border:1px solid rgba(255,179,71,0.28); color:var(--amber); }
        .sp.active { background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.28); color:var(--success); }
        .sp.terminating { background:rgba(255,68,68,0.08); border:1px solid rgba(255,68,68,0.28); color:var(--danger); }
        .sp-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .sp-dot.live { background:var(--success); animation:blink 1.2s infinite; }
        .sp-dot.idle { background:var(--muted); }
        .sp-dot.pend { background:var(--amber); animation:blink 0.8s infinite; }
        .sp-dot.term { background:var(--danger); animation:blink 0.6s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .exit-btn { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--muted); text-decoration:none; letter-spacing:0.04em; transition:color 0.2s; }
        .exit-btn:hover { color:#FFB347; }

        /* ── PAGE GRID ── */
        .page {
          padding-top: 52px;
          height: 100vh;
          display: grid;
          grid-template-columns: 1fr 360px;
          overflow: hidden;
        }

        /* ── LEFT COL ── */
        .left-col {
          display: grid;
          grid-template-rows: 1fr auto;
          overflow: hidden;
        }

        /* Map */
        .map-wrap { position: relative; overflow: hidden; }
        .map-el   { width: 100%; height: 100%; }

        /* Map overlays */
        .ov { position:absolute; pointer-events:none; z-index:10; }
        .ov-tl { top:1rem; left:1rem; }
        .ov-tr { top:1rem; right:1rem; }
        .ov-badge {
          font-family:'JetBrains Mono',monospace; font-size:0.63rem; letter-spacing:0.06em;
          padding:0.32rem 0.75rem; border-radius:6px;
          background:rgba(5,12,26,0.9); backdrop-filter:blur(12px);
          border:1px solid rgba(255,179,71,0.2); color:var(--amber); white-space:nowrap;
        }
        .ov-badge.blue { border-color:rgba(96,165,250,0.25); color:var(--blue); }

        /* No-key placeholder */
        .no-key {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          height:100%; gap:1rem; font-family:'JetBrains Mono',monospace; text-align:center; padding:2rem;
        }
        .no-key-title { font-family:'Bebas Neue',cursive; font-size:2rem; color:var(--danger); }
        .no-key-sub   { font-size:0.78rem; color:var(--muted); max-width:340px; line-height:1.8; }
        .no-key-code  {
          font-size:0.75rem; color:var(--amber);
          background:rgba(255,179,71,0.08); border:1px solid rgba(255,179,71,0.2);
          border-radius:6px; padding:0.7rem 1.2rem; letter-spacing:0.03em;
        }

        /* ── STAT CARDS ROW ── */
        .cards-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--border);
          border-top: 1px solid var(--border);
        }
        .sc {
          background: #fff; padding: 1rem 1.25rem;
          display: flex; flex-direction: column; gap: 0.25rem;
          transition: background 0.2s;
        }
        .sc:hover { background: #FFF7ED; }
        .sc-label { font-family:'JetBrains Mono',monospace; font-size:0.57rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; }
        .sc-val   { font-family:'Bebas Neue',cursive; font-size:2rem; letter-spacing:0.04em; line-height:1; }
        .sc-unit  { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--muted); }

        /* ── SIDEBAR ── */
        .sidebar {
          border-left: 1px solid var(--border);
          background: var(--navy);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: -2px 0 8px rgba(0,0,0,0.04);
        }

        /* Action button */
        .act-wrap { padding: 1rem; flex-shrink: 0; }
        .act-btn {
          width:100%; padding:1rem 1.25rem; border-radius:10px;
          font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:700;
          border:none; cursor:pointer; transition:all 0.22s;
          display:flex; align-items:center; justify-content:center; gap:0.6rem;
        }
        .act-activate {
          background:#FFB347; color:#050C1A;
          box-shadow:0 4px 28px rgba(255,179,71,0.4);
          animation:btnGlow 2s ease-in-out infinite;
        }
        @keyframes btnGlow { 0%,100%{box-shadow:0 4px 28px rgba(255,179,71,0.38)} 50%{box-shadow:0 4px 44px rgba(255,179,71,0.7)} }
        .act-activate:hover { background:#FF6B1A; transform:translateY(-1px); }
        .act-activate:disabled { opacity:0.45; cursor:not-allowed; animation:none; transform:none; }
        .act-terminate { background:rgba(255,68,68,0.1); color:var(--danger); border:1px solid rgba(255,68,68,0.3); }
        .act-terminate:hover { background:rgba(255,68,68,0.18); transform:translateY(-1px); }
        .act-disabled { background:rgba(138,155,181,0.06); color:var(--muted); border:1px solid rgba(138,155,181,0.12); cursor:not-allowed; }
        .act-pending { background:rgba(255,179,71,0.08); color:var(--amber); border:1px solid rgba(255,179,71,0.25); cursor:wait; }

        /* Plate input */
        .plate-sec { padding:0.85rem 1rem; border-top:1px solid rgba(255,255,255,0.05); flex-shrink:0; }
        .plate-label { font-family:'JetBrains Mono',monospace; font-size:0.57rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.55rem; display:block; }
        .plate-row { display:flex; gap:0.5rem; }
        .plate-input {
          flex:1; padding:0.7rem 0.85rem; border-radius:7px;
          background:var(--navy2); border:1px solid rgba(255,255,255,0.09);
          color:var(--white); font-family:'JetBrains Mono',monospace; font-size:0.82rem;
          letter-spacing:0.08em; text-transform:uppercase; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .plate-input::placeholder { color:rgba(138,155,181,0.4); text-transform:none; }
        .plate-input:focus { border-color:#FFB347; box-shadow:0 0 0 3px rgba(255,179,71,0.12); }
        .plate-input:disabled { opacity:0.5; cursor:not-allowed; }
        .plate-btn {
          padding:0.7rem 1rem; border-radius:7px; border:none; cursor:pointer;
          font-family:'JetBrains Mono',monospace; font-size:0.68rem; font-weight:600;
          letter-spacing:0.06em; transition:all 0.2s;
        }
        .plate-btn-submit { background:#FFB347; color:#050C1A; }
        .plate-btn-submit:hover { background:#FF6B1A; }
        .plate-btn-submit:disabled { opacity:0.4; cursor:not-allowed; }
        .plate-btn-done { background:rgba(52,211,153,0.12); color:var(--success); border:1px solid rgba(52,211,153,0.25); cursor:default; }

        /* Ambulance availability card */
        .amb-card-sec { padding:0.85rem 1rem; border-top:1px solid rgba(255,255,255,0.05); flex-shrink:0; }
        .amb-avail-card {
          border-radius:9px; padding:0.85rem;
          border:1px solid rgba(255,255,255,0.05);
          background:var(--navy2);
        }
        .amb-header {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:0.6rem;
        }
        .amb-header-left { display:flex; align-items:center; gap:0.45rem; }
        .amb-status-dot {
          width:8px; height:8px; border-radius:50%; flex-shrink:0;
        }
        .amb-status-dot.available { background:#34D399; box-shadow:0 0 6px #34D399; animation:blink 1.5s infinite; }
        .amb-status-dot.none { background:var(--danger); box-shadow:0 0 6px var(--danger); }
        .amb-status-text { font-family:'JetBrains Mono',monospace; font-size:0.64rem; letter-spacing:0.05em; font-weight:600; }
        .amb-count { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--muted); }

        .amb-list { display:flex; flex-direction:column; gap:0.4rem; }
        .amb-item {
          display:flex; align-items:center; justify-content:space-between;
          padding:0.5rem 0.65rem; border-radius:6px;
          background:rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.04);
          transition:background 0.2s;
        }
        .amb-item:hover { background:rgba(255,255,255,0.04); }
        .amb-item-left { display:flex; align-items:center; gap:0.5rem; }
        .amb-item-icon { font-size:0.9rem; }
        .amb-item-id { font-family:'JetBrains Mono',monospace; font-size:0.65rem; font-weight:600; color:var(--white); }
        .amb-item-dist { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--muted); }
        .amb-item-right { text-align:right; }
        .amb-item-eta { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--amber); font-weight:600; }
        .amb-item-status {
          font-family:'JetBrains Mono',monospace; font-size:0.52rem; letter-spacing:0.05em;
          padding:0.12rem 0.4rem; border-radius:3px; display:inline-block; margin-top:0.15rem;
        }
        .amb-item-status.en-route { background:rgba(255,107,26,0.12); color:#FF6B1A; }
        .amb-item-status.available { background:rgba(52,211,153,0.12); color:#34D399; }
        .amb-item-status.busy { background:rgba(255,68,68,0.12); color:#FF4444; }

        .amb-empty { font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:rgba(255,68,68,0.7); text-align:center; padding:0.8rem 0; }

        /* Sidebar sections */
        .sb-sec { padding:0.85rem 1rem; border-top:1px solid rgba(255,255,255,0.05); flex-shrink:0; }
        .sb-title { font-family:'JetBrains Mono',monospace; font-size:0.57rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.65rem; }

        /* ETA */
        .eta-card {
          background:var(--navy2); border-radius:9px; padding:0.85rem;
          border:1px solid rgba(255,255,255,0.05);
          display:flex; align-items:center; justify-content:space-between;
        }
        .eta-val  { font-family:'Bebas Neue',cursive; font-size:2.2rem; color:var(--amber); line-height:1; }
        .eta-unit { font-family:'JetBrains Mono',monospace; font-size:0.57rem; color:var(--muted); margin-top:0.1rem; display:block; }
        .eta-dest strong { font-family:'DM Sans',sans-serif; font-size:0.8rem; color:var(--white); display:block; text-align:right; }
        .eta-dest span   { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--muted); }

        /* Mini grid */
        .mini-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; }
        .mc { background:var(--navy2); border-radius:8px; padding:0.7rem; border:1px solid rgba(255,255,255,0.05); }
        .mc-val   { font-family:'JetBrains Mono',monospace; font-size:0.76rem; font-weight:600; margin-bottom:0.2rem; }
        .mc-label { font-family:'JetBrains Mono',monospace; font-size:0.54rem; color:var(--muted); letter-spacing:0.06em; }

        /* Priority */
        .prio-card {
          background:var(--navy2); border-radius:8px; padding:0.75rem;
          border:1px solid rgba(255,179,71,0.15);
          display:flex; align-items:center; gap:0.75rem;
        }
        .prio-num { font-family:'Bebas Neue',cursive; font-size:2rem; color:#FFB347; line-height:1; flex-shrink:0; }
        .prio-right { flex:1; }
        .prio-bar-bg   { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; margin-bottom:0.35rem; }
        .prio-bar-fill { height:3px; background:#FFB347; border-radius:2px; }
        .prio-label { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:#FFB347; letter-spacing:0.06em; }

        /* Log */
        .log-wrap { flex:1; overflow:hidden; display:flex; flex-direction:column; border-top:1px solid rgba(255,255,255,0.05); padding:0.85rem 1rem 0; }
        .log-scroll {
          flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.28rem;
          padding-bottom:0.75rem;
          scrollbar-width:thin; scrollbar-color:rgba(255,179,71,0.15) transparent;
        }
        .log-row {
          display:flex; gap:0.45rem; align-items:flex-start;
          font-family:'JetBrains Mono',monospace; font-size:0.59rem; line-height:1.55;
          padding:0.28rem 0.4rem; border-radius:4px;
          background:rgba(255,255,255,0.018);
        }
        .log-t { color:rgba(138,155,181,0.4); flex-shrink:0; }
        .log-m.info    { color:var(--muted); }
        .log-m.success { color:var(--success); }
        .log-m.warn    { color:var(--amber); }
        .log-m.error   { color:var(--danger); }
        .log-empty { font-family:'JetBrains Mono',monospace; font-size:0.59rem; color:rgba(138,155,181,0.25); padding:0.4rem; }

        /* Modal */
        .modal-bg { position:fixed; inset:0; background:rgba(5,12,26,0.82); backdrop-filter:blur(10px); z-index:200; display:flex; align-items:center; justify-content:center; }
        .modal { background:var(--navy); border:1px solid rgba(255,68,68,0.28); border-radius:14px; padding:2rem; max-width:380px; width:90%; }
        .modal-title { font-family:'Bebas Neue',cursive; font-size:2rem; color:var(--danger); margin-bottom:0.5rem; }
        .modal-body  { color:var(--muted); font-size:0.875rem; line-height:1.65; margin-bottom:1.5rem; }
        .modal-btns  { display:flex; gap:0.75rem; }
        .modal-btn { flex:1; padding:0.8rem; border-radius:8px; font-weight:700; font-family:'DM Sans',sans-serif; font-size:0.9rem; cursor:pointer; border:none; transition:all 0.2s; }
        .mb-cancel  { background:rgba(255,255,255,0.05); color:var(--muted); border:1px solid rgba(255,255,255,0.1); }
        .mb-cancel:hover { color:var(--white); }
        .mb-confirm { background:var(--danger); color:var(--white); box-shadow:0 4px 20px rgba(255,68,68,0.3); }
        .mb-confirm:hover { transform:translateY(-1px); }

        /* Spinner */
        .spinner { width:16px; height:16px; border-radius:50%; border:2.5px solid currentColor; border-top-color:transparent; animation:spin 0.7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        @media (max-width: 900px) {
          .page { grid-template-columns: 1fr; }
          .sidebar { border-left:none; border-top:1px solid rgba(255,179,71,0.1); }
          .cards-row { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>

      {/* ── CONFIRM MODAL ── */}
      {showConfirm && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">Terminate Session?</div>
            <p className="modal-body">
              This will close the virtual corridor, lift the 200m geo-fence,
              and clear all driver alerts. Only terminate upon arrival.
            </p>
            <div className="modal-btns">
              <button className="modal-btn mb-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="modal-btn mb-confirm" onClick={terminate}>Yes, Terminate</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="tb-left">
          <Link href="/" className="logo-link">Golden<em>Hour</em></Link>
          <span className="tb-badge">🚗 PRIVATE EMERGENCY</span>
          {plateSubmitted && (
            <span className="tb-badge" style={{ background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.3)", color: "#34D399" }}>
              {plateNumber.toUpperCase()}
            </span>
          )}
          <span className={`tb-timer ${session === "active" ? "live" : ""}`}>
            {session === "active" ? `⏱ ${elapsedStr}` : "⏱ 00:00"}
          </span>
        </div>
        <div className="tb-right">
          <div className={`sp ${session}`}>
            <div className={`sp-dot ${session === "active" ? "live" : session === "pending" ? "pend" : session === "terminating" ? "term" : "idle"}`} />
            {session === "idle" ? "STANDBY" : session === "pending" ? "AWAITING APPROVAL" : session === "active" ? "CORRIDOR ACTIVE" : "TERMINATING…"}
          </div>
          <Link href="/auth" className="exit-btn">← Exit</Link>
        </div>
      </header>

      {/* ── PAGE ── */}
      <div className="page">

        {/* ── LEFT COLUMN ── */}
        <div className="left-col">

          {/* Map */}
          <div className="map-wrap">
            {noKey ? (
              <div className="no-key">
                <div className="no-key-title">API Key Missing</div>
                <p className="no-key-sub">
                  Open <strong style={{ color: "var(--white)" }}>app/private-emergency/page.tsx</strong> and
                  replace <code style={{ color: "var(--amber)" }}>YOUR_GOOGLE_MAPS_API_KEY</code> with
                  your actual Google Maps API key.
                </p>
                <div className="no-key-code">{"const MAPS_API_KEY = \"AIza…your_key\";"}</div>
              </div>
            ) : (
              <div ref={mapRef} className="map-el" />
            )}

            {/* Overlays */}
            {!noKey && (
              <>
                <div className="ov ov-tl">
                  <div className="ov-badge">
                    {session === "active"
                      ? `🟡 CORRIDOR ACTIVE (P-70) — ${nearbyCount} DRIVERS ALERTED`
                      : session === "pending"
                        ? "🟡 PENDING ADMIN APPROVAL…"
                        : "⬜ STANDBY — AWAITING ACTIVATION"}
                  </div>
                </div>
                <div className="ov ov-tr">
                  <div className="ov-badge blue">
                    {gps.lat.toFixed(5)}°N · {gps.lng.toFixed(5)}°E
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── STAT CARDS ── */}
          <div className="cards-row">
            <div className="sc">
              <div className="sc-label">Speed</div>
              <div className="sc-val" style={{ color: "var(--amber)" }}>
                {speed > 0 ? speed : "—"}
              </div>
              <div className="sc-unit">KM / H</div>
            </div>
            <div className="sc">
              <div className="sc-label">Distance</div>
              <div className="sc-val" style={{ color: "var(--blue)" }}>
                {distText !== "--" ? distText : "—"}
              </div>
              <div className="sc-unit">TO DESTINATION</div>
            </div>
            <div className="sc">
              <div className="sc-label">Nearby Drivers</div>
              <div className="sc-val" style={{ color: "var(--blue)" }}>
                {nearbyCount > 0 ? nearbyCount : "—"}
              </div>
              <div className="sc-unit">IN CORRIDOR · 1 KM</div>
            </div>
            <div className="sc">
              <div className="sc-label">Geo-fence</div>
              <div className="sc-val" style={{ color: session === "active" ? "var(--success)" : "var(--muted)" }}>
                {session === "active" ? "200" : "—"}
              </div>
              <div className="sc-unit">METRES RADIUS</div>
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">

          {/* Plate Number Input */}
          <div className="plate-sec">
            <span className="plate-label">Vehicle Plate Number *</span>
            <div className="plate-row">
              <input
                className="plate-input"
                type="text"
                placeholder="MH-12-AB-1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                disabled={plateSubmitted}
                maxLength={15}
              />
              {plateSubmitted ? (
                <button className="plate-btn plate-btn-done">✓</button>
              ) : (
                <button
                  className="plate-btn plate-btn-submit"
                  onClick={handlePlateSubmit}
                  disabled={!plateNumber.trim()}
                >
                  SET
                </button>
              )}
            </div>
          </div>

          {/* Nearby Ambulances Availability */}
          <div className="amb-card-sec">
            <div className="sb-title">Nearby Ambulances</div>
            <div className="amb-avail-card">
              <div className="amb-header">
                <div className="amb-header-left">
                  <div className={`amb-status-dot ${ambulancesNearby ? "available" : "none"}`} />
                  <span className="amb-status-text" style={{ color: availableAmbulances.length > 0 ? "#34D399" : nearbyAmbulances.length > 0 ? "#FFB347" : "#FF4444" }}>
                    {availableAmbulances.length > 0
                      ? "AVAILABLE NEARBY"
                      : nearbyAmbulances.length > 0
                        ? "NEARBY (BUSY)"
                        : "NONE DETECTED"}
                  </span>
                </div>
                <span className="amb-count">{nearbyAmbulances.length} found</span>
              </div>
              <div className="amb-list">
                {nearbyAmbulances.length === 0 ? (
                  <div className="amb-empty">No ambulances detected in your area</div>
                ) : (
                  nearbyAmbulances.map((a) => (
                    <div key={a.id} className="amb-item">
                      <div className="amb-item-left">
                        <span className="amb-item-icon">🚑</span>
                        <div>
                          <div className="amb-item-id">{a.id}</div>
                          <div className="amb-item-dist">{a.distance}</div>
                        </div>
                      </div>
                      <div className="amb-item-right">
                        <div className="amb-item-eta">ETA {a.eta}</div>
                        <span className={`amb-item-status ${a.status}`}>
                          {a.status === "en-route" ? "EN ROUTE" : a.status === "available" ? "AVAILABLE" : "BUSY"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="act-wrap">
            {session === "idle" && (
              <button
                className="act-btn act-activate"
                onClick={requestCorridor}
                disabled={!plateSubmitted}
              >
                🚨 Request Emergency Corridor
              </button>
            )}
            {session === "pending" && (
              <button className="act-btn act-pending" disabled>
                <div className="spinner" /> Awaiting Admin Approval…
              </button>
            )}
            {session === "active" && (
              <button className="act-btn act-terminate" onClick={() => setShowConfirm(true)}>
                ⏹ Terminate Session
              </button>
            )}
            {session === "terminating" && (
              <button className="act-btn act-disabled" disabled>
                <div className="spinner" /> Terminating…
              </button>
            )}
          </div>

          {/* ETA */}
          <div className="sb-sec">
            <div className="sb-title">Route & ETA</div>
            <div className="eta-card">
              <div>
                <div className="eta-val">{etaText}</div>
                <span className="eta-unit">ETA</span>
              </div>
              <div className="eta-dest">
                <strong>Civil Hospital</strong>
                <span>via MG Road, Pune</span>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="sb-sec">
            <div className="sb-title">Priority Score</div>
            <div className="prio-card">
              <div className="prio-num">70</div>
              <div className="prio-right">
                <div className="prio-bar-bg">
                  <div className="prio-bar-fill" style={{ width: "70%" }} />
                </div>
                <div className="prio-label">HIGH — PRIVATE EMERGENCY</div>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="log-wrap">
            <div className="sb-title">Session Log</div>
            <div className="log-scroll" ref={logRef}>
              {log.length === 0 && (
                <div className="log-empty">
                  No events — enter plate & request corridor to begin.
                </div>
              )}
              {log.map((e, i) => (
                <div key={i} className="log-row">
                  <span className="log-t">{e.time}</span>
                  <span>
                    {e.type === "success" ? "✓" : e.type === "warn" ? "⚠" : e.type === "error" ? "✗" : "›"}
                  </span>
                  <span className={`log-m ${e.type}`}>{e.msg}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </>
  );
}
