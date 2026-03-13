"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuth } from "../../../utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  const pageRef                 = useRef<HTMLDivElement>(null);

  // GSAP entrance
  useGSAP(() => {
    if (!pageRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.gh-login-hero',       { x: -60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8 })
      .fromTo('.gh-login-form-panel', { x: 60,  autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8 }, '-=0.7')
      .fromTo('.gh-hero-icon',        { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.8)' }, '-=0.5')
      .fromTo('.gh-logo-link, .gh-form-title, .gh-form-sub, .gh-tabs', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.5 }, '-=0.5')
      .fromTo('.gh-field', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.4 }, '-=0.4')
      .fromTo('.gh-submit', { y: 10, autoAlpha: 0, scale: 0.97 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, '-=0.2');
  }, { scope: pageRef, dependencies: [ready, tab] });

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

  if (!ready) return <div style={{ minHeight: '100vh', background: 'var(--gh-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="gh-spinner-dark" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div ref={pageRef}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .gh-login-hero { background: linear-gradient(150deg, #0f1f3a 0%, #1e3a5f 60%, #0b1a30 100%); }
        .gh-hero-c { background: radial-gradient(circle, #3B82F6 0%, transparent 70%); }
        .gh-hero-badge { color: #3B82F6; background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); }
        .gh-hero-icon { filter: drop-shadow(0 0 32px rgba(59,130,246,0.5)); }
        .gh-hero-headline em { color: #3B82F6; }
        .gh-hero-sub { color: #8faac7; }
        .gh-hero-stat-val { color: #3B82F6; }
        .gh-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
        .gh-submit { background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); box-shadow: 0 4px 20px rgba(59,130,246,0.28); }
        .gh-submit:hover { box-shadow: 0 8px 32px rgba(59,130,246,0.4); }
        .gh-tabs { display:grid; grid-template-columns:1fr 1fr; background:#F1F5F9; border-radius:12px; padding:4px; gap:4px; margin-bottom:1.6rem; }
        .gh-tab { padding:0.65rem; border-radius:9px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.84rem; font-weight:700; transition:all 0.2s; }
        .gh-tab.active { background:#fff; color:#3B82F6; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
        .gh-tab.inactive { background:transparent; color:#94A3B8; }
        .gh-tab.inactive:hover { color:#1E293B; }
      `}</style>
      <div className="gh-login-root">
        <div className="gh-login-hero">
          <div className="gh-hero-circles"><div className="gh-hero-c" /><div className="gh-hero-c" /><div className="gh-hero-c" /></div>
          <div className="gh-hero-badge">Fleet Operations · Hospital Control</div>
          <div className="gh-hero-icon">🏥</div>
          <h2 className="gh-hero-headline">Hospital<br /><em>Organizer</em> Portal</h2>
          <p className="gh-hero-sub">Manage ambulance dispatch, coordinate incoming emergencies, and view live fleet positions across the hospital network.</p>
          <div className="gh-hero-stats">
            <div><div className="gh-hero-stat-val">LIVE</div><div className="gh-hero-stat-label">Fleet tracking</div></div>
            <div><div className="gh-hero-stat-val">2 MIN</div><div className="gh-hero-stat-label">Avg ETA update</div></div>
            <div><div className="gh-hero-stat-val">FLEET</div><div className="gh-hero-stat-label">Control role</div></div>
          </div>
        </div>
        <div className="gh-login-form-panel">
          <div className="gh-form-wrap">
            <Link href="/" className="gh-logo-link"><div className="dot" /><span>Golden<em>Hour</em></span></Link>
            <h1 className="gh-form-title">{tab === "login" ? "Sign In" : "Register"}</h1>
            <p className="gh-form-sub">{tab === "login" ? "Access fleet operations dashboard" : "Create your organizer account"}</p>
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
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner-login" />}{loading ? "Authenticating…" : tab === "login" ? "Sign In to Control Room →" : "Register Hospital Account →"}</button>
            </form>
            <div className="gh-divider-line"><span /><em>FLEET OPERATIONS</em><span /></div>
            <p className="gh-note">{tab === "login" ? <><a onClick={() => { setTab("register"); resetForm(); }} style={{ color: '#3B82F6', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>New organizer? Register here</a></> : <><a onClick={() => { setTab("login"); resetForm(); }} style={{ color: '#3B82F6', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Already registered? Sign in</a></>}</p>
            <p className="gh-note" style={{ marginTop: "0.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
