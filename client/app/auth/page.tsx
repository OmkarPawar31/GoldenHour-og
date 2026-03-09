"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "ambulance" | "private" | "driver" | "admin";
type Mode = "login" | "register";

const ROLES = [
    { key: "ambulance" as Role, icon: "🚑", label: "Ambulance", desc: "Emergency services vehicle", color: "#FF6B1A", priority: "P-100" },
    { key: "private" as Role, icon: "🚗", label: "Private Emergency", desc: "Urgent personal vehicle", color: "#FFB347", priority: "P-70" },
    { key: "driver" as Role, icon: "🙋", label: "Normal Driver", desc: "Receive corridor alerts", color: "#60A5FA", priority: "P-10" },
    { key: "admin" as Role, icon: "🖥️", label: "Admin", desc: "Traffic control dashboard", color: "#34D399", priority: "CTL" },
];

function AuthContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<Mode>("login");
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", vehicleId: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (searchParams.get("mode") === "register") setMode("register");
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (mode === "register" && !selectedRole) {
            setError("Please select your role to continue.");
            return;
        }
        setLoading(true);

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

            if (mode === "register") {
                // Map frontend role to backend role
                const roleMap: Record<Role, string> = {
                    ambulance: "driver",
                    private: "user",
                    driver: "driver",
                    admin: "admin",
                };
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        password: form.password,
                        role: roleMap[selectedRole!],
                        phone: form.phone || "0000000000",
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Registration failed");
                localStorage.setItem("gh_token", data.token);
                localStorage.setItem("gh_user", JSON.stringify(data.user));
                localStorage.setItem("gh_role", selectedRole!);
            } else {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: form.email,
                        password: form.password,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Login failed");
                localStorage.setItem("gh_token", data.token);
                localStorage.setItem("gh_user", JSON.stringify(data.user));
                // Infer frontend role from backend role
                const backendRole = data.user.role;
                const inferredRole = backendRole === "admin" ? "admin" : backendRole === "driver" ? "ambulance" : "private";
                localStorage.setItem("gh_role", inferredRole);
                if (!selectedRole) setSelectedRole(inferredRole as Role);
            }

            const role = selectedRole || "ambulance";
            const routes: Record<Role, string> = {
                ambulance: "/ambulance",
                private: "/private-emergency",
                driver: "/driver",
                admin: "/admin",
            };
            router.push(routes[role]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --midnight: #050C1A;
          --navy:     #0A1628;
          --navy2:    #0F2040;
          --orange:   #FF6B1A;
          --amber:    #FFB347;
          --white:    #F5F7FA;
          --muted:    #8A9BB5;
          --danger:   #FF4444;
          --success:  #34D399;
        }

        html, body { height: 100%; }

        body {
          background: var(--midnight);
          color: var(--white);
          font-family: 'DM Sans', sans-serif;
          overflow-x: auto;
        }

        /* Grid bg */
        body::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(255,107,26,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,107,26,0.035) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none; z-index: 0;
        }

        /* Orbs */
        .orb {
          position: fixed; border-radius: 50%;
          filter: blur(100px); pointer-events: none; z-index: 0;
          animation: orbDrift 14s ease-in-out infinite alternate;
        }
        .orb-1 { width:500px;height:500px;background:rgba(255,107,26,0.07);top:-100px;left:-100px; }
        .orb-2 { width:400px;height:400px;background:rgba(10,60,120,0.2);bottom:0;right:-50px;animation-delay:-7s; }
        @keyframes orbDrift { 0%{transform:translate(0,0)}100%{transform:translate(20px,15px)} }

        /* Layout */
        .auth-layout {
          display: flex; min-height: 100vh; position: relative; z-index: 1;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          flex: 1; display: none;
          flex-direction: column; justify-content: space-between;
          padding: 3rem 4rem; position: relative; overflow: hidden;
          background: var(--navy);
          border-right: 1px solid rgba(255,107,26,0.1);
        }
        @media(min-width:1024px){ .left-panel { display: flex; } }

        /* Skyline */
        .skyline {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 200px; pointer-events: none;
        }

        /* Logo */
        .logo-wrap { display:flex;align-items:center;gap:0.6rem;text-decoration:none;position:relative;z-index:2; }
        .logo-icon  { position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center; }
        .logo-ring  { position:absolute;width:32px;height:32px;border:2px solid #FF6B1A;border-radius:50%;animation:logoPulse 2s ease-out infinite; }
        .logo-ring:nth-child(2) { animation-delay:0.7s; }
        @keyframes logoPulse{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
        .logo-dot   { width:9px;height:9px;background:#FF6B1A;border-radius:50%;z-index:1;position:relative;box-shadow:0 0 10px #FF6B1A; }
        .logo-text  { font-family:'Bebas Neue',cursive;font-size:1.5rem;letter-spacing:0.08em;color:var(--white); }
        .logo-text em { color:#FF6B1A;font-style:normal; }

        /* Left middle content */
        .left-content { position:relative;z-index:2; }

        .sys-badge {
          display:inline-flex;align-items:center;gap:0.4rem;
          background:rgba(255,107,26,0.08);border:1px solid rgba(255,107,26,0.2);
          border-radius:100px;padding:0.28rem 0.85rem;
          font-family:'JetBrains Mono',monospace;font-size:0.67rem;
          color:#FF6B1A;letter-spacing:0.08em;margin-bottom:1.5rem;
        }
        .sys-dot { width:6px;height:6px;background:#FF6B1A;border-radius:50%;animation:blink 1.2s infinite; }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}

        .left-heading {
          font-family:'Bebas Neue',cursive;
          font-size:3.2rem;line-height:0.95;letter-spacing:0.02em;
          color:var(--white);margin-bottom:1rem;
        }
        .left-heading span { color:#FF6B1A; }

        .left-sub { color:var(--muted);font-size:0.93rem;line-height:1.65;max-width:340px; }

        /* Mini stat cards */
        .mini-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-top:2.5rem; }
        .mini-stat {
          background:rgba(255,107,26,0.06);
          border:1px solid rgba(255,107,26,0.12);
          border-radius:10px;padding:1rem;
        }
        .mini-stat-num { font-family:'Bebas Neue',cursive;font-size:1.7rem;color:#FF6B1A;letter-spacing:0.04em; }
        .mini-stat-label { font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--muted);letter-spacing:0.05em;margin-top:0.2rem; }

        /* Left bottom ping */
        .left-bottom { display:flex;align-items:center;gap:0.75rem;position:relative;z-index:2; }
        .ping-wrap {
          position:relative;width:44px;height:44px;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }
        .ping-ring {
          position:absolute;inset:0;border-radius:50%;
          border:1px solid rgba(255,107,26,0.4);
          animation:pingExpand 2.5s ease-out infinite;
        }
        .ping-ring:nth-child(2){animation-delay:0.8s;}
        @keyframes pingExpand{0%{transform:scale(0.5);opacity:1}100%{transform:scale(1);opacity:0}}
        .ping-dot { width:10px;height:10px;background:#FF6B1A;border-radius:50%;box-shadow:0 0 8px #FF6B1A; }
        .ping-label-top  { font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:#FF6B1A;letter-spacing:0.06em; }
        .ping-label-bot  { font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--muted);margin-top:0.1rem; }

        /* ── RIGHT PANEL ── */
        .right-panel {
          flex:1;display:flex;align-items:center;justify-content:center;
          padding:3rem 2rem;position:relative;z-index:1;
          overflow-y:auto;
        }
        .form-box { width:100%;max-width:420px; }

        /* Mobile logo */
        .mobile-logo { display:flex;align-items:center;gap:0.5rem;text-decoration:none;margin-bottom:2rem; }
        @media(min-width:1024px){ .mobile-logo { display:none; } }

        /* Mode toggle */
        .mode-toggle {
          display:flex;padding:5px;border-radius:8px;margin-bottom:2rem;
          background:var(--navy);border:1px solid rgba(255,107,26,0.12);
        }
        .mode-btn {
          flex:1;padding:0.65rem;border-radius:5px;font-size:0.875rem;
          font-family:'DM Sans',sans-serif;font-weight:500;
          border:none;cursor:pointer;transition:all 0.2s;
        }
        .mode-btn.active  { background:#FF6B1A;color:#050C1A;font-weight:700; }
        .mode-btn.inactive { background:transparent;color:var(--muted); }
        .mode-btn.inactive:hover { color:var(--white); }

        /* Form heading */
        .form-heading { font-family:'Bebas Neue',cursive;font-size:2.6rem;line-height:0.95;margin-bottom:0.5rem; }
        .form-heading span { color:#FF6B1A; }
        .form-sub { color:var(--muted);font-size:0.875rem;margin-bottom:1.8rem;line-height:1.5; }

        /* Role selector */
        .role-label {
          font-family:'JetBrains Mono',monospace;font-size:0.65rem;
          color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;
          display:block;margin-bottom:0.6rem;
        }
        .role-grid { display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1.5rem; }
        .role-btn {
          display:flex;align-items:flex-start;gap:0.6rem;padding:0.75rem;
          border-radius:8px;cursor:pointer;transition:all 0.2s;
          font-family:'DM Sans',sans-serif;text-align:left;
          position:relative;
        }
        .role-btn.unselected {
          background:var(--navy);border:1px solid rgba(255,255,255,0.07);
        }
        .role-btn.unselected:hover { border-color:rgba(255,107,26,0.3); }
        .role-btn-icon { font-size:1.3rem;flex-shrink:0;margin-top:0.1rem; }
        .role-btn-name { font-size:0.8rem;font-weight:600;color:var(--white);display:block; }
        .role-btn-desc { font-size:0.7rem;color:var(--muted);display:block;margin-top:0.1rem; }
        .role-btn-pri  { font-family:'JetBrains Mono',monospace;font-size:0.6rem;display:block;margin-top:0.25rem; }
        .role-check {
          position:absolute;top:0.5rem;right:0.5rem;
          width:16px;height:16px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:0.55rem;font-weight:700;color:#050C1A;
        }

        /* Inputs */
        .field { margin-bottom:1rem; }
        .field-label {
          font-family:'JetBrains Mono',monospace;font-size:0.64rem;
          color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;
          display:block;margin-bottom:0.4rem;
        }
        .field-input {
          width:100%;padding:0.8rem 1rem;border-radius:7px;
          background:var(--navy);
          border:1px solid rgba(255,255,255,0.09);
          color:var(--white);font-size:0.9rem;
          font-family:'DM Sans',sans-serif;
          transition:border-color 0.2s,box-shadow 0.2s;
          outline:none;
        }
        .field-input::placeholder { color:rgba(138,155,181,0.5); }
        .field-input:focus {
          border-color:#FF6B1A;
          box-shadow:0 0 0 3px rgba(255,107,26,0.12);
        }

        /* Error */
        .error-box {
          display:flex;align-items:center;gap:0.5rem;
          padding:0.75rem 1rem;border-radius:7px;margin-bottom:1rem;
          background:rgba(255,68,68,0.08);
          border:1px solid rgba(255,68,68,0.25);
          color:#FF6666;font-size:0.8rem;
          font-family:'JetBrains Mono',monospace;
        }

        /* Submit */
        .submit-btn {
          width:100%;padding:0.9rem;border-radius:7px;
          background:#FF6B1A;color:#050C1A;
          font-size:0.95rem;font-weight:700;
          font-family:'DM Sans',sans-serif;
          border:none;cursor:pointer;
          box-shadow:0 4px 24px rgba(255,107,26,0.35);
          transition:all 0.2s;margin-top:0.5rem;
          display:flex;align-items:center;justify-content:center;gap:0.5rem;
        }
        .submit-btn:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 8px 32px rgba(255,107,26,0.45);background:var(--amber); }
        .submit-btn:disabled { opacity:0.6;cursor:not-allowed; }

        /* Spinner */
        .spinner {
          width:16px;height:16px;border-radius:50%;
          border:2px solid #050C1A;border-top-color:transparent;
          animation:spin 0.7s linear infinite;
        }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Toggle link */
        .toggle-row { margin-top:1.5rem;text-align:center;font-size:0.85rem;color:var(--muted); }
        .toggle-btn {
          color:#FF6B1A;font-weight:600;background:none;border:none;
          cursor:pointer;font-size:0.85rem;font-family:'DM Sans',sans-serif;
          text-decoration:underline;text-underline-offset:2px;
        }

        /* Back */
        .back-link {
          display:block;text-align:center;margin-top:2rem;
          font-family:'JetBrains Mono',monospace;font-size:0.68rem;
          color:var(--muted);text-decoration:none;
          transition:color 0.2s;letter-spacing:0.04em;
        }
        .back-link:hover { color:#FF6B1A; }

        /* Divider */
        .or-divider {
          display:flex;align-items:center;gap:0.75rem;
          margin:1.25rem 0;color:var(--muted);font-size:0.78rem;
        }
        .or-line { flex:1;height:1px;background:rgba(255,255,255,0.08); }

        /* Optional tag */
        .opt-tag { opacity:0.45;font-weight:400; }
      `}</style>

            <div className="auth-layout">
                {/* Orbs */}
                <div className="orb orb-1" />
                <div className="orb orb-2" />

                {/* ══ LEFT PANEL ══ */}
                <div className="left-panel">
                    {/* Logo */}
                    <Link href="/" className="logo-wrap">
                        <div className="logo-icon">
                            <div className="logo-ring" />
                            <div className="logo-ring" />
                            <div className="logo-dot" />
                        </div>
                        <span className="logo-text">Golden<em>Hour</em></span>
                    </Link>

                    {/* Center content */}
                    <div className="left-content">
                        <div className="sys-badge">
                            <div className="sys-dot" />
                            SYSTEM ACTIVE
                        </div>
                        <h2 className="left-heading">
                            Join the <span>Corridor</span><br />Network.
                        </h2>
                        <p className="left-sub">
                            Every role matters. Whether you're driving the ambulance or clearing the path — you're part of saving a life.
                        </p>
                        <div className="mini-stats">
                            {[
                                { v: "<3s", l: "Alert Latency" },
                                { v: "200m", l: "Geo-fence" },
                                { v: "100", l: "Amb. Priority" },
                            ].map((s) => (
                                <div className="mini-stat" key={s.l}>
                                    <div className="mini-stat-num">{s.v}</div>
                                    <div className="mini-stat-label">{s.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom ping */}
                    <div className="left-bottom">
                        <div className="ping-wrap">
                            <div className="ping-ring" />
                            <div className="ping-ring" />
                            <div className="ping-dot" />
                        </div>
                        <div>
                            <div className="ping-label-top">CORRIDOR NETWORK</div>
                            <div className="ping-label-bot">0 active emergencies</div>
                        </div>
                    </div>

                    {/* City skyline SVG */}
                    <svg className="skyline" viewBox="0 0 900 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="120" width="900" height="80" fill="#050C1A" />
                        <rect x="10" y="80" width="55" height="120" fill="#0A1628" />
                        <rect x="75" y="50" width="38" height="150" fill="#0A1628" />
                        <rect x="123" y="88" width="48" height="112" fill="#0A1628" />
                        <rect x="181" y="28" width="75" height="172" fill="#0A1628" />
                        <rect x="266" y="68" width="42" height="132" fill="#0A1628" />
                        <rect x="318" y="8" width="58" height="192" fill="#0A1628" />
                        <rect x="386" y="55" width="68" height="145" fill="#0A1628" />
                        <rect x="464" y="38" width="48" height="162" fill="#0A1628" />
                        <rect x="522" y="72" width="38" height="128" fill="#0A1628" />
                        <rect x="570" y="18" width="72" height="182" fill="#0A1628" />
                        <rect x="652" y="52" width="52" height="148" fill="#0A1628" />
                        <rect x="714" y="82" width="42" height="118" fill="#0A1628" />
                        <rect x="766" y="30" width="65" height="170" fill="#0A1628" />
                        <rect x="841" y="65" width="55" height="135" fill="#0A1628" />
                        {/* Windows */}
                        {[
                            [25, 90], [35, 90], [25, 108], [35, 108], [90, 62], [90, 80], [90, 98],
                            [196, 40], [196, 58], [196, 76], [210, 40], [210, 58], [210, 76],
                            [330, 20], [330, 38], [330, 56], [344, 20], [344, 38], [344, 56],
                            [400, 65], [400, 83], [414, 65], [414, 83],
                            [585, 30], [585, 48], [599, 30], [599, 48],
                        ].map(([x, y], i) => (
                            <rect key={i} x={x} y={y} width="5" height="5" rx="1"
                                fill={i % 3 === 0 ? "rgba(255,179,71,0.6)" : "rgba(255,107,26,0.35)"}
                                style={{ animation: `blink ${1.5 + (i % 4) * 0.4}s ${i * 0.15}s ease-in-out infinite` }}
                            />
                        ))}
                    </svg>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="right-panel">
                    <div className="form-box">

                        {/* Mobile logo */}
                        <Link href="/" className="mobile-logo">
                            <div className="logo-icon" style={{ width: 28, height: 28 }}>
                                <div className="logo-ring" style={{ width: 28, height: 28 }} />
                                <div className="logo-ring" style={{ width: 28, height: 28 }} />
                                <div className="logo-dot" style={{ width: 8, height: 8 }} />
                            </div>
                            <span className="logo-text" style={{ fontSize: "1.3rem" }}>Golden<em>Hour</em></span>
                        </Link>

                        {/* Mode toggle */}
                        <div className="mode-toggle">
                            {(["login", "register"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    className={`mode-btn ${mode === m ? "active" : "inactive"}`}
                                    onClick={() => { setMode(m); setError(""); setSelectedRole(null); }}
                                >
                                    {m === "login" ? "Sign In" : "Register"}
                                </button>
                            ))}
                        </div>

                        {/* Heading */}
                        <h1 className="form-heading">
                            {mode === "login"
                                ? <>Welcome <span>Back.</span></>
                                : <>Join the <span>Network.</span></>}
                        </h1>
                        <p className="form-sub">
                            {mode === "login"
                                ? "Sign in to access your emergency dashboard."
                                : "Create your account and select your role below."}
                        </p>

                        {/* Role selector — register only */}
                        {mode === "register" && (
                            <>
                                <span className="role-label">Select Your Role *</span>
                                <div className="role-grid">
                                    {ROLES.map((r) => {
                                        const selected = selectedRole === r.key;
                                        return (
                                            <button
                                                key={r.key}
                                                type="button"
                                                className={`role-btn ${selected ? "" : "unselected"}`}
                                                onClick={() => setSelectedRole(r.key)}
                                                style={selected ? {
                                                    background: `${r.color}12`,
                                                    border: `1px solid ${r.color}`,
                                                } : {}}
                                            >
                                                <span className="role-btn-icon">{r.icon}</span>
                                                <span>
                                                    <span className="role-btn-name">{r.label}</span>
                                                    <span className="role-btn-desc">{r.desc}</span>
                                                    <span className="role-btn-pri" style={{ color: r.color }}>{r.priority}</span>
                                                </span>
                                                {selected && (
                                                    <span className="role-check" style={{ background: r.color }}>✓</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit}>

                            {mode === "register" && (
                                <div className="field">
                                    <label className="field-label">Full Name</label>
                                    <input
                                        className="field-input"
                                        type="text"
                                        required
                                        placeholder="John Doe"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                            )}

                            {mode === "register" && (
                                <div className="field">
                                    <label className="field-label">Phone Number</label>
                                    <input
                                        className="field-input"
                                        type="tel"
                                        required
                                        placeholder="+91 98765 43210"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="field">
                                <label className="field-label">Email Address</label>
                                <input
                                    className="field-input"
                                    type="email"
                                    required
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div className="field">
                                <label className="field-label">Password</label>
                                <input
                                    className="field-input"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                            </div>

                            {mode === "register" && (
                                <div className="field">
                                    <label className="field-label">
                                        Vehicle ID <span className="opt-tag">(optional)</span>
                                    </label>
                                    <input
                                        className="field-input"
                                        type="text"
                                        placeholder="AMB-MH-001"
                                        value={form.vehicleId}
                                        onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="error-box">
                                    ⚠ {error}
                                </div>
                            )}

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? (
                                    <><div className="spinner" /> Authenticating…</>
                                ) : mode === "login" ? (
                                    "Sign In →"
                                ) : (
                                    "Create Account →"
                                )}
                            </button>
                        </form>

                        {/* Toggle */}
                        <div className="toggle-row">
                            {mode === "login" ? "Don't have an account? " : "Already registered? "}
                            <button
                                className="toggle-btn"
                                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSelectedRole(null); }}
                            >
                                {mode === "login" ? "Register here" : "Sign in"}
                            </button>
                        </div>

                        {/* Back */}
                        <Link href="/" className="back-link">← Back to Golden Hour</Link>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div style={{ backgroundColor: '#050C1A', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" style={{ width: '32px', height: '32px', borderColor: '#FF6B1A', borderTopColor: 'transparent', borderRadius: '50%', borderWidth: '3px', borderStyle: 'solid', animation: 'spin 1s linear infinite' }} /></div>}>
            <AuthContent />
        </Suspense>
    );
}