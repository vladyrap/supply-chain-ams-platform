"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  sapInboundApi, type InboundEvent, type InboundToken, type InboundSource,
} from "@/services/sap-inbound.api";

type Tab = "endpoints" | "events" | "tokens";

const SOURCE_LABEL: Record<InboundSource, string> = {
  idoc:        "IDoc",
  short_dump:  "Short dump (ST22)",
  oss_note:    "OSS Note aplicada",
  job_failure: "Falla de job (SM37)",
  transport:   "Transporte (STMS)",
  generic:     "Genérico",
};

const SOURCE_ICON: Record<InboundSource, string> = {
  idoc:        "📨",
  short_dump:  "💥",
  oss_note:    "📓",
  job_failure: "🛑",
  transport:   "🚛",
  generic:     "🔧",
};

const SEVERITY_VARIANT: Record<string, "ok" | "warn" | "error" | "info" | "muted"> = {
  info:     "info",
  warning:  "warn",
  error:    "error",
  critical: "error",
};

const BASE_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601";
const SOURCES: InboundSource[] = ["idoc", "short_dump", "oss_note", "job_failure", "transport", "generic"];

export default function SapInboundPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<Tab>("endpoints");
  const [events, setEvents] = useState<InboundEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filterSource, setFilterSource] = useState<InboundSource | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState<InboundEvent | null>(null);

  const [tokens, setTokens] = useState<InboundToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenSources, setNewTokenSources] = useState<string>("*");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    const r = await sapInboundApi.listEvents(filterSource !== "all" ? filterSource : undefined);
    if ("success" in r && r.success) setEvents(r.events);
    setEventsLoading(false);
  }, [filterSource]);

  const refreshTokens = useCallback(async () => {
    setTokensLoading(true);
    const r = await sapInboundApi.listTokens();
    if ("success" in r && r.success) setTokens(r.tokens);
    setTokensLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "events") refreshEvents();
    if (tab === "tokens") refreshTokens();
  }, [tab, refreshEvents, refreshTokens]);

  async function handleCreateToken() {
    if (!newTokenName.trim()) { toast.warn("Pon un nombre al token"); return; }
    const sources = newTokenSources.split(",").map((s) => s.trim()).filter(Boolean);
    const r = await sapInboundApi.createToken(newTokenName.trim(), sources);
    if ("success" in r && r.success) {
      toast.success("Token creado");
      setCreatedToken(r.token);
      setNewTokenName("");
      setNewTokenSources("*");
      refreshTokens();
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }

  async function handleDeleteToken(t: InboundToken) {
    if (!confirm(`¿Eliminar token "${t.name}"? Cualquier sistema SAP usándolo dejará de funcionar.`)) return;
    const r = await sapInboundApi.deleteToken(t.id);
    if ("success" in r && r.success) {
      toast.success("Eliminado");
      refreshTokens();
    }
  }

  return (
    <div>
      <div className="page-title">
        <h1>🏭 SAP Inbound — webhooks que recibe la plataforma</h1>
        <p>
          Configura sistemas SAP (vía ABAP / PI/PO / cron) para que envíen eventos
          (IDocs, short dumps, jobs fallidos, notas OSS aplicadas) y la plataforma
          los procese: crea incidentes, abre tickets MESA en N2 o genera KB drafts.
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Badge variant="info">6 endpoints disponibles</Badge>
        <Badge variant="tech">auth: X-AMS-Inbound-Token (sha256)</Badge>
        <Link href="/integrations" className="badge muted" style={{ textDecoration: "none", fontSize: 11 }}>
          ← volver a Integraciones
        </Link>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border-soft)" }}>
        {([
          ["endpoints", "📚 Endpoints + ejemplos"],
          ["events", `📨 Eventos recibidos (${events.length})`],
          ["tokens", `🔑 Tokens (${tokens.length})`],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: tab === id ? "var(--accent-soft)" : "transparent",
            border: "1px solid", borderColor: tab === id ? "rgba(91,141,239,0.35)" : "transparent",
            borderRadius: "6px 6px 0 0", padding: "6px 14px",
            color: tab === id ? "var(--text)" : "var(--text-soft)",
            cursor: "pointer", fontSize: 13, marginBottom: -1, fontFamily: "inherit",
            borderBottomColor: tab === id ? "var(--bg-card)" : "transparent",
          }}>{label}</button>
        ))}
      </div>

      {/* ENDPOINTS TAB */}
      {tab === "endpoints" && (
        <div className="col" style={{ gap: 14 }}>
          <div className="alert info">
            <b>Cómo conectar SAP:</b> en tu sistema SAP (vía clase ABAP HTTP cliente,
            transacción <code>SM59</code>, o PI/PO HTTP receiver), configura una llamada{" "}
            <code>POST</code> a uno de los endpoints abajo con header{" "}
            <code>X-AMS-Inbound-Token</code> (token que creas en la pestaña Tokens).
          </div>

          {SOURCES.map((src) => (
            <div key={src} className="card">
              <div className="row between" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>
                  <span style={{ marginRight: 8 }}>{SOURCE_ICON[src]}</span>
                  {SOURCE_LABEL[src]}
                </h3>
                <Badge variant="muted">{src}</Badge>
              </div>
              <div style={{ marginBottom: 8 }}>
                <code style={{ fontSize: 12, background: "var(--bg-elev)", padding: "3px 8px", borderRadius: 4 }}>
                  POST {BASE_URL}/api/sap/inbound/{src.replace("_", "-")}
                </code>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginBottom: 8 }}>
                {EFFECT_OF_SOURCE[src]}
              </div>
              <details>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-soft)" }}>Ejemplo curl</summary>
                <pre style={{
                  fontSize: 11, background: "var(--bg-elev)", padding: 10, borderRadius: 6,
                  overflow: "auto", marginTop: 6,
                }}>{exampleCurl(src)}</pre>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* EVENTS TAB */}
      {tab === "events" && (
        <>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={() => setFilterSource("all")} className={`btn ${filterSource === "all" ? "primary" : "ghost"}`} style={{ padding: "4px 12px" }}>
              Todos
            </button>
            {SOURCES.map((s) => (
              <button key={s} onClick={() => setFilterSource(s)} className={`btn ${filterSource === s ? "primary" : "ghost"}`} style={{ padding: "4px 12px" }}>
                {SOURCE_ICON[s]} {s}
              </button>
            ))}
            <button onClick={refreshEvents} className="btn ghost" disabled={eventsLoading} style={{ marginLeft: "auto" }}>
              {eventsLoading ? <><span className="spinner" /> cargando</> : "↻"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
                {events.length} evento{events.length === 1 ? "" : "s"}
              </div>
              <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {events.length === 0 && (
                  <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>
                    Sin eventos. Configura SAP para que envíe a esta plataforma usando los endpoints.
                  </div>
                )}
                {events.map((e) => {
                  const active = selectedEvent?.id === e.id;
                  return (
                    <button key={e.id} onClick={() => setSelectedEvent(e)} style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: active ? "var(--accent-soft)" : "transparent",
                      border: 0, borderBottom: "1px solid var(--border-soft)",
                      color: "inherit", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <div className="row between" style={{ marginBottom: 4 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <span>{SOURCE_ICON[e.source as InboundSource]}</span>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{e.title}</span>
                        </div>
                        {e.severity && <Badge variant={SEVERITY_VARIANT[e.severity] ?? "muted"}>{e.severity}</Badge>}
                      </div>
                      <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--text-dim)" }}>
                        <span>{e.sap_system ?? "—"}</span>
                        {e.sap_client && <span>· {e.sap_client}</span>}
                        <span style={{ marginLeft: "auto" }}>{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div className="row" style={{ gap: 4, marginTop: 4 }}>
                        {e.incident_id       && <Badge variant="info">→ incidente</Badge>}
                        {e.support_ticket_id && <Badge variant="warn">→ ticket</Badge>}
                        {e.kb_article_id     && <Badge variant="ok">→ KB</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card">
              {!selectedEvent && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Selecciona un evento.</div>}
              {selectedEvent && (
                <div className="col" style={{ gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>
                      {SOURCE_ICON[selectedEvent.source as InboundSource]} {selectedEvent.title}
                    </h3>
                    <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <Badge variant="muted">{selectedEvent.source}</Badge>
                      {selectedEvent.severity && <Badge variant={SEVERITY_VARIANT[selectedEvent.severity] ?? "muted"}>{selectedEvent.severity}</Badge>}
                      {selectedEvent.sap_system && <Badge variant="tech">{selectedEvent.sap_system}</Badge>}
                      {selectedEvent.sap_client && <Badge variant="info">cliente {selectedEvent.sap_client}</Badge>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
                      Recibido {new Date(selectedEvent.created_at).toLocaleString()}
                      {selectedEvent.received_from_ip && ` · desde ${selectedEvent.received_from_ip}`}
                      {selectedEvent.auth_token_hint && ` · token ${selectedEvent.auth_token_hint}`}
                    </div>
                  </div>

                  {selectedEvent.summary && (
                    <div className="alert info">{selectedEvent.summary}</div>
                  )}

                  {(selectedEvent.incident_id || selectedEvent.support_ticket_id || selectedEvent.kb_article_id) && (
                    <div>
                      <h4 style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-soft)" }}>Entidades creadas</h4>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        {selectedEvent.incident_id && (
                          <Link href="/history" className="badge info" style={{ textDecoration: "none" }}>
                            Incidente {selectedEvent.incident_id.slice(0, 8)}…
                          </Link>
                        )}
                        {selectedEvent.support_ticket_id && (
                          <Link href="/support-desk/tickets" className="badge warn" style={{ textDecoration: "none" }}>
                            Ticket MESA
                          </Link>
                        )}
                        {selectedEvent.kb_article_id && (
                          <Link href="/support-desk/kb" className="badge ok" style={{ textDecoration: "none" }}>
                            KB article
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-soft)" }}>Payload</h4>
                    <pre style={{
                      fontSize: 11.5, background: "var(--bg-elev)", padding: 10, borderRadius: 6,
                      overflow: "auto", maxHeight: 320, whiteSpace: "pre-wrap",
                    }}>{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TOKENS TAB */}
      {tab === "tokens" && (
        <>
          {!isAdmin && (
            <div className="alert warn" style={{ marginBottom: 14 }}>
              Gestión de tokens requiere rol <b>admin</b>. Solo puedes ver la lista.
            </div>
          )}

          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Crear nuevo token</h3>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <input value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} placeholder="Nombre (ej. 'S4P-CL10 prod')" style={{ flex: 1, minWidth: 220 }} disabled={!isAdmin} />
              <input value={newTokenSources} onChange={(e) => setNewTokenSources(e.target.value)} placeholder="sources: * o idoc,short_dump" style={{ width: 240 }} disabled={!isAdmin} />
              <button className="btn primary" onClick={handleCreateToken} disabled={!isAdmin || !newTokenName.trim()}>
                Crear token
              </button>
            </div>
            {createdToken && (
              <div className="alert warn" style={{ marginTop: 10 }}>
                <b>⚠️ Copia este token AHORA</b> — solo se muestra una vez:
                <pre style={{ background: "var(--bg-elev)", padding: 8, borderRadius: 6, fontSize: 12, marginTop: 8, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{createdToken}</pre>
                <button className="btn ghost" onClick={() => { navigator.clipboard.writeText(createdToken); toast.success("Copiado al portapapeles"); }} style={{ marginTop: 6 }}>
                  📋 Copiar
                </button>
                <button className="btn ghost" onClick={() => setCreatedToken(null)} style={{ marginTop: 6, marginLeft: 6 }}>
                  Cerrar
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
              {tokens.length} token{tokens.length === 1 ? "" : "s"}
            </div>
            {tokens.length === 0 && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>
                Sin tokens. Crea uno arriba para que tus sistemas SAP puedan enviar eventos.
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 500 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                        sources: {t.sources.join(", ")} · creado {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: 10, textAlign: "right", color: "var(--text-soft)", fontSize: 12 }}>
                      {t.use_count} usos
                      {t.last_used_at && <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>último {new Date(t.last_used_at).toLocaleString()}</div>}
                    </td>
                    <td style={{ padding: 10, textAlign: "right" }}>
                      {t.active ? <Badge variant="ok">activo</Badge> : <Badge variant="muted">desactivado</Badge>}
                    </td>
                    <td style={{ padding: 10, textAlign: "right" }}>
                      <button className="btn danger" onClick={() => handleDeleteToken(t)} disabled={!isAdmin} style={{ fontSize: 11, padding: "3px 8px" }}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const EFFECT_OF_SOURCE: Record<InboundSource, string> = {
  idoc:        "Crea un incidente en /history con el payload del IDoc como evidencia.",
  short_dump:  "Crea un ticket MESA prioritario asignado a N2_BASIS con el dump completo como evidencia.",
  oss_note:    "Genera un KB article draft con el número de nota OSS, síntomas y solución.",
  job_failure: "Crea un ticket MESA prioritario asignado a N2_BASIS.",
  transport:   "Solo registra el evento en el audit (no crea downstream).",
  generic:     "Solo registra el evento. Útil para flujos custom.",
};

function exampleCurl(source: InboundSource): string {
  const path = source.replace("_", "-");
  const body: Record<string, unknown> = {
    sap_system: "S4P-CL10",
    sap_client: "100",
    severity: source === "short_dump" ? "critical" : source === "job_failure" ? "error" : "info",
    title: examplesByTitle[source],
    summary: examplesBySummary[source],
    payload: examplesByPayload[source],
  };
  return `curl -X POST ${BASE_URL}/api/sap/inbound/${path} \\
  -H "Content-Type: application/json" \\
  -H "X-AMS-Inbound-Token: <tu_token_aqui>" \\
  -d '${JSON.stringify(body, null, 2)}'`;
}

const examplesByTitle: Record<InboundSource, string> = {
  idoc:        "DESADV 0000000412 falló en EDI_DOCUMENT_OPEN_FOR_PROCESS",
  short_dump:  "ASSERTION_FAILED en programa ZMM_OC_RELEASE",
  oss_note:    "Nota 3215789: corrección de pricing en SD",
  job_failure: "Job ZJOB_MRP_MAT_GROUP cancelado en SM37",
  transport:   "Transporte SAPK-001 movido a PRD",
  generic:     "Evento custom desde SAP",
};

const examplesBySummary: Record<InboundSource, string> = {
  idoc:        "El IDoc DESADV 412 no se pudo procesar. Error: estructura de segmento E1EDL20 incorrecta.",
  short_dump:  "ABAP runtime error ASSERTION_FAILED, user CB_AMSCL, programa ZMM_OC_RELEASE línea 245.",
  oss_note:    "Nota OSS 3215789 aplicada exitosamente. Corrige cálculo de impuestos en condiciones MWST.",
  job_failure: "Job ZJOB_MRP_MAT_GROUP cancelado con TIME_OUT después de 4h. Centro 1100, material grupo ELECTRONICS.",
  transport:   "Transporte SAPK-001 con cambios de customizing IMG/MM-PUR fue importado a PRD por basis@empresa.",
  generic:     "Payload libre.",
};

const examplesByPayload: Record<InboundSource, Record<string, unknown>> = {
  idoc: {
    idoc_number: "0000000412", idoc_type: "DESADV.DELVRY07",
    direction: "INBOUND", partner: "VEND_100001",
    error_segment: "E1EDL20", error_field: "VBELN",
    sap_module: "MM",
  },
  short_dump: {
    dump_id: "ABAP_ASSERTION_FAILED",
    program: "ZMM_OC_RELEASE", include: "ZMM_OC_RELEASE_F01",
    line: 245, user: "CB_AMSCL",
    timestamp: new Date().toISOString(),
    sap_module: "MM",
  },
  oss_note: {
    note: "3215789", note_type: "Correction",
    component: "SD-BF-PR",
    symptom: "MWST mal calculada cuando hay descuento por escalón.",
    solution: "Aplicar SNOTE 3215789 + transportar al sistema productivo.",
    sap_module: "SD",
  },
  job_failure: {
    job: "ZJOB_MRP_MAT_GROUP",
    job_count: "23145678",
    cancel_reason: "TIME_OUT", elapsed: "04:00:01",
    last_step: "ZMM_MRP_BATCH",
    plant: "1100", material_group: "ELECTRONICS",
    sap_module: "PP",
  },
  transport: {
    request: "SAPK-001", target_system: "PRD",
    user: "basis@empresa", description: "Cambios IMG/MM-PUR para nueva estrategia de liberación.",
  },
  generic: {
    custom_field_1: "valor",
    custom_field_2: 42,
  },
};
