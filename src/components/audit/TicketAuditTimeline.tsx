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
  // v0.14.7 — dedup defensivo: si por algún bug se generaron eventos duplicados
  // (mismo type + mismo minuto), mostramos solo el más reciente con un contador.
  const sorted = useMemo(() => {
    const fresh = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const seen = new Map<string, { event: TicketAuditEvent; count: number }>();
    for (const e of fresh) {
      // Key: eventType + minuto (ignora segundos)
      const minute = (e.createdAt || "").slice(0, 16);
      const key = `${e.eventType}|${minute}`;
      const existing = seen.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        seen.set(key, { event: e, count: 1 });
      }
    }
    return Array.from(seen.values()).map(({ event, count }) =>
      count > 1
        ? { ...event, title: `${event.title} (×${count})` }
        : event,
    );
  }, [events]);

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
