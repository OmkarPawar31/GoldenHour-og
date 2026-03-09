"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
type SessionState = "idle" | "active" | "terminating";

interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "warn" | "success" | "error";
}

declare global {
  interface Window {
    google: typeof google;
    initGoldenHourMap: () => void;
  }
}

/* ─────────────────────────────────────────────────────────
   ✏️  PASTE YOUR KEY HERE
───────────────────────────────────────────────────────── */
const MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

/* ─────────────────────────────────────────────────────────
   CONSTANTS  — change to your city / hospital
───────────────────────────────────────────────────────── */
const ORIGIN = { lat: 18.5204, lng: 73.8567 }; // MG Road, Pune
const DESTINATION = { lat: 18.5314, lng: 73.8446 }; // Civil Hospital, Pune

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
   COMPONENT
───────────────────────────────────────────────────────── */
export default function AmbulanceDashboard() {

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
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);

  /* ── refs ── */
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const ambulanceMarker = useRef<google.maps.Marker | null>(null);
  const corridorPoly = useRef<google.maps.Polyline | null>(null);
  const geofenceCircle = useRef<google.maps.Circle | null>(null);
  const destMarker = useRef<google.maps.Marker | null>(null);
  const routePath = useRef<google.maps.LatLng[]>([]);
  const routeIndex = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  /* ── Load Google Maps SDK ── */
  useEffect(() => {
    if (!MAPS_API_KEY || MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      addLog("Add your API key to MAPS_API_KEY constant", "error");
      return;
    }
    if (window.google?.maps) { setMapReady(true); return; }

    window.initGoldenHourMap = () => setMapReady(true);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=geometry,places&callback=initGoldenHourMap`;
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

    /* destination marker */
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

  /* ── Place / move ambulance marker ── */
  const placeAmbulance = useCallback(
    (pos: google.maps.LatLng | google.maps.LatLngLiteral, heading = 0) => {
      if (!mapObj.current) return;
      const icon: google.maps.Symbol = {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: "#FF6B1A",
        fillOpacity: 1,
        strokeColor: "#FF6B1A",
        strokeWeight: 2,
        scale: 7,
        rotation: heading,
      };
      if (ambulanceMarker.current) {
        ambulanceMarker.current.setPosition(pos);
        ambulanceMarker.current.setIcon(icon);
      } else {
        ambulanceMarker.current = new window.google.maps.Marker({
          position: pos, map: mapObj.current,
          title: "AMB-001", icon, zIndex: 100,
        });
      }
    },
    []
  );

  /* ── Draw corridor + geofence ── */
  const drawCorridor = useCallback((path: google.maps.LatLng[]) => {
    if (!mapObj.current) return;

    corridorPoly.current?.setMap(null);
    corridorPoly.current = new window.google.maps.Polyline({
      path,
      map: mapObj.current,
      strokeColor: "#FF6B1A",
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
      fillColor: "#FF6B1A",
      fillOpacity: 0.07,
      strokeColor: "#FF6B1A",
      strokeOpacity: 0.35,
      strokeWeight: 1.5,
    });
  }, []);

  /* ── ACTIVATE ── */
  const activate = useCallback(() => {
    if (!mapObj.current) {
      addLog("Map not ready yet", "error");
      return;
    }
    setSession("active");
    setElapsed(0);
    setNearbyCount(0);
    addLog("Emergency session started", "success");
    addLog("JWT role verified: AMBULANCE P-100", "info");
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

            // Connect to tracking socket
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

        /* decode full polyline */
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
        addLog("Green corridor activating…", "warn");

        /* draw on map */
        drawCorridor(fullPath);
        placeAmbulance(ORIGIN, 0);

        /* fit bounds */
        const bounds = new window.google.maps.LatLngBounds();
        fullPath.forEach(p => bounds.extend(p));
        mapObj.current!.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 40 });

        setTimeout(() => {
          addLog("Geo-fence active: 200m radius", "success");
          addLog("Broadcasting alerts to nearby drivers", "info");
          setNearbyCount(Math.floor(3 + Math.random() * 5));
        }, 900);

        /* elapsed timer */
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

        /* move ambulance */
        moveRef.current = setInterval(() => {
          routeIndex.current = Math.min(routeIndex.current + 2, fullPath.length - 1);
          const pos = fullPath[routeIndex.current];
          const next = fullPath[Math.min(routeIndex.current + 1, fullPath.length - 1)];

          const heading = window.google.maps.geometry.spherical.computeHeading(pos, next);
          placeAmbulance(pos, heading);
          geofenceCircle.current?.setCenter(pos);

          setGps({ lat: pos.lat(), lng: pos.lng() });
          setSpeed(Math.floor(38 + Math.random() * 32));
          setNearbyCount(Math.floor(2 + Math.random() * 7));

          // Send location update to backend
          if (socketRef.current?.connected) {
            socketRef.current.emit("location-update", {
              vehicleId: "ambulance-sim",
              lat: pos.lat(),
              lng: pos.lng(),
              speed: Math.floor(38 + Math.random() * 32),
            });
          }

          if (routeIndex.current >= fullPath.length - 1) {
            clearInterval(moveRef.current!);
            addLog("Destination reached", "success");
          }
        }, 700);
      }
    );
  }, [addLog, drawCorridor, placeAmbulance]);

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
      ambulanceMarker.current?.setMap(null);
      ambulanceMarker.current = null;
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
        .logo-link em { color:#FF6B1A; font-style:normal; }

        .tb-badge {
          font-family:'JetBrains Mono',monospace; font-size:0.6rem; letter-spacing:0.1em;
          padding:0.22rem 0.6rem; border-radius:4px;
          background:rgba(255,107,26,0.12); border:1px solid rgba(255,107,26,0.28); color:#FF6B1A;
        }
        .tb-timer { font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:var(--muted); }
        .tb-timer.live { color:var(--success); }

        .sp {
          display:flex; align-items:center; gap:0.4rem;
          font-family:'JetBrains Mono',monospace; font-size:0.62rem; letter-spacing:0.07em;
          padding:0.22rem 0.65rem; border-radius:100px;
        }
        .sp.idle { background:rgba(138,155,181,0.08); border:1px solid rgba(138,155,181,0.18); color:var(--muted); }
        .sp.active { background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.28); color:var(--success); }
        .sp.terminating { background:rgba(255,68,68,0.08); border:1px solid rgba(255,68,68,0.28); color:var(--danger); }
        .sp-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .sp-dot.live { background:var(--success); animation:blink 1.2s infinite; }
        .sp-dot.idle { background:var(--muted); }
        .sp-dot.term { background:var(--danger); animation:blink 0.6s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .exit-btn { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--muted); text-decoration:none; letter-spacing:0.04em; transition:color 0.2s; }
        .exit-btn:hover { color:#FF6B1A; }

        /* ── PAGE GRID ── */
        .page {
          padding-top: 52px;
          height: 100vh;
          display: grid;
          grid-template-columns: 1fr 340px;
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
          border:1px solid rgba(255,107,26,0.2); color:var(--orange); white-space:nowrap;
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
          font-size:0.75rem; color:var(--orange);
          background:rgba(255,107,26,0.08); border:1px solid rgba(255,107,26,0.2);
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
          background:#FF6B1A; color:#050C1A;
          box-shadow:0 4px 28px rgba(255,107,26,0.4);
          animation:btnGlow 2s ease-in-out infinite;
        }
        @keyframes btnGlow { 0%,100%{box-shadow:0 4px 28px rgba(255,107,26,0.38)} 50%{box-shadow:0 4px 44px rgba(255,107,26,0.7)} }
        .act-activate:hover { background:var(--amber); transform:translateY(-1px); }
        .act-terminate { background:rgba(255,68,68,0.1); color:var(--danger); border:1px solid rgba(255,68,68,0.3); }
        .act-terminate:hover { background:rgba(255,68,68,0.18); transform:translateY(-1px); }
        .act-disabled { background:rgba(138,155,181,0.06); color:var(--muted); border:1px solid rgba(138,155,181,0.12); cursor:not-allowed; }

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
          border:1px solid rgba(255,107,26,0.15);
          display:flex; align-items:center; gap:0.75rem;
        }
        .prio-num { font-family:'Bebas Neue',cursive; font-size:2rem; color:#FF6B1A; line-height:1; flex-shrink:0; }
        .prio-right { flex:1; }
        .prio-bar-bg   { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; margin-bottom:0.35rem; }
        .prio-bar-fill { height:3px; background:#FF6B1A; border-radius:2px; }
        .prio-label { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:#FF6B1A; letter-spacing:0.06em; }

        /* Log */
        .log-wrap { flex:1; overflow:hidden; display:flex; flex-direction:column; border-top:1px solid rgba(255,255,255,0.05); padding:0.85rem 1rem 0; }
        .log-scroll {
          flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.28rem;
          padding-bottom:0.75rem;
          scrollbar-width:thin; scrollbar-color:rgba(255,107,26,0.15) transparent;
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
          <span className="tb-badge">🚑 AMBULANCE</span>
          <span className={`tb-timer ${session === "active" ? "live" : ""}`}>
            {session === "active" ? `⏱ ${elapsedStr}` : "⏱ 00:00"}
          </span>
        </div>
        <div className="tb-right">
          <div className={`sp ${session}`}>
            <div className={`sp-dot ${session === "active" ? "live" : session === "terminating" ? "term" : "idle"}`} />
            {session === "idle" ? "STANDBY" : session === "active" ? "CORRIDOR ACTIVE" : "TERMINATING…"}
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
                  Open <strong style={{ color: "var(--white)" }}>app/ambulance/page.tsx</strong> and
                  replace <code style={{ color: "var(--orange)" }}>YOUR_GOOGLE_MAPS_API_KEY</code> with
                  your actual Google Maps API key.
                </p>
                <div className="no-key-code">const MAPS_API_KEY = "AIza…your_key";</div>
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
                      ? `🟢 CORRIDOR ACTIVE — ${nearbyCount} DRIVERS ALERTED`
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
              <div className="sc-val" style={{ color: "var(--orange)" }}>
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

          {/* Action button */}
          <div className="act-wrap">
            {session === "idle" && (
              <button className="act-btn act-activate" onClick={activate}>
                ⚡ Activate Emergency Corridor
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

          {/* GPS */}
          <div className="sb-sec">
            <div className="sb-title">GPS Coordinates</div>
            <div className="mini-grid">
              <div className="mc">
                <div className="mc-val" style={{ color: "var(--success)" }}>
                  {gps.lat.toFixed(5)}
                </div>
                <div className="mc-label">LATITUDE</div>
              </div>
              <div className="mc">
                <div className="mc-val" style={{ color: "var(--success)" }}>
                  {gps.lng.toFixed(5)}
                </div>
                <div className="mc-label">LONGITUDE</div>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="sb-sec">
            <div className="sb-title">Priority Score</div>
            <div className="prio-card">
              <div className="prio-num">100</div>
              <div className="prio-right">
                <div className="prio-bar-bg">
                  <div className="prio-bar-fill" style={{ width: "100%" }} />
                </div>
                <div className="prio-label">MAXIMUM — AMBULANCE</div>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="log-wrap">
            <div className="sb-title">Session Log</div>
            <div className="log-scroll" ref={logRef}>
              {log.length === 0 && (
                <div className="log-empty">
                  No events — activate corridor to begin.
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