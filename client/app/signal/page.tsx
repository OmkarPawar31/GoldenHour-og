"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import { useJsApiLoader } from "@react-google-maps/api";
import { Signal, AlertTriangle, ArrowLeft } from "lucide-react";

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
  const pageRef = useRef<HTMLDivElement>(null);

  // GSAP entrance
  useGSAP(() => {
    if (!pageRef.current) return;
    gsap.fromTo('.sig-panel', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' });
  }, { scope: pageRef, dependencies: [isReady] });

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

  const activeAmbulanceIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeAmbulanceIdRef.current = activeAmbulance?.id || null;
  }, [activeAmbulance?.id]);

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
      } else if (activeAmbulanceIdRef.current === data.ambulanceId) {
        // If it was near but now moved far away past the radius
        setActiveAmbulance(null);
        setActiveAmbulanceRoute([]);
      }
    });

    dispatchSocketRef.current.on("ambulance:deactivate", (data: { ambulanceId: string }) => {
      if (activeAmbulanceIdRef.current === data.ambulanceId) {
        setActiveAmbulance(null);
        setActiveAmbulanceRoute([]);
      }
    });

    return () => {
      dispatchSocketRef.current?.disconnect();
    };
  }, [isReady, signalGps]);

  if (!isReady) {
    return (
      <div ref={pageRef} style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
           body { margin: 0; padding: 0; background: #050C1A; }
           .card { background: #1E293B; padding: 2.5rem; border-radius: 12px; width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
           .title { font-size: 2rem; font-family: 'Bebas Neue', cursive; color: #fff; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
           .input { width: 100%; padding: 0.8rem 1rem; margin: 1rem 0; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: #0F172A; color: white; font-size: 1rem; }
           .btn { background: #3B82F6; color: white; padding: 0.8rem; width: 100%; border: none; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
           .btn:hover { background: #60A5FA; }
        `}</style>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem", color: "#60A5FA" }}>
            <Signal size={48} />
          </div>
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#050C1A", color: "#fff", overflow: "hidden" }}>
        {/* Dynamic Digital BillBoard Area */}
        <div style={{ height: activeAmbulance ? "45%" : "100%", transition: "height 0.6s cubic-bezier(0.85, 0, 0.15, 1)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            {activeAmbulance ? (
                <div style={{ animation: "gh-fade-in 0.6s ease-out forwards", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.15)", animation: "flash 1.2s alternate infinite ease-in-out" }} />
                <style>{`@keyframes flash { from { opacity: 0.3; } to { opacity: 1; } }`}</style>
                <div style={{ textAlign: "center", zIndex: 10, padding: "2rem" }}>
                    <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "6vw", margin: 0, color: "#EF4444", textShadow: "0 4px 20px rgba(239,68,68,0.5)", lineHeight: 1.1, display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
                       <AlertTriangle size={64} /> EMERGENCY VEHICLE APPROACHING
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
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "1rem", fontSize: "2.5vw", fontWeight: 800, fontFamily: "'DM Sans', sans-serif", background: "#EF4444", color: "#fff", padding: "1.2rem 3.5rem", borderRadius: "100px", boxShadow: "0 10px 40px rgba(239,68,68,0.5)", letterSpacing: "1px", animation: "gh-pulse-subtle 2s infinite" }}>
                        MOVE LEFT. CLEAR RIGHT LANE. <ArrowLeft size={36} />
                    </div>
                </div>
                </div>
            ) : (
                <div style={{ textAlign: "center", opacity: 0.6, transition: "opacity 0.6s ease", animation: "gh-fade-in 0.8s ease-out forwards" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#10B981", boxShadow: "0 0 40px rgba(16,185,129,0.5)", margin: "0 auto 1.5rem" }} />
                    <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "3.5rem", letterSpacing: "0.1em", color: "#10B981" }}>Smart Signal Active</h2>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.2rem", color: "#94A3B8", marginTop: "0.5rem" }}>Idle... Monitoring for emergency vehicles.</p>
                </div>
            )}
        </div>

        {/* Live Map Area */}
        {activeAmbulance && (
            <div style={{ height: "55%", position: "relative", borderTop: "4px solid #EF4444", animation: "gh-slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}>
                 {/* HUD Panel */}
                 <div className="sig-panel" style={{
                    position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10,
                    background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)", padding: "0.6rem 1.2rem", borderRadius: "12px", fontFamily: "'JetBrains Mono', monospace", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#EF4444", animation: "flash 1s alternate infinite ease-in-out" }}></div>
                    Live Tracking: Priority 100
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
