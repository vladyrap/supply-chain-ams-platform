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
const STATUS_VARIANT: Record<TicketStatus, "ok" | "warn" | "error" | "info" | "muted"> = {
  new:               "info",
  in_progress:       "warn",
  waiting_customer:  "warn",
  resolved:          "ok",
  closed:            "muted",
};

function slaState(t: SupportTicket): { text: string; variant: "ok" | "warn" | "error" } {
  if (!t.sla_due_at) return { text: "—", variant: "ok" };
  if (t.status === "resolved" || t.status === "closed") return { text: "cumplido", variant: "ok" };
  const remaining = new Date(t.sla_due_at).getTime() - Date.now();
  const mins = Math.round(remaining / 60000);
  if (mins < 0) return { text: `vencido hace ${Math.abs(mins)} min`, variant: "error" };
  if (mins < 30) return { text: `${mins} min restantes`, variant: "warn" };
  if (mins < 120) return { text: `${mins} min`, variant: "warn" };
  return { text: `${Math.round(mins / 60)} h`, variant: "ok" };
}

export default function MesaTicketsPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [resolution, setResolution] = useState("");
  const [createKb, setCreateKb] = useState(true);
  const [resolving, setResolving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await supportApi.listTickets(
      statusFilter !== "all" ? { status: statusFilter } : undefined
    );
    if ("success" in r && r.success) setTickets(r.tickets);
    else setError("error" in r ? r.error : "Error");
    setLoading(false);
  }, [statusFilter]);

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

  const filterOptions: { id: TicketStatus | "all"; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "new", label: "Nuevos" },
    { id: "in_progress", label: "En progreso" },
    { id: "waiting_customer", label: "Esperando cliente" },
    { id: "resolved", label: "Resueltos" },
    { id: "closed", label: "Cerrados" },
  ];

  return (
    <div>
      <div className="page-title">
        <h1>🎫 Tickets Nivel 2 — Mesa de Soporte</h1>
        <p>Tickets generados por la IA cuando escala. Cuando los resuelvas, podrás crear un KB article para casos futuros.</p>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {filterOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => setStatusFilter(o.id)}
            className={`btn ${statusFilter === o.id ? "primary" : "ghost"}`}
            style={{ padding: "4px 12px" }}
          >{o.label}</button>
        ))}
        <button onClick={refresh} className="btn ghost" disabled={loading} style={{ marginLeft: "auto" }}>
          {loading ? <><span className="spinner" /> cargando</> : "↻"}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {tickets.length === 0 && !loading && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>Sin tickets.</div>
            )}
            {tickets.map((t) => {
              const sla = slaState(t);
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t); setResolution(t.resolution ?? ""); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: 0, borderBottom: "1px solid var(--border-soft)",
                    color: "inherit", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <code style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{t.code}</code>
                    <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                    {t.system_affected && <Badge variant="tech">{t.system_affected}</Badge>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: `var(--${sla.variant === "error" ? "error" : sla.variant === "warn" ? "warn" : "text-dim"})` }}>
                      ⏱ {sla.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          {!selected && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Selecciona un ticket.</div>}
          {selected && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
                <div>
                  <code style={{ fontSize: 12, color: "var(--text-dim)" }}>{selected.code}</code>
                  <h3 style={{ margin: "4px 0 0", fontSize: 16 }}>{selected.title}</h3>
                  <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge variant={PRIORITY_VARIANT[selected.priority]}>{selected.priority}</Badge>
                    <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status}</Badge>
                    {selected.system_affected && <Badge variant="tech">{selected.system_affected}</Badge>}
                    {selected.category && <Badge variant="muted">{selected.category}</Badge>}
                    {selected.assigned_role && <Badge variant="info">→ {selected.assigned_role}</Badge>}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Resumen del caso (generado por IA)</h4>
                <div className="msg user" style={{ marginTop: 4 }}>
                  <div className="body" style={{ whiteSpace: "pre-wrap" }}>{selected.summary}</div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Evidencias</h4>
                <div className="col" style={{ gap: 6 }}>
                  {selected.evidences.map((e, i) => (
                    <details key={i} style={{ background: "var(--bg-elev)", padding: 8, borderRadius: 6 }}>
                      <summary style={{ cursor: "pointer", fontSize: 12.5 }}>
                        <Badge variant="muted">{e.type}</Badge>{" "}{e.label}
                      </summary>
                      <pre style={{ fontSize: 11.5, marginTop: 8, whiteSpace: "pre-wrap", color: "var(--text-soft)" }}>
                        {e.value.slice(0, 2000)}{e.value.length > 2000 ? "…" : ""}
                      </pre>
                    </details>
                  ))}
                </div>
              </div>

              {selected.conversation_id && (
                <Link href="/support-desk/conversations" className="badge info" style={{ alignSelf: "start", textDecoration: "none", fontSize: 12 }}>
                  📋 ver conversación →
                </Link>
              )}

              {/* Acciones según estado */}
              {selected.status === "new" && (
                <button className="btn primary" onClick={() => handleAssign(selected)}>
                  Tomar el ticket (auto-asignar)
                </button>
              )}

              {(selected.status === "in_progress" || selected.status === "waiting_customer") && (
                <div className="col" style={{ gap: 8, borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: "var(--text-soft)" }}>Resolver ticket</h4>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Pasos exactos de la solución, en formato N1-friendly. Ej: 1. Acceder a MM03 y extender material al centro 1100..."
                    style={{ minHeight: 120 }}
                  />
                  <label className="toggle">
                    <input type="checkbox" checked={createKb} onChange={(e) => setCreateKb(e.target.checked)} />
                    <span className="track" />
                    <span>Crear KB article (draft) para casos futuros similares</span>
                  </label>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn primary" onClick={handleResolve} disabled={resolving || !resolution.trim()}>
                      {resolving ? <><span className="spinner" /> guardando</> : "Marcar como resuelto"}
                    </button>
                    <button className="btn ghost" onClick={() => setSelected(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              {selected.status === "resolved" && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Resolución registrada</h4>
                  <div className="msg agent">
                    <div className="body" style={{ whiteSpace: "pre-wrap" }}>{selected.resolution}</div>
                  </div>
                  <button className="btn" onClick={() => handleClose(selected)} style={{ marginTop: 10 }}>
                    Cerrar definitivamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
