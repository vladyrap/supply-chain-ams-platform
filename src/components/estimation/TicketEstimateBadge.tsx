"use client";

// Badge compacto para celdas de tabla / filas de lista de tickets.
// Muestra rango horas + chip confianza. Cabe en ~120px.

import type { TicketEstimatedResolution } from "@/types/estimation";

interface Props {
  estimate?: TicketEstimatedResolution | null;
  size?: "sm" | "md";
}

function confColor(c?: string): string {
  if (c === "HIGH") return "#10b981";
  if (c === "LOW") return "#ef4444";
  return "#fbbf24";
}

export default function TicketEstimateBadge({ estimate, size = "sm" }: Props) {
  if (!estimate) {
    return (
      <span style={{
        display: "inline-flex", gap: 4, alignItems: "center",
        padding: size === "sm" ? "2px 6px" : "3px 8px",
        fontSize: size === "sm" ? 10.5 : 11.5,
        background: "rgba(100,116,139,0.15)",
        color: "var(--text-dim)",
        borderRadius: 4, border: "1px solid var(--border-soft)",
      }}>— ETA</span>
    );
  }
  const c = confColor(estimate.confidence);
  return (
    <span style={{
      display: "inline-flex", gap: 6, alignItems: "center",
      padding: size === "sm" ? "2px 6px" : "3px 10px",
      fontSize: size === "sm" ? 11 : 12,
      background: `${c}15`, color: c,
      borderRadius: 4, border: `1px solid ${c}55`,
      fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
    }} title={`Confianza ${estimate.confidence} · ${estimate.confidenceScore}/100 · Complejidad ${estimate.complexity}`}>
      ⏱ {estimate.totalMinHours}–{estimate.totalMaxHours}h
      {estimate.manuallyAdjusted && <span style={{ fontSize: 9, opacity: 0.7 }}>✎</span>}
    </span>
  );
}
