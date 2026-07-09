"use client";

import type { UseEscalation } from "@/hooks/useEscalation";

export default function ItsmConnectors({ escalation, canConfigure }: { escalation: UseEscalation; canConfigure: boolean }) {
  const { jira, serviceNow, sapCloudAlm } = escalation.connectors;
  const disabled = !canConfigure;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card" style={{ background: "rgba(241,194,27,0.07)", borderColor: "rgba(241,194,27,0.30)", color: "#8a6d00", fontSize: 12 }}>
        🔒 <b>Seguridad:</b> los <b>API tokens nunca se almacenan en el frontend</b>. Esta pantalla sólo guarda configuración no-secreta. Las credenciales reales se inyectan al backend con variables de entorno (ver docs/escalation-n2.md).
      </div>

      {/* Jira */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🟦 Jira</h3>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
            background: jira.mode === "REAL" ? "rgba(250,77,86,0.15)" : "rgba(69,137,255,0.12)",
            color: jira.mode === "REAL" ? "#fca5a5" : "#7dd3fc",
            border: `1px solid ${jira.mode === "REAL" ? "rgba(250,77,86,0.4)" : "rgba(69,137,255,0.4)"}`,
          }}>{jira.mode}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" disabled={disabled} checked={jira.enabled}
              onChange={(e) => escalation.updateConnectors({ jira: { ...jira, enabled: e.target.checked } })} />
            habilitado
          </label>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Modo</label>
            <select disabled={disabled} value={jira.mode}
              onChange={(e) => escalation.updateConnectors({ jira: { ...jira, mode: e.target.value as "DEMO" | "REAL" } })}
              style={{ width: "100%" }}>
              <option value="DEMO">DEMO (simulado)</option>
              <option value="REAL">REAL (requiere backend con credenciales)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Base URL</label>
            <input disabled={disabled} value={jira.baseUrl} onChange={(e) => escalation.updateConnectors({ jira: { ...jira, baseUrl: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Project key</label>
            <input disabled={disabled} value={jira.projectKey} onChange={(e) => escalation.updateConnectors({ jira: { ...jira, projectKey: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Issue type</label>
            <input disabled={disabled} value={jira.issueType} onChange={(e) => escalation.updateConnectors({ jira: { ...jira, issueType: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Prioridad default</label>
            <input disabled={disabled} value={jira.defaultPriority} onChange={(e) => escalation.updateConnectors({ jira: { ...jira, defaultPriority: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Email del usuario API (no token)</label>
            <input disabled={disabled} value={jira.userEmail || ""} onChange={(e) => escalation.updateConnectors({ jira: { ...jira, userEmail: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Default assignee accountId</label>
            <input disabled={disabled} value={jira.defaultAssigneeAccountId || ""} onChange={(e) => escalation.updateConnectors({ jira: { ...jira, defaultAssigneeAccountId: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Labels (coma-separadas)</label>
            <input disabled={disabled} value={jira.labels.join(", ")}
              onChange={(e) => escalation.updateConnectors({ jira: { ...jira, labels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
              style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Componentes (coma-separados)</label>
            <input disabled={disabled} value={jira.components.join(", ")}
              onChange={(e) => escalation.updateConnectors({ jira: { ...jira, components: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
              style={{ width: "100%" }} />
          </div>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" disabled={disabled} checked={jira.authConfigured}
              onChange={(e) => escalation.updateConnectors({ jira: { ...jira, authConfigured: e.target.checked } })} />
            auth configurada en backend
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" disabled={disabled} checked={jira.apiTokenConfigured}
              onChange={(e) => escalation.updateConnectors({ jira: { ...jira, apiTokenConfigured: e.target.checked } })} />
            API token configurado en backend
          </label>
        </div>
      </div>

      {/* ServiceNow */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🟧 ServiceNow</h3>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
            background: serviceNow.mode === "REAL" ? "rgba(250,77,86,0.15)" : "rgba(69,137,255,0.12)",
            color: serviceNow.mode === "REAL" ? "#fca5a5" : "#7dd3fc",
            border: `1px solid ${serviceNow.mode === "REAL" ? "rgba(250,77,86,0.4)" : "rgba(69,137,255,0.4)"}`,
          }}>{serviceNow.mode}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" disabled={disabled} checked={serviceNow.enabled}
              onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, enabled: e.target.checked } })} />
            habilitado
          </label>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Modo</label>
            <select disabled={disabled} value={serviceNow.mode}
              onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, mode: e.target.value as "DEMO" | "REAL" } })}
              style={{ width: "100%" }}>
              <option value="DEMO">DEMO (simulado)</option>
              <option value="REAL">REAL (requiere backend con credenciales)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Instance URL</label>
            <input disabled={disabled} value={serviceNow.instanceUrl} onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, instanceUrl: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Tabla</label>
            <input disabled={disabled} value={serviceNow.table} onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, table: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Assignment group</label>
            <input disabled={disabled} value={serviceNow.assignmentGroup} onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, assignmentGroup: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Prioridad default</label>
            <input disabled={disabled} value={serviceNow.defaultPriority} onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, defaultPriority: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Username (no contraseña)</label>
            <input disabled={disabled} value={serviceNow.username || ""} onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, username: e.target.value } })} style={{ width: "100%" }} />
          </div>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" disabled={disabled} checked={serviceNow.authConfigured}
              onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, authConfigured: e.target.checked } })} />
            auth configurada en backend
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" disabled={disabled} checked={serviceNow.tokenConfigured}
              onChange={(e) => escalation.updateConnectors({ serviceNow: { ...serviceNow, tokenConfigured: e.target.checked } })} />
            token configurado en backend
          </label>
        </div>
      </div>

      {/* SAP Cloud ALM futuro */}
      <div className="card" style={{ opacity: 0.7 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🟩 SAP Cloud ALM (futuro)</h3>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: "rgba(148,163,184,0.15)", color: "#5b6b7d" }}>{sapCloudAlm.mode}</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-soft)", margin: 0 }}>
          {sapCloudAlm.note}
        </p>
      </div>

      {/* Manual */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>✉️ Manual</h3>
          <span style={{ fontSize: 11, color: "#24a148", fontWeight: 700 }}>siempre disponible</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "6px 0 0" }}>
          La escalación manual no envía a ningún sistema externo. Sólo registra el evento, deja el resumen y notifica por email/teams al responsable cuando esos canales estén configurados.
        </p>
      </div>
    </div>
  );
}
