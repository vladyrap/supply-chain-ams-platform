"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import {
  apiRunQaEval, apiListEvalRuns, apiGetEvalRunDetail,
  apiRunAbTest, apiAutoPromote, apiDiffRuns, apiProposeQasFromTickets,
  apiAutoGenerateQas, apiLoadExpandedCorpus, apiRunSelfTraining,
  apiGetSelfTrainingConfig, apiUpdateSelfTrainingConfig, apiGetSelfTrainingHistory,
  apiBackfillEmbeddings, apiGetEvalTimeline, apiDetectFeedbackPatterns,
  apiGetHallucinationReport, apiGetBorderlineQAs,
  type EvalRunReport, type EvalRunSummary, type EvalRunDetail,
  type AbTestReport, type RunDiffReport, type TicketToQaReport,
  type SelfTrainingReport, type CorpusLoadResult, type AutoQaReport,
  type SelfTrainingCronConfig, type TimelineResponse,
  type FeedbackPatternReport, type EmbeddingsBackfillReport,
  type HallucinationReport, type BorderlineQA,
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

  // Self-training
  const [stRunning, setStRunning] = useState(false);
  const [stReport, setStReport] = useState<SelfTrainingReport | null>(null);
  const [stCurrentStage, setStCurrentStage] = useState<string | null>(null);

  // Corpus loader
  const [corpusLoading, setCorpusLoading] = useState(false);
  const [corpusResult, setCorpusResult] = useState<CorpusLoadResult | null>(null);
  const [autoQaLoading, setAutoQaLoading] = useState(false);
  const [autoQaResult, setAutoQaResult] = useState<AutoQaReport | null>(null);

  // Cron config
  const [cron, setCron] = useState<SelfTrainingCronConfig | null>(null);
  const [cronSaving, setCronSaving] = useState(false);

  // Timeline
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);

  // Embeddings backfill
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResult, setEmbedResult] = useState<EmbeddingsBackfillReport | null>(null);

  // Feedback patterns
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsReport, setPatternsReport] = useState<FeedbackPatternReport | null>(null);

  // Hallucination
  const [hallucination, setHallucination] = useState<HallucinationReport | null>(null);

  // Borderline Q&A (active learning)
  const [borderline, setBorderline] = useState<BorderlineQA[]>([]);
  const [borderlineLoading, setBorderlineLoading] = useState(false);

  useEffect(() => {
    apiGetSelfTrainingConfig().then((r) => { if (r.ok) setCron(r.config); });
    apiGetEvalTimeline(30, 10).then((r) => { if (r.ok) setTimeline(r.data); });
    apiGetHallucinationReport().then((r) => { if (r.ok) setHallucination(r.report); });
  }, []);

  async function loadBorderline() {
    setBorderlineLoading(true);
    const r = await apiGetBorderlineQAs(20);
    setBorderlineLoading(false);
    if (r.ok) setBorderline(r.items);
  }

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

  async function runSelfTrain() {
    setStRunning(true);
    setStReport(null);
    setStCurrentStage("Iniciando ciclo de auto-pulido…");
    // animacion fake de etapas mientras el backend trabaja
    const stages = [
      "Detectar brechas",
      "Tickets → Q&A propuestas",
      "Auto-aprobar Q&A (juez Gemini)",
      "Auto-Q&A para items sin Q&A",
      "Evaluación contra agente activo",
    ];
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setStCurrentStage(stages[idx]);
    }, 2500);
    const r = await apiRunSelfTraining({ evalLimit: 10, ticketsLimit: 3, autoApproveLimit: 6 });
    clearInterval(timer);
    setStCurrentStage(null);
    setStRunning(false);
    if (r.ok) {
      setStReport(r.report);
      await refresh();
    } else {
      setError(r.error);
    }
  }

  async function loadCorpus() {
    setCorpusLoading(true);
    setCorpusResult(null);
    const r = await apiLoadExpandedCorpus();
    setCorpusLoading(false);
    if (r.ok) setCorpusResult(r.result);
    else setError(r.error);
  }

  async function autoGen() {
    setAutoQaLoading(true);
    setAutoQaResult(null);
    const r = await apiAutoGenerateQas(50);
    setAutoQaLoading(false);
    if (r.ok) setAutoQaResult(r.report);
    else setError(r.error);
  }

  async function updateCron(patch: { enabled?: boolean; intervalHours?: number; runEval?: boolean }) {
    setCronSaving(true);
    const r = await apiUpdateSelfTrainingConfig(patch);
    setCronSaving(false);
    if (r.ok) setCron(r.config);
    else setError(r.error);
  }

  async function backfillEmb() {
    setEmbedLoading(true);
    setEmbedResult(null);
    const r = await apiBackfillEmbeddings(200);
    setEmbedLoading(false);
    if (r.ok) setEmbedResult(r.report);
    else setError(r.error);
  }

  async function detectPatterns() {
    setPatternsLoading(true);
    setPatternsReport(null);
    const r = await apiDetectFeedbackPatterns(14);
    setPatternsLoading(false);
    if (r.ok) setPatternsReport(r.report);
    else setError(r.error);
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
      {/* ============================================================== */}
      {/* SELF-TRAINING · pulido del agente en un click                    */}
      {/* ============================================================== */}
      <div className="card" style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(34,211,238,0.10) 100%)",
        borderLeft: "3px solid #a855f7",
        position: "relative", overflow: "hidden",
      }}>
        <div className="ticket-section-head">
          <span style={{ color: "#c084fc" }}>⚡</span> AUTO-PULIDO DEL AGENTE · self-training cycle
        </div>
        <p className="settings-section-desc">
          Un click corre el ciclo completo: <b>detecta brechas</b> → <b>convierte tickets en Q&amp;A</b>
          → <b>Gemini aprueba Q&amp;A de alta calidad</b> → <b>genera Q&amp;A para items sin entrenamiento</b>
          → <b>evalúa al agente</b>. El corpus crece y el few-shot se enriquece sin esfuerzo humano.
        </p>

        {/* Pipeline visual */}
        {(stRunning || stReport) && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {["Brechas", "Tickets→Q&A", "Auto-aprobar", "Auto-Q&A", "Evaluación"].map((label, i) => {
              const stageData = stReport?.stages[i];
              const color = !stageData ? "#64748b"
                          : stageData.status === "ok" ? "#10b981"
                          : stageData.status === "skipped" ? "#94a3b8"
                          : "#ef4444";
              const active = stCurrentStage && stCurrentStage.toLowerCase().includes(label.toLowerCase().split("→")[0].trim());
              return (
                <div key={i} style={{
                  padding: "10px 8px",
                  background: "rgba(15,23,42,0.55)",
                  border: `1px solid ${color}55`,
                  borderRadius: 6,
                  textAlign: "center",
                  position: "relative",
                  boxShadow: active ? `0 0 16px ${color}88` : "none",
                  animation: active ? "tc-pulse 1.8s ease-in-out infinite" : "none",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>
                    {!stageData ? "⏳" : stageData.status === "ok" ? "✓" : stageData.status === "skipped" ? "−" : "✕"}
                  </div>
                  <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: 0.5 }}>
                    {label}
                  </div>
                  {stageData && (
                    <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 3 }}>
                      {(stageData.durationMs / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {stRunning && stCurrentStage && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#c084fc", fontFamily: "var(--font-mono, monospace)" }}>
            <span className="spinner" /> {stCurrentStage}…
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={runSelfTrain} disabled={stRunning}
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
              borderColor: "#a855f7",
              minWidth: 220, fontWeight: 700,
            }}>
            {stRunning ? <><span className="spinner" /> Pulido en curso…</> : "⚡ Pulir agente ahora"}
          </button>

          <button className="btn ghost" onClick={loadCorpus} disabled={corpusLoading}>
            {corpusLoading ? <><span className="spinner" /> cargando corpus…</> : "🌱 Cargar corpus expandido (26 items)"}
          </button>

          <button className="btn ghost" onClick={autoGen} disabled={autoQaLoading} style={{ marginLeft: "auto" }}>
            {autoQaLoading ? <><span className="spinner" /> generando…</> : "🪄 Auto-Q&A items sin entrenamiento"}
          </button>
        </div>

        {corpusResult && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 12.5 }}>
            ✓ Corpus cargado: <b>{corpusResult.itemsCreated}</b> items nuevos ·
            <b> {corpusResult.itemsSkipped}</b> ya existían ·
            <b> {corpusResult.qasCreated}</b> Q&amp;A aprobadas ·
            <b> {corpusResult.publishedCount}</b> publicados (de {corpusResult.corpusSize} en el corpus total)
          </div>
        )}

        {autoQaResult && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 12.5 }}>
            ✓ Auto-Q&amp;A generadas: <b>{autoQaResult.itemsScanned}</b> items procesados ·
            <b> {autoQaResult.qasCreated}</b> Q&amp;A creadas ·
            <b> {autoQaResult.qasApproved}</b> aprobadas automáticamente
            {autoQaResult.byModule.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-dim)" }}>
                Por módulo: {autoQaResult.byModule.map((m) => `${m.module}=${m.qas}`).join(" · ")}
              </div>
            )}
          </div>
        )}

        {/* Before/After del self-train */}
        {stReport && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="lab-fb-block" style={{ borderLeft: "3px solid #64748b" }}>
              <div className="lab-fb-block-head">▸ ANTES</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div>📚 <b>{stReport.before.itemsTotal}</b> items · <b>{stReport.before.itemsPublished}</b> publicados</div>
                <div>💬 <b>{stReport.before.qasApproved}</b> Q&amp;A aprobadas (de {stReport.before.qasTotal})</div>
                <div>🚧 <b>{stReport.before.openGaps}</b> brechas abiertas</div>
              </div>
            </div>
            <div className="lab-fb-block" style={{ borderLeft: "3px solid #10b981" }}>
              <div className="lab-fb-block-head" style={{ color: "#10b981" }}>▸ DESPUÉS</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div>📚 <b>{stReport.after.itemsTotal}</b> items {delta(stReport.before.itemsTotal, stReport.after.itemsTotal)} · <b>{stReport.after.itemsPublished}</b> publicados</div>
                <div>💬 <b>{stReport.after.qasApproved}</b> aprobadas {delta(stReport.before.qasApproved, stReport.after.qasApproved)}</div>
                <div>🚧 <b>{stReport.after.openGaps}</b> brechas {delta(stReport.before.openGaps, stReport.after.openGaps, true)}</div>
                {stReport.after.evalAvgScore !== null && (
                  <div>🎯 score eval <b>{stReport.after.evalAvgScore}</b> · pass <b>{stReport.after.evalPassRate}%</b></div>
                )}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1", fontSize: 10.5, color: "var(--text-dim)", textAlign: "center", marginTop: 4 }}>
              ciclo completado en <b>{(stReport.totalMs / 1000).toFixed(1)}s</b> · {stReport.stages.length} etapas
            </div>
          </div>
        )}
      </div>

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

      {/* ============================================================== */}
      {/* CRON · auto-pulido programado                                    */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #10b981" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#10b981" }}>⏰</span> CRON · AUTO-PULIDO AUTOMÁTICO
        </div>
        <p className="settings-section-desc">
          Activá el cron para que el ciclo completo de self-training corra automáticamente cada N horas.
          El agente se pule solo 24/7 sin esfuerzo humano.
        </p>
        {cron ? (
          <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={cron.enabled} disabled={cronSaving}
                onChange={(e) => updateCron({ enabled: e.target.checked })} />
              <b>{cron.enabled ? "✓ Activo" : "Inactivo"}</b>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span>Cada</span>
              <input type="number" min={1} max={168} value={cron.interval_hours}
                onChange={(e) => updateCron({ intervalHours: Number(e.target.value) })}
                style={{ width: 60 }} disabled={cronSaving} />
              <span>horas</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={cron.run_eval} disabled={cronSaving}
                onChange={(e) => updateCron({ runEval: e.target.checked })} />
              <span>incluir evaluación (más lento + quota)</span>
            </label>
            {cron.last_scheduled && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
                Última actualización del schedule: {new Date(cron.last_scheduled).toLocaleString("es-CL")}
              </span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}><span className="spinner" /> cargando config…</div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TIMELINE · curva temporal + drift                                */}
      {/* ============================================================== */}
      {timeline && (
        <div className="card" style={{
          borderLeft: timeline.drift.driftDetected ? "3px solid #ef4444" : "3px solid #06b6d4",
        }}>
          <div className="ticket-section-head">
            <span style={{ color: timeline.drift.driftDetected ? "#ef4444" : "#06b6d4" }}>
              {timeline.drift.driftDetected ? "🚨" : "📈"}
            </span> CURVA DE APRENDIZAJE · {timeline.days} días
          </div>
          <p className="settings-section-desc" style={{
            color: timeline.drift.driftDetected ? "#fca5a5" : undefined,
            fontWeight: timeline.drift.driftDetected ? 600 : undefined,
          }}>
            {timeline.drift.message}
          </p>
          {timeline.points.length > 0 ? (
            <SparkChart points={timeline.points} />
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: 20 }}>
              Aún no hay evaluaciones suficientes para graficar.
            </div>
          )}
          <div className="row" style={{ gap: 10, marginTop: 8, fontSize: 11, color: "var(--text-soft)", flexWrap: "wrap" }}>
            {timeline.drift.current7dPassRate !== null && (
              <span>Pass rate 7d: <b>{timeline.drift.current7dPassRate}%</b>
                {timeline.drift.previous7dPassRate !== null && (
                  <span style={{ color: "var(--text-dim)" }}> vs {timeline.drift.previous7dPassRate}% anterior</span>
                )}
              </span>
            )}
            {timeline.drift.current7dAvgScore !== null && (
              <span>Score 7d: <b>{timeline.drift.current7dAvgScore}</b>
                {timeline.drift.scoreDeltaPoints !== null && timeline.drift.scoreDeltaPoints !== 0 && (
                  <span style={{ color: timeline.drift.scoreDeltaPoints > 0 ? "#10b981" : "#ef4444" }}>
                    {" "}({timeline.drift.scoreDeltaPoints > 0 ? "+" : ""}{timeline.drift.scoreDeltaPoints})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SEMANTIC FEW-SHOT · embeddings                                   */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #f43f5e" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#f87171" }}>🧬</span> EMBEDDINGS SEMÁNTICOS · few-shot inteligente
        </div>
        <p className="settings-section-desc">
          Reemplaza el match léxico por embeddings reales de Gemini. El agente encuentra Q&amp;A relevantes
          aunque el usuario use sinónimos o reformule la pregunta. Para los nuevos items se generan auto;
          para el corpus existente correr backfill una vez.
        </p>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={backfillEmb} disabled={embedLoading}
            style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", borderColor: "#f43f5e" }}>
            {embedLoading ? <><span className="spinner" /> generando embeddings…</> : "🧬 Backfill embeddings (200 items)"}
          </button>
        </div>
        {embedResult && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 12.5 }}>
            ✓ Backfill OK: <b>{embedResult.qasEmbedded}</b> Q&amp;A embedded · <b>{embedResult.itemsEmbedded}</b> items embedded.
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* FEEDBACK PATTERNS · auto-curación                                */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #f59e0b" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#fbbf24" }}>🔬</span> DETECTAR PATRONES DE FEEDBACK NEGATIVO
        </div>
        <p className="settings-section-desc">
          Cluster por embeddings de razones de feedback 👎 recurrentes. Cada cluster ≥ 3 genera una
          KnowledgeGap automática con sugerencia de cómo curar el contenido.
        </p>
        <button className="btn primary" onClick={detectPatterns} disabled={patternsLoading}
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderColor: "#f59e0b" }}>
          {patternsLoading ? <><span className="spinner" /> clusterizando…</> : "🔬 Buscar patrones (14 días)"}
        </button>
        {patternsReport && (
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            <div className="alert ok" style={{ fontSize: 12.5 }}>
              ✓ <b>{patternsReport.totalNegatives}</b> feedbacks analizados ·
              <b> {patternsReport.clustersFound}</b> clusters detectados ·
              <b> {patternsReport.gapsCreated}</b> brechas nuevas creadas
            </div>
            {patternsReport.clusters.length > 0 && (
              <div className="col" style={{ gap: 6 }}>
                {patternsReport.clusters.slice(0, 5).map((c, i) => (
                  <div key={i} className="lab-fb-block" style={{
                    borderLeft: c.gapCreated ? "3px solid #10b981" : "3px solid #94a3b8",
                  }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      <b style={{ color: c.gapCreated ? "#10b981" : "var(--text-soft)" }}>
                        {c.count} casos
                      </b>
                      {" · fuentes: " + c.sources.join(", ")}
                      {c.gapCreated && <span style={{ marginLeft: 6, color: "#10b981" }}>✓ brecha creada</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-soft)", fontStyle: "italic" }}>
                      "{c.representativeReason.slice(0, 200)}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* HALLUCINATION DETECTION                                          */}
      {/* ============================================================== */}
      {hallucination && (
        <div className="card" style={{
          borderLeft: hallucination.avgRisk7d >= 50 ? "3px solid #ef4444"
                    : hallucination.avgRisk7d >= 25 ? "3px solid #fbbf24"
                    : "3px solid #10b981",
        }}>
          <div className="ticket-section-head">
            <span style={{ color: hallucination.avgRisk7d >= 50 ? "#ef4444" : hallucination.avgRisk7d >= 25 ? "#fbbf24" : "#10b981" }}>
              {hallucination.avgRisk7d >= 50 ? "🚨" : hallucination.avgRisk7d >= 25 ? "⚠" : "✓"}
            </span> HALLUCINATION DETECTOR · transacciones SAP fuera del corpus
          </div>
          <p className="settings-section-desc">
            Si el agente menciona transacciones SAP que NO están en el corpus de entrenamiento, las flag.
            Custom Z* o Y* siempre suspechosas. Riesgo promedio 7d &lt;25% = sano; ≥50% = el agente inventa código.
          </p>
          <div className="tc-metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div className="tc-metric" style={{ ["--tc-acc" as never]: "#ef4444" }}>
              <div className="tc-metric-head"><span className="tc-metric-icon">🎯</span><span className="tc-metric-label">Risk score 7d</span></div>
              <div className="tc-metric-value">{hallucination.avgRisk7d}</div>
              <div className="tc-metric-foot">{hallucination.last7d} respuestas con flags</div>
            </div>
            <div className="tc-metric" style={{ ["--tc-acc" as never]: "#fbbf24" }}>
              <div className="tc-metric-head"><span className="tc-metric-icon">🔍</span><span className="tc-metric-label">Total logueadas</span></div>
              <div className="tc-metric-value">{hallucination.totalLogged}</div>
              <div className="tc-metric-foot">histórico completo</div>
            </div>
            <div className="tc-metric" style={{ ["--tc-acc" as never]: "#c084fc" }}>
              <div className="tc-metric-head"><span className="tc-metric-icon">⚡</span><span className="tc-metric-label">Top sospechosas</span></div>
              <div className="tc-metric-value">{hallucination.topSuspicious.length}</div>
              <div className="tc-metric-foot">distintas TX flageadas</div>
            </div>
          </div>
          {hallucination.topSuspicious.length > 0 && (
            <div className="lab-fb-block" style={{ marginTop: 10 }}>
              <div className="lab-fb-block-head">▸ TOP 10 TRANSACCIONES SOSPECHOSAS (30d)</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {hallucination.topSuspicious.map((t) => (
                  <span key={t.tx} className="kanban-tag" style={{
                    borderColor: "rgba(239,68,68,0.4)", color: "#fca5a5",
                    background: "rgba(239,68,68,0.08)", fontFamily: "var(--font-mono, monospace)",
                  }}>
                    {t.tx} <b style={{ marginLeft: 4 }}>×{t.count}</b>
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6 }}>
                Tip: si una TX legítima aparece flageada, agregala al corpus para que el detector la apruebe.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ACTIVE LEARNING · Q&A borderline                                 */}
      {/* ============================================================== */}
      <div className="card" style={{ borderLeft: "3px solid #06b6d4" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#22d3ee" }}>🎯</span> ACTIVE LEARNING · Q&amp;A borderline (score 40-69)
        </div>
        <p className="settings-section-desc">
          Las Q&amp;A más valiosas para que el humano revise: las que el agente ni acierta ni falla claramente.
          Una pequeña edición acá puede mover una "partial" a "pass" y mejorar el corpus entero.
        </p>
        <button className="btn primary" onClick={loadBorderline} disabled={borderlineLoading}
          style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", borderColor: "#06b6d4" }}>
          {borderlineLoading ? <><span className="spinner" /> buscando…</> : "🎯 Buscar Q&A borderline ahora"}
        </button>

        {borderline.length > 0 && (
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {borderline.length} Q&amp;A en zona gris · ordenadas por cercanía al borde (50)
            </div>
            {borderline.slice(0, 10).map((q) => {
              const color = q.avgScore >= 60 ? "#fbbf24" : q.avgScore >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <div key={q.qaId} className="lab-fb-block" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color, fontWeight: 700 }}>
                      score {q.avgScore}/100
                    </span>
                    {q.module && (
                      <span className="kanban-tag" style={{ borderColor: "rgba(34,211,238,0.4)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>
                        {q.module}
                      </span>
                    )}
                    <span className="tc-pill" style={{
                      background: `${color}20`, border: `1px solid ${color}66`, color, fontSize: 10,
                    }}>
                      {q.latestVerdict}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>
                      evaluada {q.evalCount}× · uncertainty {q.uncertainty}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    {q.question.slice(0, 200)}
                  </div>
                  {q.latestNotes && (
                    <div style={{ fontSize: 11, color: "var(--text-soft)", fontStyle: "italic" }}>
                      📝 {q.latestNotes.slice(0, 200)}
                    </div>
                  )}
                </div>
              );
            })}
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

/** Render visual del delta entre 2 valores. `invert=true` para casos donde menos es mejor (brechas). */
function delta(before: number, after: number, invert = false): React.ReactNode {
  const d = after - before;
  if (d === 0) return null;
  const positive = invert ? d < 0 : d > 0;
  const color = positive ? "#10b981" : "#ef4444";
  const sign = d > 0 ? "+" : "";
  return <span style={{ color, fontSize: 10.5, marginLeft: 4 }}>({sign}{d})</span>;
}

/** Sparkline SVG nativo de la curva de aprendizaje (avgScore + passRate). */
function SparkChart({ points }: { points: { date: string; avgScore: number; passRate: number; runs: number }[] }) {
  const W = 800, H = 140, PAD = 20;
  const n = points.length;
  if (n === 0) return null;

  const xs = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, n - 1);
  const ys = (v: number) => H - PAD - (v / 100) * (H - PAD * 2);

  const scorePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(p.avgScore).toFixed(1)}`).join(" ");
  const passPath  = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(p.passRate).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 140, marginTop: 8 }} preserveAspectRatio="none">
      {/* gridlines */}
      {[0, 25, 50, 75, 100].map((v) => (
        <line key={v} x1={PAD} x2={W - PAD} y1={ys(v)} y2={ys(v)}
          stroke="rgba(148,163,184,0.15)" strokeDasharray="2 2" strokeWidth="0.5" />
      ))}
      {/* passRate (verde) */}
      <path d={passPath} stroke="#10b981" strokeWidth="2" fill="none" />
      {/* avgScore (cyan) */}
      <path d={scorePath} stroke="#22d3ee" strokeWidth="2" fill="none" />
      {/* dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.passRate)} r="2.5" fill="#10b981" />
          <circle cx={xs(i)} cy={ys(p.avgScore)} r="2.5" fill="#22d3ee" />
        </g>
      ))}
      {/* labels Y */}
      <text x="4" y={ys(100) + 3} fontSize="9" fill="rgba(148,163,184,0.6)">100</text>
      <text x="4" y={ys(50)  + 3} fontSize="9" fill="rgba(148,163,184,0.6)">50</text>
      <text x="4" y={ys(0)   + 3} fontSize="9" fill="rgba(148,163,184,0.6)">0</text>
      {/* leyenda */}
      <g transform={`translate(${W - 180}, 10)`}>
        <circle cx="6" cy="6" r="3" fill="#22d3ee" />
        <text x="14" y="9" fontSize="10" fill="var(--text-soft)">avg score</text>
        <circle cx="90" cy="6" r="3" fill="#10b981" />
        <text x="98" y="9" fontSize="10" fill="var(--text-soft)">pass rate %</text>
      </g>
    </svg>
  );
}
