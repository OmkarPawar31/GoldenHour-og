"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const ACCENT   = "#E8571A";
const ACCENT2  = "#F97316";

export default function AmbulanceLogin() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all required fields."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Authentication failed");
      localStorage.setItem("gh_token", data.token); localStorage.setItem("gh_role", data.user.role); router.push("/ambulance");
    } catch (err: any) { setError(err.message || "Authentication failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        .gh-login-root { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #FFFBF5; }
        @media (max-width: 840px) { .gh-login-root { grid-template-columns: 1fr; } .gh-login-hero { display: none !important; } }
        .gh-login-hero { position: relative; background: linear-gradient(150deg, #1E293B 0%, #0F172A 60%, #1a0a00 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 3rem; overflow: hidden; }
        .gh-hero-circles { position: absolute; inset: 0; pointer-events: none; }
        .gh-hero-c { position: absolute; border-radius: 50%; background: radial-gradient(circle, #E8571A 0%, transparent 70%); opacity: 0.12; animation: gh-pulse 4s ease-in-out infinite; }
        .gh-hero-c:nth-child(1) { width: 400px; height: 400px; top: -100px; right: -100px; }
        .gh-hero-c:nth-child(2) { width: 260px; height: 260px; bottom: 80px; right: 80px; animation-delay: -2s; }
        .gh-hero-c:nth-child(3) { width: 180px; height: 180px; top: 40%; left: -40px; animation-delay: -1s; }
        @keyframes gh-pulse { 0%,100%{transform:scale(1);opacity:0.12} 50%{transform:scale(1.12);opacity:0.2} }
        .gh-hero-badge { font-family:'JetBrains Mono',monospace; font-size:0.65rem; letter-spacing:0.14em; text-transform:uppercase; color:#E8571A; background:rgba(232,87,26,0.12); border:1px solid rgba(232,87,26,0.3); border-radius:4px; padding:0.28rem 0.75rem; width:fit-content; margin-bottom:1.5rem; }
        .gh-hero-icon { font-size:5rem; margin-bottom:1.2rem; line-height:1; filter:drop-shadow(0 0 32px rgba(232,87,26,0.5)); animation:gh-float 3s ease-in-out infinite; }
        @keyframes gh-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .gh-hero-headline { font-family:'Bebas Neue',cursive; font-size:3.8rem; color:#fff; line-height:1; margin-bottom:0.85rem; letter-spacing:0.04em; }
        .gh-hero-headline em { color:#E8571A; font-style:normal; }
        .gh-hero-sub { color:#94A3B8; font-size:0.92rem; line-height:1.7; max-width:340px; margin-bottom:2.5rem; }
        .gh-hero-stats { display:flex; gap:1.5rem; }
        .gh-hero-stat-val { font-family:'Bebas Neue',cursive; font-size:2rem; color:#E8571A; line-height:1; }
        .gh-hero-stat-label { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:#64748B; letter-spacing:0.08em; text-transform:uppercase; margin-top:0.15rem; }
        .gh-login-form-panel { display:flex; flex-direction:column; justify-content:center; align-items:center; padding:3rem 2.5rem; background:#FFFBF5; }
        .gh-form-wrap { width:100%; max-width:400px; }
        .gh-logo-link { font-family:'Bebas Neue',cursive; font-size:1.4rem; letter-spacing:0.08em; color:#1E293B; text-decoration:none; display:flex; align-items:center; gap:0.55rem; margin-bottom:2.5rem; }
        .gh-logo-link .dot { width:8px; height:8px; border-radius:50%; background:#E8571A; }
        .gh-logo-link span em { color:#E8571A; font-style:normal; }
        .gh-form-title { font-family:'Bebas Neue',cursive; font-size:2.2rem; letter-spacing:0.04em; color:#1E293B; line-height:1; }
        .gh-form-sub { font-size:0.85rem; color:#64748B; margin-top:0.4rem; margin-bottom:2rem; }
        .gh-tabs { display:grid; grid-template-columns:1fr 1fr; background:#F1F5F9; border-radius:12px; padding:4px; gap:4px; margin-bottom:1.6rem; }
        .gh-tab { padding:0.65rem; border-radius:9px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.84rem; font-weight:700; transition:all 0.2s; }
        .gh-tab-active { background:#fff; color:#E8571A; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
        .gh-tab-inactive { background:transparent; color:#94A3B8; }
        .gh-tab-inactive:hover { color:#1E293B; }
        .gh-field { margin-bottom:1.1rem; }
        .gh-field label { display:block; font-family:'JetBrains Mono',monospace; font-size:0.6rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:0.5rem; }
        .gh-input-wrap { position:relative; }
        .gh-input { width:100%; padding:0.82rem 1rem; border-radius:12px; border:1.5px solid #E2E8F0; background:#F8FAFC; outline:none; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:#1E293B; transition:border-color 0.18s, background 0.18s, box-shadow 0.18s; }
        .gh-input:focus { border-color:#E8571A; background:#fff; box-shadow:0 0 0 3px rgba(232,87,26,0.08); }
        .gh-input::placeholder { color:#CBD5E1; }
        .gh-pw-toggle { position:absolute; right:1rem; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; font-size:0.8rem; padding:0; }
        .gh-error { display:flex; align-items:center; gap:0.5rem; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#EF4444; }
        .gh-success { display:flex; align-items:center; gap:0.5rem; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#059669; }
        .gh-submit { width:100%; padding:0.92rem; border-radius:12px; border:none; cursor:pointer; background:linear-gradient(135deg, #E8571A 0%, #F97316 100%); color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:700; transition:all 0.22s; margin-top:0.35rem; box-shadow:0 4px 20px rgba(232,87,26,0.28); position:relative; overflow:hidden; }
        .gh-submit:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(232,87,26,0.4); }
        .gh-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .gh-divider { display:flex; align-items:center; gap:0.75rem; margin:1.35rem 0; }
        .gh-divider span { flex:1; height:1px; background:#E2E8F0; }
        .gh-divider em { font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:#CBD5E1; font-style:normal; }
        .gh-note { font-size:0.78rem; color:#94A3B8; text-align:center; line-height:1.6; margin-top:1.6rem; }
        .gh-note a { color:#E8571A; font-weight:600; text-decoration:none; cursor:pointer; }
        .gh-spinner { display:inline-block; width:15px; height:15px; border-radius:50%; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; animation:spin 0.65s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="gh-login-root">
        <div className="gh-login-hero">
          <div className="gh-hero-circles"><div className="gh-hero-c" /><div className="gh-hero-c" /><div className="gh-hero-c" /></div>
          <div className="gh-hero-badge">Priority 100 · Emergency Services</div>
          <div className="gh-hero-icon">🚑</div>
          <h2 className="gh-hero-headline">Ambulance<br /><em>Driver</em> Portal</h2>
          <p className="gh-hero-sub">Access your real-time dispatch console, track active corridors, and respond to emergency calls across the city network.</p>
          <div className="gh-hero-stats">
            <div><div className="gh-hero-stat-val">0.8 MIN</div><div className="gh-hero-stat-label">Avg dispatch time</div></div>
            <div><div className="gh-hero-stat-val">5 KM</div><div className="gh-hero-stat-label">Alert radius</div></div>
            <div><div className="gh-hero-stat-val">P-100</div><div className="gh-hero-stat-label">Priority level</div></div>
          </div>
        </div>
        <div className="gh-login-form-panel">
          <div className="gh-form-wrap">
            <Link href="/" className="gh-logo-link"><div className="dot" /><span>Golden<em>Hour</em></span></Link>
            <h1 className="gh-form-title">Sign In</h1>
            <p className="gh-form-sub">Access your fleet dashboard</p>
            <form onSubmit={handleAuth}>
              <div className="gh-field"><label>Email Address</label><input className="gh-input" type="email" placeholder="driver@station.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="gh-field"><label>Password</label><div className="gh-input-wrap"><input className="gh-input" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: "3rem" }} /><button type="button" className="gh-pw-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁"}</button></div></div>
              {error && <div className="gh-error">⚠ {error}</div>}
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner" />}{loading ? "Authenticating…" : "Sign In to Fleet Control →"}</button>
            </form>
            <div className="gh-divider"><span /><em>SECURE LOGIN</em><span /></div>
            <p className="gh-note" style={{ marginTop: "0.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
