// components/HospitalCard.tsx
"use client";

import { Hospital } from "../types";

interface HospitalCardProps {
    hospital: Hospital;
    isNearest: boolean;
    isSelected: boolean;
    onSelect: (hospital: Hospital) => void;
}

export default function HospitalCard({ hospital, isNearest, isSelected, onSelect }: HospitalCardProps) {
    const distanceKm = (hospital.distance / 1000).toFixed(1);

    return (
        <div
            className={`relative p-4 rounded-xl border flex flex-col gap-2 transition-all ${isSelected
                    ? "bg-blue-900/20 border-blue-500"
                    : isNearest
                        ? "bg-[#0da64f]/10 border-[#0da64f]"
                        : "bg-[#0a0e1a] border-gray-800 hover:border-gray-600"
                }`}
        >
            {isNearest && (
                <span className="absolute -top-3 left-4 px-2 py-0.5 bg-[#0da64f] text-white text-[10px] uppercase font-bold tracking-widest rounded shadow">
                    Nearest
                </span>
            )}

            <div className="flex justify-between items-start mt-2">
                <h3 className="text-white font-bold leading-tight">{hospital.name}</h3>
                <span className="text-gray-400 text-xs whitespace-nowrap bg-gray-800/80 py-1 px-2 rounded font-mono shrink-0 ml-2">
                    {distanceKm} km
                </span>
            </div>

            <p className="text-gray-500 text-sm line-clamp-1">{hospital.address}</p>

            {!isSelected && (
                <button
                    onClick={() => onSelect(hospital)}
                    className="mt-2 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold text-xs tracking-widest uppercase transition-colors"
                >
                    Select
                </button>
            )}
            {isSelected && (
                <div className="mt-2 w-full py-2 bg-blue-500/20 text-blue-400 text-center rounded font-semibold text-xs tracking-widest uppercase cursor-default">
                    Selected
                </div>
            )}
        </div>
    );
}
