"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import {
  integrationsApi,
  type IntegrationDestination,
  type IntegrationDelivery,
  type DestinationType,
  type DestinationConfig,
  type SapAdapter,
} from "@/services/integrations.api";

type Tab = "destinations" | "deliveries" | "events";

const TYPE_BADGE: Record<DestinationType, "info" | "tech" | "ok" | "warn"> = {
  webhook: "info",
  slack:   "tech",
  email:   "ok",
  sap:     "warn",
};

const SAP_ADAPTER_LABEL: Record<SapAdapter, string> = {
  cloud_alm:    "SAP Cloud ALM Incident",
  s4_odata:     "S/4HANA OData genérico",
  btp_workflow: "SAP BTP Workflow",
  idoc_http:    "PI/PO IDoc HTTP receiver",
  solman:       "Solution Manager SOAP",
};

const SAP_ADAPTER_HINT: Record<SapAdapter, string> = {
  cloud_alm:    "POST JSON a Cloud ALM ITSM (/services/api/itsm/v1/incidents). Usa OAuth2 normalmente.",
  s4_odata:     "POST JSON a un endpoint OData de S/4HANA. Activa 'Fetch CSRF' si requiere x-csrf-token.",
  btp_workflow: "Dispara un workflow del Workflow Management Service. Usa OAuth2 con xsuaa.",
  idoc_http:    "Envía XML al receiver HTTP de PI/PO. Body por defecto: AmsEvent XML; configurable con template.",
  solman:       "POST SOAP a Service Desk Web Service. Body por defecto: <CreateNotification/>. SOAPAction configurable en headers.",
};

export default function IntegrationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("destinations");

  // destinations
  const [dests, setDests] = useState<IntegrationDestination[]>([]);
  const [destLoading, setDestLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // form state
  const [form, setForm] = useState<{
    name: string; type: DestinationType; eventFilter: string;
    url: string; secret: string; headersJson: string;
    slackUrl: string; slackChannel: string;
    emailTo: string; emailFrom: string; subjectPrefix: string;
    // SAP fields
    sapAdapter: SapAdapter; sapBaseUrl: string; sapPath: string;
    sapAuth: "basic" | "bearer" | "oauth2_client_credentials" | "none";
    sapUser: string; sapPass: string; sapBearer: string;
    sapTokenUrl: string; sapClientId: string; sapClientSecret: string;
    sapClient: string; sapFetchCsrf: boolean; sapBodyTemplate: string;
    active: boolean;
  }>({
    name: "", type: "webhook", eventFilter: "*",
    url: "", secret: "", headersJson: "",
    slackUrl: "", slackChannel: "",
    emailTo: "", emailFrom: "", subjectPrefix: "[AMS]",
    sapAdapter: "cloud_alm", sapBaseUrl: "", sapPath: "/services/api/itsm/v1/incidents",
    sapAuth: "basic", sapUser: "", sapPass: "", sapBearer: "",
    sapTokenUrl: "", sapClientId: "", sapClientSecret: "",
    sapClient: "", sapFetchCsrf: false, sapBodyTemplate: "",
    active: true,
  });

  // deliveries
  const [deliveries, setDeliveries] = useState<IntegrationDelivery[]>([]);
  const [delvLoading, setDelvLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed" | "pending">("all");

  // events catalog
  const [events, setEvents] = useState<{ name: string; description: string }[]>([]);

  const refreshDests = useCallback(async () => {
    setDestLoading(true);
    const r = await integrationsApi.listDestinations();
    if ("success" in r && r.success) setDests(r.destinations);
    else toast.error("error" in r ? r.error : "Error listando destinations");
    setDestLoading(false);
  }, [toast]);

  const refreshDeliveries = useCallback(async () => {
    setDelvLoading(true);
    const r = await integrationsApi.listDeliveries(
      statusFilter !== "all" ? { status: statusFilter } : undefined
    );
    if ("success" in r && r.success) setDeliveries(r.deliveries);
    setDelvLoading(false);
  }, [statusFilter]);

  useEffect(() => { refreshDests(); }, [refreshDests]);
  useEffect(() => {
    if (tab === "deliveries") refreshDeliveries();
    if (tab === "events" && events.length === 0) {
      integrationsApi.listEvents().then((r) => {
        if ("success" in r && r.success) setEvents(r.events);
      });
    }
  }, [tab, refreshDeliveries, events.length]);

  function resetForm() {
    setForm({
      name: "", type: "webhook", eventFilter: "*",
      url: "", secret: "", headersJson: "",
      slackUrl: "", slackChannel: "",
      emailTo: "", emailFrom: "", subjectPrefix: "[AMS]",
      sapAdapter: "cloud_alm", sapBaseUrl: "", sapPath: "/services/api/itsm/v1/incidents",
      sapAuth: "basic", sapUser: "", sapPass: "", sapBearer: "",
      sapTokenUrl: "", sapClientId: "", sapClientSecret: "",
      sapClient: "", sapFetchCsrf: false, sapBodyTemplate: "",
      active: true,
    });
    setEditId(null);
  }

  function startEdit(d: IntegrationDestination) {
    setEditId(d.id);
    setShowCreate(true);
    const cfg = d.config as unknown as Record<string, unknown>;
    setForm({
      name: d.name,
      type: d.type,
      eventFilter: d.event_filter.join(","),
      url: (cfg.url as string) ?? "",
      secret: (cfg.secret as string) ?? "",
      headersJson: cfg.headers ? JSON.stringify(cfg.headers, null, 2) : "",
      slackUrl: (cfg.webhookUrl as string) ?? "",
      slackChannel: (cfg.channel as string) ?? "",
      emailTo: Array.isArray(cfg.to) ? (cfg.to as string[]).join(", ") : "",
      emailFrom: (cfg.from as string) ?? "",
      subjectPrefix: (cfg.subject_prefix as string) ?? "[AMS]",
      sapAdapter: (cfg.adapter as SapAdapter) ?? "cloud_alm",
      sapBaseUrl: (cfg.baseUrl as string) ?? "",
      sapPath: (cfg.path as string) ?? "",
      sapAuth: (cfg.auth as "basic" | "bearer" | "oauth2_client_credentials" | "none") ?? "basic",
      sapUser: (cfg.username as string) ?? "",
      sapPass: (cfg.password as string) ?? "",
      sapBearer: (cfg.bearerToken as string) ?? "",
      sapTokenUrl: (cfg.oauthTokenUrl as string) ?? "",
      sapClientId: (cfg.oauthClientId as string) ?? "",
      sapClientSecret: (cfg.oauthClientSecret as string) ?? "",
      sapClient: (cfg.sapClient as string) ?? "",
      sapFetchCsrf: !!cfg.fetchCsrf,
      sapBodyTemplate: (cfg.bodyTemplate as string) ?? "",
      active: d.active,
    });
  }

  function buildConfig(): DestinationConfig | null {
    if (form.type === "webhook") {
      if (!/^https?:\/\//.test(form.url)) {
        toast.error("URL del webhook debe empezar con http:// o https://");
        return null;
      }
      let headers: Record<string, string> | undefined;
      if (form.headersJson.trim()) {
        try { headers = JSON.parse(form.headersJson); } catch { toast.error("headers no es JSON válido"); return null; }
      }
      return { url: form.url, headers, secret: form.secret || undefined };
    }
    if (form.type === "slack") {
      if (!/^https:\/\/hooks\.slack\.com\//.test(form.slackUrl)) {
        toast.error("URL debe ser https://hooks.slack.com/...");
        return null;
      }
      return { webhookUrl: form.slackUrl, channel: form.slackChannel || undefined };
    }
    if (form.type === "email") {
      const to = form.emailTo.split(/[,;\s]+/).filter((x) => x.includes("@"));
      if (to.length === 0) { toast.error("Lista de destinatarios vacía"); return null; }
      return { to, from: form.emailFrom || undefined, subject_prefix: form.subjectPrefix || undefined };
    }
    if (form.type === "sap") {
      if (!/^https?:\/\//.test(form.sapBaseUrl)) {
        toast.error("baseUrl SAP debe empezar con http:// o https://");
        return null;
      }
      if (!form.sapPath.trim()) { toast.error("Falta el path del endpoint SAP"); return null; }
      return {
        adapter: form.sapAdapter,
        baseUrl: form.sapBaseUrl,
        path: form.sapPath,
        auth: form.sapAuth,
        username: form.sapAuth === "basic" ? form.sapUser : undefined,
        password: form.sapAuth === "basic" ? form.sapPass : undefined,
        bearerToken: form.sapAuth === "bearer" ? form.sapBearer : undefined,
        oauthTokenUrl:    form.sapAuth === "oauth2_client_credentials" ? form.sapTokenUrl : undefined,
        oauthClientId:    form.sapAuth === "oauth2_client_credentials" ? form.sapClientId : undefined,
        oauthClientSecret:form.sapAuth === "oauth2_client_credentials" ? form.sapClientSecret : undefined,
        sapClient: form.sapClient || undefined,
        fetchCsrf: form.sapAdapter === "s4_odata" ? form.sapFetchCsrf : undefined,
        bodyTemplate: form.sapBodyTemplate || undefined,
      };
    }
    return null;
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.warn("Falta el nombre"); return; }
    const cfg = buildConfig();
    if (!cfg) return;
    const event_filter = form.eventFilter.split(",").map((s) => s.trim()).filter(Boolean);
    if (editId) {
      const r = await integrationsApi.updateDestination(editId, {
        name: form.name, config: cfg, event_filter, active: form.active,
      });
      if ("success" in r && r.success) { toast.success("Actualizado"); setShowCreate(false); resetForm(); refreshDests(); }
      else toast.error("error" in r ? r.error : "Error");
    } else {
      const r = await integrationsApi.createDestination({
        name: form.name, type: form.type, config: cfg, event_filter, active: form.active,
      });
      if ("success" in r && r.success) { toast.success("Destination creada"); setShowCreate(false); resetForm(); refreshDests(); }
      else toast.error("error" in r ? r.error : "Error");
    }
  }

  async function handleDelete(d: IntegrationDestination) {
    if (!confirm(`¿Eliminar "${d.name}"?`)) return;
    const r = await integrationsApi.deleteDestination(d.id);
    if ("success" in r && r.success) { toast.success("Eliminada"); refreshDests(); }
    else toast.error("error" in r ? r.error : "Error");
  }

  async function handleTest(d: IntegrationDestination) {
    toast.info(`Enviando test a ${d.name}…`);
    const r = await integrationsApi.testDestination(d.id);
    if ("success" in r && r.success) {
      if (r.result.ok) toast.success(`Test OK${r.result.httpStatus ? ` (HTTP ${r.result.httpStatus})` : ""}`);
      else toast.error(`Test falló: ${r.result.error ?? "?"}`);
      refreshDests();
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }

  async function handleToggleActive(d: IntegrationDestination) {
    const r = await integrationsApi.updateDestination(d.id, { active: !d.active });
    if ("success" in r && r.success) refreshDests();
  }

  return (
    <div>
      <div className="page-title">
        <h1>🔌 Integraciones</h1>
        <p>Notifica a Slack, Email, SAP o un webhook propio cuando ocurren eventos en la plataforma (ticket escalado, reunión procesada, KB aprobada, etc.).</p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/integrations/sap-inbound" className="btn" style={{ textDecoration: "none" }}>
          🏭 Ver SAP Inbound (recibir de SAP) →
        </Link>
      </div>

      <div className="row" style={{ gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border-soft)" }}>
        {([
          ["destinations", `📡 Destinations (${dests.length})`],
          ["deliveries", `📜 Entregas`],
          ["events", `📚 Eventos disponibles`],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? "var(--accent-soft)" : "transparent",
              border: "1px solid",
              borderColor: tab === id ? "rgba(91,141,239,0.35)" : "transparent",
              borderRadius: "6px 6px 0 0",
              padding: "6px 14px",
              color: tab === id ? "var(--text)" : "var(--text-soft)",
              cursor: "pointer", fontSize: 13,
              borderBottomColor: tab === id ? "var(--bg-card)" : "transparent",
              marginBottom: -1, fontFamily: "inherit",
            }}
          >{label}</button>
        ))}
      </div>

      {/* DESTINATIONS */}
      {tab === "destinations" && (
        <>
          <div className="row" style={{ marginBottom: 12, gap: 8 }}>
            <button className="btn primary" onClick={() => { resetForm(); setShowCreate(!showCreate); }}>
              {showCreate ? "✕ Cerrar" : "➕ Nueva destination"}
            </button>
            <button className="btn ghost" onClick={refreshDests} disabled={destLoading}>↻</button>
          </div>

          {showCreate && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{editId ? "Editar destination" : "Nueva destination"}</h3>
              <div className="col" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label className="lab">Nombre</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: #soporte-ams (Slack)" />
                  </div>
                  <div style={{ width: 160 }}>
                    <label className="lab">Tipo</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DestinationType })} disabled={!!editId}>
                      <option value="webhook">Webhook</option>
                      <option value="slack">Slack</option>
                      <option value="email">Email</option>
                      <option value="sap">SAP</option>
                    </select>
                  </div>
                  <div style={{ width: 220 }}>
                    <label className="lab">Eventos (comma-separated, * = todos)</label>
                    <input value={form.eventFilter} onChange={(e) => setForm({ ...form, eventFilter: e.target.value })} placeholder="ticket.*, kb.approved" />
                  </div>
                </div>

                {form.type === "webhook" && (
                  <>
                    <div>
                      <label className="lab">URL</label>
                      <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://api.tuempresa.com/ams/webhook" />
                    </div>
                    <div>
                      <label className="lab">Secret HMAC (opcional)</label>
                      <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="firma SHA-256 en header X-Ams-Signature" />
                    </div>
                    <div>
                      <label className="lab">Headers extra (JSON, opcional)</label>
                      <textarea value={form.headersJson} onChange={(e) => setForm({ ...form, headersJson: e.target.value })} placeholder='{"Authorization": "Bearer ..."}' style={{ minHeight: 60 }} />
                    </div>
                  </>
                )}

                {form.type === "slack" && (
                  <>
                    <div>
                      <label className="lab">Incoming Webhook URL</label>
                      <input value={form.slackUrl} onChange={(e) => setForm({ ...form, slackUrl: e.target.value })} placeholder="https://hooks.slack.com/services/T.../B.../xxx" />
                    </div>
                    <div>
                      <label className="lab">Canal (opcional, sobrescribe el del webhook)</label>
                      <input value={form.slackChannel} onChange={(e) => setForm({ ...form, slackChannel: e.target.value })} placeholder="#soporte-ams" />
                    </div>
                    <div className="alert info" style={{ fontSize: 12 }}>
                      Crea un Incoming Webhook en <code>https://api.slack.com/messaging/webhooks</code> y pega la URL acá.
                    </div>
                  </>
                )}

                {form.type === "email" && (
                  <>
                    <div>
                      <label className="lab">Destinatarios (uno por línea o coma-separados)</label>
                      <textarea value={form.emailTo} onChange={(e) => setForm({ ...form, emailTo: e.target.value })} placeholder="lider.ams@empresa.com, n2.mm@empresa.com" style={{ minHeight: 60 }} />
                    </div>
                    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="lab">From (opcional, sobrescribe SMTP_FROM)</label>
                        <input value={form.emailFrom} onChange={(e) => setForm({ ...form, emailFrom: e.target.value })} placeholder="ams-bot@empresa.com" />
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <label className="lab">Prefijo del asunto</label>
                        <input value={form.subjectPrefix} onChange={(e) => setForm({ ...form, subjectPrefix: e.target.value })} placeholder="[AMS]" />
                      </div>
                    </div>
                    <div className="alert warn" style={{ fontSize: 12 }}>
                      El backend necesita SMTP configurado: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASSWORD</code> en <code>.env</code>. Sin esto, el envío falla con mensaje claro pero no rompe el flujo.
                    </div>
                  </>
                )}

                {form.type === "sap" && (
                  <>
                    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <div style={{ width: 240 }}>
                        <label className="lab">Adapter SAP</label>
                        <select value={form.sapAdapter} onChange={(e) => setForm({ ...form, sapAdapter: e.target.value as SapAdapter })}>
                          {(Object.keys(SAP_ADAPTER_LABEL) as SapAdapter[]).map((a) => (
                            <option key={a} value={a}>{SAP_ADAPTER_LABEL[a]}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="lab">Base URL SAP</label>
                        <input value={form.sapBaseUrl} onChange={(e) => setForm({ ...form, sapBaseUrl: e.target.value })} placeholder="https://my-s4.cloud.sap" />
                      </div>
                      <div style={{ width: 120 }}>
                        <label className="lab">sap-client</label>
                        <input value={form.sapClient} onChange={(e) => setForm({ ...form, sapClient: e.target.value })} placeholder="100" />
                      </div>
                    </div>
                    <div>
                      <label className="lab">Path del endpoint</label>
                      <input value={form.sapPath} onChange={(e) => setForm({ ...form, sapPath: e.target.value })} placeholder="/services/api/itsm/v1/incidents" />
                    </div>
                    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <div style={{ width: 200 }}>
                        <label className="lab">Auth</label>
                        <select value={form.sapAuth} onChange={(e) => setForm({ ...form, sapAuth: e.target.value as "basic" | "bearer" | "oauth2_client_credentials" | "none" })}>
                          <option value="basic">Basic auth</option>
                          <option value="bearer">Bearer token</option>
                          <option value="oauth2_client_credentials">OAuth2 client credentials</option>
                          <option value="none">Sin auth (no recomendado)</option>
                        </select>
                      </div>
                    </div>
                    {form.sapAuth === "basic" && (
                      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <label className="lab">Usuario</label>
                          <input value={form.sapUser} onChange={(e) => setForm({ ...form, sapUser: e.target.value })} />
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <label className="lab">Contraseña</label>
                          <input type="password" value={form.sapPass} onChange={(e) => setForm({ ...form, sapPass: e.target.value })} />
                        </div>
                      </div>
                    )}
                    {form.sapAuth === "bearer" && (
                      <div>
                        <label className="lab">Bearer token</label>
                        <input type="password" value={form.sapBearer} onChange={(e) => setForm({ ...form, sapBearer: e.target.value })} />
                      </div>
                    )}
                    {form.sapAuth === "oauth2_client_credentials" && (
                      <>
                        <div>
                          <label className="lab">Token URL</label>
                          <input value={form.sapTokenUrl} onChange={(e) => setForm({ ...form, sapTokenUrl: e.target.value })} placeholder="https://my-btp.authentication.sap.hana.ondemand.com/oauth/token" />
                        </div>
                        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <label className="lab">Client ID</label>
                            <input value={form.sapClientId} onChange={(e) => setForm({ ...form, sapClientId: e.target.value })} />
                          </div>
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <label className="lab">Client Secret</label>
                            <input type="password" value={form.sapClientSecret} onChange={(e) => setForm({ ...form, sapClientSecret: e.target.value })} />
                          </div>
                        </div>
                      </>
                    )}
                    {form.sapAdapter === "s4_odata" && (
                      <label className="toggle">
                        <input type="checkbox" checked={form.sapFetchCsrf} onChange={(e) => setForm({ ...form, sapFetchCsrf: e.target.checked })} />
                        <span className="track" />
                        <span>Fetch CSRF token antes del POST (recomendado para OData escritura)</span>
                      </label>
                    )}
                    <div>
                      <label className="lab">Body template (opcional, usa {"{{event}}, {{data.code}}"} etc.)</label>
                      <textarea value={form.sapBodyTemplate} onChange={(e) => setForm({ ...form, sapBodyTemplate: e.target.value })} placeholder='Sin esto, se usa el formato por defecto del adapter elegido.' style={{ minHeight: 80, fontFamily: "ui-monospace, monospace", fontSize: 12 }} />
                    </div>
                    <div className="alert info" style={{ fontSize: 12 }}>
                      <b>Adapter "{SAP_ADAPTER_LABEL[form.sapAdapter]}"</b>: {SAP_ADAPTER_HINT[form.sapAdapter]}
                    </div>
                  </>
                )}

                <label className="toggle">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span className="track" />
                  <span>Activa</span>
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn primary" onClick={handleSubmit}>{editId ? "Guardar cambios" : "Crear"}</button>
                  <button className="btn ghost" onClick={() => { setShowCreate(false); resetForm(); }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {dests.length === 0 && !destLoading && (
            <div className="card" style={{ color: "var(--text-dim)", fontSize: 13 }}>
              No hay destinations configuradas. Crea la primera para que la plataforma empiece a notificar eventos hacia afuera.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
            {dests.map((d) => {
              const cfg = d.config as unknown as Record<string, unknown>;
              const target = d.type === "email" ? (Array.isArray(cfg.to) ? (cfg.to as string[]).join(", ") : "—")
                          : d.type === "slack" ? (cfg.channel as string) || (cfg.webhookUrl as string)?.slice(-12)
                          : (cfg.url as string);
              return (
                <div key={d.id} className="card" style={{ padding: 14 }}>
                  <div className="row between" style={{ marginBottom: 6, gap: 8 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <Badge variant={TYPE_BADGE[d.type]}>{d.type}</Badge>
                      {d.active ? <Badge variant="ok">activa</Badge> : <Badge variant="muted">pausada</Badge>}
                      {d.last_status === "ok" && <Badge variant="ok">último ok</Badge>}
                      {d.last_status === "error" && <Badge variant="error">último error</Badge>}
                    </div>
                  </div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{d.name}</h3>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={target}>{target}</div>
                  <div className="row" style={{ gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {d.event_filter.map((f) => <span key={f} className="badge muted" style={{ fontSize: 10 }}>{f}</span>)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)", marginBottom: 8 }}>
                    {d.delivery_count} envíos · {d.error_count} errores
                    {d.last_used_at && ` · último ${new Date(d.last_used_at).toLocaleString()}`}
                  </div>
                  {d.last_error && (
                    <div className="alert error" style={{ fontSize: 11, marginBottom: 8 }}>
                      {d.last_error.slice(0, 200)}
                    </div>
                  )}
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => handleTest(d)}>🧪 Test</button>
                    <button className="btn ghost" onClick={() => handleToggleActive(d)}>{d.active ? "Pausar" : "Activar"}</button>
                    <button className="btn ghost" onClick={() => startEdit(d)}>Editar</button>
                    <button className="btn danger" onClick={() => handleDelete(d)}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DELIVERIES */}
      {tab === "deliveries" && (
        <>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {(["all", "sent", "failed", "pending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`btn ${statusFilter === s ? "primary" : "ghost"}`}
                style={{ padding: "4px 12px" }}
              >{s}</button>
            ))}
            <button onClick={refreshDeliveries} className="btn ghost" disabled={delvLoading} style={{ marginLeft: "auto" }}>↻</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {deliveries.length === 0 && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>
                Aún no hay entregas. Crea una destination y dispara un evento (ej. resolver un ticket de la mesa, escalar otro).
              </div>
            )}
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {deliveries.map((d) => (
                <div key={d.id} style={{ borderBottom: "1px solid var(--border-soft)", padding: "10px 14px" }}>
                  <div className="row between" style={{ gap: 8, flexWrap: "wrap" }}>
                    <div className="row" style={{ gap: 6 }}>
                      <Badge variant={d.status === "sent" ? "ok" : d.status === "failed" ? "error" : "warn"}>{d.status}</Badge>
                      <code style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{d.event_type}</code>
                      {d.http_status && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>HTTP {d.http_status}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  {d.response_excerpt && (
                    <pre style={{
                      fontSize: 11, color: "var(--text-soft)", marginTop: 6,
                      background: "var(--bg-elev)", padding: 8, borderRadius: 4,
                      whiteSpace: "pre-wrap", maxHeight: 80, overflow: "auto",
                    }}>{d.response_excerpt}</pre>
                  )}
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--text-soft)" }}>ver payload</summary>
                    <pre style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 6, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(d.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* EVENTS CATALOG */}
      {tab === "events" && (
        <div className="card">
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>Eventos que la plataforma emite</h3>
          <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 0 }}>
            Usa estos nombres en el filtro de eventos de tus destinations. Patrón: <code>*</code> (todos),{" "}
            <code>prefijo.*</code> (ej. <code>ticket.*</code>), o nombre exacto.
          </p>
          <div className="col" style={{ gap: 6 }}>
            {events.map((e) => (
              <div key={e.name} className="row" style={{ gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border-soft)" }}>
                <code style={{ background: "var(--bg-elev)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{e.name}</code>
                <span style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{e.description}</span>
              </div>
            ))}
            {events.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Cargando…</div>}
          </div>

          <div className="alert info" style={{ marginTop: 14 }}>
            <b>Probar un evento manualmente:</b> usa el botón 🧪 Test de una destination en la pestaña Destinations.
            El payload de prueba es <code>{`{ event: "test", data: { message: "..." } }`}</code>.
          </div>
        </div>
      )}
    </div>
  );
}
