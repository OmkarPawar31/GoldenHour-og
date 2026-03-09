"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "ambulance" | "private" | "driver" | "admin";
type Mode = "login" | "register";

const ROLES = [
    { key: "ambulance" as Role, icon: "🚑", label: "Ambulance", desc: "Emergency services vehicle", color: "#E8571A", priority: "P-100" },
    { key: "private" as Role, icon: "🚗", label: "Private Emergency", desc: "Urgent personal vehicle", color: "#F59E0B", priority: "P-70" },
    { key: "driver" as Role, icon: "🙋", label: "Normal Driver", desc: "Receive corridor alerts", color: "#3B82F6", priority: "P-10" },
    { key: "admin" as Role, icon: "🖥️", label: "Admin", desc: "Traffic control dashboard", color: "#10B981", priority: "CTL" },
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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --orange:  #E8571A;
          --orange2: #F97316;
          --amber:   #F59E0B;
          --cream:   #FFFBF5;
          --warm:    #FFF7ED;
          --slate:   #F1F5F9;
          --text:    #1E293B;
          --text2:   #334155;
          --muted:   #64748B;
          --border:  #E2E8F0;
          --card:    #FFFFFF;
          --danger:  #EF4444;
          --success: #10B981;
        }

        html, body { height: 100%; }

        body {
          background: var(--cream);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        /* Dot bg */
        body::before {
          content: '';
          position: fixed; inset: 0;
          background-image: radial-gradient(circle, rgba(232,87,26,0.1) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none; z-index: 0;
        }

        /* Orbs */
        .orb {
          position: fixed; border-radius: 50%;
          filter: blur(80px); pointer-events: none; z-index: 0;
          animation: orbDrift 14s ease-in-out infinite alternate;
        }
        .orb-1 { width:500px;height:500px;background:rgba(232,87,26,0.08);top:-100px;left:-100px; }
        .orb-2 { width:400px;height:400px;background:rgba(245,158,11,0.07);bottom:0;right:-50px;animation-delay:-7s; }
        @keyframes orbDrift { 0%{transform:translate(0,0)} 100%{transform:translate(20px,15px)} }

        /* Layout */
        .auth-layout {
          display: flex; min-height: 100vh; position: relative; z-index: 1;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          flex: 1; display: none;
          flex-direction: column; justify-content: space-between;
          padding: 3rem 4rem; position: relative; overflow: hidden;
          background: linear-gradient(160deg, #fff 0%, var(--warm) 100%);
          border-right: 1px solid var(--border);
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
        .logo-ring  { position:absolute;width:32px;height:32px;border:2px solid var(--orange);border-radius:50%;animation:logoPulse 2s ease-out infinite; }
        .logo-ring:nth-child(2) { animation-delay:0.7s; }
        @keyframes logoPulse{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
        .logo-dot   { width:9px;height:9px;background:var(--orange);border-radius:50%;z-index:1;position:relative;box-shadow:0 0 10px rgba(232,87,26,0.5); }
        .logo-text  { font-family:'Bebas Neue',cursive;font-size:1.5rem;letter-spacing:0.08em;color:var(--text); }
        .logo-text em { color:var(--orange);font-style:normal; }

        /* Left middle content */
        .left-content { position:relative;z-index:2; }

        .sys-badge {
          display:inline-flex;align-items:center;gap:0.4rem;
          background:rgba(232,87,26,0.08);border:1.5px solid rgba(232,87,26,0.2);
          border-radius:100px;padding:0.3rem 0.9rem;
          font-family:'JetBrains Mono',monospace;font-size:0.67rem;
          color:var(--orange);letter-spacing:0.08em;margin-bottom:1.5rem;font-weight:600;
        }
        .sys-dot { width:6px;height:6px;background:var(--orange);border-radius:50%;animation:blink 1.2s infinite; }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}

        .left-heading {
          font-family:'Bebas Neue',cursive;
          font-size:3.2rem;line-height:0.95;letter-spacing:0.02em;
          color:var(--text);margin-bottom:1rem;
        }
        .left-heading span { color:var(--orange); }

        .left-sub { color:var(--muted);font-size:0.93rem;line-height:1.65;max-width:340px; }

        /* Mini stat cards */
        .mini-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-top:2.5rem; }
        .mini-stat {
          background:#fff;
          border:1.5px solid var(--border);
          border-radius:12px;padding:1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .mini-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(232,87,26,0.1); }
        .mini-stat-num { font-family:'Bebas Neue',cursive;font-size:1.7rem;color:var(--orange);letter-spacing:0.04em; }
        .mini-stat-label { font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--muted);letter-spacing:0.05em;margin-top:0.2rem; }

        /* Left bottom ping */
        .left-bottom { display:flex;align-items:center;gap:0.75rem;position:relative;z-index:2; }
        .ping-wrap {
          position:relative;width:44px;height:44px;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }
        .ping-ring {
          position:absolute;inset:0;border-radius:50%;
          border:1.5px solid rgba(232,87,26,0.4);
          animation:pingExpand 2.5s ease-out infinite;
        }
        .ping-ring:nth-child(2){animation-delay:0.8s;}
        @keyframes pingExpand{0%{transform:scale(0.5);opacity:1}100%{transform:scale(1);opacity:0}}
        .ping-dot { width:10px;height:10px;background:var(--orange);border-radius:50%;box-shadow:0 0 8px rgba(232,87,26,0.5); }
        .ping-label-top  { font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--orange);letter-spacing:0.06em;font-weight:600; }
        .ping-label-bot  { font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--muted);margin-top:0.1rem; }

        /* ── RIGHT PANEL ── */
        .right-panel {
          flex:1;display:flex;align-items:center;justify-content:center;
          padding:3rem 2rem;position:relative;z-index:1;
          overflow-y:auto;
          background: var(--cream);
        }
        .form-box { width:100%;max-width:440px; }

        /* Mobile logo */
        .mobile-logo { display:flex;align-items:center;gap:0.5rem;text-decoration:none;margin-bottom:2rem; }
        @media(min-width:1024px){ .mobile-logo { display:none; } }

        /* Mode toggle */
        .mode-toggle {
          display:flex;padding:5px;border-radius:12px;margin-bottom:2rem;
          background:#fff;border:1.5px solid var(--border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .mode-btn {
          flex:1;padding:0.7rem;border-radius:8px;font-size:0.875rem;
          font-family:'DM Sans',sans-serif;font-weight:500;
          border:none;cursor:pointer;transition:all 0.25s;
        }
        .mode-btn.active  { background:var(--orange);color:#fff;font-weight:700;box-shadow: 0 2px 10px rgba(232,87,26,0.3); }
        .mode-btn.inactive { background:transparent;color:var(--muted); }
        .mode-btn.inactive:hover { color:var(--text); }

        /* Form heading */
        .form-heading { font-family:'Bebas Neue',cursive;font-size:2.6rem;line-height:0.95;margin-bottom:0.5rem;color:var(--text); }
        .form-heading span { color:var(--orange); }
        .form-sub { color:var(--muted);font-size:0.875rem;margin-bottom:1.8rem;line-height:1.55; }

        /* Role selector */
        .role-label {
          font-family:'JetBrains Mono',monospace;font-size:0.65rem;
          color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;
          display:block;margin-bottom:0.6rem;font-weight:600;
        }
        .role-grid { display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1.5rem; }
        .role-btn {
          display:flex;align-items:flex-start;gap:0.6rem;padding:0.8rem;
          border-radius:10px;cursor:pointer;transition:all 0.25s;
          font-family:'DM Sans',sans-serif;text-align:left;
          position:relative;
        }
        .role-btn.unselected {
          background:#fff;border:1.5px solid var(--border);
        }
        .role-btn.unselected:hover { border-color:rgba(232,87,26,0.35); box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .role-btn-icon { font-size:1.3rem;flex-shrink:0;margin-top:0.1rem; }
        .role-btn-name { font-size:0.8rem;font-weight:700;color:var(--text);display:block; }
        .role-btn-desc { font-size:0.7rem;color:var(--muted);display:block;margin-top:0.1rem; }
        .role-btn-pri  { font-family:'JetBrains Mono',monospace;font-size:0.6rem;display:block;margin-top:0.25rem;font-weight:600; }
        .role-check {
          position:absolute;top:0.5rem;right:0.5rem;
          width:17px;height:17px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:0.55rem;font-weight:700;color:#fff;
        }

        /* Inputs */
        .field { margin-bottom:1rem; }
        .field-label {
          font-family:'JetBrains Mono',monospace;font-size:0.64rem;
          color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;
          display:block;margin-bottom:0.4rem;font-weight:600;
        }
        .field-input {
          width:100%;padding:0.85rem 1rem;border-radius:10px;
          background:#fff;
          border:1.5px solid var(--border);
          color:var(--text);font-size:0.9rem;
          font-family:'DM Sans',sans-serif;
          transition:border-color 0.2s,box-shadow 0.2s;
          outline:none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .field-input::placeholder { color:rgba(100,116,139,0.5); }
        .field-input:focus {
          border-color:var(--orange);
          box-shadow:0 0 0 3px rgba(232,87,26,0.1);
        }

        /* Error */
        .error-box {
          display:flex;align-items:center;gap:0.5rem;
          padding:0.75rem 1rem;border-radius:10px;margin-bottom:1rem;
          background:rgba(239,68,68,0.06);
          border:1.5px solid rgba(239,68,68,0.2);
          color:#DC2626;font-size:0.8rem;
          font-family:'JetBrains Mono',monospace;
        }

        /* Submit */
        .submit-btn {
          width:100%;padding:0.95rem;border-radius:10px;
          background:var(--orange);color:#fff;
          font-size:0.95rem;font-weight:700;
          font-family:'DM Sans',sans-serif;
          border:none;cursor:pointer;
          box-shadow:0 4px 20px rgba(232,87,26,0.3);
          transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          margin-top:0.5rem;
          display:flex;align-items:center;justify-content:center;gap:0.5rem;
        }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px) scale(1.01);box-shadow:0 8px 28px rgba(232,87,26,0.4);background:var(--orange2); }
        .submit-btn:disabled { opacity:0.6;cursor:not-allowed; }

        /* Spinner */
        .spinner {
          width:16px;height:16px;border-radius:50%;
          border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;
          animation:spin 0.7s linear infinite;
        }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Toggle link */
        .toggle-row { margin-top:1.5rem;text-align:center;font-size:0.85rem;color:var(--muted); }
        .toggle-btn {
          color:var(--orange);font-weight:700;background:none;border:none;
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
        .back-link:hover { color:var(--orange); }

        /* Divider */
        .or-divider {
          display:flex;align-items:center;gap:0.75rem;
          margin:1.25rem 0;color:var(--muted);font-size:0.78rem;
        }
        .or-line { flex:1;height:1px;background:var(--border); }

        /* Optional tag */
        .opt-tag { opacity:0.45;font-weight:400; }

        /* Form enter animation */
        .form-box { animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
                        <rect x="0" y="120" width="900" height="80" fill="rgba(232,87,26,0.04)" />
                        <rect x="10" y="80" width="55" height="120" fill="rgba(232,87,26,0.06)" />
                        <rect x="75" y="50" width="38" height="150" fill="rgba(232,87,26,0.06)" />
                        <rect x="123" y="88" width="48" height="112" fill="rgba(232,87,26,0.06)" />
                        <rect x="181" y="28" width="75" height="172" fill="rgba(232,87,26,0.08)" />
                        <rect x="266" y="68" width="42" height="132" fill="rgba(232,87,26,0.06)" />
                        <rect x="318" y="8" width="58" height="192" fill="rgba(232,87,26,0.08)" />
                        <rect x="386" y="55" width="68" height="145" fill="rgba(232,87,26,0.06)" />
                        <rect x="464" y="38" width="48" height="162" fill="rgba(232,87,26,0.06)" />
                        <rect x="522" y="72" width="38" height="128" fill="rgba(232,87,26,0.06)" />
                        <rect x="570" y="18" width="72" height="182" fill="rgba(232,87,26,0.08)" />
                        <rect x="652" y="52" width="52" height="148" fill="rgba(232,87,26,0.06)" />
                        <rect x="714" y="82" width="42" height="118" fill="rgba(232,87,26,0.06)" />
                        <rect x="766" y="30" width="65" height="170" fill="rgba(232,87,26,0.08)" />
                        <rect x="841" y="65" width="55" height="135" fill="rgba(232,87,26,0.06)" />
                        {/* Windows */}
                        {[
                            [25, 90], [35, 90], [25, 108], [35, 108], [90, 62], [90, 80], [90, 98],
                            [196, 40], [196, 58], [196, 76], [210, 40], [210, 58], [210, 76],
                            [330, 20], [330, 38], [330, 56], [344, 20], [344, 38], [344, 56],
                            [400, 65], [400, 83], [414, 65], [414, 83],
                            [585, 30], [585, 48], [599, 30], [599, 48],
                        ].map(([x, y], i) => (
                            <rect key={i} x={x} y={y} width="5" height="5" rx="1"
                                fill={i % 3 === 0 ? "rgba(245,158,11,0.7)" : "rgba(232,87,26,0.5)"}
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
                                                    background: `${r.color}10`,
                                                    border: `1.5px solid ${r.color}`,
                                                    boxShadow: `0 4px 16px ${r.color}25`,
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
        <Suspense fallback={
            <div style={{ backgroundColor: '#FFFBF5', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(232,87,26,0.2)', borderTopColor: '#E8571A', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <AuthContent />
        </Suspense>
    );
}