"use client";

// Vista completa del Contextual AMS Estimation Engine.
// Muestra los 11 bloques pedidos: contexto, ETA, escenarios, fases, casos
// similares, playbook, factores, confianza, missing data, recommendations,
// client response.

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import ContextScanCard from "./ContextScanCard";
import SimilarCasesCard from "./SimilarCasesCard";
import { estimateAmsResolutionContextually } from "@/utils/contextual-ams-estimation-engine";
import { findSimilarHistoricalCases } from "@/utils/historical-cases-matcher";
import { downloadContextualMarkdown, downloadContextualJson, buildEnrichedClientResponse } from "@/utils/contextual-export";
import type { ContextualEstimationInput, ContextualEstimationResult, ContextualAdjustment, SimilarHistoricalCase } from "@/types/estimation";

interface Props {
  /** Input pre-poblado (desde un ticket o desde el form manual del estimador) */
  input: ContextualEstimationInput;
  /** Si pasás `result` directo, no se recalcula */
  result?: ContextualEstimationResult;
  /** Callback al exportar la respuesta para el cliente */
  onExportClientResponse?: (markdown: string) => void;
  /** Callback al guardar la estimación (persistencia) */
  onSave?: (result: ContextualEstimationResult) => void;
  /** Callback al aplicar al ticket (sobrescribe estimación oficial) */
  onApplyToTicket?: (result: ContextualEstimationResult) => Promise<void> | void;
  /** Si está disponible la acción "aplicar al ticket" */
  canApplyToTicket?: boolean;
  /** Modo compact: oculta secciones avanzadas (para Ticket Command Center) */
  compact?: boolean;
}

/**
 * Calcula la estimación contextual al primer render (o usa la pasada por props).
 */
export default function ContextualEstimationView({
  input, result: resultProp, onExportClientResponse, onSave, onApplyToTicket, canApplyToTicket = false, compact = false,
}: Props) {
  // Si NO se pasa result, lo computamos. Si SÍ, lo usamos directo.
  // Cuando el user toca "Buscar casos similares" o "Recalcular con histórico"
  // sobreescribimos el state local.
  const initial = useMemo<ContextualEstimationResult>(() => {
    return resultProp ?? estimateAmsResolutionContextually(input);
  }, [resultProp, input]);
  const [result, setResult] = useState<ContextualEstimationResult>(initial);

  // Recalcular si cambia el input externamente (key change en parent)
  // No usamos efecto pq el useMemo arriba ya lo cubre en el initial render.

  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [extraCases, setExtraCases] = useState<SimilarHistoricalCase[] | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function copyClient() {
    try {
      await navigator.clipboard.writeText(result.clientResponseDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent */ }
  }

  // ── Acciones operativas del spec ────────────────────────────

  function searchMoreSimilar() {
    // Baja el threshold de similarity y devuelve top-6 en lugar de top-3
    const moreCases = findSimilarHistoricalCases(result.detectedContext, {
      topN: 6, minScore: 0.15, extraText: input.title,
    });
    setExtraCases(moreCases);
    notify(`✓ ${moreCases.length} casos similares encontrados (threshold reducido)`);
  }

  function recalculateWithHistory() {
    // Re-corre el motor con los mismos inputs — útil tras cambios externos
    // o cuando el dataset histórico se actualiza.
    const fresh = estimateAmsResolutionContextually(input);
    setResult(fresh);
    setExtraCases(null);
    notify("✓ Estimación recalculada con histórico actual");
  }

  function improveEstimation() {
    // Scroll a la sección de datos faltantes
    const el = document.getElementById("ctx-missing-data");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "#f59e0b22";
      setTimeout(() => { el.style.background = ""; }, 2000);
      notify("✓ Datos faltantes destacados — completalos y recalculá");
    } else {
      notify("Sin datos faltantes — la estimación ya está completa");
    }
  }

  function regenerateClientResponse() {
    const enriched = buildEnrichedClientResponse(result);
    setResult({ ...result, clientResponseDraft: enriched });
    notify("✓ Respuesta cliente regenerada (versión enriquecida)");
  }

  function exportMarkdown() {
    downloadContextualMarkdown(result);
    notify("✓ Markdown descargado");
  }

  function exportJson() {
    downloadContextualJson(result);
    notify("✓ JSON descargado");
  }

  async function applyToTicket() {
    if (!onApplyToTicket) return;
    setApplying(true);
    try {
      await onApplyToTicket(result);
      notify("✓ Estimación aplicada al ticket");
    } catch (e) {
      notify("✗ Error al aplicar: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setApplying(false);
    }
  }

  function save() {
    if (!onSave) return;
    onSave(result);
    notify("✓ Estimación guardada en histórico");
  }

  const conf = result.confidence;
  const confColor = conf === "HIGH" ? "#10b981" : conf === "LOW" ? "#ef4444" : "#f59e0b";
  const range = result.totalRange;

  // Group adjustments by direction
  const incAdj = result.contextualAdjustments.filter((a) => a.direction === "increase");
  const decAdj = result.contextualAdjustments.filter((a) => a.direction === "decrease");

  return (
    <div className="col" style={{ gap: 12 }}>
      {/* ── 0. Barra de acciones operativas ────────────────── */}
      <div className="card" style={{ padding: 10, background: "var(--bg-elev-2)" }}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn ghost sm" onClick={searchMoreSimilar}
            title="Bajar threshold y traer más casos del histórico" style={{ fontSize: 11 }}>
            🔍 Buscar más casos similares
          </button>
          <button className="btn ghost sm" onClick={recalculateWithHistory}
            title="Re-correr el motor con dataset histórico actual" style={{ fontSize: 11 }}>
            ↻ Recalcular con histórico
          </button>
          <button className="btn ghost sm" onClick={improveEstimation}
            title="Resaltar datos faltantes que mejorarían la precisión" style={{ fontSize: 11 }}>
            🎯 Mejorar estimación
          </button>
          <button className="btn ghost sm" onClick={regenerateClientResponse}
            title="Regenerar respuesta cliente enriquecida" style={{ fontSize: 11 }}>
            ✉ Generar respuesta cliente
          </button>
          <div style={{ width: 1, height: 18, background: "var(--border-soft)" }} />
          <button className="btn ghost sm" onClick={exportMarkdown}
            title="Descargar Markdown" style={{ fontSize: 11 }}>
            ↓ MD
          </button>
          <button className="btn ghost sm" onClick={exportJson}
            title="Descargar JSON" style={{ fontSize: 11 }}>
            ↓ JSON
          </button>
          {onSave && (
            <>
              <div style={{ width: 1, height: 18, background: "var(--border-soft)" }} />
              <button className="btn primary sm" onClick={save}
                title="Guardar estimación en histórico" style={{ fontSize: 11 }}>
                💾 Guardar
              </button>
            </>
          )}
          {canApplyToTicket && onApplyToTicket && (
            <>
              <div style={{ width: 1, height: 18, background: "var(--border-soft)" }} />
              <button
                className="btn primary sm"
                onClick={applyToTicket}
                disabled={applying}
                title="Sobrescribir la estimación oficial del ticket con esta contextual"
                style={{ fontSize: 11, background: "#10b981", borderColor: "#10b981" }}
              >
                {applying ? <><span className="spinner" /> aplicando…</> : "🎯 Aplicar al ticket"}
              </button>
            </>
          )}
          {toast && (
            <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-soft)", fontWeight: 500 }}>
              {toast}
            </div>
          )}
        </div>
      </div>

      {/* ── 1. Hero / ETA total ───────────────────────────── */}
      <div className="card" style={{ padding: 16, borderLeft: `4px solid ${confColor}` }}>
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>
              ETA · CONTEXTUAL AMS ENGINE v{result.engineVersion}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
              {range.minHours}h <span style={{ color: "var(--text-dim)", fontSize: 24 }}>–</span> {range.maxHours}h
            </div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 4 }}>
              Esperado <strong style={{ color: confColor }}>{range.expectedHours}h</strong>
              {" · "}{range.minBusinessDays}-{range.maxBusinessDays} días hábiles
            </div>
          </div>
          <div style={{
            padding: "8px 14px", borderRadius: 8, textAlign: "right",
            background: `${confColor}11`, border: `1px solid ${confColor}55`,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: confColor, fontWeight: 700 }}>CONFIANZA</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: confColor }}>{conf}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{result.confidenceScore}/100</div>
          </div>
        </div>

        {/* NBA */}
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 6,
          background: "var(--bg-elev-2)", border: "1px solid var(--border-soft)",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#22d3ee", marginBottom: 3 }}>
            NEXT BEST ACTION
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{result.nextBestAction.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 3 }}>
            {result.nextBestAction.description}
          </div>
        </div>
      </div>

      {/* ── 2. Contexto + casos similares lado a lado ───── */}
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10 }}>
        <ContextScanCard context={result.detectedContext} />
        <SimilarCasesCard cases={extraCases ?? result.similarCases} />
      </div>

      {/* ── 3. Escenarios optimista / esperado / pesimista ── */}
      <div className="card" style={{ padding: 14, borderLeft: "3px solid #f59e0b" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 10 }}>
          📊 ESCENARIOS PROBABILÍSTICOS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <ScenarioCard label="Optimista" hours={result.optimisticScenario.hours}
            color="#10b981" explanation={result.optimisticScenario.explanation}
            assumptions={result.optimisticScenario.assumptions} />
          <ScenarioCard label="Esperado" hours={result.expectedScenario.hours}
            color="#22d3ee" explanation={result.expectedScenario.explanation}
            assumptions={result.expectedScenario.assumptions} highlight />
          <ScenarioCard label="Pesimista" hours={result.pessimisticScenario.hours}
            color="#ef4444" explanation={result.pessimisticScenario.explanation}
            assumptions={result.pessimisticScenario.assumptions} />
        </div>
      </div>

      {/* ── 4. Playbook match ─────────────────────────────── */}
      {result.playbookMatch && (
        <div className="card" style={{ padding: 12, borderLeft: "3px solid #10b981", background: "#10b98108" }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#10b981" }}>📕 PLAYBOOK APLICABLE</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{result.playbookMatch.playbookTitle}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 3 }}>
                {result.playbookMatch.steps} pasos · ~{result.playbookMatch.estimatedMinutes}min ·{" "}
                match {(result.playbookMatch.matchScore * 100).toFixed(0)}%
              </div>
            </div>
            <span className="badge ok" style={{ fontSize: 10 }}>⚡ usar</span>
          </div>
        </div>
      )}

      {/* ── 5. Factores contextuales ──────────────────────── */}
      {!compact && (incAdj.length > 0 || decAdj.length > 0) && (
        <div className="card" style={{ padding: 14, borderLeft: "3px solid #a855f7" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 10 }}>
            ⚖ FACTORES CONTEXTUALES APLICADOS ({result.contextualAdjustments.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <AdjustmentList title="↑ Suben la estimación" adjs={incAdj} color="#ef4444" />
            <AdjustmentList title="↓ Bajan la estimación" adjs={decAdj} color="#10b981" />
          </div>
        </div>
      )}

      {/* ── 6. Fases ──────────────────────────────────────── */}
      {!compact && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 10 }}>
            🧭 FASES DE EJECUCIÓN ({result.phaseBreakdown.length})
          </div>
          <div className="col" style={{ gap: 6 }}>
            {result.phaseBreakdown.map((p) => (
              <div key={p.id} style={{
                padding: "8px 10px", borderRadius: 4,
                background: p.required ? "var(--bg-elev)" : "transparent",
                border: "1px solid var(--border-soft)",
                opacity: p.required ? 1 : 0.7,
              }}>
                <div className="row between" style={{ alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {p.order}. {p.name}
                    {!p.required && <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 400, marginLeft: 6 }}>(opcional)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", fontVariantNumeric: "tabular-nums" }}>
                    {p.minHours}h <span style={{ color: "var(--text-dim)" }}>– {p.expectedHours}h –</span> {p.maxHours}h
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 2 }}>
                  {p.reason} · <em>{p.ownerProfile}</em>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. Datos faltantes ────────────────────────────── */}
      {result.missingData.length > 0 && (
        <div id="ctx-missing-data" className="card" style={{ padding: 14, borderLeft: "3px solid #f59e0b", background: "#f59e0b08", transition: "background 1s" }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#f59e0b" }}>
              ⚠ DATOS FALTANTES ({result.missingData.length})
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
              Cerrar la banda con mayor precisión requiere esto
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {result.missingData.map((m, i) => (
              <li key={i} style={{ marginBottom: 3 }}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 8. Recomendaciones ────────────────────────────── */}
      {result.recommendations.length > 0 && (
        <div className="card" style={{ padding: 14, borderLeft: "3px solid #22d3ee" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 10 }}>
            💡 RECOMENDACIONES ({result.recommendations.length})
          </div>
          <div className="col" style={{ gap: 6 }}>
            {result.recommendations.map((r) => (
              <div key={r.id} style={{
                padding: "8px 10px", borderRadius: 4,
                background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
              }}>
                <div className="row between" style={{ alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: "#22d3ee", fontWeight: 700 }}>
                    impacto {r.expectedImpact}/5
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 2 }}>
                  {r.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 9. Assumptions + risks (collapsible) ──────────── */}
      {!compact && (
        <details className="card" style={{ padding: 12 }}>
          <summary style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", cursor: "pointer" }}>
            📋 SUPUESTOS Y RIESGOS ({result.assumptions.length + result.risks.length})
          </summary>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.5, marginBottom: 4 }}>SUPUESTOS</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5 }}>
                {result.assumptions.map((a, i) => <li key={i} style={{ marginBottom: 3 }}>{a}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.5, marginBottom: 4 }}>RIESGOS</div>
              {result.risks.length === 0 ? (
                <div style={{ fontSize: 11.5, color: "var(--text-soft)" }}>Sin riesgos destacados.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5 }}>
                  {result.risks.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
                </ul>
              )}
            </div>
          </div>
        </details>
      )}

      {/* ── 10. Client response draft ─────────────────────── */}
      <div className="card" style={{ padding: 14 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)" }}>
            ✉ RESPUESTA SUGERIDA AL CLIENTE
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn ghost sm"
              onClick={copyClient}
              style={{ fontSize: 11, padding: "3px 8px" }}
            >
              {copied ? "✓ copiado" : "📋 copiar"}
            </button>
            {onExportClientResponse && (
              <button
                className="btn ghost sm"
                onClick={() => onExportClientResponse(result.clientResponseDraft)}
                style={{ fontSize: 11, padding: "3px 8px" }}
              >
                ↓ exportar
              </button>
            )}
          </div>
        </div>
        <pre style={{
          margin: 0, padding: 10,
          background: "var(--bg-elev)", borderRadius: 4,
          fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontFamily: "inherit", color: "var(--text)",
        }}>
{result.clientResponseDraft}
        </pre>
      </div>

      {/* Notas internas debug */}
      {!compact && (
        <details>
          <summary style={{ fontSize: 10, color: "var(--text-dim)", cursor: "pointer", padding: "0 6px" }}>
            🐛 internal · debug
          </summary>
          <div style={{
            marginTop: 6, padding: 10, borderRadius: 4,
            background: "var(--bg-elev)", fontSize: 11, fontFamily: "ui-monospace, monospace",
            color: "var(--text-soft)",
          }}>
            {result.internalNotes}
          </div>
        </details>
      )}
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function ScenarioCard({
  label, hours, color, explanation, assumptions, highlight,
}: {
  label: string; hours: number; color: string;
  explanation: string; assumptions: string[]; highlight?: boolean;
}) {
  return (
    <div style={{
      padding: 12, borderRadius: 6,
      background: highlight ? `${color}11` : "var(--bg-elev)",
      border: highlight ? `2px solid ${color}` : `1px solid var(--border-soft)`,
    }}>
      <div style={{ fontSize: 10, color, letterSpacing: 1.5, fontWeight: 700 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color }}>{hours}h</div>
      <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.4 }}>
        {explanation}
      </div>
      <details style={{ marginTop: 6 }}>
        <summary style={{ fontSize: 10, color: "var(--text-dim)", cursor: "pointer" }}>
          supuestos ({assumptions.length})
        </summary>
        <ul style={{ margin: "4px 0 0 14px", padding: 0, fontSize: 10.5, color: "var(--text-soft)" }}>
          {assumptions.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </details>
    </div>
  );
}

function AdjustmentList({ title, adjs, color }: { title: string; adjs: ContextualAdjustment[]; color: string }) {
  if (adjs.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 10, color, letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>—</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 10, color, letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>{title}</div>
      <div className="col" style={{ gap: 4 }}>
        {adjs.map((a, i) => (
          <div key={i} style={{
            padding: "5px 8px", borderRadius: 3,
            background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
            fontSize: 11.5,
          }}>
            <div className="row between" style={{ alignItems: "baseline" }}>
              <span style={{ fontWeight: 600 }}>{a.factor}</span>
              <span style={{ color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ×{a.impact.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-soft)", marginTop: 1 }}>
              {a.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
