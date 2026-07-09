"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { supportApi, type SupportTicket, type TicketStatus, type Priority } from "@/services/support.api";

const PRIORITY_META: Record<Priority, { color: string; icon: string }> = {
  baja:    { color: "#10b981", icon: "○" },
  media:   { color: "#4589ff", icon: "●" },
  alta:    { color: "#b45309", icon: "▲" },
  critica: { color: "#fa4d56", icon: "🔥" },
};

const STATUS_META: Record<TicketStatus, { color: string; label: string; icon: string }> = {
  new:              { color: "#3b82f6", label: "Nuevo",              icon: "🆕" },
  in_progress:      { color: "#b45309", label: "En progreso",        icon: "⚙" },
  waiting_customer: { color: "#a855f7", label: "Esperando cliente",  icon: "⏳" },
  resolved:         { color: "#10b981", label: "Resuelto",           icon: "✓" },
  closed:           { color: "#6b7280", label: "Cerrado",            icon: "📦" },
};

const STATUS_ORDER: (TicketStatus | "all")[] = ["all", "new", "in_progress", "waiting_customer", "resolved", "closed"];

interface SLA {
  text: string;
  pct: number;
  state: "ok" | "warn" | "danger" | "done";
  color: string;
}

function slaState(t: SupportTicket): SLA {
  if (t.status === "resolved" || t.status === "closed") {
    return { text: "cumplido", pct: 100, state: "done", color: "#10b981" };
  }
  if (!t.sla_due_at || !t.sla_minutes) {
    return { text: "—", pct: 0, state: "ok", color: "var(--text-dim)" };
  }
  const due = new Date(t.sla_due_at).getTime();
  const totalMs = t.sla_minutes * 60 * 1000;
  const remainingMs = due - Date.now();
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  if (remainingMs < 0) {
    return { text: `vencido hace ${Math.abs(Math.round(remainingMs / 60000))}m`, pct: 0, state: "danger", color: "#fa4d56" };
  }
  const m = Math.round(remainingMs / 60000);
  const text = m < 60 ? `${m}m restantes` : `${Math.floor(m / 60)}h ${m % 60}m`;
  if (pct < 25) return { text, pct, state: "danger", color: "#fa4d56" };
  if (pct < 50) return { text, pct, state: "warn",   color: "#b45309" };
  return { text, pct, state: "ok", color: "#10b981" };
}

function avatarInitial(s: string | null | undefined): string {
  if (!s) return "?";
  return s.trim().charAt(0).toUpperCase();
}
function avatarColor(s: string | null | undefined): string {
  if (!s) return "#64748b";
  const hash = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ["#4589ff", "#a855f7", "#10b981", "#f1c21b", "#3b82f6", "#f43f5e", "#06b6d4"];
  return colors[hash % colors.length];
}

function fmtRel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.round(d / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

export default function MesaTicketsPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [resolution, setResolution] = useState("");
  const [createKb, setCreateKb] = useState(true);
  const [resolving, setResolving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Trae todos para poder calcular stats; backend acepta status pero queremos KPIs globales
    const r = await supportApi.listTickets();
    if ("success" in r && r.success) setTickets(r.tickets);
    else setError("error" in r ? r.error : "Error");
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleAssign(t: SupportTicket) {
    const r = await supportApi.assignTicket(t.id);
    if ("success" in r && r.success) {
      toast.success(`Asignado: ${t.code}`);
      refresh();
      if (selected?.id === t.id) setSelected(r.ticket);
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }

  async function handleResolve() {
    if (!selected || !resolution.trim()) return;
    setResolving(true);
    const r = await supportApi.resolveTicket(selected.id, resolution.trim(), createKb);
    setResolving(false);
    if ("success" in r && r.success) {
      toast.success(`${selected.code} resuelto` + (r.kbArticle ? ` · KB article creado (draft)` : ""));
      setResolution("");
      setSelected(null);
      refresh();
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }

  async function handleClose(t: SupportTicket) {
    const r = await supportApi.closeTicket(t.id);
    if ("success" in r && r.success) {
      toast.success(`${t.code} cerrado`);
      refresh();
      if (selected?.id === t.id) setSelected(null);
    }
  }

  // Stats globales (sobre todos los tickets, no filtrados)
  const stats = useMemo(() => {
    const total = tickets.length;
    const breaches = tickets.filter((t) => {
      if (!t.sla_due_at || t.status === "resolved" || t.status === "closed") return false;
      return new Date(t.sla_due_at).getTime() < Date.now();
    }).length;
    const critical = tickets.filter((t) => t.priority === "critica" && t.status !== "closed").length;
    const resolvedRate = total > 0
      ? Math.round((tickets.filter((t) => t.status === "resolved" || t.status === "closed").length / total) * 100)
      : 0;
    const countsByStatus: Record<TicketStatus | "all", number> = {
      all: total,
      new: 0, in_progress: 0, waiting_customer: 0, resolved: 0, closed: 0,
    };
    tickets.forEach((t) => { countsByStatus[t.status]++; });
    const countsByPrio: Record<Priority | "all", number> = { all: total, baja: 0, media: 0, alta: 0, critica: 0 };
    tickets.forEach((t) => { countsByPrio[t.priority]++; });
    return { total, breaches, critical, resolvedRate, countsByStatus, countsByPrio };
  }, [tickets]);

  // Filtrado client-side
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (q) {
        const hay = [t.code, t.title, t.summary, t.system_affected, t.category].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, search]);

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>TICKETS · N2 · LISTADO</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>🎫 Tickets Nivel 2</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Tickets generados por la IA al escalar. Cuando los resuelvas, podés crear un KB article para casos futuros.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">{stats.total}</div>
              <div className="kanban-stat-lbl">TOTAL</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: stats.critical ? "#fa4d56" : "#64748b" }}>
              <div className="kanban-stat-val">{stats.critical}</div>
              <div className="kanban-stat-lbl">CRÍTICOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: stats.breaches ? "#fa4d56" : "#10b981" }}>
              <div className="kanban-stat-val">{stats.breaches}</div>
              <div className="kanban-stat-lbl">SLA OUT</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats.resolvedRate}%</div>
              <div className="kanban-stat-lbl">RESUELTOS</div>
            </div>
          </div>
        </div>

        {/* Filtros + search */}
        <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
          {STATUS_ORDER.map((s) => {
            const meta = s === "all" ? null : STATUS_META[s];
            const count = stats.countsByStatus[s];
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`ticket-filter ${statusFilter === s ? "active" : ""}`}
                style={{ ["--filt-color" as never]: meta?.color ?? "#4589ff" }}>
                {meta ? `${meta.icon} ${meta.label}` : "▸ Todos"} <span className="ticket-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10, alignItems: "center", position: "relative", zIndex: 2 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, título, sistema, categoría..."
            style={{ flex: 1, fontSize: 12.5 }} />
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as never)} style={{ minWidth: 150 }}>
            <option value="all">Todas las prioridades</option>
            <option value="critica">🔥 críticas ({stats.countsByPrio.critica})</option>
            <option value="alta">▲ altas ({stats.countsByPrio.alta})</option>
            <option value="media">● medias ({stats.countsByPrio.media})</option>
            <option value="baja">○ bajas ({stats.countsByPrio.baja})</option>
          </select>
          <Link href="/support-desk/kanban" className="btn ghost" style={{ padding: "5px 12px", fontSize: 12 }}>🗂 Kanban</Link>
          <button onClick={refresh} className="btn ghost" disabled={loading} style={{ padding: "5px 12px", fontSize: 12 }}>
            {loading ? <><span className="spinner" /> cargando</> : "↻"}
          </button>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* Lista + detalle */}
      <div className="ticket-shell">
        <div className="ticket-list-wrap">
          <div className="ticket-list-head">
            <span>{filtered.length} ticket{filtered.length === 1 ? "" : "s"}</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5 }}>orden: más recientes primero</span>
          </div>

          {loading && tickets.length === 0 && (
            <div className="ticket-list-skeleton">
              {[1, 2, 3, 4].map((i) => <div key={i} className="ticket-skel" />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="ticket-empty">
              <div style={{ fontSize: 36, marginBottom: 6 }}>📭</div>
              <div style={{ fontSize: 13.5 }}>
                {tickets.length === 0
                  ? "Aún no hay tickets. El primer escalado de la mesa de soporte aparece acá."
                  : "Ningún ticket coincide con los filtros."}
              </div>
            </div>
          )}

          <div className="ticket-list">
            {filtered.map((t) => {
              const sla = slaState(t);
              const prio = PRIORITY_META[t.priority];
              const status = STATUS_META[t.status];
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t); setResolution(t.resolution ?? ""); }}
                  className={`ticket-row ${active ? "active" : ""} ${t.priority === "critica" ? "is-critica" : ""}`}
                  style={{ ["--prio-color" as never]: prio.color, ["--status-color" as never]: status.color }}
                >
                  <span className="ticket-avatar" style={{ background: avatarColor(t.title), color: "white" }}>
                    {avatarInitial(t.title)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <code className="ticket-code">{t.code}</code>
                      <span className="ticket-prio" style={{ color: prio.color }}>{prio.icon} {t.priority}</span>
                      <span className="ticket-status" style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}55` }}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <div className="ticket-title">{t.title}</div>
                    <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {t.system_affected && t.system_affected !== "NO_INFORMADO" && (
                        <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#0284c7", background: "rgba(69,137,255,0.08)" }}>{t.system_affected}</span>
                      )}
                      {t.category && (
                        <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#7c3aed", background: "rgba(168,85,247,0.08)" }}>{t.category}</span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>
                        {fmtRel(t.created_at)}
                      </span>
                    </div>

                    {/* SLA bar */}
                    {sla.text !== "—" && (
                      <div className="ticket-sla-block">
                        <div className="ticket-sla-bar">
                          <div className="ticket-sla-fill" style={{ width: `${sla.pct}%`, background: sla.color, boxShadow: `0 0 4px ${sla.color}` }} />
                        </div>
                        <span className="ticket-sla-text" style={{ color: sla.color }}>⏱ {sla.text}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="ticket-detail">
          {!selected ? (
            <div className="ticket-empty">
              <div style={{ fontSize: 44, marginBottom: 8 }}>👈</div>
              <div style={{ fontSize: 13.5, color: "var(--text-soft)", textAlign: "center" }}>
                Seleccioná un ticket de la lista para ver el detalle y aplicar acciones.
              </div>
            </div>
          ) : (
            <SelectedTicketDetail
              t={selected}
              resolution={resolution}
              setResolution={setResolution}
              createKb={createKb}
              setCreateKb={setCreateKb}
              resolving={resolving}
              onAssign={() => handleAssign(selected)}
              onResolve={handleResolve}
              onClose={() => handleClose(selected)}
              onDeselect={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Detail panel
// ============================================================================
function SelectedTicketDetail({
  t, resolution, setResolution, createKb, setCreateKb, resolving,
  onAssign, onResolve, onClose, onDeselect,
}: {
  t: SupportTicket;
  resolution: string; setResolution: (v: string) => void;
  createKb: boolean; setCreateKb: (v: boolean) => void;
  resolving: boolean;
  onAssign: () => void;
  onResolve: () => void;
  onClose: () => void;
  onDeselect: () => void;
}) {
  const prio = PRIORITY_META[t.priority];
  const status = STATUS_META[t.status];
  const sla = slaState(t);

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Header del detalle */}
      <div className="ticket-detail-head">
        <span className="ticket-avatar" style={{ background: avatarColor(t.title), color: "white", width: 38, height: 38, fontSize: 16 }}>
          {avatarInitial(t.title)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, alignItems: "center" }}>
            <code style={{ fontSize: 11.5, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>{t.code}</code>
            <span className="ticket-prio" style={{ color: prio.color, fontWeight: 700 }}>{prio.icon} {t.priority.toUpperCase()}</span>
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, letterSpacing: 0.3 }}>{t.title}</h2>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span className="ticket-status" style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}55` }}>
              {status.icon} {status.label}
            </span>
            {t.system_affected && t.system_affected !== "NO_INFORMADO" && (
              <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#0284c7", background: "rgba(69,137,255,0.08)" }}>{t.system_affected}</span>
            )}
            {t.category && (
              <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#7c3aed", background: "rgba(168,85,247,0.08)" }}>{t.category}</span>
            )}
            {t.assigned_role && (
              <span className="kanban-tag" style={{ borderColor: "rgba(241,194,27,0.4)", color: "#8a6d00", background: "rgba(241,194,27,0.08)" }}>→ {t.assigned_role}</span>
            )}
          </div>
        </div>
        <button className="btn ghost" onClick={onDeselect} style={{ padding: "3px 8px", fontSize: 14 }} title="Cerrar detalle">×</button>
      </div>

      {/* SLA full width */}
      {sla.text !== "—" && (
        <div className="ticket-sla-hero">
          <div className="row between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.5 }}>SLA</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: sla.color, fontFamily: "var(--font-mono, monospace)" }}>⏱ {sla.text}</span>
          </div>
          <div className="ticket-sla-bar" style={{ height: 6 }}>
            <div className="ticket-sla-fill" style={{ width: `${sla.pct}%`, background: sla.color, boxShadow: `0 0 8px ${sla.color}` }} />
          </div>
          <div className="row between" style={{ marginTop: 4, fontSize: 10, color: "var(--text-dim)" }}>
            <span>creado {fmtRel(t.created_at)}</span>
            {t.sla_due_at && <span>vence {new Date(t.sla_due_at).toLocaleString("es-CL")}</span>}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="ticket-section">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>▸</span> RESUMEN GENERADO POR IA
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {t.summary}
        </div>
      </div>

      {/* Evidencias */}
      <div className="ticket-section">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>▸</span> EVIDENCIAS · {t.evidences.length}
        </div>
        <div className="col" style={{ gap: 6 }}>
          {t.evidences.map((e, i) => (
            <details key={i} className="ticket-evidence">
              <summary>
                <span className="kanban-tag" style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-soft)" }}>{e.type}</span>
                <span style={{ fontSize: 12.5 }}>{e.label}</span>
              </summary>
              <pre style={{ fontSize: 11.5, marginTop: 8, whiteSpace: "pre-wrap", color: "var(--text-soft)", fontFamily: "var(--font-mono, monospace)" }}>
                {e.value.slice(0, 2000)}{e.value.length > 2000 ? "…" : ""}
              </pre>
            </details>
          ))}
        </div>
      </div>

      {/* Conversación link */}
      {t.conversation_id && (
        <Link href="/support-desk/conversations" className="ticket-link-back">
          📋 ver conversación que originó este ticket →
        </Link>
      )}

      {/* Acciones según estado */}
      {t.status === "new" && (
        <button className="btn primary" onClick={onAssign} style={{ alignSelf: "start" }}>
          📥 Tomar el ticket (auto-asignar)
        </button>
      )}

      {(t.status === "in_progress" || t.status === "waiting_customer") && (
        <div className="ticket-resolve">
          <div className="ticket-section-head">
            <span style={{ color: "#10b981" }}>▸</span> RESOLVER TICKET
          </div>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Pasos exactos de la solución, en formato N1-friendly. Ej: 1. Acceder a MM03 y extender material al centro 1100..."
            style={{ minHeight: 130, marginTop: 6, fontFamily: "inherit", fontSize: 13 }}
          />
          <label className="toggle" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={createKb} onChange={(e) => setCreateKb(e.target.checked)} />
            <span className="track" />
            <span>Crear KB article (draft) para casos futuros similares</span>
          </label>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn primary" onClick={onResolve} disabled={resolving || !resolution.trim()}>
              {resolving ? <><span className="spinner" /> guardando</> : "✓ Marcar como resuelto"}
            </button>
            <button className="btn ghost" onClick={onDeselect}>Cancelar</button>
          </div>
        </div>
      )}

      {t.status === "resolved" && (
        <div className="ticket-resolved">
          <div className="ticket-section-head">
            <span style={{ color: "#10b981" }}>✓</span> RESOLUCIÓN REGISTRADA
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", marginTop: 8 }}>
            {t.resolution}
          </div>
          <button className="btn" onClick={onClose} style={{ marginTop: 12 }}>
            📦 Cerrar definitivamente
          </button>
        </div>
      )}
    </div>
  );
}
