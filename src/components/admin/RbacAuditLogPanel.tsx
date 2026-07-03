"use client";

// =============================================================================
// RbacAuditLogPanel — Visor de eventos de seguridad RBAC
// =============================================================================
// Lista los últimos eventos registrados por src/lib/rbac-audit.ts:
// ROLE_PERMISSIONS_UPDATED, ROLE_CREATED, USER_ROLE_CHANGED,
// UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT, RBAC_OVERRIDE_ACTIVATED, etc.
//
// Se refresca en vivo al disparar eventos (window storage event).
// Storage cap: 500 eventos (ver MAX_EVENTS en rbac-audit.ts).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  readRbacAuditEvents, RBAC_AUDIT_STORAGE,
  RBAC_EVENT_LABELS, RBAC_EVENT_ICONS,
  type RbacAuditEvent, type RbacAuditEventType,
} from "@/lib/rbac-audit";

const EVENT_COLORS: Record<RbacAuditEventType, string> = {
  ROLE_PERMISSIONS_UPDATED: "#a855f7",
  ROLE_CREATED: "#10b981",
  ROLE_DELETED: "#fa4d56",
  USER_ROLE_CHANGED: "#4589ff",
  UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT: "#fa4d56",
  RBAC_OVERRIDE_ACTIVATED: "#f1c21b",
  RBAC_OVERRIDE_CLEARED: "#64748b",
};

type FilterType = "ALL" | RbacAuditEventType;

export default function RbacAuditLogPanel() {
  const [events, setEvents] = useState<RbacAuditEvent[]>([]);
  const [filter, setFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    setEvents(readRbacAuditEvents());
    // Refrescar cuando otro tab del mismo origen muta el log
    function onStorage(e: StorageEvent) {
      if (!e.key || e.key === RBAC_AUDIT_STORAGE) {
        setEvents(readRbacAuditEvents());
      }
    }
    // Poll cada 2s — capta cambios del mismo tab (no hay event en mismo tab)
    const interval = setInterval(() => setEvents(readRbacAuditEvents()), 2000);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  const visible = useMemo(() =>
    filter === "ALL" ? events : events.filter((e) => e.eventType === filter),
  [events, filter]);

  const typeCounts = useMemo(() => {
    const map: Partial<Record<RbacAuditEventType, number>> = {};
    for (const ev of events) {
      map[ev.eventType] = (map[ev.eventType] ?? 0) + 1;
    }
    return map;
  }, [events]);

  function handleClear() {
    if (!window.confirm("¿Limpiar todo el log de eventos RBAC? Esta acción no se puede deshacer.")) return;
    localStorage.removeItem(RBAC_AUDIT_STORAGE);
    setEvents([]);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rbac-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>📜 Log de eventos RBAC</h3>
          <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12 }}>
            {events.length} eventos registrados · persistencia local (cap 500)
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn ghost sm" onClick={handleExport} disabled={events.length === 0}
            style={{ fontSize: 11 }}>
            ⬇ Exportar JSON
          </button>
          <button className="btn ghost sm" onClick={handleClear} disabled={events.length === 0}
            style={{ fontSize: 11, color: "#fa4d56" }}>
            🗑 Limpiar log
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} label={`Todos (${events.length})`} color="#64748b" />
        {(Object.keys(RBAC_EVENT_LABELS) as RbacAuditEventType[]).map((t) => {
          const count = typeCounts[t] ?? 0;
          if (count === 0) return null;
          return (
            <FilterChip
              key={t}
              active={filter === t}
              onClick={() => setFilter(t)}
              label={`${RBAC_EVENT_ICONS[t]} ${RBAC_EVENT_LABELS[t]} (${count})`}
              color={EVENT_COLORS[t]}
            />
          );
        })}
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
          {events.length === 0 ? "Sin eventos registrados todavía." : "Sin eventos para el filtro seleccionado."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {visible.map((ev) => {
            const color = EVENT_COLORS[ev.eventType];
            return (
              <div key={ev.id} style={{
                padding: 10, borderRadius: 6,
                background: "var(--bg-elev)",
                border: `1px solid var(--border-soft)`,
                borderLeft: `3px solid ${color}`,
              }}>
                <div className="row between" style={{ alignItems: "flex-start", gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {RBAC_EVENT_ICONS[ev.eventType]} {RBAC_EVENT_LABELS[ev.eventType]}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 3 }}>
                      por <b>{ev.actor}</b>
                      {ev.actorRoleCode && <span style={{ color: "var(--text-dim)" }}> · {ev.actorRoleCode}</span>}
                      {ev.subject && <span> → <code style={{ fontSize: 10.5 }}>{ev.subject}</code></span>}
                    </div>
                    {(ev.screen || ev.action) && (
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 3 }}>
                        {ev.screen && <>screen: <code>{ev.screen}</code></>}
                        {ev.action && <> · action: <code>{ev.action}</code></>}
                      </div>
                    )}
                    {ev.route && (
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 3 }}>
                        ruta: <code>{ev.route}</code>
                      </div>
                    )}
                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ fontSize: 10.5, color: "var(--text-dim)", cursor: "pointer" }}>
                          metadata
                        </summary>
                        <pre style={{
                          fontSize: 10, color: "var(--text-soft)",
                          background: "rgba(0,0,0,0.20)", padding: 6, borderRadius: 4,
                          marginTop: 4, overflow: "auto",
                        }}>{JSON.stringify(ev.metadata, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {new Date(ev.createdAt).toLocaleString("es-CL")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 12, fontSize: 11,
        background: active ? `${color}22` : "transparent",
        border: `1px solid ${active ? color : "var(--border-soft)"}`,
        color: active ? color : "var(--text-soft)",
        cursor: "pointer", fontWeight: active ? 600 : 400,
      }}>
      {label}
    </button>
  );
}
