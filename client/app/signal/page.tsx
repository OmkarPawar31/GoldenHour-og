"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import { useJsApiLoader } from "@react-google-maps/api";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
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

const PROXIMITY_ALERT_RADIUS_M = 1200; // Alert when ambulance is within 1.2km of signal

export default function SignalDashboard() {
  const [signalId, setSignalId] = useState("SIG-MAIN-01");
  const [signalGps, setSignalGps] = useState<{ lat: number; lng: number }>({ lat: 18.9894, lng: 73.1175 }); // Default: Panvel (simulation area)
  const [isReady, setIsReady] = useState(false);
  
  const [activeAmbulance, setActiveAmbulance] = useState<{ lat: number; lng: number, bearing: number, id: string, distStr: string, etaStr: string } | null>(null);
  const [activeAmbulanceRoute, setActiveAmbulanceRoute] = useState<{ lat: number; lng: number }[]>([]);
  
  const dispatchSocketRef = useRef<Socket | null>(null);

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places", "geometry"],
  });

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalId.trim()) return;

    // Use geolocation to get signal loc, or fallback to default
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSignalGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsReady(true);
        },
        () => {
          setIsReady(true); // Proceed with fallback
        }
      );
    } else {
      setIsReady(true);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    dispatchSocketRef.current = io(`${SOCKET_URL}/dispatch`, { transports: ["websocket", "polling"] });

    dispatchSocketRef.current.on("ambulance:position", (data: AmbulancePosition) => {
      const dist = haversineM(signalGps, { lat: data.lat, lng: data.lng });

      // Check if ambulance is within proximity radius of the signal
      if (dist <= PROXIMITY_ALERT_RADIUS_M) {
        const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;
        const etaStr = data.speed > 0 ? `~${Math.ceil((dist / 1000) / data.speed * 60)} min` : "< 1 min";
        setActiveAmbulance({ lat: data.lat, lng: data.lng, bearing: data.bearing, id: data.ambulanceId, distStr, etaStr });
        if (data.routePoints) {
            setActiveAmbulanceRoute(data.routePoints);
        }
      } else if (activeAmbulance?.id === data.ambulanceId) {
        // If it was near but now moved far away past the radius
        setActiveAmbulance(null);
        setActiveAmbulanceRoute([]);
      }
    });

    dispatchSocketRef.current.on("ambulance:deactivate", (data: { ambulanceId: string }) => {
      if (activeAmbulance?.id === data.ambulanceId) {
        setActiveAmbulance(null);
        setActiveAmbulanceRoute([]);
      }
    });

    return () => {
      dispatchSocketRef.current?.disconnect();
    };
  }, [isReady, signalGps, activeAmbulance?.id]);

  if (!isReady) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050C1A", color: "white", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
           body { margin: 0; padding: 0; background: #050C1A; }
           .card { background: #1E293B; padding: 2.5rem; border-radius: 12px; width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
           .title { font-size: 2rem; font-family: 'Bebas Neue', cursive; color: #fff; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
           .input { width: 100%; padding: 0.8rem 1rem; margin: 1rem 0; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: #0F172A; color: white; font-size: 1rem; }
           .btn { background: #3B82F6; color: white; padding: 0.8rem; width: 100%; border: none; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
           .btn:hover { background: #60A5FA; }
        `}</style>
        <div className="card">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚦</div>
          <div className="title">Smart Traffic Signal</div>
          <p style={{ color: "#94A3B8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Configure this digital signage node.</p>
          <form onSubmit={handleStart}>
            <input 
              className="input" 
              placeholder="Signal ID (e.g. SIG-MAIN-01)" 
              value={signalId} 
              onChange={(e) => setSignalId(e.target.value)}
              required
            />
            <button className="btn" type="submit">Activate Signal Display</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", color: "#fff", overflow: "hidden" }}>
        {/* Dynamic Digital BillBoard Area (Top 40%) */}
        <div style={{ height: activeAmbulance ? "45%" : "100%", transition: "all 0.5s ease", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            {activeAmbulance ? (
                <>
                <div style={{ position: "absolute", inset: 0, background: "rgba(220,38,38,0.15)", animation: "flash 1s alternate infinite" }} />
                <style>{`@keyframes flash { from { opacity: 0.5; } to { opacity: 1; } }`}</style>
                <div style={{ textAlign: "center", zIndex: 10, padding: "2rem" }}>
                    <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "6vw", margin: 0, color: "#EF4444", textShadow: "0 4px 20px rgba(239,68,68,0.5)", lineHeight: 1.1 }}>
                       🚨 EMERGENCY VEHICLE APPROACHING
                    </h1>
                    <div style={{ display: "flex", justifyContent: "center", gap: "2rem", margin: "1.5rem 0" }}>
                        <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem 2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                            <div style={{ fontSize: "1rem", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem" }}>Distance</div>
                            <div style={{ fontSize: "3rem", fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", color: "#FBBF24" }}>{activeAmbulance.distStr}</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem 2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                            <div style={{ fontSize: "1rem", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem" }}>ETA</div>
                            <div style={{ fontSize: "3rem", fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", color: "#34D399" }}>{activeAmbulance.etaStr}</div>
                        </div>
                    </div>
                    <div style={{ fontSize: "2.5vw", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", background: "#EF4444", color: "#fff", padding: "1rem 3rem", borderRadius: "100px", display: "inline-block", boxShadow: "0 10px 30px rgba(239,68,68,0.4)" }}>
                        MOVE LEFT. CLEAR RIGHT LANE. ⬅️
                    </div>
                </div>
                </>
            ) : (
                <div style={{ textAlign: "center", opacity: 0.5 }}>
                    <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>🟢</div>
                    <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "3rem", letterSpacing: "0.1em" }}>Smart Signal Active</h2>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.2rem", color: "#94A3B8" }}>Idle... Monitoring for emergency vehicles.</p>
                </div>
            )}
        </div>

        {/* Live Map Area (Bottom 55% only when active) */}
        {activeAmbulance && (
            <div style={{ height: "55%", position: "relative", borderTop: "4px solid #EF4444" }}>
                 <div style={{ position: "absolute", top: "1rem", left: "1rem", background: "rgba(0,0,0,0.8)", padding: "0.5rem 1rem", borderRadius: "8px", zIndex: 10, fontFamily: "'JetBrains Mono', monospace", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444", animation: "flash 1s alternate infinite" }}></div>
                    Live Ambulance Tracking
                 </div>
                 {isMapLoaded ? (
                  <MapView 
                    origin={signalGps}
                    ambulancePosition={activeAmbulance}
                    bearing={activeAmbulance.bearing}
                    isEmergencyActive={true}
                    routePoints={activeAmbulanceRoute}
                    viewMode="driver"
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1E293B" }}>Loading Map...</div>
                )}
            </div>
        )}
    </div>
  );
}
