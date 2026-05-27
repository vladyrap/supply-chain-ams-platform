"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { listTickets, classifyTicket, getProviderStatus, type Ticket, type Classification } from "@/services/tickets.api";

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [source, setSource] = useState<"jira" | "mock" | null>(null);
  const [provider, setProvider] = useState<{ jiraConfigured: boolean; jiraReachable: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);

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

  async function handleClassify(t: Ticket) {
    setClassifying(true);
    setClassifyError(null);
    setClassification(null);
    const res = await classifyTicket(t.key);
    setClassifying(false);
    if ("success" in res && res.success) setClassification(res.classification);
    else setClassifyError("error" in res ? res.error : "Error");
  }

  return (
    <div>
      <div className="page-title">
        <h1>🎫 Tickets</h1>
        <p>Listado de tickets desde Jira (si hay credenciales) o set de demo. Cada ticket se puede clasificar con el Agente AMS.</p>
      </div>

      <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
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
        <button className="btn ghost" onClick={refresh} disabled={loading}>
          {loading ? <><span className="spinner" /> cargando</> : "↻ Refrescar"}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
        {/* Lista */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {loading ? "Cargando…" : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
          </div>
          <div style={{ maxHeight: "68vh", overflowY: "auto" }}>
            {tickets.map((t) => {
              const active = t.key === selectedKey;
              return (
                <button
                  key={t.key}
                  onClick={() => { setSelectedKey(t.key); setClassification(null); setClassifyError(null); }}
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
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    {t.assignee && <Badge variant="muted">@{t.assignee}</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle */}
        <div className="card">
          {!selected && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Selecciona un ticket.</div>}
          {selected && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--text-dim)" }}>{selected.key}</div>
                  <h3 style={{ margin: "2px 0 4px", fontSize: 16 }}>{selected.title}</h3>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                    <Badge variant={priorityVariant(selected.priority)}>{selected.priority}</Badge>
                    {selected.assignee && <Badge variant="muted">@{selected.assignee}</Badge>}
                    {selected.url && <a className="badge info" href={selected.url} target="_blank" rel="noopener noreferrer">↗ Jira</a>}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Descripción</h4>
                <div className="msg user">
                  <div className="body" style={{ whiteSpace: "pre-wrap" }}>{selected.description}</div>
                </div>
              </div>

              <div>
                <button
                  className="btn primary"
                  onClick={() => handleClassify(selected)}
                  disabled={classifying}
                >
                  {classifying ? <><span className="spinner" /> Clasificando con el agente…</> : "🤖 Clasificar con Agente AMS"}
                </button>
              </div>

              {classifyError && <div className="alert error">{classifyError}</div>}

              {classification && (
                <div>
                  <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 13, color: "var(--text-soft)" }}>Clasificación AMS sugerida</h4>
                    <Badge variant="tech">{classification.model}</Badge>
                    <Badge variant={
                      classification.confidence === "alta" ? "ok" :
                      classification.confidence === "media" ? "warn" :
                      classification.confidence === "baja" ? "error" : "muted"
                    }>
                      confianza: {classification.confidence}
                    </Badge>
                  </div>
                  <div className="msg agent">
                    <div className="body"><MarkdownView text={classification.response} /></div>
                  </div>
                  <div className="alert info" style={{ marginTop: 10, fontSize: 12 }}>
                    Esta sugerencia <b>no se envía al cliente automáticamente</b>. Requiere aprobación humana antes de comunicarla.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!provider?.jiraConfigured && (
        <div className="alert warn" style={{ marginTop: 14 }}>
          <b>Modo demo:</b> sin credenciales Jira en <code>.env</code>. Para conectar tu Jira real, agrega:
          <pre style={{ fontSize: 11, margin: "8px 0 0", overflow: "auto" }}>{`JIRA_BASE_URL=https://tuempresa.atlassian.net
JIRA_EMAIL=tu@empresa.com
JIRA_API_TOKEN=ATATT3xFf...
JIRA_PROJECT_KEY=AMS (opcional)`}</pre>
          y reinicia el backend.
        </div>
      )}
    </div>
  );
}
