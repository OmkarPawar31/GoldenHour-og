"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface Ambulance {
    id: string;
    name: string;
    status: "Available" | "En Route" | "On Scene" | "Busy" | string;
    location?: { lat: number; lng: number };
    speed: number;
    lastUpdate: string;
    patient?: string;
    hasPatient?: boolean;
    driver?: { name: string; phone: string; email: string };
}

interface Emergency {
    id: string;
    patientName: string;
    priority: "Critical" | "High" | "Medium" | "Low" | string;
    location: string;
    carNumber: string;
    status: "Pending" | "Assigned" | "Completed" | string;
    assignedAmbulance?: string;
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const HOSPITAL_LOCATION = { lat: 18.5314, lng: 73.8446 };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#f8f4ee" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#fffbf5" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fde68a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
];

export default function HospitalDashboard() {
    const [beds, setBeds] = useState(12);
    const [bedInput, setBedInput] = useState("12");
    const [isOpen, setIsOpen] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [mapExpanded, setMapExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<"fleet" | "requests">("fleet");
    const [trackingMode, setTrackingMode] = useState<"all" | "emergency">("all");
    const [time, setTime] = useState(new Date());
    const [hospName, setHospName] = useState("Golden Hour Civil Hospital");
    const [showSettings, setShowSettings] = useState(false);
    const [showAddAmbulance, setShowAddAmbulance] = useState(false);
    const [newAmbData, setNewAmbData] = useState({ plateNumber: "", driverName: "", driverPhone: "", driverEmail: "", driverPassword: "" });
    const [isSubmittingAmb, setIsSubmittingAmb] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [arrivalAlert, setArrivalAlert] = useState<Ambulance | null>(null);
    const router = useRouter();

    const [fleet, setFleet] = useState<Ambulance[]>([]);

    const [requests, setRequests] = useState<Emergency[]>([]);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Record<string, google.maps.Marker>>({});
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const fetchFleet = async () => {
            const token = localStorage.getItem("gh_token");
            try {
                const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                // Fetch fleet
                const resFleet = await fetch(`${url}/hospital/fleet`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataFleet = await resFleet.json();
                if (dataFleet.fleet) {
                    setFleet((prevFleet) => {
                        return dataFleet.fleet.map((v: any) => {
                           const p = prevFleet.find((pf: Ambulance) => pf.id === v.id);
                           return {
                               id: v.id,
                               name: v.plateNumber || v.id,
                               status: v.status === "en-route" ? "En Route" : v.status === "available" ? "Available" : "Busy",
                               location: p?.location || v.location,
                               speed: p?.speed || 0,
                               lastUpdate: "Just now",
                               patient: v.session?.patientName,
                               hasPatient: v.hasPatient,
                               driver: v.driver,
                           };
                        });
                    });
                }
                
                // Fetch requests
                const resReqs = await fetch(`${url}/hospital/requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataReqs = await resReqs.json();
                if (dataReqs.requests) {
                    setRequests(dataReqs.requests);
                }
            } catch (err) { console.error("Could not fetch dashboard logic", err); }
        };
        fetchFleet();
        const interval = setInterval(fetchFleet, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fleet.forEach(amb => {
            const marker = markersRef.current[amb.id];
            if (marker) {
                const shouldShow = trackingMode === "all" || (trackingMode === "emergency" && !!amb.hasPatient);
                marker.setVisible(shouldShow);
            }
        });
    }, [trackingMode, fleet]);

    const handleLogout = () => {
        localStorage.removeItem("gh_token");
        localStorage.removeItem("gh_user");
        localStorage.removeItem("gh_role");
        router.push("/auth");
    };

    useEffect(() => {
        if (window.google?.maps) { setMapReady(true); return; }
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=geometry,places`;
        s.async = true;
        s.onload = () => setMapReady(true);
        document.head.appendChild(s);
    }, []);

    useEffect(() => {
        if (!mapReady || !mapRef.current || mapObj.current) return;
        mapObj.current = new window.google.maps.Map(mapRef.current, {
            center: HOSPITAL_LOCATION, zoom: 14,
            styles: MAP_STYLES, disableDefaultUI: true, zoomControl: true,
        });
        new window.google.maps.Marker({
            position: HOSPITAL_LOCATION, map: mapObj.current,
            icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: "#E8571A", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3, scale: 12 },
        });
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
        socketRef.current = io(`${SOCKET_URL}/tracking`);
        socketRef.current.on("ambulance-location", updateFleetMarker);
        return () => { socketRef.current?.disconnect(); };
    }, [mapReady]);

    const updateFleetMarker = useCallback((data: any) => {
        if (!mapObj.current) return;
        const { vehicleId, lat, lng } = data;
        const pos = { lat, lng };
        if (markersRef.current[vehicleId]) {
            markersRef.current[vehicleId].setPosition(pos);
        } else {
            markersRef.current[vehicleId] = new window.google.maps.Marker({
                position: pos, map: mapObj.current,
                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, fillColor: "#F97316", fillOpacity: 1, scale: 7, strokeWeight: 2, strokeColor: "#fff" },
            });
        }
        setFleet(prev => prev.map(a => a.id === vehicleId ? { ...a, location: pos, speed: data.speed, lastUpdate: "Live" } : a));
    }, []);

    const focusAmbulance = (amb: Ambulance) => {
        if (amb.location && mapObj.current) {
            mapObj.current.panTo(amb.location);
            mapObj.current.setZoom(16);
        }
    };

    useEffect(() => {
        const inc = fleet.find(a => {
            if (!a.location || a.status !== "En Route") return false;
            const dist = window.google?.maps?.geometry?.spherical?.computeDistanceBetween(
                new window.google.maps.LatLng(a.location.lat, a.location.lng),
                new window.google.maps.LatLng(HOSPITAL_LOCATION.lat, HOSPITAL_LOCATION.lng)
            );
            return dist && dist < 1200;
        });
        setArrivalAlert(inc || null);
    }, [fleet]);

    const showToast = (msg: string, type: "success" | "error") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const statusMeta = (s: string) => {
        if (s === "Available") return { color: "#10B981", bg: "#f0fdf4", border: "#bbf7d0" };
        if (s === "En Route")  return { color: "#E8571A", bg: "#fff7ed", border: "#fed7aa" };
        if (s === "Busy")      return { color: "#F59E0B", bg: "#fffbeb", border: "#fde68a" };
        return { color: "#64748B", bg: "#f8fafc", border: "#e2e8f0" };
    };

    const priorityMeta = (p: string) => {
        if (p === "Critical") return { color: "#DC2626", bg: "#fef2f2", border: "#fecaca" };
        if (p === "High")     return { color: "#E8571A", bg: "#fff7ed", border: "#fed7aa" };
        if (p === "Medium")   return { color: "#F59E0B", bg: "#fffbeb", border: "#fde68a" };
        return { color: "#10B981", bg: "#f0fdf4", border: "#bbf7d0" };
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { background: #fafafa; color: #111; font-family: 'Inter', sans-serif; }

        /* ── Layout ── */
        .shell   { display: flex; flex-direction: column; height: 100vh; }
        .topbar  {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2rem; height: 58px;
          background: #fff; border-bottom: 1px solid #f0f0f0;
          position: relative; z-index: 100;
          animation: slideDown 0.5s ease both;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        .body    {
          display: grid; grid-template-columns: 1fr 420px;
          flex: 1; overflow: hidden;
        }

        /* ── Topbar ── */
        .brand   { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .brand-ring-wrap {
          position: relative; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
        }
        .brand-ring {
          position: absolute; inset: 0; border: 2px solid #E8571A; border-radius: 50%;
          animation: ringPulse 2s ease-out infinite;
        }
        .brand-ring:nth-child(2) { animation-delay: 0.75s; }
        @keyframes ringPulse {
          0%   { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(2);   opacity: 0; }
        }
        .brand-dot { width: 8px; height: 8px; background: #E8571A; border-radius: 50%; position: relative; z-index: 1; box-shadow: 0 0 8px rgba(232,87,26,0.5); }
        .brand-name { font-weight: 800; font-size: 1rem; color: #111; letter-spacing: -0.3px; }
        .brand-name em { color: #E8571A; font-style: normal; }

        .page-badge {
          display: flex; align-items: center; gap: 6px;
          background: #fff7ed; border: 1px solid #fed7aa;
          border-radius: 100px; padding: 3px 10px;
          font-size: 0.68rem; font-weight: 600; color: #E8571A;
          font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em;
        }
        .live-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; animation: blink 1.2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .topbar-actions { display: flex; align-items: center; gap: 8px; }
        .tb-clock { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: #94a3b8; }
        .tb-divider { width: 1px; height: 18px; background: #e2e8f0; }
        .tb-btn {
          padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; border: 1px solid #e2e8f0; background: transparent;
          color: #64748b; font-family: 'Inter', sans-serif; transition: all 0.2s;
          text-decoration: none; display: inline-flex; align-items: center; gap: 5px;
        }
        .tb-btn:hover { border-color: #cbd5e1; background: #f8fafc; color: #334155; }
        .tb-btn.danger { color: #dc2626; border-color: #fecaca; }
        .tb-btn.danger:hover { background: #fef2f2; }

        /* ── Left Column ── */
        .left-col {
          overflow-y: auto; padding: 2rem;
          display: flex; flex-direction: column; gap: 2rem;
          background: #fafafa;
        }
        .left-col::-webkit-scrollbar { width: 4px; }
        .left-col::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        /* ── Page Header ── */
        .pg-head { display: flex; justify-content: space-between; align-items: flex-start; animation: fadeUp 0.6s 0.1s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pg-eyebrow { font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; color: #E8571A; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; margin-bottom: 6px; }
        .pg-title   { font-size: 2rem; font-weight: 800; letter-spacing: -0.8px; color: #111; line-height: 1.1; }
        .pg-title span { color: #E8571A; }
        .pg-sub     { font-size: 0.82rem; color: #94a3b8; margin-top: 5px; }

        .status-toggle {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 10px; cursor: pointer;
          border: 1px solid; transition: all 0.25s; font-size: 0.78rem; font-weight: 600;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        .status-toggle.open   { border-color: #bbf7d0; background: #f0fdf4; color: #059669; }
        .status-toggle.closed { border-color: #fecaca; background: #fef2f2; color: #dc2626; }
        .status-toggle:hover  { transform: translateY(-1px); box-shadow: 0 3px 12px rgba(0,0,0,0.08); }

        /* ── Stats Grid ── */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; animation: fadeUp 0.6s 0.2s ease both; }
        .stat-box {
          background: #fff; border: 1px solid #f0f0f0; border-radius: 16px;
          padding: 1.4rem 1.6rem; position: relative; overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .stat-box::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #E8571A, #F59E0B);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
          border-radius: 0 0 16px 16px;
        }
        .stat-box:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .stat-box:hover::after { transform: scaleX(1); }
        .stat-eyebrow { font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500; margin-bottom: 10px; }
        .stat-val-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
        .stat-num {
          font-size: 2.4rem; font-weight: 800; letter-spacing: -2px; line-height: 1; color: #111;
          transition: color 0.3s;
        }
        .stat-num.orange { color: #E8571A; }
        .stat-num.green  { color: #10B981; }
        .stat-num.red    { color: #DC2626; }
        .stat-unit { font-size: 0.72rem; color: #94a3b8; font-weight: 500; }
        .stat-sub  { font-size: 0.75rem; color: #94a3b8; }

        /* Bed input */
        .bed-num-input {
          font-size: 2.4rem; font-weight: 800; letter-spacing: -2px; line-height: 1;
          color: #E8571A; background: transparent; border: none; outline: none;
          width: 72px; font-family: 'Inter', sans-serif;
          border-bottom: 2px solid #fed7aa; transition: border-color 0.2s;
          -moz-appearance: textfield;
        }
        .bed-num-input:focus { border-bottom-color: #E8571A; }
        .bed-num-input::-webkit-outer-spin-button,
        .bed-num-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .bed-stepper { display: flex; flex-direction: column; gap: 2px; margin-left: 2px; }
        .bed-step-btn {
          width: 20px; height: 20px; border: 1px solid #e2e8f0; border-radius: 5px;
          background: #f8fafc; cursor: pointer; font-size: 0.6rem; color: #64748b;
          display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .bed-step-btn:hover { border-color: #E8571A; color: #E8571A; background: #fff7ed; }

        .mini-bar { height: 4px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-top: 10px; }
        .mini-fill { height: 100%; border-radius: 4px; transition: width 0.7s cubic-bezier(0.4,0,0.2,1); }

        /* ── Tab section ── */
        .section-wrap { animation: fadeUp 0.6s 0.3s ease both; }
        .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; }
        .section-title { font-size: 0.92rem; font-weight: 700; color: #111; }
        .tabs { display: flex; gap: 4px; background: #f4f4f5; padding: 3px; border-radius: 10px; }
        .tab {
          padding: 5px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; border: none; background: transparent; color: #64748b;
          transition: all 0.25s; font-family: 'Inter', sans-serif;
        }
        .tab.on { background: #fff; color: #111; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

        /* ── Fleet cards ── */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
        .f-card {
          background: #fff; border: 1px solid #f0f0f0; border-radius: 14px;
          padding: 1.2rem; cursor: pointer;
          transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          animation: fadeUp 0.5s ease both;
        }
        .f-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 10px 30px rgba(0,0,0,0.09); border-color: #e2e8f0; }
        .f-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .f-card-id { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: #94a3b8; font-weight: 500; }
        .f-card-name { font-weight: 700; font-size: 1rem; color: #111; margin-bottom: 12px; }
        .sbadge {
          font-size: 0.6rem; font-weight: 700; padding: 3px 8px; border-radius: 6px;
          font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.06em;
          border: 1px solid;
        }
        .f-data { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .f-cell { background: #fafafa; border-radius: 8px; padding: 8px 10px; border: 1px solid #f4f4f5; }
        .f-cell-label { font-size: 0.58rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
        .f-cell-val { font-weight: 700; font-size: 0.88rem; color: #334155; }
        .f-patient { margin-top: 10px; padding: 7px 10px; background: #f8fafc; border-radius: 8px; font-size: 0.75rem; color: #64748b; border: 1px solid #f0f0f0; }

        /* ── Request cards ── */
        .r-list { display: flex; flex-direction: column; gap: 10px; }
        .r-card {
          background: #fff; border: 1px solid #f0f0f0; border-radius: 14px;
          padding: 1.2rem; display: grid; grid-template-columns: 1fr auto;
          gap: 12px; align-items: center;
          transition: all 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          animation: fadeUp 0.5s ease both;
        }
        .r-card:hover { transform: translateX(3px); box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .r-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
        .r-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: #94a3b8; font-weight: 500; }
        .r-name { font-weight: 700; font-size: 0.95rem; color: #111; }
        .r-info { font-size: 0.78rem; color: #94a3b8; margin-top: 3px; }
        .dispatch-btn {
          padding: 8px 16px; background: #E8571A; color: #fff; border: none;
          border-radius: 10px; font-weight: 700; font-size: 0.78rem; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: all 0.25s; white-space: nowrap;
          box-shadow: 0 3px 10px rgba(232,87,26,0.25);
        }
        .dispatch-btn:hover { background: #c2410c; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(232,87,26,0.4); }

        /* ── Empty state ── */
        .empty {
          text-align: center; padding: 3rem 2rem;
          border: 1.5px dashed #e2e8f0; border-radius: 16px; color: #94a3b8;
        }
        .empty-icon { font-size: 2rem; margin-bottom: 10px; opacity: 0.4; }
        .empty-text { font-size: 0.85rem; font-weight: 600; }
        .empty-sub  { font-size: 0.75rem; margin-top: 4px; }

        /* ── Right column ── */
        .right-col {
          display: flex; flex-direction: column;
          background: #fff; border-left: 1px solid #f0f0f0;
          overflow: hidden;
        }

        /* Map */
        .map-area {
          position: relative; overflow: hidden;
          transition: flex 0.55s cubic-bezier(0.4,0,0.2,1);
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
        }
        .map-area.sm { flex: 0 0 380px; }
        .map-area.lg { flex: 1 1 0; }
        #hosp-map { width: 100%; height: 100%; }

        .map-badge {
          position: absolute; top: 12px; left: 12px; z-index: 10;
          background: rgba(255,255,255,0.95); border: 1px solid #f0f0f0;
          padding: 5px 12px; border-radius: 8px;
          font-family: 'JetBrains Mono', monospace; font-size: 0.62rem;
          color: #E8571A; font-weight: 600; letter-spacing: 0.04em;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex; align-items: center; gap: 5px;
        }
        .map-expand {
          position: absolute; top: 12px; right: 12px; z-index: 10;
          width: 30px; height: 30px; background: rgba(255,255,255,0.95);
          border: 1px solid #e2e8f0; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 0.9rem; transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06); color: #E8571A;
        }
        .map-expand:hover { background: #E8571A; color: #fff; border-color: #E8571A; transform: scale(1.08); }

        /* Scan line */
        .scan { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 9; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(232,87,26,0.6), transparent);
          animation: scanDown 6s linear infinite; }
        @keyframes scanDown { 0%{top:0;opacity:0.8} 100%{top:100%;opacity:0} }

        /* Alerts */
        .alerts-area {
          flex: 1; overflow-y: auto; padding: 1.5rem;
          display: flex; flex-direction: column; gap: 1rem;
        }
        .alerts-area::-webkit-scrollbar { width: 4px; }
        .alerts-area::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .alerts-label { font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 2px; }

        .alert-card {
          background: #fff; border: 1.5px solid #fecaca; border-radius: 14px;
          padding: 1.1rem;
          animation: alertPulse 2s ease-in-out infinite alternate;
          box-shadow: 0 2px 12px rgba(220,38,38,0.08);
        }
        @keyframes alertPulse {
          from { box-shadow: 0 2px 12px rgba(220,38,38,0.06); }
          to   { box-shadow: 0 4px 20px rgba(220,38,38,0.18); }
        }
        .alert-top { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
        .alert-dot { width: 7px; height: 7px; background: #dc2626; border-radius: 50%; animation: blink 0.8s infinite; }
        .alert-tag { font-size: 0.62rem; font-weight: 800; color: #dc2626; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.06em; }
        .alert-name { font-weight: 700; font-size: 1rem; color: #111; margin-bottom: 4px; }
        .alert-desc { font-size: 0.78rem; color: #64748b; line-height: 1.5; }
        .alert-eta { margin-top: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px; text-align: center; }
        .alert-eta-label { font-size: 0.58rem; color: #dc2626; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 3px; }
        .alert-eta-val { font-size: 1.8rem; font-weight: 800; color: #111; letter-spacing: -1px; font-variant-numeric: tabular-nums; }

        .fleet-summary {
          background: #fafafa; border: 1px solid #f0f0f0; border-radius: 14px; overflow: hidden;
        }
        .fs-header { padding: 10px 14px; border-bottom: 1px solid #f4f4f5; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
        .fs-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 14px; border-bottom: 1px solid #f4f4f5; cursor: pointer;
          transition: background 0.15s;
        }
        .fs-row:last-child { border-bottom: none; }
        .fs-row:hover { background: #fff; }
        .fs-name { font-weight: 600; font-size: 0.83rem; color: #111; }
        .fs-id   { font-family: 'JetBrains Mono', monospace; font-size: 0.58rem; color: #94a3b8; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #E8571A;
          padding: 0.9rem 1.4rem; border-radius: 12px; font-size: 0.83rem; font-weight: 600;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12); color: #111;
          animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .toast.success { border-left-color: #10B981; }
        .toast.error   { border-left-color: #DC2626; }
        @keyframes toastIn {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }

        /* ── Settings modal ── */
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.25); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 20px;
          padding: 2rem; width: 440px; max-width: 90vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12);
          animation: modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes modalIn {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        .modal-h { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.4px; color: #111; margin-bottom: 1.5rem; }
        .modal-h span { color: #E8571A; }
        .m-field { margin-bottom: 1rem; }
        .m-label { display: block; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 6px; }
        .m-input {
          width: 100%; padding: 0.7rem 0.9rem; border: 1.5px solid #e2e8f0;
          border-radius: 10px; font-size: 0.88rem; font-family: 'Inter', sans-serif;
          color: #111; background: #fafafa; outline: none; transition: all 0.2s;
        }
        .m-input:focus { border-color: #E8571A; background: #fff; box-shadow: 0 0 0 3px rgba(232,87,26,0.1); }
        .m-actions { display: flex; gap: 8px; margin-top: 1.5rem; }
        .m-btn {
          flex: 1; padding: 0.7rem; border-radius: 10px; font-weight: 700;
          font-size: 0.82rem; cursor: pointer; font-family: 'Inter', sans-serif;
          border: 1px solid; transition: all 0.2s;
        }
        .m-btn.primary { background: #E8571A; color: #fff; border-color: #E8571A; box-shadow: 0 3px 10px rgba(232,87,26,0.25); }
        .m-btn.primary:hover { background: #c2410c; }
        .m-btn.ghost   { background: transparent; color: #64748b; border-color: #e2e8f0; }
        .m-btn.ghost:hover { background: #f8fafc; }
      `}</style>

            <div className="shell">
                {/* ── Topbar ── */}
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link href="/" className="brand">
                            <div className="brand-ring-wrap">
                                <div className="brand-ring" />
                                <div className="brand-ring" />
                                <div className="brand-dot" />
                            </div>
                            <span className="brand-name">Golden<em>Hour</em></span>
                        </Link>
                        <div className="tb-divider" />
                        <div className="page-badge">
                            <span className="live-dot" />
                            Hospital Command
                        </div>
                    </div>

                    <div className="topbar-actions">
                        <span className="tb-clock">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="tb-divider" />
                        <button className="tb-btn" onClick={() => setShowSettings(true)}>⚙ Settings</button>
                        <Link href="/" className="tb-btn">↩ Home</Link>
                        <button className="tb-btn danger" onClick={handleLogout}>Sign Out</button>
                    </div>
                </header>

                {/* ── Body ── */}
                <div className="body">
                    {/* Left column */}
                    <div className="left-col">
                        {/* Page header */}
                        <div className="pg-head">
                            <div>
                                <p className="pg-eyebrow">Hospital Dashboard</p>
                                <h1 className="pg-title">Facility <span>Overview</span></h1>
                                <p className="pg-sub">{hospName}</p>
                            </div>
                            <div
                                className={`status-toggle ${isOpen ? 'open' : 'closed'}`}
                                onClick={() => setIsOpen(o => !o)}
                            >
                                <span className="live-dot" style={{ background: isOpen ? '#10B981' : '#dc2626' }} />
                                {isOpen ? 'Open' : 'Closed'}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="stats-grid">
                            {/* Beds */}
                            <div className="stat-box">
                                <div className="stat-eyebrow">Available Beds</div>
                                <div className="stat-val-row">
                                    <input
                                        type="number"
                                        className="bed-num-input"
                                        value={bedInput}
                                        min={0} max={999}
                                        onChange={e => {
                                            setBedInput(e.target.value);
                                            const n = parseInt(e.target.value, 10);
                                            if (!isNaN(n) && n >= 0 && n <= 999) setBeds(n);
                                        }}
                                        onBlur={() => {
                                            if (!bedInput || isNaN(parseInt(bedInput, 10))) setBedInput(String(beds));
                                        }}
                                    />
                                    <div className="bed-stepper">
                                        <button className="bed-step-btn" onClick={() => { const n = beds + 1; setBeds(n); setBedInput(String(n)); }}>▲</button>
                                        <button className="bed-step-btn" onClick={() => { const n = Math.max(0, beds - 1); setBeds(n); setBedInput(String(n)); }}>▼</button>
                                    </div>
                                    <span className="stat-unit">/ 60</span>
                                </div>
                                <div className="stat-sub">Click number to edit</div>
                                <div className="mini-bar">
                                    <div className="mini-fill" style={{ width: `${Math.min((beds / 60) * 100, 100)}%`, background: beds < 10 ? '#dc2626' : beds < 25 ? '#f59e0b' : '#E8571A' }} />
                                </div>
                            </div>

                            {/* Fleet */}
                            <div className="stat-box">
                                <div className="stat-eyebrow">Ready Units</div>
                                <div className="stat-val-row">
                                    <span className="stat-num green">{fleet.filter(a => a.status === "Available").length}</span>
                                    <span className="stat-unit">/ {fleet.length} total</span>
                                </div>
                                <div className="stat-sub">ambulances on standby</div>
                                <div className="mini-bar">
                                    <div className="mini-fill" style={{ width: `${(fleet.filter(a => a.status === "Available").length / fleet.length) * 100}%`, background: '#10B981' }} />
                                </div>
                            </div>

                            {/* Requests */}
                            <div className="stat-box">
                                <div className="stat-eyebrow">Pending Requests</div>
                                <div className="stat-val-row">
                                    <span className={`stat-num ${requests.filter(r => r.status === 'Pending').length > 0 ? 'red' : ''}`}>
                                        {requests.filter(r => r.status === 'Pending').length}
                                    </span>
                                    <span className="stat-unit">queued</span>
                                </div>
                                <div className="stat-sub">
                                    {requests.filter(r => r.status === 'Pending').length > 0
                                        ? '⚠ Response needed'
                                        : 'All clear'}
                                </div>
                            </div>
                        </div>

                        {/* Fleet / Requests */}
                        <div className="section-wrap">
                            <div className="section-head">
                                <span className="section-title">
                                    {activeTab === 'fleet' ? '🚑 Active Fleet' : '📋 Emergency Requests'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {activeTab === 'fleet' && (
                                        <button 
                                            className="dispatch-btn" 
                                            style={{ background: '#111', color: '#fff', boxShadow: 'none', padding: '6px 14px' }}
                                            onClick={() => setShowAddAmbulance(true)}
                                        >
                                            + Add
                                        </button>
                                    )}
                                    <div className="tabs">
                                        <button className={`tab ${activeTab === 'fleet' ? 'on' : ''}`} onClick={() => setActiveTab('fleet')}>Fleet</button>
                                        <button className={`tab ${activeTab === 'requests' ? 'on' : ''}`} onClick={() => setActiveTab('requests')}>Requests</button>
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'fleet' && (
                                <div className="card-grid">
                                    {fleet.map((amb, i) => {
                                        const m = statusMeta(amb.status);
                                        return (
                                            <div key={amb.id} className="f-card" onClick={() => focusAmbulance(amb)} style={{ animationDelay: `${i * 0.08}s` }}>
                                                <div className="f-card-top">
                                                    <span className="f-card-id">{amb.id}</span>
                                                    <span className="sbadge" style={{ color: m.color, background: m.bg, borderColor: m.border }}>
                                                        {amb.status}
                                                    </span>
                                                </div>
                                                <div className="f-card-name">{amb.name}</div>
                                                <div className="f-data">
                                                    <div className="f-cell">
                                                        <div className="f-cell-label">Speed</div>
                                                        <div className="f-cell-val" style={{ color: amb.speed > 0 ? '#E8571A' : '#94a3b8' }}>{amb.speed} km/h</div>
                                                    </div>
                                                    <div className="f-cell">
                                                        <div className="f-cell-label">Sync</div>
                                                        <div className="f-cell-val">{amb.lastUpdate}</div>
                                                    </div>
                                                </div>
                                                {amb.driver && (
                                                    <div className="f-patient" style={{ marginTop: '10px' }}>
                                                        👨‍✈️ Driver: {amb.driver.name} <br/>
                                                        📞 {amb.driver.phone}
                                                    </div>
                                                )}
                                                {amb.patient && (
                                                    <div className="f-patient" style={{ marginTop: '5px' }}>👤 Patient: {amb.patient}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {activeTab === 'requests' && (
                                <div className="r-list">
                                    {requests.filter(r => r.status === 'Pending').length === 0 && (
                                        <div className="empty">
                                            <div className="empty-icon">📭</div>
                                            <div className="empty-text">No pending requests</div>
                                            <div className="empty-sub">All emergencies are assigned</div>
                                        </div>
                                    )}
                                    {requests.map((req, i) => {
                                        if (req.status !== 'Pending') return null;
                                        const pm = priorityMeta(req.priority);
                                        return (
                                            <div key={req.id} className="r-card" style={{ animationDelay: `${i * 0.08}s` }}>
                                                <div>
                                                    <div className="r-card-top">
                                                        <span className="r-tag">{req.id}</span>
                                                        <span className="sbadge" style={{ color: pm.color, background: pm.bg, borderColor: pm.border }}>{req.priority}</span>
                                                    </div>
                                                    <div className="r-name">{req.patientName}</div>
                                                    <div className="r-info">📍 {req.location} · 🚘 {req.carNumber}</div>
                                                </div>
                                                <button className="dispatch-btn" onClick={async () => {
                                                    const a = fleet.find(amb => amb.status === 'Available');
                                                    if (a) {
                                                        try {
                                                            const token = localStorage.getItem("gh_token");
                                                            const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                                                            // In a real app we would hit an assignment API endpoint here
                                                            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Assigned', assignedAmbulance: a.id } : r));
                                                            setFleet(prev => prev.map(f => f.id === a.id ? { ...f, status: 'En Route', patient: req.patientName } : f));
                                                            showToast(`✓ ${a.id} dispatched`, 'success');
                                                        } catch(e) {
                                                            showToast('API error dispatching', 'error');
                                                        }
                                                    } else {
                                                        showToast('No available units', 'error');
                                                    }
                                                }}>Dispatch</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="right-col">
                        {/* Map */}
                        <div className={`map-area ${mapExpanded ? 'lg' : 'sm'}`}>
                            <div className="scan" />
                            <div id="hosp-map" ref={mapRef} />
                            <div style={{ display: 'flex', gap: '8px', zIndex: 10, position: 'absolute', top: '12px', left: '12px' }}>
                                <div 
                                    onClick={() => setTrackingMode("emergency")}
                                    style={{
                                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', 
                                        background: trackingMode === "emergency" ? (arrivalAlert ? '#dc2626' : '#E8571A') : '#fff',
                                        color: trackingMode === "emergency" ? '#fff' : (arrivalAlert ? '#dc2626' : '#111'),
                                        border: '1px solid', borderColor: trackingMode === "emergency" ? (arrivalAlert ? '#dc2626' : '#E8571A') : (arrivalAlert ? '#fecaca' : '#e2e8f0'),
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        animation: arrivalAlert ? 'alertPulse 1.2s infinite alternate' : 'none',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <span className="live-dot" style={{ background: trackingMode === "emergency" ? '#fff' : '#dc2626' }} />
                                    Alert / Emergency
                                </div>
                                <div 
                                    onClick={() => setTrackingMode("all")}
                                    style={{
                                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                                        background: trackingMode === "all" ? '#111' : '#fff',
                                        color: trackingMode === "all" ? '#fff' : '#111',
                                        border: '1px solid', borderColor: trackingMode === "all" ? '#111' : '#e2e8f0',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                    }}
                                >
                                    All Fleet
                                </div>
                            </div>
                            <button
                                className="map-expand"
                                title={mapExpanded ? 'Collapse' : 'Expand'}
                                onClick={() => {
                                    setMapExpanded(e => !e);
                                    setTimeout(() => {
                                        if (mapObj.current) window.google.maps.event.trigger(mapObj.current, 'resize');
                                    }, 560);
                                }}
                            >
                                {mapExpanded ? '⤡' : '⤢'}
                            </button>
                        </div>

                        {/* Alerts area */}
                        <div className="alerts-area">
                            <p className="alerts-label">Alerts & Status</p>

                            {arrivalAlert ? (
                                <div className="alert-card">
                                    <div className="alert-top">
                                        <div className="alert-dot" />
                                        <span className="alert-tag">Inbound Unit</span>
                                    </div>
                                    <div className="alert-name">{arrivalAlert.name}</div>
                                    <div className="alert-desc">Approaching facility — prepare trauma response team and clear the bay.</div>
                                    <div className="alert-eta">
                                        <div className="alert-eta-label">Est. Arrival</div>
                                        <div className="alert-eta-val">~90s</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty" style={{ padding: '1.5rem', border: '1px solid #f4f4f5', background: '#fafafa' }}>
                                    <div className="empty-icon" style={{ fontSize: '1.4rem' }}>📡</div>
                                    <div className="empty-text">All clear</div>
                                    <div className="empty-sub">No inbound emergencies</div>
                                </div>
                            )}

                            {/* Fleet overview removed as requested */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings modal */}
            {showSettings && (
                <div className="overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-h">Facility <span>Settings</span></div>
                        <div className="m-field">
                            <label className="m-label">Facility Name</label>
                            <input className="m-input" value={hospName} onChange={e => setHospName(e.target.value)} />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Emergency Contact</label>
                            <input className="m-input" placeholder="+91 99999 88888" />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Facility Address</label>
                            <input className="m-input" placeholder="123 Medical Drive, Pune" />
                        </div>
                        <div className="m-actions">
                            <button className="m-btn primary" onClick={() => setShowSettings(false)}>Save</button>
                            <button className="m-btn ghost" onClick={() => setShowSettings(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Ambulance Modal */}
            {showAddAmbulance && (
                <div className="overlay" onClick={() => setShowAddAmbulance(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-h">Add <span>Ambulance</span></div>
                        
                        <div className="m-field">
                            <label className="m-label">Vehicle Plate Number</label>
                            <input 
                                className="m-input" 
                                placeholder="MH-12-AB-1234" 
                                value={newAmbData.plateNumber} 
                                onChange={e => setNewAmbData({...newAmbData, plateNumber: e.target.value})} 
                            />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Driver Full Name</label>
                            <input 
                                className="m-input" 
                                placeholder="John Doe" 
                                value={newAmbData.driverName} 
                                onChange={e => setNewAmbData({...newAmbData, driverName: e.target.value})} 
                            />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Driver Phone</label>
                            <input 
                                className="m-input" 
                                placeholder="+91 9876543210" 
                                value={newAmbData.driverPhone} 
                                onChange={e => setNewAmbData({...newAmbData, driverPhone: e.target.value})} 
                            />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Driver Email (for Login)</label>
                            <input 
                                className="m-input" 
                                placeholder="driver@hospital.com" 
                                value={newAmbData.driverEmail} 
                                onChange={e => setNewAmbData({...newAmbData, driverEmail: e.target.value})} 
                            />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Driver Password (for Login)</label>
                            <input 
                                className="m-input" 
                                type="password"
                                placeholder="••••••••" 
                                value={newAmbData.driverPassword} 
                                onChange={e => setNewAmbData({...newAmbData, driverPassword: e.target.value})} 
                            />
                        </div>

                        <div className="m-actions">
                            <button 
                                className="m-btn primary" 
                                disabled={isSubmittingAmb}
                                onClick={async () => {
                                    if(!newAmbData.plateNumber || !newAmbData.driverName || !newAmbData.driverPhone || !newAmbData.driverEmail || !newAmbData.driverPassword) {
                                        showToast("All fields are required", "error");
                                        return;
                                    }
                                    setIsSubmittingAmb(true);
                                    try {
                                        const token = localStorage.getItem("gh_token");
                                        const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                                        const res = await fetch(`${url}/hospital/fleet`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${token}`
                                            },
                                            body: JSON.stringify(newAmbData)
                                        });
                                        const data = await res.json();
                                        if(res.ok) {
                                            showToast("Ambulance added successfully!", "success");
                                            setShowAddAmbulance(false);
                                            setNewAmbData({ plateNumber: "", driverName: "", driverPhone: "", driverEmail: "", driverPassword: "" });
                                            // The interval fetch will automatically grab it soon
                                        } else {
                                            showToast(data.message || "Failed to add ambulance", "error");
                                        }
                                    } catch(err) {
                                        showToast("Network error occurred", "error");
                                    } finally {
                                        setIsSubmittingAmb(false);
                                    }
                                }}
                            >
                                {isSubmittingAmb ? "Adding..." : "Add Vehicle"}
                            </button>
                            <button className="m-btn ghost" onClick={() => setShowAddAmbulance(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
        </>
    );
}
