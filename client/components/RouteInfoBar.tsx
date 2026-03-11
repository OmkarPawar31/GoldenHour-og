// components/RouteInfoBar.tsx
"use client";

import { Hospital, RouteInfo } from "../types";

interface RouteInfoBarProps {
    hospital: Hospital;
    routeInfo: RouteInfo;
    onChangeHospital: () => void;
    onStartEmergency: () => void;
}

export default function RouteInfoBar({ hospital, routeInfo, onChangeHospital, onStartEmergency }: RouteInfoBarProps) {
    return (
        <div className="w-full bg-[#0a0e1a] border-t border-gray-800 p-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col flex-1 min-w-0 w-full">
                    <h2 className="text-slate-200 font-bold text-[1.1rem] truncate flex items-center gap-2">
                        <span className="text-red-500">🏥</span> {hospital.name}
                    </h2>
                    <div className="flex gap-4 mt-1 text-sm font-mono tracking-wide text-gray-400">
                        <span className="flex items-center gap-1">📍 {routeInfo.distanceText}</span>
                        <span className="flex items-center gap-1">⏳ {routeInfo.durationText}</span>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto shrink-0">
                    <button
                        onClick={onChangeHospital}
                        className="flex-1 md:flex-none px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold tracking-widest uppercase rounded focus:outline-none transition-colors"
                    >
                        Change
                    </button>
                    <button
                        onClick={onStartEmergency}
                        className="flex-1 md:flex-none px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold tracking-widest uppercase rounded shadow-[0_0_15px_rgba(220,38,38,0.4)] focus:outline-none transition-all flex items-center justify-center gap-2"
                    >
                        ⚡ Start Emergency
                    </button>
                </div>
            </div>
        </div>
    );
}
