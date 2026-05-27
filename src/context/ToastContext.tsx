"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastKind = "info" | "ok" | "warn" | "error";

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
}

interface ToastState {
  toast: (message: string, opts?: { kind?: ToastKind; durationMs?: number }) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  warn: (m: string) => void;
}

const ToastContext = createContext<ToastState | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, opts: { kind?: ToastKind; durationMs?: number } = {}) => {
    const id = `t${counter++}-${Date.now().toString(36)}`;
    const t: Toast = {
      id,
      kind: opts.kind ?? "info",
      message,
      durationMs: opts.durationMs ?? 4000,
    };
    setItems((prev) => [...prev, t]);
  }, []);

  // Auto-cierre
  useEffect(() => {
    if (items.length === 0) return;
    const next = items[items.length - 1];
    const timeout = setTimeout(() => remove(next.id), next.durationMs);
    return () => clearTimeout(timeout);
  }, [items, remove]);

  const value: ToastState = {
    toast,
    success: (m) => toast(m, { kind: "ok" }),
    error:   (m) => toast(m, { kind: "error", durationMs: 6000 }),
    info:    (m) => toast(m, { kind: "info" }),
    warn:    (m) => toast(m, { kind: "warn", durationMs: 5000 }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast toast-${t.kind}`}
            onClick={() => remove(t.id)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeftWidth: 4,
              borderLeftColor:
                t.kind === "ok" ? "var(--ok)" :
                t.kind === "warn" ? "var(--warn)" :
                t.kind === "error" ? "var(--error)" :
                "var(--accent)",
              borderRadius: 8,
              padding: "10px 14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              cursor: "pointer",
              fontSize: 13.5,
              color: "var(--text)",
              animation: "toast-in 0.2s ease",
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.05,
              color:
                t.kind === "ok" ? "var(--ok)" :
                t.kind === "warn" ? "var(--warn)" :
                t.kind === "error" ? "var(--error)" :
                "var(--accent)",
              marginBottom: 2,
            }}>
              {t.kind === "ok" ? "Listo" : t.kind === "error" ? "Error" : t.kind === "warn" ? "Aviso" : "Info"}
            </div>
            <div>{t.message}</div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
