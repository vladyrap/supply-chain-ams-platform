"use client";

// Resumen de 3-4 líneas: horas, días, confianza, complejidad.
// Para meter en sidebars y headers de detalle.

import type { TicketEstimatedResolution } from "@/types/estimation";
import { CONFIDENCE_LABELS, COMPLEXITY_LABELS } from "@/types/estimation";

interface Props {
  estimate?: TicketEstimatedResolution | null;
  title?: string;
}

function confColor(c?: string): string {
  if (c === "HIGH") return "#10b981";
  if (c === "LOW") return "#ef4444";
  return "#fbbf24";
}

export default function TicketEstimateSummary({ estimate, title = "ETA estimada" }: Props) {
  if (!estimate) {
    return (
      <div className="lab-fb-block" style={{ borderLeft: "3px solid var(--border-soft)" }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-dim)" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>Sin estimación disponible.</div>
      </div>
    );
  }
  const c = confColor(estimate.confidence);
  return (
    <div className="lab-fb-block" style={{ borderLeft: `3px solid ${c}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: c }}>⏱ {title}</div>
        {estimate.manuallyAdjusted && (
          <span style={{ fontSize: 10, color: "#fbbf24", padding: "1px 6px", border: "1px solid #fbbf24", borderRadius: 3 }}>
            ajuste manual
          </span>
        )}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        {estimate.totalMinHours}–{estimate.totalMaxHours}h
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 400, marginLeft: 8 }}>
          ({estimate.totalMinBusinessDays}–{estimate.totalMaxBusinessDays} días hábiles)
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "var(--text-soft)" }}>
        <span>Confianza: <strong style={{ color: c }}>{CONFIDENCE_LABELS[estimate.confidence]}</strong> ({estimate.confidenceScore}/100)</span>
        <span>Complejidad: <strong>{COMPLEXITY_LABELS[estimate.complexity]}</strong></span>
        <span>SLA sugerido: <strong>{Math.round(estimate.suggestedSlaMinutes / 60)}h</strong></span>
      </div>
    </div>
  );
}
