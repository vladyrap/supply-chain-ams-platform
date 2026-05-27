"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { supportApi, type SupportTicket, type TicketStatus, type Priority } from "@/services/support.api";

const PRIORITY_VARIANT: Record<Priority, "ok" | "warn" | "error" | "info"> = {
  baja:    "ok",
  media:   "info",
  alta:    "warn",
  critica: "error",
};

const COLUMNS: { id: TicketStatus; label: string; color: string }[] = [
  { id: "new",              label: "🆕 Nuevos",            color: "#3b82f6" },
  { id: "in_progress",      label: "⚙ En progreso",        color: "#f59e0b" },
  { id: "waiting_customer", label: "⏳ Esperando cliente",  color: "#a855f7" },
  { id: "resolved",         label: "✅ Resueltos",          color: "#10b981" },
  { id: "closed",           label: "📦 Cerrados",           color: "#6b7280" },
];

function slaShort(t: SupportTicket): { text: string; danger: boolean; warn: boolean } {
  if (!t.sla_due_at || t.status === "resolved" || t.status === "closed") {
    return { text: "", danger: false, warn: false };
  }
  const mins = Math.round((new Date(t.sla_due_at).getTime() - Date.now()) / 60000);
  if (mins < 0)   return { text: `⏰ -${Math.abs(mins)} min`, danger: true,  warn: false };
  if (mins < 60)  return { text: `⏰ ${mins} min`,             danger: false, warn: true  };
  return         { text: `⏰ ${Math.round(mins / 60)} h`,      danger: false, warn: false };
}

export default function MesaKanbanPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await supportApi.listTickets();
    if ("success" in r && r.success) setTickets(r.tickets);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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

    // Optimistic update
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: target } : t)));
    const r = await supportApi.setTicketStatus(id, target);
    if ("success" in r && r.success) {
      // sync con la respuesta real (timestamps, etc.)
      setTickets((prev) => prev.map((t) => (t.id === id ? r.ticket : t)));
      toast.success(`${r.ticket.code} → ${target}`);
    } else {
      // rollback
      setTickets((prev) => prev.map((t) => (t.id === id ? current : t)));
      toast.error("error" in r ? r.error : "No se pudo actualizar");
    }
  }

  const byStatus = (col: TicketStatus) => tickets.filter((t) => t.status === col);
  const total = tickets.length;

  return (
    <div>
      <div className="page-title">
        <h1>🗂 Kanban — Tickets Nivel 2</h1>
        <p>Arrastra los tickets entre columnas para cambiar su estado. Los timestamps de resolución / cierre se actualizan solos.</p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12, alignItems: "center" }}>
        <Badge variant="muted">{total} ticket{total === 1 ? "" : "s"}</Badge>
        <Link href="/support-desk/tickets" className="btn ghost" style={{ padding: "4px 12px" }}>
          ← vista lista
        </Link>
        <button onClick={refresh} className="btn ghost" disabled={loading} style={{ marginLeft: "auto", padding: "4px 12px" }}>
          {loading ? <><span className="spinner" /> cargando</> : "↻ refrescar"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`,
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((col) => {
          const list = byStatus(col.id);
          const isDragTarget = dragOver === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={() => onDragLeave(col.id)}
              onDrop={(e) => onDrop(e, col.id)}
              style={{
                background: "var(--bg-elev)",
                borderRadius: 8,
                border: `1px solid ${isDragTarget ? col.color : "var(--border-soft)"}`,
                boxShadow: isDragTarget ? `0 0 0 2px ${col.color}55 inset` : "none",
                transition: "box-shadow .15s, border-color .15s",
                display: "flex",
                flexDirection: "column",
                minHeight: 200,
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border-soft)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderLeft: `3px solid ${col.color}`,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{col.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>
                  {list.length}
                </span>
              </div>

              <div
                style={{
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: "calc(100vh - 280px)",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {list.length === 0 && (
                  <div style={{
                    color: "var(--text-dim)", fontSize: 11.5, textAlign: "center",
                    padding: "24px 0", fontStyle: "italic",
                  }}>
                    {isDragTarget ? "↓ suelta aquí ↓" : "—"}
                  </div>
                )}
                {list.map((t) => {
                  const sla = slaShort(t);
                  const isDraggingThis = dragging === t.id;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onDragEnd={onDragEnd}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: 6,
                        padding: "8px 10px",
                        cursor: "grab",
                        opacity: isDraggingThis ? 0.4 : 1,
                        transition: "opacity .1s",
                        userSelect: "none",
                      }}
                    >
                      <div className="row between" style={{ marginBottom: 4 }}>
                        <code style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{t.code}</code>
                        <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                      </div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 500, lineHeight: 1.3,
                        marginBottom: 6,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {t.title}
                      </div>
                      <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                        {t.system_affected && t.system_affected !== "NO_INFORMADO" && (
                          <Badge variant="tech">{t.system_affected}</Badge>
                        )}
                        {sla.text && (
                          <span style={{
                            fontSize: 10.5,
                            marginLeft: "auto",
                            color: sla.danger ? "var(--error)" : sla.warn ? "var(--warn)" : "var(--text-dim)",
                            fontWeight: sla.danger ? 600 : 400,
                          }}>
                            {sla.text}
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
