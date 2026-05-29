"use client";

import { useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import type { Priority, GapStatus } from "@/types/training";
import { PRIORITY_COLORS, PRIORITY_LABELS, SAP_MODULES, SUPPLY_CHAIN_PROCESSES, GAP_STATUS_LABELS } from "@/types/training";
import { apiRunGapDetection, fetchTrainingSnapshot, type GapDetectionReport } from "@/services/training.api";

interface Props { ctx: UseAgentTraining }

const STATUS_COLORS: Record<GapStatus, string> = {
  OPEN:        "#ef4444",
  IN_PROGRESS: "#fbbf24",
  RESOLVED:    "#10b981",
  DISMISSED:   "#64748b",
};

export default function KnowledgeGaps({ ctx }: Props) {
  const [filter, setFilter] = useState<GapStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [report, setReport] = useState<GapDetectionReport | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [moduleId, setModuleId] = useState("MM");
  const [process, setProcess] = useState("Compras");
  const [priority, setPriority] = useState<Priority>("medium");
  const [action, setAction] = useState("");

  async function detectAuto() {
    setDetecting(true);
    setDetectError(null);
    const r = await apiRunGapDetection(14);
    if (r.ok) {
      setReport(r.report);
      // refrescar gaps desde backend para mostrar los recién creados
      const snap = await fetchTrainingSnapshot();
      if (snap.ok) {
        // Reemplazar via "createGap" no es ideal — el hook ya tiene los locales.
        // Simplemente recargamos página completa via storage-event para forzar reload.
        window.dispatchEvent(new CustomEvent("ams-training-changed"));
        // hack: si estamos en source backend, hacer un re-fetch manual
        // recargando el módulo. Mejor: el hook escucha el event y se rehidrata.
      }
    } else {
      setDetectError(r.error);
    }
    setDetecting(false);
  }

  function create() {
    if (!title.trim() || !action.trim()) return;
    ctx.createGap({
      title, description: desc, module: moduleId, process,
      priority, suggestedAction: action, status: "OPEN",
    });
    setTitle(""); setDesc(""); setAction("");
    setShowCreate(false);
  }

  const gaps = ctx.gaps.filter((g) => filter === "all" ? true : g.status === filter);
  const stats = {
    open:        ctx.gaps.filter((g) => g.status === "OPEN").length,
    inProgress:  ctx.gaps.filter((g) => g.status === "IN_PROGRESS").length,
    resolved:    ctx.gaps.filter((g) => g.status === "RESOLVED").length,
    dismissed:   ctx.gaps.filter((g) => g.status === "DISMISSED").length,
  };

  // sugerencias automáticas: módulos con baja cobertura
  const lowCoverage = ctx.metrics.coverageByModule.filter((c) => c.coverage < 50 && c.count > 0);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🚧</span> BRECHAS DE CONOCIMIENTO
        </div>
        <p className="settings-section-desc">
          Cada brecha es una oportunidad de mejora. Detectadas desde el simulador, baja cobertura por módulo o reportes manuales.
        </p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all",          label: "▸ Todas",           color: "#22d3ee", count: ctx.gaps.length },
            { id: "OPEN",         label: "Abiertas",          color: "#ef4444", count: stats.open },
            { id: "IN_PROGRESS",  label: "En curso",          color: "#fbbf24", count: stats.inProgress },
            { id: "RESOLVED",     label: "Resueltas",         color: "#10b981", count: stats.resolved },
            { id: "DISMISSED",    label: "Descartadas",       color: "#64748b", count: stats.dismissed },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id as never)}
              className={`ticket-filter ${filter === f.id ? "active" : ""}`}
              style={{ ["--filt-color" as never]: f.color }}>
              {f.label} <span className="ticket-filter-count">{f.count}</span>
            </button>
          ))}
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={detectAuto} disabled={detecting}
            title="Analiza tickets sin KB + feedback 👎 + cobertura baja → propone brechas">
            {detecting ? <><span className="spinner" /> detectando…</> : "🔮 Detectar brechas automáticamente"}
          </button>
          <button className="btn primary" onClick={() => setShowCreate(true)}>+ registrar brecha</button>
        </div>

        {report && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 12 }}>
            ✓ Análisis completado (últimos 14 días) · <b>{report.candidates}</b> candidatos detectados ·
            <b> {report.created}</b> nuevos creados · <b>{report.skipped}</b> ya existentes (deduplicado).
            Recargá la pestaña para ver los nuevos.
            <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              {report.bySource.map((s) => `${s.source}=${s.count}`).join(" · ")}
            </div>
          </div>
        )}
        {detectError && (
          <div className="alert error" style={{ marginTop: 10, fontSize: 12 }}>⚠ {detectError}</div>
        )}
      </div>

      {/* Sugerencias automáticas */}
      {lowCoverage.length > 0 && (
        <div className="card" style={{ borderLeft: "3px solid #f59e0b" }}>
          <div className="ticket-section-head">
            <span style={{ color: "#f59e0b" }}>💡</span> SUGERENCIAS AUTOMÁTICAS
          </div>
          <p className="settings-section-desc">
            Módulos con cobertura de publicación inferior al 50% — buenos candidatos para próximos esfuerzos de curación.
          </p>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {lowCoverage.map((c) => (
              <span key={c.module} className="kanban-tag" style={{ borderColor: "rgba(251,191,36,0.4)", color: "#fbbf24", background: "rgba(251,191,36,0.08)" }}>
                {c.module} · {c.coverage}% cobertura ({c.published}/{c.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {gaps.length === 0 ? (
        <div className="ticket-empty">
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 13.5 }}>Sin brechas en este filtro.</div>
        </div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {gaps.map((g) => {
            const sCol = STATUS_COLORS[g.status];
            return (
              <div key={g.id} className="lab-fb-card" style={{ ["--fb-color" as never]: PRIORITY_COLORS[g.priority] }}>
                <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{g.title}</span>
                  <span className="tc-pill" style={{ background: `${PRIORITY_COLORS[g.priority]}15`, border: `1px solid ${PRIORITY_COLORS[g.priority]}55`, color: PRIORITY_COLORS[g.priority] }}>
                    {PRIORITY_LABELS[g.priority]}
                  </span>
                  <span className="tc-pill" style={{ background: `${sCol}20`, border: `1px solid ${sCol}66`, color: sCol }}>
                    {GAP_STATUS_LABELS[g.status]}
                  </span>
                  <span className="kanban-tag" style={{ borderColor: "rgba(34,211,238,0.4)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>
                    {g.module} · {g.process}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>
                    {new Date(g.createdAt).toLocaleDateString("es-CL")}
                  </span>
                </div>
                {g.description && <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "0 0 6px", lineHeight: 1.5 }}>{g.description}</p>}
                <div className="lab-fb-block">
                  <div className="lab-fb-block-head">▸ ACCIÓN SUGERIDA</div>
                  <div style={{ fontSize: 12.5 }}>{g.suggestedAction}</div>
                </div>
                <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {g.status === "OPEN" && (
                    <button className="btn ghost" onClick={() => ctx.updateGap(g.id, { status: "IN_PROGRESS" })}>▶ tomar</button>
                  )}
                  {g.status !== "RESOLVED" && (
                    <button className="btn primary" onClick={() => ctx.resolveGap(g.id)} style={{ background: "#10b981", borderColor: "#10b981" }}>
                      ✓ marcar resuelta
                    </button>
                  )}
                  {g.status !== "DISMISSED" && g.status !== "RESOLVED" && (
                    <button className="btn ghost" onClick={() => ctx.dismissGap(g.id)}>✕ descartar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="tc-modal-back" onClick={() => setShowCreate(false)}>
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-head">
              <h2 style={{ margin: 0, fontSize: 16 }}>Registrar brecha</h2>
              <button onClick={() => setShowCreate(false)} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
            </div>
            <div className="tc-modal-body">
              <label className="tc-field">
                <span>Título</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Falta procedimiento para X" />
              </label>
              <label className="tc-field">
                <span>Descripción</span>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Módulo</span>
                  <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                    {SAP_MODULES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Proceso</span>
                  <select value={process} onChange={(e) => setProcess(e.target.value)}>
                    {SUPPLY_CHAIN_PROCESSES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Prioridad</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {Object.entries(PRIORITY_LABELS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                  </select>
                </label>
              </div>
              <label className="tc-field">
                <span>Acción sugerida</span>
                <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={3}
                  placeholder="Ej. Cargar guía paso a paso de X y validar con líder funcional." />
              </label>
            </div>
            <div className="tc-modal-foot">
              <button className="btn ghost" onClick={() => setShowCreate(false)}>cancelar</button>
              <button className="btn primary" onClick={create} disabled={!title.trim() || !action.trim()} style={{ marginLeft: "auto" }}>
                ✓ registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
