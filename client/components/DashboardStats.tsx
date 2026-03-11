// components/DashboardStats.tsx
"use client";

import { useEffect, useState } from "react";

interface DashboardStatsProps {
  activeEmergencies: number;
  availableAmbulances: number;
  resolvedToday: number;
  greenSignalsActivated: number;
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

export default function DashboardStats({
  activeEmergencies,
  availableAmbulances,
  resolvedToday,
  greenSignalsActivated,
}: DashboardStatsProps) {

  const aeAnim = useCountUp(activeEmergencies);
  const aaAnim = useCountUp(availableAmbulances);
  const rtAnim = useCountUp(resolvedToday);
  const gsAnim = useCountUp(greenSignalsActivated);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Card 1 — Active Emergencies */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-gray-800 p-5 flex items-center justify-between shadow-lg relative overflow-hidden group hover:scale-[1.02] hover:border-red-500/30 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-red-400 to-orange-500" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-red-500/10 transition-colors duration-500" />
        <div className="flex flex-col relative z-10">
          <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Active Emergencies</span>
          <span className="text-3xl font-bold font-mono text-white">{aeAnim}</span>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <span className="text-red-400">🚨</span>
        </div>
      </div>

      {/* Card 2 — Available Units */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-gray-800 p-5 flex items-center justify-between shadow-lg relative overflow-hidden group hover:scale-[1.02] hover:border-blue-500/30 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-500" />
        <div className="flex flex-col relative z-10">
          <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Available Units</span>
          <span className="text-3xl font-bold font-mono text-white">{aaAnim}</span>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <span className="text-blue-400">🚑</span>
        </div>
      </div>

      {/* Card 3 — Resolved Today */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-gray-800 p-5 flex items-center justify-between shadow-lg relative overflow-hidden group hover:scale-[1.02] hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-purple-400 to-fuchsia-400" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-purple-500/10 transition-colors duration-500" />
        <div className="flex flex-col relative z-10">
          <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Resolved Today</span>
          <span className="text-3xl font-bold font-mono text-white">{rtAnim}</span>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
          <span className="text-purple-400">🏥</span>
        </div>
      </div>

      {/* Card 4 — Green Signals (Highlighted) */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-[#00ff88]/30 p-5 flex items-center justify-between shadow-[0_0_25px_rgba(0,255,136,0.1)] relative overflow-hidden group hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(0,255,136,0.15)] transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00ff88] via-emerald-400 to-teal-400" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[#00ff88]/20 transition-colors duration-500" />

        <div className="flex flex-col relative z-10">
          <span className="text-[#00ff88]/80 font-mono text-[10px] uppercase tracking-widest mb-1.5">Green Signals</span>
          <span className="text-3xl font-bold font-mono text-[#00ff88]">{gsAnim}</span>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00ff88]/25 to-emerald-500/10 border border-[#00ff88]/40 flex items-center justify-center relative z-10 animate-pulse shadow-[0_0_20px_rgba(0,255,136,0.2)]">
          <span className="text-[#00ff88] shrink-0 text-xl leading-none">🟢</span>
        </div>
      </div>
    </div>
  );
}
