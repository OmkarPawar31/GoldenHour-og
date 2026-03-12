"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOperatorTracking, TrackedAmbulance } from "../../hooks/useOperatorTracking";

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
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

    // ─── Live Tracking State ───
    const tracking = useOperatorTracking();
    const [trackingView, setTrackingView] = useState(false);
    const trackingMarkerRef = useRef<google.maps.Marker | null>(null);
    const trackingRouteRef = useRef<google.maps.Polyline | null>(null);
    const trackingDestMarkerRef = useRef<google.maps.Marker | null>(null);
    const trackingPulseRef = useRef<google.maps.Circle | null>(null);

    // ─── 102 Call Center State ───
    const [show102Call, setShow102Call] = useState(false);
    const [activeCall, setActiveCall] = useState<any>(null);
    const [callState, setCallState] = useState<"receiving" | "location" | "assigning">("receiving");
    const [callerName, setCallerName] = useState("");
    const [callerPhone, setCallerPhone] = useState("");
    const [callDetails, setCallDetails] = useState("");
    const [patientLocation, setPatientLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [availableAmbulances, setAvailableAmbulances] = useState<any[]>([]);
    const [selectedAmbulanceForCall, setSelectedAmbulanceForCall] = useState<any | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // ─── Demo Mode State ───
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoAmbulances, setDemoAmbulances] = useState<any[]>([]);
    const demoMarkersRef = useRef<google.maps.Marker[]>([]);
    const demoAnimationRef = useRef<NodeJS.Timeout | null>(null);

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
            
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: mapObj.current,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: "#E8571A",
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                }
            });
        }
    }, [mapReady, isLoggedIn]);

    // ─── Live Tracking: Render ambulance marker, route line, dest marker on map ───
    const clearTrackingOverlays = useCallback(() => {
        trackingMarkerRef.current?.setMap(null);
        trackingMarkerRef.current = null;
        trackingRouteRef.current?.setMap(null);
        trackingRouteRef.current = null;
        trackingDestMarkerRef.current?.setMap(null);
        trackingDestMarkerRef.current = null;
        trackingPulseRef.current?.setMap(null);
        trackingPulseRef.current = null;
    }, []);

    useEffect(() => {
        if (!mapObj.current || !window.google || !tracking.trackedData || !trackingView) {
            clearTrackingOverlays();
            return;
        }

        const data = tracking.trackedData;
        const map = mapObj.current;

        const createEmojiIcon = (emoji: string, size = 36) => {
            return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size - 8}">${emoji}</text></svg>`
            );
        };

        // Ambulance marker
        if (!trackingMarkerRef.current) {
            trackingMarkerRef.current = new window.google.maps.Marker({
                position: { lat: data.lat, lng: data.lng },
                map,
                icon: {
                    url: createEmojiIcon("🚑", 40),
                    scaledSize: new window.google.maps.Size(40, 40),
                    anchor: new window.google.maps.Point(20, 20),
                },
                title: `Ambulance ${data.ambulanceId}`,
                zIndex: 100,
            });
        } else {
            trackingMarkerRef.current.setPosition({ lat: data.lat, lng: data.lng });
        }

        // Pulse circle around ambulance
        if (!trackingPulseRef.current) {
            trackingPulseRef.current = new window.google.maps.Circle({
                center: { lat: data.lat, lng: data.lng },
                radius: 120,
                map,
                fillColor: "#E8571A",
                fillOpacity: 0.08,
                strokeColor: "#E8571A",
                strokeOpacity: 0.3,
                strokeWeight: 1.5,
                zIndex: 90,
            });
        } else {
            trackingPulseRef.current.setCenter({ lat: data.lat, lng: data.lng });
        }

        // Route polyline
        if (data.routePoints && data.routePoints.length > 1) {
            if (!trackingRouteRef.current) {
                trackingRouteRef.current = new window.google.maps.Polyline({
                    path: data.routePoints,
                    map,
                    strokeColor: "#E8571A",
                    strokeWeight: 4,
                    strokeOpacity: 0.7,
                    zIndex: 80,
                    icons: [{
                        icon: { path: window.google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 2 },
                        offset: "50%",
                    }],
                });
            } else {
                trackingRouteRef.current.setPath(data.routePoints);
            }
        }

        // Destination marker
        if (data.destination) {
            if (!trackingDestMarkerRef.current) {
                trackingDestMarkerRef.current = new window.google.maps.Marker({
                    position: { lat: data.destination.lat, lng: data.destination.lng },
                    map,
                    icon: {
                        url: createEmojiIcon("🏥", 36),
                        scaledSize: new window.google.maps.Size(36, 36),
                        anchor: new window.google.maps.Point(18, 18),
                    },
                    title: data.destination.name,
                    zIndex: 95,
                });
            } else {
                trackingDestMarkerRef.current.setPosition({ lat: data.destination.lat, lng: data.destination.lng });
            }
        }

        // Pan map to ambulance
        map.panTo({ lat: data.lat, lng: data.lng });
        if (map.getZoom()! < 14) map.setZoom(15);

    }, [tracking.trackedData, trackingView, clearTrackingOverlays]);

    // When tracking view is turned off, clear overlays
    useEffect(() => {
        if (!trackingView) {
            clearTrackingOverlays();
        }
    }, [trackingView, clearTrackingOverlays]);

    // Draw route from selected ambulance to patient
    useEffect(() => {
        if (selectedAmbulance && searchedCenter && window.google && directionsRendererRef.current) {
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route(
                {
                    origin: { lat: selectedAmbulance.lat, lng: selectedAmbulance.lng },
                    destination: searchedCenter,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRendererRef.current?.setDirections(result);
                    } else {
                        console.error("Directions request failed due to " + status);
                    }
                }
            );
        } else if (!selectedAmbulance && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections({ routes: [] } as any);
        }
    }, [selectedAmbulance, searchedCenter]);

    const handleTrackAmbulance = (ambulanceId: string) => {
        tracking.trackAmbulance(ambulanceId);
        setTrackingView(true);

        // Clear mock data view
        setSearchedCenter(null);
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        setHospitals([]);
        setAmbulances([]);
        setAssigned(null);
        setSelectedAmbulance(null);
    };

    const handleStopTracking = () => {
        tracking.stopTracking();
        setTrackingView(false);
        clearTrackingOverlays();
    };

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

    const handleDemoMode = () => {
        setIsLoggedIn(true);
        setIsDemoMode(true);
        initializeDemoAmbulances();
    };

    const initializeDemoAmbulances = () => {
        const dummyAmbulances = [
            {
                _id: "demo_amb_001",
                ambulanceId: "AMB-001",
                vehicleNumber: "MH-02-AB-1001",
                driverName: "Rajesh Kumar",
                contactNumber: "9876543210",
                status: "available",
                lat: 18.5195,
                lng: 73.8567,
                currentLocation: "Camp, Pune",
                targetLat: 18.5350,
                targetLng: 73.8750,
                speed: 0.0008
            },
            {
                _id: "demo_amb_002",
                ambulanceId: "AMB-002",
                vehicleNumber: "MH-02-AB-1002",
                driverName: "Priya Sharma",
                contactNumber: "9876543211",
                status: "available",
                lat: 18.5220,
                lng: 73.8595,
                currentLocation: "Model Colony, Pune",
                targetLat: 18.5100,
                targetLng: 73.8400,
                speed: 0.0007
            },
            {
                _id: "demo_amb_003",
                ambulanceId: "AMB-003",
                vehicleNumber: "MH-02-AB-1003",
                driverName: "Amit Singh",
                contactNumber: "9876543212",
                status: "available",
                lat: 18.5240,
                lng: 73.8545,
                currentLocation: "Kalas, Pune",
                targetLat: 18.5500,
                targetLng: 73.8600,
                speed: 0.00075
            },
            {
                _id: "demo_amb_004",
                ambulanceId: "AMB-004",
                vehicleNumber: "MH-02-AB-1004",
                driverName: "Neha Patel",
                contactNumber: "9876543213",
                status: "available",
                lat: 18.5180,
                lng: 73.8580,
                currentLocation: "Shaniwar Wada, Pune",
                targetLat: 18.5250,
                targetLng: 73.8800,
                speed: 0.00085
            },
            {
                _id: "demo_amb_005",
                ambulanceId: "AMB-005",
                vehicleNumber: "MH-02-AB-1005",
                driverName: "Vikram Desai",
                contactNumber: "9876543214",
                status: "available",
                lat: 18.5260,
                lng: 73.8600,
                currentLocation: "Viman Nagar, Pune",
                targetLat: 18.5150,
                targetLng: 73.8650,
                speed: 0.00076
            }
        ];
        setDemoAmbulances(dummyAmbulances);
    };

    useEffect(() => {
        if (!isDemoMode || !mapObj.current) return;

        // Clear previous markers
        demoMarkersRef.current.forEach(m => m.setMap(null));
        demoMarkersRef.current = [];

        // Create markers for demo ambulances
        const createEmojiIcon = (emoji: string, size = 40) => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d")!;
            ctx.font = `${size * 0.8}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emoji, size / 2, size / 2);
            return canvas.toDataURL();
        };

        demoAmbulances.forEach(amb => {
            const marker = new window.google.maps.Marker({
                position: { lat: amb.lat, lng: amb.lng },
                map: mapObj.current,
                icon: {
                    url: createEmojiIcon("🚑"),
                    scaledSize: new window.google.maps.Size(40, 40),
                    anchor: new window.google.maps.Point(20, 20),
                },
                title: `${amb.ambulanceId} - ${amb.driverName}`,
                zIndex: 100,
            });
            demoMarkersRef.current.push(marker);
        });

        // Animate ambulances
        if (demoAnimationRef.current) clearInterval(demoAnimationRef.current);

        demoAnimationRef.current = setInterval(() => {
            setDemoAmbulances(prev => prev.map((amb, idx) => {
                const marker = demoMarkersRef.current[idx];
                if (!marker) return amb;

                let newLat = amb.lat;
                let newLng = amb.lng;

                // Calculate direction to target
                const latDiff = amb.targetLat - amb.lat;
                const lngDiff = amb.targetLng - amb.lng;
                const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

                if (distance > 0.001) {
                    const latStep = (latDiff / distance) * amb.speed;
                    const lngStep = (lngDiff / distance) * amb.speed;
                    newLat = amb.lat + latStep;
                    newLng = amb.lng + lngStep;
                } else {
                    // Reached target, pick new random target
                    newLat = amb.lat;
                    newLng = amb.lng;
                    amb.targetLat = 18.5 + Math.random() * 0.1;
                    amb.targetLng = 73.8 + Math.random() * 0.1;
                }

                marker.setPosition({ lat: newLat, lng: newLng });

                return { ...amb, lat: newLat, lng: newLng };
            }));
        }, 100);

        return () => {
            if (demoAnimationRef.current) clearInterval(demoAnimationRef.current);
        };
    }, [isDemoMode, demoAmbulances.length, mapObj.current]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        
        // Exit tracking view if active
        if (trackingView) handleStopTracking();

        const baseLat = 18.8933;
        const baseLng = 73.1768;

        const newCenter = { 
            lat: baseLat + (Math.random() * 0.02 - 0.01), 
            lng: baseLng + (Math.random() * 0.02 - 0.01) 
        };
        setSearchedCenter(newCenter);
        setAssigned(null);
        setSelectedAmbulance(null);

        if (mapObj.current) {
            mapObj.current.panTo(newCenter);
            mapObj.current.setZoom(15);
        }
        
        generateNearby(newCenter);
    };

    const generateNearby = (center: any) => {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
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
                status: i % 3 === 0 ? "Busy" : "Available",
                lat, lng,
                rawDistance: distKm,
                distance: distDisplay
            };
        });

        newAmbs.sort((a, b) => a.rawDistance - b.rawDistance);

        setHospitals(newHosps);
        setAmbulances(newAmbs);

        if (mapObj.current && window.google) {
            const createEmojiIcon = (emoji: string) => {
                return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="24">${emoji}</text></svg>`);
            };

            const searchMarker = new window.google.maps.Marker({
                position: center,
                map: mapObj.current,
                icon: createEmojiIcon("👤"),
                title: "Patient Location"
            });
            markersRef.current.push(searchMarker);

            newHosps.forEach(h => {
                const mk = new window.google.maps.Marker({
                    position: { lat: h.lat, lng: h.lng },
                    map: mapObj.current,
                    icon: createEmojiIcon("🏥"),
                    title: h.name
                });
                markersRef.current.push(mk);
            });

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

    // ─── 102 Call Handlers ───
    const showToast = (msg: string, type: "success" | "error") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handle102CallReceived = () => {
        setCallState("location");
        setActiveCall({
            id: `CALL-${Date.now()}`,
            receivedAt: new Date(),
            callerName,
            callerPhone,
            callDetails,
        });
    };

    const handleCapturePatientLocation = async () => {
        if (!navigator.geolocation) {
            showToast("Geolocation not supported", "error");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setPatientLocation({ lat: latitude, lng: longitude });
                showToast("✓ Patient location captured", "success");
                setCallState("assigning");
                fetchAvailableAmbulances();
            },
            (error) => {
                console.error("Geolocation error:", error);
                showToast("Could not get location. Please check permissions.", "error");
            }
        );
    };

    const fetchAvailableAmbulances = async () => {
        try {
            const token = localStorage.getItem("gh_token");
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            
            const res = await fetch(`${API_BASE}/vehicles?status=available`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setAvailableAmbulances(data.vehicles || []);
        } catch (error) {
            console.error("Failed to fetch ambulances:", error);
            // Use dummy ambulances for testing
            const dummyAmbulances = [
                {
                    _id: "amb_001",
                    ambulanceId: "AMB-001",
                    vehicleNumber: "MH-02-AB-1001",
                    driverName: "Rajesh Kumar",
                    contactNumber: "9876543210",
                    status: "available",
                    lat: 18.5195,
                    lng: 73.8567,
                    currentLocation: "Camp, Pune"
                },
                {
                    _id: "amb_002",
                    ambulanceId: "AMB-002",
                    vehicleNumber: "MH-02-AB-1002",
                    driverName: "Priya Sharma",
                    contactNumber: "9876543211",
                    status: "available",
                    lat: 18.5220,
                    lng: 73.8595,
                    currentLocation: "Model Colony, Pune"
                },
                {
                    _id: "amb_003",
                    ambulanceId: "AMB-003",
                    vehicleNumber: "MH-02-AB-1003",
                    driverName: "Amit Singh",
                    contactNumber: "9876543212",
                    status: "available",
                    lat: 18.5240,
                    lng: 73.8545,
                    currentLocation: "Kalas, Pune"
                },
                {
                    _id: "amb_004",
                    ambulanceId: "AMB-004",
                    vehicleNumber: "MH-02-AB-1004",
                    driverName: "Neha Patel",
                    contactNumber: "9876543213",
                    status: "available",
                    lat: 18.5180,
                    lng: 73.8580,
                    currentLocation: "Shaniwar Wada, Pune"
                },
                {
                    _id: "amb_005",
                    ambulanceId: "AMB-005",
                    vehicleNumber: "MH-02-AB-1005",
                    driverName: "Vikram Desai",
                    contactNumber: "9876543214",
                    status: "available",
                    lat: 18.5260,
                    lng: 73.8600,
                    currentLocation: "Viman Nagar, Pune"
                }
            ];
            setAvailableAmbulances(dummyAmbulances);
            showToast("⚠️ Using test ambulances (API unavailable)", "error");
        }
    };

    const handleAssignAmbulanceToPatient = async () => {
        if (!selectedAmbulanceForCall || !patientLocation) {
            showToast("Please select an ambulance", "error");
            return;
        }

        setIsAssigning(true);
        try {
            const token = localStorage.getItem("gh_token");
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            
            // Create emergency via 102 call
            const emergencyRes = await fetch(`${API_BASE}/emergency/102-call`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    callerPhone: callerPhone,
                    callerName: callerName,
                    callerLocation: patientLocation,
                    details: callDetails,
                    priority: "critical",
                })
            });

            if (!emergencyRes.ok) {
                const errData = await emergencyRes.json();
                throw new Error(errData.message || "Failed to create emergency");
            }
            const emergencyData = await emergencyRes.json();
            const session = emergencyData.session;

            // Assign ambulance to emergency
            const assignRes = await fetch(`${API_BASE}/emergency/${session._id}/assign-ambulance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    vehicleId: selectedAmbulanceForCall._id || selectedAmbulanceForCall.id,
                })
            });

            if (!assignRes.ok) {
                const errData = await assignRes.json();
                throw new Error(errData.message || "Failed to assign ambulance");
            }

            showToast(`✓ Ambulance AMB-${selectedAmbulanceForCall.ambulanceId} assigned to ${callerName}`, "success");
            resetCallState();
        } catch (error) {
            console.error("Assignment error:", error);
            showToast(`Error: ${error instanceof Error ? error.message : "Failed to assign ambulance"}`, "error");
        } finally {
            setIsAssigning(false);
        }
    };

    const resetCallState = () => {
        setShow102Call(false);
        setCallState("receiving");
        setCallerName("");
        setCallerPhone("");
        setCallDetails("");
        setPatientLocation(null);
        setSelectedAmbulanceForCall(null);
        setActiveCall(null);
    };

    const handleLogout = () => {
        localStorage.removeItem("gh_token");
        localStorage.removeItem("gh_role");
        setIsLoggedIn(false);
        setIsDemoMode(false);
        setLoginName("");
        setPassword("");
        setLoginError("");
        setSearchQuery("");
        setSearchedCenter(null);
        setDemoAmbulances([]);
        demoMarkersRef.current.forEach(m => m.setMap(null));
        demoMarkersRef.current = [];
        if (demoAnimationRef.current) clearInterval(demoAnimationRef.current);
        setHospitals([]);
        setAmbulances([]);
        setAssigned(null);
        setTrackingView(false);
        tracking.stopTracking();
        clearTrackingOverlays();
    };

    // ─── Helper: Format distance / time ───
    const formatDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
    const formatTime = (mins: number) => {
        if (mins < 1) return "< 1 min";
        const mm = Math.floor(mins);
        const ss = Math.round((mins - mm) * 60);
        return `${mm}m ${ss.toString().padStart(2, "0")}s`;
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
                        <button onClick={handleDemoMode} style={{ padding: '0.8rem', borderRadius: '8px', background: '#3B82F6', color: '#fff', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span>🎬</span> View Demo
                        </button>
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

                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(232,87,26,0.4); }
                    70% { box-shadow: 0 0 0 12px rgba(232,87,26,0); }
                    100% { box-shadow: 0 0 0 0 rgba(232,87,26,0); }
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
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

                .live-dot {
                    animation: blink 1s ease-in-out infinite;
                }

                .pulse-badge {
                    animation: pulse-ring 2s infinite;
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
                        {/* Live Ambulances Count Badge */}
                        {tracking.activeAmbulances.length > 0 && (
                            <div className="pulse-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(232,87,26,0.08)', border: '1.5px solid rgba(232,87,26,0.2)', cursor: 'pointer' }}
                                onClick={() => {
                                    if (trackingView) {
                                        handleStopTracking();
                                    }
                                }}
                            >
                                <div className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8571A' }} />
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#E8571A', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {tracking.activeAmbulances.length} LIVE
                                </span>
                            </div>
                        )}

                        {/* Connection indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: tracking.isConnected ? '#10B981' : '#EF4444' }} />
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                                {tracking.isConnected ? 'SYNC' : 'OFFLINE'}
                            </span>
                        </div>

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
                        <button 
                            onClick={() => {
                                setShow102Call(true);
                                setCallState("receiving");
                            }}
                            style={{ background: 'rgba(232,87,26,0.1)', border: '1.5px solid #E8571A', color: '#E8571A', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}
                        >
                            <span>📞</span> 108 Call
                        </button>
                        <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                        {isDemoMode && (
                            <>
                                <button 
                                    onClick={handleLogout}
                                    style={{ background: 'rgba(59,182,246,0.1)', border: '1.5px solid #3B82F6', color: '#3B82F6', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    <span>🎬</span> Exit Demo
                                </button>
                                <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                            </>
                        )}
                        
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
                        
                        {/* Tracking HUD overlay on map */}
                        {trackingView && tracking.trackedData && (
                            <div className="fade-up" style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', padding: '16px 20px', borderRadius: '14px', border: '1.5px solid rgba(232,87,26,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 20, minWidth: '280px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="live-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#E8571A' }}>
                                            TRACKING: {tracking.trackedData.ambulanceId}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={handleStopTracking}
                                        style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', color: '#64748B' }}
                                    >
                                        ✕ CLOSE
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>ETA</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>
                                            {formatTime(tracking.trackedData.eta)}
                                        </div>
                                    </div>
                                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3B82F6', marginTop: '2px' }}>
                                            {formatDist(tracking.trackedData.remainingM)}
                                        </div>
                                    </div>
                                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speed</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                                            {tracking.trackedData.speed} <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>km/h</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Progress</span>
                                        <span style={{ fontSize: '0.65rem', color: '#E8571A', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(tracking.trackedData.progressPercent)}%</span>
                                    </div>
                                    <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${tracking.trackedData.progressPercent}%`, background: 'linear-gradient(90deg, #E8571A, #F97316)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>

                                {/* Leg info */}
                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B' }}>
                                        {tracking.trackedData.currentLeg === 'depot-to-patient' ? '🚑 → 👤 En route to patient' : 
                                         tracking.trackedData.currentLeg === 'patient-to-hospital' ? '👤 → 🏥 Transporting to hospital' : 
                                         '⏸ Idle'}
                                    </span>
                                </div>
                                {tracking.trackedData.destination && (
                                    <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                                        Dest: {tracking.trackedData.destination.name}
                                    </div>
                                )}
                            </div>
                        )}

                        {!searchedCenter && !trackingView && mapReady && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                                <div className="fade-up" style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '1.5rem 2.5rem', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B', fontSize: '1.2rem' }}>Awaiting Search</h3>
                                    <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#64748B' }}>
                                        {tracking.activeAmbulances.length > 0 
                                            ? `${tracking.activeAmbulances.length} live ambulance(s) detected — select from sidebar to track.`
                                            : 'Search a location to scan for nearby resources.'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <aside className="slide-in-right" style={{ width: '420px', background: '#FFFFFF', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '-5px 0 20px rgba(0,0,0,0.02)', zIndex: 10 }}>
                        
                        {/* ─── Tab Bar: Search Results vs Live Tracking ─── */}
                        <div style={{ display: 'flex', borderBottom: '1.5px solid #E2E8F0' }}>
                            <button 
                                onClick={() => setTrackingView(false)}
                                style={{ 
                                    flex: 1, padding: '14px', border: 'none', background: !trackingView ? '#FFFBF5' : '#fff', 
                                    fontWeight: 800, fontSize: '0.78rem', color: !trackingView ? '#E8571A' : '#94A3B8', cursor: 'pointer',
                                    borderBottom: !trackingView ? '2px solid #E8571A' : '2px solid transparent',
                                    fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📍 Search
                            </button>
                            <button 
                                onClick={() => setTrackingView(true)}
                                style={{ 
                                    flex: 1, padding: '14px', border: 'none', background: trackingView ? '#FFFBF5' : '#fff', 
                                    fontWeight: 800, fontSize: '0.78rem', color: trackingView ? '#E8571A' : '#94A3B8', cursor: 'pointer',
                                    borderBottom: trackingView ? '2px solid #E8571A' : '2px solid transparent',
                                    fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em',
                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                🚑 Live Track
                                {tracking.activeAmbulances.length > 0 && (
                                    <span style={{ 
                                        background: '#E8571A', color: '#fff', borderRadius: '10px', padding: '2px 8px', 
                                        fontSize: '0.65rem', fontWeight: 800, minWidth: '18px', textAlign: 'center' 
                                    }}>
                                        {tracking.activeAmbulances.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            
                            {/* ─── TRACKING VIEW ─── */}
                            {trackingView && (
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <h3 style={{ fontSize: '0.9rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: 0 }}>
                                            Active Ambulances
                                        </h3>
                                        <button 
                                            onClick={tracking.refreshList}
                                            style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', color: '#64748B' }}
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>

                                    {tracking.activeAmbulances.length === 0 ? (
                                        <div className="fade-up" style={{ padding: '2.5rem 1.5rem', background: '#F8FAFC', borderRadius: '14px', border: '1.5px dashed #E2E8F0', textAlign: 'center' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📡</div>
                                            <h4 style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#1E293B', fontSize: '1rem' }}>No Active Ambulances</h4>
                                            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                                Waiting for ambulance units to activate an emergency. They will appear here in real time.
                                            </p>
                                        </div>
                                    ) : (
                                        tracking.activeAmbulances.map((amb, index) => (
                                            <div 
                                                key={amb.ambulanceId} 
                                                className="fade-up action-btn"
                                                onClick={() => handleTrackAmbulance(amb.ambulanceId)}
                                                style={{ 
                                                    animationDelay: `${index * 0.06}s`,
                                                    padding: '16px', 
                                                    background: tracking.trackedAmbulanceId === amb.ambulanceId ? 'rgba(232,87,26,0.04)' : '#FFFFFF', 
                                                    border: tracking.trackedAmbulanceId === amb.ambulanceId ? '1.5px solid rgba(232,87,26,0.3)' : '1.5px solid #E2E8F0', 
                                                    borderRadius: '14px', 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.25s ease',
                                                    boxShadow: tracking.trackedAmbulanceId === amb.ambulanceId ? '0 4px 16px rgba(232,87,26,0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                                                }}
                                            >
                                                {/* Top row: Icon, Name, Status */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ 
                                                            width: '36px', height: '36px', borderRadius: '10px', 
                                                            background: 'rgba(232,87,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '1.2rem'
                                                        }}>🚑</div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>{amb.ambulanceId}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                {amb.currentLeg === 'depot-to-patient' ? 'To Patient' : 
                                                                 amb.currentLeg === 'patient-to-hospital' ? 'To Hospital' : 'Idle'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <div className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Active</span>
                                                    </div>
                                                </div>

                                                {/* Stats row */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.6rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ETA</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F59E0B' }}>{formatTime(amb.eta)}</div>
                                                    </div>
                                                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.6rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dist</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3B82F6' }}>{formatDist(amb.remainingM)}</div>
                                                    </div>
                                                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.6rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Speed</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>{amb.speed}</div>
                                                    </div>
                                                </div>

                                                {/* Progress */}
                                                <div style={{ marginTop: '10px' }}>
                                                    <div style={{ height: '4px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${amb.progressPercent}%`, background: 'linear-gradient(90deg, #E8571A, #F97316)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                                        <span style={{ fontSize: '0.6rem', color: '#94A3B8' }}>{Math.round(amb.progressPercent)}%</span>
                                                        {amb.destination && (
                                                            <span style={{ fontSize: '0.6rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>→ {amb.destination.name}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Track button */}
                                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <div style={{ 
                                                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800,
                                                        background: tracking.trackedAmbulanceId === amb.ambulanceId ? '#E8571A' : '#F1F5F9',
                                                        color: tracking.trackedAmbulanceId === amb.ambulanceId ? '#fff' : '#64748B',
                                                    }}>
                                                        {tracking.trackedAmbulanceId === amb.ambulanceId ? '📡 Tracking Live' : '🔍 Click to Track'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* ─── SEARCH RESULTS VIEW ─── */}
                            {!trackingView && (
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {searchedCenter ? (
                                        <>
                                            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px' }}>
                                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                                                    LAT: {searchedCenter.lat.toFixed(4)} • LNG: {searchedCenter.lng.toFixed(4)}
                                                </p>
                                            </div>

                                            {/* Ambulances Section */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <h3 style={{ fontSize: '0.9rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: 0 }}>
                                                        {isDemoMode ? '🎬 Demo Ambulances' : 'Nearby Ambulances'}
                                                    </h3>
                                                    <div style={{ background: '#F1F5F9', color: '#1E293B', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
                                                        {(isDemoMode ? demoAmbulances : ambulances).length} FOUND
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {(isDemoMode ? demoAmbulances : ambulances).map((amb, index) => (
                                                        <div key={amb._id || amb.id} className="fade-up" style={{ animationDelay: `${index * 0.05}s`, padding: '1.2rem', background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s ease', cursor: 'default' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                                    <span style={{ fontWeight: 800, color: '#1E293B' }}>
                                                                        {isDemoMode ? amb.ambulanceId : amb.name}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, 
                                                                        background: amb.status === 'Available' || amb.status === 'available' ? 'rgba(16,185,129,0.1)' : amb.status === 'Assigned' ? 'rgba(59,130,246,0.1)' : 'rgba(232,87,26,0.1)', 
                                                                        color: amb.status === 'Available' || amb.status === 'available' ? '#10B981' : amb.status === 'Assigned' ? '#3B82F6' : '#E8571A' 
                                                                    }}>
                                                                        {isDemoMode ? amb.status : amb.status}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                        {isDemoMode ? amb.vehicleNumber : amb.id}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span>•</span> {isDemoMode ? amb.currentLocation : amb.distance}
                                                                    </div>
                                                                </div>
                                                                {isDemoMode && <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px' }}>{amb.driverName}</div>}
                                                            </div>
                                                            
                                                            {!isDemoMode && amb.status === 'Available' && !assigned ? (
                                                                <button className="action-btn" onClick={() => { setSelectedAmbulance(amb); setAssignmentLocation(""); }} style={{ padding: '0.7rem 1.2rem', background: '#E8571A', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                                                                    Assign
                                                                </button>
                                                            ) : !isDemoMode && amb.id === assigned ? (
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
                                        </>
                                    ) : (
                                        <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
                                            <h4 style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#1E293B' }}>Search for Resources</h4>
                                            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem' }}>Enter a location above to find nearby hospitals and ambulances.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>
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

                {/* 102 Call Modal */}
                {show102Call && (
                    <div className="fade-up" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', width: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: '1.5px solid #E2E8F0' }}>
                            
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, color: '#E8571A', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📞 102 Emergency Call
                                </h2>
                                <button 
                                    onClick={resetCallState}
                                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Step Indicator */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                                {['receiving', 'location', 'assigning'].map((step, idx) => (
                                    <div key={step} style={{ flex: 1, height: '4px', borderRadius: '4px', background: (['receiving', 'location', 'assigning'].indexOf(callState) >= idx) ? '#E8571A' : '#E2E8F0', transition: 'all 0.3s' }} />
                                ))}
                            </div>

                            {/* Step 1: Call Receiving */}
                            {callState === "receiving" && (
                                <>
                                    <p style={{ margin: '0 0 1.2rem 0', color: '#64748B', fontSize: '0.95rem' }}>Enter caller information below:</p>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Caller Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. John Doe"
                                                value={callerName}
                                                onChange={(e) => setCallerName(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none' }} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Caller Phone</label>
                                            <input 
                                                type="tel" 
                                                placeholder="+91 9876543210"
                                                value={callerPhone}
                                                onChange={(e) => setCallerPhone(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none' }} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Emergency Details</label>
                                            <textarea 
                                                placeholder="e.g. Patient has chest pain, difficulty breathing, conscious..."
                                                value={callDetails}
                                                onChange={(e) => setCallDetails(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontFamily: "'DM Sans', sans-serif", minHeight: '80px', resize: 'none' }} 
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handle102CallReceived}
                                        disabled={!callerName || !callerPhone}
                                        style={{ 
                                            width: '100%', padding: '0.9rem', background: callerName && callerPhone ? '#E8571A' : '#CBD5E1', 
                                            color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: callerName && callerPhone ? 'pointer' : 'not-allowed',
                                            fontFamily: "'DM Sans', sans-serif"
                                        }}
                                    >
                                        Next: Capture Location
                                    </button>
                                </>
                            )}

                            {/* Step 2: Location Capture */}
                            {callState === "location" && (
                                <>
                                    <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                                        <p style={{ margin: 0, color: '#E8571A', fontWeight: 700, fontSize: '0.95rem' }}>
                                            📍 Caller: <strong>{callerName}</strong> ({callerPhone})
                                        </p>
                                    </div>

                                    <p style={{ margin: '0 0 1.2rem 0', color: '#64748B', fontSize: '0.95rem' }}>
                                        Click below to capture the patient's location using GPS:
                                    </p>

                                    {patientLocation && (
                                        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                                            <p style={{ margin: '0 0 6px 0', color: '#10B981', fontWeight: 700, fontSize: '0.85rem' }}>✓ Location Captured</p>
                                            <p style={{ margin: 0, color: '#10B981', fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}>
                                                Lat: {patientLocation.lat.toFixed(4)} | Lng: {patientLocation.lng.toFixed(4)}
                                            </p>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleCapturePatientLocation}
                                        style={{ 
                                            width: '100%', padding: '1rem', marginBottom: '1rem', 
                                            background: patientLocation ? '#D1FAE5' : '#E8571A', 
                                            color: patientLocation ? '#059669' : '#fff', 
                                            border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                                            fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem'
                                        }}
                                    >
                                        {patientLocation ? '✓ Location Captured' : '📍 Capture GPS Location'}
                                    </button>

                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button 
                                            onClick={() => setCallState("receiving")}
                                            style={{ flex: 1, padding: '0.75rem', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            Back
                                        </button>
                                        <button 
                                            onClick={() => patientLocation && setCallState("assigning")}
                                            disabled={!patientLocation}
                                            style={{ 
                                                flex: 1, padding: '0.75rem', background: patientLocation ? '#E8571A' : '#CBD5E1', 
                                                color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: patientLocation ? 'pointer' : 'not-allowed',
                                                fontFamily: "'DM Sans', sans-serif"
                                            }}
                                        >
                                            Next: Assign Ambulance
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 3: Ambulance Assignment */}
                            {callState === "assigning" && (
                                <>
                                    <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                                        <p style={{ margin: '0 0 4px 0', color: '#E8571A', fontWeight: 700, fontSize: '0.9rem' }}>
                                            📍 {callerName}
                                        </p>
                                        <p style={{ margin: 0, color: '#E8571A', fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}>
                                            {patientLocation?.lat.toFixed(4)}, {patientLocation?.lng.toFixed(4)}
                                        </p>
                                    </div>

                                    <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                                        Select Available Ambulance
                                    </label>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                        {availableAmbulances.length > 0 ? (
                                            availableAmbulances.map((amb) => (
                                                <div 
                                                    key={amb._id || amb.id}
                                                    onClick={() => setSelectedAmbulanceForCall(amb)}
                                                    style={{
                                                        padding: '1rem',
                                                        border: selectedAmbulanceForCall?._id === amb._id || selectedAmbulanceForCall?.id === amb.id ? '2px solid #E8571A' : '1.5px solid #E2E8F0',
                                                        borderRadius: '10px',
                                                        background: selectedAmbulanceForCall?._id === amb._id || selectedAmbulanceForCall?.id === amb.id ? '#FFF7ED' : '#FFFFFF',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>
                                                                🚑 {amb.plateNumber || amb.id}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                                                                ID: {amb._id?.toString().slice(-6) || amb.id}
                                                            </div>
                                                        </div>
                                                        {(selectedAmbulanceForCall?._id === amb._id || selectedAmbulanceForCall?.id === amb.id) && (
                                                            <span style={{ color: '#E8571A', fontWeight: 700 }}>✓</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', color: '#94A3B8' }}>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>No available ambulances at the moment</p>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button 
                                            onClick={() => setCallState("location")}
                                            style={{ flex: 1, padding: '0.75rem', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            Back
                                        </button>
                                        <button 
                                            onClick={handleAssignAmbulanceToPatient}
                                            disabled={!selectedAmbulanceForCall || isAssigning}
                                            style={{ 
                                                flex: 1, padding: '0.75rem', 
                                                background: selectedAmbulanceForCall && !isAssigning ? '#10B981' : '#CBD5E1', 
                                                color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, 
                                                cursor: selectedAmbulanceForCall && !isAssigning ? 'pointer' : 'not-allowed',
                                                fontFamily: "'DM Sans', sans-serif"
                                            }}
                                        >
                                            {isAssigning ? '⏳ Assigning...' : '✓ Assign Ambulance'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {toast && (
                    <div style={{ 
                        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
                        background: '#fff', border: `1px solid ${toast.type === 'success' ? '#D1FAE5' : '#FECACA'}`, 
                        borderLeft: `4px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
                        padding: '1rem 1.4rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'fadeUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both'
                    }}>
                        {toast.msg}
                    </div>
                )}

            </main>
        </div>
    );
}
