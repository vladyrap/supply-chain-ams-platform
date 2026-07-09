"use client";

import { useMemo, useState } from "react";
import type { AmsPlaybook, PlaybookExecution } from "@/types/ams-modules";
import PlaybookExecutionChecklist from "./PlaybookExecutionChecklist";

interface Props {
  playbook: AmsPlaybook;
  executions: PlaybookExecution[];
  onClose: () => void;
  onToggleStep: (executionId: string, stepId: string) => void;
  onSetNote: (executionId: string, stepId: string, note: string) => void;
  onComplete: (executionId: string) => void;
  onAbandon: (executionId: string) => void;
  onStartNew: () => void;
}

export default function PlaybookDetailModal({
  playbook: p, executions, onClose, onToggleStep, onSetNote,
  onComplete, onAbandon, onStartNew,
}: Props) {
  const activeExecution = useMemo(() => executions.find((e) => e.status === "IN_PROGRESS"), [executions]);
  const [tab, setTab] = useState<"detail" | "execute" | "history">(activeExecution ? "execute" : "detail");

  function exportMarkdown() {
    const md = [
      `# ${p.title}`,
      ``,
      p.description,
      ``,
      `**Módulo:** ${p.sapModule} · **Severidad:** ${p.severity} · **SLA:** ${p.slaTargetMinutes} min`,
      `**Responsable:** ${p.responsibleRole} · **Owner:** ${p.owner}`,
      ``,
      `## Trigger`,
      p.triggerWhen,
      ``,
      `## Datos requeridos`,
      ...p.requiredData.map((d) => `- ${d}`),
      ``,
      `## Pasos`,
      ...p.steps.map((s) => `${s.order}. **${s.title}** _(${s.responsibleRole}, ${s.estimatedMinutes}min${s.evidenceRequired ? ", evidencia" : ""})_\n   ${s.description}`),
      ``,
      `## Reglas de escalamiento`,
      p.escalationRules,
      ``,
      `## Evidencia requerida`,
      ...p.evidenceRequired.map((e) => `- ${e}`),
      ``,
      `## Plantilla de comunicación`,
      "```",
      p.communicationTemplate,
      "```",
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${p.id}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
        <div className="tc-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              PLAYBOOK · {p.id} · {p.version}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>{p.title}</h2>
            <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap", fontSize: 11 }}>
              <span className="kanban-tag" style={{ borderColor: "rgba(250,77,86,0.4)", color: "#da1e28", background: "rgba(250,77,86,0.08)" }}>
                {p.severity}
              </span>
              <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#0284c7", background: "rgba(69,137,255,0.08)" }}>
                {p.sapModule}
              </span>
              <span style={{ color: "var(--text-dim)" }}>{p.process}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="row" style={{ gap: 4, padding: "0 16px", borderBottom: "1px solid var(--border-soft)" }}>
          {[
            { id: "detail", label: "📋 Detalle" },
            { id: "execute", label: activeExecution ? "▶ Checklist activo" : "▶ Ejecutar" },
            { id: "history", label: `📜 Historial (${executions.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as never)}
              className={`kn-tab ${tab === t.id ? "active" : ""}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="tc-modal-body">
          {tab === "detail" && (
            <div className="col" style={{ gap: 10 }}>
              <p style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{p.description}</p>
              <div className="lab-fb-block">
                <div className="lab-fb-block-head">▸ TRIGGER · cuándo aplicar</div>
                <div style={{ fontSize: 12.5 }}>{p.triggerWhen}</div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <div className="lab-fb-block" style={{ flex: 1, minWidth: 220 }}>
                  <div className="lab-fb-block-head">▸ DATOS REQUERIDOS</div>
                  <ul style={{ fontSize: 12, paddingLeft: 18, margin: 0 }}>
                    {p.requiredData.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
                <div className="lab-fb-block" style={{ flex: 1, minWidth: 220 }}>
                  <div className="lab-fb-block-head">▸ EVIDENCIA REQUERIDA</div>
                  <ul style={{ fontSize: 12, paddingLeft: 18, margin: 0 }}>
                    {p.evidenceRequired.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              </div>
              <div className="lab-fb-block">
                <div className="lab-fb-block-head">▸ PASOS · {p.steps.length}</div>
                <ol style={{ fontSize: 12, paddingLeft: 18, margin: 0 }}>
                  {p.steps.map((s) => (
                    <li key={s.id} style={{ marginBottom: 6 }}>
                      <b>{s.title}</b> <span style={{ color: "var(--text-dim)" }}>({s.responsibleRole}, {s.estimatedMinutes}min{s.evidenceRequired ? ", evidencia" : ""})</span>
                      <div style={{ color: "var(--text-soft)", marginTop: 2 }}>{s.description}</div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="lab-fb-block">
                <div className="lab-fb-block-head">▸ REGLAS DE ESCALAMIENTO</div>
                <div style={{ fontSize: 12 }}>{p.escalationRules}</div>
              </div>
              <div className="lab-fb-block">
                <div className="lab-fb-block-head">▸ PLANTILLA DE COMUNICACIÓN</div>
                <pre style={{ fontSize: 11.5, whiteSpace: "pre-wrap", margin: 0, color: "var(--text-soft)" }}>
                  {p.communicationTemplate}
                </pre>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--text-dim)" }}>
                <span>SLA: <b>{p.slaTargetMinutes} min</b></span>
                <span>Responsable: <b>{p.responsibleRole}</b></span>
                <span>Owner: <b>{p.owner}</b></span>
                <span>Versión: <b>{p.version}</b></span>
                {p.tags.length > 0 && (
                  <span>Tags: {p.tags.join(", ")}</span>
                )}
              </div>
            </div>
          )}

          {tab === "execute" && (
            <PlaybookExecutionChecklist
              playbook={p}
              execution={activeExecution ?? null}
              onStartNew={onStartNew}
              onToggleStep={onToggleStep}
              onSetNote={onSetNote}
              onComplete={onComplete}
              onAbandon={onAbandon}
            />
          )}

          {tab === "history" && (
            <div className="col" style={{ gap: 8 }}>
              {executions.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Sin ejecuciones previas.</div>
              ) : (
                executions.map((e) => (
                  <div key={e.id} className="lab-fb-block" style={{
                    borderLeft: `3px solid ${e.status === "COMPLETED" ? "#10b981" : e.status === "IN_PROGRESS" ? "#f1c21b" : "#fa4d56"}`,
                  }}>
                    <div className="row" style={{ gap: 8, fontSize: 11.5 }}>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text-dim)" }}>
                        {new Date(e.startedAt).toLocaleString("es-CL")}
                      </span>
                      <span>{e.startedBy}</span>
                      <span style={{ marginLeft: "auto" }}>
                        {e.completedSteps.length} / {p.steps.length} pasos · status <b>{e.status}</b>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={exportMarkdown}>↓ Exportar .md</button>
          <button className="btn ghost" onClick={onClose} style={{ marginLeft: "auto" }}>cerrar</button>
        </div>
      </div>
    </div>
  );
}
