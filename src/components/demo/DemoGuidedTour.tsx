"use client";

import Link from "next/link";
import type { DemoScenario } from "@/types/ams-modules";
import type { UseDemoMode } from "@/hooks/useDemoMode";

interface Props {
  scenario: DemoScenario;
  demo: UseDemoMode;
  onClose: () => void;
}

export default function DemoGuidedTour({ scenario, demo, onClose }: Props) {
  const total = scenario.steps.length;
  const current = demo.state.currentStepIndex;

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="tc-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              TOUR · {scenario.id}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>{scenario.icon} {scenario.label}</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>{scenario.description}</p>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body">
          {/* Progress bar */}
          <div className="tc-bar" style={{ marginBottom: 12, height: 8 }}>
            <div className="tc-bar-fill" style={{
              width: `${total > 0 ? Math.round(((current + 1) / total) * 100) : 0}%`,
              background: "linear-gradient(90deg, #a855f7, #22d3ee)",
            }} />
          </div>

          <div className="col" style={{ gap: 8 }}>
            {scenario.steps.map((step, i) => {
              const isActive = i === current;
              const isDone = i < current;
              const color = isDone ? "#10b981" : isActive ? "#a855f7" : "#64748b";
              return (
                <div key={i} className="lab-fb-block"
                  style={{ borderLeft: `3px solid ${color}`, opacity: isDone ? 0.7 : 1 }}>
                  <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <span className="tc-score-circle" style={{ ["--sc-color" as never]: color, width: 26, height: 26, fontSize: 11 }}>
                      {isDone ? "✓" : i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: isActive ? "#c084fc" : undefined }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 2 }}>{step.description}</div>
                    </div>
                    <Link href={step.href} onClick={() => { demo.goToStep(i); onClose(); }}
                      className="btn ghost" style={{ padding: "3px 9px", fontSize: 11 }}>
                      Ir →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={demo.prevStep} disabled={current === 0}>← anterior</button>
          <span style={{ alignSelf: "center", fontSize: 11, color: "var(--text-dim)", margin: "0 auto" }}>
            paso {current + 1} de {total}
          </span>
          <button className="btn primary" onClick={demo.nextStep} disabled={current >= total - 1}
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7" }}>
            siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
