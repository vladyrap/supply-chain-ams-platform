"use client";

// =============================================================================
// TicketEnrichmentBadge — Badge compacto del estado de enrichment
// =============================================================================
// Usado en:
//   - Lista de tickets (junto a status/priority badges)
//   - Header del TCC
//
// Estados: pending_enrichment | enriching | enriched | enrichment_failed | enrichment_skipped
// =============================================================================

import type { TicketIntelligence } from "@/types/ticket-intelligence";
import {
  ENRICHMENT_LABELS, ENRICHMENT_ICONS, ENRICHMENT_COLORS,
} from "@/types/ticket-intelligence";
import { RefreshCw } from "lucide-react";

interface Props {
  intelligence?: TicketIntelligence | null;
  /** Si true, muestra label completo. Si false, solo icon. */
  showLabel?: boolean;
  /** True si hay datos nuevos sin reanalizar (badge override). */
  hasNewData?: boolean;
  /** Click handler opcional (típicamente para reanalizar). */
  onClick?: () => void;
}

export default function TicketEnrichmentBadge({
  intelligence, showLabel = true, hasNewData = false, onClick,
}: Props) {
  // Sin intelligence → no mostrar (ticket viejo sin enriquecer)
  if (!intelligence?.status) return null;

  const status = intelligence.status;

  // hasNewData overridea visualmente cuando hay datos nuevos
  if (hasNewData && status === "enriched") {
    return (
      <span
        onClick={onClick}
        title="Hay datos nuevos. Click para reanalizar."
        style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 3,
          background: "rgba(168,85,247,0.12)", color: "#a855f7",
          border: "1px solid rgba(168,85,247,0.35)", fontWeight: 600,
          cursor: onClick ? "pointer" : "default",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}
      >
        <RefreshCw size={12} /> datos nuevos
      </span>
    );
  }

  const color = ENRICHMENT_COLORS[status];
  const icon = ENRICHMENT_ICONS[status];
  const label = ENRICHMENT_LABELS[status];

  // Animación pulsante para 'enriching'
  const isPulsing = status === "enriching";

  return (
    <span
      onClick={onClick}
      title={intelligence.error ? `Error: ${intelligence.error}` : label}
      style={{
        fontSize: 10, padding: "2px 7px", borderRadius: 3,
        background: `${color}1f`, color, fontWeight: 600,
        border: `1px solid ${color}55`,
        cursor: onClick ? "pointer" : "default",
        display: "inline-flex", alignItems: "center", gap: 4,
        animation: isPulsing ? "amsPulse 1.5s ease-in-out infinite" : undefined,
      }}
    >
      <span style={{
        display: "inline-block",
        animation: isPulsing ? "amsSpin 1.5s linear infinite" : undefined,
      }}>{icon}</span>
      {showLabel && <span>{label.toLowerCase()}</span>}
    </span>
  );
}
