"use client";

import { useState } from "react";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import IncidentToKnowledgeWizard from "./IncidentToKnowledgeWizard";

interface Props {
  incident: IncidentSummary | IncidentDetail;
  /** estilo compacto vs full */
  variant?: "compact" | "full";
  /** callback opcional cuando se guarda */
  onSaved?: (msg: string) => void;
}

/**
 * Botón "Convertir en conocimiento" reutilizable.
 * Variant compact: solo botón pequeño.
 * Variant full: botón + label completo.
 */
export default function KnowledgeQuickActions({ incident, variant = "compact", onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handleSaved(msg: string) {
    setToast(msg);
    onSaved?.(msg);
    setTimeout(() => setToast(null), 4000);
  }

  if (variant === "compact") {
    return (
      <>
        <button onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="btn ghost"
          title="Convertir incidente en conocimiento del agente"
          style={{ padding: "3px 9px", fontSize: 11 }}>
          🎓 → conocimiento
        </button>
        {open && (
          <IncidentToKnowledgeWizard
            incident={incident}
            onClose={() => setOpen(false)}
            onSaved={handleSaved}
          />
        )}
        {toast && (
          <div style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 9001,
            padding: "10px 16px", background: "rgba(16,185,129,0.18)",
            border: "1px solid rgba(16,185,129,0.5)", color: "#34d399",
            borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
          }}>
            {toast}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="btn primary"
        style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7" }}>
        🎓 Convertir incidente en conocimiento
      </button>
      {open && (
        <IncidentToKnowledgeWizard
          incident={incident}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9001,
          padding: "10px 16px", background: "rgba(16,185,129,0.18)",
          border: "1px solid rgba(16,185,129,0.5)", color: "#34d399",
          borderRadius: 8, fontSize: 12.5, fontWeight: 600,
        }}>{toast}</div>
      )}
    </>
  );
}
