"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import {
  apiRunQaEval, apiListEvalRuns, apiGetEvalRunDetail,
  apiRunAbTest, apiAutoPromote, apiDiffRuns, apiProposeQasFromTickets,
  type EvalRunReport, type EvalRunSummary, type EvalRunDetail,
  type AbTestReport, type RunDiffReport, type TicketToQaReport,
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

  // A/B testing
  const [showAb, setShowAb] = useState(false);
  const [abPromptLabel, setAbPromptLabel] = useState("Variante experimental");
  const [abPrompt, setAbPrompt] = useState("Sos un agente AMS Supply Chain SAP. Respondé en español con pasos numerados y mencionando transacciones SAP específicas en **bold**. Sé conciso y directo.");
  const [abLimit, setAbLimit] = useState(5);
  const [abRunning, setAbRunning] = useState(false);
  const [abReport, setAbReport] = useState<AbTestReport | null>(null);

  // Auto-promote
  const [autoMinDelta, setAutoMinDelta] = useState(5);
  const [autoApply, setAutoApply] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  // Tickets -> Q&A
  const [ticketsLimit, setTicketsLimit] = useState(3);
  const [ticketsRunning, setTicketsRunning] = useState(false);
  const [ticketsReport, setTicketsReport] = useState<TicketToQaReport | null>(null);

  // Diff
  const [diffA, setDiffA] = useState<string>("");
  const [diffB, setDiffB] = useState<string>("");
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffReport, setDiffReport] = useState<RunDiffReport | null>(null);

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

  async function runAb() {
    if (!abPrompt.trim() || !abPromptLabel.trim()) return;
    setAbRunning(true);
    setAbReport(null);
    setError(null);
    const r = await apiRunAbTest({
      promptB: { systemPrompt: abPrompt, label: abPromptLabel },
      limit: abLimit,
    });
    setAbRunning(false);
    if (r.ok) {
      setAbReport(r.report);
      await refresh();
    } else {
      setError(r.error);
    }
  }

  async function runAutoPromote(applyChange: boolean) {
    if (!abPrompt.trim() || !abPromptLabel.trim()) return;
    setAutoRunning(true);
    setAutoMsg(null);
    const r = await apiAutoPromote({
      candidate: { systemPrompt: abPrompt, label: abPromptLabel },
      minDelta: autoMinDelta,
      limit: abLimit,
      apply: applyChange,
    });
    setAutoRunning(false);
    if (r.ok) {
      setAutoMsg(`${r.result.decision === "adopted" ? "🎉" : "ℹ"} ${r.result.decision.toUpperCase()} · ${r.result.reason}`);
      if (r.result.decision === "adopted") await refresh();
    } else {
      setAutoMsg(`⚠ ${r.error}`);
    }
  }

  async function runTicketsToQa() {
    setTicketsRunning(true);
    setTicketsReport(null);
    const r = await apiProposeQasFromTickets({ limit: ticketsLimit, daysBack: 30 });
    setTicketsRunning(false);
    if (r.ok) setTicketsReport(r.report);
    else setError(r.error);
  }

  async function loadDiff() {
    if (!diffA || !diffB || diffA === diffB) return;
    setDiffLoading(true);
    setDiffReport(null);
    const r = await apiDiffRuns(diffA, diffB);
    setDiffLoading(false);
    if (r.ok) setDiffReport(r.diff);
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

      {/* ============================================================== */}
      {/* TICKETS -> Q&A                                                   */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #fbbf24" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#fbbf24" }}>🎫</span> TICKETS RESUELTOS → Q&amp;A PROPUESTAS
        </div>
        <p className="settings-section-desc">
          Tomamos tickets cerrados sin Q&amp;A. Gemini lee la conversación, crea un knowledge item base
          en estado DRAFT y propone 3-6 Q&amp;A en estado <b>pending</b>. Vos revisás y aprobás.
        </p>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span>Tickets a procesar:</span>
            <input type="range" min={1} max={10} step={1} value={ticketsLimit}
              onChange={(e) => setTicketsLimit(Number(e.target.value))} style={{ width: 120 }} />
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, minWidth: 22 }}>{ticketsLimit}</span>
          </label>
          <button className="btn primary" onClick={runTicketsToQa} disabled={ticketsRunning}
            style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", borderColor: "#fbbf24", marginLeft: "auto" }}>
            {ticketsRunning ? <><span className="spinner" /> Gemini proponiendo…</> : "🤖 Generar Q&A desde tickets"}
          </button>
        </div>
        {ticketsReport && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 12.5 }}>
            ✓ Procesados <b>{ticketsReport.ticketsScanned}</b> tickets ·
            <b> {ticketsReport.itemsCreated}</b> items DRAFT creados ·
            <b> {ticketsReport.qasProposed}</b> Q&amp;A propuestas (pending de aprobación) ·
            <b> {ticketsReport.skipped}</b> saltados.
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
              {ticketsReport.byTicket.map((t) => (
                <div key={t.ticketCode}>
                  · <b>{t.ticketCode}</b>: {t.error ? `⚠ ${t.error}` : `${t.proposedQas} Q&A${t.newItemCreated ? ", item creado" : ""}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* A/B TEST + AUTO-PROMOTE                                          */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #22d3ee" }}>
        <div className="ticket-section-head" style={{ cursor: "pointer" }} onClick={() => setShowAb(!showAb)}>
          <span style={{ color: "#67e8f9" }}>🆎</span> A/B TEST · COMPARAR PROMPT CANDIDATO VS ACTIVO
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>{showAb ? "▼" : "▶"}</span>
        </div>
        {showAb && (
          <div className="col" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="lab-fb-block" style={{ flex: 1, minWidth: 220 }}>
                <div className="lab-fb-block-head">▸ NOMBRE DE LA VARIANTE</div>
                <input value={abPromptLabel} onChange={(e) => setAbPromptLabel(e.target.value)}
                  placeholder="ej. ES con bullet points + transacciones bold" style={{ fontSize: 12.5 }} />
              </div>
            </div>
            <div className="lab-fb-block">
              <div className="lab-fb-block-head">▸ SYSTEM PROMPT CANDIDATO</div>
              <textarea value={abPrompt} onChange={(e) => setAbPrompt(e.target.value)}
                style={{ width: "100%", minHeight: 120, fontSize: 11.5, fontFamily: "var(--font-mono, monospace)", resize: "vertical" }} />
            </div>
            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span>Q&A por variante:</span>
                <input type="range" min={1} max={30} step={1} value={abLimit}
                  onChange={(e) => setAbLimit(Number(e.target.value))} style={{ width: 100 }} />
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, minWidth: 22 }}>{abLimit}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span>min delta:</span>
                <input type="number" min={1} max={50} value={autoMinDelta}
                  onChange={(e) => setAutoMinDelta(Number(e.target.value))} style={{ width: 60 }} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
                <span>aplicar si gana</span>
              </label>
              <button className="btn ghost" onClick={runAb} disabled={abRunning || autoRunning || !abPrompt.trim()}>
                {abRunning ? <><span className="spinner" /> A/B…</> : "▶ Solo comparar"}
              </button>
              <button className="btn primary" onClick={() => runAutoPromote(autoApply)} disabled={abRunning || autoRunning || !abPrompt.trim()}
                style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)", borderColor: "#22d3ee" }}>
                {autoRunning
                  ? <><span className="spinner" /> auto-promote…</>
                  : autoApply ? "✓ Comparar + adoptar si gana" : "📊 Solo evaluar promoción"}
              </button>
            </div>

            {autoMsg && (
              <div className={autoMsg.startsWith("🎉") ? "alert ok" : autoMsg.startsWith("ℹ") ? "alert info" : "alert error"} style={{ fontSize: 12 }}>
                {autoMsg}
              </div>
            )}

            {abReport && (
              <div className="lab-fb-card" style={{ ["--fb-color" as never]: abReport.winner === "B" ? "#10b981" : abReport.winner === "A" ? "#ef4444" : "#64748b" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                  RESULTADO A/B · GANADOR{" "}
                  <span style={{ color: abReport.winner === "B" ? "#10b981" : abReport.winner === "A" ? "#ef4444" : "#94a3b8" }}>
                    {abReport.winner === "tie" ? "EMPATE" : `VARIANTE ${abReport.winner}`}
                  </span>
                  {" "}· delta <b>{abReport.scoreDelta > 0 ? "+" : ""}{abReport.scoreDelta}</b> pts
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="lab-fb-block" style={{ borderLeft: "3px solid #ef4444" }}>
                    <div className="lab-fb-block-head">A · {abReport.runA.promptLabel ?? "(activo)"}</div>
                    <div>score <b>{abReport.runA.avgScore}</b> · pass <b>{abReport.runA.passed}/{abReport.runA.totalQas}</b></div>
                  </div>
                  <div className="lab-fb-block" style={{ borderLeft: "3px solid #10b981" }}>
                    <div className="lab-fb-block-head">B · {abReport.runB.promptLabel}</div>
                    <div>score <b>{abReport.runB.avgScore}</b> · pass <b>{abReport.runB.passed}/{abReport.runB.totalQas}</b></div>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, fontSize: 11, color: "var(--text-soft)", marginTop: 8 }}>
                  <span>📈 {abReport.improvedQas.length} mejoraron</span>
                  <span>📉 {abReport.degradedQas.length} empeoraron</span>
                  <span>= {abReport.unchangedQas.length} sin cambio</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DIFF entre 2 runs                                                */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #a855f7" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#c084fc" }}>🔍</span> COMPARAR DOS EVAL RUNS
        </div>
        <p className="settings-section-desc">
          Elegí 2 runs del historial → te mostramos qué Q&amp;A mejoraron, cuáles empeoraron y cuáles quedaron igual.
        </p>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={diffA} onChange={(e) => setDiffA(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">A · seleccionar run...</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {new Date(r.started_at).toLocaleString("es-CL").slice(0, 16)} · {r.prompt_label ?? "(default)"} · {r.avg_score}
              </option>
            ))}
          </select>
          <span style={{ color: "var(--text-dim)" }}>↔</span>
          <select value={diffB} onChange={(e) => setDiffB(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">B · seleccionar run...</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {new Date(r.started_at).toLocaleString("es-CL").slice(0, 16)} · {r.prompt_label ?? "(default)"} · {r.avg_score}
              </option>
            ))}
          </select>
          <button className="btn ghost" onClick={loadDiff} disabled={!diffA || !diffB || diffA === diffB || diffLoading}>
            {diffLoading ? <><span className="spinner" /> comparando…</> : "🔍 Comparar"}
          </button>
        </div>

        {diffReport && (
          <div className="col" style={{ gap: 10, marginTop: 10 }}>
            <div className="row" style={{ gap: 10, flexWrap: "wrap", fontSize: 12 }}>
              <span>Score delta: <b style={{ color: diffReport.scoreDelta > 0 ? "#10b981" : diffReport.scoreDelta < 0 ? "#ef4444" : "#94a3b8" }}>
                {diffReport.scoreDelta > 0 ? "+" : ""}{diffReport.scoreDelta} pts
              </b></span>
              <span>Pass delta: <b>{diffReport.passDelta > 0 ? "+" : ""}{diffReport.passDelta}</b></span>
              <span>📈 <b style={{ color: "#10b981" }}>{diffReport.improved.length}</b> mejoraron</span>
              <span>📉 <b style={{ color: "#ef4444" }}>{diffReport.degraded.length}</b> empeoraron</span>
              <span>= <b>{diffReport.unchanged.length}</b> sin cambio</span>
            </div>

            {diffReport.improved.slice(0, 5).length > 0 && (
              <div className="lab-fb-block" style={{ borderLeft: "3px solid #10b981" }}>
                <div className="lab-fb-block-head" style={{ color: "#10b981" }}>▸ TOP 5 MEJORADAS</div>
                {diffReport.improved.slice(0, 5).map((r) => (
                  <div key={r.qaId} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--border-soft)" }}>
                    <b style={{ color: "#10b981" }}>+{r.delta}</b> · {r.scoreA} → {r.scoreB} · {r.question.slice(0, 100)}…
                  </div>
                ))}
              </div>
            )}

            {diffReport.degraded.slice(0, 5).length > 0 && (
              <div className="lab-fb-block" style={{ borderLeft: "3px solid #ef4444" }}>
                <div className="lab-fb-block-head" style={{ color: "#ef4444" }}>▸ TOP 5 DEGRADADAS</div>
                {diffReport.degraded.slice(0, 5).map((r) => (
                  <div key={r.qaId} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--border-soft)" }}>
                    <b style={{ color: "#ef4444" }}>{r.delta}</b> · {r.scoreA} → {r.scoreB} · {r.question.slice(0, 100)}…
                  </div>
                ))}
              </div>
            )}
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
