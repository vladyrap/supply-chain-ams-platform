"use client";

import { useState } from "react";
import type { TestDefect, DefectSeverity, DefectPriority, DefectStatus } from "@/types/testing";

interface Props {
  defect: TestDefect | null;
  scenarioId: string;
  onClose: () => void;
  onSave: (d: TestDefect) => void;
  actingUserId: string;
}

function blank(scenarioId: string, actingUserId: string): TestDefect {
  const now = new Date().toISOString();
  return {
    id: `td_${Date.now()}`,
    scenarioId,
    title: "",
    description: "",
    severity: "MEDIUM",
    priority: "P3",
    status: "OPEN",
    evidenceIds: [],
    stepsToReproduce: "",
    expectedResult: "",
    actualResult: "",
    createdAt: now, updatedAt: now, createdBy: actingUserId,
  };
}

const SEVERITIES: DefectSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PRIORITIES: DefectPriority[] = ["P1", "P2", "P3", "P4"];
const STATUSES: DefectStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "RETEST", "CLOSED", "REJECTED"];

export default function DefectFormModal({ defect, scenarioId, onClose, onSave, actingUserId }: Props) {
  const [form, setForm] = useState<TestDefect>(defect ?? blank(scenarioId, actingUserId));

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              TESTING · DEFECTO
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {defect ? "✏️ Editar defecto" : "🆕 Nuevo defecto"}
            </h2>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div className="tc-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Título</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Severidad</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as DefectSeverity })} style={{ width: "100%" }}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Prioridad</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as DefectPriority })} style={{ width: "100%" }}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DefectStatus })} style={{ width: "100%" }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Asignado a (email)</label>
              <input value={form.assignedTo || ""} onChange={(e) => setForm({ ...form, assignedTo: e.target.value || undefined })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Pasos para reproducir</label>
              <textarea value={form.stepsToReproduce} onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })} rows={3} style={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Resultado esperado</label>
                <textarea value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} rows={3} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Resultado actual</label>
                <textarea value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} rows={3} style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tc-modal-foot" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)} disabled={!form.title.trim()}>
            {defect ? "Guardar cambios" : "Crear defecto"}
          </button>
        </div>
      </div>
    </div>
  );
}
