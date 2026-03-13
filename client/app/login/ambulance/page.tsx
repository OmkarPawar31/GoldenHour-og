"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuth } from "../../../utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AmbulanceLogin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  // GSAP entrance
  useGSAP(() => {
    if (!pageRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.gh-login-hero',       { x: -60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8 })
      .fromTo('.gh-login-form-panel', { x: 60,  autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8 }, '-=0.7')
      .fromTo('.gh-hero-icon',        { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.8)' }, '-=0.5')
      .fromTo('.gh-logo-link, .gh-form-title, .gh-form-sub', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.5 }, '-=0.5')
      .fromTo('.gh-field', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.4 }, '-=0.4')
      .fromTo('.gh-submit', { y: 10, autoAlpha: 0, scale: 0.97 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, '-=0.2');
  }, { scope: pageRef, dependencies: [ready] });

  useEffect(() => {
    const token = localStorage.getItem("gh_token");
    const role  = localStorage.getItem("gh_role");
    if (token && (role === "driver" || role === "ambulance")) {
      router.replace("/ambulance");
      return;
    }
    setReady(true);
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all required fields."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Authentication failed");
      saveAuth(data.token, data.user.role); router.push("/ambulance");
    } catch (err: any) { setError(err.message || "Authentication failed"); }
    finally { setLoading(false); }
  };

  if (!ready) return <div style={{ minHeight: '100vh', background: 'var(--gh-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="gh-spinner-dark" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div ref={pageRef}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        /* Only hero-specific overrides — everything else comes from globals.css */
        .gh-login-hero { background: linear-gradient(150deg, #1E293B 0%, #0F172A 60%, #1a0500 100%); }
        .gh-hero-c { background: radial-gradient(circle, #E8571A 0%, transparent 70%); }
        .gh-hero-badge { color: #E8571A; background: rgba(232,87,26,0.12); border-color: rgba(232,87,26,0.3); }
        .gh-hero-icon { filter: drop-shadow(0 0 32px rgba(232,87,26,0.5)); }
        .gh-hero-headline em { color: #E8571A; }
        .gh-hero-stat-val { color: #E8571A; }
        .gh-input:focus { border-color: #E8571A; box-shadow: 0 0 0 3px rgba(232,87,26,0.08); }
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
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner-login" />}{loading ? "Authenticating…" : "Sign In to Fleet Control →"}</button>
            </form>
            <div className="gh-divider-line"><span /><em>SECURE LOGIN</em><span /></div>
            <p className="gh-note" style={{ marginTop: "0.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
