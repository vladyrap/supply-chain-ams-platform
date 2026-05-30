"use client";

import { useDemoMode } from "@/hooks/useDemoMode";

interface Props {
  onClose: () => void;
}

export default function DemoScenarioSelector({ onClose }: Props) {
  const demo = useDemoMode();

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              DEMO · ESCENARIOS DISPONIBLES
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>🎬 Elegí el escenario a presentar</h2>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div className="tc-modal-body">
          <div className="col" style={{ gap: 8 }}>
            {demo.scenarios.map((sc) => (
              <button key={sc.id} onClick={() => { demo.selectScenario(sc.id); onClose(); }}
                className={`ticket-row ${demo.state.activeScenario === sc.id ? "active" : ""}`}
                style={{ ["--prio-color" as never]: "#a855f7", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 28 }}>{sc.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{sc.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-soft)", lineHeight: 1.4 }}>{sc.description}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>
                    {sc.steps.length} pasos
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={demo.reset} style={{ marginLeft: "auto" }}>
            ↻ resetear modo demo
          </button>
        </div>
      </div>
    </div>
  );
}
