"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { listTickets, getProviderStatus, type Ticket } from "@/services/tickets.api";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import GuidedTicketIntakeModal from "@/components/tickets/GuidedTicketIntakeModal";
import TicketEstimateBadge from "@/components/estimation/TicketEstimateBadge";
import TicketEnrichmentBadge from "@/components/tickets/TicketEnrichmentBadge";
import TicketCommandCenter from "@/components/tickets/TicketCommandCenter";
import GuidedAmsDemo from "@/components/demo/GuidedAmsDemo";
import { useAuth } from "@/context/AuthContext";

function statusVariant(s: string): "ok" | "warn" | "error" | "muted" | "info" {
  const lower = s.toLowerCase();
  if (lower.includes("done") || lower.includes("resol") || lower.includes("closed")) return "ok";
  if (lower.includes("progress") || lower.includes("review")) return "warn";
  if (lower.includes("blocked") || lower.includes("fail")) return "error";
  return "info";
}
function priorityVariant(p: string): "ok" | "warn" | "error" | "muted" | "info" {
  const lower = p.toLowerCase();
  if (lower.includes("highest") || lower.includes("critical")) return "error";
  if (lower.includes("high")) return "warn";
  if (lower.includes("low")) return "ok";
  return "muted";
}

export default function TicketsPage() {
  const { user: authUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [source, setSource] = useState<"jira" | "mock" | null>(null);
  const [provider, setProvider] = useState<{ jiraConfigured: boolean; jiraReachable: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [t, p] = await Promise.all([listTickets(), getProviderStatus()]);
    if ("success" in t && t.success) {
      setTickets(t.tickets);
      setSource(t.source);
    } else {
      setError("error" in t ? t.error : "Error");
    }
    if ("success" in p && p.success) setProvider({ jiraConfigured: p.jiraConfigured, jiraReachable: p.jiraReachable });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selected = tickets.find((t) => t.key === selectedKey) ?? null;

  return (
    <div className="tickets-page">
      {/* ── Header de página (flex-shrink: 0, altura estable) ───────── */}
      <div className="tickets-page-header">
        <div className="page-title" style={{ marginBottom: 8 }}>
          <h1 style={{ marginBottom: 2 }}>🎫 Tickets</h1>
          <p style={{ marginBottom: 0 }}>Listado de tickets desde Jira (si hay credenciales) o set de demo. Cada ticket se puede clasificar con el Agente AMS.</p>
        </div>

        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Badge variant={source === "jira" ? "ok" : "muted"}>
              fuente: {source ?? "—"}
            </Badge>
            {provider && (
              <>
                <Badge variant={provider.jiraConfigured ? "info" : "muted"}>
                  Jira {provider.jiraConfigured ? "configurado" : "no configurado"}
                </Badge>
                {provider.jiraConfigured && (
                  <Badge variant={provider.jiraReachable ? "ok" : "error"}>
                    {provider.jiraReachable ? "alcanzable" : "no alcanzable"}
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn ghost"
              onClick={() => setDemoOpen(true)}
              style={{ borderColor: "#fbbf24", color: "#fbbf24" }}
              title="Ejecuta el flujo completo AMS sobre un ticket demo (crea ticket, clasifica con agente real, RCA, test, etc.)"
            >
              🎬 Ejecutar demo completa
            </button>
            <button
              className="btn primary"
              onClick={() => setGuidedOpen(true)}
              title="Wizard guiado de 6 pasos · prepara paquete N1 automáticamente (recomendado)"
              style={{ background: "linear-gradient(135deg, #10b981, #22d3ee)", borderColor: "#10b981" }}
            >
              🧭 Crear ticket guiado
            </button>
            <button
              className="btn ghost"
              onClick={() => setCreateOpen(true)}
              title="Formulario rápido (1 paso) — para usuarios que ya saben qué información dar"
            >
              ＋ Crear rápido
            </button>
            <button className="btn ghost" onClick={refresh} disabled={loading}>
              {loading ? <><span className="spinner" /> cargando</> : "↻ Refrescar"}
            </button>
          </div>
        </div>

        {createdMsg && <div className="alert ok" style={{ marginTop: 8, marginBottom: 0, fontSize: 12.5 }}>{createdMsg}</div>}
        {error && <div className="alert error" style={{ marginTop: 8, marginBottom: 0 }}>{error}</div>}
      </div>

      {/* ── Body: 2 panes con scroll independiente ─────────────────── */}
      <div className="tickets-page-body">
        {/* Pane izquierdo: lista — scroll propio, no se mueve con el TCC */}
        <div className="tickets-page-pane is-list">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)", position: "sticky", top: 0, background: "rgba(19, 26, 48, 0.85)", backdropFilter: "blur(10px)", zIndex: 1 }}>
              {loading ? "Cargando…" : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
            </div>
            <div>
              {tickets.map((t) => {
                const active = t.key === selectedKey;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedKey(t.key)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: active ? "var(--accent-soft)" : "transparent",
                      border: 0, borderBottom: "1px solid var(--border-soft)",
                      color: "inherit", padding: "10px 14px", cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <div className="row between" style={{ gap: 6 }}>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--text-dim)" }}>{t.key}</span>
                      <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 13.5, marginTop: 4 }}>{t.title}</div>
                    <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      {t.assignee && <Badge variant="muted">@{t.assignee}</Badge>}
                      {t.sapModule && <Badge variant="muted">{t.sapModule}</Badge>}
                      {t.source === "user" && <Badge variant="info">creado</Badge>}
                      <TicketEstimateBadge estimate={t.estimatedResolution} />
                      {/* AIE v0.10 — badge compact de enrichment */}
                      <TicketEnrichmentBadge intelligence={t.intelligence} showLabel={false} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!provider?.jiraConfigured && (
            <div className="alert warn" style={{ marginTop: 12, fontSize: 11.5 }}>
              <b>Modo demo:</b> sin credenciales Jira en <code>.env</code>. Para conectar tu Jira real, agrega
              <code> JIRA_BASE_URL</code>, <code>JIRA_EMAIL</code>, <code>JIRA_API_TOKEN</code> y reinicia el backend.
            </div>
          )}
        </div>

        {/* Pane derecho: Ticket Command Center — scroll propio, no empuja la lista */}
        <div className="tickets-page-pane" id="tickets-detail-pane">
          {!selected && (
            <div className="card" style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Selecciona un ticket para ver su Command Center.
            </div>
          )}
          {selected && (
            <TicketCommandCenter
              ticket={selected}
              onTicketUpdated={(t) =>
                setTickets((cur) => cur.map((x) => x.key === t.key ? t : x))
              }
            />
          )}
        </div>
      </div>

      <CreateTicketModal
        open={createOpen}
        defaultReporter={authUser?.name || authUser?.email || null}
        onClose={() => setCreateOpen(false)}
        onCreated={(t) => {
          setCreateOpen(false);
          // Optimistic: meto el nuevo arriba sin esperar refresh, y refresh igual.
          setTickets((cur) => [t, ...cur]);
          setSelectedKey(t.key);
          const eta = t.estimatedResolution
            ? ` Estimación: ${t.estimatedResolution.totalMinHours}–${t.estimatedResolution.totalMaxHours}h (${t.estimatedResolution.confidence}).`
            : "";
          setCreatedMsg(`✓ Ticket ${t.key} creado.${eta}`);
          setTimeout(() => setCreatedMsg(null), 6000);
          refresh();
        }}
      />

      {demoOpen && (
        <GuidedAmsDemo onClose={() => { setDemoOpen(false); refresh(); }} />
      )}

      <GuidedTicketIntakeModal
        open={guidedOpen}
        defaultReporter={authUser?.name || authUser?.email || null}
        onClose={() => setGuidedOpen(false)}
        onCreated={(t, opts) => {
          setGuidedOpen(false);
          setTickets((cur) => [t, ...cur]);
          setSelectedKey(t.key);
          const tag = opts.waitingInformation
            ? ` · ⏳ Espera información`
            : ` · ✓ Listo para resolución N1`;
          setCreatedMsg(`✓ Ticket ${t.key} creado vía intake guiado${tag}.`);
          setTimeout(() => setCreatedMsg(null), 8000);
          refresh();
        }}
      />
    </div>
  );
}
