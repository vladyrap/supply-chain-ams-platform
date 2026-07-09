"use client";

import { useState } from "react";
import type {
  TestingScenario, TestingType, TestingEnvironment, TestingSapModule, TestingProcess,
} from "@/types/testing";
import {
  TESTING_TYPES, TESTING_ENVIRONMENTS, TESTING_SAP_MODULES, TESTING_PROCESSES,
  TESTING_TYPE_LABELS,
} from "@/types/testing";
import TcModalShell from "@/components/ui/TcModalShell";
import { Pencil, Plus, X } from "lucide-react";

interface Props {
  scenario: TestingScenario | null;
  onClose: () => void;
  onSave: (s: TestingScenario) => void;
  defaultOwner?: string;
}

function blank(owner: string): TestingScenario {
  const now = new Date().toISOString();
  return {
    id: `ts_${Date.now()}`,
    title: "",
    description: "",
    sapModule: "MM",
    process: "Procure to Pay",
    scopeItemIds: [],
    testType: "UAT",
    environment: "QA",
    status: "DRAFT",
    result: "PENDING",
    owner,
    prerequisites: "",
    testData: "",
    steps: [],
    expectedResult: "",
    evidenceIds: [],
    defectIds: [],
    cloudAlmReady: false,
    tags: [],
    createdAt: now, updatedAt: now,
  };
}

export default function TestScenarioFormModal({ scenario, onClose, onSave, defaultOwner = "demo@user" }: Props) {
  const [form, setForm] = useState<TestingScenario>(scenario ?? blank(defaultOwner));

  return (
    <TcModalShell onClose={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              TESTING · ESCENARIO
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {scenario ? <><Pencil size={18} /> Editar escenario</> : <><Plus size={18} /> Nuevo escenario de prueba</>}
            </h2>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}><X size={16} /></button>
        </div>

        <div className="tc-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="col" style={{ gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Título</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Descripción / Objetivo</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: "100%" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Módulo SAP</label>
                <select value={form.sapModule} onChange={(e) => setForm({ ...form, sapModule: e.target.value as TestingSapModule })} style={{ width: "100%" }}>
                  {TESTING_SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Proceso end-to-end</label>
                <select value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value as TestingProcess })} style={{ width: "100%" }}>
                  {TESTING_PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Sub-proceso (opcional)</label>
                <input value={form.subProcess || ""} onChange={(e) => setForm({ ...form, subProcess: e.target.value || undefined })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Scope Items (coma-separados)</label>
                <input value={form.scopeItemIds.join(", ")}
                  onChange={(e) => setForm({ ...form, scopeItemIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  style={{ width: "100%" }}
                  placeholder="1A0, BD9" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Tipo de prueba</label>
                <select value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value as TestingType })} style={{ width: "100%" }}>
                  {TESTING_TYPES.map((t) => <option key={t} value={t}>{TESTING_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Ambiente</label>
                <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as TestingEnvironment })} style={{ width: "100%" }}>
                  {TESTING_ENVIRONMENTS.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Responsable</label>
                <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Tags (coma-separadas)</label>
                <input value={form.tags.join(", ")}
                  onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  style={{ width: "100%" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Prerrequisitos</label>
              <textarea value={form.prerequisites} onChange={(e) => setForm({ ...form, prerequisites: e.target.value })} rows={3} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Datos de prueba</label>
              <textarea value={form.testData} onChange={(e) => setForm({ ...form, testData: e.target.value })} rows={2} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Criterio / Resultado esperado</label>
              <textarea value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} rows={3} style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        <div className="tc-modal-foot" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)} disabled={!form.title.trim() || !form.owner.trim()}>
            {scenario ? "Guardar cambios" : "Crear escenario"}
          </button>
        </div>
      </div>
    </TcModalShell>
  );
}
