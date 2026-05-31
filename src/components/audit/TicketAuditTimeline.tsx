"use client";

// Timeline vertical de eventos de auditoría del ticket. Más reciente arriba.

import { useMemo } from "react";
import type { TicketAuditEvent } from "@/types/audit";
import AuditEventCard from "./AuditEventCard";

interface Props {
  events: TicketAuditEvent[];
  compact?: boolean;
  emptyHint?: string;
}

export default function TicketAuditTimeline({ events, compact, emptyHint }: Props) {
  const sorted = useMemo(() =>
    [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [events]);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-dim)", padding: 14, textAlign: "center" }}>
        {emptyHint ?? "Sin actividad registrada aún."}
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 6 }}>
      {sorted.map((e) => (
        <AuditEventCard key={e.id} event={e} compact={compact} />
      ))}
    </div>
  );
}
