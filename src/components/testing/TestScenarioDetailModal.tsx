"use client";

import { useMemo } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { TestingScenario } from "@/types/testing";
import {
  TESTING_TYPE_LABELS, TESTING_STATUS_LABELS,
} from "@/types/testing";
import TestingStatusBadge from "./TestingStatusBadge";
import EvidenceCard from "./EvidenceCard";

interface Props {
  scenario: TestingScenario;
  testing: UseTestingIntelligence;
  onClose: () => void;
  canEdit: boolean;
  actingUserId: string;
}

export default function TestScenarioDetailModal({ scenario, testing, onClose, canEdit, actingUserId }: Props) {
  const evidences = useMemo(
    () => testing.evidences.filter((e) => scenario.evidenceIds.includes(e.id)),
    [testing.evidences, scenario.evidenceIds]
  );
  const defects = useMemo(
    () => testing.defects.filter((d) => scenario.defectIds.includes(d.id)),
    [testing.defects, scenario.defectIds]
  );

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 940 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              TESTING · DETALLE
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>{scenario.title}</h2>
            <div style={{ marginTop: 4 }}>
              <TestingStatusBadge status={scenario.status} />
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)" }}>
                {scenario.sapModule} · {scenario.process} · {TESTING_TYPE_LABELS[scenario.testType]} · {scenario.environment}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
            <div className="col" style={{ gap: 12 }}>
              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Descripción
                </div>
                <div style={{ fontSize: 13 }}>{scenario.description || "(sin descripción)"}</div>
              </div>

              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Pasos ({scenario.steps.length})
                </div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                      <th style={{ padding: "6px 8px", width: 30 }}>N°</th>
                      <th style={{ padding: "6px 8px" }}>Acción</th>
                      <th style={{ padding: "6px 8px" }}>Datos</th>
                      <th style={{ padding: "6px 8px" }}>Esperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.steps.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 12, color: "var(--text-dim)", textAlign: "center" }}>(sin pasos)</td></tr>
                    )}
                    {scenario.steps.sort((a, b) => a.order - b.order).map((s) => (
                      <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "6px 8px", color: "#7dd3fc" }}>{s.order}</td>
                        <td style={{ padding: "6px 8px" }}>{s.action}</td>
                        <td style={{ padding: "6px 8px", color: "var(--text-dim)" }}>{s.data || "—"}</td>
                        <td style={{ padding: "6px 8px", color: "var(--text-soft)" }}>{s.expectedResult}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Defectos
                </div>
                {defects.length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: 12 }}>(sin defectos)</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {defects.map((d) => (
                      <li key={d.id} style={{ fontSize: 12.5 }}>
                        <b>{d.title}</b> · {d.severity} / {d.priority} · {d.status}
                        {d.assignedTo && <> · {d.assignedTo}</>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="col" style={{ gap: 12 }}>
              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Resumen
                </div>
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <tbody>
                    <tr><td style={{ color: "var(--text-dim)" }}>Estado</td><td style={{ textAlign: "right" }}>{TESTING_STATUS_LABELS[scenario.status]}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Resultado</td><td style={{ textAlign: "right" }}>{scenario.result ?? "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Responsable</td><td style={{ textAlign: "right" }}>{scenario.owner}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Scope Items</td><td style={{ textAlign: "right" }}>{scenario.scopeItemIds.join(", ") || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Ambiente</td><td style={{ textAlign: "right" }}>{scenario.environment}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Cloud ALM</td><td style={{ textAlign: "right" }}>{scenario.cloudAlmReady ? "✓ preparado" : "— pendiente"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Creado</td><td style={{ textAlign: "right", fontSize: 11 }}>{new Date(scenario.createdAt).toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  Evidencias ({evidences.length})
                </div>
                {evidences.length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: 12 }}>(sin evidencias)</div>
                ) : (
                  <div className="col" style={{ gap: 8 }}>
                    {evidences.map((e) => (
                      <EvidenceCard key={e.id} evidence={e}
                        onRemove={canEdit ? () => testing.removeEvidence(e.id) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="tc-modal-foot" style={{ gap: 6, flexWrap: "wrap" }}>
          {canEdit && (
            <>
              <button className="btn ghost" onClick={() => testing.generateScript(scenario.id)}>📝 Generar script</button>
              <button className="btn ghost" onClick={() => testing.generateManual(scenario.id)}>📖 Generar manual</button>
              <button className="btn ghost" onClick={() => testing.prepareCloudAlmExport(scenario.id)}>🔮 Preparar Cloud ALM</button>
              <div style={{ marginLeft: "auto" }} />
              {scenario.status !== "PASSED" && (
                <button className="btn" style={{ color: "#86efac", borderColor: "rgba(66,190,101,0.4)" }}
                  onClick={() => testing.markScenarioPassed(scenario.id, "Aprobado por evaluación humana")}>
                  ✓ Marcar PASSED
                </button>
              )}
              {scenario.status !== "FAILED" && (
                <button className="btn" style={{ color: "#fca5a5", borderColor: "rgba(250,77,86,0.4)" }}
                  onClick={() => {
                    const note = window.prompt("Describí el resultado actual / falla", scenario.actualResult || "");
                    if (note !== null) testing.markScenarioFailed(scenario.id, note);
                  }}>
                  ✕ Marcar FAILED
                </button>
              )}
            </>
          )}
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          {/* Suprimir warning de variable no usada */}
          <span style={{ display: "none" }}>{actingUserId}</span>
        </div>
      </div>
    </div>
  );
}
