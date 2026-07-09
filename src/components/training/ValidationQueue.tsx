"use client";

import { useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import type { KnowledgeItem } from "@/types/training";
import { STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, KNOWLEDGE_STATUS_LABELS } from "@/types/training";

interface Props { ctx: UseAgentTraining; currentUserName?: string }

export default function ValidationQueue({ ctx, currentUserName = "Validador AMS" }: Props) {
  const [filter, setFilter] = useState<"all" | "functional" | "technical" | "critical">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KnowledgeItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const queue = ctx.knowledge.filter((k) => {
    if (k.status === "PUBLISHED" || k.status === "ARCHIVED" || k.status === "REJECTED") return false;
    if (filter === "functional") return !k.functionalValidatedBy;
    if (filter === "technical")  return !!k.functionalValidatedBy && !k.technicalValidatedBy;
    if (filter === "critical")   return k.priority === "critical";
    return true;
  });

  function approveFunctional(item: KnowledgeItem) {
    ctx.validateKnowledgeItem(item.id, "functional", currentUserName);
    showToast("✓ Validación funcional aplicada.");
  }
  function approveTechnical(item: KnowledgeItem) {
    ctx.validateKnowledgeItem(item.id, "technical", currentUserName);
    showToast("✓ Validación técnica aplicada.");
  }
  function publishNow(item: KnowledgeItem) {
    const r = ctx.publishKnowledgeItem(item.id);
    if (r.ok) showToast(`🚀 Publicado: ${item.title.slice(0, 40)}`);
    else showToast(`⚠ ${r.reason}`);
  }
  function reject(item: KnowledgeItem) {
    if (!rejectReason.trim()) { showToast("Indicá la razón del rechazo."); return; }
    ctx.rejectKnowledgeItem(item.id, rejectReason);
    setRejectTarget(null);
    setRejectReason("");
    showToast("Rechazado.");
  }
  function markCritical(item: KnowledgeItem) {
    ctx.updateKnowledgeItem(item.id, { priority: "critical" });
    showToast("Marcado como crítico.");
  }
  function askCorrection(item: KnowledgeItem) {
    ctx.updateKnowledgeItem(item.id, { status: "DRAFT" });
    showToast("Devuelto a borrador para corrección.");
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {toast && <div className="alert ok">{toast}</div>}

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>✓</span> COLA DE VALIDACIÓN · DOBLE FILTRO
        </div>
        <p className="settings-section-desc">
          Cada ítem requiere validación funcional + técnica. Una vez aprobado en ambas, queda listo para publicar a la próxima versión del agente.
        </p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all",         label: "▸ Todos",                color: "#4589ff", count: queue.length },
            { id: "functional",  label: "Pendiente funcional",    color: "#8a6d00", count: ctx.knowledge.filter((k) => !k.functionalValidatedBy && k.status !== "PUBLISHED" && k.status !== "ARCHIVED" && k.status !== "REJECTED").length },
            { id: "technical",   label: "Pendiente técnica",      color: "#a855f7", count: ctx.knowledge.filter((k) => k.functionalValidatedBy && !k.technicalValidatedBy && k.status !== "PUBLISHED" && k.status !== "ARCHIVED" && k.status !== "REJECTED").length },
            { id: "critical",    label: "🔥 Críticos",            color: "#fa4d56", count: ctx.knowledge.filter((k) => k.priority === "critical" && k.status !== "PUBLISHED" && k.status !== "ARCHIVED" && k.status !== "REJECTED").length },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id as never)}
              className={`ticket-filter ${filter === f.id ? "active" : ""}`}
              style={{ ["--filt-color" as never]: f.color }}>
              {f.label} <span className="ticket-filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {queue.length === 0 && (
        <div className="ticket-empty">
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 13.5 }}>Cola limpia. Nada pendiente de validar.</div>
        </div>
      )}

      <div className="col" style={{ gap: 10 }}>
        {queue.map((k) => {
          const riskColor = PRIORITY_COLORS[k.priority];
          const stageColor =
            k.validationStage === "FULLY_VALIDATED" ? "#10b981" :
            k.validationStage === "PENDING_TECHNICAL" ? "#a855f7" :
            k.validationStage === "PENDING_FUNCTIONAL" ? "#f1c21b" : "#64748b";
          return (
            <div key={k.id} className="lab-fb-card" style={{ ["--fb-color" as never]: riskColor }}>
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{k.title}</span>
                <span className="kanban-tag" style={{ borderColor: `${stageColor}55`, color: stageColor, background: `${stageColor}10` }}>
                  {k.validationStage.replace("_", " ").toLowerCase()}
                </span>
                <span className="tc-pill" style={{ background: `${STATUS_COLORS[k.status]}20`, border: `1px solid ${STATUS_COLORS[k.status]}66`, color: STATUS_COLORS[k.status] }}>
                  {KNOWLEDGE_STATUS_LABELS[k.status]}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>
                  score <b style={{ color: k.score >= 80 ? "#10b981" : k.score >= 60 ? "#f1c21b" : "#fa4d56" }}>{k.score}</b>
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "0 0 8px", lineHeight: 1.5 }}>{k.summary}</p>

              <div className="tc-validation-grid">
                <div>
                  <strong>Módulo</strong> · {k.module} · {k.process}
                </div>
                <div>
                  <strong>Riesgo</strong> · <span style={{ color: riskColor }}>{PRIORITY_LABELS[k.priority]}</span>
                </div>
                <div>
                  <strong>Funcional</strong> · {k.functionalValidatedBy ?? <span style={{ color: "#8a6d00" }}>pendiente</span>}
                </div>
                <div>
                  <strong>Técnica</strong> · {k.technicalValidatedBy ?? <span style={{ color: "#a855f7" }}>pendiente</span>}
                </div>
                <div>
                  <strong>Fuente</strong> · {k.source}
                </div>
                <div>
                  <strong>Autor</strong> · {k.author}
                </div>
              </div>

              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {!k.functionalValidatedBy && (
                  <button className="btn ghost" style={{ borderColor: "#8a6d00", color: "#8a6d00" }} onClick={() => approveFunctional(k)}>
                    ✓ aprobar funcional
                  </button>
                )}
                {!k.technicalValidatedBy && (
                  <button className="btn ghost" style={{ borderColor: "#a855f7", color: "#7c3aed" }} onClick={() => approveTechnical(k)}>
                    ✓ aprobar técnica
                  </button>
                )}
                <button className="btn ghost" onClick={() => askCorrection(k)}>↩ pedir corrección</button>
                <button className="btn ghost" style={{ borderColor: "#fa4d56", color: "#da1e28" }} onClick={() => setRejectTarget(k)}>✕ rechazar</button>
                {k.priority !== "critical" && (
                  <button className="btn ghost" onClick={() => markCritical(k)}>🔥 marcar crítico</button>
                )}
                <button className="btn primary" onClick={() => publishNow(k)} disabled={k.validationStage !== "FULLY_VALIDATED"}>
                  🚀 publicar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {rejectTarget && (
        <div className="tc-modal-back" onClick={() => setRejectTarget(null)}>
          <div className="tc-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-head">
              <h2 style={{ margin: 0, fontSize: 16, color: "#da1e28" }}>Rechazar conocimiento</h2>
              <button onClick={() => setRejectTarget(null)} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
            </div>
            <div className="tc-modal-body">
              <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "0 0 8px" }}>
                Vas a rechazar <b>{rejectTarget.title}</b>. El ítem queda excluído del entrenamiento del agente.
              </p>
              <label className="tc-field">
                <span>Razón del rechazo</span>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
                  placeholder="Ej. contenido incorrecto, duplicado, no aplica al cliente, etc." />
              </label>
            </div>
            <div className="tc-modal-foot">
              <button className="btn ghost" onClick={() => setRejectTarget(null)}>cancelar</button>
              <button className="btn primary" style={{ background: "#fa4d56", borderColor: "#fa4d56", marginLeft: "auto" }}
                onClick={() => reject(rejectTarget)}>
                ✕ rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
