"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "../../services/api";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface SessionEntry {
  _id: string;
  status: string;
  priority: number;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  createdAt: string;
  resolvedAt?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("gh_token");
        if (!token) {
          setError("Not logged in");
          setLoading(false);
          return;
        }

        const profileRes = await apiGet<{ user: UserProfile }>("/users/profile");
        setUser(profileRes.user);

        try {
          const activeSessions = await apiGet<SessionEntry[]>("/emergency/active");
          setSessions(activeSessions);
        } catch {
          setSessions([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleLogout() {
    localStorage.removeItem("gh_token");
    localStorage.removeItem("gh_user");
    localStorage.removeItem("gh_role");
    window.location.href = "/auth";
  }

  const role = typeof window !== "undefined" ? localStorage.getItem("gh_role") || "user" : "user";

  const activeSessions = sessions.filter((s) => s.status === "active" || s.status === "pending");

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #060e1c; }
        .dash-wrap {
          min-height: 100vh; background: linear-gradient(135deg, #060e1c 0%, #0a1628 50%, #0d1f3c 100%);
          color: #c8d6e5; font-family: 'Inter', system-ui, sans-serif;
        }
        .dash-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(6,14,28,0.8); backdrop-filter: blur(20px);
        }
        .dash-topbar h1 { font-size: 1.5rem; color: #f0c040; font-weight: 700; }
        .dash-topbar-actions { display: flex; gap: 12px; align-items: center; }
        .dash-topbar-actions a, .dash-topbar-actions button {
          padding: 8px 18px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
          color: #8a9bb5; text-decoration: none; transition: all 0.2s;
        }
        .dash-topbar-actions a:hover, .dash-topbar-actions button:hover {
          background: rgba(255,255,255,0.08); color: #fff;
        }
        .dash-body { padding: 32px; max-width: 1100px; margin: 0 auto; }
        .dash-greeting { font-size: 1.8rem; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .dash-role { font-size: 0.95rem; color: #6b7c93; margin-bottom: 32px; }
        .dash-role span {
          background: rgba(240,192,64,0.12); color: #f0c040; padding: 3px 10px;
          border-radius: 20px; font-size: 0.82rem; margin-left: 8px;
        }
        .dash-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .dash-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 24px; text-align: center;
        }
        .dash-card-value { font-size: 2.2rem; font-weight: 800; color: #f0c040; }
        .dash-card-label { font-size: 0.85rem; color: #6b7c93; margin-top: 4px; }
        .dash-section-title { font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 16px; }
        .dash-quick-links { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 40px; }
        .dash-quick-link {
          display: flex; align-items: center; gap: 10px; padding: 16px 24px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; color: #c8d6e5; text-decoration: none;
          transition: all 0.2s; font-size: 0.95rem;
        }
        .dash-quick-link:hover { background: rgba(240,192,64,0.08); border-color: rgba(240,192,64,0.2); color: #fff; }
        .dash-table { width: 100%; border-collapse: collapse; }
        .dash-table th {
          text-align: left; padding: 10px 14px; font-size: 0.8rem; color: #6b7c93;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .dash-table td { padding: 12px 14px; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .status-badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
        }
        .status-active { background: rgba(0,200,83,0.12); color: #00c853; }
        .status-pending { background: rgba(240,192,64,0.12); color: #f0c040; }
        .status-resolved { background: rgba(138,155,181,0.12); color: #8a9bb5; }
        .dash-empty { text-align: center; padding: 40px; color: #6b7c93; font-size: 0.95rem; }
        .dash-error { text-align: center; padding: 60px; color: #e74c3c; font-size: 1rem; }
        .dash-loading { text-align: center; padding: 80px; color: #6b7c93; font-size: 1rem; }
      `}</style>

      <div className="dash-wrap">
        <div className="dash-topbar">
          <h1>⏱ GoldenHour</h1>
          <div className="dash-topbar-actions">
            <Link href="/">Home</Link>
            {role === "admin" && <Link href="/admin">Admin</Link>}
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="dash-body">
          {loading ? (
            <div className="dash-loading">Loading dashboard...</div>
          ) : error ? (
            <div className="dash-error">
              {error}
              {error === "Not logged in" && (
                <div style={{ marginTop: 16 }}>
                  <Link href="/auth" style={{ color: "#f0c040" }}>Go to Login</Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="dash-greeting">Welcome back, {user?.name || "User"}</div>
              <div className="dash-role">
                {user?.email} <span>{role}</span>
              </div>

              <div className="dash-cards">
                <div className="dash-card">
                  <div className="dash-card-value">{activeSessions.length}</div>
                  <div className="dash-card-label">Active Sessions</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-value">{sessions.length}</div>
                  <div className="dash-card-label">Total Sessions</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-value" style={{ color: "#00c853" }}>
                    {sessions.filter((s) => s.status === "resolved").length}
                  </div>
                  <div className="dash-card-label">Resolved</div>
                </div>
              </div>

              <div className="dash-section-title">Quick Actions</div>
              <div className="dash-quick-links">
                {(role === "ambulance" || role === "admin") && (
                  <Link href="/ambulance" className="dash-quick-link">🚑 Ambulance Mode</Link>
                )}
                {(role === "private" || role === "admin") && (
                  <Link href="/private-emergency" className="dash-quick-link">🆘 Private Emergency</Link>
                )}
                {(role === "driver" || role === "admin") && (
                  <Link href="/driver" className="dash-quick-link">🚗 Driver Mode</Link>
                )}
              </div>

              <div className="dash-section-title">Emergency Sessions</div>
              {sessions.length === 0 ? (
                <div className="dash-empty">No emergency sessions yet.</div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                          {s._id.slice(-8)}
                        </td>
                        <td>
                          <span className={`status-badge status-${s.status}`}>{s.status}</span>
                        </td>
                        <td>P{s.priority}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
