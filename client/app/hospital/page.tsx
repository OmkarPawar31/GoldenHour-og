"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

// --- Types ---
interface Ambulance {
    id: string;
    name: string;
    status: "Available" | "En Route" | "On Scene" | "Busy";
    location?: { lat: number; lng: number };
    speed: number;
    lastUpdate: string;
    patient?: string;
}

interface Emergency {
    id: string;
    patientName: string;
    priority: "Critical" | "High" | "Medium" | "Low";
    location: string;
    carNumber: string;
    status: "Pending" | "Assigned" | "Completed";
    assignedAmbulance?: string;
}

// --- Constants ---
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const HOSPITAL_LOCATION = { lat: 18.5314, lng: 73.8446 };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
];

export default function HospitalCommandCenter() {
    // --- State ---
    const [beds, setBeds] = useState(12);
    const [isOpen, setIsOpen] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [activeTab, setActiveTab] = useState<"fleet" | "requests" | "settings">("fleet");
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("gh_token");
        localStorage.removeItem("gh_user");
        localStorage.removeItem("gh_role");
        router.push("/auth");
    };

    // Mock Data
    const [fleet, setFleet] = useState<Ambulance[]>([
        { id: "AMB-001", name: "Alpha One", status: "Available", speed: 0, lastUpdate: "Live" },
        { id: "AMB-002", name: "Bravo Two", status: "Busy", speed: 45, lastUpdate: "2m ago", location: { lat: 18.5204, lng: 73.8567 }, patient: "John Doe" },
        { id: "AMB-003", name: "Rescue 3", status: "Available", speed: 0, lastUpdate: "Live" },
    ]);

    const [requests, setRequests] = useState<Emergency[]>([
        { id: "REQ-991", patientName: "Sarah Connor", priority: "Critical", location: "Magarpatta City", carNumber: "MH-12-AB-9876", status: "Pending" },
        { id: "REQ-992", patientName: "Arthur Morgan", priority: "High", location: "Koregaon Park", carNumber: "MH-14-GH-1234", status: "Pending" },
    ]);
    const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null);
    const [hospName, setHospName] = useState("Golden Hour Civil Hospital");
    const [showSettings, setShowSettings] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // --- Refs ---
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Record<string, google.maps.Marker>>({});
    const socketRef = useRef<Socket | null>(null);

    // --- Maps Logic ---
    useEffect(() => {
        if (window.google?.maps) { setMapReady(true); return; }
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=geometry,places`;
        script.async = true;
        script.onload = () => setMapReady(true);
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (!mapReady || !mapRef.current || mapObj.current) return;
        mapObj.current = new window.google.maps.Map(mapRef.current, {
            center: HOSPITAL_LOCATION,
            zoom: 14,
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
        });

        // Hospital Marker
        new window.google.maps.Marker({
            position: HOSPITAL_LOCATION,
            map: mapObj.current,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "#3B82F6",
                fillOpacity: 1,
                strokeColor: "#FFF",
                strokeWeight: 2,
                scale: 12,
            },
            title: hospName,
        });

        // Socket
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
        socketRef.current = io(`${SOCKET_URL}/tracking`);
        socketRef.current.on("ambulance-location", (data) => {
            updateFleetMarker(data);
        });

        return () => { socketRef.current?.disconnect(); };
    }, [mapReady, hospName]);

    const updateFleetMarker = useCallback((data: any) => {
        if (!mapObj.current) return;
        const { vehicleId, lat, lng } = data;
        const pos = { lat, lng };

        if (markersRef.current[vehicleId]) {
            markersRef.current[vehicleId].setPosition(pos);
        } else {
            markersRef.current[vehicleId] = new window.google.maps.Marker({
                position: pos,
                map: mapObj.current,
                icon: {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    fillColor: "#F97316",
                    fillOpacity: 1,
                    scale: 6,
                    strokeWeight: 1,
                },
            });
        }

        // Update state to reflect speed if needed
        setFleet(prev => prev.map(a => a.id === vehicleId ? { ...a, location: pos, speed: data.speed, lastUpdate: "Live" } : a));
    }, []);

    // --- Actions ---
    const assignAmbulance = (reqId: string, ambId: string) => {
        setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "Assigned", assignedAmbulance: ambId } : r));
        setFleet(prev => prev.map(a => a.id === ambId ? { ...a, status: "En Route", patient: requests.find(r => r.id === reqId)?.patientName } : a));

        setToast({ msg: `Successfully dispatched ${ambId} to request ${reqId}`, type: "success" });
        setTimeout(() => setToast(null), 4000);
    };

    const focusAmbulance = (amb: Ambulance) => {
        setSelectedAmbulance(amb);
        if (amb.location && mapObj.current) {
            mapObj.current.panTo(amb.location);
            mapObj.current.setZoom(16);
        }
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        :root {
          --bg: #020617;
          --panel: #0f172a;
          --accent: #3b82f6;
          --orange: #f97316;
          --text: #f8fafc;
          --muted: #94a3b8;
          --border: #1e293b;
          --success: #10b981;
          --danger: #ef4444;
          --glass: rgba(255, 255, 255, 0.03);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; height: 100vh; overflow: hidden; }

        .dashboard { display: grid; grid-template-columns: 80px 420px 1fr; height: 100vh; }

        /* Left Sidebar: Nav */
        .nav-side { background: #000; border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; padding: 1.5rem 0; gap: 2rem; }
        .nav-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: var(--muted); }
        .nav-icon:hover, .nav-icon.active { background: var(--accent); color: #fff; }

        /* Mid Panel: Data & Controls */
        .ctrl-panel { background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 1.5rem; border-bottom: 1px solid var(--border); }
        .panel-title { font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 10px; }
        .panel-title span { color: var(--accent); }
        
        .tab-switcher { display: flex; gap: 4px; padding: 1rem; background: rgba(0,0,0,0.2); margin: 1rem; border-radius: 12px; }
        .tab-btn { flex: 1; padding: 0.6rem; border-radius: 8px; border: none; background: transparent; color: var(--muted); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .tab-btn.active { background: var(--accent); color: #fff; }

        .scroller { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
        
        /* Fleet Cards */
        .f-card { background: var(--glass); border: 1px solid var(--border); border-radius: 16px; padding: 1rem; transition: 0.2s; cursor: pointer; }
        .f-card:hover { border-color: var(--accent); background: rgba(59, 130, 246, 0.05); }
        .f-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .f-id { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
        .f-status { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; text-transform: uppercase; }
        .status-available { background: rgba(16,185,129,0.1); color: var(--success); }
        .status-busy { background: rgba(249,115,22,0.1); color: var(--orange); }
        .status-enroute { background: rgba(59,130,246,0.1); color: var(--accent); }
        
        .f-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .i-box { background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; }
        .i-lab { font-size: 0.6rem; color: var(--muted); text-transform: uppercase; margin-bottom: 2px; }
        .i-val { font-weight: 600; font-size: 0.9rem; }

        /* Request Cards */
        .r-card { border: 1px solid var(--border); border-radius: 16px; padding: 1rem; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
        .r-card::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
        .prio-Critical::after { background: var(--danger); box-shadow: 4px 0 10px rgba(239,68,68,0.3); }
        .prio-High::after { background: var(--orange); }
        .prio-Medium::after { background: var(--accent); }
        
        .r-loc { font-size: 0.85rem; font-weight: 600; }
        .r-pat { font-size: 0.75rem; color: var(--muted); }
        .r-btn { width: 100%; padding: 0.7rem; border-radius: 10px; border: none; background: var(--accent); color: #fff; font-weight: 700; cursor: pointer; margin-top: 10px; }

        /* Hospital HUD (Bottom) */
        .hosp-hud { margin-top: auto; background: #000; padding: 1.5rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 1rem; }
        .h-stat-row { display: flex; justify-content: space-between; align-items: center; }
        .h-toggle { cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; color: var(--success); }
        .h-toggle.closed { color: var(--danger); }
        
        /* Right Section: Map */
        .map-section { position: relative; }
        #radar-map { width: 100%; height: 100%; }
        .map-hud { position: absolute; top: 2rem; right: 2rem; display: flex; flex-direction: column; gap: 1rem; align-items: flex-end; }
        .m-badge { background: rgba(15,23,42,0.8); backdrop-filter: blur(12px); border: 1px solid var(--accent); border-radius: 12px; padding: 0.8rem 1.2rem; display: flex; align-items: center; gap: 12px; }
        .m-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 12px var(--accent); animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.5); } 100% { opacity: 1; transform: scale(1); } }

        /* Settings Modal */
        .modal { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); }
        .modal-box { background: var(--panel); border: 1px solid var(--border); padding: 2rem; border-radius: 24px; width: 400px; }
        .m-field { margin-bottom: 1.5rem; }
        .m-lab { display: block; font-size: 0.75rem; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; }
        .m-input { width: 100%; background: #000; border: 1px solid var(--border); padding: 0.8rem; border-radius: 12px; color: #fff; outline: none; }
      `}</style>

            <div className="dashboard">
                {/* Left Nav */}
                <aside className="nav-side">
                    <div className="nav-icon active" onClick={() => setActiveTab("fleet")}>🚚</div>
                    <div className="nav-icon" onClick={() => setActiveTab("requests")}>🚑</div>
                    <div className="nav-icon" onClick={() => setShowSettings(true)} title="Settings">⚙️</div>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        <Link href="/" className="nav-icon" title="Home">🏠</Link>
                        <div className="nav-icon logout-btn" title="Log Out" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </div>
                    </div>
                </aside>

                {/* Control Panel */}
                <main className="ctrl-panel">
                    <header className="panel-header">
                        <h1 className="panel-title">GOLDEN<span>HOUR</span> CommandCenter</h1>
                        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px' }}>{hospName}</p>
                    </header>

                    <div className="tab-switcher">
                        <button className={`tab-btn ${activeTab === "fleet" ? "active" : ""}`} onClick={() => setActiveTab("fleet")}>FLEET STATUS</button>
                        <button className={`tab-btn ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>ACTIVE REQUESTS</button>
                    </div>

                    <div className="scroller">
                        {activeTab === "fleet" && (
                            <>
                                {selectedAmbulance ? (
                                    <div className="f-card" style={{ borderColor: 'var(--accent)', background: 'rgba(59,130,246,0.08)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <button onClick={() => setSelectedAmbulance(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>← Back to List</button>
                                            <span className={`f-status status-${selectedAmbulance.status.toLowerCase().replace(" ", "")}`}>{selectedAmbulance.status}</span>
                                        </div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedAmbulance.name}</h2>
                                        <p className="f-id" style={{ marginBottom: '1.5rem' }}>Full Telemetry Tracking Locked</p>

                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            <div className="i-box">
                                                <div className="i-lab">Current Coordinates</div>
                                                <div className="i-val" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                                                    {selectedAmbulance.location ? `${selectedAmbulance.location.lat.toFixed(4)}, ${selectedAmbulance.location.lng.toFixed(4)}` : "No GPS Lock"}
                                                </div>
                                            </div>
                                            <div className="i-box">
                                                <div className="i-lab">Engine Diagnostics</div>
                                                <div className="i-val" style={{ color: 'var(--success)' }}>Optimal · Phase 1 Ready</div>
                                            </div>
                                            <div className="i-box">
                                                <div className="i-lab">Assigned Patient</div>
                                                <div className="i-val">{selectedAmbulance.patient || "None (Standby)"}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : fleet.map(amb => (
                                    <div key={amb.id} className="f-card" onClick={() => focusAmbulance(amb)}>
                                        <div className="f-head">
                                            <span className="f-id">{amb.id}</span>
                                            <span className={`f-status status-${amb.status.toLowerCase().replace(" ", "")}`}>{amb.status}</span>
                                        </div>
                                        <div style={{ fontWeight: 700 }}>{amb.name}</div>
                                        <div className="f-info">
                                            <div className="i-box">
                                                <div className="i-lab">Speed</div>
                                                <div className="i-val" style={{ color: 'var(--orange)' }}>{amb.speed} km/h</div>
                                            </div>
                                            <div className="i-box">
                                                <div className="i-lab">Last Sync</div>
                                                <div className="i-val">{amb.lastUpdate}</div>
                                            </div>
                                        </div>
                                        {amb.patient && (
                                            <div className="i-box" style={{ marginTop: 10, background: 'rgba(59,130,246,0.1)', borderColor: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}>
                                                <div className="i-lab" style={{ color: 'var(--accent)' }}>Carrying Patient</div>
                                                <div className="i-val">{amb.patient}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}

                        {activeTab === "requests" && requests.map(req => (
                            <div key={req.id} className={`r-card prio-${req.priority}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="f-id">{req.id}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: req.priority === "Critical" ? 'var(--danger)' : 'var(--orange)' }}>{req.priority.toUpperCase()}</span>
                                </div>
                                <div className="r-loc">{req.location}</div>
                                <div className="r-pat">Patient: {req.patientName} · {req.carNumber}</div>

                                {req.status === "Pending" ? (
                                    <select
                                        className="r-btn"
                                        onChange={(e) => assignAmbulance(req.id, e.target.value)}
                                        value=""
                                    >
                                        <option value="" disabled>Dispatch Fleet...</option>
                                        {fleet.filter(a => a.status === "Available").map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ background: '#000', padding: '10px', borderRadius: '10px', marginTop: 10, fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700, textAlign: 'center' }}>
                                        ✅ {req.assignedAmbulance} DISPATCHED
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <footer className="hosp-hud">
                        <div className="h-stat-row">
                            <div style={{ flex: 1 }}>
                                <div className="i-lab">Total Bed Capacity</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 800 }}>{beds}</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => setBeds(b => Math.max(0, b - 1))} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#111', color: '#fff' }}>-</button>
                                        <button onClick={() => setBeds(b => b + 1)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#111', color: '#fff' }}>+</button>
                                    </div>
                                </div>
                            </div>
                            <div className={`h-toggle ${isOpen ? "" : "closed"}`} onClick={() => setIsOpen(!isOpen)}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }} />
                                {isOpen ? "SERVICE ACTIVE" : "HOSPITAL CLOSED"}
                            </div>
                        </div>
                    </footer>
                </main>

                {/* Map Section */}
                <section className="map-section">
                    <div id="radar-map" ref={mapRef}></div>
                    <div className="map-hud">
                        <div className="m-badge">
                            <div className="m-dot"></div>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>
                                <div style={{ color: 'var(--muted)' }}>NETWORK LOAD</div>
                                <div style={{ fontWeight: 800, color: 'var(--accent)' }}>OPTIMAL (14MS)</div>
                            </div>
                        </div>
                        <div className="m-badge" style={{ borderColor: 'var(--success)' }}>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>
                                <div style={{ color: 'var(--muted)' }}>LOCAL COVERAGE</div>
                                <div style={{ fontWeight: 800, color: 'var(--success)' }}>98.4% ACTIVE</div>
                            </div>
                        </div>
                    </div>
                    {toast && (
                        <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', background: toast.type === "success" ? 'var(--success)' : 'var(--danger)', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 700, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 50 }}>
                            {toast.msg}
                        </div>
                    )}
                </section>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal">
                    <div className="modal-box">
                        <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Hospital Profile</h2>
                        <div className="m-field">
                            <label className="m-lab">Facility Name</label>
                            <input className="m-input" value={hospName} onChange={(e) => setHospName(e.target.value)} />
                        </div>
                        <div className="m-field">
                            <label className="m-lab">Emergency Contact</label>
                            <input className="m-input" placeholder="+91 99999 88888" />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
                            <button className="r-btn" onClick={() => setShowSettings(false)}>Save Changes</button>
                            <button className="r-btn" style={{ background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowSettings(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
