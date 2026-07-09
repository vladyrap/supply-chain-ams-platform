"use client";

// Card de "Explicabilidad de ETA" — se monta JUNTO a TicketEstimateDetail.
// No reemplaza nada — agrega la vista de por qué se llegó a ese rango.

import { useMemo } from "react";
import type { Ticket } from "@/services/tickets.api";
import { buildEstimateExplanation } from "@/utils/estimate-explainability-engine";

interface Props {
  ticket: Ticket;
  onRecalculate?: () => void;
  onImproveEstimate?: () => void;
  onExport?: () => void;
}

const CATEGORY_ICON = {
  requirements: "🔧",
  context: "🌐",
  confidence: "🎯",
  knowledge: "📚",
  data: "📷",
} as const;

const CATEGORY_LABEL = {
  requirements: "Requirements",
  context: "Contexto",
  confidence: "Confianza",
  knowledge: "Conocimiento",
  data: "Datos / evidencia",
} as const;

export default function EstimateExplainabilityCard({
  ticket, onRecalculate, onImproveEstimate, onExport,
}: Props) {
  const explanation = useMemo(() => buildEstimateExplanation(ticket), [ticket]);

  if (!explanation) {
    return (
      <div className="lab-fb-block" style={{ borderLeft: "3px solid var(--border-soft)" }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Sin estimación todavía. Generá una para ver la explicabilidad.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderLeft: "3px solid #f1c21b" }}>
      <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="ticket-section-head" style={{ marginBottom: 0 }}>
          🔬 EXPLICABILIDAD DE LA ETA
        </div>
        <div className="row" style={{ gap: 6 }}>
          {onImproveEstimate && (
            <button className="btn ghost" onClick={onImproveEstimate} style={{ padding: "4px 10px", fontSize: 11 }}>
              ✎ Mejorar
            </button>
          )}
          {onRecalculate && (
            <button className="btn ghost" onClick={onRecalculate} style={{ padding: "4px 10px", fontSize: 11 }}>
              ↻ Recalcular
            </button>
          )}
          {onExport && (
            <button className="btn ghost" onClick={onExport} style={{ padding: "4px 10px", fontSize: 11 }}>
              ↓ Exportar
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="row" style={{ gap: 14, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
        <div><span style={{ color: "var(--text-dim)" }}>Rango:</span> <strong style={{ color: "#8a6d00", fontSize: 14 }}>{explanation.totalRangeLabel}</strong></div>
        <div><span style={{ color: "var(--text-dim)" }}>Confianza:</span> <strong>{explanation.confidence}</strong></div>
        <div><span style={{ color: "var(--text-dim)" }}>Complejidad:</span> <strong>{explanation.complexity}</strong></div>
        <div><span style={{ color: "var(--text-dim)" }}>Fuente:</span> <strong>{explanation.calculationSource}</strong></div>
      </div>

      {/* Dos columnas ↑ / ↓ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <FactorColumn
          title="Factores que aumentan la ETA"
          color="#fa4d56"
          arrow="↑"
          factors={explanation.increaseFactors}
        />
        <FactorColumn
          title="Factores que reducen la ETA"
          color="#10b981"
          arrow="↓"
          factors={explanation.decreaseFactors}
        />
      </div>

      {/* Fases — usa el mismo phaseBreakdown del estimate */}
      {explanation.phaseBreakdown.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="ticket-section-head" style={{ marginBottom: 6 }}>📋 FASES</div>
          <table style={{ width: "100%", fontSize: 11.5 }}>
            <tbody>
              {explanation.phaseBreakdown.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "3px 6px", color: "var(--text-dim)", width: 24 }}>{i + 1}</td>
                  <td style={{ padding: "3px 6px" }}>{p.name}</td>
                  <td style={{ padding: "3px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-soft)" }}>
                    {p.minHours}–{p.maxHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Datos faltantes destacados */}
      {explanation.missingData.length > 0 && (
        <div className="lab-fb-block" style={{ borderLeft: "3px solid #f1c21b", marginTop: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 11.5, color: "#8a6d00" }}>❓ DATOS FALTANTES ({explanation.missingData.length})</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--text-soft)" }}>
            {explanation.missingData.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {explanation.manuallyAdjusted && (
        <div className="alert warn" style={{ marginTop: 10, fontSize: 11.5 }}>
          ✎ <strong>Ajustado manualmente</strong> por {explanation.adjustedBy || "—"}: {explanation.adjustmentReason || "(sin razón)"}
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 8 }}>
        Última cálculo: {new Date(explanation.lastCalculatedAt).toLocaleString("es-CL")}
      </div>
    </div>
  );
}

function FactorColumn({ title, color, arrow, factors }:
  { title: string; color: string; arrow: string; factors: ReturnType<typeof buildEstimateExplanation> extends infer T
    ? T extends { increaseFactors: infer F } ? F : never : never })
{
  if (!factors || factors.length === 0) {
    return (
      <div className="lab-fb-block" style={{ borderLeft: `3px solid ${color}55` }}>
        <div style={{ fontWeight: 600, fontSize: 11.5, color }}>{arrow} {title}</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>—</div>
      </div>
    );
  }
  return (
    <div className="lab-fb-block" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ fontWeight: 600, fontSize: 11.5, color, marginBottom: 6 }}>{arrow} {title}</div>
      <div className="col" style={{ gap: 4 }}>
        {factors.map((f, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "16px 1fr auto", gap: 6,
            fontSize: 11.5, padding: "3px 6px",
            background: "rgba(15,23,42,0.4)", borderRadius: 3,
          }}>
            <span title={CATEGORY_LABEL[f.category]}>{CATEGORY_ICON[f.category]}</span>
            <span title={f.detail}>{f.label}</span>
            {f.impact && <span style={{ color: "var(--text-dim)", fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>{f.impact}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
