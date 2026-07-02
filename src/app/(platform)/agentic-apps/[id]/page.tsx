"use client";

// =============================================================================
// /agentic-apps/[id] — v1.3 Agent Hub · Ejecución de App Agéntica
// =============================================================================
// - Input del usuario → POST /api/apps/:id/run (202 + runId)
// - Polling cada 2.5s a GET /api/apps/runs/:runId
// - Progreso visual por paso: pending → running → done/failed
// - Historial de runs anteriores
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { useAuth } from "@/context/AuthContext";
import {
  getApp, runApp, getRun, listRuns,
  type AgenticApp, type AppRun,
} from "@/services/custom-agents.api";
import { exportRunToPdf } from "@/lib/app-run-pdf";

const POLL_MS = 2500;

const STEP_ICONS: Record<string, string> = {
  pending: "○",
  running: "◐",
  done: "●",
  failed: "✕",
};
const STEP_COLORS: Record<string, string> = {
  pending: "var(--text-dim)",
  running: "#22d3ee",
  done: "#22c55e",
  failed: "#ef4444",
};

export default function AgenticAppRunPage() {
  const params = useParams<{ id: string }>();
  const appId = params?.id ?? "";
  const { user } = useAuth();

  const [app, setApp] = useState<AgenticApp | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [run, setRun] = useState<AppRun | null>(null);
  const [history, setHistory] = useState<AppRun[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadApp = useCallback(async () => {
    if (!appId) return;
    const r = await getApp(appId);
    if (r.success) setApp(r.app);
    else setLoadError(r.error);
  }, [appId]);

  const loadHistory = useCallback(async () => {
    if (!appId) return;
    const r = await listRuns(appId);
    if (r.success) setHistory(r.runs);
  }, [appId]);

  useEffect(() => { loadApp(); loadHistory(); }, [loadApp, loadHistory]);

  // Polling mientras el run esté en curso
  useEffect(() => {
    if (!run || run.status !== "running") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const r = await getRun(run.id);
      if (r.success) {
        setRun(r.run);
        if (r.run.status !== "running") loadHistory();
      }
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [run, loadHistory]);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !app) return;
    const r = await runApp(app.id, input.trim(), user?.email ?? user?.name ?? undefined);
    if (r.success) setRun(r.run);
    else window.alert(r.error);
  }

  if (loadError) {
    return (
      <div className="card" style={{ padding: 30, textAlign: "center" }}>
        <div style={{ color: "#fca5a5", marginBottom: 12 }}>{loadError}</div>
        <Link href="/agent-studio" className="btn ghost">← Volver al Studio</Link>
      </div>
    );
  }
  if (!app) {
    return <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>Cargando app…</div>;
  }

  const isRunning = run?.status === "running";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 14 }}>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <Link href="/agent-studio" className="btn ghost" style={{ padding: "4px 10px", fontSize: 13 }}>←</Link>
          <span style={{
            fontSize: 26, width: 48, height: 48, display: "grid", placeItems: "center",
            borderRadius: 12, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)",
          }}>{app.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{app.name}</div>
            <div className="row" style={{ gap: 6, marginTop: 3 }}>
              <Badge variant="muted">{app.steps.length} pasos</Badge>
              <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>▶ {app.runCount} ejecuciones</span>
            </div>
          </div>
        </div>
        {app.description && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-soft)" }}>{app.description}</p>
        )}
      </div>

      {/* Input + ejecutar */}
      <form onSubmit={handleRun} className="card" style={{ padding: 18, marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12.5, color: "var(--text-soft)", marginBottom: 8 }}>
          Input para el pipeline (entra al paso 1)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: pegá acá el texto del incidente, el pedido del cliente, o lo que la app deba procesar…"
          rows={4}
          disabled={isRunning}
          style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.5 }}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button type="submit" className="btn primary" disabled={isRunning || !input.trim()} style={{ marginLeft: "auto" }}>
            {isRunning ? "Ejecutando…" : "▶ Ejecutar pipeline"}
          </button>
        </div>
      </form>

      {/* Progreso del run activo */}
      {run && (
        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>
              {run.status === "running" && <><span className="spinner" style={{ marginRight: 8 }} />Ejecutando pipeline…</>}
              {run.status === "done" && "✅ Pipeline completado"}
              {run.status === "failed" && "❌ Pipeline falló"}
            </h3>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              {run.status !== "running" && (
                <button
                  className="btn ghost"
                  onClick={() => app && exportRunToPdf(app, run)}
                  style={{ fontSize: 12, padding: "4px 12px" }}
                  title="Descargar esta ejecución como PDF"
                >
                  📥 PDF
                </button>
              )}
              <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                {new Date(run.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Timeline de pasos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {run.stepsOutput.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 10 }}>
                {/* Columna icono + línea */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{
                    fontSize: 16, color: STEP_COLORS[s.status],
                    animation: s.status === "running" ? "pulse 1.2s infinite" : undefined,
                  }}>
                    {STEP_ICONS[s.status]}
                  </span>
                  {i < run.stepsOutput.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border-soft)", marginTop: 4 }} />
                  )}
                </div>
                {/* Contenido del paso */}
                <div style={{ paddingBottom: 16 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s.stepName}</span>
                    <span style={{ fontSize: 11, color: STEP_COLORS[s.status] }}>
                      {s.status === "pending" && "en espera"}
                      {s.status === "running" && "procesando…"}
                      {s.status === "done" && `listo · ${(s.durationMs / 1000).toFixed(1)}s`}
                      {s.status === "failed" && "falló"}
                    </span>
                  </div>
                  {s.output && s.status === "done" && (
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 11.5, color: "var(--text-dim)", cursor: "pointer" }}>
                        Ver output del paso
                      </summary>
                      <div style={{
                        marginTop: 8, padding: 12, borderRadius: 8, fontSize: 12.5,
                        background: "rgba(15,23,42,0.5)", border: "1px solid var(--border-soft)",
                        maxHeight: 240, overflowY: "auto",
                      }}>
                        <MarkdownView text={s.output} />
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          {run.error && (
            <div className="alert error" style={{ fontSize: 12.5, marginTop: 8 }}>{run.error}</div>
          )}

          {/* Output final */}
          {run.status === "done" && run.finalOutput && (
            <div style={{
              marginTop: 8, padding: 16, borderRadius: 10,
              background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)",
            }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: "#22c55e", textTransform: "uppercase", marginBottom: 8 }}>
                Resultado final
              </div>
              <MarkdownView text={run.finalOutput} />
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Ejecuciones anteriores</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.slice(0, 10).map((h) => (
              <div
                key={h.id}
                onClick={() => setRun(h)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12.5,
                  border: "1px solid var(--border-soft)",
                  background: run?.id === h.id ? "rgba(167,139,250,0.08)" : "transparent",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                  {h.input.slice(0, 80)}
                </span>
                <span className="row" style={{ gap: 8, alignItems: "center" }}>
                  {h.status === "done" && <Badge variant="ok">completado</Badge>}
                  {h.status === "failed" && <Badge variant="error">falló</Badge>}
                  {h.status === "running" && <Badge variant="warn">en curso</Badge>}
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
