"use client";

import type { AmsPlaybook, PlaybookExecution } from "@/types/ams-modules";

interface Props {
  playbook: AmsPlaybook;
  execution: PlaybookExecution | null;
  onStartNew: () => void;
  onToggleStep: (executionId: string, stepId: string) => void;
  onSetNote: (executionId: string, stepId: string, note: string) => void;
  onComplete: (executionId: string) => void;
  onAbandon: (executionId: string) => void;
}

export default function PlaybookExecutionChecklist({
  playbook: p, execution, onStartNew,
  onToggleStep, onSetNote, onComplete, onAbandon,
}: Props) {
  if (!execution) {
    return (
      <div className="ticket-empty" style={{ padding: 30 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>▶</div>
        <div style={{ fontSize: 13.5, color: "var(--text-soft)", marginBottom: 16 }}>
          No hay ejecución activa. Comenzá una nueva para usar el checklist.
        </div>
        <button className="btn primary" onClick={onStartNew}
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderColor: "#10b981" }}>
          ▶ Iniciar ejecución
        </button>
      </div>
    );
  }

  const completed = execution.completedSteps.length;
  const total = p.steps.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed >= total;

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="lab-fb-block" style={{ borderLeft: "3px solid #10b981" }}>
        <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
            EXEC · {execution.id.slice(0, 8)} · {new Date(execution.startedAt).toLocaleString("es-CL")}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700 }}>
            {completed} / {total} · {progress}%
          </span>
        </div>
        <div className="tc-bar">
          <div className="tc-bar-fill" style={{ width: `${progress}%`, background: allDone ? "#10b981" : "#4589ff" }} />
        </div>
      </div>

      {p.steps.map((step) => {
        const done = execution.completedSteps.includes(step.id);
        const note = execution.notes[step.id] ?? "";
        return (
          <div key={step.id} className="lab-fb-block" style={{ borderLeft: `3px solid ${done ? "#10b981" : "#64748b"}` }}>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <input type="checkbox" checked={done}
                onChange={() => onToggleStep(execution.id, step.id)}
                style={{ marginTop: 3, transform: "scale(1.3)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>
                  {step.order}. {step.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 2 }}>{step.description}</div>
                <div className="row" style={{ gap: 6, fontSize: 10.5, color: "var(--text-dim)", marginTop: 4, flexWrap: "wrap" }}>
                  <span>👤 {step.responsibleRole}</span>
                  <span>⏱ {step.estimatedMinutes}m</span>
                  {step.evidenceRequired && <span style={{ color: "#f1c21b" }}>📎 evidencia</span>}
                </div>
                <textarea value={note}
                  onChange={(e) => onSetNote(execution.id, step.id, e.target.value)}
                  placeholder="Notas / evidencia / hallazgos…"
                  rows={2}
                  style={{ width: "100%", marginTop: 6, fontSize: 11.5 }} />
              </div>
            </div>
          </div>
        );
      })}

      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button className="btn ghost" onClick={() => onAbandon(execution.id)} style={{ borderColor: "#fa4d56", color: "#fca5a5" }}>
          ✕ Abandonar
        </button>
        <button className="btn primary"
          disabled={!allDone}
          onClick={() => onComplete(execution.id)}
          style={{ marginLeft: "auto", background: "linear-gradient(135deg, #10b981, #059669)", borderColor: "#10b981" }}>
          {allDone ? "✓ Completar ejecución" : `Faltan ${total - completed} pasos`}
        </button>
      </div>
    </div>
  );
}
