"use client";

// Lista compacta de respuestas previas del ticket — clickeable, expandible,
// con acciones (re-abrir, marcar como enviada, eliminar).

import { useState } from "react";
import type { CustomerResponse, CustomerResponseStatus } from "@/types/customer-response";
import {
  RESPONSE_TYPE_LABELS, RESPONSE_TYPE_ICONS,
  STATUS_LABELS, AUDIENCE_LABELS,
} from "@/types/customer-response";
import CustomerResponsePreview from "./CustomerResponsePreview";
import QualityGateReport from "./QualityGateReport";

interface Props {
  responses: CustomerResponse[];
  onMarkSent?: (r: CustomerResponse) => void;
  onRemove?: (r: CustomerResponse) => void;
  onApprove?: (r: CustomerResponse) => void;
}

const STATUS_COLORS: Record<CustomerResponseStatus, string> = {
  DRAFT: "#64748b",
  REVIEWED: "#22d3ee",
  APPROVED: "#10b981",
  BLOCKED: "#ef4444",
  SENT_MANUAL: "#10b981",
  ARCHIVED: "#94a3b8",
};

export default function ResponseHistoryList({ responses, onMarkSent, onRemove, onApprove }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (responses.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--text-soft)" }}>
        Sin respuestas generadas para este ticket aún.
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 6 }}>
      {responses.map((r) => {
        const isOpen = expandedId === r.responseId;
        const statusColor = STATUS_COLORS[r.status];
        return (
          <div key={r.responseId} style={{
            padding: 10, borderRadius: 6,
            background: "var(--bg-elev)",
            border: `1px solid ${isOpen ? statusColor : "var(--border-soft)"}`,
            borderLeftWidth: 3, borderLeftColor: statusColor,
          }}>
            <div className="row between" style={{ alignItems: "flex-start", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4 }}>
                  {new Date(r.createdAt).toLocaleString("es-CL")} · {r.generatedBy}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {RESPONSE_TYPE_ICONS[r.responseType]} {RESPONSE_TYPE_LABELS[r.responseType]}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>
                  {r.summary}
                </div>
                <div className="row" style={{ gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 3,
                    background: `${statusColor}22`, color: statusColor, fontWeight: 600,
                  }}>
                    {STATUS_LABELS[r.status].toUpperCase()}
                  </span>
                  <span className="badge muted" style={{ fontSize: 10 }}>{AUDIENCE_LABELS[r.audience]}</span>
                  <span className="badge muted" style={{ fontSize: 10 }}>
                    quality {r.qualityGate.score}/100
                  </span>
                  {r.qualityGate.issues.length > 0 && (
                    <span className="badge warn" style={{ fontSize: 10 }}>
                      {r.qualityGate.issues.length} issues
                    </span>
                  )}
                </div>
              </div>
              <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                <button
                  className="btn ghost sm"
                  onClick={() => setExpandedId(isOpen ? null : r.responseId)}
                  style={{ fontSize: 10, padding: "3px 6px" }}
                >
                  {isOpen ? "▲" : "▼"}
                </button>
                {onApprove && r.status === "DRAFT" && r.canSendToClient && (
                  <button
                    className="btn ghost sm"
                    onClick={() => onApprove(r)}
                    title="Aprobar"
                    style={{ fontSize: 10, padding: "3px 6px", color: "#10b981" }}
                  >
                    ✓
                  </button>
                )}
                {onMarkSent && r.status !== "SENT_MANUAL" && (
                  <button
                    className="btn ghost sm"
                    onClick={() => onMarkSent(r)}
                    title="Marcar como enviada"
                    style={{ fontSize: 10, padding: "3px 6px" }}
                  >
                    📤
                  </button>
                )}
                {onRemove && (
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      if (window.confirm("¿Borrar esta respuesta?")) onRemove(r);
                    }}
                    title="Eliminar"
                    style={{ fontSize: 10, padding: "3px 6px", color: "#ef4444" }}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <CustomerResponsePreview response={r} />
                  <QualityGateReport report={r.qualityGate} compact />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
