"use client";

// =============================================================================
// AmsIntelligenceSummaryCard — Card compacta del Intelligence Core (DH v0.9)
// =============================================================================
// Resumen unificado del análisis del ticket que combina:
//   - readiness score
//   - confianza global (promedio de todos los engines)
//   - ETA estimada
//   - decisión recomendada (NBA)
//   - escalation verdict (N2)
//   - quality risks + missing data
//
// NO duplica lógica — sólo renderiza el output de `analyzeTicket()`.
// Compact: max-height 280px, sin scroll interno necesario.
// Botón "Ver detalle" expande lista completa de missingData + reasoning.
// =============================================================================

import { useState } from "react";
import type { IntelligenceAnalysis } from "@/intelligence/types";

interface Props {
  analysis: IntelligenceAnalysis;
}

const VERDICT_COLORS: Record<string, string> = {
  ESCALATE_NOW: "#fa4d56",
  ESCALATE_SOON: "#f59e0b",
  WAIT_AND_SEE: "#4589ff",
  RESOLVE_AT_N1: "#10b981",
  INSUFFICIENT_DATA: "#64748b",
};

function confidenceColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#fa4d56";
}

export default function AmsIntelligenceSummaryCard({ analysis }: Props) {
  const [expanded, setExpanded] = useState(false);

  const confColor = confidenceColor(analysis.confidenceGlobal);
  const readinessColor = confidenceColor(analysis.readinessScore);
  const escVerdict = analysis.escalationRecommendation?.verdict;
  const escColor = escVerdict ? VERDICT_COLORS[escVerdict] ?? "#64748b" : "#64748b";

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${confColor}`,
      padding: 12,
      // Cap defensivo — la card NO debe empujar el TCC
      maxHeight: expanded ? 600 : 280,
      overflow: "hidden",
      transition: "max-height 0.2s ease",
    }}>
      {/* Header con score global */}
      <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--text-dim)" }}>
            ▸ AMS · INTELLIGENCE · SUMMARY
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>
            Análisis unificado del ticket
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: confColor, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {analysis.confidenceGlobal}
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/100</span>
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 1.4 }}>CONFIANZA</div>
        </div>
      </div>

      {/* Grid de 4 métricas principales */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
        marginBottom: 10,
      }}>
        {/* Readiness */}
        <Tile
          label="READINESS"
          value={`${analysis.readinessScore}/100`}
          color={readinessColor}
        />
        {/* ETA */}
        <Tile
          label="ETA"
          value={analysis.estimatedResolution
            ? `${analysis.estimatedResolution.minHours}-${analysis.estimatedResolution.maxHours}h`
            : "—"}
          color="#a855f7"
          hint={analysis.estimatedResolution?.confidence}
        />
        {/* NBA */}
        <Tile
          label="ACCIÓN"
          value={analysis.nextBestAction?.label ?? "—"}
          color="#4589ff"
          hint={analysis.nextBestAction?.confidence}
          small
        />
        {/* Escalación */}
        <Tile
          label="N2"
          value={escVerdict ?? "—"}
          color={escColor}
          hint={analysis.escalationRecommendation
            ? `urg ${analysis.escalationRecommendation.urgencyScore}`
            : undefined}
          small
        />
      </div>

      {/* Contexto detectado + customer response */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, fontSize: 11 }}>
        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 10, letterSpacing: 1.2, marginBottom: 2 }}>CONTEXTO SAP</div>
          <div style={{ color: "var(--text-soft)" }}>
            {analysis.detectedContext.module && <span><strong>{analysis.detectedContext.module}</strong> · </span>}
            {analysis.detectedContext.transaction && <span>{analysis.detectedContext.transaction} · </span>}
            {analysis.detectedContext.errorCode && <span style={{ color: "#fa4d56" }}>{analysis.detectedContext.errorCode}</span>}
            {!analysis.detectedContext.module && !analysis.detectedContext.transaction && (
              <span style={{ color: "var(--text-dim)" }}>sin contexto detectado</span>
            )}
          </div>
        </div>
        {analysis.customerResponseSuggestion && (
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: 10, letterSpacing: 1.2, marginBottom: 2 }}>RESPUESTA CLIENTE</div>
            <div style={{ color: "var(--text-soft)" }}>
              <strong>{analysis.customerResponseSuggestion.responseType}</strong> · score{" "}
              <span style={{ color: analysis.customerResponseSuggestion.qualityScore >= 60 ? "#10b981" : "#f59e0b" }}>
                {analysis.customerResponseSuggestion.qualityScore}/100
              </span>
              {!analysis.customerResponseSuggestion.canSend && (
                <span style={{ color: "#fa4d56" }}> · ⚠ bloqueada</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Risks / missing data */}
      {(analysis.qualityRisks.length > 0 || analysis.missingData.length > 0) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {analysis.qualityRisks.length > 0 && (
            <div style={{
              fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
              background: "rgba(250,77,86,0.10)", color: "#fa4d56",
              border: "1px solid rgba(250,77,86,0.35)",
            }}>
              ⚠ {analysis.qualityRisks.length} riesgo{analysis.qualityRisks.length === 1 ? "" : "s"}
            </div>
          )}
          {analysis.missingData.length > 0 && (
            <div style={{
              fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
              background: "rgba(241,194,27,0.10)", color: "#f1c21b",
              border: "1px solid rgba(241,194,27,0.35)",
            }}>
              📋 {analysis.missingData.length} dato{analysis.missingData.length === 1 ? "" : "s"} faltante{analysis.missingData.length === 1 ? "" : "s"}
            </div>
          )}
          {analysis.failedEngines.length > 0 && (
            <div style={{
              fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
              background: "rgba(100,116,139,0.15)", color: "var(--text-dim)",
            }}>
              {analysis.failedEngines.length} engine{analysis.failedEngines.length === 1 ? "" : "s"} no disponible{analysis.failedEngines.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      )}

      {/* Explicación */}
      <div style={{
        fontSize: 11, color: "var(--text-soft)",
        background: "rgba(15,23,42,0.35)", padding: 8, borderRadius: 4,
        lineHeight: 1.5,
      }}>
        {analysis.explanation}
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
          {analysis.nextBestAction?.reasoning && analysis.nextBestAction.reasoning.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
                RAZONAMIENTO ACCIÓN
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-soft)" }}>
                {analysis.nextBestAction.reasoning.slice(0, 5).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.missingData.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
                DATOS FALTANTES
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-soft)" }}>
                {analysis.missingData.slice(0, 8).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.qualityRisks.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
                RIESGOS DE CALIDAD
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#fca5a5" }}>
                {analysis.qualityRisks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.escalationRecommendation && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
                ESCALACIÓN N2
              </div>
              <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                {analysis.escalationRecommendation.summary}
                {analysis.escalationRecommendation.primarySpecialistName && (
                  <> · <strong>{analysis.escalationRecommendation.primarySpecialistName}</strong></>
                )}
              </div>
            </div>
          )}
          {analysis.failedEngines.length > 0 && (
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
              engines no disponibles: {analysis.failedEngines.join(", ")}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="btn ghost sm"
        style={{ marginTop: 8, fontSize: 11, padding: "3px 10px" }}
      >
        {expanded ? "▲ Ver menos" : "▼ Ver detalle"}
      </button>
    </div>
  );
}

function Tile({ label, value, color, hint, small }: {
  label: string; value: string | number; color: string; hint?: string; small?: boolean;
}) {
  return (
    <div style={{
      padding: 6,
      background: "rgba(15,23,42,0.45)",
      border: "1px solid var(--border-soft)",
      borderLeft: `2px solid ${color}`,
      borderRadius: 4,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 1.3 }}>{label}</div>
      <div style={{
        fontSize: small ? 11 : 14, fontWeight: 700, color: color,
        marginTop: 1, fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</div>
      {hint && (
        <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 1 }}>{hint}</div>
      )}
    </div>
  );
}
