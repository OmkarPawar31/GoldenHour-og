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
      {/* Card 1 */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-gray-800 p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col relative z-10">
          <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Active Emergencies</span>
          <span className="text-3xl font-bold font-mono text-white">{aeAnim}</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center relative z-10">
          <span className="text-red-400">🚨</span>
        </div>
      </div>

      {/* Card 2 */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-gray-800 p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col relative z-10">
          <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Available Units</span>
          <span className="text-3xl font-bold font-mono text-white">{aaAnim}</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative z-10">
          <span className="text-blue-400">🚑</span>
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-gray-800 p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col relative z-10">
          <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Resolved Today</span>
          <span className="text-3xl font-bold font-mono text-white">{rtAnim}</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center relative z-10">
          <span className="text-purple-400">🏥</span>
        </div>
      </div>

      {/* Card 4 - Highlighted */}
      <div className="bg-[#0a0e1a]/90 backdrop-blur-sm rounded-xl border border-[#00ff88]/30 p-5 flex items-center justify-between shadow-[0_0_20px_rgba(0,255,136,0.1)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[#00ff88]/20 transition-colors duration-500" />

        <div className="flex flex-col relative z-10">
          <span className="text-[#00ff88]/80 font-mono text-[10px] uppercase tracking-widest mb-1.5">Green Signals</span>
          <span className="text-3xl font-bold font-mono text-[#00ff88]">{gsAnim}</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/40 flex items-center justify-center relative z-10 animate-pulse">
          <span className="text-[#00ff88] shrink-0 text-xl leading-none">🟢</span>
        </div>
      </div>
    </div>
  );
}
