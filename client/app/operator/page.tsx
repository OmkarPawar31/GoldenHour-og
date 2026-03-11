"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Constants ---
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };

export default function OperatorDashboard() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginName, setLoginName] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    
    const [mapReady, setMapReady] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchedCenter, setSearchedCenter] = useState<{lat: number, lng: number} | null>(null);
    
    // Mock Data
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [ambulances, setAmbulances] = useState<any[]>([]);
    const [assigned, setAssigned] = useState<string | null>(null);

    // Assignment State
    const [selectedAmbulance, setSelectedAmbulance] = useState<any | null>(null);
    const [assignmentLocation, setAssignmentLocation] = useState("");

    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);

    useEffect(() => {
        const token = localStorage.getItem("gh_token");
        const role = localStorage.getItem("gh_role");
        if (token && role === "organizer") {
            setIsLoggedIn(true);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn && !window.google?.maps) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places,geometry`;
            script.async = true;
            script.onload = () => setMapReady(true);
            document.head.appendChild(script);
        } else if (isLoggedIn && window.google?.maps) {
            setMapReady(true);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (mapReady && isLoggedIn && mapRef.current && !mapObj.current) {
            mapObj.current = new window.google.maps.Map(mapRef.current, {
                center: DEFAULT_CENTER,
                zoom: 13,
                styles: [
                    // A lighter, cleaner map style matching the app's theme
                    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
                    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
                    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
                    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
                    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
                    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
                    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
                    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
                ],
                disableDefaultUI: true,
                zoomControl: true,
            });
        }
    }, [mapReady, isLoggedIn]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginName, password })
            });
            const data = await res.json();
            
            if (res.ok && data.user.role === "organizer") {
                localStorage.setItem("gh_token", data.token);
                localStorage.setItem("gh_role", data.user.role);
                setIsLoggedIn(true);
            } else if (res.ok) {
                setLoginError("Account does not have operator privileges.");
            } else {
                setLoginError(data.message || "Invalid username or password.");
            }
        } catch (error) {
            setLoginError("Failed to connect to authentication server.");
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        
        // Simulating search to center map and fetch nearby
        const newCenter = { 
            lat: DEFAULT_CENTER.lat + (Math.random() * 0.04 - 0.02), 
            lng: DEFAULT_CENTER.lng + (Math.random() * 0.04 - 0.02) 
        };
        setSearchedCenter(newCenter);
        setAssigned(null); // Reset assigned state for new search

        if (mapObj.current) {
            mapObj.current.panTo(newCenter);
            mapObj.current.setZoom(15);
        }
        
        generateNearby(newCenter);
    };

    const generateNearby = (center: any) => {
        // Clear markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        // Haversine distance calculator
        const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; // returned in km
        };

        const newHosps = Array.from({length: 3}).map((_, i) => ({
            id: `HOSP-${i}`, name: `City Hospital ${i+1}`,
            lat: center.lat + (Math.random() * 0.02 - 0.01),
            lng: center.lng + (Math.random() * 0.02 - 0.01)
        }));
        
        let newAmbs = Array.from({length: 6}).map((_, i) => {
            const lat = center.lat + (Math.random() * 0.03 - 0.015);
            const lng = center.lng + (Math.random() * 0.03 - 0.015);
            const distKm = getDistance(center.lat, center.lng, lat, lng);
            const distDisplay = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`;
            
            return {
                id: `AMB-10${i}`, name: `Rescue ${i+1}`,
                status: i % 3 === 0 ? "Busy" : "Available", // 2/3 Available
                lat, lng,
                rawDistance: distKm,
                distance: distDisplay
            };
        });

        // Sort ambulances by closest distance
        newAmbs.sort((a, b) => a.rawDistance - b.rawDistance);

        setHospitals(newHosps);
        setAmbulances(newAmbs);

        // Add markers
        if (mapObj.current && window.google) {
            
            // Helper function to create naked emojis as map icons
            const createEmojiIcon = (emoji: string) => {
                return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="24">${emoji}</text></svg>`);
            };

            // Center pin
            const searchMarker = new window.google.maps.Marker({
                position: center,
                map: mapObj.current,
                icon: createEmojiIcon("📍"),
                title: "Searched Location"
            });
            markersRef.current.push(searchMarker);

            // Hospitals
            newHosps.forEach(h => {
                const mk = new window.google.maps.Marker({
                    position: { lat: h.lat, lng: h.lng },
                    map: mapObj.current,
                    icon: createEmojiIcon("🏥"),
                    title: h.name
                });
                markersRef.current.push(mk);
            });

            // Ambulances (Emojis only)
            newAmbs.forEach(a => {
                const isAvailable = a.status === "Available";
                const mk = new window.google.maps.Marker({
                    position: { lat: a.lat, lng: a.lng },
                    map: mapObj.current,
                    icon: createEmojiIcon(isAvailable ? "🚑" : "🚐"),
                    title: a.id
                });
                
                if (isAvailable) {
                    mk.addListener("click", () => {
                        setSelectedAmbulance(a);
                        setAssignmentLocation("");
                    });
                }
                markersRef.current.push(mk);
            });
        }
    };

    const assignAmbulance = (ambId: string, locationStr?: string) => {
        setAmbulances(prev => prev.map(a => a.id === ambId ? { ...a, status: "Assigned" } : a));
        setAssigned(ambId);
        if (locationStr) {
            alert(`Ambulance ${ambId} has been successfully dispatched to: \n${locationStr}`);
        } else {
            alert(`Ambulance ${ambId} has been successfully dispatched to the location.`);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("gh_token");
        localStorage.removeItem("gh_role");
        setIsLoggedIn(false);
        setLoginName("");
        setPassword("");
        setLoginError("");
        setSearchQuery("");
        setSearchedCenter(null);
        setHospitals([]);
        setAmbulances([]);
        setAssigned(null);
    };

    if (!isLoggedIn) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBF5', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ background: '#fff', padding: '3rem', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.06)', maxWidth: '400px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '3rem', color: '#1E293B' }}>Operator <span style={{ color: '#E8571A' }}>Login</span></h1>
                        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Access the event & location control panel.</p>
                    </div>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
                            <input 
                                type="text" 
                                required 
                                value={loginName} 
                                onChange={(e) => setLoginName(e.target.value)}
                                placeholder="E.g. org"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontSize: '0.95rem' }} 
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontSize: '0.95rem' }} 
                            />
                        </div>
                        {loginError && <div style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 700 }}>{loginError}</div>}
                        <button type="submit" style={{ width: '100%', padding: '0.9rem', borderRadius: '8px', background: '#E8571A', color: '#fff', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(232,87,26,0.25)' }}>
                            Enter Dashboard
                        </button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Link href="/" style={{ padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', color: '#64748B', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="action-btn">
                            <span>🏠</span> Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', backgroundColor: '#FFFBF5', color: '#1E293B', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
                
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes fadeUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .slide-in-right {
                    animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                .fade-up {
                    animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .action-btn {
                    transition: all 0.2s ease;
                }
                .action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(232,87,26,0.2);
                }
            `}</style>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', zIndex: 10 }}>
                    <div>
                        <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '1.8rem', letterSpacing: '0.05em', color: '#1E293B', margin: 0 }}>
                            {loginName} <span style={{ color: '#E8571A' }}>• Control Room</span>
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '2px 0 0 0' }}>Search and assign emergency resources instantly.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                                type="text" 
                                placeholder="Search location..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '300px', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#1E293B', outline: 'none', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }} 
                            />
                            <button type="submit" className="action-btn" style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', background: '#E8571A', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}>
                                Locate
                            </button>
                        </form>
                        <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                        <Link href="/" style={{ textDecoration: 'none', color: '#64748B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}>
                            <span>🏠</span> Home
                        </Link>
                        <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#EF4444', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}>
                            Log Out
                        </button>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Map Section */}
                    <div style={{ flex: 2, position: 'relative' }}>
                        <div id="radar-map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                        {!searchedCenter && mapReady && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                                <div className="fade-up" style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '1.5rem 2.5rem', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B', fontSize: '1.2rem' }}>Awaiting Search</h3>
                                    <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#64748B' }}>Search a location to scan for nearby resources.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resources Sidebar */}
                    {searchedCenter && (
                        <aside className="slide-in-right" style={{ width: '420px', background: '#FFFFFF', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '-5px 0 20px rgba(0,0,0,0.02)', zIndex: 10 }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 5px 0', color: '#1E293B' }}>Location Scan Results</h2>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                                    LAT: {searchedCenter.lat.toFixed(4)} • LNG: {searchedCenter.lng.toFixed(4)}
                                </p>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                
                                {/* Ambulances Section */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.9rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: 0 }}>Nearby Ambulances</h3>
                                        <div style={{ background: '#F1F5F9', color: '#1E293B', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>{ambulances.length} FOUND</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {ambulances.map((amb, index) => (
                                            <div key={amb.id} className="fade-up" style={{ animationDelay: `${index * 0.05}s`, padding: '1.2rem', background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s ease', cursor: 'default' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <span style={{ fontWeight: 800, color: '#1E293B' }}>{amb.name}</span>
                                                        <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, 
                                                            background: amb.status === 'Available' ? 'rgba(16,185,129,0.1)' : amb.status === 'Assigned' ? 'rgba(59,130,246,0.1)' : 'rgba(232,87,26,0.1)', 
                                                            color: amb.status === 'Available' ? '#10B981' : amb.status === 'Assigned' ? '#3B82F6' : '#E8571A' 
                                                        }}>{amb.status}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{amb.id}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span>•</span> {amb.distance} away
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {amb.status === 'Available' && !assigned ? (
                                                    <button className="action-btn" onClick={() => { setSelectedAmbulance(amb); setAssignmentLocation(""); }} style={{ padding: '0.7rem 1.2rem', background: '#E8571A', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                                                        Assign
                                                    </button>
                                                ) : amb.id === assigned ? (
                                                    <span style={{ color: '#E8571A', fontSize: '0.85rem', fontWeight: 800 }}>✓ ASSIGNED</span>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Hospitals Section */}
                                <div style={{ paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.9rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: 0 }}>Nearby Hospitals</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {hospitals.map((hosp, index) => (
                                            <div key={hosp.id} className="fade-up" style={{ animationDelay: `${0.3 + (index * 0.05)}s`, padding: '1.2rem', background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: '14px' }}>
                                                <div style={{ fontWeight: 800, color: '#0369A1', fontSize: '1.05rem' }}>{hosp.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#0284C7', marginTop: '6px', fontWeight: 500 }}>Capacity: Available • Auto-alert Enabled</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>

                {/* Assignment Modal */}
                {selectedAmbulance && (
                    <div className="fade-up" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', width: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
                            <h2 style={{ margin: '0 0 10px 0', color: '#1E293B', fontSize: '1.4rem', fontWeight: 800 }}>Dispatch {selectedAmbulance.name}</h2>
                            <p style={{ margin: '0 0 20px 0', color: '#64748B', fontSize: '0.9rem' }}>Ambulance ID: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedAmbulance.id}</span></p>
                            
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enter Patient Location</label>
                            <input 
                                type="text" 
                                placeholder="E.g. 123 Main St, Near Central Park..." 
                                value={assignmentLocation}
                                onChange={(e) => setAssignmentLocation(e.target.value)}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', marginBottom: '1.5rem', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} 
                            />
                            
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => {
                                        if (assignmentLocation.trim() !== "") {
                                            assignAmbulance(selectedAmbulance.id, assignmentLocation);
                                            setSelectedAmbulance(null);
                                        } else {
                                            alert("Please enter a location to dispatch the ambulance.");
                                        }
                                    }} 
                                    className="action-btn"
                                    style={{ flex: 1, padding: '0.8rem', background: '#E8571A', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    Confirm Dispatch
                                </button>
                                <button 
                                    onClick={() => setSelectedAmbulance(null)} 
                                    style={{ padding: '0.8rem 1.2rem', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
