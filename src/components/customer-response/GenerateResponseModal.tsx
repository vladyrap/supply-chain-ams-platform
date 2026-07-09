"use client";

// Modal "Generar respuesta cliente" — selectores + preview + acciones.
//
// Flow:
//   1. Usuario abre modal desde TCC.
//   2. Pre-pobla con contexto del ticket + estimación + señales TCC.
//   3. Permite ajustar type, audience, tone, include flags.
//   4. Click "Generar" → engine produce CustomerResponse + qualityGate.
//   5. Muestra preview + quality report con score.
//   6. Acciones: copiar, aplicar safe version, guardar, marcar como enviada,
//      enviar a revisión humana.

import { useEffect, useMemo, useState } from "react";
import TcModalShell from "@/components/ui/TcModalShell";
import CustomerResponsePreview from "./CustomerResponsePreview";
import QualityGateReport from "./QualityGateReport";
import { generateCustomerResponse } from "@/intelligence/customer-response-engine";
import type {
  CustomerResponse, CustomerResponseContext, CustomerResponseOptions,
  CustomerResponseType, CustomerResponseAudience, CustomerResponseTone,
  CustomerResponseStatus,
} from "@/types/customer-response";
import {
  ALL_RESPONSE_TYPES, ALL_AUDIENCES, ALL_TONES,
  RESPONSE_TYPE_LABELS, RESPONSE_TYPE_ICONS,
  AUDIENCE_LABELS, TONE_LABELS,
} from "@/types/customer-response";

interface Props {
  context: CustomerResponseContext;
  /** Firma del tenant (de /settings) o default "Equipo AMS". */
  signature?: string;
  /** Quién genera la respuesta — para audit. */
  generatedBy: string;
  /** Si la sesión actual ya revisó humanamente el caso (para regla critical PRD). */
  humanReviewed?: boolean;
  /** Tipo inicial (puede venir del contexto, ej. CLOSURE al cerrar). */
  initialType?: CustomerResponseType;

  onClose: () => void;
  onSave?: (response: CustomerResponse) => void;
  onMarkSent?: (response: CustomerResponse) => void;
  onSendToHumanReview?: (response: CustomerResponse) => void;
  onBlocked?: (response: CustomerResponse) => void;
}

export default function GenerateResponseModal({
  context, signature = "Equipo AMS", generatedBy, humanReviewed = false,
  initialType, onClose, onSave, onMarkSent, onSendToHumanReview, onBlocked,
}: Props) {
  // Form state
  const [responseType, setResponseType] = useState<CustomerResponseType | "auto">(initialType ?? "auto");
  const [audience, setAudience] = useState<CustomerResponseAudience | "auto">("auto");
  const [tone, setTone] = useState<CustomerResponseTone | "auto">("auto");
  const [includeEta, setIncludeEta] = useState(true);
  const [includeMissingData, setIncludeMissingData] = useState(true);
  const [includeNextSteps, setIncludeNextSteps] = useState(true);
  const [includeWorkaround, setIncludeWorkaround] = useState(false);
  const [enforceQualityGate, setEnforceQualityGate] = useState(true);
  const [applySafe, setApplySafe] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Generate response (memoized — re-corre cuando cambia algún parámetro)
  const response = useMemo<CustomerResponse>(() => {
    const opts: CustomerResponseOptions = {
      responseType: responseType === "auto" ? undefined : responseType,
      audience: audience === "auto" ? undefined : audience,
      tone: tone === "auto" ? undefined : tone,
      includeEta, includeMissingData, includeNextSteps, includeWorkaround,
      enforceQualityGate,
      generatedBy, signature, humanReviewed,
    };
    return generateCustomerResponse(context, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    context, responseType, audience, tone,
    includeEta, includeMissingData, includeNextSteps, includeWorkaround,
    enforceQualityGate, humanReviewed, generatedBy, signature,
  ]);

  // Cuando la respuesta queda BLOCKED y no había sido auto-notificada, notify parent
  useEffect(() => {
    if (response.qualityGate.canSend === false && onBlocked) {
      onBlocked(response);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.responseId]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleSave() {
    if (!onSave) return;
    const toSave: CustomerResponse = applySafe && response.qualityGate.safeVersion
      ? { ...response, body: response.qualityGate.safeVersion, status: "DRAFT" as CustomerResponseStatus }
      : response;
    onSave(toSave);
    notify("✓ Guardada en el ticket");
  }

  function handleSent() {
    if (!onMarkSent) return;
    onMarkSent(response);
    notify("✓ Marcada como enviada manualmente");
  }

  function handleReview() {
    if (!onSendToHumanReview) return;
    onSendToHumanReview(response);
    notify("✓ Enviada a revisión humana");
  }

  return (
    <TcModalShell onClose={onClose}>
      <div
        className="tc-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 1100, width: "94vw", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="tc-modal-header">
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>
              CUSTOMER RESPONSE INTELLIGENCE · {context.ticketKey}
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 18 }}>
              ✉ Generar respuesta cliente
            </h3>
          </div>
          <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="tc-modal-body" style={{
          display: "grid", gridTemplateColumns: "320px 1fr", gap: 16,
          overflowY: "auto", flex: 1,
        }}>
          {/* === FORM IZQUIERDA === */}
          <div className="col" style={{ gap: 12 }}>
            <div>
              <label className="lab">Tipo de respuesta</label>
              <select
                value={responseType}
                onChange={(e) => setResponseType(e.target.value as CustomerResponseType | "auto")}
              >
                <option value="auto">🤖 Detectar automáticamente</option>
                {ALL_RESPONSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RESPONSE_TYPE_ICONS[t]} {RESPONSE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="lab">Audiencia</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as CustomerResponseAudience | "auto")}
              >
                <option value="auto">🤖 Auto</option>
                {ALL_AUDIENCES.map((a) => (
                  <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="lab">Tono</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as CustomerResponseTone | "auto")}
              >
                <option value="auto">🤖 Auto</option>
                {ALL_TONES.map((t) => (
                  <option key={t} value={t}>{TONE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1.5, marginTop: 4 }}>
              ▸ INCLUIR EN LA RESPUESTA
            </div>
            <div className="col" style={{ gap: 4, fontSize: 12 }}>
              <Toggle label="Tiempo estimado (ETA)" checked={includeEta} onChange={setIncludeEta} />
              <Toggle label="Datos faltantes" checked={includeMissingData} onChange={setIncludeMissingData} />
              <Toggle label="Próximos pasos" checked={includeNextSteps} onChange={setIncludeNextSteps} />
              <Toggle label="Workaround si existe" checked={includeWorkaround} onChange={setIncludeWorkaround} />
            </div>

            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1.5, marginTop: 4 }}>
              ▸ QUALITY GATE
            </div>
            <Toggle
              label="Bloquear si falla el gate"
              checked={enforceQualityGate}
              onChange={setEnforceQualityGate}
            />

            {response.qualityGate.safeVersion && (
              <Toggle
                label="Aplicar versión segura al guardar"
                checked={applySafe}
                onChange={setApplySafe}
              />
            )}

            {/* Mini context info */}
            <div style={{
              marginTop: "auto", padding: 10, borderRadius: 6,
              background: "var(--bg-elev-2)", fontSize: 11, color: "var(--text-soft)",
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, marginBottom: 4 }}>CONTEXTO DETECTADO</div>
              <div>📦 Módulo: <strong>{context.sapModule ?? "—"}</strong></div>
              <div>🏷 Ambiente: <strong>{context.environment ?? "—"}</strong>{context.isProductive ? " (PRD)" : ""}</div>
              <div>🚦 Prioridad: <strong>{context.ticketPriority ?? "—"}</strong></div>
              <div>📊 ETA: <strong>{context.estimation
                ? `${context.estimation.totalMinHours}h-${context.estimation.totalMaxHours}h`
                : "—"}</strong></div>
              <div>🎯 Confianza: <strong>{context.confidence ?? "—"}</strong></div>
              <div>📕 Playbook: <strong>{context.hasPlaybook ? "sí" : "no"}</strong></div>
              <div>🚨 Escalación N2: <strong>{context.hasEscalationN2 ? "activa" : "no"}</strong></div>
            </div>
          </div>

          {/* === PREVIEW + QUALITY DERECHA === */}
          <div className="col" style={{ gap: 12, minWidth: 0 }}>
            <CustomerResponsePreview
              response={response}
              safeVersionBody={applySafe ? response.qualityGate.safeVersion : null}
            />
            <QualityGateReport
              report={response.qualityGate}
              onApplySafeVersion={response.qualityGate.safeVersion ? () => setApplySafe(true) : undefined}
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="tc-modal-footer" style={{ flexWrap: "wrap", gap: 6 }}>
          {toast && (
            <div style={{ flex: 1, fontSize: 12, color: "var(--text-soft)" }}>{toast}</div>
          )}
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          {onSendToHumanReview && (response.qualityGate.requiresHumanReview || !response.qualityGate.canSend) && (
            <button
              className="btn"
              onClick={handleReview}
              style={{ background: "#f59e0b22", color: "#b45309", borderColor: "#f59e0b55" }}
            >
              👤 Enviar a revisión humana
            </button>
          )}
          {onSave && (
            <button className="btn primary" onClick={handleSave}>
              💾 Guardar en ticket
            </button>
          )}
          {onMarkSent && response.qualityGate.canSend && (
            <button
              className="btn primary"
              onClick={handleSent}
              style={{ background: "#10b981", borderColor: "#10b981" }}
            >
              ✓ Marcar como enviada
            </button>
          )}
        </div>
      </div>
    </TcModalShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
