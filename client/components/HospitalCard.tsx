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
  if (n.includes("trauma") || n.includes("emergency")) return { label: "Trauma Ctr", color: "text-red-500 bg-red-50 border-red-200" };
  if (n.includes("multi") || n.includes("super")) return { label: "Multi-Specialty", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (n.includes("children") || n.includes("child") || n.includes("pediatric")) return { label: "Pediatric", color: "text-amber-600 bg-amber-50 border-amber-200" };
  if (n.includes("heart") || n.includes("cardiac")) return { label: "Cardiac", color: "text-pink-600 bg-pink-50 border-pink-200" };
  return { label: "General", color: "text-sky-600 bg-sky-50 border-sky-200" };
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
      className={`relative p-4 rounded-2xl border flex flex-col gap-2 transition-all duration-500 cursor-pointer group overflow-hidden ${
        isSelected
          ? "bg-blue-50/40 border-blue-400 shadow-md scale-[1.01]"
          : isNearest
            ? "bg-emerald-50/50 border-emerald-400/50 shadow-sm hover:border-emerald-500/60 hover:-translate-y-0.5"
            : "bg-white border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md"
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
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-emerald-700 text-[10px] uppercase font-bold tracking-[0.1em]">
              Nearest
            </span>
          </div>
        )}
        {/* Hospital type badge */}
        <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${hospitalType.color}`}>
          {hospitalType.label}
        </span>
        {/* 24/7 indicator */}
        <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border text-emerald-600 bg-emerald-50 border-emerald-200 flex items-center gap-1 shrink-0">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          24/7
        </span>
        {/* Bed count badge */}
        <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border text-sky-600 bg-sky-50 border-sky-200 flex items-center gap-1 ml-auto shrink-0">
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
      <div className="flex justify-between items-start pl-1 gap-3 mt-1 min-w-0">
        <h3 className={`font-bold leading-tight text-[15px] truncate flex-1 min-w-0 ${isSelected ? "text-slate-900" : "text-slate-800 group-hover:text-blue-600 transition-colors"}`}>
          {hospital.name}
        </h3>
        <span className={`text-[11px] font-bold tracking-wider py-1.5 px-3 rounded-full shrink-0 transition-all duration-300 ${
          isSelected 
            ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
            : isNearest
              ? "bg-emerald-100/80 text-emerald-700"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
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
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold shrink-0">Capacity</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${availability > 80 ? 'bg-emerald-500' : availability > 50 ? 'bg-amber-400' : 'bg-red-500'}`}
              style={{
                width: `${availability}%`,
              }}
            />
          </div>
          <span className={`text-[10px] font-bold font-mono tracking-tighter shrink-0 ${availability > 80 ? 'text-emerald-600' : availability > 50 ? 'text-amber-500' : 'text-red-500'}`}>{availability}%</span>
        </div>

        {/* Action button */}
        {!isSelected ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(hospital); }}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-[11px] tracking-[0.15em] uppercase transition-all duration-300 backdrop-blur-md"
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
