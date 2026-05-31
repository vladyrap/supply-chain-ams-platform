"use client";

// Centro global de auditoría — vista cross-ticket del timeline.
// Filtros por tipo de evento, actor, ticket y rango de fechas.

import { useMemo, useState } from "react";
import { useTicketAudit } from "@/hooks/useTicketAudit";
import {
  EVENT_LABELS, EVENT_ICONS, EVENT_COLORS,
  type TicketAuditEventType,
} from "@/types/audit";
import AuditEventCard from "./AuditEventCard";

const TYPES = Object.keys(EVENT_LABELS) as TicketAuditEventType[];

export default function GlobalAuditCenter() {
  const audit = useTicketAudit();
  const [filterType, setFilterType] = useState<TicketAuditEventType | "all">("all");
  const [filterTicket, setFilterTicket] = useState("");
  const [filterActor, setFilterActor] = useState("");
  const [filterFrom, setFilterFrom] = useState("");

  const filtered = useMemo(() => {
    return audit.events.filter((e) => {
      if (filterType !== "all" && e.eventType !== filterType) return false;
      if (filterTicket && !e.ticketId.toLowerCase().includes(filterTicket.toLowerCase())) return false;
      if (filterActor && !e.actor.toLowerCase().includes(filterActor.toLowerCase())) return false;
      if (filterFrom && e.createdAt < filterFrom) return false;
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [audit.events, filterType, filterTicket, filterActor, filterFrom]);

  // Stats por tipo
  const byType = useMemo(() => {
    const map = new Map<TicketAuditEventType, number>();
    for (const e of filtered) map.set(e.eventType, (map.get(e.eventType) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Top tickets por actividad
  const byTicket = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.ticketId, (map.get(e.ticketId) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" /><span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>AUDIT · TRAIL · AMS</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>📜 Audit Trail global</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Timeline cross-ticket de todas las acciones registradas en el sistema. Visible sólo a roles autorizados.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{audit.events.length}</div>
              <div className="kanban-stat-lbl">EVENTOS TOTALES</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{byTicket.length}</div>
              <div className="kanban-stat-lbl">TICKETS C/ ACTIVIDAD</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{filtered.length}</div>
              <div className="kanban-stat-lbl">FILTRADOS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ticket-section-head">🔎 FILTROS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          <label className="tc-field">
            <span>Tipo de evento</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as never)}>
              <option value="all">Todos</option>
              {TYPES.map((t) => <option key={t} value={t}>{EVENT_ICONS[t]} {EVENT_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="tc-field">
            <span>Ticket</span>
            <input value={filterTicket} onChange={(e) => setFilterTicket(e.target.value)} placeholder="AMS-101" />
          </label>
          <label className="tc-field">
            <span>Actor</span>
            <input value={filterActor} onChange={(e) => setFilterActor(e.target.value)} placeholder="Pablo Admin" />
          </label>
          <label className="tc-field">
            <span>Desde fecha</span>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </label>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* Timeline */}
        <div className="card">
          <div className="ticket-section-head">📜 EVENTOS · {filtered.length}</div>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-dim)", textAlign: "center", padding: 30 }}>
              Sin eventos con esos filtros.
            </div>
          ) : (
            <div className="col" style={{ gap: 6, maxHeight: "70vh", overflowY: "auto" }}>
              {filtered.map((e) => (
                <div key={e.id}>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 2 }}>
                    Ticket <strong>{e.ticketId}</strong>
                  </div>
                  <AuditEventCard event={e} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="ticket-section-head">📊 POR TIPO</div>
            {byType.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>—</div>
            ) : (
              <div className="col" style={{ gap: 4, fontSize: 11.5 }}>
                {byType.map(([t, n]) => (
                  <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: "2px 6px",
                    background: "rgba(15,23,42,0.45)", borderRadius: 4, borderLeft: `3px solid ${EVENT_COLORS[t]}` }}>
                    <span><span style={{ marginRight: 6 }}>{EVENT_ICONS[t]}</span>{EVENT_LABELS[t]}</span>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>{n}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="ticket-section-head">🎫 TOP TICKETS</div>
            {byTicket.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>—</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-soft)" }}>
                {byTicket.map(([id, n]) => (
                  <li key={id}><strong>{id}</strong> · {n} eventos</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
