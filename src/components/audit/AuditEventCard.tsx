"use client";

import type { TicketAuditEvent } from "@/types/audit";
import { EVENT_ICONS, EVENT_COLORS, EVENT_LABELS } from "@/types/audit";

interface Props {
  event: TicketAuditEvent;
  compact?: boolean;
}

export default function AuditEventCard({ event, compact }: Props) {
  const c = EVENT_COLORS[event.eventType];
  const icon = EVENT_ICONS[event.eventType];
  const label = EVENT_LABELS[event.eventType];
  const ts = new Date(event.createdAt).toLocaleString("es-CL");

  return (
    <div className="lab-fb-block" style={{
      borderLeft: `3px solid ${c}`,
      padding: compact ? "6px 10px" : "8px 12px",
    }}>
      <div className="row between" style={{ alignItems: "center", gap: 8 }}>
        <div className="row" style={{ gap: 8, alignItems: "center", minWidth: 0 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, color: c }}>{event.title || label}</div>
            {event.description && (
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>{event.description}</div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right", whiteSpace: "nowrap" }}>
          {ts}
          <div style={{ marginTop: 2 }}>
            {event.actor}{event.actorRole ? ` · ${event.actorRole}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
