"use client";

// Timeline horizontal de fases. Cada fase es una barra proporcional a sus
// horas máximas, color por status, tooltip con detalle.

import type { TicketEstimatedResolution } from "@/types/estimation";
import { PROFILE_LABELS } from "@/types/estimation";

interface Props {
  estimate?: TicketEstimatedResolution | null;
}

function statusColor(status?: string): string {
  if (status === "done") return "#10b981";
  if (status === "in_progress") return "#22d3ee";
  if (status === "skipped") return "#64748b";
  return "#a855f7";
}

export default function TicketEstimateTimeline({ estimate }: Props) {
  if (!estimate || estimate.phaseBreakdown.length === 0) return null;
  const total = estimate.phaseBreakdown.reduce((s, p) => s + p.maxHours, 0) || 1;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--text-dim)", letterSpacing: 2, marginBottom: 6 }}>
        TIMELINE DE FASES · {estimate.phaseBreakdown.length} fases · {total.toFixed(1)}h techo
      </div>
      <div style={{
        display: "flex", height: 32, borderRadius: 4, overflow: "hidden",
        border: "1px solid var(--border-soft)", background: "rgba(15,23,42,0.5)",
      }}>
        {estimate.phaseBreakdown.map((p, i) => {
          const w = (p.maxHours / total) * 100;
          const c = statusColor(p.status);
          return (
            <div key={p.id}
              title={`${i + 1}. ${p.name}\n${p.minHours}h–${p.maxHours}h · ${PROFILE_LABELS[p.ownerProfile] ?? p.ownerProfile}\n${p.description}`}
              style={{
                width: `${w}%`,
                background: `linear-gradient(180deg, ${c}25, ${c}40)`,
                borderRight: "1px solid rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: c, fontWeight: 600,
                minWidth: 18, cursor: "default",
              }}>
              {w > 6 && (i + 1)}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-dim)" }}>
        <span>inicio</span>
        <span>{estimate.totalMaxBusinessDays} días hábiles (techo)</span>
      </div>
    </div>
  );
}
