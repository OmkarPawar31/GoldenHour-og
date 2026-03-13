"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuth } from "../../../utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AdminLogin() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const termRef  = useRef<HTMLDivElement>(null);
  const pageRef  = useRef<HTMLDivElement>(null);
  const [termLines, setTermLines] = useState<string[]>([
    "> GoldenHour SecureShell v2.3",
    "> Initialising encryption layer…",
    "> AES-256 key exchange complete ✓",
    "> Admin session awaiting credentials",
  ]);

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
    if (token && (role === "admin" || role === "traffic_control")) {
      router.replace("/admin");
      return;
    }
    setReady(true);
  }, [router]);

  /* type-on terminal effect */
  useEffect(() => {
    const extras = ["> Monitoring 24 active corridors…", "> System status: NOMINAL", "> Awaiting secure admin login…"];
    let i = 0;
    const id = setInterval(() => {
      if (i < extras.length) { setTermLines(prev => [...prev, extras[i++]]); }
      else clearInterval(id);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [termLines]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Credentials required."); return; }
    setLoading(true); setError("");
    setTermLines(prev => [...prev, `> Authenticating ${email}…`]);
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Access denied");
      if (!["admin", "traffic_control"].includes(data.user?.role)) throw new Error("Insufficient privileges. Admin or Traffic Control role required.");
      setTermLines(prev => [...prev, "> Access granted ✓", "> Routing to admin console…"]);
      saveAuth(data.token, data.user.role);
      setTimeout(() => router.push("/admin"), 900);
    } catch (err: any) { setError(err.message); setTermLines(prev => [...prev, `> ✗ Error: ${err.message}`]); }
    finally { setLoading(false); }
  };

  if (!ready) return <div style={{ minHeight: '100vh', background: 'var(--gh-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="gh-spinner-dark" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div ref={pageRef}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .gh-login-hero { background: linear-gradient(150deg, #050e05 0%, #0a1a0a 60%, #020d06 100%); }
        .admin-matrix-bg { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(rgba(16,185,129,0.06) 1px, transparent 1px); background-size: 24px 24px; }
        .admin-matrix-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 60% 30%, rgba(16,185,129,0.12), transparent 65%); }
        .admin-term { background: rgba(0,0,0,0.8); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 1.2rem; margin-bottom: 2rem; max-height: 140px; overflow-y: auto; scroll-behavior: smooth; }
        .admin-term-pre { font-family:'JetBrains Mono',monospace; font-size:0.65rem; color:#10B981; line-height:1.7; white-space:pre; }
        .admin-term-cursor { display:inline-block; width:7px; height:1em; background:#10B981; animation:admin-blink 1s infinite; vertical-align:middle; margin-left:2px; }
        @keyframes admin-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .gh-hero-badge { color: #10B981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
        .gh-hero-icon { font-size: 4rem; filter: drop-shadow(0 0 28px rgba(16,185,129,0.5)); }
        .gh-hero-headline em { color: #10B981; }
        .gh-hero-sub { color: #4A6741; }
        .admin-secure-badge { display:inline-flex; align-items:center; gap:0.55rem; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:0.55rem 0.9rem; font-family:'JetBrains Mono',monospace; font-size:0.65rem; color:#10B981; letter-spacing:0.08em; }
        .gh-input:focus { border-color: #10B981; box-shadow: 0 0 0 3px rgba(16,185,129,0.08); }
        .gh-input { font-family: 'JetBrains Mono', monospace; }
        .gh-input::placeholder { font-family: 'DM Sans', sans-serif; }
        .admin-warning { background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#D97706; }
        .gh-submit { background: linear-gradient(135deg, #059669 0%, #10B981 100%); box-shadow: 0 4px 20px rgba(16,185,129,0.28); }
        .gh-submit:hover { box-shadow: 0 8px 32px rgba(16,185,129,0.4); }
        .admin-title-tag { display:inline-block; margin-left:0.6rem; font-family:'JetBrains Mono',monospace; font-size:0.55rem; background:rgba(16,185,129,0.08); color:#10B981; border:1px solid rgba(16,185,129,0.2); border-radius:4px; padding:0.12rem 0.45rem; vertical-align:middle; letter-spacing:0.08em; text-transform:uppercase; }
      `}</style>
      <div className="gh-login-root">
        <div className="gh-login-hero">
          <div className="admin-matrix-bg" /><div className="admin-matrix-glow" />
          <div className="gh-hero-badge">Admin · Traffic Control · Secure Access</div>
          <div className="gh-hero-icon">🖥️</div>
          <h2 className="gh-hero-headline">Admin /<br /><em>Traffic</em> Console</h2>
          <p className="gh-hero-sub">Monitor every active emergency corridor, approve private requests, view live ETAs and manage all system operations.</p>
          <div ref={termRef} className="admin-term">
            <div className="admin-term-pre">{termLines.join("\n")}<span className="admin-term-cursor" /></div>
          </div>
          <div className="admin-secure-badge">🔒 Secure · Monitored · Restricted Access</div>
        </div>
        <div className="gh-login-form-panel">
          <div className="gh-form-wrap">
            <Link href="/" className="gh-logo-link"><div className="dot" /><span>Golden<em>Hour</em></span></Link>
            <h1 className="gh-form-title">Secure Login<span className="admin-title-tag">Admin Only</span></h1>
            <p className="gh-form-sub">Restricted to administrators and traffic controllers</p>
            <div className="admin-warning">⚠ This portal is for authorised personnel only. All access attempts are logged and monitored.</div>
            <form onSubmit={handleLogin}>
              <div className="gh-field"><label>Admin Email</label><input className="gh-input" type="email" placeholder="admin@goldenhour.app" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></div>
              <div className="gh-field"><label>Password</label><div className="gh-input-wrap"><input className="gh-input" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: "3rem" }} /><button type="button" className="gh-pw-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁"}</button></div></div>
              {error && <div className="gh-error">✗ {error}</div>}
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner-login" />}{loading ? "Authenticating…" : "Access Admin Console →"}</button>
            </form>
            <p className="gh-note" style={{ marginTop: "1.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
