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
    if (tab === "users" && users.length === 0) loadUsers().catch(() => {});
    if (tab === "sessions") loadSessions().catch(() => {});
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #060e1c; }
        .adm-wrap {
          min-height: 100vh; background: linear-gradient(135deg, #060e1c 0%, #0a1628 50%, #0d1f3c 100%);
          color: #c8d6e5; font-family: 'Inter', system-ui, sans-serif;
        }
        .adm-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(6,14,28,0.8); backdrop-filter: blur(20px);
        }
        .adm-topbar h1 { font-size: 1.5rem; color: #f0c040; font-weight: 700; }
        .adm-topbar-actions { display: flex; gap: 12px; align-items: center; }
        .adm-topbar-actions a, .adm-topbar-actions button {
          padding: 8px 18px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
          color: #8a9bb5; text-decoration: none; transition: all 0.2s;
        }
        .adm-topbar-actions a:hover, .adm-topbar-actions button:hover {
          background: rgba(255,255,255,0.08); color: #fff;
        }
        .adm-body { padding: 32px; max-width: 1200px; margin: 0 auto; }
        .adm-tabs { display: flex; gap: 8px; margin-bottom: 32px; }
        .adm-tab {
          padding: 10px 22px; border-radius: 8px; font-size: 0.9rem; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          color: #8a9bb5; transition: all 0.2s;
        }
        .adm-tab:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .adm-tab.active { background: rgba(240,192,64,0.12); border-color: rgba(240,192,64,0.3); color: #f0c040; }
        .adm-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .adm-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 28px; text-align: center;
        }
        .adm-card-value { font-size: 2.5rem; font-weight: 800; }
        .adm-card-label { font-size: 0.85rem; color: #6b7c93; margin-top: 4px; }
        .adm-section-title { font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 16px; }
        .adm-table-wrap { overflow-x: auto; }
        .adm-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .adm-table th {
          text-align: left; padding: 10px 14px; font-size: 0.8rem; color: #6b7c93;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .adm-table td { padding: 12px 14px; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .status-badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
        }
        .status-active { background: rgba(0,200,83,0.12); color: #00c853; }
        .status-pending { background: rgba(240,192,64,0.12); color: #f0c040; }
        .status-resolved { background: rgba(138,155,181,0.12); color: #8a9bb5; }
        .role-badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
          background: rgba(100,149,237,0.12); color: #6495ed;
        }
        .role-admin { background: rgba(240,192,64,0.12); color: #f0c040; }
        .adm-filter { display: flex; gap: 8px; margin-bottom: 20px; align-items: center; }
        .adm-filter select {
          padding: 8px 14px; border-radius: 8px; font-size: 0.85rem;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #c8d6e5; cursor: pointer;
        }
        .adm-filter select option { background: #0a1628; }
        .adm-empty { text-align: center; padding: 40px; color: #6b7c93; }
        .adm-error { text-align: center; padding: 60px; color: #e74c3c; font-size: 1rem; }
        .adm-loading { text-align: center; padding: 80px; color: #6b7c93; }
      `}</style>

      <div className="adm-wrap">
        <div className="adm-topbar">
          <h1>⏱ GoldenHour Admin</h1>
          <div className="adm-topbar-actions">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/">Home</Link>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="adm-body">
          {loading ? (
            <div className="adm-loading">Loading admin panel...</div>
          ) : error ? (
            <div className="adm-error">
              {error}
              {error === "Not logged in" && (
                <div style={{ marginTop: 16 }}>
                  <Link href="/auth" style={{ color: "#f0c040" }}>Go to Login</Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="adm-tabs">
                <button className={`adm-tab ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
                  Overview
                </button>
                <button className={`adm-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
                  Users
                </button>
                <button className={`adm-tab ${tab === "sessions" ? "active" : ""}`} onClick={() => setTab("sessions")}>
                  Sessions
                </button>
              </div>

              {/* ─── OVERVIEW TAB ─── */}
              {tab === "overview" && dashboard && (
                <>
                  <div className="adm-cards">
                    <div className="adm-card">
                      <div className="adm-card-value" style={{ color: "#e74c3c" }}>
                        {dashboard.activeEmergencies}
                      </div>
                      <div className="adm-card-label">Active Emergencies</div>
                    </div>
                    <div className="adm-card">
                      <div className="adm-card-value" style={{ color: "#6495ed" }}>
                        {dashboard.totalUsers}
                      </div>
                      <div className="adm-card-label">Total Users</div>
                    </div>
                    <div className="adm-card">
                      <div className="adm-card-value" style={{ color: "#00c853" }}>
                        {dashboard.availableVehicles}
                      </div>
                      <div className="adm-card-label">Available Vehicles</div>
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
                              <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                                {s._id.slice(-8)}
                              </td>
                              <td>{s.userId?.name || "—"}</td>
                              <td>
                                <span className={`status-badge status-${s.status}`}>{s.status}</span>
                              </td>
                              <td>P{s.priority}</td>
                              <td>{new Date(s.createdAt).toLocaleString()}</td>
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
                              <td>{u.name}</td>
                              <td>{u.email}</td>
                              <td>
                                <span className={`role-badge ${u.role === "admin" ? "role-admin" : ""}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td>{u.phone || "—"}</td>
                              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
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
                    <span style={{ color: "#6b7c93", fontSize: "0.85rem" }}>Filter:</span>
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
                              <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                                {s._id.slice(-8)}
                              </td>
                              <td>{s.userId?.name || "—"}</td>
                              <td>
                                <span className={`status-badge status-${s.status}`}>{s.status}</span>
                              </td>
                              <td>P{s.priority}</td>
                              <td>{s.vehicleId?.type || "—"}</td>
                              <td>{new Date(s.createdAt).toLocaleString()}</td>
                              <td>{s.resolvedAt ? new Date(s.resolvedAt).toLocaleString() : "—"}</td>
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
