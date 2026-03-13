"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import Link from "next/link";
import { 
  Ambulance, Building2, ClipboardList, Monitor, 
  LifeBuoy, RadioTower, Zap, Radio, CircleDot,
  BellRing, Scale, Map as MapIcon, CarFront, User
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // ── Hero sequence ──
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(".hero-badge",        { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, delay: 0.1 })
      .fromTo(".hero-heading",      { y: 48, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9 }, "-=0.4")
      .fromTo(".hero-sub",          { y: 32, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, "-=0.7")
      .fromTo(".hero-actions",      { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, "-=0.6")
      .fromTo(".hero-stats > div",  { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.1 }, "-=0.5")
      .fromTo(".hero-right",        { x: 70, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.1 }, "-=1.1");

    // ── Parallax orbs ──
    gsap.to(".hero-orb-1", {
      yPercent: 30, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-orb-2", {
      yPercent: -30, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    // ── Section reveals ──
    gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
      gsap.fromTo(el,
        { y: 50, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
        }
      );
    });

    // ── Feature cards (stagger + 3D tilt interaction) ──
    gsap.fromTo(".feature-card",
      { y: 40, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: ".features-grid", start: "top 85%", toggleActions: "play none none none" }
      }
    );

    // Feature card 3D tilt
    document.querySelectorAll<HTMLElement>(".feature-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rx = ((e.clientY - cy) / (rect.height / 2)) * -6;
        const ry = ((e.clientX - cx) / (rect.width / 2)) * 6;
        gsap.to(card, { rotateX: rx, rotateY: ry, scale: 1.02, ease: "power2.out", duration: 0.25, transformPerspective: 800 });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, scale: 1, ease: "power3.out", duration: 0.5, transformPerspective: 800 });
      });
    });

    // ── Roles stagger ──
    gsap.fromTo(".role-card",
      { y: 32, scale: 0.96, autoAlpha: 0 },
      { y: 0, scale: 1, autoAlpha: 1, duration: 0.7, stagger: 0.07, ease: "power3.out",
        scrollTrigger: { trigger: ".roles-grid", start: "top 85%", toggleActions: "play none none none" }
      }
    );

    // ── Steps stagger ──
    gsap.fromTo(".step",
      { x: -40, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.8, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: ".steps-grid", start: "top 85%", toggleActions: "play none none none" }
      }
    );

    // ── CTA band ──
    gsap.fromTo(".cta-band",
      { y: 60, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: ".cta-band", start: "top 90%", toggleActions: "play none none none" }
      }
    );

    // ── Magnetic effect on CTA buttons ──
    document.querySelectorAll<HTMLElement>(".btn-primary-hero, .btn-outline-hero").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.3;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.3;
        gsap.to(btn, { x: dx, y: dy, duration: 0.4, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });

    // ── Portal rp-card hover ──
    document.querySelectorAll<HTMLElement>(".rp-card").forEach((card) => {
      card.addEventListener("mouseenter", () => {
        gsap.to(card, { y: -4, scale: 1.03, duration: 0.25, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { y: 0, scale: 1, duration: 0.4, ease: "power3.out" });
      });
    });

  }, { scope: rootRef });

  return (
    <div ref={rootRef}>
      <style>{`
        :root {
          --orange:  #E8571A; --orange2: #F97316; --amber: #F59E0B;
          --cream:   #FFFBF5; --warm:    #FFF7ED;
          --slate:   #F1F5F9; --text:    #1E293B;
          --muted:   #64748B; --border:  #E2E8F0;
          --green:   #10B981; --blue:    #3B82F6;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--cream); color: var(--text); font-family: 'DM Sans', sans-serif; overflow-x: hidden; }

        /* ── HERO ── */
        .hero { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
        @media (max-width: 900px) { .hero { grid-template-columns: 1fr; } .hero-right { display: none; } }

        /* Left dark panel */
        .hero-left {
          position: relative;
          background: linear-gradient(150deg, #0a0f1e 0%, #0F172A 60%, #1a0500 100%);
          display: flex; flex-direction: column; justify-content: center;
          padding: 7rem 5rem 5rem; overflow: hidden;
        }
        .hero-orbs { position: absolute; inset: 0; pointer-events: none; }
        .hero-orb { position: absolute; border-radius: 50%; background: radial-gradient(circle, var(--orange) 0%, transparent 70%); animation: orbFloat 6s ease-in-out infinite alternate; }
        .hero-orb-1 { width: 500px; height: 500px; top: -160px; right: -160px; opacity: 0.08; }
        .hero-orb-2 { width: 280px; height: 280px; bottom: -80px; left: -80px; opacity: 0.06; animation-delay: -3s; }
        @keyframes orbFloat { 0%{transform:translate(0,0)scale(1)} 100%{transform:translate(20px,15px)scale(1.06)} }
        .hero-dotsoverlay { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(rgba(232,87,26,0.08) 1px, transparent 1px); background-size: 30px 30px; }

        .hero-badge {
          visibility: hidden;
          display: inline-flex; align-items: center; gap: 0.6rem;
          background: rgba(232,87,26,0.12); border: 1px solid rgba(232,87,26,0.3);
          border-radius: 100px; padding: 0.35rem 1rem;
          font-family: 'JetBrains Mono', monospace; font-size: 0.68rem;
          color: var(--orange); letter-spacing: 0.08em; margin-bottom: 1.8rem; width: fit-content;
        }
        .badge-dot { width: 6px; height: 6px; background: var(--orange); border-radius: 50%; animation: blink 1.2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .hero-heading {
          visibility: hidden;
          font-family: 'Bebas Neue', cursive;
          font-size: clamp(4.5rem, 8vw, 7.5rem); line-height: 0.85;
          letter-spacing: 0.01em; color: #fff; margin-bottom: 1.6rem;
        }
        .hero-heading em { color: var(--orange); font-style: normal; display: block; }
        .hero-sub { visibility: hidden; color: #94A3B8; font-size: 1.05rem; line-height: 1.78; max-width: 440px; margin-bottom: 2.2rem; }

        .hero-actions { visibility: hidden; display: flex; gap: 1rem; flex-wrap: wrap; }
        .btn-primary-hero {
          padding: 0.95rem 2.2rem; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 700;
          text-decoration: none; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 4px 24px rgba(232,87,26,0.35);
          display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-primary-hero:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 10px 36px rgba(232,87,26,0.5); }
        .btn-outline-hero {
          padding: 0.95rem 2.2rem; border-radius: 12px; cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05);
          color: #fff; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
          text-decoration: none; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-outline-hero:hover { border-color: rgba(232,87,26,0.5); background: rgba(232,87,26,0.08); transform: translateY(-2px); }

        .hero-stats { visibility: hidden; display: flex; gap: 2.5rem; margin-top: 2.8rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.07); }
        .hero-stats > div { visibility: hidden; }
        .stat-num { font-family: 'Bebas Neue', cursive; font-size: 2.1rem; color: var(--orange); display: block; line-height: 1; }
        .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.25rem; display: block; }

        /* Right cream panel */
        .hero-right {
          visibility: hidden;
          position: relative; background: var(--cream);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 3rem; overflow: hidden;
        }
        .hero-right-bg { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(circle, rgba(232,87,26,0.07) 1px, transparent 1px); background-size: 28px 28px; }

        /* Radar */
        .radar-box { position: relative; width: 380px; height: 380px; background: radial-gradient(circle, rgba(232,87,26,0.03) 0%, transparent 70%); border-radius: 50%; z-index: 2; }
        .r-crosshair-h, .r-crosshair-v { position: absolute; background: rgba(232,87,26,0.1); top: 50%; left: 50%; transform: translate(-50%,-50%); }
        .r-crosshair-h { width: 380px; height: 1px; } .r-crosshair-v { width: 1px; height: 380px; }
        .r-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(232,87,26,0.12); top: 50%; left: 50%; transform: translate(-50%,-50%); }
        .r-ring-1 { width: 70px;  height: 70px;  border-color: rgba(232,87,26,0.4); }
        .r-ring-2 { width: 148px; height: 148px; } .r-ring-3 { width: 226px; height: 226px; }
        .r-ring-4 { width: 304px; height: 304px; } .r-ring-5 { width: 380px; height: 380px; border-color: rgba(232,87,26,0.07); }
        .r-pulse { position: absolute; border-radius: 50%; border: 2px solid rgba(232,87,26,0.45); width: 380px; height: 380px; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0); animation: radarPulse 3s ease-out infinite; }
        .r-pulse-2 { animation-delay: 1s; } .r-pulse-3 { animation-delay: 2s; }
        @keyframes radarPulse { 0%{transform:translate(-50%,-50%)scale(0);opacity:0.8} 100%{transform:translate(-50%,-50%)scale(1);opacity:0} }
        .r-sweep { position: absolute; top: 50%; left: 50%; width: 50%; height: 2px; transform-origin: left center; animation: sweep 3.5s linear infinite; }
        .r-sweep::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(232,87,26,0.85),transparent); }
        .r-sweep::after { content:''; position:absolute; top:-40px; left:0; right:0; height:80px; background:conic-gradient(from -5deg at 0% 50%, rgba(232,87,26,0.12), transparent 55deg); }
        @keyframes sweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .r-center { position: absolute; top:50%; left:50%; width:14px; height:14px; background:var(--orange); border-radius:50%; z-index:2; transform:translate(-50%,-50%); box-shadow:0 0 0 4px rgba(232,87,26,0.2),0 0 20px rgba(232,87,26,0.6); }
        .r-corridor { position:absolute; top:38%; left:52%; width:120px; height:2px; z-index:2; background:linear-gradient(90deg,rgba(232,87,26,0.75),rgba(232,87,26,0.05)); transform-origin:left center; transform:rotate(-22deg); animation:corridorGlow 2s ease-in-out infinite alternate; }
        @keyframes corridorGlow { from{box-shadow:0 0 4px rgba(232,87,26,0.4)} to{box-shadow:0 0 16px rgba(232,87,26,0.7),0 0 32px rgba(232,87,26,0.3)} }
        .blip { position:absolute; width:9px; height:9px; border-radius:50%; transform:translate(-50%,-50%); z-index:2; }
        .blip::after { content:''; position:absolute; inset:-4px; border-radius:50%; border:1.5px solid currentColor; animation:blipPulse 2s ease-out infinite; }
        @keyframes blipPulse { 0%{transform:scale(1);opacity:1} 100%{transform:scale(3);opacity:0} }
        .blip-amb  { top:38%;left:52%; background:var(--orange);color:var(--orange);box-shadow:0 0 10px rgba(232,87,26,0.7); }
        .blip-c1   { top:55%;left:38%; background:#3B82F6;color:#3B82F6; } .blip-c2 { top:30%;left:65%; background:#3B82F6;color:#3B82F6; } .blip-c3 { top:62%;left:60%; background:#3B82F6;color:#3B82F6; }
        .blip-priv { top:45%;left:28%; background:var(--amber);color:var(--amber); }
        .blip-label { position:absolute; top:28%;left:54.5%; font-family:'JetBrains Mono',monospace; font-size:0.58rem; color:var(--orange); background:rgba(255,251,245,0.95); padding:0.18rem 0.5rem; border-radius:4px; border:1px solid rgba(232,87,26,0.25); white-space:nowrap; z-index:3; box-shadow:0 2px 8px rgba(0,0,0,0.08); animation:labelBlink 2s ease-in-out infinite; }
        @keyframes labelBlink { 0%,100%{opacity:1} 50%{opacity:0.45} }

        /* Portal cards under radar */
        .radar-portals { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1.8rem; width: 380px; z-index: 2; }
        .rp-card {
          display: flex; align-items: center; gap: 0.7rem; padding: 0.8rem 1rem;
          border-radius: 12px; border: 1.5px solid var(--border); background: #fff;
          text-decoration: none; color: var(--text); font-size: 0.82rem; font-weight: 600;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rp-card:hover { border-color: var(--accent, var(--orange)); transform: translateY(-3px) scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .rp-icon { font-size: 1.3rem; }
        .rp-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.58rem; color: var(--muted); letter-spacing: 0.04em; }

        /* ── SECTIONS ── */
        .divider { max-width: 1200px; margin: 0 auto; height: 1px; background: linear-gradient(90deg, transparent, rgba(232,87,26,0.18), transparent); }
        .section { max-width: 1200px; margin: 0 auto; padding: 6rem 3rem; position: relative; z-index: 1; }
        .section-label {
          visibility: hidden;
          font-family: 'JetBrains Mono', monospace; font-size: 0.7rem;
          color: var(--orange); text-transform: uppercase; letter-spacing: 0.15em;
          margin-bottom: 0.8rem; font-weight: 600;
        }
        .section-title {
          visibility: hidden;
          font-family: 'Bebas Neue', cursive; font-size: clamp(2.4rem,5vw,3.8rem);
          line-height: 1; letter-spacing: 0.02em; color: var(--text); margin-bottom: 1rem;
        }
        .section-title span { color: var(--orange); }

        /* ── FEATURES ── */
        .features-grid {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 1px;
          background: var(--border); border: 1px solid var(--border);
          border-radius: 20px; overflow: hidden; margin-top: 3.5rem;
          box-shadow: 0 4px 32px rgba(0,0,0,0.06);
        }
        @media (max-width: 900px) { .features-grid { grid-template-columns: 1fr; } }
        .feature-card {
          visibility: hidden;
          background: #fff; padding: 3rem 2.5rem; transition: all 0.3s;
          position: relative; overflow: hidden;
        }
        .feature-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,var(--orange),var(--amber));
          transform:scaleX(0); transform-origin:left; transition:transform 0.4s;
        }
        .feature-card:hover { background: var(--warm); }
        .feature-card:hover::before { transform:scaleX(1); }
        .feature-num { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:rgba(232,87,26,0.4); margin-bottom:1rem; display:block; font-weight:600; }
        .feature-icon { font-size:2rem; margin-bottom:0.9rem; display:block; transition:transform 0.3s; }
        .feature-card:hover .feature-icon { transform:scale(1.15) rotate(-3deg); }
        .feature-title { font-weight:700; font-size:1rem; margin-bottom:0.5rem; color:var(--text); }
        .feature-desc { font-size:0.85rem; color:var(--muted); line-height:1.65; }
        .feature-badge {
          display:inline-block; margin-top:0.9rem;
          font-family:'JetBrains Mono',monospace; font-size:0.63rem;
          color:var(--orange); background:rgba(232,87,26,0.08);
          border-radius:4px; padding:0.2rem 0.55rem; border:1px solid rgba(232,87,26,0.15);
        }

        /* ── ROLES ── */
        .roles-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; margin-top:2.5rem; }
        @media (max-width: 1100px) { .roles-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width: 600px) { .roles-grid { grid-template-columns:1fr; } }
        .role-card {
          visibility: hidden;
          border:1.5px solid var(--border); border-radius:16px; padding:2rem 1.5rem;
          background:#fff; cursor:pointer; transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);
          text-decoration:none; color:var(--text); display:block; position:relative; overflow:hidden;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }
        .role-card::after {
          content:''; position:absolute; bottom:0; left:0; right:0; height:3px;
          transform:scaleX(0); transform-origin:left; transition:transform 0.3s;
          background:var(--accent-color,var(--orange));
        }
        .role-card:hover { transform:translateY(-6px); border-color:var(--accent-color,var(--orange)); box-shadow:0 12px 40px rgba(0,0,0,0.1); }
        .role-card:hover::after { transform:scaleX(1); }
        .role-icon { font-size:2.2rem; margin-bottom:1rem; display:block; transition:transform 0.3s; }
        .role-card:hover .role-icon { transform:scale(1.1); }
        .role-name { font-weight:700; font-size:1rem; margin-bottom:0.4rem; }
        .role-desc { font-size:0.8rem; color:var(--muted); line-height:1.55; margin-bottom:1rem; }
        .role-priority { font-family:'JetBrains Mono',monospace; font-size:0.68rem; letter-spacing:0.06em; font-weight:700; }

        /* ── HOW IT WORKS ── */
        .steps-grid { display:grid; grid-template-columns:1fr 1fr; gap:5rem; align-items:start; }
        @media (max-width: 900px) { .steps-grid { grid-template-columns:1fr; gap:2rem; } }
        .step {
          visibility: hidden;
          display:grid; grid-template-columns:60px 1fr; gap:1.5rem;
          padding:1.8rem 0; border-bottom:1px solid var(--border);
          align-items:start; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .step:last-child { border-bottom:none; }
        .step:hover { transform:translateX(6px); }
        .step-num { font-family:'Bebas Neue',cursive; font-size:3rem; color:rgba(232,87,26,0.2); line-height:1; transition:color 0.3s; }
        .step:hover .step-num { color:rgba(232,87,26,0.5); }
        .step-title { font-weight:700; font-size:1rem; margin-bottom:0.4rem; color:var(--text); }
        .step-desc { font-size:0.875rem; color:var(--muted); line-height:1.65; }
        .step-tag {
          display:inline-block; margin-top:0.55rem;
          font-family:'JetBrains Mono',monospace; font-size:0.63rem;
          color:var(--muted); background:var(--slate);
          border-radius:4px; padding:0.2rem 0.55rem; border:1px solid var(--border);
        }

        /* ── CTA BAND ── */
        .cta-band {
          visibility: hidden;
          position: relative;
          background: linear-gradient(135deg, #0a0f1e 0%, #0F172A 60%, #1a0500 100%);
          overflow: hidden; margin: 0 3rem 8rem; border-radius: 28px;
          box-shadow: 0 20px 80px rgba(0,0,0,0.18);
        }
        @media (max-width: 900px) { .cta-band { margin: 0 1.5rem 5rem; } }
        .cta-band-dots { position:absolute; inset:0; pointer-events:none; background-image:radial-gradient(rgba(232,87,26,0.06) 1px, transparent 1px); background-size:28px 28px; }
        .cta-band-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 80% 50%, rgba(232,87,26,0.12), transparent 65%); }
        .cta-inner { position:relative; z-index:1; padding:5rem; display:flex; align-items:center; justify-content:space-between; gap:4rem; flex-wrap:wrap; }
        @media (max-width: 900px) { .cta-inner { padding:3rem 2rem; } }
        .cta-title { font-family:'Bebas Neue',cursive; font-size:clamp(2.8rem,5vw,4.5rem); line-height:0.95; color:#fff; }
        .cta-title em { color:var(--orange); font-style:normal; display:block; }
        .cta-sub { color:#64748B; font-size:0.98rem; margin-top:1.2rem; max-width:440px; line-height:1.7; }
        .cta-actions { display:flex; gap:1.1rem; flex-wrap:wrap; margin-top:2.2rem; }
        .cta-visual { font-size:5rem; animation:floatIcon 3s ease-in-out infinite; filter:drop-shadow(0 0 32px rgba(232,87,26,0.5)); }
        @keyframes floatIcon { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }

        /* ── FOOTER ── */
        .site-footer {
          border-top:1px solid var(--border); padding:2.5rem 3rem;
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:1rem; background:#fff;
        }
        .footer-logo { font-family:'Bebas Neue',cursive; font-size:1.3rem; letter-spacing:0.08em; color:var(--text); }
        .footer-logo span { color:var(--orange); }
        .footer-links { display:flex; gap:1.5rem; }
        .footer-links a { font-size:0.8rem; color:var(--muted); text-decoration:none; transition:color 0.2s; }
        .footer-links a:hover { color:var(--orange); }
        .footer-copy { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:var(--muted); opacity:0.5; }
      `}</style>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-orbs"><div className="hero-orb hero-orb-1" /><div className="hero-orb hero-orb-2" /></div>
          <div className="hero-dotsoverlay" />
          <div className="hero-badge"><div className="badge-dot" />Emergency Mobility Platform v1.0</div>
          <h1 className="hero-heading">Every<em>Second</em>Counts.</h1>
          <p className="hero-sub">Golden Hour creates a virtual green corridor for ambulances in real time — clearing paths, alerting drivers, and saving lives. Zero delay, maximum impact.</p>
          <div className="hero-actions">
            <Link href="/login/ambulance" className="btn-primary-hero"><Zap size={16} /> Get Started</Link>
            <a href="#how-it-works" className="btn-outline-hero">▶ See How It Works</a>
          </div>
          <div className="hero-stats">
            {[{ num: "<3s", label: "Alert Latency" }, { num: "200m", label: "Geo-fence Radius" }, { num: "5km", label: "Alert Radius" }].map((s, i) => (
              <div key={i}><span className="stat-num">{s.num}</span><span className="stat-label">{s.label}</span></div>
            ))}
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-right-bg" />
          <div className="radar-box">
            <div className="r-crosshair-h" /><div className="r-crosshair-v" />
            <div className="r-ring r-ring-1" /><div className="r-ring r-ring-2" /><div className="r-ring r-ring-3" />
            <div className="r-ring r-ring-4" /><div className="r-ring r-ring-5" />
            <div className="r-pulse" /><div className="r-pulse r-pulse-2" /><div className="r-pulse r-pulse-3" />
            <div className="r-sweep" /><div className="r-center" /><div className="r-corridor" />
            <div className="blip-label"><Ambulance size={12} className="inline mr-1" /> AMB-001</div>
          </div>
          <div className="radar-portals">
            <Link href="/login/ambulance" className="rp-card" style={{ ["--accent" as string]: "#E8571A" }}><span className="rp-icon text-[#E8571A]"><Ambulance size={24} /></span><div><div>Ambulance</div><div className="rp-sub">P-100 ACCESS</div></div></Link>
            <Link href="/login/hospital"  className="rp-card" style={{ ["--accent" as string]: "#3B82F6" }}><span className="rp-icon text-[#3B82F6]"><Building2 size={24} /></span><div><div>Hospital</div><div className="rp-sub">FLEET CONTROL</div></div></Link>
            <Link href="/login/operator"  className="rp-card" style={{ ["--accent" as string]: "#8B5CF6" }}><span className="rp-icon text-[#8B5CF6]"><ClipboardList size={24} /></span><div><div>Operator</div><div className="rp-sub">EVENT SYNC</div></div></Link>
            <Link href="/login/admin"     className="rp-card" style={{ ["--accent" as string]: "#10B981" }}><span className="rp-icon text-[#10B981]"><Monitor size={24} /></span><div><div>Admin</div><div className="rp-sub">FULL ACCESS</div></div></Link>
            <Link href="/private-emergency" className="rp-card" style={{ ["--accent" as string]: "#F59E0B" }}><span className="rp-icon text-[#F59E0B]"><LifeBuoy size={24} /></span><div><div>Emergency</div><div className="rp-sub">P-70 CORRIDOR</div></div></Link>
            <Link href="/signal" className="rp-card" style={{ ["--accent" as string]: "#EF4444" }}><span className="rp-icon text-[#EF4444]"><RadioTower size={24} /></span><div><div>Signal</div><div className="rp-sub">DIGITAL NODE</div></div></Link>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* FEATURES */}
      <section id="features" className="section">
        <p className="section-label reveal">Core System</p>
        <h2 className="section-title reveal">Built for <span>Critical Moments</span></h2>
        <div className="features-grid">
          {[
            { num: "01", icon: "📡", title: "Real-Time GPS Tracking",     desc: "Live location updates every second via WebSocket. Zero lag between ambulance movement and corridor updates.", badge: "WS / <3s latency" },
            { num: "02", icon: "🟢", title: "Virtual Green Corridor",     desc: "Automatically computes and activates a corridor along the fastest route. Nearby drivers are cleared in real time.", badge: "Geo-fencing / 200m" },
            { num: "03", icon: "🔔", title: "Dynamic Driver Alerts",      desc: "Drivers within 5km receive instant lane-clearance push alerts on their devices.", badge: "Push / WebSocket" },
            { num: "04", icon: "⚖️", title: "Priority Engine",           desc: "Conflict resolution between overlapping emergencies. Ambulance always dominates with priority score 100.", badge: "Scores: 100 / 70 / 10" },
            { num: "05", icon: "🗺️", title: "Smart Route Calculation",   desc: "Fastest path computed in under 2 seconds using maps API integration with live traffic awareness.", badge: "Route / <2s" },
            { num: "06", icon: "🖥️", title: "Admin War Room",            desc: "Live dashboard: view all active emergencies, routes, ETAs, and affected vehicles simultaneously.", badge: "Dashboard / Live" },
          ].map((f) => (
            <div key={f.num} className="feature-card">
              <span className="feature-num">{f.num}</span><span className="feature-icon">{f.icon}</span>
              <div className="feature-title">{f.title}</div><div className="feature-desc">{f.desc}</div>
              <span className="feature-badge">{f.badge}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ROLES */}
      <section id="roles" className="section">
        <p className="section-label reveal">Access Control</p>
        <h2 className="section-title reveal">Six Roles, <span>One Mission</span></h2>
        <div className="roles-grid">
          {[
            { icon: <Ambulance size={36} />, name: "Ambulance Driver",  desc: "Activate emergency mode, get fastest route, terminate on arrival.",            priority: "PRIORITY 100 — MAXIMUM", color: "#E8571A", href: "/login/ambulance" },
            { icon: <CarFront size={36} />, name: "Private Emergency", desc: "Request emergency corridor with admin approval. Lower priority than ambulance.", priority: "PRIORITY 70 — HIGH",    color: "#F59E0B", href: "/private-emergency" },
            { icon: <ClipboardList size={36} />, name: "Event Operator",    desc: "Coordinate with emergency flow safely during major public gatherings.",        priority: "PRIORITY 30 — ADVISORY", color: "#8B5CF6", href: "/login/operator" },
            { icon: <User size={36} />, name: "Normal Driver",     desc: "Passive mode. Receives alerts and lane-clearance suggestions automatically.",   priority: "PRIORITY 10 — STANDARD", color: "#3B82F6", href: "/driver" },
            { icon: <Monitor size={36} />, name: "Admin / Traffic",  desc: "Monitor all active corridors, approve requests, view live ETAs.",              priority: "CONTROL — FULL ACCESS",  color: "#10B981", href: "/login/admin" },
            { icon: <RadioTower size={36} />, name: "Smart Signal",      desc: "Digital intelligent signage. Auto-alerts drivers visually when ambulance approaches.", priority: "NODE — DISPLAY ONLY", color: "#EF4444", href: "/signal" },
          ].map((r) => (
            <Link key={r.name} href={r.href} className="role-card" style={{ ["--accent-color" as string]: r.color }}>
              <span className="role-icon" style={{ color: r.color }}>{r.icon}</span><div className="role-name">{r.name}</div>
              <div className="role-desc">{r.desc}</div><div className="role-priority" style={{ color: r.color }}>{r.priority}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section">
        <div className="steps-grid">
          <div>
            <p className="section-label reveal">Process</p>
            <h2 className="section-title reveal" style={{ position: "sticky", top: "7rem" }}>How the <span>Corridor</span> Forms</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { num: "01", title: "Driver Activates Emergency Mode", desc: "Ambulance driver taps Activate. JWT-authenticated role is verified instantly.",                 tag: "Auth / JWT" },
              { num: "02", title: "Route Calculated in <2s",          desc: "System computes fastest path via Maps API and broadcasts it to WebSocket server.",              tag: "Route Service" },
              { num: "03", title: "Virtual Corridor Activates",        desc: "A 200m geo-fence is drawn along the route. Vehicles inside the zone are flagged.",             tag: "Geo-fencing" },
              { num: "04", title: "Nearby Drivers Alerted",            desc: "Drivers within 5km ahead receive push notifications with lane-clearance instructions.",        tag: "Push Notifications" },
              { num: "05", title: "Session Terminates on Arrival",     desc: "Driver ends session. Corridor closes, geo-fence lifts, all alerts are cleared.",               tag: "Session Manager" },
            ].map((s) => (
              <div key={s.num} className="step">
                <div className="step-num">{s.num}</div>
                <div><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div><span className="step-tag">{s.tag}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-band">
        <div className="cta-band-dots" /><div className="cta-band-glow" />
        <div className="cta-inner">
          <div style={{ flex: 1 }}>
            <h2 className="cta-title">Ready to Build<br />the <em>Golden Hour?</em></h2>
            <p className="cta-sub">Join the next-generation emergency network. Register your role, and clear the path for critical moments across the city.</p>
            <div className="cta-actions">
              <Link href="/login/ambulance" className="btn-primary-hero" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}><Zap size={18} /> Get Started Now</Link>
              <Link href="/login/admin"     className="btn-outline-hero" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}>View Live Stats</Link>
            </div>
          </div>
          <div className="cta-visual text-[var(--orange)]"><Ambulance size={80} /></div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="site-footer">
        <span className="footer-logo">Golden<span>Hour</span></span>
        <div className="footer-links">{["Docs", "GitHub", "API", "Privacy"].map((l) => <a key={l} href="#">{l}</a>)}</div>
        <span className="footer-copy">© 2025 GoldenHour — Emergency Mobility Platform</span>
      </footer>
    </div>
  );
}
