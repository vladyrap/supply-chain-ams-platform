"use client";

import { useState } from "react";
import type {
  EscalationRule, AssignmentStrategy, EscalationChannel, N2Role,
  N2Responsible, EscalationCondition,
} from "@/types/escalation";
import { N2_ROLE_LABELS, CHANNEL_LABELS } from "@/types/escalation";

interface Props {
  rule: EscalationRule | null;
  responsibles: N2Responsible[];
  onClose: () => void;
  onSave: (r: EscalationRule) => void;
}

const STRATEGIES: AssignmentStrategy[] = [
  "BY_MODULE", "BY_CLIENT", "BY_SEVERITY",
  "BY_AVAILABILITY", "BY_WORKLOAD", "ROUND_ROBIN",
  "MANUAL", "FIXED_PERSON",
];

const CHANNELS: EscalationChannel[] = [
  "JIRA", "SERVICENOW", "SAP_CLOUD_ALM_FUTURE", "EMAIL_FUTURE", "TEAMS_FUTURE", "MANUAL",
];

const ROLES: N2Role[] = [
  "N2_FUNCTIONAL_CONSULTANT", "N2_TECHNICAL_CONSULTANT",
  "N2_INTEGRATION_SPECIALIST", "N2_BTP_SPECIALIST",
  "N2_ABAP_SPECIALIST", "N2_SERVICE_LEAD", "N2_ARCHITECT",
];

const SAP_MODULES = ["MM", "SD", "PP", "WM", "EWM", "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION"];
const ENVIRONMENTS = ["DEV", "QA", "PRD", "SANDBOX"];
const SEVERITIES = ["P1", "P2", "P3", "P4", "CRITICAL"] as const;

function blankRule(): EscalationRule {
  const now = new Date().toISOString();
  return {
    id: `rule_${Date.now()}`,
    name: "",
    description: "",
    enabled: true,
    priority: 5,
    conditions: {},
    targetLevel: 2,
    assignmentStrategy: "BY_MODULE",
    channel: "JIRA",
    slaMinutes: 240,
    requiresApproval: true,
    createdAt: now, updatedAt: now,
  };
}

export default function EscalationRuleFormModal({ rule, responsibles, onClose, onSave }: Props) {
  const [form, setForm] = useState<EscalationRule>(rule ?? blankRule());
  const c = form.conditions;

  function setCond(patch: Partial<EscalationCondition>) {
    setForm({ ...form, conditions: { ...form.conditions, ...patch } });
  }

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              ESCALATION · REGLA
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {rule ? "✏️ Editar regla" : "🆕 Nueva regla"}
            </h2>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="col" style={{ gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: "100%" }} />
            </div>

            <div className="row" style={{ gap: 10 }}>
              <label className="row" style={{ gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                habilitada
              </label>
              <label className="row" style={{ gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} />
                requiere aprobación humana
              </label>
              <div className="row" style={{ gap: 6 }}>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Prioridad</label>
                <input type="number" min={1} max={99} value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 5 })}
                  style={{ width: 70 }} />
              </div>
              <div className="row" style={{ gap: 6 }}>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>SLA (min)</label>
                <input type="number" min={5} value={form.slaMinutes}
                  onChange={(e) => setForm({ ...form, slaMinutes: Number(e.target.value) || 240 })}
                  style={{ width: 90 }} />
              </div>
            </div>

            <fieldset style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 10 }}>
              <legend style={{ fontSize: 11, color: "var(--text-dim)", padding: "0 6px" }}>Condiciones (AND entre las que llenes)</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Módulo SAP</label>
                  <select value={c.sapModule || ""} onChange={(e) => setCond({ sapModule: e.target.value || undefined })} style={{ width: "100%" }}>
                    <option value="">— cualquiera —</option>
                    {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Ambiente</label>
                  <select value={c.environment || ""} onChange={(e) => setCond({ environment: e.target.value || undefined })} style={{ width: "100%" }}>
                    <option value="">— cualquiera —</option>
                    {ENVIRONMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Severidad</label>
                  <select value={c.severity || ""} onChange={(e) => setCond({ severity: (e.target.value as EscalationCondition["severity"]) || undefined })} style={{ width: "100%" }}>
                    <option value="">— cualquiera —</option>
                    {SEVERITIES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Cliente</label>
                  <input value={c.client || ""} onChange={(e) => setCond({ client: e.target.value || undefined })} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Confianza menor que (%)</label>
                  <input type="number" min={0} max={100} value={c.confidenceBelow ?? ""}
                    onChange={(e) => setCond({ confidenceBelow: e.target.value === "" ? undefined : Number(e.target.value) })}
                    style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Keywords (coma-separadas, OR)</label>
                  <input value={(c.keywords || []).join(", ")}
                    onChange={(e) => setCond({ keywords: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined })}
                    style={{ width: "100%" }} />
                </div>
              </div>
              <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                <label className="row" style={{ gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={!!c.noSolutionFound} onChange={(e) => setCond({ noSolutionFound: e.target.checked || undefined })} />
                  N1 sin solución
                </label>
                <label className="row" style={{ gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={!!c.agentRecommendedEscalation} onChange={(e) => setCond({ agentRecommendedEscalation: e.target.checked || undefined })} />
                  agente sugiere escalar
                </label>
                <label className="row" style={{ gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={!!c.repeatedIncident} onChange={(e) => setCond({ repeatedIncident: e.target.checked || undefined })} />
                  incidente repetido
                </label>
              </div>
            </fieldset>

            <fieldset style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 10 }}>
              <legend style={{ fontSize: 11, color: "var(--text-dim)", padding: "0 6px" }}>Destino</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Estrategia de asignación</label>
                  <select value={form.assignmentStrategy} onChange={(e) => setForm({ ...form, assignmentStrategy: e.target.value as AssignmentStrategy })} style={{ width: "100%" }}>
                    {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Canal</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as EscalationChannel })} style={{ width: "100%" }}>
                    {CHANNELS.map((c2) => <option key={c2} value={c2}>{CHANNEL_LABELS[c2]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Rol destino</label>
                  <select value={form.targetRole || ""} onChange={(e) => setForm({ ...form, targetRole: (e.target.value as N2Role) || undefined })} style={{ width: "100%" }}>
                    <option value="">— sin restricción —</option>
                    {ROLES.map((r) => <option key={r} value={r}>{N2_ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Persona fija (si FIXED_PERSON)</label>
                  <select value={form.targetUserId || ""} onChange={(e) => setForm({ ...form, targetUserId: e.target.value || undefined })} style={{ width: "100%" }}>
                    <option value="">—</option>
                    {responsibles.filter((r) => r.active).map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.sapModules.join(",")})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Equipo (texto libre)</label>
                  <input value={form.targetTeam || ""} onChange={(e) => setForm({ ...form, targetTeam: e.target.value || undefined })} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Nivel destino</label>
                  <select value={form.targetLevel} onChange={(e) => setForm({ ...form, targetLevel: Number(e.target.value) as 2 | 3 })} style={{ width: "100%" }}>
                    <option value={2}>Nivel 2</option>
                    <option value={3}>Nivel 3 (futuro)</option>
                  </select>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className="tc-modal-foot" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)} disabled={!form.name.trim()}>
            {rule ? "Guardar cambios" : "Crear regla"}
          </button>
        </div>
      </div>
    </div>
  );
}
