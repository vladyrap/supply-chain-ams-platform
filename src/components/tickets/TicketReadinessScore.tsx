"use client";

// Card "Ticket Readiness Score" — score 0-100 por ticket.
// Lee de ticket-readiness-engine. Botones de acción hacen scroll a la sección
// del Command Center que arregla el criterio faltante.

import { useMemo } from "react";
import type { Ticket } from "@/services/tickets.api";
import {
  calculateTicketReadiness, READINESS_COLORS, READINESS_LABELS,
} from "@/utils/ticket-readiness-engine";

interface Props {
  ticket: Ticket;
  /** Callback opcional cuando se clickea recalcular */
  onRecalculate?: () => void;
}

function scrollToSection(targetId?: string) {
  if (!targetId || typeof window === "undefined") return;
  const el = document.getElementById(targetId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.style.transition = "outline 1s ease";
    el.style.outline = "2px solid #f1c21b";
    setTimeout(() => { el.style.outline = "none"; }, 1500);
  }
}

export default function TicketReadinessScore({ ticket, onRecalculate }: Props) {
  const r = useMemo(() => calculateTicketReadiness(ticket), [ticket]);
  const color = READINESS_COLORS[r.status];

  // Sub-listas
  const missingCriteria = r.criteria.filter((c) => !c.satisfied);

  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>
            ▸ TICKET READINESS
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
            {r.score}<span style={{ fontSize: 14, color: "var(--text-dim)" }}>/100</span>
          </div>
          <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: -2 }}>
            {READINESS_LABELS[r.status]} · {r.completedItems.length}/{r.criteria.length} criterios
          </div>
        </div>
        {onRecalculate && (
          <button onClick={onRecalculate} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>
            ↻ recalcular
          </button>
        )}
      </div>

      {/* Barra progreso */}
      <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${r.score}%`, height: "100%", background: color, transition: "width 300ms ease" }} />
      </div>

      {/* Faltantes con botones scroll */}
      {missingCriteria.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 6 }}>
            FALTA COMPLETAR ({missingCriteria.length})
          </div>
          <div className="col" style={{ gap: 4 }}>
            {missingCriteria.map((c) => (
              <button
                key={c.id}
                onClick={() => scrollToSection(c.scrollTargetId)}
                className="btn ghost"
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8,
                  textAlign: "left", padding: "6px 10px", fontSize: 11.5,
                  borderLeft: `3px solid ${color}55`,
                }}
                title={c.fixHint}
              >
                <span><strong>{c.label}</strong>
                  {c.fixHint && <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontWeight: 400, marginTop: 2 }}>{c.fixHint}</div>}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 10, alignSelf: "center" }}>+{c.points}pt</span>
                <span style={{ color: "#f1c21b", fontSize: 14, alignSelf: "center" }}>↗</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completados (resumen) */}
      {r.completedItems.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)" }}>
          ✓ <strong>Completado:</strong> {r.completedItems.join(" · ")}
        </div>
      )}

      {r.status === "READY" && (
        <div className="alert ok" style={{ marginTop: 8, fontSize: 12 }}>
          ✓ Ticket listo para resolver. El equipo AMS tiene todo lo necesario.
        </div>
      )}
    </div>
  );
}
