// hooks/useToast.ts
"use client";

import { useState, useCallback, useRef } from "react";

export interface Toast {
    id: string;
    message: string;
    type: "success" | "warning" | "info" | "error";
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
        const id = `toast-${Date.now()}-${counterRef.current++}`;
        const newToast: Toast = { id, message, type };

        setToasts((prev) => [...prev, newToast]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
}
