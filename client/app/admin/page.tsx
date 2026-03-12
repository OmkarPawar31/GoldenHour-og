"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { apiGet } from "../../services/api";
import { getSocket, disconnectSocket } from "../../services/socket";

interface DashboardData {
  activeEmergencies: number;
  totalUsers: number;
  availableVehicles: number;
  recentSessions: SessionEntry[];
}

interface SessionEntry {
  _id: string;
  status: string;
  priority: number;
  userId?: { _id: string; name: string; email: string };
  vehicleId?: { _id: string; type: string; licensePlate?: string };
  createdAt: string;
  resolvedAt?: string;
}

interface UserEntry {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  createdAt: string;
}

interface AmbulanceAlert {
  id: string;
  type: "corridor-proximity" | "ambulance-moving" | "new-emergency" | "corridor-activated" | "emergency-resolved" | "ambulance-detected" | "signal-change" | "lane-detected";
  vehicleId?: string;
  plateNumber?: string;
  sessionId?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: Date;
  isNew?: boolean;
}

type Tab = "overview" | "users" | "sessions" | "alerts";

// ──────────────────────────────────────────────────
//  SIMULATION DATA for generating realistic alerts
// ──────────────────────────────────────────────────
const SIMULATED_PLATES = ["MH-12-AB-1234", "MH-14-CD-5678", "MH-04-EF-9012", "MH-01-GH-3456", "KA-51-HJ-7890"];
const SIMULATED_LANES = ["NH-48 Highway", "MG Road Corridor", "Ring Road South", "SV Road Lane 3", "Western Express Lane 2", "Eastern Freeway", "Pune-Mumbai Expressway"];
const SIMULATED_HOSPITALS = ["City General Hospital", "Apollo Emergency", "Lilavati Hospital", "KEM Hospital", "Fortis Healthcare"];
const SIMULATED_JUNCTIONS = ["Dadar Junction", "Andheri Signal", "Bandra Flyover", "Worli Sea Link Entry", "Thane Toll Plaza", "Hinjewadi Crossing"];

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateSimAlert(): AmbulanceAlert {
  const plate = randomFrom(SIMULATED_PLATES);
  const types: AmbulanceAlert["type"][] = [
    "ambulance-detected", "corridor-proximity", "lane-detected",
    "signal-change", "ambulance-moving", "corridor-activated"
  ];
  const type = randomFrom(types);
  const speed = randomBetween(30, 90);
  const dist = randomBetween(50, 800);

  const messages: Record<string, () => string> = {
    "ambulance-detected": () => `🚑 Ambulance ${plate} detected ${dist}m away — approaching ${randomFrom(SIMULATED_JUNCTIONS)}`,
    "corridor-proximity": () => `⚡ Ambulance ${plate} entered emergency corridor on ${randomFrom(SIMULATED_LANES)} — CLEAR THE WAY`,
    "lane-detected": () => `🛣️ Ambulance ${plate} detected in Lane ${randomBetween(1, 4)} on ${randomFrom(SIMULATED_LANES)} at ${speed} km/h`,
    "signal-change": () => `🟢 Traffic signal at ${randomFrom(SIMULATED_JUNCTIONS)} turned GREEN for ambulance ${plate} (${dist}m out)`,
    "ambulance-moving": () => `📍 Ambulance ${plate} en-route to ${randomFrom(SIMULATED_HOSPITALS)} — ${speed} km/h | ETA ${randomBetween(2, 15)} min`,
    "corridor-activated": () => `🟢 Green corridor activated: ${randomFrom(SIMULATED_LANES)} → ${randomFrom(SIMULATED_HOSPITALS)} for ${plate}`,
  };

  const severities: Record<string, AmbulanceAlert["severity"]> = {
    "ambulance-detected": "warning",
    "corridor-proximity": "critical",
    "lane-detected": "critical",
    "signal-change": "info",
    "ambulance-moving": "warning",
    "corridor-activated": "critical",
  };

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    plateNumber: plate,
    speed,
    message: messages[type](),
    severity: severities[type],
    timestamp: new Date(),
    isNew: true,
  };
}

// ──────────────────────────────────────────────────
//  MAIN COMPONENT
// ──────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // Alerts state
  const [alerts, setAlerts] = useState<AmbulanceAlert[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [simActive, setSimActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertsPaused, setAlertsPaused] = useState(false);
  const alertsEndRef = useRef<HTMLDivElement>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize alert sound
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1PQ0A+QUNTO2hdUkxJSk1QUlRST0tHREJBQUJDREVGRkdHR0dGRkVEQ0JBQEBBQkNERUZHR0hISEdHRkVEQ0JBQUFCQkNEREVFRkZGRkZFRURDQkFBQUFCQkNERERFRUZGRUVFREREQ0JCQUFBQUJCQ0NEREVERS8tLCsqKSkpKisrLC4vLzAxMTIyMzMzMzMyMjEwLy4tLCsqKiopKSkpKSkpKSkpKSorKywsLS4uLy8wMDExMjIyMjIyMTEwMC8uLS0sKysqKSkpKSkpKSoqKissLC0tLi8vLzAwMTExMTExMTEwMC8vLi4tLCwrKysqKioqKioqKyssLC0tLi4vLy8wMDAwMDAwMDAvLy4uLS0sLCsrKysqKioqKioqKyssLC0tLi4uLy8vMDAwMDAwLy8vLi4tLS0sLCwrKysrKioqKisrKyssLC0tLS4uLi8vLy8wMDAvLy8uLi4tLS0sLCwsKysrKysrKysrKywsLC0tLS4uLi4vLy8vLy8vLy4uLi0tLS0sLCwsLCsrKysrKysrLCwsLC0tLS0uLi4uLy8vLy8vLi4uLi0tLS0tLCwsLCwrKysrKysrLCwsLC0tLS0uLi4uLi8vLy8vLi4uLi0tLS0tLSwsLCwsKysrKysrLCwsLC0tLS0tLi4uLi4vLy8vLi4uLi4tLS0tLSwsLCwsLCwrKysrLCwsLC0tLS0tLS4uLi4uLi4uLi4uLi4tLS0tLS0sLCwsLCwsLCwsLCwsLC0tLS0tLS4uLi4uLi4uLi4uLi0tLS0tLS0sLCwsLCwsLCwsLCwtLS0tLS0tLi4uLi4uLi4uLi4tLS0tLS0tLSwsLCwsLCwsLCwtLS0tLS0tLS4uLi4uLi4uLi4tLS0tLS0tLS0sLCwsLCwsLC0tLS0tLS0tLi4uLi4uLi4uLi0tLS0tLS0tLSwsLCwsLCwtLS0tLS0tLS0uLi4uLi4uLi4tLS0tLS0tLS0tLCwsLCwsLS0tLS0tLS0uLi4uLi4uLi4tLS0tLS0tLS0tLSwsLCwtLS0tLS0tLS0uLi4uLi4uLi0tLS0tLS0tLS0tLSwsLC0tLS0tLS0tLi4uLi4uLi4tLS0tLS0tLS0tLS0sLC0tLS0tLS0tLi4uLi4uLi4tLS0tLS0tLS0tLS0tLS0tLS0tLS0uLi4uLi4uLS0tLS0tLS0tLS0tLS0tLS0tLS0tLi4uLi4uLi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0uLi4uLi4tLS0tLS0tLS0tLS0t");
    }
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => { });
    }
  }, [soundEnabled]);

  // Add an alert to the feed
  const addAlert = useCallback((alert: AmbulanceAlert) => {
    if (alertsPaused) return;
    setAlerts((prev) => {
      const next = [alert, ...prev].slice(0, 100); // Keep last 100 alerts
      return next;
    });
    setAlertCount((c) => c + 1);
    if (alert.severity === "critical") {
      playAlertSound();
    }
  }, [alertsPaused, playAlertSound]);

  // Connect to admin-alerts socket
  useEffect(() => {
    const socket = getSocket("/admin-alerts");

    socket.on("ambulance-alert", (data: Omit<AmbulanceAlert, "id" | "isNew">) => {
      addAlert({
        ...data,
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(data.timestamp),
        isNew: true,
      });
    });

    return () => {
      socket.off("ambulance-alert");
    };
  }, [addAlert]);

  // Simulation interval
  useEffect(() => {
    if (simActive && !alertsPaused) {
      // Generate alerts at random intervals (1.5-4 seconds)
      const scheduleNext = () => {
        const delay = randomBetween(1500, 4000);
        simIntervalRef.current = setTimeout(() => {
          addAlert(generateSimAlert());
          scheduleNext();
        }, delay) as unknown as ReturnType<typeof setInterval>;
      };
      scheduleNext();
    }

    return () => {
      if (simIntervalRef.current) {
        clearTimeout(simIntervalRef.current as unknown as number);
        simIntervalRef.current = null;
      }
    };
  }, [simActive, alertsPaused, addAlert]);

  // Remove "new" animation after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlerts((prev) => prev.map((a) => (a.isNew ? { ...a, isNew: false } : a)));
    }, 3000);
    return () => clearTimeout(timer);
  }, [alerts]);

  const loadOverview = useCallback(async () => {
    const data = await apiGet<DashboardData>("/admin/dashboard");
    setDashboard(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await apiGet<UserEntry[]>("/admin/users");
    setUsers(data);
  }, []);

  const loadSessions = useCallback(async () => {
    const q = statusFilter ? `?status=${statusFilter}` : "";
    const data = await apiGet<SessionEntry[]>(`/admin/sessions${q}`);
    setSessions(data);
  }, [statusFilter]);

  useEffect(() => {
    async function init() {
      try {
        const token = localStorage.getItem("gh_token");
        const role = localStorage.getItem("gh_role");
        if (!token) { setError("Not logged in"); setLoading(false); return; }
        if (role !== "admin") { setError("Admin access required"); setLoading(false); return; }
        await loadOverview();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadOverview]);

  useEffect(() => {
    if (tab === "users" && users.length === 0) loadUsers().catch(() => { });
    if (tab === "sessions") loadSessions().catch(() => { });
  }, [tab, loadUsers, loadSessions, users.length]);

  function handleLogout() {
    localStorage.removeItem("gh_token");
    localStorage.removeItem("gh_user");
    localStorage.removeItem("gh_role");
    disconnectSocket("/admin-alerts");
    window.location.href = "/auth";
  }

  function clearAlerts() {
    setAlerts([]);
    setAlertCount(0);
  }

  function getAlertIcon(type: AmbulanceAlert["type"]) {
    switch (type) {
      case "ambulance-detected": return "🚑";
      case "corridor-proximity": return "⚡";
      case "lane-detected": return "🛣️";
      case "signal-change": return "🟢";
      case "ambulance-moving": return "📍";
      case "corridor-activated": return "🔰";
      case "new-emergency": return "🚨";
      case "emergency-resolved": return "✅";
      default: return "🔔";
    }
  }

  function formatTimeAgo(date: Date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&family=Bebas+Neue&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --orange:  #E8571A;
          --orange2: #F97316;
          --amber:   #F59E0B;
          --cream:   #FFFBF5;
          --warm:    #FFF7ED;
          --slate:   #F1F5F9;
          --text:    #1E293B;
          --muted:   #64748B;
          --border:  #E2E8F0;
          --green:   #10B981;
          --blue:    #3B82F6;
          --red:     #EF4444;
        }

        body {
          background: var(--cream);
          font-family: 'DM Sans', system-ui, sans-serif;
          color: var(--text);
        }

        .adm-wrap {
          min-height: 100vh;
          background: var(--cream);
        }

        .adm-body { padding: 32px; max-width: 1280px; margin: 0 auto; }

        .adm-page-title {
          font-size: 1.6rem; font-weight: 800; color: var(--text);
          margin-bottom: 4px;
        }
        .adm-page-sub { font-size: 0.88rem; color: var(--muted); margin-bottom: 28px; }

        /* Tabs */
        .adm-tabs {
          display: flex; gap: 6px; margin-bottom: 32px;
          background: #fff; padding: 5px; border-radius: 12px;
          border: 1.5px solid var(--border); width: fit-content;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .adm-tab {
          padding: 9px 22px; border-radius: 8px; font-size: 0.88rem; cursor: pointer;
          border: none; background: transparent;
          color: var(--muted); transition: all 0.25s;
          font-family: 'DM Sans', sans-serif; font-weight: 500;
          position: relative;
        }
        .adm-tab:hover { background: var(--slate); color: var(--text); }
        .adm-tab.active {
          background: var(--orange); color: #fff; font-weight: 700;
          box-shadow: 0 2px 12px rgba(232,87,26,0.3);
        }
        .adm-tab .alert-badge {
          position: absolute;
          top: -4px; right: -4px;
          background: var(--red);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          animation: badgePulse 2s ease-in-out infinite;
          line-height: 1.2;
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        /* Stat cards */
        .adm-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 36px; }
        .adm-card {
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 16px; padding: 24px;
          display: flex; align-items: center; gap: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          transition: all 0.3s;
        }
        .adm-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .adm-card-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; flex-shrink: 0;
        }
        .adm-card-value { font-size: 2rem; font-weight: 800; line-height: 1; }
        .adm-card-label { font-size: 0.82rem; color: var(--muted); margin-top: 4px; }

        /* Section heading */
        .adm-section-title {
          font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .adm-section-title::before {
          content: ''; width: 3px; height: 18px;
          background: var(--orange); border-radius: 2px; display: block;
        }

        /* Table */
        .adm-table-wrap {
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          overflow-x: auto;
        }
        .adm-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .adm-table th {
          text-align: left; padding: 12px 18px; font-size: 0.75rem; color: var(--muted);
          text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
          border-bottom: 1.5px solid var(--border);
          background: var(--slate);
          font-family: 'JetBrains Mono', monospace;
        }
        .adm-table td {
          padding: 14px 18px; font-size: 0.88rem;
          border-bottom: 1px solid rgba(226,232,240,0.6);
          transition: background 0.15s;
        }
        .adm-table tbody tr:hover td { background: var(--warm); }
        .adm-table tbody tr:last-child td { border-bottom: none; }

        /* Badges */
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
          font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em;
        }
        .status-badge::before { content:''; width:6px;height:6px;border-radius:50%;flex-shrink:0; }
        .status-active { background: rgba(16,185,129,0.1); color: #059669; }
        .status-active::before { background: #059669; }
        .status-pending { background: rgba(245,158,11,0.1); color: #D97706; }
        .status-pending::before { background: #D97706; }
        .status-resolved { background: rgba(100,116,147,0.1); color: var(--muted); }
        .status-resolved::before { background: var(--muted); }

        .role-badge {
          display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;
          background: rgba(59,130,246,0.08); color: #2563EB;
          font-family: 'JetBrains Mono', monospace;
        }
        .role-admin { background: rgba(232,87,26,0.1); color: var(--orange); }

        /* Filter */
        .adm-filter { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
        .adm-filter label { font-size: 0.83rem; color: var(--muted); font-weight: 500; }
        .adm-filter select {
          padding: 8px 14px; border-radius: 8px; font-size: 0.85rem;
          background: #fff; border: 1.5px solid var(--border);
          color: var(--text); cursor: pointer; outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
        }
        .adm-filter select:focus { border-color: var(--orange); }

        .adm-empty {
          text-align: center; padding: 48px; color: var(--muted);
          font-size: 0.9rem; background: #fff; border-radius: 12px;
          border: 1.5px solid var(--border);
        }
        .adm-error {
          text-align: center; padding: 60px; color: var(--red);
          font-size: 1rem; background: rgba(239,68,68,0.05);
          border-radius: 16px; border: 1.5px solid rgba(239,68,68,0.15);
        }
        .adm-loading {
          text-align: center; padding: 80px; color: var(--muted);
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .loading-spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid rgba(232,87,26,0.15);
          border-top-color: var(--orange);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--muted); }

        /* ────────────────────────────────────────
           ALERT FEED STYLES
        ──────────────────────────────────────── */
        .alerts-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
        }
        .alerts-header-left {
          display: flex; align-items: center; gap: 12px;
        }
        .alerts-header-left h3 {
          font-size: 1.1rem; font-weight: 800; color: var(--text);
          display: flex; align-items: center; gap: 8px;
        }
        .alerts-live-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--red);
          animation: livePulse 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .alerts-live-dot.paused { background: var(--muted); animation: none; }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        .alerts-counter {
          font-size: 0.78rem; background: rgba(239,68,68,0.08);
          color: var(--red); padding: 4px 12px; border-radius: 20px;
          font-family: 'JetBrains Mono', monospace; font-weight: 700;
        }
        .alerts-controls {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .alert-ctrl-btn {
          padding: 7px 14px; border-radius: 8px; font-size: 0.78rem;
          font-weight: 600; cursor: pointer; border: 1.5px solid var(--border);
          background: #fff; color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          display: flex; align-items: center; gap: 5px;
        }
        .alert-ctrl-btn:hover { border-color: var(--orange); color: var(--text); }
        .alert-ctrl-btn.active {
          background: var(--orange); color: #fff; border-color: var(--orange);
        }
        .alert-ctrl-btn.danger { color: var(--red); }
        .alert-ctrl-btn.danger:hover { background: rgba(239,68,68,0.05); border-color: var(--red); }

        /* Stats row */
        .alert-stats {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px; margin-bottom: 24px;
        }
        .alert-stat {
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 12px; padding: 16px;
          text-align: center;
          box-shadow: 0 1px 6px rgba(0,0,0,0.03);
        }
        .alert-stat-value {
          font-size: 1.6rem; font-weight: 800; line-height: 1;
          font-family: 'JetBrains Mono', monospace;
        }
        .alert-stat-label {
          font-size: 0.72rem; color: var(--muted); margin-top: 6px;
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }

        /* Feed container */
        .alert-feed {
          background: #fff;
          border: 1.5px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          max-height: 600px;
          overflow-y: auto;
        }
        .alert-feed::-webkit-scrollbar { width: 6px; }
        .alert-feed::-webkit-scrollbar-track { background: transparent; }
        .alert-feed::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        .alert-feed-header {
          position: sticky; top: 0; z-index: 2;
          display: grid; grid-template-columns: 50px 100px 1fr 90px;
          padding: 10px 18px;
          background: var(--slate);
          border-bottom: 1.5px solid var(--border);
          font-size: 0.7rem; color: var(--muted);
          text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Individual alert row */
        .alert-row {
          display: grid; grid-template-columns: 50px 100px 1fr 90px;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(226,232,240,0.5);
          align-items: center;
          transition: all 0.3s ease;
          animation: alertSlide 0.4s ease-out;
        }
        .alert-row:hover { background: var(--warm); }
        .alert-row.new {
          animation: alertFlash 0.8s ease-out, alertSlide 0.4s ease-out;
        }
        .alert-row.severity-critical {
          border-left: 4px solid var(--red);
        }
        .alert-row.severity-warning {
          border-left: 4px solid var(--amber);
        }
        .alert-row.severity-info {
          border-left: 4px solid var(--blue);
        }

        @keyframes alertSlide {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alertFlash {
          0% { background: rgba(239,68,68,0.15); }
          100% { background: transparent; }
        }

        .alert-icon { font-size: 1.2rem; text-align: center; }

        .alert-severity {
          font-size: 0.68rem; font-weight: 800; padding: 3px 8px;
          border-radius: 6px; text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.04em; width: fit-content;
        }
        .sev-critical { background: rgba(239,68,68,0.1); color: var(--red); }
        .sev-warning { background: rgba(245,158,11,0.1); color: #D97706; }
        .sev-info { background: rgba(59,130,246,0.1); color: var(--blue); }

        .alert-message {
          font-size: 0.85rem; color: var(--text);
          line-height: 1.4; padding: 0 12px;
        }
        .alert-message strong {
          color: var(--orange); font-weight: 700;
        }

        .alert-time {
          font-size: 0.72rem; color: var(--muted);
          font-family: 'JetBrains Mono', monospace;
          text-align: right;
        }

        /* Emergency banner at top of alerts */
        .alert-banner {
          padding: 14px 20px;
          display: flex; align-items: center; gap: 12px;
          font-size: 0.85rem; font-weight: 600;
          border-bottom: 1.5px solid;
          animation: bannerPulse 3s ease-in-out infinite;
        }
        .alert-banner.critical-banner {
          background: linear-gradient(90deg, rgba(239,68,68,0.08), rgba(249,115,22,0.08));
          border-color: rgba(239,68,68,0.2);
          color: var(--red);
        }
        @keyframes bannerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .alert-banner-icon {
          font-size: 1.4rem;
          animation: bannerSpin 2s linear infinite;
        }
        @keyframes bannerSpin {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }

        .alert-empty {
          text-align: center; padding: 60px; color: var(--muted);
          font-size: 0.9rem;
        }
        .alert-empty-icon { font-size: 3rem; margin-bottom: 12px; }

        /* Scrollbar pulse for new alerts */
        .alert-feed.has-new {
          border-color: rgba(239,68,68,0.3);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.08), 0 2px 12px rgba(0,0,0,0.04);
        }
      `}</style>

      <div className="adm-wrap">
        <div className="adm-body">
          {loading ? (
            <div className="adm-loading">
              <div className="loading-spinner" />
              Loading admin panel...
            </div>
          ) : error ? (
            <div className="adm-error">
              {error}
              {error === "Not logged in" && (
                <div style={{ marginTop: 16 }}>
                  <Link href="/auth" style={{ color: "var(--orange)", fontWeight: 600 }}>Go to Login →</Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="adm-page-title">Admin War Room</div>
              <div className="adm-page-sub">Monitor active emergencies, users, and corridor sessions in real time.</div>

              <div className="adm-tabs">
                <button className={`adm-tab ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
                  📊 Overview
                </button>
                <button className={`adm-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
                  👥 Users
                </button>
                <button className={`adm-tab ${tab === "sessions" ? "active" : ""}`} onClick={() => setTab("sessions")}>
                  🚨 Sessions
                </button>
                <button className={`adm-tab ${tab === "alerts" ? "active" : ""}`} onClick={() => setTab("alerts")} style={{ position: "relative" }}>
                  🚑 Alerts
                  {alertCount > 0 && tab !== "alerts" && (
                    <span className="alert-badge">{alertCount > 99 ? "99+" : alertCount}</span>
                  )}
                </button>
              </div>

              {/* ─── OVERVIEW TAB ─── */}
              {tab === "overview" && dashboard && (
                <>
                  <div className="adm-cards">
                    <div className="adm-card">
                      <div className="adm-card-icon" style={{ background: "rgba(239,68,68,0.1)" }}>🚨</div>
                      <div>
                        <div className="adm-card-value" style={{ color: "var(--red)" }}>
                          {dashboard.activeEmergencies}
                        </div>
                        <div className="adm-card-label">Active Emergencies</div>
                      </div>
                    </div>
                    <div className="adm-card">
                      <div className="adm-card-icon" style={{ background: "rgba(59,130,246,0.1)" }}>👥</div>
                      <div>
                        <div className="adm-card-value" style={{ color: "var(--blue)" }}>
                          {dashboard.totalUsers}
                        </div>
                        <div className="adm-card-label">Total Users</div>
                      </div>
                    </div>
                    <div className="adm-card">
                      <div className="adm-card-icon" style={{ background: "rgba(16,185,129,0.1)" }}>🚑</div>
                      <div>
                        <div className="adm-card-value" style={{ color: "var(--green)" }}>
                          {dashboard.availableVehicles}
                        </div>
                        <div className="adm-card-label">Available Vehicles</div>
                      </div>
                    </div>
                    <div className="adm-card" onClick={() => setTab("alerts")} style={{ cursor: "pointer" }}>
                      <div className="adm-card-icon" style={{ background: "rgba(232,87,26,0.1)" }}>📡</div>
                      <div>
                        <div className="adm-card-value" style={{ color: "var(--orange)" }}>
                          {alertCount}
                        </div>
                        <div className="adm-card-label">Live Alerts</div>
                      </div>
                    </div>
                  </div>

                  <div className="adm-section-title">Recent Sessions</div>
                  {dashboard.recentSessions.length === 0 ? (
                    <div className="adm-empty">No sessions recorded yet.</div>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.recentSessions.map((s) => (
                            <tr key={s._id}>
                              <td className="mono">{s._id.slice(-8)}</td>
                              <td>{s.userId?.name || "—"}</td>
                              <td>
                                <span className={`status-badge status-${s.status}`}>{s.status}</span>
                              </td>
                              <td><span className="mono">P{s.priority}</span></td>
                              <td className="mono">{new Date(s.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ─── USERS TAB ─── */}
              {tab === "users" && (
                <>
                  <div className="adm-section-title">All Users ({users.length})</div>
                  {users.length === 0 ? (
                    <div className="adm-empty">No users found.</div>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Phone</th>
                            <th>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u._id}>
                              <td style={{ fontWeight: 600 }}>{u.name}</td>
                              <td className="mono">{u.email}</td>
                              <td>
                                <span className={`role-badge ${u.role === "admin" ? "role-admin" : ""}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="mono">{u.phone || "—"}</td>
                              <td className="mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ─── SESSIONS TAB ─── */}
              {tab === "sessions" && (
                <>
                  <div className="adm-filter">
                    <label>Filter by status:</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div className="adm-section-title">Sessions ({sessions.length})</div>
                  {sessions.length === 0 ? (
                    <div className="adm-empty">No sessions found.</div>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Vehicle</th>
                            <th>Created</th>
                            <th>Resolved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((s) => (
                            <tr key={s._id}>
                              <td className="mono">{s._id.slice(-8)}</td>
                              <td>{s.userId?.name || "—"}</td>
                              <td>
                                <span className={`status-badge status-${s.status}`}>{s.status}</span>
                              </td>
                              <td><span className="mono">P{s.priority}</span></td>
                              <td>{s.vehicleId?.type || "—"}</td>
                              <td className="mono">{new Date(s.createdAt).toLocaleString()}</td>
                              <td className="mono">{s.resolvedAt ? new Date(s.resolvedAt).toLocaleString() : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ─── ALERTS TAB ─── */}
              {tab === "alerts" && (
                <>
                  {/* Header with controls */}
                  <div className="alerts-header">
                    <div className="alerts-header-left">
                      <h3>
                        <span className={`alerts-live-dot ${alertsPaused ? "paused" : ""}`}></span>
                        {alertsPaused ? "PAUSED" : "LIVE"} Ambulance Alerts
                      </h3>
                      <span className="alerts-counter">{alertCount} total</span>
                    </div>
                    <div className="alerts-controls">
                      <button
                        className={`alert-ctrl-btn ${simActive ? "active" : ""}`}
                        onClick={() => setSimActive(!simActive)}
                      >
                        {simActive ? "⏸️ Sim" : "▶️ Sim"}
                      </button>
                      <button
                        className={`alert-ctrl-btn ${soundEnabled ? "active" : ""}`}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                      >
                        {soundEnabled ? "🔊" : "🔇"}
                      </button>
                      <button
                        className={`alert-ctrl-btn ${alertsPaused ? "active" : ""}`}
                        onClick={() => setAlertsPaused(!alertsPaused)}
                      >
                        {alertsPaused ? "▶️ Resume" : "⏸️ Pause"}
                      </button>
                      <button className="alert-ctrl-btn danger" onClick={clearAlerts}>
                        🗑️ Clear
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="alert-stats">
                    <div className="alert-stat">
                      <div className="alert-stat-value" style={{ color: "var(--red)" }}>
                        {alerts.filter((a) => a.severity === "critical").length}
                      </div>
                      <div className="alert-stat-label">Critical</div>
                    </div>
                    <div className="alert-stat">
                      <div className="alert-stat-value" style={{ color: "#D97706" }}>
                        {alerts.filter((a) => a.severity === "warning").length}
                      </div>
                      <div className="alert-stat-label">Warnings</div>
                    </div>
                    <div className="alert-stat">
                      <div className="alert-stat-value" style={{ color: "var(--blue)" }}>
                        {alerts.filter((a) => a.severity === "info").length}
                      </div>
                      <div className="alert-stat-label">Info</div>
                    </div>
                    <div className="alert-stat">
                      <div className="alert-stat-value" style={{ color: "var(--green)" }}>
                        {alerts.filter((a) => a.type === "lane-detected" || a.type === "corridor-proximity").length}
                      </div>
                      <div className="alert-stat-label">Lane Detections</div>
                    </div>
                    <div className="alert-stat">
                      <div className="alert-stat-value" style={{ color: "var(--orange)" }}>
                        {alerts.filter((a) => a.type === "signal-change").length}
                      </div>
                      <div className="alert-stat-label">Signals Changed</div>
                    </div>
                  </div>

                  {/* Alert feed */}
                  <div className={`alert-feed ${alerts.some((a) => a.isNew) ? "has-new" : ""}`}>
                    {/* Critical banner when there are active critical alerts */}
                    {alerts.length > 0 && alerts.filter((a) => a.severity === "critical" && a.isNew).length > 0 && (
                      <div className="alert-banner critical-banner">
                        <span className="alert-banner-icon">🚨</span>
                        <span>
                          <strong>{alerts.filter((a) => a.severity === "critical" && a.isNew).length} CRITICAL ALERT{alerts.filter((a) => a.severity === "critical" && a.isNew).length > 1 ? "S" : ""}</strong>
                          {" "} — Ambulance detected in active corridor. Immediate attention required.
                        </span>
                      </div>
                    )}

                    {/* Column headers */}
                    <div className="alert-feed-header">
                      <span></span>
                      <span>Severity</span>
                      <span>Alert Message</span>
                      <span style={{ textAlign: "right" }}>Time</span>
                    </div>

                    {/* Alert rows */}
                    {alerts.length === 0 ? (
                      <div className="alert-empty">
                        <div className="alert-empty-icon">📡</div>
                        <div>No alerts yet. Waiting for ambulance activity...</div>
                        <div style={{ fontSize: "0.78rem", marginTop: 8, color: "var(--muted)" }}>
                          Alerts will appear here when ambulances are detected nearby or in active corridors.
                        </div>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`alert-row severity-${alert.severity} ${alert.isNew ? "new" : ""}`}
                        >
                          <div className="alert-icon">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div>
                            <span className={`alert-severity sev-${alert.severity}`}>
                              {alert.severity}
                            </span>
                          </div>
                          <div className="alert-message">
                            {alert.message}
                          </div>
                          <div className="alert-time">
                            {formatTimeAgo(alert.timestamp)}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={alertsEndRef} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
