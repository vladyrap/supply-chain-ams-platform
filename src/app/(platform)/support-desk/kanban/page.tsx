"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { supportApi, type SupportTicket, type TicketStatus, type Priority } from "@/services/support.api";

const PRIORITY_META: Record<Priority, { color: string; icon: string; glow: string }> = {
  baja:    { color: "#10b981", icon: "○", glow: "0 0 6px #10b98166" },
  media:   { color: "#22d3ee", icon: "●", glow: "0 0 6px #22d3ee66" },
  alta:    { color: "#f59e0b", icon: "▲", glow: "0 0 8px #f59e0b88" },
  critica: { color: "#ef4444", icon: "🔥", glow: "0 0 12px #ef4444aa" },
};

const COLUMNS: { id: TicketStatus; label: string; icon: string; color: string; sub: string }[] = [
  { id: "new",              label: "Nuevos",            icon: "🆕", color: "#3b82f6", sub: "esperando triage humano" },
  { id: "in_progress",      label: "En progreso",       icon: "⚙",  color: "#f59e0b", sub: "consultor trabajando" },
  { id: "waiting_customer", label: "Esperando cliente", icon: "⏳", color: "#a855f7", sub: "esperando respuesta" },
  { id: "resolved",         label: "Resueltos",         icon: "✓", color: "#10b981", sub: "solución entregada" },
  { id: "closed",           label: "Cerrados",          icon: "📦", color: "#6b7280", sub: "casos archivados" },
];

interface SLA {
  text: string;
  pct: number;          // 0..100 de vida
  state: "ok" | "warn" | "danger" | "done";
  color: string;
}

function slaState(t: SupportTicket): SLA {
  if (t.status === "resolved" || t.status === "closed") {
    return { text: "—", pct: 100, state: "done", color: "#10b981" };
  }
  if (!t.sla_due_at || !t.sla_minutes) {
    return { text: "sin SLA", pct: 0, state: "ok", color: "var(--text-dim)" };
  }
  const due = new Date(t.sla_due_at).getTime();
  const totalMs = t.sla_minutes * 60 * 1000;
  const remainingMs = due - Date.now();
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  if (remainingMs < 0) {
    const overMin = Math.abs(Math.round(remainingMs / 60000));
    return { text: `⏰ -${overMin}m`, pct: 0, state: "danger", color: "#ef4444" };
  }
  const m = Math.round(remainingMs / 60000);
  const text = m < 60 ? `⏰ ${m}m` : `⏰ ${Math.floor(m / 60)}h ${m % 60}m`;
  if (pct < 25) return { text, pct, state: "danger", color: "#ef4444" };
  if (pct < 50) return { text, pct, state: "warn",   color: "#f59e0b" };
  return { text, pct, state: "ok", color: "#10b981" };
}

function avatarInitial(s: string | null | undefined): string {
  if (!s) return "?";
  return s.trim().charAt(0).toUpperCase();
}

function avatarColor(s: string | null | undefined): string {
  if (!s) return "#64748b";
  const hash = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ["#22d3ee", "#a855f7", "#10b981", "#fbbf24", "#3b82f6", "#f43f5e", "#06b6d4"];
  return colors[hash % colors.length];
}

export default function MesaKanbanPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [flashCol, setFlashCol] = useState<TicketStatus | null>(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await supportApi.listTickets();
    if ("success" in r && r.success) setTickets(r.tickets);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Live clock para SLA countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  function onDragStart(e: React.DragEvent, ticketId: string) {
    e.dataTransfer.setData("text/plain", ticketId);
    e.dataTransfer.effectAllowed = "move";
    setDragging(ticketId);
  }

  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  function onDragOver(e: React.DragEvent, col: TicketStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(col);
  }

  function onDragLeave(col: TicketStatus) {
    setDragOver((c) => (c === col ? null : c));
  }

  async function onDrop(e: React.DragEvent, target: TicketStatus) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    setDragging(null);
    if (!id) return;
    const current = tickets.find((t) => t.id === id);
    if (!current || current.status === target) return;

    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: target } : t)));
    setFlashCol(target);
    setTimeout(() => setFlashCol(null), 700);

    const r = await supportApi.setTicketStatus(id, target);
    if ("success" in r && r.success) {
      setTickets((prev) => prev.map((t) => (t.id === id ? r.ticket : t)));
      toast.success(`${r.ticket.code} → ${COLUMNS.find((c) => c.id === target)?.label}`);
    } else {
      setTickets((prev) => prev.map((t) => (t.id === id ? current : t)));
      toast.error("error" in r ? r.error : "No se pudo actualizar");
    }
  }

  const byStatus = useCallback((col: TicketStatus) => tickets.filter((t) => t.status === col), [tickets]);

  // Stats globales
  const stats = useMemo(() => {
    const total = tickets.length;
    const breaches = tickets.filter((t) => {
      if (!t.sla_due_at || t.status === "resolved" || t.status === "closed") return false;
      return new Date(t.sla_due_at).getTime() < now;
    }).length;
    const active = tickets.filter((t) => !["closed"].includes(t.status)).length;
    const critical = tickets.filter((t) => t.priority === "critica" && t.status !== "closed").length;
    return { total, breaches, active, critical };
  }, [tickets, now]);

  return (
    <div>
      {/* Hero header */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>TICKETS · N2 · KANBAN</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>🗂 Tablero de tickets</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Arrastra los tickets entre columnas para cambiar su estado. Optimistic update con rollback automático en error.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{stats.total}</div>
              <div className="kanban-stat-lbl">TOTAL</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#fbbf24" }}>
              <div className="kanban-stat-val">{stats.active}</div>
              <div className="kanban-stat-lbl">ACTIVOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: stats.critical ? "#ef4444" : "#64748b" }}>
              <div className="kanban-stat-val">{stats.critical}</div>
              <div className="kanban-stat-lbl">CRÍTICOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: stats.breaches ? "#ef4444" : "#10b981" }}>
              <div className="kanban-stat-val">{stats.breaches}</div>
              <div className="kanban-stat-lbl">SLA OUT</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <Link href="/support-desk" className="btn ghost" style={{ padding: "4px 12px", fontSize: 12 }}>← Overview</Link>
          <Link href="/support-desk/tickets" className="btn ghost" style={{ padding: "4px 12px", fontSize: 12 }}>📋 Vista lista</Link>
          <button onClick={refresh} className="btn ghost" disabled={loading} style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }}>
            {loading ? <><span className="spinner" /> cargando</> : "↻ refrescar"}
          </button>
        </div>
      </div>

      {/* Tablero */}
      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const list = byStatus(col.id);
          const isDragTarget = dragOver === col.id;
          const isFlash      = flashCol === col.id;
          const colCritical  = list.filter((t) => t.priority === "critica").length;
          return (
            <div
              key={col.id}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={() => onDragLeave(col.id)}
              onDrop={(e) => onDrop(e, col.id)}
              className={`kanban-col ${isDragTarget ? "drag-target" : ""} ${isFlash ? "flash" : ""}`}
              style={{ ["--col-color" as never]: col.color }}
            >
              <div className="kanban-col-head">
                <span className="kanban-col-icon" style={{ background: `${col.color}22`, color: col.color, boxShadow: `0 0 8px ${col.color}66` }}>{col.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="kanban-col-title">{col.label}</div>
                  <div className="kanban-col-sub">{col.sub}</div>
                </div>
                <div className="kanban-col-count" style={{ color: col.color, textShadow: `0 0 8px ${col.color}88` }}>
                  {list.length}
                </div>
              </div>

              {/* mini bar de criticals */}
              {colCritical > 0 && (
                <div className="kanban-col-crit">🔥 {colCritical} crítico{colCritical === 1 ? "" : "s"}</div>
              )}

              {/* Cards */}
              <div className="kanban-col-body">
                {list.length === 0 && (
                  <div className={`kanban-empty ${isDragTarget ? "drop-active" : ""}`}>
                    {isDragTarget ? "↓ suelta aquí ↓" : "— vacío —"}
                  </div>
                )}
                {list.map((t) => {
                  const sla = slaState(t);
                  const isDraggingThis = dragging === t.id;
                  const prio = PRIORITY_META[t.priority];
                  const clientLabel = t.title || "—";
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onDragEnd={onDragEnd}
                      className={`kanban-card ${isDraggingThis ? "dragging" : ""} ${t.priority === "critica" ? "is-critica" : ""}`}
                      style={{ ["--prio-color" as never]: prio.color }}
                    >
                      {/* Avatar + code */}
                      <div className="kanban-card-head">
                        <span className="kanban-avatar" style={{ background: avatarColor(clientLabel), color: "white" }}>
                          {avatarInitial(clientLabel)}
                        </span>
                        <code className="kanban-card-code">{t.code}</code>
                        <span className="kanban-card-prio" style={{ color: prio.color, textShadow: prio.glow }}>
                          {prio.icon} {t.priority.toUpperCase()}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="kanban-card-title">{t.title}</div>

                      {/* SLA bar */}
                      {sla.text && sla.text !== "—" && (
                        <div className="kanban-card-sla">
                          <div className="kanban-card-sla-bar">
                            <div className="kanban-card-sla-fill" style={{ width: `${sla.pct}%`, background: sla.color, boxShadow: `0 0 4px ${sla.color}` }} />
                          </div>
                          <span style={{ fontSize: 10, color: sla.color, fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}>
                            {sla.text}
                          </span>
                        </div>
                      )}

                      {/* Footer tags */}
                      <div className="row" style={{ gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {t.system_affected && t.system_affected !== "NO_INFORMADO" && (
                          <span className="kanban-tag" style={{ borderColor: "rgba(34,211,238,0.4)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>
                            {t.system_affected}
                          </span>
                        )}
                        {t.category && (
                          <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#c084fc", background: "rgba(168,85,247,0.08)" }}>
                            {t.category}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
