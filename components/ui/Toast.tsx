"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  ttlMs?: number;
};

type ToastCtx = {
  show: (t: Omit<Toast, "id">) => void;
  clear: (id: string) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const clear = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast: Toast = { id, ttlMs: 4500, ...t };
    setToasts((prev) => [...prev, toast]);

    const ttl = toast.ttlMs ?? 4500;
    window.setTimeout(() => clear(id), ttl);
  }, [clear]);

  const value = useMemo(() => ({ show, clear }), [show, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: "sticky",
          right: 16,
          top: 16,
          zIndex: 209,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 420,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            style={{
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              border: "1px solid rgba(0,0,0,0.08)",
              background:
                t.type === "success"
                  ? "rgba(34,197,94,0.12)"
                  : t.type === "error"
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(59,130,246,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                {t.title ? (
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
                ) : null}
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.35 }}>{t.message}</div>
              </div>

              <button
                type="button"
                onClick={() => clear(t.id)}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  opacity: 0.7,
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return ctx;
}