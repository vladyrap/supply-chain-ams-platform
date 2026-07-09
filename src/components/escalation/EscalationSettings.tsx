"use client";

import type { UseEscalation } from "@/hooks/useEscalation";
import { CHANNEL_LABELS, type EscalationChannel } from "@/types/escalation";

export default function EscalationSettings({ escalation, canConfigure }: { escalation: UseEscalation; canConfigure: boolean }) {
  const s = escalation.settings;
  const disabled = !canConfigure;

  function set<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    escalation.updateSettings({ [key]: value } as Partial<typeof s>);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>⚙ Aprobación y automatización</h3>
        <div className="col" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.requiresApprovalDefault}
              onChange={(e) => set("requiresApprovalDefault", e.target.checked)} />
            Requiere aprobación humana para escalar (default).
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.allowAutoEscalationInDemo}
              onChange={(e) => set("allowAutoEscalationInDemo", e.target.checked)} />
            Permitir escalamiento automático en modo demo (no recomendado en producción).
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.useAvailabilityForAssignment}
              onChange={(e) => set("useAvailabilityForAssignment", e.target.checked)} />
            Usar disponibilidad para sugerir asignación.
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.useWorkloadForAssignment}
              onChange={(e) => set("useWorkloadForAssignment", e.target.checked)} />
            Usar carga de trabajo para sugerir asignación.
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.notifyClientOnEscalation}
              onChange={(e) => set("notifyClientOnEscalation", e.target.checked)} />
            Generar mensaje al cliente cuando se escala.
          </label>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>📡 Default destino</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Canal default</label>
            <select disabled={disabled} value={s.defaultChannel} onChange={(e) => set("defaultChannel", e.target.value as EscalationChannel)} style={{ width: "100%" }}>
              {(["JIRA", "SERVICENOW", "MANUAL"] as EscalationChannel[]).map((c) => (
                <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Nivel destino default</label>
            <select disabled={disabled} value={s.defaultTargetLevel} onChange={(e) => set("defaultTargetLevel", Number(e.target.value) as 2 | 3)} style={{ width: "100%" }}>
              <option value={2}>Nivel 2</option>
              <option value={3}>Nivel 3 (futuro)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>⏰ SLA por severidad (minutos)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {(["P1", "P2", "P3", "P4"] as const).map((sev) => (
            <div key={sev}>
              <label style={{ fontSize: 11, color: "var(--text-dim)" }}>{sev}</label>
              <input type="number" disabled={disabled} min={5} value={s.slaBySeverity[sev]}
                onChange={(e) => set("slaBySeverity", { ...s.slaBySeverity, [sev]: Number(e.target.value) || 60 })}
                style={{ width: "100%" }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>🧩 Acciones derivadas</h3>
        <div className="col" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.autoCreateEscalationDocument}
              onChange={(e) => set("autoCreateEscalationDocument", e.target.checked)} />
            Crear documento de escalamiento (Document Factory) cuando se escala.
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.autoCreateKnowledgeIfResolved}
              onChange={(e) => set("autoCreateKnowledgeIfResolved", e.target.checked)} />
            Proponer convertir en conocimiento cuando N2 resuelve.
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.autoCreateRcaIfCritical}
              onChange={(e) => set("autoCreateRcaIfCritical", e.target.checked)} />
            Crear RCA si severidad es crítica.
          </label>
        </div>
      </div>

      {canConfigure && (
        <div className="card" style={{ background: "rgba(250,77,86,0.05)", borderColor: "rgba(250,77,86,0.25)" }}>
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
            Restaurar los datos demo (reglas, responsables, registros, conectores y settings).
          </div>
          <button className="btn ghost"
            style={{ marginTop: 8, borderColor: "rgba(250,77,86,0.5)", color: "#da1e28" }}
            onClick={() => { if (confirm("¿Restaurar datos demo de escalamiento? Esto sobrescribe lo actual.")) escalation.resetDemoEscalationData(); }}>
            ↻ Restaurar demo
          </button>
        </div>
      )}
    </div>
  );
}
