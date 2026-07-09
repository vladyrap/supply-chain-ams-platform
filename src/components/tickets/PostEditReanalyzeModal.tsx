"use client";

// =============================================================================
// PostEditReanalyzeModal — Tras una edición con campos críticos, ofrecer reanalyze
// =============================================================================
// TCC v0.12. Solo se muestra cuando `detectCriticalChanges()` retorna
// `criticalChanged=true`. Para edits cosméticos pasa silencioso.
// =============================================================================

import { useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import type { CriticalChangeReport } from "@/intelligence/critical-fields-detector";

interface Props {
  open: boolean;
  report: CriticalChangeReport;
  onClose: () => void;
  onReanalyze: () => Promise<void>;
  onSkip: () => void;
}

export default function PostEditReanalyzeModal({
  open, report, onClose, onReanalyze, onSkip,
}: Props) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function handleReanalyze() {
    setBusy(true);
    try {
      await onReanalyze();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal open={open} onClose={onClose} maxWidth={520} contentClassName="card">
      <div style={{ padding: 18 }}>
        <div className="ticket-section-head" style={{ color: "#b45309" }}>
          ⚠ DATOS CRÍTICOS MODIFICADOS
        </div>
        <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 8, lineHeight: 1.5 }}>
          Cambiaron campos que afectan el diagnóstico del Agente AMS.
          ¿Querés reanalizar ahora con los datos nuevos?
        </p>

        <div style={{
          margin: "12px 0", padding: 10,
          background: "rgba(245,158,11,0.10)",
          border: "1px solid rgba(245,158,11,0.30)",
          borderRadius: 4, fontSize: 12,
        }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
            CAMPOS CRÍTICOS CAMBIADOS
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#b45309" }}>
            {report.criticalFieldsChanged.map((f) => <li key={f}><strong>{f}</strong></li>)}
          </ul>
          {report.cosmeticFieldsChanged.length > 0 && (
            <>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.4, marginTop: 8, marginBottom: 4 }}>
                CAMPOS COSMÉTICOS (no afectan análisis)
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-soft)" }}>
                {report.cosmeticFieldsChanged.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </>
          )}
        </div>

        <div className="row between" style={{ gap: 8, alignItems: "center" }}>
          <button
            className="btn ghost"
            onClick={() => { onSkip(); onClose(); }}
            disabled={busy}
          >
            Guardar sin reanalizar
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              await handleReanalyze();
              onClose();
            }}
            disabled={busy}
            style={{ background: "linear-gradient(135deg, #4589ff, #6366f1)" }}
          >
            {busy ? <><span className="spinner" /> reanalizando…</> : "↻ Reanalizar ahora"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
