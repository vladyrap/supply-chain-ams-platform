"use client";

import { useState } from "react";
import Link from "next/link";
import { useDemoMode } from "@/hooks/useDemoMode";
import DemoScenarioSelector from "./DemoScenarioSelector";
import DemoGuidedTour from "./DemoGuidedTour";

export default function DemoModeBanner() {
  const demo = useDemoMode();
  const [showSelector, setShowSelector] = useState(false);
  const [showTour, setShowTour] = useState(false);

  if (!demo.state.enabled) return null;

  const sc = demo.scenarios.find((s) => s.id === demo.state.activeScenario);
  const currentStep = sc?.steps[demo.state.currentStepIndex];

  return (
    <>
      <div style={{
        position: "sticky", top: 0, zIndex: 800,
        background: "linear-gradient(90deg, rgba(168,85,247,0.25), rgba(69,137,255,0.20))",
        borderBottom: "1px solid rgba(168,85,247,0.5)",
        padding: "6px 16px",
        backdropFilter: "blur(10px)",
        fontSize: 12.5,
      }}>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, color: "#7c3aed", letterSpacing: 1 }}>
            🎬 MODO DEMO CLIENTE
          </span>
          <span style={{ color: "var(--text-soft)" }}>
            datos ficticios · solo para presentación comercial
          </span>
          {sc && (
            <>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span>
                {sc.icon} <b>{sc.label}</b>
                {currentStep && (
                  <span style={{ color: "var(--text-soft)" }}>
                    {" "}→ paso {demo.state.currentStepIndex + 1}/{sc.steps.length}: {currentStep.title}
                  </span>
                )}
              </span>
            </>
          )}
          <div className="row" style={{ gap: 6, marginLeft: "auto" }}>
            {currentStep && (
              <Link href={currentStep.href} className="btn primary"
                style={{ padding: "3px 10px", fontSize: 11, background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7" }}>
                ▶ Ir al paso
              </Link>
            )}
            <button className="btn ghost" onClick={() => setShowTour(true)}
              style={{ padding: "3px 10px", fontSize: 11 }}>
              🗺 tour
            </button>
            <button className="btn ghost" onClick={() => setShowSelector(true)}
              style={{ padding: "3px 10px", fontSize: 11 }}>
              cambiar escenario
            </button>
            <button className="btn ghost" onClick={demo.disable}
              style={{ padding: "3px 10px", fontSize: 11, borderColor: "rgba(250,77,86,0.4)", color: "#da1e28" }}>
              ✕ desactivar
            </button>
          </div>
        </div>
      </div>

      {showSelector && (
        <DemoScenarioSelector onClose={() => setShowSelector(false)} />
      )}
      {showTour && sc && (
        <DemoGuidedTour scenario={sc} demo={demo} onClose={() => setShowTour(false)} />
      )}
    </>
  );
}
