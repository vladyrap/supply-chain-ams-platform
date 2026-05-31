"use client";

import { useMemo, useState } from "react";
import { useTimeEstimator } from "@/hooks/useTimeEstimator";
import {
  ESTIMATE_TYPE_LABELS, ESTIMATE_TYPE_ICONS, COMPLEXITY_LABELS,
  SEVERITY_LABELS, URGENCY_LABELS, CONFIDENCE_LABELS, PROFILE_LABELS,
  STATUS_LABELS, ESTIMATE_TYPES, COMPLEXITY_LEVELS, SEVERITY_LEVELS,
  URGENCY_LEVELS, ENVIRONMENT_LEVELS,
  type EstimateInput, type EstimateType, type TimeEstimate,
  type ComplexityLevel, type SeverityLevel, type UrgencyLevel,
  type EnvironmentLevel, type EstimateStatus,
} from "@/types/estimation";
import MarkdownView from "@/components/agent/MarkdownView";

const SAP_MODULES = ["MM", "SD", "PP", "WM", "EWM", "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION"];
const SERVICE_LEVELS = ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"];

type Tab = "new" | "history";

const EMPTY: EstimateInput = {
  title: "",
  description: "",
  sourceType: "manual",
  sapModule: "MM",
  process: "",
  estimateType: "INCIDENT_RESOLUTION",
  complexity: "MEDIUM",
  severity: "MEDIUM",
  urgency: "NORMAL",
  environment: "QA",
  serviceLevel: "STANDARD",
  requiresDevelopment: false,
  requiresIntegration: false,
  requiresTransport: true,
  requiresUAT: true,
  requiresApproval: false,
  hasDocumentation: false,
  hasPlaybook: false,
  hasPublishedKnowledge: false,
  isProductive: false,
  isRepeatedIncident: false,
};

function confidenceColor(level: "LOW" | "MEDIUM" | "HIGH"): string {
  if (level === "HIGH") return "#10b981";
  if (level === "LOW") return "#ef4444";
  return "#fbbf24";
}
function statusColor(s: EstimateStatus): string {
  switch (s) {
    case "DRAFT":     return "#64748b";
    case "GENERATED": return "#22d3ee";
    case "REVIEWED":  return "#a855f7";
    case "APPROVED":  return "#10b981";
    case "REJECTED":  return "#ef4444";
    case "EXPORTED":  return "#fbbf24";
  }
}

export default function TimeEstimatorCenter() {
  const hook = useTimeEstimator();
  const [tab, setTab] = useState<Tab>("new");
  const [input, setInput] = useState<EstimateInput>(EMPTY);
  const [preview, setPreview] = useState<TimeEstimate | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<EstimateType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EstimateStatus | "all">("all");

  function update<K extends keyof EstimateInput>(k: K, v: EstimateInput[K]) {
    setInput((cur) => ({ ...cur, [k]: v }));
  }

  function generate() {
    if (!input.title.trim()) { alert("Falta el título de la estimación"); return; }
    const e = hook.generate(input);
    setPreview(e);
    setTab("history");
  }

  function resetForm() { setInput(EMPTY); setPreview(null); }

  async function handleCopy(id: string) {
    const ok = await hook.copyClientResponse(id);
    setCopyMsg(ok ? "✓ Respuesta al cliente copiada" : "⚠ No se pudo copiar");
    setTimeout(() => setCopyMsg(null), 2500);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hook.estimates.filter((e) => {
      if (filterType !== "all" && e.estimateType !== filterType) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (q && !e.title.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [hook.estimates, filterType, filterStatus, search]);

  const totalHrs = hook.estimates.reduce((s, e) => s + e.estimatedMaxHours, 0);
  const approvedCount = hook.estimates.filter((e) => e.status === "APPROVED").length;

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>TIME · ESTIMATOR · AMS</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>⏱ Estimador de Tiempos</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Convierte un requerimiento o incidente en una banda horas/días con fases, perfiles, riesgos y respuesta al cliente.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{hook.estimates.length}</div>
              <div className="kanban-stat-lbl">ESTIMACIONES</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{approvedCount}</div>
              <div className="kanban-stat-lbl">APROBADAS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{Math.round(totalHrs)}h</div>
              <div className="kanban-stat-lbl">TOTAL TECHO</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <button className={`btn ${tab === "new" ? "primary" : "ghost"}`} onClick={() => setTab("new")}>＋ Nueva estimación</button>
        <button className={`btn ${tab === "history" ? "primary" : "ghost"}`} onClick={() => setTab("history")}>📜 Historial ({hook.estimates.length})</button>
      </div>

      {tab === "new" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
          {/* Form */}
          <div className="card">
            <div className="ticket-section-head"><span style={{ color: "var(--accent)" }}>📝</span> DATOS DE LA ESTIMACIÓN</div>

            <div className="col" style={{ gap: 10 }}>
              <label className="tc-field">
                <span>Título *</span>
                <input value={input.title} onChange={(e) => update("title", e.target.value)}
                  placeholder="ej. Error en liberación de OC para centro 1100" />
              </label>

              <label className="tc-field">
                <span>Descripción</span>
                <textarea value={input.description ?? ""} onChange={(e) => update("description", e.target.value)}
                  rows={3} placeholder="Contexto, síntoma, ambientes afectados, transacciones involucradas" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="tc-field">
                  <span>Tipo de estimación *</span>
                  <select value={input.estimateType} onChange={(e) => update("estimateType", e.target.value as EstimateType)}>
                    {ESTIMATE_TYPES.map((t) => (
                      <option key={t} value={t}>{ESTIMATE_TYPE_ICONS[t]} {ESTIMATE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </label>
                <label className="tc-field">
                  <span>Módulo SAP</span>
                  <select value={input.sapModule ?? ""} onChange={(e) => update("sapModule", e.target.value)}>
                    {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="tc-field">
                  <span>Proceso</span>
                  <input value={input.process ?? ""} onChange={(e) => update("process", e.target.value)} placeholder="ej. Liberación OC" />
                </label>
                <label className="tc-field">
                  <span>Service Level</span>
                  <select value={input.serviceLevel ?? "STANDARD"} onChange={(e) => update("serviceLevel", e.target.value)}>
                    {SERVICE_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <label className="tc-field">
                  <span>Complejidad</span>
                  <select value={input.complexity ?? "MEDIUM"} onChange={(e) => update("complexity", e.target.value as ComplexityLevel)}>
                    {COMPLEXITY_LEVELS.map((c) => <option key={c} value={c}>{COMPLEXITY_LABELS[c]}</option>)}
                  </select>
                </label>
                <label className="tc-field">
                  <span>Severidad</span>
                  <select value={input.severity ?? "MEDIUM"} onChange={(e) => update("severity", e.target.value as SeverityLevel)}>
                    {SEVERITY_LEVELS.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                  </select>
                </label>
                <label className="tc-field">
                  <span>Urgencia</span>
                  <select value={input.urgency ?? "NORMAL"} onChange={(e) => update("urgency", e.target.value as UrgencyLevel)}>
                    {URGENCY_LEVELS.map((u) => <option key={u} value={u}>{URGENCY_LABELS[u]}</option>)}
                  </select>
                </label>
                <label className="tc-field">
                  <span>Ambiente</span>
                  <select value={input.environment ?? "NO_INFORMADO"} onChange={(e) => update("environment", e.target.value as EnvironmentLevel)}>
                    {ENVIRONMENT_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </label>
              </div>

              <div className="row" style={{ flexWrap: "wrap", gap: 14, padding: "8px 0" }}>
                <Toggle label="Requiere desarrollo ABAP/BTP"        v={!!input.requiresDevelopment} on={(v) => update("requiresDevelopment", v)} />
                <Toggle label="Requiere integración cross-system"   v={!!input.requiresIntegration} on={(v) => update("requiresIntegration", v)} />
                <Toggle label="Requiere transporte"                 v={!!input.requiresTransport}   on={(v) => update("requiresTransport", v)} />
                <Toggle label="Requiere UAT con key user"           v={!!input.requiresUAT}         on={(v) => update("requiresUAT", v)} />
                <Toggle label="Requiere aprobación CAB"             v={!!input.requiresApproval}    on={(v) => update("requiresApproval", v)} />
                <Toggle label="Tiene documentación funcional"       v={!!input.hasDocumentation}    on={(v) => update("hasDocumentation", v)} />
                <Toggle label="Tiene playbook AMS aplicable"        v={!!input.hasPlaybook}         on={(v) => update("hasPlaybook", v)} />
                <Toggle label="Tiene conocimiento curado publicado" v={!!input.hasPublishedKnowledge} on={(v) => update("hasPublishedKnowledge", v)} />
                <Toggle label="Toca productivo"                     v={!!input.isProductive}        on={(v) => update("isProductive", v)} />
                <Toggle label="Incidente recurrente"                v={!!input.isRepeatedIncident}  on={(v) => update("isRepeatedIncident", v)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="tc-field">
                  <span>Fecha objetivo (opcional)</span>
                  <input type="date" value={input.targetDate ?? ""} onChange={(e) => update("targetDate", e.target.value || undefined)} />
                </label>
                <label className="tc-field">
                  <span>Creado por</span>
                  <input value={input.createdBy ?? ""} onChange={(e) => update("createdBy", e.target.value)} placeholder="Consultor AMS" />
                </label>
              </div>

              <label className="tc-field">
                <span>Notas internas</span>
                <textarea value={input.internalNotes ?? ""} onChange={(e) => update("internalNotes", e.target.value)} rows={2}
                  placeholder="Notas no visibles al cliente" />
              </label>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={resetForm}>↻ limpiar</button>
              <button className="btn primary" onClick={generate} style={{ marginLeft: "auto" }}>
                ⚡ Estimar
              </button>
            </div>
          </div>

          {/* Preview lateral con cheat sheet */}
          <div className="card">
            <div className="ticket-section-head"><span style={{ color: "var(--accent)" }}>💡</span> CÓMO ESTIMA</div>
            <p className="settings-section-desc">
              El motor es <strong>determinístico</strong>: combina horas base por tipo con multiplicadores de complejidad,
              severidad, urgencia y ambiente, y luego suma/resta horas por requerimientos (desarrollo, integración, UAT)
              o por activos disponibles (playbook, conocimiento curado, recurrencia).
            </p>
            <ul style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6, paddingLeft: 18 }}>
              <li>📈 <strong>Banda mín/máx</strong> en lugar de un número único.</li>
              <li>🎯 <strong>Confianza</strong> calculada según datos faltantes.</li>
              <li>🧱 <strong>Fases</strong> ya escaladas por los multiplicadores.</li>
              <li>👥 <strong>Perfiles</strong> sugeridos para conformar equipo.</li>
              <li>✉️ <strong>Respuesta al cliente</strong> lista para enviar.</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }}>
          {/* Lista */}
          <div className="card">
            <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="ticket-section-head" style={{ marginBottom: 0 }}>
                <span style={{ color: "var(--accent)" }}>📜</span> ESTIMACIONES · {filtered.length}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value as never)}>
                  <option value="all">Todos los tipos</option>
                  {ESTIMATE_TYPES.map((t) => <option key={t} value={t}>{ESTIMATE_TYPE_LABELS[t]}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as never)}>
                  <option value="all">Todos los estados</option>
                  {(Object.keys(STATUS_LABELS) as EstimateStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ minWidth: 160 }} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", textAlign: "center", padding: 30 }}>
                Aún no hay estimaciones. Pasá a <em>Nueva estimación</em> para crear la primera.
              </div>
            ) : (
              <div className="col" style={{ gap: 6, maxHeight: 560, overflowY: "auto", marginTop: 10 }}>
                {filtered.map((e) => {
                  const isOpen = preview?.id === e.id;
                  return (
                    <button key={e.id} onClick={() => setPreview(e)}
                      className={`ticket-row ${isOpen ? "active" : ""}`}
                      style={{ ["--prio-color" as never]: confidenceColor(e.confidence), textAlign: "left", width: "100%" }}>
                      <span style={{ fontSize: 18 }}>{ESTIMATE_TYPE_ICONS[e.estimateType]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                          {ESTIMATE_TYPE_LABELS[e.estimateType]} · {e.sapModule || "—"} · {e.estimatedMinHours}–{e.estimatedMaxHours}h
                        </div>
                      </div>
                      <span className="pill" style={{ background: statusColor(e.status), color: "#0b1220", fontSize: 10 }}>{STATUS_LABELS[e.status]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalle */}
          <div>
            {preview ? (
              <div className="card" style={{ borderLeft: `3px solid ${confidenceColor(preview.confidence)}` }}>
                <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div className="ticket-section-head" style={{ marginBottom: 4 }}>
                      <span style={{ color: confidenceColor(preview.confidence) }}>⏱</span> {preview.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      {ESTIMATE_TYPE_LABELS[preview.estimateType]} · {preview.sapModule || "—"} · {new Date(preview.createdAt).toLocaleString("es-CL")}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn ghost" onClick={() => handleCopy(preview.id)} style={{ padding: "4px 10px", fontSize: 11 }}>📋 Respuesta cliente</button>
                    <button className="btn ghost" onClick={() => hook.exportMarkdown(preview.id)} style={{ padding: "4px 10px", fontSize: 11 }}>↓ Markdown</button>
                    <button className="btn ghost" onClick={() => { if (confirm("¿Eliminar estimación?")) { hook.deleteEstimate(preview.id); setPreview(null); } }} style={{ padding: "4px 10px", fontSize: 11, color: "#ef4444" }}>🗑</button>
                  </div>
                </div>

                {copyMsg && <div className="alert ok" style={{ marginTop: 8, fontSize: 12 }}>{copyMsg}</div>}

                {/* Banda principal */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                  <BigStat label="HORAS" value={`${preview.estimatedMinHours}–${preview.estimatedMaxHours}h`} accent="#22d3ee" />
                  <BigStat label="DÍAS HÁBILES" value={`${preview.estimatedMinDays}–${preview.estimatedMaxDays}`} accent="#a855f7" />
                  <BigStat label="SEMANAS" value={`~${preview.estimatedWeeks}`} accent="#fbbf24" />
                  <BigStat label="CONFIANZA" value={`${CONFIDENCE_LABELS[preview.confidence]} · ${preview.confidenceScore}/100`} accent={confidenceColor(preview.confidence)} />
                </div>

                {/* Status changer */}
                <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-dim)", alignSelf: "center" }}>Workflow:</span>
                  {(Object.keys(STATUS_LABELS) as EstimateStatus[]).map((s) => (
                    <button key={s} onClick={() => hook.setStatus(preview.id, s)}
                      className={`btn ghost ${preview.status === s ? "primary" : ""}`}
                      style={{ padding: "4px 10px", fontSize: 11 }}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                {/* Fases */}
                <div className="ticket-section-head" style={{ marginTop: 16 }}>🧱 FASES</div>
                <div className="col" style={{ gap: 6 }}>
                  {preview.phaseBreakdown.map((p, i) => (
                    <div key={p.id} className="lab-fb-block" style={{ borderLeft: "3px solid #22d3ee" }}>
                      <div className="row between" style={{ alignItems: "center" }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{i + 1}. {p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{p.minHours}h–{p.maxHours}h · {PROFILE_LABELS[p.ownerProfile]}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 4 }}>{p.description}</div>
                      {p.deliverables.length > 0 && (
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                          <strong>Entregables:</strong> {p.deliverables.join(", ")}
                        </div>
                      )}
                      {p.risks.length > 0 && (
                        <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 4 }}>
                          ⚠ {p.risks.join("; ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Perfiles */}
                {preview.requiredProfiles.length > 0 && (
                  <>
                    <div className="ticket-section-head" style={{ marginTop: 16 }}>👥 PERFILES SUGERIDOS</div>
                    <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                      {preview.requiredProfiles.map((p) => (
                        <span key={p} className="pill" style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid #a855f7" }}>
                          {PROFILE_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Supuestos / riesgos / dependencias / missing */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                  <ListBox title="✅ Supuestos" items={preview.assumptions} color="#10b981" />
                  <ListBox title="⚠ Riesgos" items={preview.risks} color="#fbbf24" />
                  <ListBox title="🔗 Dependencias" items={preview.dependencies} color="#22d3ee" />
                  <ListBox title="❓ Información requerida" items={preview.missingData} color="#ef4444" />
                </div>

                {/* Plan */}
                <div className="ticket-section-head" style={{ marginTop: 16 }}>📋 PLAN DETALLADO</div>
                <div style={{ padding: 12, background: "rgba(15,23,42,0.45)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
                  <MarkdownView text={preview.suggestedPlan} />
                </div>

                {/* Respuesta cliente */}
                <div className="ticket-section-head" style={{ marginTop: 16 }}>✉️ RESPUESTA SUGERIDA AL CLIENTE</div>
                <div style={{ padding: 12, background: "rgba(15,23,42,0.45)", border: "1px solid var(--border-soft)", borderRadius: 6, fontSize: 12.5, whiteSpace: "pre-wrap" }}>
                  {preview.clientResponse}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>
                Seleccioná una estimación del listado para ver el detalle.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text-soft)" }}>
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />
      {label}
    </label>
  );
}

function BigStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      background: "rgba(15,23,42,0.55)", border: `1px solid ${accent}40`,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ListBox({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="lab-fb-block" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6, color }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>—</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "var(--text-soft)", lineHeight: 1.5 }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
    </div>
  );
}
