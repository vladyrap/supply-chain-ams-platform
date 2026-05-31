"use client";

import { useState } from "react";
import type { UseEscalation } from "@/hooks/useEscalation";
import type { EscalationRecord, EscalationStatus } from "@/types/escalation";
import EscalationStatusBadge from "./EscalationStatusBadge";
import ItsmTicketPreview from "./ItsmTicketPreview";
import EscalationEstimateDiff from "./EscalationEstimateDiff";

interface Props {
  record: EscalationRecord;
  escalation: UseEscalation;
  actingUserId: string;
  canApprove: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: EscalationStatus[] = [
  "ESCALATED", "ASSIGNED_TO_N2", "IN_PROGRESS_N2",
  "RESOLVED_BY_N2", "RETURNED_TO_N1", "CANCELLED",
];

export default function EscalationDetailModal({ record, escalation, actingUserId, canApprove, onClose }: Props) {
  const [note, setNote] = useState("");

  function approve() {
    escalation.approveEscalation(record.id, actingUserId);
  }
  function reject() {
    escalation.rejectEscalation(record.id, actingUserId, note || undefined);
  }
  function changeStatus(s: EscalationStatus) {
    escalation.updateEscalationStatus(record.id, s, actingUserId, note || undefined);
    setNote("");
  }

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              ESCALATION · DETALLE
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {record.escalationNumber} · Incidente {record.incidentId}
            </h2>
            <div style={{ marginTop: 4 }}>
              <EscalationStatusBadge status={record.status} />
              {record.externalTicketId && (
                <a href={record.externalTicketUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, marginLeft: 10, color: "#7dd3fc" }}>
                  ↗ {record.externalTicketId}
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <div className="col" style={{ gap: 12 }}>
              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Motivo
                </div>
                <div style={{ fontSize: 13 }}>{record.reason}</div>
              </div>

              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Resumen técnico (N2)
                </div>
                <pre style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: 12, whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
{record.summary}
                </pre>
              </div>

              {record.clientSummary && (
                <div className="card">
                  <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                    Mensaje al cliente
                  </div>
                  <pre style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: 12, whiteSpace: "pre-wrap", color: "#fef3c7" }}>
{record.clientSummary}
                  </pre>
                </div>
              )}

              <ItsmTicketPreview payload={record.payload} />

              {/* Autoestimación + diff N1↔N2 si fue ajustada */}
              {record.estimatedResolution && (
                <EscalationEstimateDiff
                  current={record.estimatedResolution}
                  original={record.estimatedResolutionOriginal}
                />
              )}
            </div>

            <div className="col" style={{ gap: 12 }}>
              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Asignación
                </div>
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <tbody>
                    <tr><td style={{ color: "var(--text-dim)" }}>Responsable</td><td style={{ textAlign: "right", fontWeight: 600 }}>{record.assignedToName || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Equipo</td><td style={{ textAlign: "right" }}>{record.assignedTeam || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Canal</td><td style={{ textAlign: "right" }}>{record.channel}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>SLA objetivo</td><td style={{ textAlign: "right" }}>{new Date(record.slaTarget).toLocaleString()}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>SLA (min)</td><td style={{ textAlign: "right" }}>{record.slaMinutes}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Modo</td><td style={{ textAlign: "right" }}>{record.mode}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Creado por</td><td style={{ textAlign: "right" }}>{record.createdBy}</td></tr>
                    {record.approvedBy && <tr><td style={{ color: "var(--text-dim)" }}>Aprobado por</td><td style={{ textAlign: "right" }}>{record.approvedBy}</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Timeline de eventos
                </div>
                <div className="col" style={{ gap: 4 }}>
                  {record.events.map((e, i) => (
                    <div key={i} style={{ fontSize: 11.5, paddingLeft: 10, borderLeft: "2px solid rgba(34,211,238,0.4)" }}>
                      <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#7dd3fc" }}>
                        {e.type}
                      </div>
                      <div style={{ color: "var(--text-soft)" }}>{new Date(e.at).toLocaleString()} · {e.by}</div>
                      {e.note && <div style={{ color: "var(--text-dim)", fontStyle: "italic" }}>{e.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="tc-modal-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <input
            placeholder="Nota opcional para el evento…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%" }}
          />
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {record.status === "REVIEW_REQUIRED" && canApprove && (
              <>
                <button className="btn" style={{ borderColor: "rgba(239,68,68,0.5)", color: "#fca5a5" }} onClick={reject}>✕ Rechazar</button>
                <button className="btn primary" onClick={approve}>✓ Aprobar</button>
              </>
            )}
            <select onChange={(e) => { if (e.target.value) changeStatus(e.target.value as EscalationStatus); e.currentTarget.value = ""; }} defaultValue="">
              <option value="">cambiar estado…</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
