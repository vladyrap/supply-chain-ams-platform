"use client";

// =============================================================================
// Clean Core · SAP real
// =============================================================================
// Consume el microservicio SAP Clean Core Connector (datos REALES). Flujo
// offline-first: registrar un sistema → subir la extracción del extractor ABAP
// (ZCC_CLEAN_CORE_EXTRACTOR) → ver hallazgos reales + descargar evidencia.
// No muestra datos mock: sin assessment, no hay hallazgos.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { SEVERITY_LABELS, SEVERITY_COLORS, STATUS_LABELS } from "@/lib/clean-core/engine";
import * as sap from "@/services/clean-core-sap.api";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronRight, Paperclip, Plug, Plus } from "lucide-react";

const DIM_LABELS: Record<string, string> = {
  custom_code: "Código Custom", extensibility: "Extensibilidad", integration: "Integración",
  configuration: "Configuración", data: "Datos", process: "Procesos",
};

export default function SapRealView() {
  const { tenant } = useTenant();
  const { effectiveUser } = usePermissions();
  const actor = effectiveUser?.email || "unknown";
  const tenantId = tenant?.id || "default";

  const configured = sap.isConnectorConfigured();
  const [systems, setSystems] = useState<sap.SapSystem[]>([]);
  const [systemId, setSystemId] = useState<string>("");
  const [assessments, setAssessments] = useState<sap.SapAssessment[]>([]);
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [findings, setFindings] = useState<sap.SapFinding[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState<{ dimension?: string; severity?: string; status?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Alta rápida de sistema (offline, sin credenciales)
  const [reg, setReg] = useState({ name: "", sid: "", system_type: "S4HANA" as "ECC" | "S4HANA" });

  const loadSystems = useCallback(async () => {
    const r = await sap.listSystems(actor, tenantId);
    if (r.ok) setSystems(r.data);
    else setMsg({ kind: "err", text: r.error });
  }, [actor, tenantId]);

  useEffect(() => { if (configured) loadSystems(); }, [configured, loadSystems]);

  const loadAssessments = useCallback(async (sid: string) => {
    const r = await sap.listAssessments(sid, actor, tenantId);
    if (r.ok) setAssessments(r.data);
  }, [actor, tenantId]);

  useEffect(() => { if (systemId) loadAssessments(systemId); else setAssessments([]); }, [systemId, loadAssessments]);

  const loadFindings = useCallback(async (aid: string) => {
    const f: Record<string, string> = {};
    if (filters.dimension) f.dimension = filters.dimension;
    if (filters.severity) f.severity = filters.severity;
    if (filters.status) f.status = filters.status;
    const r = await sap.listFindings(aid, f, actor, tenantId);
    if (r.ok) setFindings(r.data);
  }, [filters, actor, tenantId]);

  useEffect(() => { if (assessmentId) loadFindings(assessmentId); else setFindings([]); }, [assessmentId, loadFindings]);

  const assessment = assessments.find((a) => a.id === assessmentId) || null;

  async function doRegister() {
    if (!reg.name.trim() || !reg.sid.trim()) return;
    setBusy(true); setMsg(null);
    const r = await sap.registerSystem({ ...reg, connector_mode: "offline" }, actor, tenantId);
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: `Sistema ${r.data.name} registrado (modo offline).` }); setReg({ name: "", sid: "", system_type: "S4HANA" }); await loadSystems(); setSystemId(r.data.id); }
    else setMsg({ kind: "err", text: r.error });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !systemId) return;
    setBusy(true); setMsg(null);
    const r = await sap.runUpload(systemId, file, actor, tenantId);
    setBusy(false);
    if (r.ok) {
      setMsg({ kind: "ok", text: `Assessment ejecutado: índice ${r.data.index_current}, ${r.data.open_findings} hallazgos, ${r.data.objects_scanned} objetos.` });
      await loadAssessments(systemId);
      setAssessmentId(r.data.id);
    } else setMsg({ kind: "err", text: r.error });
  }

  if (!configured) {
    return (
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}><Plug size={16} /> Conector SAP no configurado</div>
        <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5 }}>
          Para conectar con un SAP real, desplegá el microservicio <b>SAP Clean Core Connector</b>
          {" "}y seteá <code>NEXT_PUBLIC_SAP_CONNECTOR_URL</code> (ej. <code>http://localhost:8600</code>).
          El servicio es de <b>solo lectura</b>: registrás el sistema, subís la extracción del
          extractor ABAP (o conectás por RFC) y obtenés hallazgos reales, descargables en
          JSON/CSV/Excel/PDF. Ver el repo <code>supply-chain-ams-sap-connector</code>.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {msg && (
        <div className="card" style={{ borderLeft: `3px solid ${msg.kind === "ok" ? "var(--ok)" : "var(--error)"}`, fontSize: 12.5, color: msg.kind === "ok" ? "var(--ok)" : "var(--error)" }}>
          {msg.kind === "ok" ? <><Check size={14} /> </> : <><AlertTriangle size={14} /> </>}{msg.text}
        </div>
      )}

      {/* Sistemas + alta rápida offline */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Sistema SAP</span>
            <select value={systemId} onChange={(e) => { setSystemId(e.target.value); setAssessmentId(""); }} style={selStyle}>
              <option value="">— elegí un sistema —</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.sid} · {s.system_type} · {s.connector_mode}</option>)}
            </select>
            {systemId && (
              <>
                <button onClick={() => fileRef.current?.click()} className="btn primary" disabled={busy} style={{ fontSize: 12 }}>
                  {busy ? <><span className="spinner" /> Procesando…</> : <><ArrowUp size={14} /> Subir extracción (.json)</>}
                </button>
                <input ref={fileRef} type="file" accept=".json,application/json" onChange={onUpload} style={{ display: "none" }} />
              </>
            )}
          </div>
        </div>

        {/* Alta rápida (offline) */}
        <details>
          <summary style={{ fontSize: 12, color: "var(--text-soft)", cursor: "pointer" }}><Plus size={14} /> Registrar sistema (offline, sin credenciales)</summary>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <input placeholder="Nombre (ej. Producción S/4)" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} style={inpStyle} />
            <input placeholder="SID (ej. S4P)" value={reg.sid} onChange={(e) => setReg({ ...reg, sid: e.target.value.toUpperCase().slice(0, 8) })} style={{ ...inpStyle, maxWidth: 110 }} />
            <select value={reg.system_type} onChange={(e) => setReg({ ...reg, system_type: e.target.value as "ECC" | "S4HANA" })} style={selStyle}>
              <option value="S4HANA">S/4HANA</option>
              <option value="ECC">ECC</option>
            </select>
            <button onClick={doRegister} className="btn ghost" disabled={busy || !reg.name.trim() || !reg.sid.trim()} style={{ fontSize: 12 }}>Registrar</button>
          </div>
        </details>
      </div>

      {/* Historial de assessments */}
      {systemId && assessments.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}><ChevronRight size={14} /> ASSESSMENTS · {assessments.length}</div>
          {assessments.map((a) => (
            <button key={a.id} onClick={() => setAssessmentId(a.id)}
              className={a.id === assessmentId ? "btn primary" : "btn ghost"}
              style={{ textAlign: "left", fontSize: 12, justifyContent: "space-between", display: "flex" }}>
              <span>{new Date(a.started_at).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · mandante {a.client} · {a.source}</span>
              <span>{a.status === "completed" ? `índice ${a.index_current}` : a.status}</span>
            </button>
          ))}
        </div>
      )}

      {/* Score + hallazgos del assessment seleccionado */}
      {assessment && assessment.status === "completed" && (
        <>
          <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Kpi label="Índice" value={assessment.index_current} big />
            <Kpi label="Potencial" value={assessment.index_potential} color="var(--ok)" />
            <Kpi label="Cloud-ready" value={assessment.cloud_ready_pct != null ? `${assessment.cloud_ready_pct}%` : "—"} color="var(--teal, #007d79)" />
            <Kpi label="Abiertos" value={assessment.open_findings} />
            <Kpi label="Críticos" value={assessment.critical_open} color={assessment.critical_open ? "var(--error)" : undefined} />
            <Kpi label="Esfuerzo" value={assessment.effort_hours_total != null ? `${assessment.effort_hours_total}h` : "—"} color="var(--accent)" />
            <Kpi label="Objetos" value={assessment.objects_scanned} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
              {(["json", "csv", "xlsx", "recommendations", "pdf"] as const).map((k) => (
                <a key={k} href={sap.downloadUrl(assessment.id, k)} className="btn ghost" style={{ fontSize: 11 }} target="_blank" rel="noreferrer"><ArrowDown size={14} /> {k === "recommendations" ? "recom." : k.toUpperCase()}</a>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filters.dimension || ""} onChange={(e) => setFilters({ ...filters, dimension: e.target.value || undefined })} style={selStyle}>
              <option value="">Todas las dimensiones</option>
              {Object.entries(DIM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.severity || ""} onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })} style={selStyle}>
              <option value="">Toda severidad</option>
              {(["critical", "high", "medium", "low"] as const).map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
            </select>
            <select value={filters.status || ""} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })} style={selStyle}>
              <option value="">Todo estado</option>
              {(["open", "in_progress", "resolved", "accepted_risk"] as const).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{findings.length} hallazgo(s)</span>
          </div>

          {/* Tabla de hallazgos reales */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {findings.length === 0 ? (
              <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5 }}>Sin hallazgos que coincidan.</div>
            ) : findings.map((f) => {
              const sc = SEVERITY_COLORS[f.severity];
              return (
                <div key={f.id} className="card" style={{ borderLeft: `3px solid ${sc}`, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>{f.object_name} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {f.object_type}{f.package ? ` · ${f.package}` : ""}</span></div>
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 1 }}>{DIM_LABELS[f.dimension] || f.dimension} · estrategia {f.clean_core_strategy} · {f.effort_hours}h{!f.cloud_ready && <span style={{ color: "#ff832b" }}> · <AlertTriangle size={14} /> no cloud-ready</span>}</div>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: sc, border: `1px solid ${sc}`, borderRadius: 4, padding: "1px 7px", textTransform: "uppercase", flexShrink: 0 }}>{SEVERITY_LABELS[f.severity]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.4 }}>{f.evidence}</div>
                  <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}><span style={{ color: "var(--accent)", fontWeight: 700 }}><Check size={14} /> </span>{f.recommendation}{f.reference && <span style={{ color: "var(--text-dim)" }}> · <Paperclip size={14} /> {f.reference}</span>}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, color, big }: { label: string; value: number | string | null; color?: string; big?: boolean }) {
  return (
    <div style={{ padding: "6px 12px", borderRadius: 6, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", minWidth: 70 }}>
      <div style={{ fontSize: 9.5, letterSpacing: 0.5, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: big ? 26 : 18, fontWeight: 800, color: color || "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{value ?? "—"}</div>
    </div>
  );
}

const selStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text)", fontSize: 12, cursor: "pointer" };
const inpStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text)", fontSize: 12, flex: 1, minWidth: 160 };
