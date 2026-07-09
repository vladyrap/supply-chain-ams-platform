"use client";

// =============================================================================
// N1PackageSection — Sección dedicada en el Ticket Command Center
// =============================================================================
// Muestra el "Paquete N1" del ticket (cuando se creó via Guided Intake o se
// puede inferir). v0.14.4 refactor visual:
//   - Header con score como mini progress bar (sin número flotante)
//   - Estados claros: vacío / loading / failed / contenido
//   - Datos recibidos vs faltantes en dos columnas
//   - Checklist con <div> clickeable (no <label>) + badge N1/N2
//   - Scroll interno solo si > 8 items
//   - Defensivo contra data corrupta via normalizeN1PackageForUI()
// =============================================================================

import { useMemo, useState } from "react";
import type { Ticket } from "@/services/tickets.api";
import type { GuidedTicketDraft, ChecklistN1Item } from "@/types/guided-ticket-intake";
import { buildN1Package, buildEscalationPayload } from "@/intelligence/n1-package-builder";
import { ESCALATION_CRITERION_LABELS } from "@/types/guided-ticket-intake";
import { normalizeN1PackageForUI } from "@/intelligence/n1-package-ui-normalizer";

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

/** Reconstruye un draft mínimo desde un Ticket — usado cuando no vino del wizard. */
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
      whatIntended: ticket.description || "",
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
  // v0.14.4 — normalizar para UI (filtra items vacíos, deriva readinessLevel, etc.)
  const ui = useMemo(() => normalizeN1PackageForUI(n1Package), [n1Package]);

  // Estado del ticket para mostrar loading / failed apropiadamente
  const enrichStatus = ticket.intelligence?.status;
  const isEnriching = enrichStatus === "enriching";
  const isFailed = enrichStatus === "enrichment_failed";

  // Estado de checklist (qué items marcó el operador como hechos)
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [primaryCriterion, setPrimaryCriterion] = useState<string>(
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
    const completedIds = Object.keys(checklistState).filter((k) => checklistState[k]);
    const updatedChecklist: ChecklistN1Item[] = n1Package.n1Checklist.map((c) =>
      completedIds.includes(c.id) ? { ...c, completed: true } : c,
    );
    const actionsTaken = updatedChecklist.filter((c) => c.completed).map((c) => c.label);

    const payload = buildEscalationPayload({
      ticketKey: ticket.key,
      draft,
      n1Package: { ...n1Package, n1Checklist: updatedChecklist },
      n1ActionsTaken: actionsTaken,
      hypothesesRuledOut: [],
      escalationReason,
      primaryCriterion: primaryCriterion as never,
      escalatedBy: actor,
    });
    onEscalateWithPackage?.(payload);
    setShowEscalateForm(false);
    setEscalationReason("");
  }

  // ── Estado: loading (enriching) ─────────────────────────────────────────
  if (isEnriching) {
    return (
      <div className="card" style={{
        borderLeft: "4px solid #4589ff", padding: 14,
        display: "flex", flexDirection: "column", gap: 8,
        width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: "var(--text-dim)" }}>
          ▸ PAQUETE · N1
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-soft)" }}>
          <span className="spinner" /> 🧭 Generando Paquete N1…
        </div>
        {/* skeleton 3 filas */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 14, borderRadius: 3,
              background: "linear-gradient(90deg, rgba(69,137,255,0.10), rgba(69,137,255,0.04))",
              animation: "amsPulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Estado: failed ───────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className="card" style={{
        borderLeft: "4px solid #fa4d56", padding: 14,
        display: "flex", flexDirection: "column", gap: 8,
        width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: "var(--text-dim)" }}>
          ▸ PAQUETE · N1
        </div>
        <div style={{ fontSize: 13, color: "#fca5a5" }}>
          ⚠ No se pudo generar el Paquete N1: {ticket.intelligence?.error || "error desconocido"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Tocá <strong>Reanalizar con Agente AMS</strong> arriba para reintentar.
        </div>
      </div>
    );
  }

  // ── Estado: ui null o sin contenido ──────────────────────────────────────
  if (!ui || !ui.hasContent) {
    return (
      <div className="card" style={{
        borderLeft: "4px solid #94a3b8", padding: 14,
        display: "flex", flexDirection: "column", gap: 6,
        width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: "var(--text-dim)" }}>
          ▸ PAQUETE · N1
        </div>
        <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
          🧭 Este ticket aún no tiene Paquete N1 generado.
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Se generará automáticamente cuando el ticket termine de enriquecerse, o reanalizá manualmente.
        </div>
      </div>
    );
  }

  // ── Estado: contenido normal ─────────────────────────────────────────────
  // Scroll interno SOLO si el checklist tiene más de 8 items
  const needsScroll = ui.checklistItems.length > 8;
  const maxCardHeight = needsScroll ? 620 : undefined;

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${ui.readinessColor}`,
      padding: 14,
      display: "flex", flexDirection: "column",
      width: "100%", minWidth: 0, boxSizing: "border-box",
      wordBreak: "normal", overflowWrap: "break-word",
      ...(maxCardHeight ? { maxHeight: maxCardHeight, overflow: "hidden" } : {}),
    }}>
      {/* HEADER — título + score con progress bar integrado */}
      <div style={{ flexShrink: 0, marginBottom: 10 }}>
        <div className="row between" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 200px" }}>
            <div style={{ fontSize: 10, letterSpacing: 2.4, color: "var(--text-dim)" }}>
              ▸ PAQUETE · N1
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              🧭 Resolución guiada N1
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{
              fontSize: 11, color: ui.readinessColor, fontWeight: 700,
              letterSpacing: 0.5,
            }}>
              {ui.readinessScore}/100 · {ui.readinessLabel}
            </div>
          </div>
        </div>
        {/* Mini progress bar bajo el header */}
        <div style={{
          marginTop: 6, height: 4, borderRadius: 2,
          background: "rgba(100,116,139,0.20)", overflow: "hidden",
        }}>
          <div style={{
            width: `${ui.readinessScore}%`, height: "100%",
            background: ui.readinessColor, transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* BODY — scroll interno opcional. v0.14.5: display:block forzado para
          neutralizar cualquier flex/grid heredado del padre que rompa width */}
      <div style={{
        display: "block",
        flex: 1, minHeight: 0,
        ...(needsScroll ? { overflowY: "auto", overflowX: "hidden" } : {}),
        width: "100%", minWidth: 0,
        boxSizing: "border-box",
      }}>
        {/* Clasificación + ETA en una fila */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 11.5,
        }}>
          <div style={{
            flex: "1 1 180px", padding: "6px 10px",
            background: "rgba(69,137,255,0.08)",
            border: "1px solid rgba(69,137,255,0.25)",
            borderRadius: 4, minWidth: 0,
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "var(--text-dim)" }}>CLASIFICACIÓN</div>
            <div style={{ color: "var(--text)", fontWeight: 600, wordBreak: "break-word" }}>
              {ui.classificationLabel}
            </div>
          </div>
          <div style={{
            flex: "1 1 140px", padding: "6px 10px",
            background: "rgba(168,85,247,0.08)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: 4, minWidth: 0,
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "var(--text-dim)" }}>ETA</div>
            <div style={{ color: "var(--text)", fontWeight: 600 }}>{ui.etaLabel}</div>
          </div>
        </div>

        {/* Playbook sugerido */}
        {ui.suggestedPlaybook && (
          <div style={{
            padding: 8, marginBottom: 10,
            background: "rgba(168,85,247,0.10)",
            border: "1px solid rgba(168,85,247,0.30)",
            borderRadius: 4, fontSize: 11.5,
          }}>
            <div style={{ color: "#a855f7", fontWeight: 600 }}>📕 Playbook sugerido</div>
            <div style={{ color: "var(--text-soft)" }}>{ui.suggestedPlaybook.title}</div>
            {ui.suggestedPlaybook.reason && (
              <div style={{ color: "var(--text-dim)", fontSize: 10.5, marginTop: 2 }}>
                {ui.suggestedPlaybook.reason}
              </div>
            )}
          </div>
        )}

        {/* Datos recibidos vs faltantes — lado a lado */}
        {(ui.receivedDataItems.length > 0 || ui.missingDataItems.length > 0) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {ui.receivedDataItems.length > 0 && (
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "var(--text-dim)", marginBottom: 3 }}>
                  DATOS RECIBIDOS ({ui.receivedDataItems.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#10b981" }}>
                  {ui.receivedDataItems.map((d) => <li key={d} style={{ wordBreak: "break-word" }}>✓ {d}</li>)}
                </ul>
              </div>
            )}
            {ui.missingDataItems.length > 0 && (
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "var(--text-dim)", marginBottom: 3 }}>
                  FALTA INFORMACIÓN ({ui.missingDataItems.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#fca5a5" }}>
                  {ui.missingDataItems.map((m) => <li key={m} style={{ wordBreak: "break-word" }}>⚠ {m}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Criterios escalamiento N2 */}
        {ui.escalationItems.length > 0 && (
          <div style={{
            padding: 8, marginBottom: 10,
            background: "rgba(250,77,86,0.10)",
            border: "1px solid rgba(250,77,86,0.30)",
            borderRadius: 4, fontSize: 11.5,
          }}>
            <div style={{ color: "#fa4d56", fontWeight: 600, marginBottom: 2 }}>
              ⚠ {ui.escalationItems.length} criterio{ui.escalationItems.length === 1 ? "" : "s"} de escalamiento N2
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
              {ui.escalationItems.map((e) => (
                <li key={e.criterion} style={{ wordBreak: "break-word" }}>
                  {ESCALATION_CRITERION_LABELS[e.criterion] || e.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Checklist N1 */}
        {ui.checklistItems.length > 0 ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "var(--text-dim)", marginBottom: 4 }}>
              CHECKLIST N1 ({ui.checklistItems.filter((c) => !c.requiresN2).length} resoluble · {ui.checklistItems.filter((c) => c.requiresN2).length} requiere N2)
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 4,
              width: "100%",
              minWidth: 0,
            }}>
              {ui.checklistItems.map((c) => {
                const checked = !!checklistState[c.id];
                const itemColor = c.requiresN2 ? "#fa4d56" : "#10b981";
                return (
                  // v0.14.6 — Posicionamiento absoluto del checkbox + badge.
                  // El contenedor es display:block (no flex/grid) para escapar
                  // de cualquier CSS heredado que rompa los layouts modernos.
                  // El texto fluye natural con padding-left/right que hace lugar
                  // al checkbox absoluto a la izquierda y al badge absoluto a la derecha.
                  <div
                    key={c.id}
                    onClick={() => c.requiresN2 ? undefined : toggleChecklist(c.id)}
                    style={{
                      display: "block",
                      position: "relative",
                      padding: "8px 48px 8px 30px",   // L: 30 (checkbox) · R: 48 (badge N1/N2)
                      background: c.requiresN2 ? "rgba(250,77,86,0.05)" : "rgba(16,185,129,0.04)",
                      borderLeft: `3px solid ${itemColor}aa`,
                      borderRadius: 3,
                      cursor: c.requiresN2 ? "not-allowed" : "pointer",
                      fontSize: 11.5,
                      width: "100%",
                      boxSizing: "border-box",
                      minHeight: 32,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {/* checkbox absoluto a la izquierda */}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecklist(c.id)}
                      disabled={c.requiresN2}
                      style={{
                        position: "absolute",
                        left: 8,
                        top: 10,
                        cursor: c.requiresN2 ? "not-allowed" : "pointer",
                        margin: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {/* badge absoluto a la derecha */}
                    <span style={{
                      position: "absolute",
                      right: 6,
                      top: 8,
                      fontSize: 9, fontWeight: 700, letterSpacing: 1,
                      padding: "2px 6px", borderRadius: 3,
                      background: c.requiresN2 ? "rgba(250,77,86,0.20)" : "rgba(16,185,129,0.20)",
                      color: itemColor,
                      border: `1px solid ${itemColor}55`,
                    }}>
                      {c.requiresN2 ? "N2" : "N1"}
                    </span>
                    {/* contenido — fluye natural en el espacio entre checkbox y badge */}
                    <div style={{
                      color: c.requiresN2 ? "var(--text-dim)" : "var(--text)",
                      textDecoration: checked ? "line-through" : "none",
                      lineHeight: 1.4,
                    }}>
                      <span style={{ fontWeight: 600, marginRight: 4 }}>{c.order}.</span>
                      {c.label}
                    </div>
                    {c.description && (
                      <div style={{
                        fontSize: 10.5, color: "var(--text-dim)",
                        marginTop: 2, lineHeight: 1.35,
                      }}>
                        {c.description}
                      </div>
                    )}
                    {c.escalateReason && (
                      <div style={{ fontSize: 10, color: "#fca5a5", marginTop: 2 }}>
                        ⚠ {c.escalateReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", padding: 8, marginBottom: 10 }}>
            No hay checklist N1 generado. Reanalizá el ticket para producir uno.
          </div>
        )}

        {/* Forms inline para resolver / escalar */}
        {showResolveForm && (
          <div style={{
            padding: 10, marginTop: 4,
            background: "rgba(16,185,129,0.10)",
            border: "1px solid rgba(16,185,129,0.30)",
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 4 }}>
              ✓ Marcar resuelto en N1
            </div>
            <textarea rows={3} value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describí qué hiciste para resolver el ticket en N1…"
              style={{ width: "100%", fontSize: 11.5, boxSizing: "border-box" }} />
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
            padding: 10, marginTop: 4,
            background: "rgba(250,77,86,0.10)",
            border: "1px solid rgba(250,77,86,0.30)",
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 11, color: "#fa4d56", fontWeight: 600, marginBottom: 4 }}>
              🚀 Escalar a N2 con paquete completo
            </div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-soft)", marginBottom: 2 }}>
              Criterio principal:
            </label>
            <select value={primaryCriterion}
              onChange={(e) => setPrimaryCriterion(e.target.value)}
              style={{ width: "100%", fontSize: 11.5, marginBottom: 6, boxSizing: "border-box" }}>
              {Object.entries(ESCALATION_CRITERION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-soft)", marginBottom: 2 }}>
              Razón del escalamiento:
            </label>
            <textarea rows={3} value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Por qué N1 no puede resolver este caso…"
              style={{ width: "100%", fontSize: 11.5, boxSizing: "border-box" }} />
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <button className="btn ghost sm" onClick={() => setShowEscalateForm(false)} style={{ fontSize: 11 }}>
                Cancelar
              </button>
              <button className="btn primary sm" onClick={handleEscalate}
                disabled={!escalationReason.trim()}
                style={{ fontSize: 11, background: "#fa4d56", borderColor: "#fa4d56" }}>
                Confirmar escalamiento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ACCIONES — siempre visibles abajo de la card */}
      <div className="row" style={{
        gap: 8, marginTop: 10, flexShrink: 0, flexWrap: "wrap",
      }}>
        {!showResolveForm && !showEscalateForm && (
          <>
            <button className="btn ghost sm" onClick={() => setShowResolveForm(true)}
              disabled={!ui.canResolveAtN1}
              style={{
                fontSize: 11,
                color: ui.canResolveAtN1 ? "#10b981" : "var(--text-dim)",
                borderColor: ui.canResolveAtN1 ? "#10b98155" : "var(--border-soft)",
              }}
              title={ui.canResolveAtN1 ? "Marcar el ticket como resuelto en N1" : "Sin pasos N1 resolubles"}>
              ✓ Marcar resuelto N1
            </button>
            <button className="btn ghost sm" onClick={() => setShowEscalateForm(true)}
              style={{ fontSize: 11, color: "#fa4d56", borderColor: "#fa4d5655" }}>
              🚀 Escalar a N2 con paquete completo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
