// app/offline/page.tsx
"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-red-600/[0.04] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-blue-600/[0.04] rounded-full blur-[100px]" />

      {/* Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gray-800/50 border border-gray-700/30 flex items-center justify-center shadow-[0_0_60px_rgba(100,100,100,0.1)]">
          <svg
            className="w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072M12 12h.01"
            />
          </svg>
        </div>
        {/* Pulsing ring */}
        <div className="absolute -inset-3 border border-gray-600/20 rounded-[2rem] animate-ping opacity-20 pointer-events-none" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold tracking-[0.3em] uppercase text-white mb-2">
        Offline
      </h1>
      <p className="text-sm text-gray-400 mb-1 text-center max-w-xs">
        You&apos;re currently not connected to the internet.
      </p>
      <p className="text-xs text-gray-600 font-mono uppercase tracking-[0.2em] mb-8">
        GoldenHour requires network access
      </p>

      {/* Signal bars (crossed out) */}
      <div className="flex items-end gap-1 mb-6 opacity-40">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className="w-1.5 bg-gray-600 rounded-full"
            style={{ height: `${bar * 5 + 4}px` }}
          />
        ))}
      </div>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold tracking-[0.2em] uppercase rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
      >
        ↻ Retry Connection
      </button>

      {/* Bottom branding */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1">
        <span className="text-[10px] text-gray-700 font-mono tracking-[0.3em] uppercase">
          GoldenHour Emergency System
        </span>
        <span className="text-[9px] text-gray-800 font-mono">
          v0.1.0
        </span>
      </div>
    </div>
  );
}
