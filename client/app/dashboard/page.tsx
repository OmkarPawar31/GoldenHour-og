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

  const roleColors: Record<string, string> = {
    ambulance: "#E8571A",
    admin: "#10B981",
    private: "#F59E0B",
    driver: "#3B82F6",
    user: "#64748B",
  };
  const roleColor = roleColors[role] || "#64748B";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

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

        .dash-wrap { min-height: 100vh; background: var(--cream); }



        .dash-body { padding: 36px 32px; max-width: 1100px; margin: 0 auto; }

        /* Welcome banner */
        .dash-welcome {
          background: linear-gradient(135deg, #fff 0%, var(--warm) 100%);
          border: 1.5px solid var(--border);
          border-radius: 20px; padding: 28px 32px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px;
          box-shadow: 0 2px 16px rgba(232,87,26,0.06);
          animation: fadeUp 0.5s ease both;
          gap: 16px; flex-wrap: wrap;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .dash-welcome-left h1 { font-size: 1.75rem; font-weight: 800; color: var(--text); }
        .dash-welcome-left h1 span { color: var(--orange); }
        .dash-welcome-left p { font-size: 0.88rem; color: var(--muted); margin-top: 4px; }
        .dash-role-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          font-family: 'JetBrains Mono', monospace; font-size: 0.72rem;
          font-weight: 700; letter-spacing: 0.06em;
        }
        .dash-role-dot { width: 7px; height: 7px; border-radius: 50%; }

        /* Stat cards */
        .dash-cards {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 18px; margin-bottom: 32px;
        }
        .dash-card {
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 16px; padding: 22px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: all 0.3s; position: relative; overflow: hidden;
          animation: fadeUp 0.5s ease both;
        }
        .dash-card:hover { transform: translateY(-4px); box-shadow: 0 10px 32px rgba(0,0,0,0.09); }
        .dash-card::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
          background: var(--card-color, var(--orange));
          opacity: 0; transition: opacity 0.3s;
        }
        .dash-card:hover::after { opacity: 1; }
        .dash-card-icon { font-size: 1.6rem; margin-bottom: 10px; }
        .dash-card-value { font-size: 2.2rem; font-weight: 800; line-height: 1; }
        .dash-card-label { font-size: 0.83rem; color: var(--muted); margin-top: 6px; }

        /* Section title */
        .dash-section-title {
          font-size: 1rem; font-weight: 700; color: var(--text);
          margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
        }
        .dash-section-title::before {
          content: ''; width: 3px; height: 16px;
          background: var(--orange); border-radius: 2px; display: block;
        }

        /* Quick links */
        .dash-quick-links { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 32px; }
        .dash-quick-link {
          display: flex; align-items: center; gap: 10px; padding: 14px 22px;
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 12px; color: var(--text); text-decoration: none;
          transition: all 0.25s; font-size: 0.92rem; font-weight: 500;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .dash-quick-link:hover {
          background: var(--warm); border-color: rgba(232,87,26,0.3);
          color: var(--orange); transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(232,87,26,0.1);
        }

        /* Table */
        .dash-table-wrap {
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          overflow-x: auto;
        }
        .dash-table { width: 100%; border-collapse: collapse; }
        .dash-table th {
          text-align: left; padding: 12px 18px; font-size: 0.73rem;
          color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em;
          font-weight: 700; border-bottom: 1.5px solid var(--border);
          background: var(--slate); font-family: 'JetBrains Mono', monospace;
        }
        .dash-table td {
          padding: 14px 18px; font-size: 0.88rem;
          border-bottom: 1px solid rgba(226,232,240,0.6);
        }
        .dash-table tbody tr:hover td { background: var(--warm); }
        .dash-table tbody tr:last-child td { border-bottom: none; }

        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }
        .status-badge::before { content:''; width:6px;height:6px;border-radius:50%;flex-shrink:0; }
        .status-active { background: rgba(16,185,129,0.1); color: #059669; }
        .status-active::before { background: #059669; }
        .status-pending { background: rgba(245,158,11,0.1); color: #D97706; }
        .status-pending::before { background: #D97706; }
        .status-resolved { background: rgba(100,116,147,0.1); color: var(--muted); }
        .status-resolved::before { background: var(--muted); }

        .dash-empty {
          text-align: center; padding: 48px; color: var(--muted);
          font-size: 0.9rem;
        }
        .dash-error {
          text-align: center; padding: 60px; color: var(--red);
          font-size: 1rem; background: rgba(239,68,68,0.04);
          border-radius: 16px; border: 1.5px solid rgba(239,68,68,0.12);
        }
        .dash-loading {
          text-align: center; padding: 80px;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          color: var(--muted);
        }
        .loading-spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid rgba(232,87,26,0.15);
          border-top-color: var(--orange);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--muted); }
      `}</style>

      <div className="dash-wrap">


        <div className="dash-body">
          {loading ? (
            <div className="dash-loading">
              <div className="loading-spinner" />
              Loading dashboard...
            </div>
          ) : error ? (
            <div className="dash-error">
              {error}
              {error === "Not logged in" && (
                <div style={{ marginTop: 16 }}>
                  <Link href="/auth" style={{ color: "var(--orange)", fontWeight: 600 }}>Go to Login →</Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="dash-welcome">
                <div className="dash-welcome-left">
                  <h1>Welcome back, <span>{user?.name || "User"}</span> 👋</h1>
                  <p>{user?.email}</p>
                </div>
                <div
                  className="dash-role-badge"
                  style={{
                    background: `${roleColor}12`,
                    color: roleColor,
                    border: `1.5px solid ${roleColor}30`,
                  }}
                >
                  <div className="dash-role-dot" style={{ background: roleColor }} />
                  {role.toUpperCase()}
                </div>
              </div>

              <div className="dash-cards">
                <div className="dash-card" style={{ ["--card-color" as string]: "var(--orange)" }}>
                  <div className="dash-card-icon">🚨</div>
                  <div className="dash-card-value" style={{ color: "var(--orange)" }}>{activeSessions.length}</div>
                  <div className="dash-card-label">Active Sessions</div>
                </div>
                <div className="dash-card" style={{ ["--card-color" as string]: "var(--blue)" }}>
                  <div className="dash-card-icon">📋</div>
                  <div className="dash-card-value" style={{ color: "var(--blue)" }}>{sessions.length}</div>
                  <div className="dash-card-label">Total Sessions</div>
                </div>
                <div className="dash-card" style={{ ["--card-color" as string]: "var(--green)" }}>
                  <div className="dash-card-icon">✅</div>
                  <div className="dash-card-value" style={{ color: "var(--green)" }}>
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
                {role === "admin" && (
                  <Link href="/admin" className="dash-quick-link">🖥️ Admin Panel</Link>
                )}
              </div>

              <div className="dash-section-title">Emergency Sessions</div>
              {sessions.length === 0 ? (
                <div className="dash-table-wrap">
                  <div className="dash-empty">No emergency sessions yet.</div>
                </div>
              ) : (
                <div className="dash-table-wrap">
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
                          <td className="mono">{s._id.slice(-8)}</td>
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
        </div>
      </div>
    </>
  );
}
