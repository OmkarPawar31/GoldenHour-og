// app/offline/page.tsx
"use client";

export default function OfflinePage() {
  return (
    <>
      <style>{`
        .offline-root {
          min-height: 100vh;
          background: linear-gradient(150deg, #020617 0%, #0F172A 50%, #0a0300 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* Ambient glows */
        .offline-glow-1 {
          position: absolute;
          top: 25%; left: 33%;
          width: 400px; height: 400px;
          background: rgba(239, 68, 68, 0.04);
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
        }
        .offline-glow-2 {
          position: absolute;
          bottom: 25%; right: 33%;
          width: 300px; height: 300px;
          background: rgba(59, 130, 246, 0.04);
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }
        .offline-dots {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        /* Icon container */
        .offline-icon-wrap {
          position: relative;
          margin-bottom: 2.5rem;
          animation: offline-float 4s ease-in-out infinite;
        }
        @keyframes offline-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .offline-icon-box {
          width: 96px; height: 96px;
          border-radius: 24px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(71, 85, 105, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 60px rgba(100, 100, 100, 0.1);
          backdrop-filter: blur(12px);
        }
        .offline-icon-box svg {
          width: 48px; height: 48px;
          color: #64748B;
        }
        .offline-ring {
          position: absolute;
          inset: -12px;
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 32px;
          animation: offline-ping 2.5s ease-out infinite;
          pointer-events: none;
        }
        @keyframes offline-ping {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        /* Text */
        .offline-title {
          font-family: 'Bebas Neue', cursive;
          font-size: 2.2rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #fff;
          margin-bottom: 0.5rem;
          text-align: center;
        }
        .offline-desc {
          font-size: 0.9rem;
          color: #94A3B8;
          margin-bottom: 0.25rem;
          text-align: center;
          max-width: 320px;
        }
        .offline-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 2.5rem;
        }

        /* Signal bars */
        .offline-bars {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin-bottom: 2rem;
          opacity: 0.4;
        }
        .offline-bar {
          width: 6px;
          background: #475569;
          border-radius: 100px;
          transition: all 0.3s;
        }

        /* Retry button */
        .offline-retry {
          padding: 0.85rem 2.5rem;
          background: rgba(239, 68, 68, 0.12);
          color: #F87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.1);
        }
        .offline-retry:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
        }
        .offline-retry:active {
          transform: translateY(0) scale(0.98);
        }

        /* Footer branding */
        .offline-footer {
          position: absolute;
          bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .offline-footer-brand {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem;
          color: #334155;
          letter-spacing: 0.3em;
          text-transform: uppercase;
        }
        .offline-footer-version {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.55rem;
          color: #1E293B;
        }

        /* Entry animation */
        .offline-root > * {
          animation: offline-fade-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .offline-root > *:nth-child(4) { animation-delay: 0.1s; }
        .offline-root > *:nth-child(5) { animation-delay: 0.15s; }
        .offline-root > *:nth-child(6) { animation-delay: 0.2s; }
        .offline-root > *:nth-child(7) { animation-delay: 0.25s; }
        .offline-root > *:nth-child(8) { animation-delay: 0.3s; }
        .offline-root > *:nth-child(9) { animation-delay: 0.35s; }
        @keyframes offline-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="offline-root">
        {/* Ambient background */}
        <div className="offline-glow-1" />
        <div className="offline-glow-2" />
        <div className="offline-dots" />

        {/* Icon */}
        <div className="offline-icon-wrap">
          <div className="offline-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072M12 12h.01"
              />
            </svg>
          </div>
          <div className="offline-ring" />
        </div>

        {/* Title */}
        <h1 className="offline-title">Offline</h1>
        <p className="offline-desc">
          You&apos;re currently not connected to the internet.
        </p>
        <p className="offline-sub">GoldenHour requires network access</p>

        {/* Signal bars */}
        <div className="offline-bars">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className="offline-bar"
              style={{ height: `${bar * 5 + 4}px` }}
            />
          ))}
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="offline-retry"
        >
          ↻ Retry Connection
        </button>

        {/* Bottom branding */}
        <div className="offline-footer">
          <span className="offline-footer-brand">
            GoldenHour Emergency System
          </span>
          <span className="offline-footer-version">
            v0.1.0
          </span>
        </div>
      </div>
    </>
  );
}
