// components/LiveTracker.tsx
"use client";

import { useEffect, useState } from "react";

interface LiveTrackerProps {
  isEmergencyActive: boolean;
  remainingDistanceM: number;
  etaMinutes: number;
  nextSignalDistanceM: number;
  greenSignalCount: number;
  totalSignalCount: number;
  speedKmh: number;
  onSpeedChange: (speed: number) => void;
  gpsLocation: { lat: number; lng: number } | null;
  isComplete: boolean;
  progressPercent: number;
}

// Confetti particle
function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${1.5 + Math.random() * 2}s`,
      color: ['#00ff88', '#2979FF', '#ff6b6b', '#ffd93d', '#6c5ce7', '#a29bfe'][i % 6],
      size: 4 + Math.random() * 6,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-bounce opacity-80"
          style={{
            left: p.left,
            top: '-8px',
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function LiveTracker({
  isEmergencyActive,
  remainingDistanceM,
  etaMinutes,
  nextSignalDistanceM,
  greenSignalCount,
  totalSignalCount,
  speedKmh,
  onSpeedChange,
  gpsLocation,
  isComplete,
  progressPercent,
}: LiveTrackerProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Helpers to format distance and time
  const formatDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const formatTime = (mins: number) => {
    if (mins < 1) return "< 1 min";
    const mm = Math.floor(mins);
    const ss = Math.round((mins - mm) * 60);
    return `${mm}m ${ss.toString().padStart(2, "0")}s`;
  };

  // Trigger confetti on completion
  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  if (isComplete) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-emerald-900/10 p-6 flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        {showConfetti && <Confetti />}

        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />

        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/30 to-emerald-400/10 rounded-full flex items-center justify-center mb-5 ring-4 ring-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.3)] relative z-10">
          <span className="text-4xl">🏁</span>
        </div>
        <h2 className="text-2xl font-bold text-emerald-400 font-mono tracking-widest uppercase text-center mb-2 relative z-10">
          Destination Reached
        </h2>
        <p className="text-emerald-500/70 font-mono text-sm max-w-sm text-center relative z-10">
          Green corridor simulation successfully completed. The ambulance has arrived.
        </p>

        {/* Animated success ring */}
        <div className="absolute inset-0 rounded-xl border-2 border-emerald-500/10 animate-pulse pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800/80 bg-[#0a0e1a]/95 backdrop-blur-md p-5 flex flex-col shadow-2xl relative overflow-hidden h-full">
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Glare effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header with gradient accent */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <h3 className="font-mono font-bold text-gray-200 tracking-wider flex items-center gap-3">
          <span className="text-xl">🚑</span>
          <span className="uppercase text-sm">Green Corridor System</span>
        </h3>

        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-gray-800/60">
          <div className={`w-2.5 h-2.5 rounded-full ${isEmergencyActive ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-gray-600"}`} />
          <span className={`text-[11px] font-mono tracking-widest uppercase font-bold ${isEmergencyActive ? "text-red-400" : "text-gray-500"}`}>
            {isEmergencyActive ? "Live" : "Standby"}
          </span>
        </div>
      </div>

      {/* Primary Stats Grid — with gradient top borders */}
      <div className="grid grid-cols-3 gap-3 mb-5 relative z-10">
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-blue-400" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Distance Left</span>
          <span className="text-xl font-mono text-blue-400">
            {isEmergencyActive ? formatDist(remainingDistanceM) : "--"}
          </span>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col relative overflow-hidden group hover:border-amber-500/30 transition-colors duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-amber-400" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">ETA</span>
          <span className="text-xl font-mono text-amber-400">
            {isEmergencyActive ? formatTime(etaMinutes) : "--"}
          </span>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col relative overflow-hidden group hover:border-white/20 transition-colors duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gray-400 to-gray-300" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Speed</span>
          <span className="text-xl font-mono text-white flex items-baseline gap-1">
            {isEmergencyActive ? speedKmh : 0} <span className="text-xs text-gray-600">km/h</span>
          </span>
        </div>
      </div>

      {/* Secondary Stats Grid — with gradient left borders */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col relative overflow-hidden border-l-2 border-l-red-500 group hover:border-red-500/40 transition-colors duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/80 to-transparent" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Next Signal In</span>
          <span className="text-xl font-mono text-red-400">
            {isEmergencyActive ? (nextSignalDistanceM > 0 ? formatDist(nextSignalDistanceM) : "CLEAR") : "--"}
          </span>
        </div>
        <div className="bg-emerald-950/20 rounded-lg border border-emerald-900/40 p-3 flex flex-col relative border-l-2 border-l-[#00ff88] shadow-[inset_0_0_20px_rgba(0,255,136,0.02)] group hover:border-emerald-500/40 transition-colors duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00ff88]/80 to-transparent" />
          <span className="text-[10px] text-emerald-600 font-mono uppercase tracking-widest mb-1">Signals Cleared</span>
          <span className="text-xl font-mono text-[#00ff88]">
            {isEmergencyActive ? `${greenSignalCount} / ${totalSignalCount}` : "--"}
          </span>
        </div>
      </div>

      {/* Progress Bar — Gradient fill with glow */}
      <div className="mb-5 flex flex-col gap-2 relative z-10">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Route Progress</span>
          <span className="text-[11px] font-mono text-blue-400">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2.5 w-full bg-gray-900/80 rounded-full overflow-hidden border border-gray-800 relative">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.6),0_0_30px_rgba(59,130,246,0.2)] transition-all duration-1000 ease-linear rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-4 relative z-10">
        {/* GPS Coordinates */}
        <div className="bg-black/30 rounded-lg px-3 py-2 border border-gray-800/80 flex justify-between items-center">
          <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Live GPS</span>
          <span className="text-xs font-mono text-gray-400">
            {gpsLocation ? `${gpsLocation.lat.toFixed(5)}° N, ${gpsLocation.lng.toFixed(5)}° E` : "Awaiting signal..."}
          </span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest whitespace-nowrap">Target Speed</span>
          <div className="flex gap-1.5 w-full">
            {[20, 40, 60].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                disabled={!isEmergencyActive}
                className={`
                  flex-1 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all duration-300
                  ${!isEmergencyActive ? 'opacity-50 cursor-not-allowed bg-gray-900 text-gray-600' : ''}
                  ${speedKmh === s
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] border border-blue-400/50'
                    : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700/50 hover:border-gray-600/50'}
                `}
              >
                {s} km/h {speedKmh === s && "✓"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
