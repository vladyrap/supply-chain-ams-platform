"use client";

// Muestra la estimación actual del escalation y, si hay un original distinto,
// el diff N1↔N2 con flechas y delta.

import type { TicketEstimatedResolution } from "@/types/estimation";
import TicketEstimateSummary from "../estimation/TicketEstimateSummary";

interface Props {
  current?: TicketEstimatedResolution | null;
  original?: TicketEstimatedResolution | null;
}

function deltaArrow(a: number, b: number): string {
  const diff = b - a;
  if (Math.abs(diff) < 0.1) return "→";
  return diff > 0 ? "↑" : "↓";
}

export default function EscalationEstimateDiff({ current, original }: Props) {
  if (!current) return null;
  const hasDiff = !!original && (
    original.totalMinHours !== current.totalMinHours ||
    original.totalMaxHours !== current.totalMaxHours ||
    original.confidence !== current.confidence ||
    original.complexity !== current.complexity
  );

  return (
    <div className="card">
      <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
        ⏱ Estimación de resolución
      </div>
      <TicketEstimateSummary
        estimate={current}
        title={hasDiff ? "ETA actual (ajustada por N2)" : "ETA estimada"}
      />

      {hasDiff && original && (
        <div style={{
          marginTop: 8, padding: 10, borderRadius: 6,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)",
          fontSize: 11.5, color: "var(--text-soft)",
        }}>
          <div style={{ fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}>↹ Cambio respecto a la estimación original N1</div>
          <table style={{ width: "100%", fontVariantNumeric: "tabular-nums" }}>
            <tbody>
              <tr>
                <td style={{ color: "var(--text-dim)", padding: "2px 0" }}>Horas mín</td>
                <td style={{ textAlign: "right" }}>{original.totalMinHours}h</td>
                <td style={{ textAlign: "center", color: "#fbbf24" }}>{deltaArrow(original.totalMinHours, current.totalMinHours)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{current.totalMinHours}h</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-dim)", padding: "2px 0" }}>Horas máx</td>
                <td style={{ textAlign: "right" }}>{original.totalMaxHours}h</td>
                <td style={{ textAlign: "center", color: "#fbbf24" }}>{deltaArrow(original.totalMaxHours, current.totalMaxHours)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{current.totalMaxHours}h</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-dim)", padding: "2px 0" }}>Confianza</td>
                <td style={{ textAlign: "right" }}>{original.confidence}</td>
                <td style={{ textAlign: "center" }}>{original.confidence === current.confidence ? "→" : "↹"}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{current.confidence}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-dim)", padding: "2px 0" }}>Complejidad</td>
                <td style={{ textAlign: "right" }}>{original.complexity}</td>
                <td style={{ textAlign: "center" }}>{original.complexity === current.complexity ? "→" : "↹"}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{current.complexity}</td>
              </tr>
            </tbody>
          </table>
          {current.adjustmentReason && (
            <div style={{ marginTop: 6, fontSize: 11, fontStyle: "italic" }}>
              <strong>Motivo:</strong> {current.adjustmentReason}
              {current.adjustedBy && <> · por <em>{current.adjustedBy}</em></>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
