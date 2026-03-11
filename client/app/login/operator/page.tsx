"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function OperatorLogin() {
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
      
      localStorage.setItem("gh_token", data.token); 
      localStorage.setItem("gh_role", data.user?.role || "organizer"); // keeping backend role as organizer
      router.push("/operator");
    } catch (err: any) { setError(err.message || "Authentication failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        .gh-root { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #FFFBF5; }
        @media (max-width: 840px) { .gh-root { grid-template-columns: 1fr; } .gh-hero { display: none !important; } }
        .gh-hero { position: relative; background: linear-gradient(150deg, #1e0f2d 0%, #2b1141 60%, #170824 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 3rem; overflow: hidden; }
        .gh-orb { position: absolute; border-radius: 50%; background: radial-gradient(circle, #8B5CF6 0%, transparent 70%); animation: pulse 4s ease-in-out infinite; }
        .gh-orb:nth-child(1) { width: 420px; height: 420px; top: -120px; right: -120px; opacity: 0.12; }
        .gh-orb:nth-child(2) { width: 240px; height: 240px; bottom: 80px; right: 80px; opacity: 0.1; animation-delay: -2s; }
        .gh-orb:nth-child(3) { width: 160px; height: 160px; top: 45%; left: -40px; opacity: 0.08; animation-delay: -1s; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .gh-badge { font-family:'JetBrains Mono',monospace; font-size:0.65rem; letter-spacing:0.14em; text-transform:uppercase; color:#8B5CF6; background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.3); border-radius:4px; padding:0.28rem 0.75rem; width:fit-content; margin-bottom:1.5rem; }
        .gh-icon { font-size:5rem; margin-bottom:1.2rem; line-height:1; filter:drop-shadow(0 0 32px rgba(139,92,246,0.5)); animation:float 3s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .gh-headline { font-family:'Bebas Neue',cursive; font-size:3.5rem; color:#fff; line-height:1; margin-bottom:0.85rem; letter-spacing:0.04em; }
        .gh-headline em { color:#8B5CF6; font-style:normal; }
        .gh-sub { color:#a78bfa; font-size:0.92rem; line-height:1.7; max-width:340px; margin-bottom:2.5rem; }
        .gh-stats { display:flex; gap:1.5rem; }
        .gh-stat-val { font-family:'Bebas Neue',cursive; font-size:2rem; color:#8B5CF6; line-height:1; }
        .gh-stat-lbl { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:#64748B; letter-spacing:0.08em; text-transform:uppercase; margin-top:0.15rem; }
        .gh-panel { display:flex; flex-direction:column; justify-content:center; align-items:center; padding:3rem 2.5rem; }
        .gh-wrap { width:100%; max-width:400px; }
        .gh-logo-link { font-family:'Bebas Neue',cursive; font-size:1.4rem; letter-spacing:0.08em; color:#1E293B; text-decoration:none; display:flex; align-items:center; gap:0.55rem; margin-bottom:2.5rem; }
        .gh-logo-link .dot { width:8px; height:8px; border-radius:50%; background:#E8571A; }
        .gh-logo-link span em { color:#E8571A; font-style:normal; }
        .gh-title { font-family:'Bebas Neue',cursive; font-size:2.2rem; letter-spacing:0.04em; color:#1E293B; line-height:1; }
        .gh-title-sub { font-size:0.85rem; color:#64748B; margin-top:0.4rem; margin-bottom:2rem; }
        .gh-field { margin-bottom:1.1rem; }
        .gh-field label { display:block; font-family:'JetBrains Mono',monospace; font-size:0.6rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:0.5rem; }
        .gh-input-wrap { position:relative; }
        .gh-input { width:100%; padding:0.82rem 1rem; border-radius:12px; border:1.5px solid #E2E8F0; background:#F8FAFC; outline:none; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:#1E293B; transition:all 0.18s; }
        .gh-input:focus { border-color:#8B5CF6; background:#fff; box-shadow:0 0 0 3px rgba(139,92,246,0.08); }
        .gh-input::placeholder { color:#CBD5E1; }
        .gh-pw-toggle { position:absolute; right:1rem; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; font-size:0.8rem; }
        .gh-error { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#EF4444; }
        .gh-submit { width:100%; padding:0.92rem; border-radius:12px; border:none; cursor:pointer; background:linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:700; transition:all 0.22s; margin-top:0.35rem; box-shadow:0 4px 20px rgba(139,92,246,0.28); }
        .gh-submit:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(139,92,246,0.4); }
        .gh-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .gh-divider { display:flex; align-items:center; gap:0.75rem; margin:1.35rem 0; }
        .gh-divider span { flex:1; height:1px; background:#E2E8F0; }
        .gh-divider em { font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:#CBD5E1; font-style:normal; }
        .gh-note { font-size:0.78rem; color:#94A3B8; text-align:center; line-height:1.6; margin-top:1.6rem; }
        .gh-spinner { display:inline-block; width:15px; height:15px; border-radius:50%; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; animation:spin 0.65s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="gh-root">
        <div className="gh-hero">
          <div className="gh-orb" /><div className="gh-orb" /><div className="gh-orb" />
          <div className="gh-badge">Event Coordination · Operator Access</div>
          <div className="gh-icon">📋</div>
          <h2 className="gh-headline">Event<br /><em>Operator</em> Portal</h2>
          <p className="gh-sub">Coordinate with emergency services and monitor event safety networks in real time.</p>
          <div className="gh-stats">
            <div><div className="gh-stat-val">SYNC</div><div className="gh-stat-lbl">Services Sync</div></div>
            <div><div className="gh-stat-val">LIVE</div><div className="gh-stat-lbl">Status Monitor</div></div>
            <div><div className="gh-stat-val">EVENT</div><div className="gh-stat-lbl">Control Level</div></div>
          </div>
        </div>
        <div className="gh-panel">
          <div className="gh-wrap">
            <Link href="/" className="gh-logo-link"><div className="dot" /><span>Golden<em>Hour</em></span></Link>
            <h1 className="gh-title">Sign In</h1>
            <p className="gh-title-sub">Access operator dashboard</p>
            <form onSubmit={handleAuth}>
              <div className="gh-field"><label>Operator ID / Email</label><input className="gh-input" type="text" placeholder="org" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>
              <div className="gh-field"><label>Password</label><div className="gh-input-wrap"><input className="gh-input" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: "3rem" }} /><button type="button" className="gh-pw-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁"}</button></div></div>
              {error && <div className="gh-error">⚠ {error}</div>}
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner" />}{loading ? "Authenticating…" : "Sign In to Dashboard →"}</button>
            </form>
            <div className="gh-divider"><span /><em>OPERATOR ACCESS</em><span /></div>
            <p className="gh-note" style={{ marginTop: "0.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
