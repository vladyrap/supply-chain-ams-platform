"use client";

// =============================================================================
// N1MetricsTile — Tile compacto para dashboard con métricas N1
// =============================================================================
// Muestra:
//   - % tickets con readiness >= 70
//   - % resueltos por N1
//   - % escalados N2
//   - top módulos con readiness bajo
//   - top datos faltantes
//
// Pensado para insertar en el dashboard. NO requiere backend extra — calcula
// sobre tickets[] que ya carga el dashboard.
// =============================================================================

import { useMemo } from "react";
import type { Ticket } from "@/services/tickets.api";
import { computeN1Metrics } from "@/utils/n1-metrics";
import { useTicketAudit } from "@/hooks/useTicketAudit";

interface Props {
  tickets: Ticket[];
}

function colorForPct(pct: number, goodThreshold = 70): string {
  if (pct >= goodThreshold) return "#10b981";
  if (pct >= 40) return "#f1c21b";
  return "#fa4d56";
}

export default function N1MetricsTile({ tickets }: Props) {
  const audit = useTicketAudit();
  const metrics = useMemo(
    () => computeN1Metrics(tickets, audit.events),
    [tickets, audit.events],
  );

  if (metrics.totalTickets === 0) return null;

  return (
    <div className="card" style={{ padding: 12, borderLeft: "3px solid #10b981" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 8 }}>
        ▸ N1 · GUIDED INTAKE · MÉTRICAS
      </div>

      {/* 3 KPIs principales */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10,
      }}>
        <KpiTile
          label="READINESS ≥70"
          value={`${metrics.ticketsWithGoodReadinessPct}%`}
          hint={`${metrics.ticketsWithGoodReadiness}/${metrics.totalTickets}`}
          color={colorForPct(metrics.ticketsWithGoodReadinessPct)} />
        <KpiTile
          label="RESUELTOS N1"
          value={`${metrics.ticketsResolvedByN1Pct}%`}
          hint={`${metrics.ticketsResolvedByN1}/${metrics.totalTickets}`}
          color={colorForPct(metrics.ticketsResolvedByN1Pct, 50)} />
        <KpiTile
          label="ESCALADOS N2"
          value={`${metrics.ticketsEscalatedToN2Pct}%`}
          hint={`${metrics.ticketsEscalatedToN2}/${metrics.totalTickets}`}
          color={metrics.ticketsEscalatedToN2Pct < 30 ? "#10b981"
               : metrics.ticketsEscalatedToN2Pct < 60 ? "#f1c21b" : "#fa4d56"} />
      </div>

      {/* Módulos con readiness bajo */}
      {metrics.topIncompleteModules.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
            MÓDULOS CON TICKETS INCOMPLETOS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {metrics.topIncompleteModules.map((m) => (
              <div key={m.module} style={{
                padding: "3px 8px", fontSize: 10.5, borderRadius: 3,
                background: "rgba(250,77,86,0.12)", color: "#fca5a5",
                border: "1px solid rgba(250,77,86,0.25)",
              }}>
                <strong>{m.module}</strong> · avg {m.avgReadiness}/100 · {m.count} tickets
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top datos faltantes */}
      {metrics.topMissingData.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
            DATOS FALTANTES MÁS FRECUENTES
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-soft)" }}>
            {metrics.topMissingData.slice(0, 3).map((d) => (
              <li key={d.item}>{d.item} <span style={{ color: "var(--text-dim)" }}>({d.count} tickets)</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value, hint, color }: { label: string; value: string; hint?: string; color: string }) {
  return (
    <div style={{
      padding: 8, background: "rgba(15,23,42,0.45)",
      border: "1px solid var(--border-soft)", borderLeft: `2px solid ${color}`,
      borderRadius: 4,
    }}>
      <div style={{ fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 1.3 }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 700, color, marginTop: 2,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      {hint && <div style={{ fontSize: 9.5, color: "var(--text-dim)", marginTop: 1 }}>{hint}</div>}
    </div>
  );
}
