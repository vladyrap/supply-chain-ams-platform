"use client";

// =============================================================================
// N1PackageSection — Sección dedicada en el Ticket Command Center
// =============================================================================
// Muestra el "Paquete N1" del ticket (cuando se creó via Guided Intake o se
// puede inferir). Incluye:
//   - Readiness score + info recibida + faltantes
//   - Checklist N1 ejecutable (toggle completado)
//   - Playbook sugerido
//   - Respuesta cliente sugerida
//   - Criterio escalamiento N2
//   - Botones: "Marcar resuelto N1" / "Escalar con paquete completo"
// =============================================================================

import { useMemo, useState } from "react";
import type { Ticket } from "@/services/tickets.api";
import type { GuidedTicketDraft, ChecklistN1Item } from "@/types/guided-ticket-intake";
import { ESCALATION_CRITERION_LABELS } from "@/types/guided-ticket-intake";
import { buildN1Package, buildEscalationPayload } from "@/intelligence/n1-package-builder";
import { READINESS_COLORS, READINESS_LABELS } from "@/utils/ticket-readiness-engine";

interface Props {
  ticket: Ticket;
  /** Si el ticket vino del Guided Intake con draft preservado, se pasa acá.
   *  Si null, reconstruimos un draft mínimo a partir del ticket. */
  intakeDraft?: GuidedTicketDraft | null;
  /** Callback al marcar resuelto N1. */
  onResolveN1?: (resolutionNote: string) => void;
  /** Callback al escalar con paquete completo. */
  onEscalateWithPackage?: (payload: ReturnType<typeof buildEscalationPayload>) => void;
  /** Quién está operando (para audit). */
  actor: string;
}

/** Reconstruye un draft mínimo desde un Ticket — usado cuando no vino del wizard.
 *  v0.12.1 — usa toda la descripción + datos de intelligence si están disponibles
 *  para que el N1 package no quede vacío en tickets viejos. */
function reconstructDraftFromTicket(ticket: Ticket): GuidedTicketDraft {
  const intel = ticket.intelligence;
  const analysis = intel?.analysis as { detectedContext?: { issueType?: string; module?: string; process?: string; transaction?: string } } | undefined;
  const ctx = analysis?.detectedContext;
  return {
    title: ticket.title,
    context: {
      environment: ticket.environment || "",
      sapModule: ticket.sapModule || ctx?.module || "",
      process: ctx?.process || "",
      transaction: ctx?.transaction || "",
      priority: ticket.priority || "Medium",
    },
    problem: {
      // FIX-2 — usar descripción completa, no truncar a 200; buildN1Package decide
      whatIntended: ticket.description || "",
      // Si tenemos analysis con error code detectado, lo pasamos
      errorMessageExact: "",
    },
    sapData: {},
    evidence: {
      items: [],
      textualLog: "",
    },
    reporter: ticket.reporter,
  };
}

export default function N1PackageSection({
  ticket, intakeDraft, onResolveN1, onEscalateWithPackage, actor,
}: Props) {
  const draft = useMemo(
    () => intakeDraft ?? reconstructDraftFromTicket(ticket),
    [intakeDraft, ticket],
  );
  const n1Package = useMemo(() => buildN1Package(draft), [draft]);

  // Estado de checklist (qué items marcó el operador como hechos)
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [primaryCriterion, setPrimaryCriterion] = useState(
    n1Package.escalationCriteria[0] ?? "no_playbook_available",
  );

  function toggleChecklist(id: string) {
    setChecklistState((s) => ({ ...s, [id]: !s[id] }));
  }

  function handleResolveN1() {
    if (!resolutionNote.trim()) return;
    onResolveN1?.(resolutionNote);
    setShowResolveForm(false);
    setResolutionNote("");
  }

  function handleEscalate() {
    if (!escalationReason.trim()) return;
    // Convertir checklistState a items
    const completedIds = Object.keys(checklistState).filter((k) => checklistState[k]);
    const updatedChecklist: ChecklistN1Item[] = n1Package.n1Checklist.map((c) =>
      completedIds.includes(c.id) ? { ...c, completed: true } : c
    );
    const actionsTaken = updatedChecklist
      .filter((c) => c.completed)
      .map((c) => c.label);

    const payload = buildEscalationPayload({
      ticketKey: ticket.key,
      draft,
      n1Package: { ...n1Package, n1Checklist: updatedChecklist },
      n1ActionsTaken: actionsTaken,
      hypothesesRuledOut: [], // futura iteración: form para que el N1 declare hipótesis
      escalationReason,
      primaryCriterion: primaryCriterion as never,
      escalatedBy: actor,
    });
    onEscalateWithPackage?.(payload);
    setShowEscalateForm(false);
    setEscalationReason("");
  }

  const readinessColor = READINESS_COLORS[n1Package.readinessStatus];

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${readinessColor}`,
      padding: 14,
      // Cap defensivo — la card no debe empujar el TCC
      maxHeight: 580,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      // FIX v0.14.2 — anti texto-vertical-roto
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      wordBreak: "normal",
      overflowWrap: "break-word",
    }}>
      {/* Header */}
      <div className="row between" style={{
        alignItems: "center", marginBottom: 10, flexShrink: 0,
        gap: 8, flexWrap: "wrap",
      }}>
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2.4, color: "var(--text-dim)" }}>
            ▸ PAQUETE · N1
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            🧭 Resolución guiada N1
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color: readinessColor,
            fontVariantNumeric: "tabular-nums", lineHeight: 1,
          }}>
            {n1Package.readinessScore}<span style={{ fontSize: 11, color: "var(--text-dim)" }}>/100</span>
          </div>
          <div style={{ fontSize: 10, color: readinessColor, fontWeight: 600 }}>
            {READINESS_LABELS[n1Package.readinessStatus]}
          </div>
        </div>
      </div>

      {/* Scroll interno */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", width: "100%", minWidth: 0 }}>
        {/* Clasificación + ETA */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10,
          fontSize: 11.5,
        }}>
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: 10, letterSpacing: 1.2 }}>CLASIFICACIÓN</div>
            <div style={{ color: "var(--text)" }}>
              <strong>{n1Package.sapClassification.module}</strong>
              {n1Package.sapClassification.process && <> · {n1Package.sapClassification.process}</>}
              {n1Package.sapClassification.transaction && <> · <code>{n1Package.sapClassification.transaction}</code></>}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: 10, letterSpacing: 1.2 }}>ETA PRELIMINAR</div>
            <div style={{ color: "var(--text)" }}>
              <strong>{n1Package.estimatedHours.min}–{n1Package.estimatedHours.max}h</strong>
              <span style={{ color: "var(--text-dim)" }}> · {n1Package.estimatedHours.confidence}</span>
            </div>
          </div>
        </div>

        {/* Playbook sugerido */}
        {n1Package.suggestedPlaybook && (
          <div style={{
            padding: 8, marginBottom: 8,
            background: "rgba(168,85,247,0.10)",
            border: "1px solid rgba(168,85,247,0.30)",
            borderRadius: 4, fontSize: 11.5,
          }}>
            <div style={{ color: "#a855f7", fontWeight: 600 }}>📕 Playbook sugerido</div>
            <div style={{ color: "var(--text-soft)" }}>{n1Package.suggestedPlaybook.title}</div>
            {n1Package.suggestedPlaybook.reason && (
              <div style={{ color: "var(--text-dim)", fontSize: 10.5, marginTop: 2 }}>
                {n1Package.suggestedPlaybook.reason}
              </div>
            )}
          </div>
        )}

        {/* Faltantes */}
        {n1Package.missingInfo.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
              FALTA INFORMACIÓN ({n1Package.missingInfo.length})
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#fca5a5" }}>
              {n1Package.missingInfo.slice(0, 5).map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}

        {/* Criterios escalamiento */}
        {n1Package.escalationCriteria.length > 0 && (
          <div style={{
            padding: 8, marginBottom: 10,
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.30)",
            borderRadius: 4, fontSize: 11.5,
          }}>
            <div style={{ color: "#ef4444", fontWeight: 600 }}>⚠ Criterios de escalamiento N2 detectados</div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 11 }}>
              {n1Package.escalationCriteria.map((c) => (
                <li key={c}>{ESCALATION_CRITERION_LABELS[c]}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Checklist N1 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 4 }}>
            CHECKLIST N1 ({n1Package.n1Checklist.filter((c) => c.resolvableN1).length} resolubles ·
            {" "}{n1Package.n1Checklist.filter((c) => !c.resolvableN1).length} requieren N2)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", minWidth: 0 }}>
            {n1Package.n1Checklist.map((c) => {
              const checked = !!checklistState[c.id];
              return (
                <label key={c.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 6px",
                  background: c.resolvableN1 ? "transparent" : "rgba(239,68,68,0.05)",
                  borderLeft: c.resolvableN1 ? "2px solid #10b98155" : "2px solid #ef4444aa",
                  borderRadius: 3,
                  cursor: "pointer", fontSize: 11.5,
                  // FIX v0.14.2 — anti texto-vertical-roto
                  width: "100%", minWidth: 0, boxSizing: "border-box",
                }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => toggleChecklist(c.id)}
                    disabled={!c.resolvableN1}
                    style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{
                    flex: "1 1 0", minWidth: 0,
                    wordBreak: "normal", overflowWrap: "break-word",
                  }}>
                    <div style={{
                      color: c.resolvableN1 ? "var(--text)" : "var(--text-dim)",
                      textDecoration: checked ? "line-through" : "none",
                      wordBreak: "normal", overflowWrap: "break-word",
                    }}>
                      <strong>{c.order}.</strong> {c.label}
                      {!c.resolvableN1 && <span style={{ marginLeft: 6, fontSize: 10, color: "#ef4444" }}>(N2)</span>}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 1, wordBreak: "normal", overflowWrap: "break-word" }}>
                        {c.description}
                      </div>
                    )}
                    {c.escalateReason && (
                      <div style={{ fontSize: 10, color: "#fca5a5", marginTop: 1, wordBreak: "normal", overflowWrap: "break-word" }}>
                        ⚠ {c.escalateReason}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Forms inline para resolver / escalar */}
        {showResolveForm && (
          <div style={{
            padding: 10, marginTop: 8,
            background: "rgba(16,185,129,0.10)",
            border: "1px solid rgba(16,185,129,0.30)",
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 4 }}>
              ✓ Marcar resuelto en N1
            </div>
            <textarea rows={3} value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describí qué hiciste para resolver el ticket en N1..."
              style={{ width: "100%", fontSize: 11.5 }} />
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <button className="btn ghost sm" onClick={() => setShowResolveForm(false)} style={{ fontSize: 11 }}>
                Cancelar
              </button>
              <button className="btn primary sm" onClick={handleResolveN1}
                disabled={!resolutionNote.trim()}
                style={{ fontSize: 11, background: "#10b981", borderColor: "#10b981" }}>
                Confirmar resolución
              </button>
            </div>
          </div>
        )}

        {showEscalateForm && (
          <div style={{
            padding: 10, marginTop: 8,
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.30)",
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>
              🚀 Escalar a N2 con paquete completo
            </div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-soft)", marginBottom: 2 }}>
              Criterio principal:
            </label>
            <select value={primaryCriterion}
              onChange={(e) => setPrimaryCriterion(e.target.value as never)}
              style={{ width: "100%", fontSize: 11.5, marginBottom: 6 }}>
              {Object.entries(ESCALATION_CRITERION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-soft)", marginBottom: 2 }}>
              Razón del escalamiento:
            </label>
            <textarea rows={3} value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Por qué N1 no puede resolver este caso..."
              style={{ width: "100%", fontSize: 11.5 }} />
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <button className="btn ghost sm" onClick={() => setShowEscalateForm(false)} style={{ fontSize: 11 }}>
                Cancelar
              </button>
              <button className="btn primary sm" onClick={handleEscalate}
                disabled={!escalationReason.trim()}
                style={{ fontSize: 11, background: "#ef4444", borderColor: "#ef4444" }}>
                Confirmar escalamiento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Acciones (siempre visibles, fuera del scroll) */}
      <div className="row" style={{ gap: 8, marginTop: 10, flexShrink: 0, flexWrap: "wrap" }}>
        {!showResolveForm && !showEscalateForm && (
          <>
            <button className="btn ghost sm" onClick={() => setShowResolveForm(true)}
              style={{ fontSize: 11, color: "#10b981", borderColor: "#10b98155" }}>
              ✓ Marcar resuelto N1
            </button>
            <button className="btn ghost sm" onClick={() => setShowEscalateForm(true)}
              style={{ fontSize: 11, color: "#ef4444", borderColor: "#ef444455" }}>
              🚀 Escalar a N2 con paquete completo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
