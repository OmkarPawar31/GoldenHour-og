// components/RouteInfoBar.tsx
"use client";

import { Hospital, RouteInfo } from "../types";

interface RouteInfoBarProps {
  hospital: Hospital;
  routeInfo: RouteInfo;
  onChangeHospital: () => void;
  onStartEmergency: () => void;
}

const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RouteIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="22" x2="12" y2="8" />
    <path d="M5 12H2a10 10 0 0020 0h-3" />
  </svg>
);

export default function RouteInfoBar({ hospital, routeInfo, onChangeHospital, onStartEmergency }: RouteInfoBarProps) {
  return (
    <div className="w-full bg-[#0a0e1a]/95 backdrop-blur-2xl border-t border-white/[0.06] shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] z-50 relative overflow-hidden">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[400px] h-[60px] bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Hospital info segment */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hospital icon badge */}
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
              <span className="text-lg">🏥</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-[15px] truncate">{hospital.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-emerald-400/70 font-medium tracking-wider uppercase flex items-center gap-1">
                  <RouteIcon /> Fastest Route
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-[1px] h-10 bg-white/[0.06]" />

          {/* Distance & ETA segment with animated connector */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-medium mb-0.5">Distance</span>
              <span className="text-white font-bold text-lg font-mono flex items-center gap-1.5">
                <span className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]">📍</span>
                {routeInfo.distanceText}
              </span>
            </div>

            {/* Animated dot connector */}
            <div className="relative w-8 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
              <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-dot-travel" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-medium mb-0.5">ETA</span>
              <span className="text-white font-bold text-lg font-mono flex items-center gap-1.5">
                <span className="text-amber-400">
                  <ClockIcon />
                </span>
                {routeInfo.durationText}
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-[1px] h-10 bg-white/[0.06]" />

          {/* Action buttons */}
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onChangeHospital}
              className="px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white border border-white/[0.06] hover:border-white/[0.15] text-[11px] font-bold tracking-[0.15em] uppercase rounded-xl transition-all duration-300 backdrop-blur-md"
            >
              Change
            </button>
            <button
              onClick={onStartEmergency}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_35px_rgba(220,38,38,0.5)] transition-all duration-300 flex items-center gap-2 border border-red-500/30 animate-pulse-glow"
            >
              <span className="text-base leading-none">⚡</span>
              Start Emergency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
