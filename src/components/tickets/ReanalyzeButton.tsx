"use client";

// =============================================================================
// ReanalyzeButton — Botón manual de reanálisis con Agente AMS
// =============================================================================

import { useState } from "react";
import type { TicketIntelligence } from "@/types/ticket-intelligence";

interface Props {
  intelligence?: TicketIntelligence | null;
  onReanalyze: () => Promise<void>;
  /** True si hay datos nuevos sin reanalizar. */
  hasNewData?: boolean;
  /** Variante visual. */
  variant?: "compact" | "full";
}

export default function ReanalyzeButton({
  intelligence, onReanalyze, hasNewData = false, variant = "full",
}: Props) {
  const [busy, setBusy] = useState(false);

  const isEnriching = intelligence?.status === "enriching";
  const isFailed = intelligence?.status === "enrichment_failed";

  async function handle() {
    if (busy || isEnriching) return;
    setBusy(true);
    try {
      await onReanalyze();
    } finally {
      setBusy(false);
    }
  }

  const label = isFailed ? "↻ Reintentar análisis"
              : hasNewData ? "↻ Reanalizar con datos nuevos"
              : "↻ Reanalizar con Agente AMS";

  const color = isFailed ? "#ef4444"
              : hasNewData ? "#a855f7"
              : "#22d3ee";

  return (
    <button
      onClick={handle}
      disabled={busy || isEnriching}
      className="btn ghost"
      style={{
        fontSize: variant === "compact" ? 11 : 12,
        padding: variant === "compact" ? "4px 10px" : "6px 12px",
        color,
        borderColor: `${color}55`,
        opacity: busy || isEnriching ? 0.6 : 1,
        cursor: busy || isEnriching ? "wait" : "pointer",
      }}
      title="Re-ejecuta el pipeline de inteligencia con los datos actuales del ticket"
    >
      {busy || isEnriching ? (
        <><span className="spinner" /> analizando…</>
      ) : label}
    </button>
  );
}
