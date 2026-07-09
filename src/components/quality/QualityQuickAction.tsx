"use client";

// Botón "Evaluar respuesta" reutilizable desde el TicketCommandCenter.
// Patrón espejo de EscalationQuickAction.
//
// Solo se habilita si el ticket tiene `response` (i.e. el agente ya respondió).
// Reutiliza EvaluationForm + useQualityEvaluator().createEvaluation().

import { useMemo, useState } from "react";
import { useQualityEvaluator } from "@/hooks/useQualityEvaluator";
import EvaluationForm from "./EvaluationForm";
import type { IncidentSummary } from "@/services/agent.api";
import type { AgentEvaluation } from "@/types/ams-modules";
import { Award } from "lucide-react";

interface Props {
  /** Incidente "compatible" — puede venir del adapter ticketToIncidentLike() */
  incident: IncidentSummary;
  variant?: "compact" | "full";
  onSaved?: (ev: AgentEvaluation) => void;
}

export default function QualityQuickAction({ incident, variant = "full", onSaved }: Props) {
  const quality = useQualityEvaluator();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ¿Ya hay evaluación de este incidente/ticket?
  const existing = useMemo(
    () => quality.evaluations.find((e) => e.incidentId === incident.id),
    [quality.evaluations, incident.id]
  );

  const hasResponse = !!incident.response;

  function handleSaved(input: Omit<AgentEvaluation, "id" | "createdAt">) {
    const created = quality.createEvaluation(input);
    onSaved?.(created);
    setOpen(false);
    setToast(`✓ Evaluación guardada para ${incident.id}`);
    setTimeout(() => setToast(null), 4000);
  }

  // Estado: ya evaluado → badge resumido
  if (existing) {
    const overall = ((existing.accuracyScore + existing.usefulnessScore +
                     existing.clarityScore + existing.completenessScore) / 4).toFixed(1);
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn ghost"
        style={{
          padding: variant === "compact" ? "3px 9px" : "4px 12px",
          fontSize: variant === "compact" ? 11 : 11.5,
          color: "#f1c21b",
        }}
        title={`Click para re-abrir evaluación: ${overall}/5`}
      >
        <Award size={14} /> {overall}/5
      </button>
    );
  }

  if (!hasResponse) {
    return (
      <button
        disabled
        className="btn ghost"
        style={{
          padding: variant === "compact" ? "3px 9px" : "4px 12px",
          fontSize: variant === "compact" ? 11 : 11.5, opacity: 0.5, cursor: "not-allowed",
        }}
        title="Clasificá primero el ticket con el Agente AMS para tener una respuesta evaluable"
      >
        <Award size={14} /> Evaluar (sin respuesta)
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={variant === "compact" ? "btn ghost" : "btn primary"}
        style={variant === "compact"
          ? { padding: "3px 9px", fontSize: 11 }
          : { background: "linear-gradient(135deg, #f1c21b, #f59e0b)", borderColor: "#f1c21b", color: "#0b1220" }}
      >
        <Award size={14} /> {variant === "compact" ? "evaluar" : "Evaluar respuesta"}
      </button>

      {open && (
        <EvaluationForm
          incident={incident}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9001,
          padding: "10px 16px", background: "rgba(241,194,27,0.18)",
          border: "1px solid rgba(241,194,27,0.5)", color: "#f1c21b",
          borderRadius: 8, fontSize: 12.5, fontWeight: 600,
        }}>{toast}</div>
      )}
    </>
  );
}
