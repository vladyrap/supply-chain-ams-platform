"use client";

// Editor inline de pasos del escenario. Soporta agregar, eliminar, reordenar.

import { useState } from "react";
import type { TestStep, TestingScenario } from "@/types/testing";

interface Props {
  scenario: TestingScenario;
  onChange: (steps: TestStep[]) => void;
  readOnly?: boolean;
}

function newStep(order: number): TestStep {
  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    order,
    action: "",
    data: "",
    expectedResult: "",
    evidenceRequired: false,
    evidenceIds: [],
    status: "PENDING",
  };
}

export default function TestStepEditor({ scenario, onChange, readOnly }: Props) {
  const [steps, setSteps] = useState<TestStep[]>(scenario.steps);

  function emit(next: TestStep[]) {
    const reordered = next.map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(reordered);
    onChange(reordered);
  }

  function addStep() {
    emit([...steps, newStep(steps.length + 1)]);
  }
  function removeStep(id: string) {
    emit(steps.filter((s) => s.id !== id));
  }
  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...steps];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    emit(next);
  }
  function moveDown(idx: number) {
    if (idx === steps.length - 1) return;
    const next = [...steps];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    emit(next);
  }
  function patchStep(id: string, patch: Partial<TestStep>) {
    emit(steps.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  return (
    <div className="col" style={{ gap: 10 }}>
      {steps.length === 0 && (
        <div style={{ padding: 18, textAlign: "center", color: "var(--text-dim)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 6 }}>
          Aún no hay pasos. Agregá el primer paso para empezar.
        </div>
      )}
      {steps.map((s, i) => (
        <div key={s.id} className="card" style={{ padding: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: "#0284c7", fontFamily: "var(--font-mono, monospace)" }}>#{i + 1}</span>
            {!readOnly && (
              <div className="row" style={{ gap: 4, marginLeft: "auto" }}>
                <button className="btn ghost" onClick={() => moveUp(i)} disabled={i === 0} style={{ padding: "2px 8px", fontSize: 11 }}>↑</button>
                <button className="btn ghost" onClick={() => moveDown(i)} disabled={i === steps.length - 1} style={{ padding: "2px 8px", fontSize: 11 }}>↓</button>
                <button className="btn ghost" onClick={() => removeStep(s.id)} style={{ padding: "2px 8px", fontSize: 11, color: "#da1e28", borderColor: "rgba(250,77,86,0.4)" }}>✕</button>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Acción</label>
              <input value={s.action} onChange={(e) => patchStep(s.id, { action: e.target.value })} disabled={readOnly} style={{ width: "100%" }} placeholder="Ej. Ejecutar t-code MIGO" />
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Datos</label>
              <input value={s.data || ""} onChange={(e) => patchStep(s.id, { data: e.target.value })} disabled={readOnly} style={{ width: "100%" }} placeholder="Ej. OC 4500001234" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Resultado esperado</label>
              <input value={s.expectedResult} onChange={(e) => patchStep(s.id, { expectedResult: e.target.value })} disabled={readOnly} style={{ width: "100%" }} />
            </div>
            <div className="row" style={{ gap: 12, gridColumn: "1 / -1" }}>
              <label className="row" style={{ gap: 6, fontSize: 11.5 }}>
                <input type="checkbox" checked={!!s.evidenceRequired} disabled={readOnly}
                  onChange={(e) => patchStep(s.id, { evidenceRequired: e.target.checked })} />
                evidencia requerida
              </label>
              <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
                {(s.evidenceIds?.length || 0) > 0 && <>📎 {s.evidenceIds!.length} evidencia(s)</>}
              </div>
            </div>
          </div>
        </div>
      ))}
      {!readOnly && (
        <button className="btn ghost" onClick={addStep} style={{ alignSelf: "flex-start" }}>+ Agregar paso</button>
      )}
    </div>
  );
}
