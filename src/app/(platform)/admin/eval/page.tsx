"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { evalApi, type EvalConfig, type EvalRun, type EvalResult } from "@/services/eval.api";

const STATUS_VARIANT: Record<EvalRun["status"], "ok" | "warn" | "error" | "info" | "muted"> = {
  pending: "muted",
  running: "warn",
  done:    "ok",
  failed:  "error",
};

const RESULT_VARIANT: Record<EvalResult["status"], "ok" | "warn" | "error" | "muted"> = {
  pending:     "muted",
  ok:          "ok",
  error:       "error",
  quota_error: "warn",
};

const SAMPLE_QUESTIONS = `¿Cómo extiendo un material al centro 1100 si MM03 me dice que no existe?
Tengo una orden de compra bloqueada por límite de tolerancia, ¿qué reviso primero?
La factura de proveedor no se libera para pago, MIRO me bota error de retención IVA.
WBS de un proyecto cerrado todavía permite imputaciones, ¿bug o configuración?
Las salidas de mercadería con MIGO 261 no se reflejan en MD04, ¿qué consulto?`;

const SAMPLE_CONFIGS: EvalConfig[] = [
  { label: "flash-lite-default",  model: "gemini-2.5-flash-lite", temperature: 0.4 },
  { label: "flash-lite-creative", model: "gemini-2.5-flash-lite", temperature: 0.8 },
];

export default function EvalPage() {
  const toast = useToast();
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ run: EvalRun; results: EvalResult[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [questionsText, setQuestionsText] = useState(SAMPLE_QUESTIONS);
  const [configsText, setConfigsText] = useState(JSON.stringify(SAMPLE_CONFIGS, null, 2));
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await evalApi.list();
    if ("success" in r && r.success) setRuns(r.runs);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh cuando hay un run en estado pending/running
  useEffect(() => {
    const hasActive = runs.some((r) => r.status === "pending" || r.status === "running");
    if (!hasActive) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [runs, refresh]);

  // Cargar detalle del seleccionado, y refrescar si está running
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let alive = true;
    async function tick() {
      const r = await evalApi.detail(selectedId!);
      if (alive && "success" in r && r.success) setDetail({ run: r.run, results: r.results });
    }
    tick();
    const t = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [selectedId]);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Nombre requerido"); return; }
    let configs: EvalConfig[];
    try {
      configs = JSON.parse(configsText);
      if (!Array.isArray(configs) || configs.length === 0) throw new Error("array vacío");
    } catch (err) {
      toast.error(`Configs inválidas: ${(err as Error).message}`);
      return;
    }
    const questions = questionsText.split("\n").map((s) => s.trim()).filter(Boolean).map((text) => ({ text }));
    if (questions.length === 0) { toast.error("Sin preguntas"); return; }

    setSubmitting(true);
    const r = await evalApi.create(name.trim(), configs, questions);
    setSubmitting(false);
    if ("success" in r && r.success) {
      toast.success(`Run creado · ${r.runIds.length} config(s) × ${questions.length} preguntas`);
      setShowCreate(false);
      setName("");
      refresh();
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }

  return (
    <div>
      <div className="page-title">
        <h1>🧪 Eval framework</h1>
        <p>Compara configuraciones del agente (modelo, temperatura) contra un set de preguntas. Mide latencia, confianza y cobertura de los 12 bloques.</p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <button className="btn primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancelar" : "+ Nuevo eval run"}
        </button>
        <button className="btn ghost" onClick={refresh} disabled={loading} style={{ marginLeft: "auto" }}>
          {loading ? <><span className="spinner" /> cargando</> : "↻"}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Nuevo eval run</h3>
          <div className="col" style={{ gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--text-soft)" }}>
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. comparación temp 0.4 vs 0.8" style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, color: "var(--text-soft)" }}>
              Preguntas (una por línea)
              <textarea value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} style={{ width: "100%", minHeight: 130, marginTop: 4, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, color: "var(--text-soft)" }}>
              Configs (JSON array)
              <textarea value={configsText} onChange={(e) => setConfigsText(e.target.value)} style={{ width: "100%", minHeight: 110, marginTop: 4, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} />
            </label>
            <button className="btn primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? <><span className="spinner" /> creando</> : "Ejecutar eval"}
            </button>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Cada config genera un run separado con sus preguntas. Las llamadas a Gemini se hacen en background; refresca para ver el progreso.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
        {/* Lista de runs */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {runs.length} run{runs.length === 1 ? "" : "s"}
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {runs.length === 0 && !loading && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>Sin runs todavía. Crea uno arriba.</div>
            )}
            {runs.map((r) => {
              const active = selectedId === r.id;
              const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: 0, borderBottom: "1px solid var(--border-soft)",
                    color: "inherit", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </div>
                  <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--text-dim)" }}>
                    <code>{r.config_label}</code>
                    <span style={{ marginLeft: "auto" }}>{r.completed}/{r.total} · {pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle / scorecard */}
        <div className="card">
          {!detail && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Selecciona un run para ver el scorecard.</div>}
          {detail && (
            <div className="col" style={{ gap: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{detail.run.name}</h3>
                <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <Badge variant={STATUS_VARIANT[detail.run.status]}>{detail.run.status}</Badge>
                  <Badge variant="tech">{detail.run.config.model}</Badge>
                  <Badge variant="muted">temp {detail.run.config.temperature ?? 0.4}</Badge>
                  <Badge variant="info">{detail.run.completed}/{detail.run.total}</Badge>
                </div>
              </div>

              {detail.run.summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                  <ScoreBox label="OK" value={detail.run.summary.ok} variant="ok" />
                  <ScoreBox label="Errores" value={detail.run.summary.errors} variant={detail.run.summary.errors > 0 ? "error" : "muted"} />
                  <ScoreBox label="Quota 429" value={detail.run.summary.quotaErrors} variant={detail.run.summary.quotaErrors > 0 ? "warn" : "muted"} />
                  <ScoreBox label="Latencia avg" value={`${detail.run.summary.avgLatencyMs} ms`} variant="info" />
                  <ScoreBox label="12-bloques" value={`${detail.run.summary.pct12Blocks}%`} variant={detail.run.summary.pct12Blocks >= 70 ? "ok" : "warn"} />
                  <ScoreBox label="Confianza alta" value={detail.run.summary.confidenceDist.alta} variant="ok" />
                </div>
              )}

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Resultados</h4>
                <div className="col" style={{ gap: 6 }}>
                  {detail.results.map((r) => (
                    <details key={r.id} style={{ background: "var(--bg-elev)", padding: 8, borderRadius: 6 }}>
                      <summary style={{ cursor: "pointer", fontSize: 12.5 }}>
                        <Badge variant={RESULT_VARIANT[r.status]}>{r.status}</Badge>{" "}
                        {r.latency_ms !== null && <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{r.latency_ms} ms · </span>}
                        {r.confidence && <Badge variant="muted">{r.confidence}</Badge>}{" "}
                        {r.has_12_blocks && <Badge variant="ok">12-bloques</Badge>}{" "}
                        <span>{r.question.slice(0, 120)}{r.question.length > 120 ? "…" : ""}</span>
                      </summary>
                      {r.response && (
                        <pre style={{ fontSize: 11.5, marginTop: 8, whiteSpace: "pre-wrap", color: "var(--text-soft)", maxHeight: 300, overflow: "auto" }}>
                          {r.response.slice(0, 4000)}{r.response.length > 4000 ? "…" : ""}
                        </pre>
                      )}
                      {r.error && (
                        <div className="alert error" style={{ marginTop: 8, fontSize: 11.5 }}>{r.error}</div>
                      )}
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, value, variant }: {
  label: string;
  value: string | number;
  variant: "ok" | "warn" | "error" | "info" | "muted";
}) {
  const color = `var(--${variant === "muted" ? "text-dim" : variant})`;
  return (
    <div style={{
      background: "var(--bg-elev)", padding: 10, borderRadius: 6,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color }}>{value}</div>
    </div>
  );
}
