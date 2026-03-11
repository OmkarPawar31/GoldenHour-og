// components/ToastContainer.tsx
"use client";

import type { Toast } from "../hooks/useToast";

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

const typeStyles: Record<Toast["type"], { bg: string; border: string; icon: string }> = {
    success: {
        bg: "bg-emerald-950/90",
        border: "border-emerald-500/40",
        icon: "✓",
    },
    warning: {
        bg: "bg-amber-950/90",
        border: "border-amber-500/40",
        icon: "⚠",
    },
    info: {
        bg: "bg-sky-950/90",
        border: "border-sky-500/40",
        icon: "ℹ",
    },
    error: {
        bg: "bg-red-950/90",
        border: "border-red-500/40",
        icon: "✕",
    },
};

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-16 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast, idx) => {
                const style = typeStyles[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto
              flex items-center gap-3 px-4 py-3
              rounded-lg border backdrop-blur-xl
              shadow-2xl shadow-black/30
              ${style.bg} ${style.border}
              animate-slide-in-right
              min-w-[280px] max-w-[380px]
            `}
                        style={{
                            animationDelay: `${idx * 50}ms`,
                            animationFillMode: "both",
                        }}
                    >
                        <span className="text-sm flex-shrink-0">{style.icon}</span>
                        <p className="text-sm text-white/90 font-mono leading-tight flex-1">
                            {toast.message}
                        </p>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="text-white/40 hover:text-white/80 transition-colors text-xs flex-shrink-0"
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                );
            })}

            <style>{`
        @keyframes slide-in-right {
          0% {
            transform: translateX(120%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
        </div>
    );
}
