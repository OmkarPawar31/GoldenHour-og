"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuth } from "../../../utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const ACCENT   = "#3B82F6";
const ACCENT2  = "#6366F1";

export default function HospitalLogin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab]           = useState<"login" | "register">("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [hospital, setHospital] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const resetForm = () => { setName(""); setEmail(""); setPassword(""); setHospital(""); setError(""); setSuccess(""); };

  useEffect(() => {
    const token = localStorage.getItem("gh_token");
    const role  = localStorage.getItem("gh_role");
    if (token && role === "hospital") {
      router.replace("/hospital");
      return;
    }
    setReady(true);
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (tab === "register" && !name)) { setError("Please fill in all required fields."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const payload  = tab === "login"
        ? { email, password }
        : { name, email, password, role: "hospital", phone: "0000000000", hospitalName: hospital };
      const res  = await fetch(`${API_BASE}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Authentication failed");
      if (tab === "register") {
        setSuccess("Account created!"); setTimeout(() => { saveAuth(data.token, "hospital"); router.push("/hospital"); }, 1000);
      } else {
        saveAuth(data.token, data.user?.role || "hospital"); router.push("/hospital");
      }
    } catch (err: any) { setError(err.message || "Authentication failed"); }
    finally { setLoading(false); }
  };

  if (!ready) return <div style={{ minHeight: '100vh', background: '#FFFBF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} /></div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        .gh-root { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #FFFBF5; }
        @media (max-width: 840px) { .gh-root { grid-template-columns: 1fr; } .gh-hero { display: none !important; } }
        .gh-hero { position: relative; background: linear-gradient(150deg, #0f1f3a 0%, #1e3a5f 60%, #0b1a30 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 3rem; overflow: hidden; }
        .gh-orb { position: absolute; border-radius: 50%; background: radial-gradient(circle, #3B82F6 0%, transparent 70%); animation: pulse 4s ease-in-out infinite; }
        .gh-orb:nth-child(1) { width: 420px; height: 420px; top: -120px; right: -120px; opacity: 0.1; }
        .gh-orb:nth-child(2) { width: 240px; height: 240px; bottom: 80px; right: 80px; opacity: 0.08; animation-delay: -2s; }
        .gh-orb:nth-child(3) { width: 160px; height: 160px; top: 45%; left: -40px; opacity: 0.07; animation-delay: -1s; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .gh-badge { font-family:'JetBrains Mono',monospace; font-size:0.65rem; letter-spacing:0.14em; text-transform:uppercase; color:#3B82F6; background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:4px; padding:0.28rem 0.75rem; width:fit-content; margin-bottom:1.5rem; }
        .gh-icon { font-size:5rem; margin-bottom:1.2rem; line-height:1; filter:drop-shadow(0 0 32px rgba(59,130,246,0.5)); animation:float 3s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .gh-headline { font-family:'Bebas Neue',cursive; font-size:3.5rem; color:#fff; line-height:1; margin-bottom:0.85rem; letter-spacing:0.04em; }
        .gh-headline em { color:#3B82F6; font-style:normal; }
        .gh-sub { color:#8faac7; font-size:0.92rem; line-height:1.7; max-width:340px; margin-bottom:2.5rem; }
        .gh-stats { display:flex; gap:1.5rem; }
        .gh-stat-val { font-family:'Bebas Neue',cursive; font-size:2rem; color:#3B82F6; line-height:1; }
        .gh-stat-lbl { font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:#64748B; letter-spacing:0.08em; text-transform:uppercase; margin-top:0.15rem; }
        .gh-panel { display:flex; flex-direction:column; justify-content:center; align-items:center; padding:3rem 2.5rem; }
        .gh-wrap { width:100%; max-width:400px; }
        .gh-logo-link { font-family:'Bebas Neue',cursive; font-size:1.4rem; letter-spacing:0.08em; color:#1E293B; text-decoration:none; display:flex; align-items:center; gap:0.55rem; margin-bottom:2.5rem; }
        .gh-logo-link .dot { width:8px; height:8px; border-radius:50%; background:#E8571A; }
        .gh-logo-link span em { color:#E8571A; font-style:normal; }
        .gh-title { font-family:'Bebas Neue',cursive; font-size:2.2rem; letter-spacing:0.04em; color:#1E293B; line-height:1; }
        .gh-title-sub { font-size:0.85rem; color:#64748B; margin-top:0.4rem; margin-bottom:2rem; }
        .gh-tabs { display:grid; grid-template-columns:1fr 1fr; background:#F1F5F9; border-radius:12px; padding:4px; gap:4px; margin-bottom:1.6rem; }
        .gh-tab { padding:0.65rem; border-radius:9px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.84rem; font-weight:700; transition:all 0.2s; }
        .gh-tab.active { background:#fff; color:#3B82F6; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
        .gh-tab.inactive { background:transparent; color:#94A3B8; }
        .gh-tab.inactive:hover { color:#1E293B; }
        .gh-field { margin-bottom:1.1rem; }
        .gh-field label { display:block; font-family:'JetBrains Mono',monospace; font-size:0.6rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:0.5rem; }
        .gh-input-wrap { position:relative; }
        .gh-input { width:100%; padding:0.82rem 1rem; border-radius:12px; border:1.5px solid #E2E8F0; background:#F8FAFC; outline:none; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:#1E293B; transition:all 0.18s; }
        .gh-input:focus { border-color:#3B82F6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,0.08); }
        .gh-input::placeholder { color:#CBD5E1; }
        .gh-pw-toggle { position:absolute; right:1rem; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; font-size:0.8rem; }
        .gh-error { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#EF4444; }
        .gh-success { background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#059669; }
        .gh-submit { width:100%; padding:0.92rem; border-radius:12px; border:none; cursor:pointer; background:linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:700; transition:all 0.22s; margin-top:0.35rem; box-shadow:0 4px 20px rgba(59,130,246,0.28); }
        .gh-submit:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(59,130,246,0.4); }
        .gh-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .gh-divider { display:flex; align-items:center; gap:0.75rem; margin:1.35rem 0; }
        .gh-divider span { flex:1; height:1px; background:#E2E8F0; }
        .gh-divider em { font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:#CBD5E1; font-style:normal; }
        .gh-note { font-size:0.78rem; color:#94A3B8; text-align:center; line-height:1.6; margin-top:1.6rem; }
        .gh-note a { color:#3B82F6; font-weight:600; text-decoration:none; cursor:pointer; }
        .gh-spinner { display:inline-block; width:15px; height:15px; border-radius:50%; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; animation:spin 0.65s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="gh-root">
        <div className="gh-hero">
          <div className="gh-orb" /><div className="gh-orb" /><div className="gh-orb" />
          <div className="gh-badge">Fleet Operations · Hospital Control</div>
          <div className="gh-icon">🏥</div>
          <h2 className="gh-headline">Hospital<br /><em>Organizer</em> Portal</h2>
          <p className="gh-sub">Manage ambulance dispatch, coordinate incoming emergencies, and view live fleet positions across the hospital network.</p>
          <div className="gh-stats">
            <div><div className="gh-stat-val">LIVE</div><div className="gh-stat-lbl">Fleet tracking</div></div>
            <div><div className="gh-stat-val">2 MIN</div><div className="gh-stat-lbl">Avg ETA update</div></div>
            <div><div className="gh-stat-val">FLEET</div><div className="gh-stat-lbl">Control role</div></div>
          </div>
        </div>
        <div className="gh-panel">
          <div className="gh-wrap">
            <Link href="/" className="gh-logo-link"><div className="dot" /><span>Golden<em>Hour</em></span></Link>
            <h1 className="gh-title">{tab === "login" ? "Sign In" : "Register"}</h1>
            <p className="gh-title-sub">{tab === "login" ? "Access fleet operations dashboard" : "Create your organizer account"}</p>
            <div className="gh-tabs">
              <button className={`gh-tab ${tab === "login" ? "active" : "inactive"}`} onClick={() => { setTab("login"); resetForm(); }}>Sign In</button>
              <button className={`gh-tab ${tab === "register" ? "active" : "inactive"}`} onClick={() => { setTab("register"); resetForm(); }}>Register</button>
            </div>
            <form onSubmit={handleAuth}>
              {tab === "register" && (<><div className="gh-field"><label>Full Name</label><input className="gh-input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} autoFocus /></div><div className="gh-field"><label>Hospital Name</label><input className="gh-input" type="text" placeholder="City General Hospital" value={hospital} onChange={e => setHospital(e.target.value)} /></div></>)}
              <div className="gh-field"><label>Email Address</label><input className="gh-input" type="email" placeholder="organizer@hospital.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="gh-field"><label>Password</label><div className="gh-input-wrap"><input className="gh-input" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: "3rem" }} /><button type="button" className="gh-pw-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁"}</button></div></div>
              {error   && <div className="gh-error">⚠ {error}</div>}
              {success && <div className="gh-success">✓ {success}</div>}
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner" />}{loading ? "Authenticating…" : tab === "login" ? "Sign In to Control Room →" : "Register Hospital Account →"}</button>
            </form>
            <div className="gh-divider"><span /><em>FLEET OPERATIONS</em><span /></div>
            <p className="gh-note">{tab === "login" ? <><a onClick={() => { setTab("register"); resetForm(); }}>New organizer? Register here</a></> : <><a onClick={() => { setTab("login"); resetForm(); }}>Already registered? Sign in</a></>}</p>
            <p className="gh-note" style={{ marginTop: "0.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
