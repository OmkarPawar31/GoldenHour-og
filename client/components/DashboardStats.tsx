// components/DashboardStats.tsx
"use client";

import { useEffect, useState } from "react";

interface DashboardStatsProps {
  activeEmergencies: number;
  availableAmbulances: number;
  resolvedToday: number;
  greenSignalsActivated: number;
  theme?: "dark" | "light";
}

// Simple CountUp animation hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function: easeOutQuart
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      setCount(Math.floor(easeOut * end));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure exact finish
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

/* ── SVG Icon Components ── */
const AlertIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const AmbulanceIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="6" width="15" height="12" rx="2" />
    <path d="M16 10h4l3 3v5h-7V10z" />
    <circle cx="5.5" cy="19.5" r="1.5" />
    <circle cx="18.5" cy="19.5" r="1.5" />
    <line x1="8" y1="9" x2="8" y2="15" />
    <line x1="5" y1="12" x2="11" y2="12" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const SignalIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M16.24 7.76a6 6 0 010 8.49" />
    <path d="M7.76 16.24a6 6 0 010-8.49" />
    <path d="M19.07 4.93a10 10 0 010 14.14" />
    <path d="M4.93 19.07a10 10 0 010-14.14" />
  </svg>
);

/* ── Trend Arrow ── */
function TrendArrow({ direction, color }: { direction: "up" | "down" | "neutral"; color: string }) {
  if (direction === "neutral") {
    return <span className="text-[9px] text-gray-500 ml-1">—</span>;
  }
  return (
    <span className={`inline-flex items-center ml-1.5 ${color}`}>
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        {direction === "up" ? (
          <path d="M6 2L10 7H2L6 2Z" />
        ) : (
          <path d="M6 10L2 5H10L6 10Z" />
        )}
      </svg>
    </span>
  );
}

/* ── Mini Progress Bar ── */
function MiniBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-1 bg-white/[0.04] rounded-full mt-2.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `${Math.min(percent, 100)}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}60`,
        }}
      />
    </div>
  );
}

interface CardConfig {
  label: string;
  subtitle: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  hoverBorder: string;
  bgGlow: string;
  shadowColor: string;
  iconBg: string;
  iconBorder: string;
  barPercent: number;
  trend: "up" | "down" | "neutral";
  trendColor: string;
  isHighlighted?: boolean;
}

export default function DashboardStats({
  activeEmergencies,
  availableAmbulances,
  resolvedToday,
  greenSignalsActivated,
  theme = "dark",
}: DashboardStatsProps) {
  // Mount state to safely trigger animations instead of relying on inline opacity: 0
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Small delay to ensure the DOM is painted before triggering animation
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const aeAnim = useCountUp(activeEmergencies);
  const aaAnim = useCountUp(availableAmbulances);
  const rtAnim = useCountUp(resolvedToday);
  const gsAnim = useCountUp(greenSignalsActivated);

  const cards: CardConfig[] = [
    {
      label: "Active Emergencies",
      subtitle: "Currently dispatched",
      value: aeAnim,
      icon: <span className="text-red-500"><AlertIcon /></span>,
      color: "#ef4444",
      borderColor: theme === "light" ? "border-slate-200" : "border-white/[0.08]",
      hoverBorder: theme === "light" ? "hover:border-red-400" : "hover:border-red-500/50",
      bgGlow: theme === "light" ? "bg-red-50" : "bg-red-500/10",
      shadowColor: theme === "light" ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.1)",
      iconBg: theme === "light" ? "bg-red-50" : "bg-red-500/10",
      iconBorder: theme === "light" ? "border-red-200" : "border-red-500/20",
      barPercent: activeEmergencies > 0 ? 100 : 0,
      trend: activeEmergencies > 0 ? "up" : "neutral",
      trendColor: "text-red-500",
    },
    {
      label: "Available Units",
      subtitle: "Ready for dispatch",
      value: aaAnim,
      icon: <span className="text-blue-500"><AmbulanceIcon /></span>,
      color: "#3b82f6",
      borderColor: theme === "light" ? "border-slate-200" : "border-white/[0.08]",
      hoverBorder: theme === "light" ? "hover:border-blue-400" : "hover:border-blue-500/50",
      bgGlow: theme === "light" ? "bg-blue-50" : "bg-blue-500/10",
      shadowColor: theme === "light" ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.1)",
      iconBg: theme === "light" ? "bg-blue-50" : "bg-blue-500/10",
      iconBorder: theme === "light" ? "border-blue-200" : "border-blue-500/20",
      barPercent: Math.min((availableAmbulances / 50) * 100, 100),
      trend: "up",
      trendColor: "text-blue-500",
    },
    {
      label: "Resolved Today",
      subtitle: "Successfully completed",
      value: rtAnim,
      icon: <span className="text-purple-500"><CheckCircleIcon /></span>,
      color: "#a855f7",
      borderColor: theme === "light" ? "border-slate-200" : "border-white/[0.08]",
      hoverBorder: theme === "light" ? "hover:border-purple-400" : "hover:border-purple-500/50",
      bgGlow: theme === "light" ? "bg-purple-50" : "bg-purple-500/10",
      shadowColor: theme === "light" ? "rgba(168,85,247,0.05)" : "rgba(168,85,247,0.1)",
      iconBg: theme === "light" ? "bg-purple-50" : "bg-purple-500/10",
      iconBorder: theme === "light" ? "border-purple-200" : "border-purple-500/20",
      barPercent: Math.min((resolvedToday / 20) * 100, 100),
      trend: "up",
      trendColor: "text-purple-500",
    },
    {
      label: "Green Signals",
      subtitle: "Traffic cleared",
      value: gsAnim,
      icon: <span className="text-emerald-500"><SignalIcon /></span>,
      color: "#10b981",
      borderColor: theme === "light" ? "border-emerald-200" : "border-[#00ff88]/30",
      hoverBorder: theme === "light" ? "hover:border-emerald-400" : "hover:border-[#00ff88]/60",
      bgGlow: theme === "light" ? "bg-emerald-50" : "bg-[#00ff88]/15",
      shadowColor: theme === "light" ? "rgba(16,185,129,0.05)" : "rgba(0,255,136,0.15)",
      iconBg: theme === "light" ? "bg-emerald-50" : "bg-[#00ff88]/10",
      iconBorder: theme === "light" ? "border-emerald-200" : "border-[#00ff88]/30",
      barPercent: greenSignalsActivated > 0 ? Math.min((greenSignalsActivated / 8) * 100, 100) : 0,
      isHighlighted: true,
      trend: greenSignalsActivated > 0 ? "up" : "neutral",
      trendColor: "text-emerald-500",
    },
  ];

  return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`${theme === "light" ? "bg-white shadow-sm" : "bg-[#111827]/80 backdrop-blur-2xl shadow-md"} rounded-2xl border ${card.borderColor} p-5 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${
            mounted ? "animate-slide-up" : "opacity-0"
          }`}
          style={{
            animationDelay: `${i * 80}ms`,
          } as React.CSSProperties}
        >
          {/* Subtle gradient overlay on hover instead of intense shimmer */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `linear-gradient(135deg, transparent, ${card.shadowColor}, transparent)` }} />

          {/* Background glow orb - made softer and static */}
          <div className={`absolute top-0 right-0 w-32 h-32 ${card.bgGlow} rounded-full blur-[40px] opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none`} />

          {/* Top row: Icon + Label */}
          <div className="flex items-center justify-between relative z-10 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl ${card.iconBg} border ${card.iconBorder} flex items-center justify-center transition-all duration-300 group-hover:scale-105`}
              >
                {card.icon}
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-[10px] tracking-widest uppercase ${card.isHighlighted ? (theme === "light" ? "text-emerald-600" : "text-[#00ff88]/80") : (theme === "light" ? "text-slate-600" : "text-gray-400")}`}>
                  {card.label}
                </span>
                <span className={`text-[9px] tracking-wide ${theme === "light" ? "text-slate-400" : "text-gray-600"}`}>{card.subtitle}</span>
              </div>
            </div>
          </div>

          {/* Stat value with trend arrow */}
          <div className="relative z-10 flex items-baseline outline-none focus:outline-none focus:bg-transparent -mt-1">
            <span
              className={`text-3xl font-extrabold tracking-tight block ${card.isHighlighted ? (theme === "light" ? "text-emerald-500" : "text-[#00ff88]") : (theme === "light" ? "text-slate-800" : "text-white")}`}
            >
              {card.value}
            </span>
            <TrendArrow direction={card.trend} color={card.trendColor} />
          </div>

          {/* Mini progress bar */}
          <MiniBar percent={card.barPercent} color={card.color} />
        </div>
      ))}
    </div>
  );
}
