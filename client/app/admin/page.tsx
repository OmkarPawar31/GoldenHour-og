"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "../../services/api";

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

type Tab = "overview" | "users" | "sessions";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
    window.location.href = "/auth";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

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

        /* Page title */
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
        }
        .adm-tab:hover { background: var(--slate); color: var(--text); }
        .adm-tab.active {
          background: var(--orange); color: #fff; font-weight: 700;
          box-shadow: 0 2px 12px rgba(232,87,26,0.3);
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

        /* Mono text */
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--muted); }
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
