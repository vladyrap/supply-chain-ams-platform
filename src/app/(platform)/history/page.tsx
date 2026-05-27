"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { listIncidents, getIncident, type IncidentSummary, type IncidentDetail } from "@/services/agent.api";
import type { SapModule, Environment } from "@/types";

const SAP_MODULES: ("ALL" | SapModule)[] = [
  "ALL", "NO_INFORMADO", "MM", "SD", "PP", "WM", "EWM",
  "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION",
];
const ENVS: ("ALL" | Environment)[] = ["ALL", "NO_INFORMADO", "DEV", "QA", "PRD", "SANDBOX"];

function confidenceVariant(c: string | null): "ok" | "warn" | "error" | "muted" {
  if (c === "alta") return "ok";
  if (c === "media") return "warn";
  if (c === "baja") return "error";
  return "muted";
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString();
}

export default function HistoryPage() {
  const [filterModule, setFilterModule] = useState<("ALL" | SapModule)>("ALL");
  const [filterEnv, setFilterEnv] = useState<("ALL" | Environment)>("ALL");
  const [filterClient, setFilterClient] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterHasImg, setFilterHasImg] = useState<"any" | "yes" | "no">("any");

  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const filters = useMemo(() => ({
    module: filterModule === "ALL" ? undefined : filterModule,
    environment: filterEnv === "ALL" ? undefined : filterEnv,
    client: filterClient.trim() || undefined,
    search: filterSearch.trim() || undefined,
    hasAttachments: filterHasImg === "any" ? undefined : filterHasImg === "yes",
    limit: 100,
  }), [filterModule, filterEnv, filterClient, filterSearch, filterHasImg]);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await listIncidents(filters);
    if (res.ok) setIncidents(res.incidents);
    else        setError(res.error);
    setLoading(false);
  }

  // Carga inicial + cuando cambian filtros (con debounce simple del search)
  useEffect(() => {
    const t = setTimeout(load, filterSearch ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterModule, filterEnv, filterClient, filterSearch, filterHasImg]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    getIncident(selectedId).then((r) => {
      if (cancelled) return;
      if (r.ok) setDetail(r.incident);
      else      setDetailError(r.error);
      setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  return (
    <div>
      <div className="page-title">
        <h1>Historial de incidentes</h1>
        <p>Consulta y filtra los incidentes registrados por el agente.</p>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 130 }}>
            <label className="lab">Módulo</label>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value as ("ALL" | SapModule))}>
              {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 130 }}>
            <label className="lab">Ambiente</label>
            <select value={filterEnv} onChange={(e) => setFilterEnv(e.target.value as ("ALL" | Environment))}>
              {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 130 }}>
            <label className="lab">Cliente</label>
            <input value={filterClient} onChange={(e) => setFilterClient(e.target.value)} placeholder="cualquiera" />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="lab">Buscar en mensaje</label>
            <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="ej. MIGO, error M7..." />
          </div>
          <div style={{ minWidth: 130 }}>
            <label className="lab">Con imágenes</label>
            <select value={filterHasImg} onChange={(e) => setFilterHasImg(e.target.value as "any" | "yes" | "no")}>
              <option value="any">cualquiera</option>
              <option value="yes">solo con imagen</option>
              <option value="no">solo sin imagen</option>
            </select>
          </div>
          <button className="btn ghost" onClick={load} disabled={loading}>
            {loading ? <><span className="spinner" /> filtrando</> : "↻ Refrescar"}
          </button>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>No pude leer el historial: {error}</div>}

      {/* Layout: lista a la izquierda, detalle a la derecha */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {loading ? "Cargando…" : `${incidents.length} incidente${incidents.length === 1 ? "" : "s"}`}
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {incidents.length === 0 && !loading && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>
                Sin incidentes con esos filtros.
              </div>
            )}
            {incidents.map((inc) => {
              const active = inc.id === selectedId;
              return (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: 0,
                    borderBottom: "1px solid var(--border-soft)",
                    color: "inherit",
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  aria-current={active ? "true" : undefined}
                >
                  <div className="row between" style={{ gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{fmt(inc.created_at)}</span>
                    <div className="row" style={{ gap: 6 }}>
                      {inc.attachments.length > 0 && <Badge variant="info">📎 {inc.attachments.length}</Badge>}
                      <Badge variant={confidenceVariant(inc.confidence)}>{inc.confidence ?? "—"}</Badge>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    color: active ? "var(--text)" : "var(--text-soft)",
                  }}>
                    {inc.message}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <Badge variant="muted">{inc.sap_module ?? "—"}</Badge>
                    <Badge variant="muted">{inc.environment ?? "—"}</Badge>
                    {inc.client_name && <Badge variant="muted">{inc.client_name}</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          {!selectedId && (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Selecciona un incidente para ver el detalle.
            </div>
          )}
          {selectedId && detailLoading && (
            <div><span className="spinner" /> Cargando detalle…</div>
          )}
          {selectedId && detailError && (
            <div className="alert error">No pude leer el detalle: {detailError}</div>
          )}
          {detail && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <Badge variant="info">{detail.sap_module ?? "—"}</Badge>
                <Badge variant="muted">{detail.environment ?? "—"}</Badge>
                {detail.client_name && <Badge variant="muted">{detail.client_name}</Badge>}
                <Badge variant={confidenceVariant(detail.confidence)}>
                  confianza: {detail.confidence ?? "—"}
                </Badge>
                {detail.model && <Badge variant="tech">{detail.model}</Badge>}
                <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{fmt(detail.created_at)}</span>
              </div>

              <div>
                <h4 style={{ margin: "4px 0", fontSize: 13, color: "var(--text-soft)" }}>Consulta</h4>
                <div className="msg user" style={{ marginTop: 4 }}>
                  <div className="body">{detail.message}</div>
                </div>
              </div>

              {detail.attachments.length > 0 && (
                <div>
                  <h4 style={{ margin: "4px 0", fontSize: 13, color: "var(--text-soft)" }}>
                    Adjuntos ({detail.attachments.length})
                  </h4>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 6,
                  }}>
                    {detail.attachments.map((a, i) => {
                      const dataUrl = a.dataBase64 ? `data:${a.mimeType};base64,${a.dataBase64}` : null;
                      return (
                        <div key={i} style={{ background: "var(--bg-elev)", padding: 4, borderRadius: 6 }}>
                          {dataUrl ? (
                            <a href={dataUrl} target="_blank" rel="noopener noreferrer" title={a.name}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={dataUrl} alt={a.name} style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 4 }} />
                            </a>
                          ) : (
                            <div style={{ height: 96, display: "grid", placeItems: "center", color: "var(--text-dim)", fontSize: 11 }}>
                              {a.name}
                            </div>
                          )}
                          <div style={{ fontSize: 10.5, color: "var(--text-soft)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.name}>
                            {a.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ margin: "4px 0", fontSize: 13, color: "var(--text-soft)" }}>Respuesta del agente</h4>
                <div className="msg agent" style={{ marginTop: 4 }}>
                  <div className="body">
                    {detail.response
                      ? <MarkdownView text={detail.response} />
                      : <span style={{ color: "var(--text-dim)" }}>(sin respuesta guardada)</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
