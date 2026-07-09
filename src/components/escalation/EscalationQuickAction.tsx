"use client";

// Botón reutilizable para escalar un incidente desde fuera del módulo
// (ej: /history, simulator). Refleja también el estado si ya está escalado.

import { useMemo, useState } from "react";
import { useEscalation } from "@/hooks/useEscalation";
import EscalationStatusBadge from "./EscalationStatusBadge";
import EscalationModal from "./EscalationModal";
import EscalationDetailModal from "./EscalationDetailModal";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";

interface Props {
  incident: IncidentSummary | IncidentDetail;
  actingUserId: string;
  canApprove?: boolean;
  variant?: "compact" | "full";
}

export default function EscalationQuickAction({ incident, actingUserId, canApprove = false, variant = "full" }: Props) {
  const escalation = useEscalation();
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const existing = useMemo(
    () => escalation.records.find((r) => r.incidentId === incident.id),
    [escalation.records, incident.id]
  );

  const candidate = useMemo(
    () => escalation.suggestEscalation(incident),
    [escalation, incident]
  );

  // Ya escalado: muestra badge + ver detalle
  if (existing) {
    return (
      <>
        <button
          className="btn ghost"
          onClick={() => setShowDetail(true)}
          style={{
            padding: variant === "compact" ? "2px 8px" : "4px 12px",
            fontSize: variant === "compact" ? 10.5 : 11.5,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <EscalationStatusBadge status={existing.status} size="sm" />
          <span>· {existing.escalationNumber}</span>
        </button>
        {showDetail && (
          <EscalationDetailModal
            record={existing}
            escalation={escalation}
            actingUserId={actingUserId}
            canApprove={canApprove}
            onClose={() => setShowDetail(false)}
          />
        )}
      </>
    );
  }

  // No escalado: botón de escalar
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn"
        style={{
          padding: variant === "compact" ? "2px 8px" : "4px 12px",
          fontSize: variant === "compact" ? 10.5 : 11.5,
          background: "linear-gradient(135deg, rgba(250,77,86,0.18), rgba(168,85,247,0.12))",
          borderColor: "rgba(250,77,86,0.45)",
          color: "#da1e28",
        }}
        title={candidate.matchedRule ? `Regla detectada: ${candidate.matchedRule.name}` : "Escalación manual"}
      >
        🚨 Escalar N2
        {variant === "full" && candidate.matchedRule && (
          <span style={{ fontSize: 10, color: "#8a6d00", marginLeft: 6 }}>
            · {candidate.severity}
          </span>
        )}
      </button>
      {showModal && (
        <EscalationModal
          incident={incident}
          escalation={escalation}
          createdByUserId={actingUserId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
