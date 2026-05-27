"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

interface DemoStep {
  step: number;
  total: number;
  kind: string;
  message: string;
  data?: Record<string, unknown>;
  ts: number;
}

const KIND_META: Record<string, { color: string; icon: string }> = {
  info:                 { color: "#6b7280", icon: "ℹ" },
  conversation_created: { color: "#a855f7", icon: "💬" },
  user_message:         { color: "#3b82f6", icon: "👤" },
  ai_triage:            { color: "#06b6d4", icon: "🧠" },
  ai_message:           { color: "#10b981", icon: "🤖" },
  ticket_created:       { color: "#f59e0b", icon: "🎫" },
  ticket_assigned:      { color: "#a855f7", icon: "👨‍💻" },
  ticket_resolved:      { color: "#10b981", icon: "✅" },
  kb_created:           { color: "#fbbf24", icon: "📘" },
  done:                 { color: "#22c55e", icon: "🎉" },
  error:                { color: "#ef4444", icon: "⚠" },
};

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  function start() {
    if (running) return;
    setSteps([]);
    setProgress(0);
    setDone(false);
    setRunning(true);

    const es = new EventSource(`${API_BASE}/api/demo/run`, { withCredentials: true });
    sourceRef.current = es;

    es.addEventListener("step", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as Omit<DemoStep, "ts">;
      setSteps((prev) => [...prev, { ...data, ts: Date.now() }]);
      setProgress(Math.round((data.step / data.total) * 100));
      if (data.kind === "done" || data.kind === "error") {
        setDone(true);
        setRunning(false);
        es.close();
      }
    });
    es.addEventListener("end", () => {
      es.close();
      setRunning(false);
    });
    es.addEventListener("error", () => {
      es.close();
      setRunning(false);
      setSteps((p) => [...p, { step: 0, total: 0, kind: "error", message: "Conexión cerrada o error de red.", ts: Date.now() }]);
    });
  }

  function stop() {
    sourceRef.current?.close();
    sourceRef.current = null;
    setRunning(false);
  }

  return (
    <div>
      <div className="page-title">
        <h1>🎬 Demo en vivo</h1>
        <p>Ejecuta un escenario end-to-end de la Mesa de Soporte: conversación → triage IA → escalación a Nivel 2 → asignación → resolución → creación automática de KB. Todo con datos reales, en vivo.</p>
      </div>

      <div className="card" style={{
        padding: 24, marginBottom: 14, textAlign: "center",
        background: "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.08), transparent 60%)",
      }}>
        {!running && !done && (
          <>
            <div style={{ fontSize: 14, color: "var(--text-soft)", marginBottom: 16 }}>
              Crea una conversación demo, ejecuta el flujo completo y muestra cada paso en tiempo real. Tarda ~10s.
            </div>
            <button
              className="btn primary"
              onClick={start}
              style={{ fontSize: 16, padding: "12px 32px", borderRadius: 8 }}
            >
              ▶ Ejecutar demo
            </button>
          </>
        )}

        {running && (
          <>
            <div style={{ fontSize: 14, color: "var(--text-soft)", marginBottom: 12 }}>
              Ejecutando escenario… <span className="spinner" />
            </div>
            <div style={{
              width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden",
            }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #a855f7)",
                transition: "width .4s",
              }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>{progress}%</div>
            <button className="btn ghost" onClick={stop} style={{ marginTop: 12, padding: "4px 14px" }}>cancelar</button>
          </>
        )}

        {done && (
          <>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 14, color: "var(--text-soft)", marginBottom: 14 }}>
              Demo completada. Puedes ver los artefactos creados en cada sección:
            </div>
            <div className="row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/support-desk/conversations" className="btn" style={{ textDecoration: "none" }}>💬 Ver conversaciones</Link>
              <Link href="/support-desk/kanban" className="btn" style={{ textDecoration: "none" }}>🗂 Ver Kanban</Link>
              <Link href="/support-desk/kb" className="btn" style={{ textDecoration: "none" }}>📘 Ver KB articles</Link>
              <button className="btn primary" onClick={start} style={{ padding: "8px 18px" }}>▶ Otra vez</button>
            </div>
          </>
        )}
      </div>

      {/* Timeline */}
      {steps.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Timeline</h3>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{
              position: "absolute", left: 8, top: 4, bottom: 4, width: 2,
              background: "linear-gradient(to bottom, #3b82f6, #a855f7, transparent)",
            }} />
            {steps.map((s, i) => {
              const meta = KIND_META[s.kind] ?? KIND_META.info;
              return (
                <div
                  key={i}
                  style={{
                    position: "relative", paddingBottom: 14, paddingLeft: 8,
                    animation: "stepIn .4s ease-out both",
                    animationDelay: `${Math.min(i * 30, 200)}ms`,
                  }}
                >
                  <div style={{
                    position: "absolute", left: -22, top: 0,
                    width: 18, height: 18, borderRadius: "50%",
                    background: meta.color, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, boxShadow: `0 0 14px ${meta.color}99`,
                  }}>
                    {s.step || "•"}
                  </div>
                  <div className="row" style={{ gap: 6, marginBottom: 2 }}>
                    <Badge variant="muted">{s.kind}</Badge>
                    {s.step > 0 && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>paso {s.step}/{s.total}</span>}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)" }}>
                      {new Date(s.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: meta.color === "#ef4444" ? "var(--error)" : "var(--text)" }}>
                    {meta.icon}{" "}{s.message}
                  </div>
                  {s.data && Object.keys(s.data).length > 0 && (
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>data</summary>
                      <pre style={{ fontSize: 11, marginTop: 4, color: "var(--text-soft)", whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(s.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes stepIn {
          0%   { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
