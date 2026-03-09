"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => {
                    if (e.isIntersecting) e.target.classList.add("visible");
                }),
            { threshold: 0.1 }
        );
        document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {
          --midnight: #050C1A;
          --navy: #0A1628;
          --navy2: #0F2040;
          --orange: #FF6B1A;
          --amber: #FFB347;
          --white: #F5F7FA;
          --muted: #8A9BB5;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        body {
          background: var(--midnight);
          color: var(--white);
          font-family: 'DM Sans', sans-serif;
          overflow-x: auto;
        }

        .font-display { font-family: 'Bebas Neue', cursive; }
        .font-mono-gh { font-family: 'JetBrains Mono', monospace; }

        /* Grid background */
        .bg-grid-gh {
          background-image:
            linear-gradient(rgba(255,107,26,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,107,26,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* Ambient orb */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
          animation: orbDrift 12s ease-in-out infinite alternate;
        }
        @keyframes orbDrift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, 20px) scale(1.05); }
        }

        /* Status ticker */
        .ticker-wrap {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; gap: 1rem;
          padding: 0.4rem 1.5rem;
          background: rgba(255,107,26,0.07);
          border-bottom: 1px solid rgba(255,107,26,0.15);
          overflow: hidden;
        }
        .ticker-live {
          display: flex; align-items: center; gap: 0.4rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem; color: #34D399; flex-shrink: 0;
        }
        .ticker-dot {
          width: 6px; height: 6px; background: #34D399;
          border-radius: 50%;
          animation: blink 1.2s ease-in-out infinite;
        }
        .ticker-track {
          display: flex; gap: 3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem; color: var(--muted);
          white-space: nowrap;
          animation: ticker 22s linear infinite;
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* Navbar */
        .navbar {
          position: fixed; top: 30px; left: 0; right: 0; z-index: 90;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 3rem;
          background: rgba(5,12,26,0.88);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,107,26,0.1);
          animation: slideDown 0.8s ease both;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }

        /* Logo */
        .logo-wrap { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; }
        .logo-icon { position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
        .logo-ring {
          position: absolute; width: 36px; height: 36px;
          border: 2px solid #FF6B1A; border-radius: 50%;
          animation: logoPulse 2s ease-out infinite;
        }
        .logo-ring:nth-child(2) { animation-delay: 0.7s; }
        @keyframes logoPulse {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .logo-dot {
          width: 10px; height: 10px; background: #FF6B1A;
          border-radius: 50%; z-index: 1; position: relative;
          box-shadow: 0 0 12px #FF6B1A;
        }
        .logo-text {
          font-family: 'Bebas Neue', cursive;
          font-size: 1.6rem; letter-spacing: 0.08em; color: var(--white);
        }
        .logo-text span { color: #FF6B1A; }

        /* Nav links */
        .nav-links { display: flex; gap: 2rem; list-style: none; }
        .nav-links a {
          color: var(--muted); text-decoration: none;
          font-size: 0.82rem; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--white); }

        /* Buttons */
        .btn {
          padding: 0.5rem 1.3rem; border-radius: 5px;
          font-size: 0.85rem; font-weight: 500;
          cursor: pointer; text-decoration: none;
          border: none; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,107,26,0.25);
          color: var(--white);
        }
        .btn-ghost:hover { border-color: #FF6B1A; color: #FF6B1A; }
        .btn-primary {
          background: #FF6B1A; color: #050C1A; font-weight: 700;
          box-shadow: 0 0 20px rgba(255,107,26,0.3);
        }
        .btn-primary:hover { background: var(--amber); box-shadow: 0 0 30px rgba(255,107,26,0.5); transform: translateY(-1px); }

        /* Hero */
        .hero {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 1;
          padding: 9rem 3rem 4rem;
        }
        .hero-inner {
          max-width: 1200px; width: 100%;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center;
        }

        /* Hero badge */
        .hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(255,107,26,0.08);
          border: 1px solid rgba(255,107,26,0.25);
          border-radius: 100px; padding: 0.3rem 0.9rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem; color: #FF6B1A;
          letter-spacing: 0.07em; margin-bottom: 1.5rem;
          animation: fadeUp 0.8s 0.3s ease both;
        }
        .badge-dot { width: 6px; height: 6px; background: #FF6B1A; border-radius: 50%; animation: blink 1.2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        /* Heading */
        .hero-heading {
          font-family: 'Bebas Neue', cursive;
          font-size: clamp(3.5rem, 7vw, 6rem);
          line-height: 0.95; letter-spacing: 0.02em;
          animation: fadeUp 0.8s 0.5s ease both;
        }
        .heading-orange { color: #FF6B1A; display: block; }

        .hero-sub {
          margin-top: 1.4rem; color: var(--muted);
          font-size: 0.97rem; line-height: 1.7; max-width: 440px;
          animation: fadeUp 0.8s 0.7s ease both;
        }

        /* CTA buttons */
        .hero-actions { margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap; animation: fadeUp 0.8s 0.9s ease both; }
        .btn-hero {
          padding: 0.85rem 2rem; font-size: 0.95rem; border-radius: 7px;
          font-weight: 700; cursor: pointer; border: none;
          text-decoration: none; transition: all 0.25s;
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-hero-primary {
          background: #FF6B1A; color: #050C1A;
          box-shadow: 0 4px 30px rgba(255,107,26,0.4);
        }
        .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(255,107,26,0.55); }
        .btn-hero-outline {
          background: transparent; color: var(--white);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .btn-hero-outline:hover { border-color: var(--white); transform: translateY(-2px); }

        /* Stats */
        .hero-stats { margin-top: 2.5rem; display: flex; gap: 2rem; animation: fadeUp 0.8s 1.1s ease both; }
        .stat-num { font-family: 'Bebas Neue', cursive; font-size: 2rem; color: #FF6B1A; letter-spacing: 0.05em; display: block; }
        .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Radar */
        .radar-wrap {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          animation: fadeUp 1s 0.4s ease both;
        }
        .radar-box { position: relative; width: 400px; height: 400px; }

        .r-crosshair-h, .r-crosshair-v {
          position: absolute; background: rgba(255,107,26,0.1);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
        }
        .r-crosshair-h { width: 400px; height: 1px; }
        .r-crosshair-v { width: 1px; height: 400px; }

        .r-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(255,107,26,0.18);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
        }
        .r-ring-1 { width: 80px;  height: 80px;  border-color: rgba(255,107,26,0.5); }
        .r-ring-2 { width: 160px; height: 160px; }
        .r-ring-3 { width: 240px; height: 240px; }
        .r-ring-4 { width: 320px; height: 320px; }
        .r-ring-5 { width: 400px; height: 400px; border-color: rgba(255,107,26,0.07); }

        .r-pulse {
          position: absolute; border-radius: 50%;
          border: 2px solid rgba(255,107,26,0.6);
          width: 400px; height: 400px;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%) scale(0);
          animation: radarPulse 3s ease-out infinite;
        }
        .r-pulse-2 { animation-delay: 1s; }
        .r-pulse-3 { animation-delay: 2s; }
        @keyframes radarPulse {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }

        .r-sweep {
          position: absolute; top: 50%; left: 50%;
          width: 50%; height: 2px;
          transform-origin: left center;
          animation: sweep 3.5s linear infinite;
        }
        .r-sweep::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(255,107,26,0.9), transparent);
        }
        .r-sweep::after {
          content: '';
          position: absolute; top: -40px; left: 0; right: 0; height: 80px;
          background: conic-gradient(from -5deg at 0% 50%, rgba(255,107,26,0.18), transparent 55deg);
        }
        @keyframes sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .r-center {
          position: absolute; top: 50%; left: 50%;
          width: 12px; height: 12px;
          background: #FF6B1A; border-radius: 50%; z-index: 2;
          transform: translate(-50%,-50%);
          box-shadow: 0 0 0 4px rgba(255,107,26,0.25), 0 0 20px #FF6B1A;
        }

        .r-corridor {
          position: absolute; top: 38%; left: 52%;
          width: 130px; height: 2px; z-index: 2;
          background: linear-gradient(90deg, rgba(255,107,26,0.85), rgba(255,107,26,0.1));
          transform-origin: left center;
          transform: rotate(-22deg);
          animation: corridorGlow 2s ease-in-out infinite alternate;
        }
        @keyframes corridorGlow {
          from { box-shadow: 0 0 4px #FF6B1A; }
          to   { box-shadow: 0 0 16px #FF6B1A, 0 0 32px rgba(255,107,26,0.4); }
        }

        .blip {
          position: absolute; width: 8px; height: 8px;
          border-radius: 50%; transform: translate(-50%,-50%); z-index: 2;
        }
        .blip::after {
          content: '';
          position: absolute; inset: -4px; border-radius: 50%;
          border: 1px solid currentColor;
          animation: blipPulse 2s ease-out infinite;
        }
        @keyframes blipPulse { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.8);opacity:0} }

        .blip-amb  { top:38%;left:52%; background:#FF6B1A;color:#FF6B1A;box-shadow:0 0 10px #FF6B1A; }
        .blip-c1   { top:55%;left:38%; background:#60A5FA;color:#60A5FA; animation-delay:0.3s; }
        .blip-c2   { top:30%;left:65%; background:#60A5FA;color:#60A5FA; animation-delay:0.6s; }
        .blip-c3   { top:62%;left:60%; background:#60A5FA;color:#60A5FA; animation-delay:0.9s; }
        .blip-priv { top:45%;left:28%; background:#FFB347;color:#FFB347; animation-delay:0.5s; }

        .blip-label {
          position: absolute; top: 28%; left: 54%;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem; color: #FF6B1A;
          background: rgba(5,12,26,0.88);
          padding: 0.15rem 0.45rem; border-radius: 3px;
          border: 1px solid rgba(255,107,26,0.3);
          white-space: nowrap; z-index: 3;
          animation: labelBlink 2s ease-in-out infinite;
        }
        @keyframes labelBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Section divider */
        .divider {
          max-width: 1200px; margin: 0 auto;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,107,26,0.3), transparent);
        }

        /* Section common */
        .section { max-width: 1200px; margin: 0 auto; padding: 6rem 3rem; position: relative; z-index: 1; }
        .section-label { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #FF6B1A; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.8rem; }
        .section-title { font-family: 'Bebas Neue', cursive; font-size: clamp(2.5rem,5vw,4rem); line-height: 1; letter-spacing: 0.02em; margin-bottom: 1rem; }
        .section-title span { color: #FF6B1A; }

        /* Scroll reveal */
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        /* Features grid */
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1.5px;
          background: rgba(255,107,26,0.1);
          border: 1px solid rgba(255,107,26,0.1);
          border-radius: 12px; overflow: hidden;
          margin-top: 2.5rem;
        }
        .feature-card {
          background: var(--navy); padding: 2rem;
          transition: background 0.3s; position: relative; overflow: hidden;
          cursor: default;
        }
        .feature-card:hover { background: var(--navy2); }
        .feature-num { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: rgba(255,107,26,0.4); margin-bottom: 1rem; display: block; }
        .feature-icon { font-size: 1.8rem; margin-bottom: 1rem; display: block; }
        .feature-title { font-weight: 700; font-size: 1rem; margin-bottom: 0.6rem; color: var(--white); }
        .feature-desc { font-size: 0.85rem; color: var(--muted); line-height: 1.6; }
        .feature-badge {
          display: inline-block; margin-top: 0.8rem;
          font-family: 'JetBrains Mono', monospace; font-size: 0.65rem;
          color: #FF6B1A; background: rgba(255,107,26,0.1);
          border-radius: 3px; padding: 0.2rem 0.5rem; letter-spacing: 0.04em;
        }

        /* Roles */
        .roles-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin-top: 2.5rem; }
        .role-card {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 1.8rem 1.4rem;
          background: var(--navy); cursor: pointer;
          transition: all 0.3s; text-decoration: none; color: var(--white);
          display: block; position: relative; overflow: hidden;
        }
        .role-card::after {
          content: ''; position: absolute;
          bottom: 0; left: 0; right: 0; height: 2px;
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s;
          background: var(--accent-color, #FF6B1A);
        }
        .role-card:hover { transform: translateY(-4px); border-color: rgba(255,107,26,0.3); }
        .role-card:hover::after { transform: scaleX(1); }
        .role-icon { font-size: 2rem; margin-bottom: 1rem; display: block; }
        .role-name { font-weight: 700; font-size: 1rem; margin-bottom: 0.4rem; }
        .role-desc { font-size: 0.8rem; color: var(--muted); line-height: 1.5; margin-bottom: 1rem; }
        .role-priority { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; letter-spacing: 0.05em; font-weight: 600; }

        /* Steps */
        .steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; }
        .steps { display: flex; flex-direction: column; }
        .step { display: grid; grid-template-columns: 60px 1fr; gap: 1.5rem; padding: 1.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: start; }
        .step:last-child { border-bottom: none; }
        .step-num { font-family: 'Bebas Neue', cursive; font-size: 3rem; color: rgba(255,107,26,0.22); line-height: 1; }
        .step-title { font-weight: 700; font-size: 1.02rem; margin-bottom: 0.4rem; }
        .step-desc { font-size: 0.875rem; color: var(--muted); line-height: 1.65; }
        .step-tag {
          display: inline-block; margin-top: 0.55rem;
          font-family: 'JetBrains Mono', monospace; font-size: 0.65rem;
          color: var(--muted); background: rgba(255,255,255,0.05);
          border-radius: 3px; padding: 0.2rem 0.5rem;
        }

        /* CTA */
        .cta-wrap {
          position: relative; z-index: 1;
          margin: 0 3rem 6rem;
          border: 1px solid rgba(255,107,26,0.2);
          border-radius: 16px; overflow: hidden;
          background: var(--navy);
        }
        .cta-inner {
          padding: 5rem 4rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 3rem; flex-wrap: wrap;
        }
        .cta-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 70% 50%, rgba(255,107,26,0.08), transparent 70%);
        }
        .cta-title { font-family: 'Bebas Neue', cursive; font-size: clamp(2.5rem,5vw,4rem); line-height: 0.95; }
        .cta-title span { color: #FF6B1A; }
        .cta-sub { color: var(--muted); font-size: 0.95rem; margin-top: 0.8rem; max-width: 400px; }
        .cta-actions { display: flex; gap: 1rem; flex-wrap: wrap; }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 2.5rem 3rem;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
          position: relative; z-index: 1;
        }
        .footer-logo { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.08em; color: var(--muted); }
        .footer-logo span { color: #FF6B1A; }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-links a { font-size: 0.8rem; color: var(--muted); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: #FF6B1A; }
        .footer-copy { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: rgba(138,155,181,0.45); }

        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; }
          .radar-box { width: 300px; height: 300px; }
          .features-grid { grid-template-columns: 1fr; }
          .roles-grid { grid-template-columns: 1fr 1fr; }
          .steps-grid { grid-template-columns: 1fr; }
          .navbar { padding: 1rem 1.5rem; }
          .nav-links { display: none; }
        }
      `}</style>

            {/* Ambient orbs */}
            <div className="orb" style={{ width: 600, height: 600, background: "rgba(255,107,26,0.1)", top: -200, right: -100 }} />
            <div className="orb" style={{ width: 400, height: 400, background: "rgba(10,60,120,0.28)", bottom: "10%", left: -100, animationDelay: "-6s" }} />

            {/* Status ticker */}
            <div className="ticker-wrap">
                <div className="ticker-live">
                    <div className="ticker-dot" />
                    LIVE
                </div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                    <div className="ticker-track">
                        {[
                            "Real-time GPS tracking enabled",
                            "Green corridor protocol: READY",
                            "Alert latency: <3s",
                            "WebSocket: CONNECTED",
                            "Route calculation: <2s",
                            "Geo-fence radius: 200m",
                            "Real-time GPS tracking enabled",
                            "Green corridor protocol: READY",
                            "Alert latency: <3s",
                            "WebSocket: CONNECTED",
                            "Route calculation: <2s",
                            "Geo-fence radius: 200m",
                        ].map((t, i) => (
                            <span key={i}>▸ {t}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Navbar */}
            <nav className="navbar">
                <Link href="/" className="logo-wrap">
                    <div className="logo-icon">
                        <div className="logo-ring" />
                        <div className="logo-ring" />
                        <div className="logo-dot" />
                    </div>
                    <span className="logo-text">Golden<span>Hour</span></span>
                </Link>
                <ul className="nav-links">
                    {["Features", "Roles", "How It Works"].map((l) => (
                        <li key={l}><a href={`#${l.toLowerCase().replace(/ /g, "-")}`}>{l}</a></li>
                    ))}
                </ul>
                <div style={{ display: "flex", gap: "0.8rem" }}>
                    <Link href="/auth" className="btn btn-ghost">Sign In</Link>
                    <Link href="/auth?mode=register" className="btn btn-primary">Get Started</Link>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="hero">
                <div className="hero-inner">
                    {/* Left */}
                    <div>
                        <div className="hero-badge">
                            <div className="badge-dot" />
                            Emergency Mobility Platform v1.0
                        </div>
                        <h1 className="hero-heading">
                            Every
                            <span className="heading-orange">Second</span>
                            Counts.
                        </h1>
                        <p className="hero-sub">
                            Golden Hour creates a virtual green corridor for ambulances in real time — clearing paths, alerting drivers, and saving lives. From urban streets to global cities.
                        </p>
                        <div className="hero-actions">
                            <Link href="/auth?mode=register" className="btn-hero btn-hero-primary">⚡ Activate Now</Link>
                            <a href="#how-it-works" className="btn-hero btn-hero-outline">▶ See How It Works</a>
                        </div>
                        <div className="hero-stats">
                            {[{ num: "<3s", label: "Alert Latency" }, { num: "200m", label: "Geo-fence Radius" }, { num: "4", label: "User Roles" }].map((s) => (
                                <div key={s.label}>
                                    <span className="stat-num">{s.num}</span>
                                    <span className="stat-label">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Radar */}
                    <div className="radar-wrap">
                        <div className="radar-box">
                            <div className="r-crosshair-h" />
                            <div className="r-crosshair-v" />
                            <div className="r-ring r-ring-1" />
                            <div className="r-ring r-ring-2" />
                            <div className="r-ring r-ring-3" />
                            <div className="r-ring r-ring-4" />
                            <div className="r-ring r-ring-5" />
                            <div className="r-pulse" />
                            <div className="r-pulse r-pulse-2" />
                            <div className="r-pulse r-pulse-3" />
                            <div className="r-sweep" />
                            <div className="r-center" />
                            <div className="r-corridor" />
                            <div className="blip blip-amb" />
                            <div className="blip blip-c1" />
                            <div className="blip blip-c2" />
                            <div className="blip blip-c3" />
                            <div className="blip blip-priv" />
                            <div className="blip-label">🚑 AMB-001</div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="divider" />

            {/* ── FEATURES ── */}
            <section id="features" className="section">
                <p className="section-label reveal">Core System</p>
                <h2 className="section-title reveal">Built for <span>Critical Moments</span></h2>
                <div className="features-grid reveal">
                    {[
                        { num: "01", icon: "📡", title: "Real-Time GPS Tracking", desc: "Live location updates every second via WebSocket. Zero lag between ambulance movement and corridor updates.", badge: "WS / <3s latency" },
                        { num: "02", icon: "🟢", title: "Virtual Green Corridor", desc: "Automatically computes and activates a corridor along the fastest route. Nearby drivers are cleared in real time.", badge: "Geo-fencing / 200m" },
                        { num: "03", icon: "🔔", title: "Dynamic Driver Alerts", desc: "Drivers within 1km receive instant lane-clearance push alerts on their devices.", badge: "Push / WebSocket" },
                        { num: "04", icon: "⚖️", title: "Priority Engine", desc: "Conflict resolution between overlapping emergencies. Ambulance always dominates with priority score 100.", badge: "Scores: 100 / 70 / 10" },
                        { num: "05", icon: "🗺️", title: "Smart Route Calculation", desc: "Fastest path computed in under 2 seconds using maps API integration with live traffic awareness.", badge: "Route / <2s" },
                        { num: "06", icon: "🖥️", title: "Admin War Room", desc: "Live dashboard: view all active emergencies, routes, ETAs, and affected vehicles simultaneously.", badge: "Dashboard / Live" },
                    ].map((f) => (
                        <div key={f.num} className="feature-card">
                            <span className="feature-num">{f.num}</span>
                            <span className="feature-icon">{f.icon}</span>
                            <div className="feature-title">{f.title}</div>
                            <div className="feature-desc">{f.desc}</div>
                            <span className="feature-badge">{f.badge}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="divider" />

            {/* ── ROLES ── */}
            <section id="roles" className="section">
                <p className="section-label reveal">Access Control</p>
                <h2 className="section-title reveal">Four Roles, <span>One Mission</span></h2>
                <div className="roles-grid reveal">
                    {[
                        { icon: "🚑", name: "Ambulance Driver", desc: "Activate emergency mode, get fastest route, terminate session on arrival.", priority: "PRIORITY 100 — MAXIMUM", color: "#FF6B1A", href: "/ambulance" },
                        { icon: "🚗", name: "Private Emergency", desc: "Request emergency corridor with admin approval. Lower priority than ambulance.", priority: "PRIORITY 70 — HIGH", color: "#FFB347", href: "/private-emergency" },
                        { icon: "🙋", name: "Normal Driver", desc: "Passive mode. Receives alerts and lane-clearance suggestions automatically.", priority: "PRIORITY 10 — STANDARD", color: "#60A5FA", href: "/driver" },
                        { icon: "🖥️", name: "Admin / Traffic", desc: "Monitor all active corridors, approve requests, view live ETAs and affected drivers.", priority: "CONTROL — FULL ACCESS", color: "#34D399", href: "/admin" },
                    ].map((r) => (
                        <Link key={r.name} href={r.href} className="role-card" style={{ ["--accent-color" as string]: r.color }}>
                            <span className="role-icon">{r.icon}</span>
                            <div className="role-name">{r.name}</div>
                            <div className="role-desc">{r.desc}</div>
                            <div className="role-priority" style={{ color: r.color }}>{r.priority}</div>
                        </Link>
                    ))}
                </div>
            </section>

            <div className="divider" />

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="section">
                <div className="steps-grid">
                    <div>
                        <p className="section-label reveal">Process</p>
                        <h2 className="section-title reveal" style={{ position: "sticky", top: "7rem" }}>
                            How the <span>Corridor</span> Forms
                        </h2>
                    </div>
                    <div className="steps reveal">
                        {[
                            { num: "01", title: "Driver Activates Emergency Mode", desc: "Ambulance driver opens the app and taps Activate. JWT-authenticated role is verified instantly.", tag: "FR3 / Auth" },
                            { num: "02", title: "Route Calculated in <2s", desc: "System computes fastest path to destination via Maps API and broadcasts it to the WebSocket server.", tag: "FR4 / Route Service" },
                            { num: "03", title: "Virtual Corridor Activates", desc: "A 200m geo-fence is drawn along the route. Vehicles inside the zone are flagged for alerting.", tag: "FR5 / Geo-fencing" },
                            { num: "04", title: "Nearby Drivers Alerted", desc: "Drivers within 1km ahead receive push notifications with lane-clearance instructions in real time.", tag: "FR6 / Notification" },
                            { num: "05", title: "Session Terminates on Arrival", desc: "Driver ends session. Corridor closes, geo-fence lifts, and all alerts are cleared from nearby devices.", tag: "FR8 / Session Manager" },
                        ].map((s) => (
                            <div key={s.num} className="step">
                                <div className="step-num">{s.num}</div>
                                <div>
                                    <div className="step-title">{s.title}</div>
                                    <div className="step-desc">{s.desc}</div>
                                    <span className="step-tag">{s.tag}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <div className="cta-wrap">
                <div className="cta-glow" />
                <div className="cta-inner">
                    <div>
                        <div className="cta-title">Ready to Build the <span>Golden Hour?</span></div>
                        <p className="cta-sub">Register your vehicle, choose your role, and join the network that keeps emergency lanes clear.</p>
                    </div>
                    <div className="cta-actions">
                        <Link href="/auth?mode=register" className="btn-hero btn-hero-primary">⚡ Register Now</Link>
                        <Link href="/admin" className="btn-hero btn-hero-outline">View Dashboard</Link>
                    </div>
                </div>
            </div>

            {/* ── FOOTER ── */}
            <footer className="footer">
                <span className="footer-logo">Golden<span>Hour</span></span>
                <div className="footer-links">
                    {["Docs", "GitHub", "API", "Privacy"].map((l) => <a key={l} href="#">{l}</a>)}
                </div>
                <span className="footer-copy">© 2025 GoldenHour — Emergency Mobility Platform</span>
            </footer>
        </>
    );
}
