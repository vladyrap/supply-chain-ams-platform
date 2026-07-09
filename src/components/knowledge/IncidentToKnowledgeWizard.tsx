"use client";

import { useMemo, useState } from "react";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import { useKnowledgeConversion, type ConversionInput, type ConversionDraft } from "@/hooks/useKnowledgeConversion";
import type { KnowledgeType, Priority } from "@/types/training";
import { KNOWLEDGE_TYPE_LABELS, PRIORITY_LABELS, SUPPLY_CHAIN_PROCESSES } from "@/types/training";
import KnowledgeConversionPreview from "./KnowledgeConversionPreview";
import TcModalShell from "@/components/ui/TcModalShell";

interface Props {
  incident: IncidentSummary | IncidentDetail;
  onClose: () => void;
  onSaved?: (msg: string) => void;
}

type Step = "config" | "preview" | "done";

const SEVERITIES = ["P1", "P2", "P3", "P4"] as const;

export default function IncidentToKnowledgeWizard({ incident, onClose, onSaved }: Props) {
  const hook = useKnowledgeConversion();
  const [step, setStep] = useState<Step>("config");

  // Form state
  const [type, setType] = useState<KnowledgeType>("INCIDENT_SOLUTION");
  const [process, setProcess] = useState<string>(() => SUPPLY_CHAIN_PROCESSES[0]);
  const [subprocess, setSubprocess] = useState("");
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>("P3");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tagsRaw, setTagsRaw] = useState("");
  const [scopeRaw, setScopeRaw] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customSummary, setCustomSummary] = useState("");

  const input = useMemo<ConversionInput>(() => ({
    incident, type, process, subprocess: subprocess || undefined,
    severity, priority,
    tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
    relatedScopeItems: scopeRaw.split(",").map((s) => s.trim()).filter(Boolean),
    customTitle: customTitle.trim() || undefined,
    customSummary: customSummary.trim() || undefined,
  }), [incident, type, process, subprocess, severity, priority, tagsRaw, scopeRaw, customTitle, customSummary]);

  const draft = useMemo<ConversionDraft>(
    () => hook.convertIncidentToKnowledgeDraft(input),
    [hook, input]
  );

  function save(status: "DRAFT" | "PENDING_REVIEW") {
    const item = hook.saveKnowledgeDraft(input, draft, status);
    onSaved?.(`✓ Knowledge item creado (${item.id.slice(0, 8)}) en estado ${status}.`);
    setStep("done");
  }

  return (
    <TcModalShell onClose={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
        <div className="tc-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              ASISTENTE · INCIDENTE → CONOCIMIENTO
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {step === "done" ? "¡Listo!" : "Convertir incidente en conocimiento"}
            </h2>
            <div className="row" style={{ gap: 6, marginTop: 6, fontSize: 11, flexWrap: "wrap" }}>
              <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#67e8f9", background: "rgba(69,137,255,0.08)" }}>
                {incident.sap_module ?? "AMS"}
              </span>
              {incident.environment && (
                <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#c084fc", background: "rgba(168,85,247,0.08)" }}>
                  {incident.environment}
                </span>
              )}
              <span style={{ color: "var(--text-dim)" }}>
                {new Date(incident.created_at).toLocaleString("es-CL")} · {incident.user_name ?? "(anónimo)"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body">
          {/* Stepper */}
          <div className="row" style={{ gap: 6, marginBottom: 10, alignItems: "center" }}>
            {[
              { id: "config", label: "1 · Configurar" },
              { id: "preview", label: "2 · Revisar" },
              { id: "done", label: "3 · Guardado" },
            ].map((s) => (
              <span key={s.id} className="kanban-tag" style={{
                borderColor: step === s.id ? "rgba(168,85,247,0.55)" : "rgba(148,163,184,0.3)",
                color: step === s.id ? "#c084fc" : "var(--text-dim)",
                background: step === s.id ? "rgba(168,85,247,0.10)" : "transparent",
                padding: "3px 10px", fontWeight: 600,
              }}>
                {s.label}
              </span>
            ))}
          </div>

          {step === "config" && (
            <div className="col" style={{ gap: 10 }}>
              <div className="lab-fb-block">
                <div className="lab-fb-block-head">▸ MENSAJE ORIGINAL</div>
                <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>{incident.message}</div>
              </div>
              {incident.response && (
                <div className="lab-fb-block">
                  <div className="lab-fb-block-head">▸ RESPUESTA DEL AGENTE</div>
                  <div style={{ fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
                    {incident.response.slice(0, 800)}
                  </div>
                </div>
              )}

              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <label className="tc-field" style={{ flex: 1, minWidth: 200 }}>
                  <span>Tipo de conocimiento</span>
                  <select value={type} onChange={(e) => setType(e.target.value as KnowledgeType)}>
                    {Object.entries(KNOWLEDGE_TYPE_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 200 }}>
                  <span>Proceso end-to-end</span>
                  <select value={process} onChange={(e) => setProcess(e.target.value)}>
                    {SUPPLY_CHAIN_PROCESSES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 200 }}>
                  <span>Subproceso (opcional)</span>
                  <input value={subprocess} onChange={(e) => setSubprocess(e.target.value)} placeholder="ej. Liberación de OC" />
                </label>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Severidad</span>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof SEVERITIES[number])}>
                    {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Prioridad</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {Object.entries(PRIORITY_LABELS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 2, minWidth: 240 }}>
                  <span>Tags (separados por coma)</span>
                  <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="MIGO, M7, ME21N" />
                </label>
              </div>

              <label className="tc-field">
                <span>Scope items asociados (opcional, separados por coma)</span>
                <input value={scopeRaw} onChange={(e) => setScopeRaw(e.target.value)} placeholder="J45, 1FK, BLO" />
              </label>

              <details>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-dim)" }}>
                  Personalizar título y resumen ↓
                </summary>
                <div className="col" style={{ gap: 8, marginTop: 8 }}>
                  <label className="tc-field">
                    <span>Título custom</span>
                    <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="(auto-generado del módulo y mensaje)" />
                  </label>
                  <label className="tc-field">
                    <span>Resumen custom</span>
                    <textarea value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} rows={2} placeholder="(auto-generado)" />
                  </label>
                </div>
              </details>

              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)", textAlign: "right" }}>
                Tip: la IA generará Q&A y casos de prueba sugeridos en el preview.
              </div>
            </div>
          )}

          {step === "preview" && (
            <KnowledgeConversionPreview draft={draft} />
          )}

          {step === "done" && (
            <div className="ticket-empty" style={{ padding: 30 }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13.5, color: "var(--text-soft)" }}>
                El conocimiento ya está disponible en el Centro de Entrenamiento.
                Podés validarlo y publicarlo desde ahí.
              </div>
            </div>
          )}
        </div>

        <div className="tc-modal-foot">
          {step === "config" && (
            <>
              <button className="btn ghost" onClick={onClose}>cancelar</button>
              <button className="btn primary" onClick={() => setStep("preview")} style={{ marginLeft: "auto" }}>
                Continuar →
              </button>
            </>
          )}
          {step === "preview" && (
            <>
              <button className="btn ghost" onClick={() => setStep("config")}>← editar</button>
              <button className="btn ghost" onClick={() => save("DRAFT")} style={{ marginLeft: "auto" }}>
                💾 Guardar como DRAFT
              </button>
              <button className="btn primary" onClick={() => save("PENDING_REVIEW")}
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7" }}>
                📤 Enviar a revisión
              </button>
            </>
          )}
          {step === "done" && (
            <button className="btn primary" onClick={onClose} style={{ marginLeft: "auto" }}>cerrar</button>
          )}
        </div>
      </div>
    </TcModalShell>
  );
}
