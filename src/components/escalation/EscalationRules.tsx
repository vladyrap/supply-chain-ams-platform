"use client";

import { useState } from "react";
import type { UseEscalation } from "@/hooks/useEscalation";
import type { EscalationRule } from "@/types/escalation";
import { CHANNEL_LABELS, N2_ROLE_LABELS } from "@/types/escalation";
import EscalationRuleFormModal from "./EscalationRuleFormModal";

export default function EscalationRules({ escalation, canEdit }: { escalation: UseEscalation; canEdit: boolean }) {
  const [editing, setEditing] = useState<EscalationRule | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
          {escalation.rules.length} reglas · {escalation.rules.filter((r) => r.enabled).length} habilitadas
        </div>
        {canEdit && (
          <button className="btn primary" onClick={() => setCreating(true)}>+ Nueva regla</button>
        )}
      </div>

      <div className="col" style={{ gap: 8 }}>
        {escalation.rules.sort((a, b) => a.priority - b.priority).map((r) => (
          <div key={r.id} className="card" style={{ opacity: r.enabled ? 1 : 0.55 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#a5f3fc", fontFamily: "var(--font-mono, monospace)" }}>P{r.priority}</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <span style={{ fontSize: 10, color: r.enabled ? "#86efac" : "#fcd34d" }}>
                    {r.enabled ? "● habilitada" : "○ inhabilitada"}
                  </span>
                  {r.requiresApproval && <span style={{ fontSize: 10, color: "#fde68a" }}>requiere aprobación</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>{r.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, fontFamily: "var(--font-mono, monospace)" }}>
                  cond: {Object.entries(r.conditions).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("|") : v}`).join(" · ") || "(ninguna)"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                  → {r.assignmentStrategy} · {CHANNEL_LABELS[r.channel]} · SLA {r.slaMinutes}min
                  {r.targetRole && <> · rol {N2_ROLE_LABELS[r.targetRole]}</>}
                  {r.targetTeam && <> · equipo {r.targetTeam}</>}
                </div>
              </div>
              {canEdit && (
                <div className="row" style={{ gap: 6, flexDirection: "column" }}>
                  <button className="btn ghost" onClick={() => setEditing(r)} style={{ fontSize: 11, padding: "3px 10px" }}>editar</button>
                  <button className="btn ghost" onClick={() => escalation.upsertRule({ ...r, enabled: !r.enabled })} style={{ fontSize: 11, padding: "3px 10px" }}>
                    {r.enabled ? "deshabilitar" : "habilitar"}
                  </button>
                  <button className="btn ghost"
                    style={{ fontSize: 11, padding: "3px 10px", borderColor: "rgba(239,68,68,0.5)", color: "#fca5a5" }}
                    onClick={() => { if (confirm(`¿Eliminar regla "${r.name}"?`)) escalation.removeRule(r.id); }}>
                    eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <EscalationRuleFormModal
          rule={editing}
          responsibles={escalation.responsibles}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(r) => { escalation.upsertRule(r); setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}
