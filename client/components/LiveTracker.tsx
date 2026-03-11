// components/LiveTracker.tsx
"use client";

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
  // Helpers to format distance and time
  const formatDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const formatTime = (mins: number) => {
    if (mins < 1) return "< 1 min";
    const mm = Math.floor(mins);
    const ss = Math.round((mins - mm) * 60);
    return `${mm}m ${ss.toString().padStart(2, "0")}s`;
  };

  if (isComplete) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-500/10">
          <span className="text-3xl">🏁</span>
        </div>
        <h2 className="text-2xl font-bold text-emerald-400 font-mono tracking-widest uppercase text-center mb-2">
          Destination Reached
        </h2>
        <p className="text-emerald-500/70 font-mono text-sm max-w-sm text-center">
          Green corridor simulation successfully completed. The ambulance has arrived.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-[#0a0e1a]/95 backdrop-blur-md p-5 flex flex-col shadow-2xl relative overflow-hidden h-full">
      {/* Glare effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
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

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Distance Left</span>
          <span className="text-xl font-mono text-blue-400">
            {isEmergencyActive ? formatDist(remainingDistanceM) : "--"}
          </span>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">ETA</span>
          <span className="text-xl font-mono text-amber-400">
            {isEmergencyActive ? formatTime(etaMinutes) : "--"}
          </span>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Speed</span>
          <span className="text-xl font-mono text-white flex items-baseline gap-1">
            {isEmergencyActive ? speedKmh : 0} <span className="text-xs text-gray-600">km/h</span>
          </span>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-900/50 rounded-lg border border-gray-800/80 p-3 flex flex-col relative overflow-hidden border-l-2 border-l-red-500">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Next Signal In</span>
          <span className="text-xl font-mono text-red-400">
            {isEmergencyActive ? (nextSignalDistanceM > 0 ? formatDist(nextSignalDistanceM) : "CLEAR") : "--"}
          </span>
        </div>
        <div className="bg-emerald-950/20 rounded-lg border border-emerald-900/40 p-3 flex flex-col relative border-l-2 border-l-[#00ff88] shadow-[inset_0_0_20px_rgba(0,255,136,0.02)]">
          <span className="text-[10px] text-emerald-600 font-mono uppercase tracking-widest mb-1">Signals Cleared</span>
          <span className="text-xl font-mono text-[#00ff88]">
            {isEmergencyActive ? `${greenSignalCount} / ${totalSignalCount}` : "--"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Route Progress</span>
          <span className="text-[11px] font-mono text-blue-400">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
          <div
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-auto space-y-4">
        {/* GPS Coordinates */}
        <div className="bg-black/30 rounded px-3 py-2 border border-gray-800/80 flex justify-between items-center">
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
                  flex-1 py-1.5 rounded text-[11px] font-mono tracking-wider transition-all
                  ${!isEmergencyActive ? 'opacity-50 cursor-not-allowed bg-gray-900 text-gray-600' : ''}
                  ${speedKmh === s
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent'}
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
