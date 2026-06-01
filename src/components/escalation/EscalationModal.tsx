"use client";

// Modal principal: "Escalar a Nivel 2" desde un incidente.
//
// Flujo:
//  1. Muestra datos del incidente.
//  2. Sugiere responsable, canal, SLA.
//  3. Permite editar resumen y elegir canal.
//  4. Previa del payload Jira/ServiceNow.
//  5. Pide confirmación.
//  6. Crea EscalationRecord en localStorage.
//  7. Si el canal es JIRA/ServiceNow y modo DEMO → simula ticket inmediatamente.

import { useMemo, useState } from "react";
import type { UseEscalation } from "@/hooks/useEscalation";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import type { EscalationChannel, EscalationRecord, ItsmTicketPayload } from "@/types/escalation";
import { CHANNEL_LABELS } from "@/types/escalation";
import { buildJiraPayload, buildServiceNowPayload } from "@/utils/escalation-engine";
import AssigneeSuggestionCard from "./AssigneeSuggestionCard";
import ItsmTicketPreview from "./ItsmTicketPreview";
import TcModalShell from "@/components/ui/TcModalShell";

interface Props {
  incident: IncidentSummary | IncidentDetail;
  escalation: UseEscalation;
  createdByUserId: string;
  onClose: () => void;
  onCreated?: (rec: EscalationRecord) => void;
}

export default function EscalationModal({ incident, escalation, createdByUserId, onClose, onCreated }: Props) {
  const candidate = useMemo(() => escalation.suggestEscalation(incident), [escalation, incident]);

  const [assigneeId, setAssigneeId] = useState<string>(candidate.suggestedAssignee?.id || "");
  const [channel, setChannel] = useState<EscalationChannel>(candidate.suggestedChannel);
  const [slaMinutes, setSlaMinutes] = useState<number>(candidate.suggestedSlaMinutes);
  const [requiresApproval, setRequiresApproval] = useState<boolean>(
    candidate.matchedRule?.requiresApproval ?? escalation.settings.requiresApprovalDefault
  );
  const [reason, setReason] = useState<string>(candidate.reason);
  const [summary, setSummary] = useState<string>(escalation.createEscalationSummary(incident, candidate.reason));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const assignee = useMemo(
    () => escalation.responsibles.find((r) => r.id === assigneeId) ?? null,
    [escalation.responsibles, assigneeId]
  );

  // Payload preview en vivo
  const payloadPreview: ItsmTicketPayload | null = useMemo(() => {
    if (channel === "JIRA") {
      return { channel: "JIRA", payload: buildJiraPayload(incident, summary, assignee, escalation.connectors.jira, candidate.severity) };
    }
    if (channel === "SERVICENOW") {
      return { channel: "SERVICENOW", payload: buildServiceNowPayload(incident, summary, assignee, escalation.connectors.serviceNow, candidate.severity) };
    }
    if (channel === "MANUAL") {
      return {
        channel: "MANUAL",
        payload: {
          recipientEmail: assignee?.email || "n2@demo.cl",
          subject: `[${candidate.severity}] Escalamiento ${incident.id} · ${incident.sap_module || "AMS"}`,
          body: summary,
        },
      };
    }
    return null;
  }, [channel, summary, assignee, escalation.connectors, incident, candidate.severity]);

  // Bloqueos
  const isRealMode =
    (channel === "JIRA" && escalation.connectors.jira.mode === "REAL") ||
    (channel === "SERVICENOW" && escalation.connectors.serviceNow.mode === "REAL");
  const realCredsConfigured = channel === "JIRA"
    ? (escalation.connectors.jira.authConfigured && escalation.connectors.jira.apiTokenConfigured)
    : channel === "SERVICENOW"
      ? (escalation.connectors.serviceNow.authConfigured && escalation.connectors.serviceNow.tokenConfigured)
      : true;

  const canEscalate =
    !!incident && !!summary.trim() &&
    (channel === "MANUAL" || channel === "JIRA" || channel === "SERVICENOW") &&
    (!isRealMode || realCredsConfigured);

  async function handleEscalate() {
    if (!canEscalate || busy) return;
    setBusy(true);
    try {
      const rec = escalation.createEscalation({
        incident,
        reason,
        summary,
        assigneeId: assigneeId || undefined,
        channel,
        slaMinutes,
        requiresApproval,
        ruleId: candidate.matchedRule?.id,
        createdBy: createdByUserId,
      });

      // Si el canal es ITSM, simulamos ticket en modo DEMO automáticamente.
      // Si es REAL, NO se envía nunca desde frontend → queda como ESCALATED a la espera de backend.
      if (!requiresApproval && !isRealMode) {
        if (channel === "JIRA")        escalation.createJiraTicketDemo(rec.id, incident, createdByUserId);
        else if (channel === "SERVICENOW") escalation.createServiceNowTicketDemo(rec.id, incident, createdByUserId);
      }

      onCreated?.(rec);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <TcModalShell onClose={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 920 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              ESCALATION · CREAR
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              🚨 Escalar incidente {incident.id} a Nivel 2
            </h2>
            <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 4 }}>
              {candidate.matchedRule
                ? <>Regla detectada: <b>{candidate.matchedRule.name}</b> · severidad <b>{candidate.severity}</b></>
                : <>Escalación manual · severidad estimada <b>{candidate.severity}</b></>}
            </div>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
            {/* Columna izquierda: datos + resumen */}
            <div className="col" style={{ gap: 12 }}>
              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Datos del incidente
                </div>
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <tbody>
                    <tr><td style={{ color: "var(--text-dim)", padding: "3px 0" }}>Cliente</td><td style={{ textAlign: "right" }}>{incident.client_name || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Usuario</td><td style={{ textAlign: "right" }}>{incident.user_name || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Módulo</td><td style={{ textAlign: "right", fontWeight: 600 }}>{incident.sap_module || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Ambiente</td><td style={{ textAlign: "right", fontWeight: 600 }}>{incident.environment || "—"}</td></tr>
                    <tr><td style={{ color: "var(--text-dim)" }}>Confianza</td><td style={{ textAlign: "right" }}>{candidate.confidence}%</td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-soft)" }}>
                  <b>Mensaje:</b> {incident.message}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Motivo del escalamiento</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Resumen técnico para N2 (editable)</label>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={10} style={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} />
              </div>
            </div>

            {/* Columna derecha: responsable + canal + payload */}
            <div className="col" style={{ gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Responsable sugerido
                </div>
                <AssigneeSuggestionCard responsible={assignee} selected />
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Cambiar manualmente</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ width: "100%" }}>
                    <option value="">— sin asignar —</option>
                    {escalation.responsibles.filter((r) => r.active).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.sapModules.join(",")} · {r.availabilityStatus}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Canal</label>
                  <select value={channel} onChange={(e) => setChannel(e.target.value as EscalationChannel)} style={{ width: "100%" }}>
                    {(["JIRA", "SERVICENOW", "MANUAL"] as EscalationChannel[]).map((c) => (
                      <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>SLA (min)</label>
                  <input type="number" min={5} value={slaMinutes}
                    onChange={(e) => setSlaMinutes(Number(e.target.value) || 60)}
                    style={{ width: "100%" }} />
                </div>
              </div>

              <label className="row" style={{ gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
                requiere aprobación humana antes de enviar
              </label>

              {/* Aviso modo real */}
              {isRealMode && (
                <div className="card" style={{ background: "rgba(251,191,36,0.10)", borderColor: "rgba(251,191,36,0.5)", fontSize: 12, color: "#fde68a" }}>
                  ⚠ <b>Modo REAL detectado para {channel}.</b> No se envía desde el frontend. Backend debe estar configurado con variables de entorno y se requerirá confirmación humana adicional.
                  {!realCredsConfigured && <div style={{ marginTop: 4, color: "#fca5a5" }}>Credenciales no marcadas como configuradas — escalación bloqueada hasta que el admin las habilite.</div>}
                </div>
              )}

              <ItsmTicketPreview payload={payloadPreview} />
            </div>
          </div>
        </div>

        <div className="tc-modal-foot" style={{ gap: 8, alignItems: "center" }}>
          {!confirming ? (
            <>
              <div style={{ fontSize: 11, color: "var(--text-dim)", flex: 1 }}>
                Al confirmar se creará un EscalationRecord en localStorage.
                {!isRealMode && (channel === "JIRA" || channel === "SERVICENOW") && !requiresApproval &&
                  <> Se simulará también un ticket {channel}.</>}
              </div>
              <button className="btn ghost" onClick={onClose}>Cancelar</button>
              <button className="btn primary" disabled={!canEscalate} onClick={() => setConfirming(true)}>
                🚨 Continuar
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#fde68a", flex: 1 }}>
                ¿Confirmás escalar este incidente con los datos mostrados?
              </div>
              <button className="btn ghost" onClick={() => setConfirming(false)} disabled={busy}>← Volver</button>
              <button className="btn primary" disabled={busy || !canEscalate} onClick={handleEscalate}>
                {busy ? "Procesando…" : "Sí, escalar a N2"}
              </button>
            </>
          )}
        </div>
      </div>
    </TcModalShell>
  );
}
