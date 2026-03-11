"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;600&display=swap');

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
          --green:   #10B981;
          --blue:    #3B82F6;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        body {
          background: var(--cream);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        .font-display { font-family: 'Bebas Neue', cursive; }
        .font-mono-gh { font-family: 'JetBrains Mono', monospace; }

        /* Subtle dot pattern */
        .bg-dots {
          background-image: radial-gradient(circle, rgba(232,87,26,0.12) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* Ambient pastel orbs */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
          animation: orbDrift 14s ease-in-out infinite alternate;
        }
        @keyframes orbDrift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(25px, 18px) scale(1.05); }
        }

        /* Status ticker */
        .ticker-wrap {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; gap: 1rem;
          padding: 0.4rem 1.5rem;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(232,87,26,0.15);
          box-shadow: 0 1px 8px rgba(0,0,0,0.04);
        }
        .ticker-live {
          display: flex; align-items: center; gap: 0.4rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem; color: #059669; flex-shrink: 0; font-weight: 600;
        }
        .ticker-dot {
          width: 6px; height: 6px; background: #059669;
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
          background: rgba(255,251,245,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(232,87,26,0.12);
          box-shadow: 0 2px 20px rgba(232,87,26,0.06);
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
          border: 2px solid var(--orange); border-radius: 50%;
          animation: logoPulse 2s ease-out infinite;
        }
        .logo-ring:nth-child(2) { animation-delay: 0.7s; }
        @keyframes logoPulse {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .logo-dot {
          width: 10px; height: 10px; background: var(--orange);
          border-radius: 50%; z-index: 1; position: relative;
          box-shadow: 0 0 12px rgba(232,87,26,0.5);
        }
        .logo-text {
          font-family: 'Bebas Neue', cursive;
          font-size: 1.6rem; letter-spacing: 0.08em; color: var(--text);
        }
        .logo-text span { color: var(--orange); }

        /* Nav links */
        .nav-links { display: flex; gap: 2rem; list-style: none; }
        .nav-links a {
          color: var(--muted); text-decoration: none;
          font-size: 0.82rem; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--orange); }

        /* Buttons */
        .btn {
          padding: 0.5rem 1.3rem; border-radius: 8px;
          font-size: 0.85rem; font-weight: 500;
          cursor: pointer; text-decoration: none;
          border: none; transition: all 0.25s; font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost {
          background: transparent;
          border: 1.5px solid rgba(232,87,26,0.3);
          color: var(--orange);
        }
        .btn-ghost:hover { border-color: var(--orange); background: rgba(232,87,26,0.06); transform: translateY(-1px); }
        .btn-primary {
          background: var(--orange); color: #fff; font-weight: 700;
          box-shadow: 0 4px 16px rgba(232,87,26,0.3);
        }
        .btn-primary:hover { background: var(--orange2); box-shadow: 0 6px 24px rgba(232,87,26,0.45); transform: translateY(-1px); }

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
          background: rgba(232,87,26,0.08);
          border: 1.5px solid rgba(232,87,26,0.2);
          border-radius: 100px; padding: 0.35rem 1rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem; color: var(--orange);
          letter-spacing: 0.07em; margin-bottom: 1.5rem;
          animation: fadeUp 0.8s 0.3s ease both;
        }
        .badge-dot { width: 6px; height: 6px; background: var(--orange); border-radius: 50%; animation: blink 1.2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        /* Heading */
        .hero-heading {
          font-family: 'Bebas Neue', cursive;
          font-size: clamp(3.5rem, 7vw, 6rem);
          line-height: 0.95; letter-spacing: 0.02em;
          color: var(--text);
          animation: fadeUp 0.8s 0.5s ease both;
        }
        .heading-orange { color: var(--orange); display: block; }

        .hero-sub {
          margin-top: 1.4rem; color: var(--muted);
          font-size: 1rem; line-height: 1.75; max-width: 440px;
          animation: fadeUp 0.8s 0.7s ease both;
        }

        /* CTA buttons */
        .hero-actions { margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap; animation: fadeUp 0.8s 0.9s ease both; }
        .btn-hero {
          padding: 0.9rem 2rem; font-size: 0.95rem; border-radius: 10px;
          font-weight: 700; cursor: pointer; border: none;
          text-decoration: none; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-hero-primary {
          background: var(--orange); color: #fff;
          box-shadow: 0 4px 24px rgba(232,87,26,0.35);
        }
        .btn-hero-primary:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 10px 36px rgba(232,87,26,0.5); }
        .btn-hero-outline {
          background: #fff; color: var(--text);
          border: 1.5px solid var(--border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .btn-hero-outline:hover { border-color: var(--orange); color: var(--orange); transform: translateY(-3px); box-shadow: 0 6px 20px rgba(232,87,26,0.12); }

        /* Stats */
        .hero-stats { margin-top: 2.5rem; display: flex; gap: 2.5rem; animation: fadeUp 0.8s 1.1s ease both; }
        .stat-num { font-family: 'Bebas Neue', cursive; font-size: 2rem; color: var(--orange); letter-spacing: 0.05em; display: block; }
        .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
        .stat-divider { width: 1px; background: var(--border); align-self: stretch; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Radar (light version) */
        .radar-wrap {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          animation: fadeUp 1s 0.4s ease both;
        }
        .radar-box {
          position: relative; width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(232,87,26,0.04) 0%, rgba(255,251,245,0) 70%);
          border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(232,87,26,0.08), 0 20px 60px rgba(232,87,26,0.08);
        }

        .r-crosshair-h, .r-crosshair-v {
          position: absolute; background: rgba(232,87,26,0.12);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
        }
        .r-crosshair-h { width: 420px; height: 1px; }
        .r-crosshair-v { width: 1px; height: 420px; }

        .r-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(232,87,26,0.14);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
        }
        .r-ring-1 { width: 80px;  height: 80px;  border-color: rgba(232,87,26,0.4); }
        .r-ring-2 { width: 168px; height: 168px; }
        .r-ring-3 { width: 252px; height: 252px; }
        .r-ring-4 { width: 336px; height: 336px; }
        .r-ring-5 { width: 420px; height: 420px; border-color: rgba(232,87,26,0.07); }

        .r-pulse {
          position: absolute; border-radius: 50%;
          border: 2px solid rgba(232,87,26,0.5);
          width: 420px; height: 420px;
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
          background: linear-gradient(90deg, rgba(232,87,26,0.85), transparent);
        }
        .r-sweep::after {
          content: '';
          position: absolute; top: -40px; left: 0; right: 0; height: 80px;
          background: conic-gradient(from -5deg at 0% 50%, rgba(232,87,26,0.14), transparent 55deg);
        }
        @keyframes sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .r-center {
          position: absolute; top: 50%; left: 50%;
          width: 14px; height: 14px;
          background: var(--orange); border-radius: 50%; z-index: 2;
          transform: translate(-50%,-50%);
          box-shadow: 0 0 0 4px rgba(232,87,26,0.2), 0 0 20px rgba(232,87,26,0.6);
        }

        .r-corridor {
          position: absolute; top: 38%; left: 52%;
          width: 130px; height: 2px; z-index: 2;
          background: linear-gradient(90deg, rgba(232,87,26,0.75), rgba(232,87,26,0.05));
          transform-origin: left center;
          transform: rotate(-22deg);
          animation: corridorGlow 2s ease-in-out infinite alternate;
        }
        @keyframes corridorGlow {
          from { box-shadow: 0 0 4px rgba(232,87,26,0.4); }
          to   { box-shadow: 0 0 16px rgba(232,87,26,0.7), 0 0 32px rgba(232,87,26,0.3); }
        }

        .blip {
          position: absolute; width: 9px; height: 9px;
          border-radius: 50%; transform: translate(-50%,-50%); z-index: 2;
        }
        .blip::after {
          content: '';
          position: absolute; inset: -4px; border-radius: 50%;
          border: 1.5px solid currentColor;
          animation: blipPulse 2s ease-out infinite;
        }
        @keyframes blipPulse { 0%{transform:scale(1);opacity:1} 100%{transform:scale(3);opacity:0} }

        .blip-amb  { top:38%;left:52%; background:var(--orange);color:var(--orange);box-shadow:0 0 10px rgba(232,87,26,0.7); }
        .blip-c1   { top:55%;left:38%; background:#3B82F6;color:#3B82F6; animation-delay:0.3s; }
        .blip-c2   { top:30%;left:65%; background:#3B82F6;color:#3B82F6; animation-delay:0.6s; }
        .blip-c3   { top:62%;left:60%; background:#3B82F6;color:#3B82F6; animation-delay:0.9s; }
        .blip-priv { top:45%;left:28%; background:var(--amber);color:var(--amber); animation-delay:0.5s; }

        .blip-label {
          position: absolute; top: 28%; left: 54%;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem; color: var(--orange);
          background: rgba(255,251,245,0.95);
          padding: 0.15rem 0.45rem; border-radius: 4px;
          border: 1px solid rgba(232,87,26,0.25);
          white-space: nowrap; z-index: 3;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          animation: labelBlink 2s ease-in-out infinite;
        }
        @keyframes labelBlink { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* Section divider */
        .divider {
          max-width: 1200px; margin: 0 auto;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,87,26,0.2), transparent);
        }

        /* Section common */
        .section { max-width: 1200px; margin: 0 auto; padding: 6rem 3rem; position: relative; z-index: 1; }
        .section-label { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--orange); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.8rem; font-weight: 600; }
        .section-title { font-family: 'Bebas Neue', cursive; font-size: clamp(2.5rem,5vw,4rem); line-height: 1; letter-spacing: 0.02em; color: var(--text); margin-bottom: 1rem; }
        .section-title span { color: var(--orange); }

        /* Scroll reveal */
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        /* Features grid */
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          margin-top: 3.5rem;
          box-shadow: 0 4px 32px rgba(0,0,0,0.06);
        }
        .feature-card {
          background: #fff; padding: 2.5rem;
          transition: all 0.3s ease;
          position: relative; overflow: hidden;
          cursor: default;
        }
        .feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--orange), var(--amber));
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.4s ease;
          z-index: 2;
        }
        .feature-card:hover { 
          background: var(--warm); 
        }
        .feature-card:hover::before { transform: scaleX(1); }
        .feature-num { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: rgba(232,87,26,0.4); margin-bottom: 1rem; display: block; font-weight: 600; }
        .feature-icon { font-size: 2rem; margin-bottom: 0.9rem; display: block; transition: transform 0.3s; }
        .feature-card:hover .feature-icon { transform: scale(1.15) rotate(-3deg); }
        .feature-title { font-weight: 700; font-size: 1rem; margin-bottom: 0.5rem; color: var(--text); }
        .feature-desc { font-size: 0.85rem; color: var(--muted); line-height: 1.65; }
        .feature-badge {
          display: inline-block; margin-top: 0.9rem;
          font-family: 'JetBrains Mono', monospace; font-size: 0.63rem;
          color: var(--orange); background: rgba(232,87,26,0.08);
          border-radius: 4px; padding: 0.2rem 0.55rem; letter-spacing: 0.04em;
          border: 1px solid rgba(232,87,26,0.15);
        }

        /* Roles */
        .roles-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1.2rem; margin-top: 2.5rem; }
        .role-card {
          border: 1.5px solid var(--border);
          border-radius: 14px; padding: 2rem 1.5rem;
          background: #fff; cursor: pointer;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          text-decoration: none; color: var(--text);
          display: block; position: relative; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .role-card::after {
          content: ''; position: absolute;
          bottom: 0; left: 0; right: 0; height: 3px;
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s;
          background: var(--accent-color, var(--orange));
          border-radius: 0 0 12px 12px;
        }
        .role-card:hover { transform: translateY(-6px); border-color: var(--accent-color, var(--orange)); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
        .role-card:hover::after { transform: scaleX(1); }
        .role-icon { font-size: 2.2rem; margin-bottom: 1rem; display: block; transition: transform 0.3s; }
        .role-card:hover .role-icon { transform: scale(1.1); }
        .role-name { font-weight: 700; font-size: 1rem; margin-bottom: 0.4rem; color: var(--text); }
        .role-desc { font-size: 0.8rem; color: var(--muted); line-height: 1.55; margin-bottom: 1rem; }
        .role-priority { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; letter-spacing: 0.06em; font-weight: 700; }

        /* Steps */
        .steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: start; }
        .steps { display: flex; flex-direction: column; }
        .step {
          display: grid; grid-template-columns: 60px 1fr; gap: 1.5rem;
          padding: 1.8rem 0; border-bottom: 1px solid var(--border);
          align-items: start;
          transition: all 0.2s;
        }
        .step:last-child { border-bottom: none; }
        .step:hover { transform: translateX(4px); }
        .step-num { font-family: 'Bebas Neue', cursive; font-size: 3rem; color: rgba(232,87,26,0.2); line-height: 1; }
        .step-title { font-weight: 700; font-size: 1rem; margin-bottom: 0.4rem; color: var(--text); }
        .step-desc { font-size: 0.875rem; color: var(--muted); line-height: 1.65; }
        .step-tag {
          display: inline-block; margin-top: 0.55rem;
          font-family: 'JetBrains Mono', monospace; font-size: 0.63rem;
          color: var(--muted); background: var(--slate);
          border-radius: 4px; padding: 0.2rem 0.55rem;
          border: 1px solid var(--border);
        }

        /* CTA */
        .cta-wrap {
          position: relative; z-index: 1;
          margin: 0 3rem 8rem;
          border: 1px solid rgba(232,87,26,0.15);
          border-radius: 32px; overflow: hidden;
          background: #fff;
          box-shadow: 0 4px 64px rgba(0,0,0,0.04);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .cta-wrap:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 80px rgba(232,87,26,0.12);
        }
        .cta-inner {
          padding: 6rem 5rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 4rem; flex-wrap: wrap;
          position: relative; z-index: 2;
        }
        .cta-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 80% 50%, rgba(232,87,26,0.1), transparent 60%);
          mix-blend-mode: multiply;
        }
        .cta-pattern {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(var(--orange) 1px, transparent 1px);
          background-size: 32px 32px; opacity: 0.05;
        }
        .cta-title { font-family: 'Bebas Neue', cursive; font-size: clamp(3rem,6vw,5rem); line-height: 0.9; color: var(--text); }
        .cta-title span { color: var(--orange); }
        .cta-sub { color: var(--muted); font-size: 1.1rem; margin-top: 1.2rem; max-width: 500px; line-height: 1.6; }
        .cta-actions { display: flex; gap: 1.2rem; flex-wrap: wrap; margin-top: 2.5rem; }

        /* Footer */
        .site-footer {
          border-top: 1px solid var(--border);
          padding: 2.5rem 3rem;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
          position: relative; z-index: 1;
          background: #fff;
        }
        .footer-logo { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.08em; color: var(--text); }
        .footer-logo span { color: var(--orange); }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-links a { font-size: 0.8rem; color: var(--muted); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: var(--orange); }
        .footer-copy { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: var(--muted); opacity: 0.5; }

        /* Section bg alternates */
        .section-alt { background: var(--slate); }
        .section-bg-warm { background: var(--warm); }

        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; }
          .radar-box { width: 300px; height: 300px; }
          .features-grid { grid-template-columns: 1fr; }
          .roles-grid { grid-template-columns: 1fr 1fr; }
          .steps-grid { grid-template-columns: 1fr; }
          .navbar { padding: 1rem 1.5rem; }
          .nav-links { display: none; }
          .cta-wrap { margin: 0 1.5rem 4rem; }
          .cta-inner { padding: 3rem 2rem; }
        }
      `}</style>

      {/* Ambient orbs */}
      <div className="orb" style={{ width: 600, height: 600, background: "rgba(232,87,26,0.07)", top: -200, right: -150 }} />
      <div className="orb" style={{ width: 500, height: 500, background: "rgba(245,158,11,0.06)", bottom: "10%", left: -150, animationDelay: "-6s" }} />
      <div className="orb" style={{ width: 300, height: 300, background: "rgba(59,130,246,0.05)", top: "40%", right: "5%", animationDelay: "-3s" }} />

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
        <div style={{ display: "flex", gap: "0.80rem", flexWrap: "wrap", justifyContent: "flex-end", alignItems: 'center' }}>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: 700 }}>🚨 Emergency Request</button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <Link href="/auth?role=hospital" className="btn btn-ghost">Hospitals</Link>
          <Link href="/auth?role=ambulance" className="btn btn-ghost">Ambulance</Link>
          <Link href="/organizer" className="btn btn-ghost">Organizer Login</Link>
          <Link href="/auth?role=admin" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Admin Portal</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero bg-dots">
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
              {[{ num: "<3s", label: "Alert Latency" }, { num: "200m", label: "Geo-fence Radius" }, { num: "4", label: "User Roles" }].map((s, i) => (
                <>
                  {i > 0 && <div key={`d${i}`} className="stat-divider" />}
                  <div key={s.label}>
                    <span className="stat-num">{s.num}</span>
                    <span className="stat-label">{s.label}</span>
                  </div>
                </>
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
            { icon: "🚑", name: "Ambulance Driver", desc: "Activate emergency mode, get fastest route, terminate session on arrival.", priority: "PRIORITY 100 — MAXIMUM", color: "#E8571A", href: "/ambulance" },
            { icon: "🚗", name: "Private Emergency", desc: "Request emergency corridor with admin approval. Lower priority than ambulance.", priority: "PRIORITY 70 — HIGH", color: "#F59E0B", href: "/private-emergency" },
            { icon: "🙋", name: "Normal Driver", desc: "Passive mode. Receives alerts and lane-clearance suggestions automatically.", priority: "PRIORITY 10 — STANDARD", color: "#3B82F6", href: "/driver" },
            { icon: "🖥️", name: "Admin / Traffic", desc: "Monitor all active corridors, approve requests, view live ETAs and affected drivers.", priority: "CONTROL — FULL ACCESS", color: "#10B981", href: "/admin" },
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
      {/* ── CTA ── */}
      <div className="cta-wrap reveal">
        <div className="cta-glow" />
        <div className="cta-pattern" />
        <div className="cta-inner">
          <div style={{ flex: 1 }}>
            <div className="cta-title">Ready to Build the <span>Golden Hour?</span></div>
            <p className="cta-sub">Join the next-generation emergency network. Register your vehicle, choose your role, and clear the path for critical moments.</p>
            <div className="cta-actions">
              <Link href="/auth?mode=register" className="btn-hero btn-hero-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>⚡ Get Started Now</Link>
              <Link href="/admin" className="btn-hero btn-hero-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>View Live Stats</Link>
            </div>
          </div>
          <div className="cta-visual-lockup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '120px', height: '120px', border: '2px solid var(--orange)', borderRadius: '50%', opacity: 0.2, animation: 'radarPulse 4s infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🚑</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <span className="footer-logo">Golden<span>Hour</span></span>
        <div className="footer-links">
          {["Docs", "GitHub", "API", "Privacy"].map((l) => <a key={l} href="#">{l}</a>)}
        </div>
        <span className="footer-copy">© 2025 GoldenHour — Emergency Mobility Platform</span>
      </footer>

      {/* ── EMERGENCY REQUEST MODAL ── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '500px', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1.2rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            <h2 className="section-title" style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>Emergency <span>Request</span></h2>
            <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Fast-track your personal emergency vehicle.</p>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={(e) => { e.preventDefault(); alert("Emergency Request Submitted!"); window.location.href = '/private-emergency'; }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Full Name</label>
                <input required type="text" placeholder="John Doe" style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} onFocus={(e) => e.target.style.borderColor = 'var(--orange)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phone Number</label>
                  <input required type="tel" placeholder="+1 234 567 890" style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} onFocus={(e) => e.target.style.borderColor = 'var(--orange)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Car Number</label>
                  <input required type="text" placeholder="ABC-1234" style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} onFocus={(e) => e.target.style.borderColor = 'var(--orange)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Emergency Rating</label>
                <select required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E") no-repeat right 1rem center / 1rem', appearance: 'none' }} onFocus={(e) => e.target.style.borderColor = 'var(--orange)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'}>
                  <option value="" disabled selected>Select Severity Level...</option>
                  <option value="critical">Critical (Life Threatening)</option>
                  <option value="high">High (Immediate Care Required)</option>
                  <option value="medium">Medium (Urgent Care)</option>
                  <option value="low">Low (Standard Emergency)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Destination</label>
                <input required type="text" list="hospital-suggestions" placeholder="Search for nearby hospital..." style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} onFocus={(e) => e.target.style.borderColor = 'var(--orange)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                <datalist id="hospital-suggestions">
                  <option value="City General Hospital">1.2 km away</option>
                  <option value="Apollo Medical Center">2.5 km away</option>
                  <option value="Fortis Healthcare">3.8 km away</option>
                  <option value="Regional Trauma Center">4.1 km away</option>
                  <option value="St. John's Mercy Hospital">5.5 km away</option>
                </datalist>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', border: 'none', borderRadius: '10px', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                Activate Emergency Corridor →
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
