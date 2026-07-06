"use client";

// Fila de un hallazgo Clean Core. Colapsada muestra severidad/objeto/módulo;
// expandida muestra problema, recomendación, referencia y selector de status.

import { useState } from "react";
import type { CleanCoreFinding, FindingStatus } from "@/lib/clean-core/types";
import {
  SEVERITY_LABELS, SEVERITY_COLORS, STATUS_LABELS, STATUS_COLORS,
} from "@/lib/clean-core/engine";
import { CLEAN_CORE_DIMENSIONS } from "@/lib/clean-core/dataset";
import { findingToTicketInput } from "@/lib/clean-core/report";
import { createTicket } from "@/services/tickets.api";

interface Props {
  finding: CleanCoreFinding;
  onStatus: (id: string, status: FindingStatus) => void;
}

const STATUS_OPTIONS: FindingStatus[] = ["open", "in_progress", "resolved", "accepted_risk"];

type TicketState = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; key: string } | { kind: "error"; msg: string };

function dimLabel(id: string): string {
  const d = CLEAN_CORE_DIMENSIONS.find((x) => x.id === id);
  return d ? `${d.icon} ${d.label}` : id;
}

export default function FindingRow({ finding, onStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState<TicketState>({ kind: "idle" });
  const sc = SEVERITY_COLORS[finding.severity];
  const stc = STATUS_COLORS[finding.status];
  const muted = finding.status === "resolved";

  async function createRemediationTicket() {
    setTicket({ kind: "loading" });
    const r = await createTicket(findingToTicketInput(finding));
    if ("success" in r && r.success) setTicket({ kind: "ok", key: r.ticket.key });
    else setTicket({ kind: "error", msg: "error" in r ? r.error : "no se pudo crear" });
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", opacity: muted ? 0.62 : 1 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer", background: "transparent",
          border: "none", padding: "11px 14px", display: "flex", alignItems: "center", gap: 12,
          borderLeft: `3px solid ${sc}`,
        }}
      >
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, color: sc,
          border: `1px solid ${sc}`, borderRadius: 4, padding: "1px 6px",
          textTransform: "uppercase", flexShrink: 0, minWidth: 54, textAlign: "center",
        }}>
          {SEVERITY_LABELS[finding.severity]}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", textDecoration: muted ? "line-through" : "none" }}>
            {finding.title}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{finding.object}</span>
            <span>· {finding.objectType}</span>
            <span>· {finding.sapModule}</span>
            {!finding.cloudReady && <span style={{ color: "#ff832b" }}>· ⚠ no cloud-ready</span>}
          </div>
        </div>

        <span style={{
          fontSize: 10, fontWeight: 700, color: stc, flexShrink: 0,
          padding: "2px 8px", borderRadius: 999,
          background: "color-mix(in srgb, currentColor 12%, transparent)",
        }}>
          {STATUS_LABELS[finding.status]}
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: 12, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase" }}>
            {dimLabel(finding.dimension)} · esfuerzo estimado {finding.effortHours}h
          </div>

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-soft)", marginBottom: 2 }}>Problema</div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.45 }}>{finding.problem}</div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>Remediación recomendada</div>
            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.45 }}>{finding.recommendation}</div>
          </div>

          {finding.reference && (
            <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
              📎 Referencia: <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{finding.reference}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
            <span style={{ fontSize: 10.5, color: "var(--text-dim)", marginRight: 2 }}>Cambiar estado:</span>
            {STATUS_OPTIONS.map((s) => {
              const activeS = finding.status === s;
              return (
                <button
                  key={s}
                  onClick={() => onStatus(finding.id, s)}
                  className={activeS ? "btn primary" : "btn ghost"}
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4 }}
                >
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
            <button
              onClick={createRemediationTicket}
              className="btn"
              disabled={ticket.kind === "loading"}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: "var(--accent-2, #0043ce)", color: "#fff", border: "none" }}
            >
              {ticket.kind === "loading" ? <><span className="spinner" /> Creando…</> : "🎫 Crear ticket de remediación"}
            </button>
            {ticket.kind === "ok" && <span style={{ fontSize: 11.5, color: "var(--ok)", fontWeight: 600 }}>✓ Ticket {ticket.key} creado</span>}
            {ticket.kind === "error" && <span style={{ fontSize: 11.5, color: "var(--error)" }}>⚠ {ticket.msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
