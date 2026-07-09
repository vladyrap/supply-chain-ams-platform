"use client";

// Test Script Generator: elige escenario, edita pasos, genera Markdown.

import { useMemo, useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { TestStep, TestingScenario } from "@/types/testing";
import TestStepEditor from "./TestStepEditor";

interface Props {
  testing: UseTestingIntelligence;
  canEdit: boolean;
}

export default function TestScriptGenerator({ testing, canEdit }: Props) {
  const [scenarioId, setScenarioId] = useState<string>(testing.scenarios[0]?.id || "");
  const [copied, setCopied] = useState(false);
  const scenario: TestingScenario | undefined = useMemo(
    () => testing.scenarios.find((s) => s.id === scenarioId),
    [testing.scenarios, scenarioId]
  );
  const [generatedMd, setGeneratedMd] = useState<string>(scenario?.generatedScript || "");

  function updateSteps(steps: TestStep[]) {
    if (!scenario) return;
    testing.upsertScenario({ ...scenario, steps });
  }

  function handleGenerate() {
    if (!scenario) return;
    const md = testing.generateScript(scenario.id);
    setGeneratedMd(md);
    setCopied(false);
  }

  async function handleCopy() {
    if (!generatedMd) return;
    try {
      await navigator.clipboard.writeText(generatedMd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  function handleDownload(format: "md" | "json") {
    if (!scenario) return;
    let content = "";
    let mime = "text/plain";
    let ext = "md";
    if (format === "md") {
      content = generatedMd || testing.generateScript(scenario.id);
      mime = "text/markdown";
      ext = "md";
    } else {
      content = JSON.stringify(scenario, null, 2);
      mime = "application/json";
      ext = "json";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scenario.id}-test-script.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Escenario</label>
            <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); setGeneratedMd(""); }} style={{ width: "100%" }}>
              <option value="">— elegir —</option>
              {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.sapModule} · {s.testType}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: 8, alignSelf: "flex-end" }}>
            <button className="btn primary" onClick={handleGenerate} disabled={!scenario}>📝 Generar script</button>
            <button className="btn ghost" onClick={() => handleDownload("md")} disabled={!scenario}>⬇ Markdown</button>
            <button className="btn ghost" onClick={() => handleDownload("json")} disabled={!scenario}>⬇ JSON</button>
            <button className="btn ghost" onClick={handleCopy} disabled={!generatedMd}>
              {copied ? "✓ Copiado" : "📋 Copiar"}
            </button>
          </div>
        </div>
      </div>

      {scenario && (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase" }}>
                Pasos del escenario ({scenario.steps.length})
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                {scenario.sapModule} · {scenario.process} · {scenario.environment}
              </div>
            </div>
            <TestStepEditor scenario={scenario} onChange={updateSteps} readOnly={!canEdit} />
          </div>

          {generatedMd && (
            <div className="card" style={{ background: "rgba(15,23,42,0.5)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                Test script generado (Markdown)
              </div>
              <pre style={{
                margin: 0, padding: "10px 12px",
                background: "rgba(0,0,0,0.30)", borderRadius: 6,
                fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, lineHeight: 1.55,
                color: "#5b6b7d", maxHeight: 480, overflow: "auto", whiteSpace: "pre-wrap",
              }}>{generatedMd}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
