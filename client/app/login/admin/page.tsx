"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuth } from "../../../utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AdminLogin() {
  // ── Auto-redirect if already logged in as admin ──
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const termRef  = useRef<HTMLDivElement>(null);
  const [termLines, setTermLines] = useState<string[]>([
    "> GoldenHour SecureShell v2.3",
    "> Initialising encryption layer…",
    "> AES-256 key exchange complete ✓",
    "> Admin session awaiting credentials",
  ]);

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

  if (!ready) return <div style={{ minHeight: '100vh', background: '#FFFBF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10B981', animation: 'spin 0.8s linear infinite' }} /></div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        .gh-root { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #FFFBF5; }
        @media (max-width: 840px) { .gh-root { grid-template-columns: 1fr; } .gh-hero { display: none !important; } }
        .gh-hero { position: relative; background: linear-gradient(150deg, #050e05 0%, #0a1a0a 60%, #020d06 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 3rem; overflow: hidden; }
        .gh-matrix-bg { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(rgba(16,185,129,0.06) 1px, transparent 1px); background-size: 24px 24px; }
        .gh-matrix-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 60% 30%, rgba(16,185,129,0.12), transparent 65%); }
        .gh-term-preview { background: rgba(0,0,0,0.8); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 1.2rem; margin-bottom: 2rem; max-height: 140px; overflow-y: auto; scroll-behavior: smooth; }
        .gh-term-pre { font-family:'JetBrains Mono',monospace; font-size:0.65rem; color:#10B981; line-height:1.7; white-space:pre; }
        .gh-term-cursor { display:inline-block; width:7px; height:1em; background:#10B981; animation:blink 1s infinite; vertical-align:middle; margin-left:2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .gh-badge { font-family:'JetBrains Mono',monospace; font-size:0.65rem; letter-spacing:0.14em; text-transform:uppercase; color:#10B981; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:4px; padding:0.28rem 0.75rem; width:fit-content; margin-bottom:1.5rem; }
        .gh-icon { font-size:4rem; margin-bottom:1.2rem; line-height:1; filter:drop-shadow(0 0 28px rgba(16,185,129,0.5)); animation:float 3s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .gh-headline { font-family:'Bebas Neue',cursive; font-size:3.5rem; color:#fff; line-height:1; margin-bottom:0.85rem; letter-spacing:0.04em; }
        .gh-headline em { color:#10B981; font-style:normal; }
        .gh-sub { color:#4A6741; font-size:0.9rem; line-height:1.7; max-width:330px; margin-bottom:2rem; }
        .gh-secure-badge { display:inline-flex; align-items:center; gap:0.55rem; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:0.55rem 0.9rem; font-family:'JetBrains Mono',monospace; font-size:0.65rem; color:#10B981; letter-spacing:0.08em; }
        .gh-panel { display:flex; flex-direction:column; justify-content:center; align-items:center; padding:3rem 2.5rem; }
        .gh-wrap { width:100%; max-width:400px; }
        .gh-logo-link { font-family:'Bebas Neue',cursive; font-size:1.4rem; letter-spacing:0.08em; color:#1E293B; text-decoration:none; display:flex; align-items:center; gap:0.55rem; margin-bottom:2.5rem; }
        .gh-logo-link .dot { width:8px; height:8px; border-radius:50%; background:#E8571A; }
        .gh-logo-link span em { color:#E8571A; font-style:normal; }
        .gh-title { font-family:'Bebas Neue',cursive; font-size:2.2rem; letter-spacing:0.04em; color:#1E293B; line-height:1; }
        .gh-title-tag { display:inline-block; margin-left:0.6rem; font-family:'JetBrains Mono',monospace; font-size:0.55rem; background:rgba(16,185,129,0.08); color:#10B981; border:1px solid rgba(16,185,129,0.2); border-radius:4px; padding:0.12rem 0.45rem; vertical-align:middle; letter-spacing:0.08em; text-transform:uppercase; }
        .gh-title-sub { font-size:0.85rem; color:#64748B; margin-top:0.4rem; margin-bottom:2rem; }
        .gh-field { margin-bottom:1.1rem; }
        .gh-field label { display:block; font-family:'JetBrains Mono',monospace; font-size:0.6rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:0.5rem; }
        .gh-input-wrap { position:relative; }
        .gh-input { width:100%; padding:0.82rem 1rem; border-radius:12px; border:1.5px solid #E2E8F0; background:#F8FAFC; outline:none; font-family:'JetBrains Mono',monospace; font-size:0.9rem; color:#1E293B; transition:all 0.18s; }
        .gh-input:focus { border-color:#10B981; background:#fff; box-shadow:0 0 0 3px rgba(16,185,129,0.08); }
        .gh-input::placeholder { color:#CBD5E1; font-family:'DM Sans',sans-serif; }
        .gh-pw-toggle { position:absolute; right:1rem; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; font-size:0.8rem; }
        .gh-warning { background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#D97706; }
        .gh-error { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); border-radius:8px; padding:0.65rem 0.85rem; margin-bottom:1rem; font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#EF4444; }
        .gh-submit { width:100%; padding:0.92rem; border-radius:12px; border:none; cursor:pointer; background:linear-gradient(135deg, #059669 0%, #10B981 100%); color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:700; transition:all 0.22s; margin-top:0.35rem; box-shadow:0 4px 20px rgba(16,185,129,0.28); }
        .gh-submit:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(16,185,129,0.4); }
        .gh-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .gh-note { font-size:0.78rem; color:#94A3B8; text-align:center; line-height:1.6; margin-top:1.6rem; }
        .gh-spinner { display:inline-block; width:15px; height:15px; border-radius:50%; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; animation:spin 0.65s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="gh-root">
        <div className="gh-hero">
          <div className="gh-matrix-bg" /><div className="gh-matrix-glow" />
          <div className="gh-badge">Admin · Traffic Control · Secure Access</div>
          <div className="gh-icon">🖥️</div>
          <h2 className="gh-headline">Admin /<br /><em>Traffic</em> Console</h2>
          <p className="gh-sub">Monitor every active emergency corridor, approve private requests, view live ETAs and manage all system operations.</p>
          <div ref={termRef} className="gh-term-preview">
            <div className="gh-term-pre">{termLines.join("\n")}<span className="gh-term-cursor" /></div>
          </div>
          <div className="gh-secure-badge">🔒 Secure · Monitored · Restricted Access</div>
        </div>
        <div className="gh-panel">
          <div className="gh-wrap">
            <Link href="/" className="gh-logo-link"><div className="dot" /><span>Golden<em>Hour</em></span></Link>
            <h1 className="gh-title">Secure Login<span className="gh-title-tag">Admin Only</span></h1>
            <p className="gh-title-sub">Restricted to administrators and traffic controllers</p>
            <div className="gh-warning">⚠ This portal is for authorised personnel only. All access attempts are logged and monitored.</div>
            <form onSubmit={handleLogin}>
              <div className="gh-field"><label>Admin Email</label><input className="gh-input" type="email" placeholder="admin@goldenhour.app" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></div>
              <div className="gh-field"><label>Password</label><div className="gh-input-wrap"><input className="gh-input" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: "3rem" }} /><button type="button" className="gh-pw-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁"}</button></div></div>
              {error && <div className="gh-error">✗ {error}</div>}
              <button type="submit" className="gh-submit" disabled={loading}>{loading && <span className="gh-spinner" />}{loading ? "Authenticating…" : "Access Admin Console →"}</button>
            </form>
            <p className="gh-note" style={{ marginTop: "1.5rem" }}><Link href="/" style={{ color: "#94A3B8", fontSize: "0.75rem" }}>← Back to Home</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
