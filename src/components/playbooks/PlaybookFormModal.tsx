"use client";

import { useState } from "react";
import type { AmsPlaybook, PlaybookStatus, Severity } from "@/types/ams-modules";
import { SAP_MODULES, SUPPLY_CHAIN_PROCESSES } from "@/types/training";

interface Props {
  initial?: AmsPlaybook;
  onClose: () => void;
  onSave: (data: Partial<AmsPlaybook>) => void;
}

const SEVERITIES: Severity[] = ["P1", "P2", "P3", "P4"];
const STATUSES: PlaybookStatus[] = ["DRAFT", "ACTIVE", "NEEDS_REVIEW", "ARCHIVED"];

export default function PlaybookFormModal({ initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sapModule, setSapModule] = useState(initial?.sapModule ?? "AMS");
  const [process, setProcess] = useState(initial?.process ?? "AMS Genérico");
  const [severity, setSeverity] = useState<Severity>(initial?.severity ?? "P3");
  const [triggerWhen, setTriggerWhen] = useState(initial?.triggerWhen ?? "");
  const [stepsRaw, setStepsRaw] = useState(
    initial?.steps?.map((s) => `${s.title} | ${s.description}`).join("\n") ?? ""
  );
  const [requiredData, setRequiredData] = useState(initial?.requiredData?.join("\n") ?? "");
  const [responsibleRole, setResponsibleRole] = useState(initial?.responsibleRole ?? "Consultor AMS");
  const [slaTargetMinutes, setSlaTargetMinutes] = useState(initial?.slaTargetMinutes ?? 60);
  const [escalationRules, setEscalationRules] = useState(initial?.escalationRules ?? "");
  const [evidenceRequired, setEvidenceRequired] = useState(initial?.evidenceRequired?.join("\n") ?? "");
  const [communicationTemplate, setCommunicationTemplate] = useState(initial?.communicationTemplate ?? "");
  const [status, setStatus] = useState<PlaybookStatus>(initial?.status ?? "DRAFT");
  const [version, setVersion] = useState(initial?.version ?? "v1.0");
  const [owner, setOwner] = useState(initial?.owner ?? "Consultor AMS");
  const [tagsRaw, setTagsRaw] = useState(initial?.tags?.join(", ") ?? "");

  function save() {
    const steps = stepsRaw.split("\n").filter(Boolean).map((line, i) => {
      const [titlePart, descPart] = line.split("|").map((s) => s.trim());
      return {
        id: `s_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
        order: i + 1,
        title: titlePart || `Paso ${i + 1}`,
        description: descPart || titlePart || "",
        responsibleRole,
        estimatedMinutes: 10,
        evidenceRequired: false,
        completionCriteria: "Paso completado",
      };
    });

    onSave({
      title, description, sapModule, process, severity,
      triggerWhen, steps,
      requiredData: requiredData.split("\n").filter(Boolean),
      responsibleRole, slaTargetMinutes,
      escalationRules,
      evidenceRequired: evidenceRequired.split("\n").filter(Boolean),
      communicationTemplate,
      relatedKnowledgeItems: initial?.relatedKnowledgeItems ?? [],
      relatedScopeItems: initial?.relatedScopeItems ?? [],
      status, version, owner,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="tc-modal-head">
          <h2 style={{ margin: 0, fontSize: 16 }}>{initial ? "Editar playbook" : "Nuevo playbook"}</h2>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div className="tc-modal-body">
          <label className="tc-field">
            <span>Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Incidente crítico P1 productivo" />
          </label>
          <label className="tc-field">
            <span>Descripción</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
              <span>Módulo SAP</span>
              <select value={sapModule} onChange={(e) => setSapModule(e.target.value)}>
                {SAP_MODULES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
              <span>Proceso</span>
              <select value={process} onChange={(e) => setProcess(e.target.value)}>
                {SUPPLY_CHAIN_PROCESSES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 100 }}>
              <span>Severidad</span>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 100 }}>
              <span>SLA (min)</span>
              <input type="number" value={slaTargetMinutes} onChange={(e) => setSlaTargetMinutes(Number(e.target.value))} />
            </label>
          </div>
          <label className="tc-field">
            <span>Trigger · cuándo aplicar</span>
            <textarea value={triggerWhen} onChange={(e) => setTriggerWhen(e.target.value)} rows={2} />
          </label>
          <label className="tc-field">
            <span>Pasos · uno por línea, formato: Título | Descripción</span>
            <textarea value={stepsRaw} onChange={(e) => setStepsRaw(e.target.value)} rows={6}
              placeholder="Convocar war-room | Notificar a líder + cliente&#10;Aislar el impacto | Confirmar alcance" />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="tc-field" style={{ flex: 1, minWidth: 240 }}>
              <span>Datos requeridos · uno por línea</span>
              <textarea value={requiredData} onChange={(e) => setRequiredData(e.target.value)} rows={3} />
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 240 }}>
              <span>Evidencia requerida · una por línea</span>
              <textarea value={evidenceRequired} onChange={(e) => setEvidenceRequired(e.target.value)} rows={3} />
            </label>
          </div>
          <label className="tc-field">
            <span>Reglas de escalamiento</span>
            <textarea value={escalationRules} onChange={(e) => setEscalationRules(e.target.value)} rows={2} />
          </label>
          <label className="tc-field">
            <span>Plantilla de comunicación</span>
            <textarea value={communicationTemplate} onChange={(e) => setCommunicationTemplate(e.target.value)} rows={3} />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
              <span>Responsable rol</span>
              <input value={responsibleRole} onChange={(e) => setResponsibleRole(e.target.value)} />
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 120 }}>
              <span>Owner</span>
              <input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 100 }}>
              <span>Versión</span>
              <input value={version} onChange={(e) => setVersion(e.target.value)} />
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 130 }}>
              <span>Estado</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as PlaybookStatus)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label className="tc-field">
            <span>Tags (coma)</span>
            <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
          </label>
        </div>
        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={onClose}>cancelar</button>
          <button className="btn primary" onClick={save} style={{ marginLeft: "auto" }}>
            ✓ Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
