// components/HospitalCard.tsx
"use client";

import { useMemo } from "react";
import { Hospital } from "../types";

interface HospitalCardProps {
  hospital: Hospital;
  isNearest: boolean;
  isSelected: boolean;
  onSelect: (hospital: Hospital) => void;
}

// Derive a hospital type badge from name heuristics
function getHospitalType(name: string): { label: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes("trauma") || n.includes("emergency")) return { label: "Trauma Center", color: "text-red-400 bg-red-500/10 border-red-500/20" };
  if (n.includes("multi") || n.includes("super")) return { label: "Multi-Specialty", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  if (n.includes("children") || n.includes("child") || n.includes("pediatric")) return { label: "Pediatric", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  if (n.includes("heart") || n.includes("cardiac")) return { label: "Cardiac Care", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" };
  return { label: "General Hospital", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
}

// Stable pseudo-random number from a string seed (hospital id)
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return ((hash & 0x7fffffff) % 100) / 100;
}

export default function HospitalCard({ hospital, isNearest, isSelected, onSelect }: HospitalCardProps) {
  const distanceKm = (hospital.distance / 1000).toFixed(1);
  const hospitalType = getHospitalType(hospital.name);

  // Memoize availability so it stays stable across re-renders instead of flickering
  const availability = useMemo(() => {
    if (isNearest) return 85;
    return 55 + Math.floor(seededRandom(hospital.id) * 35); // 55–90%
  }, [hospital.id, isNearest]);

  // Stable simulated bed count
  const bedCount = useMemo(() => {
    return 5 + Math.floor(seededRandom(hospital.id + "-beds") * 20); // 5–25
  }, [hospital.id]);

  return (
    <div
      onClick={() => !isSelected && onSelect(hospital)}
      className={`relative p-5 rounded-2xl border flex flex-col gap-2.5 transition-all duration-500 cursor-pointer group overflow-hidden ${
        isSelected
          ? "bg-[#1e3a8a]/20 border-blue-500/50 shadow-[0_8px_30px_rgba(37,99,235,0.25)] scale-[1.02]"
          : isNearest
            ? "bg-[#0da64f]/10 border-[#0da64f]/40 shadow-[0_8px_30px_rgba(13,166,79,0.1)] hover:border-[#0da64f]/60 hover:-translate-y-1"
            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.15] hover:-translate-y-1 hover:shadow-xl"
      }`}
    >
      {/* Shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 animate-shimmer"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)" }}
        />
      </div>

      {/* Left glowing accent line */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-2xl transition-all duration-500 ${
        isSelected
          ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
          : isNearest
            ? "bg-[#0da64f] shadow-[0_0_15px_rgba(13,166,79,0.8)]"
            : "bg-transparent group-hover:bg-white/20"
      }`} />

      {/* Top badges row */}
      <div className="flex items-center gap-2 pl-1 flex-wrap">
        {isNearest && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0da64f] animate-pulse shadow-[0_0_8px_#0da64f]" />
            <span className="text-[#0da64f] text-[9px] uppercase font-bold tracking-[0.2em]">
              Nearest
            </span>
          </div>
        )}
        {/* Hospital type badge */}
        <span className={`text-[9px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border ${hospitalType.color}`}>
          {hospitalType.label}
        </span>
        {/* 24/7 indicator */}
        <span className="text-[9px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          24/7
        </span>
        {/* Bed count badge */}
        <span className="text-[9px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border text-sky-400 bg-sky-500/10 border-sky-500/20 flex items-center gap-1 ml-auto">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2 4v16" strokeLinecap="round" />
            <path d="M2 8h18a2 2 0 012 2v10" strokeLinecap="round" />
            <path d="M2 17h20" strokeLinecap="round" />
            <path d="M6 8v-2a2 2 0 012-2h2a2 2 0 012 2v2" strokeLinecap="round" />
          </svg>
          {bedCount}
        </span>
      </div>

      {/* Hospital name + distance */}
      <div className="flex justify-between items-start pl-1 gap-2 mt-1">
        <h3 className={`font-bold leading-tight text-[15px] truncate flex-1 ${isSelected ? "text-white" : "text-gray-200 group-hover:text-white transition-colors"}`}>
          {hospital.name}
        </h3>
        <span className={`text-[11px] font-bold tracking-wider py-1.5 px-3 rounded-full shrink-0 transition-all duration-300 ${
          isSelected 
            ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
            : isNearest
              ? "bg-[#0da64f]/20 text-[#0da64f]"
              : "bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-gray-200"
        }`}>
          {distanceKm} km
        </span>
      </div>

      {/* Address */}
      <p className="text-gray-500 text-sm line-clamp-1 pl-1">{hospital.address}</p>

      {/* Bottom: capacity indicator + action button */}
      <div className="mt-2 pl-1 flex flex-col gap-2.5">
        {/* Stable availability bar — no more Math.random() flickering */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-medium">Availability</span>
          <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
              style={{
                width: `${availability}%`,
                boxShadow: "0 0 6px rgba(16,185,129,0.4)",
              }}
            />
          </div>
          <span className="text-[9px] text-emerald-400/60 font-mono">{availability}%</span>
        </div>

        {/* Action button */}
        {!isSelected ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(hospital); }}
            className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.05] hover:border-white/[0.2] rounded-xl font-bold text-[11px] tracking-[0.15em] uppercase transition-all duration-300 backdrop-blur-md"
          >
            Select Destination
          </button>
        ) : (
          <div className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center rounded-xl font-bold text-[11px] tracking-[0.15em] uppercase cursor-default flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Selected
          </div>
        )}
      </div>
    </div>
  );
}
