"use client";

// =============================================================================
// QualityEvaluationsCard — resumen compacto de evaluaciones de un ticket
// =============================================================================
// Reemplaza la <ul> sin tope que renderizaba 1000 evaluaciones repetidas en
// el Ticket Command Center (sección 12).
//
// Reglas:
//   - Por defecto muestra resumen agregado + últimas 3 evaluaciones.
//   - "Ver más" → muestra hasta 20 con scroll interno (max-height).
//   - Si hay duplicados, ofrece botón "Compactar duplicados (demo)".
//   - La card NUNCA renderiza más de 20 filas, sin importar cuántas existan.
//   - La card tiene altura acotada → no empuja el layout del TCC.
// =============================================================================

import { useMemo, useState } from "react";
import type { AgentEvaluation, HallucinationRiskLevel } from "@/types/ams-modules";
import { RISK_COLORS } from "@/types/ams-modules";
import {
  getQualityEvaluatorSummary, getVisibleQualityEvaluations,
} from "@/utils/quality-evaluator-helpers";
import { AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  evaluations: AgentEvaluation[];
  /**
   * Callback opcional para compactar duplicados. Sólo se muestra el botón
   * "Compactar duplicados" si esta prop está presente Y hay duplicados.
   * El handler recibe las evaluaciones únicas a persistir.
   */
  onCompactDuplicates?: () => void;
  /** Si true, muestra un mensaje "Sin evaluaciones aún" cuando length=0. */
  showEmptyState?: boolean;
}

const RISK_LABEL: Record<HallucinationRiskLevel, string> = {
  LOW: "BAJO", MEDIUM: "MEDIO", HIGH: "ALTO",
};

export default function QualityEvaluationsCard({
  evaluations, onCompactDuplicates, showEmptyState = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // Resumen agregado — recalcula sólo si cambian las evaluaciones
  const summary = useMemo(
    () => getQualityEvaluatorSummary(evaluations, expanded ? 20 : 3),
    [evaluations, expanded],
  );

  // Lista visible — cap defensivo, NUNCA más de 20 filas en el DOM
  const visible = useMemo(
    () => getVisibleQualityEvaluations(evaluations, expanded ? 20 : 3),
    [evaluations, expanded],
  );

  if (evaluations.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div style={{ fontSize: 11.5, color: "var(--text-dim)", padding: "6px 0" }}>
        Sin evaluaciones para este ticket todavía.
      </div>
    );
  }

  const riskColor = summary.dominantRisk ? RISK_COLORS[summary.dominantRisk] : "#64748b";
  const showCompactBtn = !!onCompactDuplicates && summary.duplicatesFound > 0;

  return (
    <div style={{
      marginTop: 8,
      padding: 10,
      borderRadius: 6,
      background: "rgba(15, 23, 42, 0.35)",
      border: "1px solid var(--border-soft)",
      borderLeft: `3px solid ${riskColor}`,
      // Cap defensivo: la card no puede crecer más de 360px de alto, scroll interno
      maxHeight: 360,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ── Resumen ejecutivo ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1c21b", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {summary.averageScore.toFixed(1)}
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>/5</span>
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 1.4, marginTop: 2 }}>SCORE</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-soft)", display: "grid", gap: 2 }}>
          <div>Precisión <strong>{summary.averagePrecision.toFixed(1)}</strong> · Utilidad <strong>{summary.averageUtility.toFixed(1)}</strong></div>
          <div>Claridad <strong>{summary.averageClarity.toFixed(1)}</strong> · Completitud <strong>{summary.averageCompleteness.toFixed(1)}</strong></div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10.5 }}>
          <div style={{ color: "var(--text-dim)", letterSpacing: 1.2 }}>EVALUACIONES</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
            {summary.totalCount}
          </div>
          {summary.dominantRisk && (
            <div style={{
              fontSize: 9.5, color: riskColor, fontWeight: 600, marginTop: 2,
            }}>
              riesgo {RISK_LABEL[summary.dominantRisk]}
            </div>
          )}
        </div>
      </div>

      {summary.duplicatesFound > 0 && (
        <div style={{
          marginTop: 6, padding: "4px 8px", fontSize: 10.5,
          background: "rgba(241,194,27, 0.10)", color: "#f1c21b",
          border: "1px solid rgba(241,194,27, 0.35)", borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          flexShrink: 0,
        }}>
          <span><AlertTriangle size={14} /> {summary.duplicatesFound} duplicad{summary.duplicatesFound === 1 ? "a" : "as"} detectada{summary.duplicatesFound === 1 ? "" : "s"}</span>
          {showCompactBtn && (
            <button
              onClick={onCompactDuplicates}
              className="btn ghost sm"
              style={{ fontSize: 10, padding: "2px 6px", color: "#f1c21b", borderColor: "#f1c21b55" }}
            >
              Compactar
            </button>
          )}
        </div>
      )}

      {/* ── Lista visible (max 3 / max 20) ─────────────────────────── */}
      <div style={{
        marginTop: 8,
        flex: 1,
        minHeight: 0,
        overflowY: expanded ? "auto" : "hidden",
        // Cuando expandido el scroll interno propio acota a ~220px efectivos
        maxHeight: expanded ? 220 : "none",
      }}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
          ÚLTIMAS {visible.length} {expanded && summary.totalCount > 20 && <>(de {summary.totalCount} · capped a 20)</>}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "var(--text-soft)", display: "flex", flexDirection: "column", gap: 2 }}>
          {visible.map((ev) => (
            <li key={ev.id}>
              Precisión <strong>{ev.accuracyScore}</strong>/5 ·
              Utilidad <strong>{ev.usefulnessScore}</strong>/5 ·
              Claridad <strong>{ev.clarityScore}</strong>/5 ·
              Riesgo <span style={{ color: RISK_COLORS[ev.hallucinationRisk], fontWeight: 600 }}>
                {ev.hallucinationRisk}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Toggle ver más / ver menos ─────────────────────────────── */}
      {summary.totalCount > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="btn ghost"
          style={{ marginTop: 8, fontSize: 11, padding: "4px 10px", alignSelf: "flex-start", flexShrink: 0 }}
        >
          {expanded ? <><ChevronUp size={14} /> Ver menos</> : <><ChevronDown size={14} /> Ver más ({Math.min(20, summary.totalCount)})</>}
        </button>
      )}
    </div>
  );
}
