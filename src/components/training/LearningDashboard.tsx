"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import {
  apiRunQaEval, apiListEvalRuns, apiGetEvalRunDetail,
  type EvalRunReport, type EvalRunSummary, type EvalRunDetail,
} from "@/services/training.api";

interface Props { ctx: UseAgentTraining }

const VERDICT_COLORS: Record<"pass" | "partial" | "fail", string> = {
  pass: "#10b981", partial: "#fbbf24", fail: "#ef4444",
};
const VERDICT_LABELS: Record<"pass" | "partial" | "fail", string> = {
  pass: "aprobado", partial: "parcial", fail: "fallido",
};

export default function LearningDashboard({ ctx }: Props) {
  const [runs, setRuns] = useState<EvalRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<EvalRunReport | null>(null);
  const [detail, setDetail] = useState<EvalRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await apiListEvalRuns();
    if (r.ok) setRuns(r.runs);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function runNow() {
    setError(null);
    setRunning(true);
    const r = await apiRunQaEval(limit);
    setRunning(false);
    if (r.ok) {
      setLast(r.report);
      await refresh();
    } else {
      setError(r.error);
    }
  }

  async function loadDetail(id: string) {
    setDetail(null);
    setDetailLoading(true);
    const r = await apiGetEvalRunDetail(id);
    setDetailLoading(false);
    if (r.ok) setDetail(r.run);
  }

  // Métricas derivadas
  const totalQAsApproved = ctx.qa.filter((q) => q.approved).length;
  const totalQAs = ctx.qa.length;
  const lastRun = runs[0];
  const trendDelta = (() => {
    if (runs.length < 2) return null;
    return (runs[0].avg_score ?? 0) - (runs[1].avg_score ?? 0);
  })();
  const passRate = lastRun && lastRun.total_qas > 0
    ? Math.round((lastRun.passed / lastRun.total_qas) * 100)
    : null;

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Hero metric cards */}
      <div className="tc-metric-grid">
        <div className="tc-metric" style={{ ["--tc-acc" as never]: "#22d3ee" }}>
          <div className="tc-metric-head"><span className="tc-metric-icon">🧪</span><span className="tc-metric-label">Q&amp;A aprobadas</span></div>
          <div className="tc-metric-value">{totalQAsApproved}</div>
          <div className="tc-metric-foot">de {totalQAs} totales</div>
        </div>
        <div className="tc-metric" style={{ ["--tc-acc" as never]: "#10b981" }}>
          <div className="tc-metric-head"><span className="tc-metric-icon">✓</span><span className="tc-metric-label">Pass rate última eval</span></div>
          <div className="tc-metric-value">{passRate !== null ? `${passRate}%` : "—"}</div>
          <div className="tc-metric-foot">
            {lastRun
              ? `${lastRun.passed}/${lastRun.total_qas} aprobados · ${new Date(lastRun.started_at).toLocaleString("es-CL")}`
              : "sin evaluaciones todavía"}
          </div>
        </div>
        <div className="tc-metric" style={{ ["--tc-acc" as never]: "#a855f7" }}>
          <div className="tc-metric-head"><span className="tc-metric-icon">🎯</span><span className="tc-metric-label">Score promedio</span></div>
          <div className="tc-metric-value">{lastRun ? lastRun.avg_score : "—"}</div>
          <div className="tc-metric-foot">
            {trendDelta === null ? "primer run" : trendDelta > 0 ? (
              <><span className="tc-trend up">▲</span>+{trendDelta} vs anterior</>
            ) : trendDelta < 0 ? (
              <><span className="tc-trend down">▼</span>{trendDelta} vs anterior</>
            ) : "sin cambio"}
          </div>
        </div>
        <div className="tc-metric" style={{ ["--tc-acc" as never]: "#fbbf24" }}>
          <div className="tc-metric-head"><span className="tc-metric-icon">📊</span><span className="tc-metric-label">Runs ejecutados</span></div>
          <div className="tc-metric-value">{runs.length}</div>
          <div className="tc-metric-foot">historial completo</div>
        </div>
      </div>

      {/* Trigger eval */}
      <div className="card" style={{ borderLeft: "3px solid #a855f7" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#c084fc" }}>⚡</span> EVALUACIÓN AUTOMÁTICA · Q&amp;A vs Agente real
        </div>
        <p className="settings-section-desc">
          Cada Q&amp;A aprobada se convierte en un <b>test de regresión</b>. El agente responde la pregunta,
          Gemini compara con la respuesta esperada y le pone un score 0-100. Útil para detectar regresiones
          tras adoptar un prompt nuevo o cambiar items publicados.
        </p>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span>Cantidad Q&amp;A a evaluar:</span>
            <input type="range" min={1} max={50} step={1} value={limit}
              onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 140 }} />
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, minWidth: 24 }}>{limit}</span>
          </label>
          <button className="btn primary" onClick={runNow}
            disabled={running || totalQAsApproved === 0}
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7", marginLeft: "auto" }}>
            {running
              ? <><span className="spinner" /> ejecutando contra agente…</>
              : "▶ Correr evaluación ahora"}
          </button>
        </div>
        {totalQAsApproved === 0 && (
          <div className="alert info" style={{ marginTop: 8, fontSize: 12 }}>
            No hay Q&amp;A aprobadas todavía. Generá Q&amp;A en la tab "Generador" y aprobalas para poder evaluar.
          </div>
        )}
        {error && <div className="alert error" style={{ marginTop: 10, fontSize: 12 }}>⚠ {error}</div>}

        {last && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 12.5 }}>
            ✓ Eval completada en {(last.durationMs / 1000).toFixed(1)}s ·{" "}
            <b style={{ color: VERDICT_COLORS.pass }}>{last.passed} pass</b> /{" "}
            <b style={{ color: VERDICT_COLORS.partial }}>{last.partial} partial</b> /{" "}
            <b style={{ color: VERDICT_COLORS.fail }}>{last.failed} fail</b> ·
            score promedio <b>{last.avgScore}</b>
            {last.promptLabel && <> · prompt: <b>{last.promptLabel}</b></>}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>📜</span> HISTORIAL DE EVALUACIONES
        </div>
        {loading && runs.length === 0 && (
          <div style={{ padding: 20, color: "var(--text-soft)", fontSize: 12.5 }}>
            <span className="spinner" /> cargando…
          </div>
        )}
        {!loading && runs.length === 0 && (
          <div className="ticket-empty" style={{ padding: 30 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>📭</div>
            <div style={{ fontSize: 13 }}>Aún no se corrió ninguna evaluación.</div>
          </div>
        )}
        {runs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Prompt</th>
                  <th>Trigger</th>
                  <th>Total</th>
                  <th>Pass</th>
                  <th>Fail</th>
                  <th>Score</th>
                  <th>Ver</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
                      {new Date(r.started_at).toLocaleString("es-CL").slice(0, 16)}
                    </td>
                    <td>{r.prompt_label ?? <span style={{ color: "var(--text-dim)" }}>(default)</span>}</td>
                    <td><span style={{ fontSize: 11, color: "var(--text-soft)" }}>{r.triggered_by}</span></td>
                    <td>{r.total_qas}</td>
                    <td><span style={{ color: VERDICT_COLORS.pass, fontWeight: 700 }}>{r.passed}</span></td>
                    <td><span style={{ color: VERDICT_COLORS.fail, fontWeight: 700 }}>{r.failed}</span></td>
                    <td>
                      <div className="tc-score-circle" style={{
                        ["--sc-color" as never]: r.avg_score >= 75 ? "#10b981" : r.avg_score >= 50 ? "#fbbf24" : "#ef4444",
                      }}>{r.avg_score}</div>
                    </td>
                    <td>
                      <button className="tc-iconbtn" onClick={() => loadDetail(r.id)}>👁</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="tc-modal-back" onClick={() => setDetail(null)}>
          <div className="tc-modal" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
                  RUN · {detail.id.slice(0, 8)} · {new Date(detail.started_at).toLocaleString("es-CL")}
                </div>
                <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
                  Eval {detail.prompt_label ?? "(default)"} · score {detail.avg_score}
                </h2>
                <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap", fontSize: 11 }}>
                  <span className="tc-pill ok">{detail.passed} pass</span>
                  <span className="tc-pill pend">{detail.results.filter((r) => r.verdict === "partial").length} partial</span>
                  <span style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                    {detail.failed} fail
                  </span>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
            </div>
            <div className="tc-modal-body">
              {detailLoading && <div style={{ padding: 20, textAlign: "center" }}><span className="spinner" /> cargando…</div>}
              {detail.results.map((r, i) => (
                <div key={r.qaId} className="lab-fb-card" style={{ ["--fb-color" as never]: VERDICT_COLORS[r.verdict] }}>
                  <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>#{i + 1}</span>
                    <span className="tc-pill" style={{
                      background: `${VERDICT_COLORS[r.verdict]}20`,
                      border: `1px solid ${VERDICT_COLORS[r.verdict]}66`,
                      color: VERDICT_COLORS[r.verdict],
                    }}>
                      {VERDICT_LABELS[r.verdict]} · {r.score}/100
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>
                      ⏱ {r.latencyMs} ms
                    </span>
                  </div>
                  <div className="lab-fb-block">
                    <div className="lab-fb-block-head">▸ PREGUNTA</div>
                    <div style={{ fontSize: 12.5 }}>{r.question}</div>
                  </div>
                  <div className="lab-fb-block">
                    <div className="lab-fb-block-head" style={{ color: "#10b981" }}>▸ ESPERADA</div>
                    <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{r.expected.slice(0, 600)}</div>
                  </div>
                  <div className="lab-fb-block">
                    <div className="lab-fb-block-head" style={{ color: VERDICT_COLORS[r.verdict] }}>▸ AGENTE RESPONDIÓ</div>
                    <div style={{ fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{r.actual.slice(0, 1200)}</div>
                  </div>
                  {r.notes && (
                    <div className="lab-fb-block">
                      <div className="lab-fb-block-head">▸ VEREDICTO DEL JUEZ (Gemini)</div>
                      <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-soft)" }}>{r.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
