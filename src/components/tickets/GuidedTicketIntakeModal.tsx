"use client";

// =============================================================================
// GuidedTicketIntakeModal — Wizard de 6 pasos para creación de tickets SAP
// =============================================================================
// Reemplaza el flujo "texto libre" del CreateTicketModal por un wizard guiado
// que pide datos estructurados según el módulo SAP, calcula readiness antes
// de enviar y prepara un paquete N1 completo.
//
// El modal NO reemplaza al CreateTicketModal actual — convive con él.
// El usuario puede elegir "Crear rápido" o "Crear guiado" desde /tickets.
//
// Política respetada: las imágenes NO se guardan en localStorage ni se suben
// como base64. Sólo notas resumen vía VisualEvidenceUploader.
// =============================================================================

import { useMemo, useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import VisualEvidenceUploader from "./VisualEvidenceUploader";
import { createTicket, type CreateTicketInput, type Ticket } from "@/services/tickets.api";
import { getSapIntakeSpec, SAP_MODULES_WITH_SPEC } from "@/lib/sap-intake-fields";
import { calculateDraftReadiness, READINESS_COLORS, READINESS_LABELS } from "@/utils/ticket-readiness-engine";
import { buildN1Package, buildStructuredDescription } from "@/intelligence/n1-package-builder";
import { kickoffEnrichmentForNewTicket } from "@/intelligence/enrichment-kickoff";
import { useAuth } from "@/context/AuthContext";
import type {
  GuidedTicketDraft, IntakeContext, IntakeProblem, IntakeSapData,
  IntakeEvidence, BusinessImpactLevel, IssueFrequency,
} from "@/types/guided-ticket-intake";
import { WAITING_INFORMATION_STATUS } from "@/types/guided-ticket-intake";
import type { TemporaryVisualEvidence } from "@/types/visual-evidence";
import { temporaryToNote } from "@/types/visual-evidence";

// ============================================================
// Constantes UI
// ============================================================

const ENVS = ["DEV", "QA", "UAT", "PRD", "SANDBOX"];
const PRIORITIES = ["Highest", "High", "Medium", "Low"];
const IMPACT_OPTIONS: { value: BusinessImpactLevel; label: string }[] = [
  { value: "blocks_critical_process", label: "Bloquea proceso crítico (logística, facturación)" },
  { value: "blocks_user_work",        label: "Bloquea trabajo de un usuario/equipo" },
  { value: "workaround_exists",       label: "Hay workaround temporal" },
  { value: "cosmetic",                label: "Sólo molestia visual" },
];
const FREQ_OPTIONS: { value: IssueFrequency; label: string }[] = [
  { value: "always",         label: "Siempre que se ejecuta" },
  { value: "intermittent",   label: "Intermitente" },
  { value: "specific_data",  label: "Sólo con datos específicos" },
  { value: "first_time",     label: "Ocurrió una sola vez" },
];

type Step = 1 | 2 | 3 | 4 | 5 | 6;

// ============================================================
// Componente principal
// ============================================================

interface Props {
  open: boolean;
  defaultReporter?: string | null;
  onClose: () => void;
  onCreated: (ticket: Ticket, opts: { waitingInformation: boolean }) => void;
}

const EMPTY_CONTEXT: IntakeContext = {
  client: "",
  environment: "",
  sapModule: "",
  process: "",
  transaction: "",
  priority: "Medium",
  businessImpact: undefined,
  businessImpactDetail: "",
};

const EMPTY_PROBLEM: IntakeProblem = {
  whatIntended: "",
  whereFails: "",
  errorMessageExact: "",
  sinceWhen: "",
  workedBefore: "unknown",
  affectedUsers: "one",
  affectedDocs: "one",
  frequency: undefined,
};

export default function GuidedTicketIntakeModal({
  open, defaultReporter, onClose, onCreated,
}: Props) {
  const { user: authUser } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [context, setContext] = useState<IntakeContext>(EMPTY_CONTEXT);
  const [problem, setProblem] = useState<IntakeProblem>(EMPTY_PROBLEM);
  const [sapData, setSapData] = useState<IntakeSapData>({});
  const [evidence, setEvidence] = useState<IntakeEvidence>({ items: [], textualLog: "" });
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spec dinámico según módulo
  const spec = useMemo(() => getSapIntakeSpec(context.sapModule), [context.sapModule]);

  // Título auto-generado desde context (paso 6 lo puede sobrescribir manualmente)
  const [titleOverride, setTitleOverride] = useState<string>("");
  const autoTitle = useMemo(() => {
    const parts: string[] = [];
    if (context.sapModule)   parts.push(`[${context.sapModule}]`);
    if (context.transaction) parts.push(context.transaction);
    if (problem.errorMessageExact) parts.push(problem.errorMessageExact.slice(0, 60));
    else if (problem.whatIntended) parts.push(problem.whatIntended.slice(0, 60));
    return parts.join(" ") || "Ticket SAP";
  }, [context.sapModule, context.transaction, problem.errorMessageExact, problem.whatIntended]);

  // Draft completo para readiness y package
  const draft: GuidedTicketDraft = useMemo(() => ({
    title: titleOverride.trim() || autoTitle,
    context,
    problem,
    sapData,
    evidence,
    reporter: defaultReporter,
  }), [titleOverride, autoTitle, context, problem, sapData, evidence, defaultReporter]);

  // Readiness en vivo
  const readiness = useMemo(() => calculateDraftReadiness(draft), [draft]);
  const n1Package = useMemo(() => buildN1Package(draft), [draft]);

  if (!open) return null;

  function cleanupPreviews() {
    for (const e of evidence.items) {
      if (e.previewUrl) URL.revokeObjectURL(e.previewUrl);
    }
  }

  function reset() {
    setStep(1);
    setContext(EMPTY_CONTEXT);
    setProblem(EMPTY_PROBLEM);
    setSapData({});
    setEvidence({ items: [], textualLog: "" });
    setTitleOverride("");
    setError(null);
  }

  function handleClose() {
    cleanupPreviews();
    reset();
    onClose();
  }

  function updateSapField(id: string, value: string) {
    setSapData((cur) => ({ ...cur, [id]: value }));
  }

  function setEvidenceItems(items: TemporaryVisualEvidence[]) {
    setEvidence((cur) => ({ ...cur, items }));
  }

  // ── Validación mínima por paso (para botón Siguiente) ──
  function canAdvance(): boolean {
    if (step === 1) return !!context.environment && !!context.sapModule && !!context.priority;
    if (step === 2) return (problem.whatIntended ?? "").trim().length >= 10;
    // pasos 3, 4, 5 son siempre avanzables (campos opcionales)
    return true;
  }

  // ── Submit final ──
  async function submit(opts: { waitingInformation: boolean }) {
    setBusy(true);
    setError(null);

    const notes = evidence.items
      .filter((e) => e.visualAnalysis && e.consideredForEstimate)
      .map(temporaryToNote);

    const payload: CreateTicketInput = {
      title: draft.title,
      description: buildStructuredDescription(draft),
      priority: context.priority,
      reporter: defaultReporter || null,
      sapModule: context.sapModule || null,
      environment: context.environment || null,
      visualEvidenceNotes: notes.length > 0 ? notes : undefined,
    };

    const res = await createTicket(payload);
    if (!("success" in res) || !res.success) {
      setBusy(false);
      setError("error" in res ? res.error : "Error al crear el ticket");
      return;
    }

    // TCC v0.12 — disparar AIE inmediatamente y reusar el N1Package del wizard.
    const baseTicket: Ticket = opts.waitingInformation
      ? { ...res.ticket, status: WAITING_INFORMATION_STATUS }
      : res.ticket;

    setEnriching(true);
    const actor = authUser?.name || authUser?.email || "Consultor AMS";
    const enrichedIntelligence = await kickoffEnrichmentForNewTicket(baseTicket, {
      actor,
      preloadedN1Package: n1Package, // el wizard ya lo construyó con contexto rico
    });
    setEnriching(false);
    setBusy(false);

    const finalTicket: Ticket = { ...baseTicket, intelligence: enrichedIntelligence };
    cleanupPreviews();
    reset();
    onCreated(finalTicket, opts);
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <ModalPortal open={open} onClose={handleClose} maxWidth={780} contentClassName="card">
      <div style={{ padding: 20, maxHeight: "85vh", overflowY: "auto" }}>
        {/* Header con stepper + readiness */}
        <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2.4, color: "var(--text-dim)" }}>
              GUIDED · TICKET · INTAKE
            </div>
            <h3 style={{ margin: "2px 0 0", fontSize: 17 }}>🧭 Crear Ticket Guiado</h3>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-soft)" }}>
              Paso {step} de 6 — pasaremos de texto libre a un caso accionable para N1.
            </p>
          </div>
          {/* Readiness en vivo */}
          <div style={{
            padding: "6px 10px",
            background: "rgba(0,0,0,0.03)",
            border: `1px solid ${READINESS_COLORS[readiness.status]}55`,
            borderLeft: `3px solid ${READINESS_COLORS[readiness.status]}`,
            borderRadius: 6,
            textAlign: "right",
          }}>
            <div style={{ fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 1.2 }}>READINESS</div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: READINESS_COLORS[readiness.status],
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {readiness.score}<span style={{ fontSize: 10, color: "var(--text-dim)" }}>/100</span>
            </div>
            <div style={{ fontSize: 10, color: READINESS_COLORS[readiness.status], fontWeight: 600 }}>
              {READINESS_LABELS[readiness.status]}
            </div>
          </div>
        </div>

        {/* Stepper visual */}
        <div className="row" style={{ gap: 4, marginBottom: 14 }}>
          {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
            <div key={s} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: s <= step ? READINESS_COLORS[readiness.status] : "rgba(255,255,255,0.08)",
              transition: "background 0.2s",
            }} />
          ))}
        </div>

        {/* === Paso 1: Contexto === */}
        {step === 1 && (
          <Section title="1 · Contexto general">
            <Row>
              <Field label="Cliente">
                <input value={context.client} onChange={(e) => setContext({ ...context, client: e.target.value })}
                  placeholder="Nombre del cliente / empresa" />
              </Field>
              <Field label="Ambiente *">
                <select value={context.environment} onChange={(e) => setContext({ ...context, environment: e.target.value })}>
                  <option value="">— seleccionar —</option>
                  {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
            </Row>
            <Row>
              <Field label="Módulo SAP *">
                <select value={context.sapModule} onChange={(e) => setContext({ ...context, sapModule: e.target.value, process: "" })}>
                  <option value="">— seleccionar —</option>
                  {SAP_MODULES_WITH_SPEC.map((m) => <option key={m} value={m}>{m}</option>)}
                  <option value="OTRO">Otro / no listado</option>
                </select>
              </Field>
              <Field label="Proceso afectado">
                <select value={context.process || ""} onChange={(e) => setContext({ ...context, process: e.target.value })}
                  disabled={!context.sapModule}>
                  <option value="">— seleccionar —</option>
                  {spec.processes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>
            </Row>
            <Row>
              <Field label="Transacción o app Fiori"
                hint="Ej. MIGO / VA01 / 'Display Material Document'">
                <input value={context.transaction || ""} onChange={(e) => setContext({ ...context, transaction: e.target.value })}
                  placeholder="MIGO" />
              </Field>
              <Field label="Prioridad *">
                <select value={context.priority} onChange={(e) => setContext({ ...context, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </Row>
            <Field label="Nivel de impacto al negocio">
              <select value={context.businessImpact || ""}
                onChange={(e) => setContext({ ...context, businessImpact: (e.target.value || undefined) as BusinessImpactLevel })}>
                <option value="">— seleccionar —</option>
                {IMPACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Detalle del impacto al negocio"
              hint="Ej. 'No permite recibir mercadería crítica, hay 3 camiones esperando'">
              <textarea rows={2} value={context.businessImpactDetail || ""}
                onChange={(e) => setContext({ ...context, businessImpactDetail: e.target.value })}
                placeholder="Explicá brevemente qué consecuencia tiene este problema..." />
            </Field>
          </Section>
        )}

        {/* === Paso 2: Problema === */}
        {step === 2 && (
          <Section title="2 · Detalle del problema">
            <Field label="¿Qué intentabas hacer? *"
              hint="Acción concreta — ej. 'Hacer entrada de mercancía contra la OC 4500012345'">
              <textarea rows={2} value={problem.whatIntended || ""}
                onChange={(e) => setProblem({ ...problem, whatIntended: e.target.value })} />
            </Field>
            <Field label="¿En qué paso falla?"
              hint="Ej. 'Al presionar Verificar/Guardar, antes de generar el doc material'">
              <textarea rows={2} value={problem.whereFails || ""}
                onChange={(e) => setProblem({ ...problem, whereFails: e.target.value })} />
            </Field>
            <Field label="Mensaje de error exacto"
              hint="Copiá literal el mensaje de SAP (código + texto)">
              <textarea rows={2} value={problem.errorMessageExact || ""}
                onChange={(e) => setProblem({ ...problem, errorMessageExact: e.target.value })}
                placeholder="M7 022: Determinación de stock especial no posible..." />
            </Field>
            <Row>
              <Field label="¿Desde cuándo ocurre?">
                <input value={problem.sinceWhen || ""}
                  onChange={(e) => setProblem({ ...problem, sinceWhen: e.target.value })}
                  placeholder="Hoy / desde la actualización XYZ / desde el go-live" />
              </Field>
              <Field label="¿Antes funcionaba?">
                <select value={problem.workedBefore || "unknown"}
                  onChange={(e) => setProblem({ ...problem, workedBefore: e.target.value as IntakeProblem["workedBefore"] })}>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                  <option value="unknown">No sé</option>
                </select>
              </Field>
            </Row>
            <Row>
              <Field label="¿A cuántos usuarios afecta?">
                <select value={problem.affectedUsers || "one"}
                  onChange={(e) => setProblem({ ...problem, affectedUsers: e.target.value as IntakeProblem["affectedUsers"] })}>
                  <option value="one">Un usuario</option>
                  <option value="team">Un equipo</option>
                  <option value="all">Todos / muchos</option>
                </select>
              </Field>
              <Field label="¿A cuántos documentos afecta?">
                <select value={problem.affectedDocs || "one"}
                  onChange={(e) => setProblem({ ...problem, affectedDocs: e.target.value as IntakeProblem["affectedDocs"] })}>
                  <option value="one">Un documento</option>
                  <option value="multiple">Varios documentos</option>
                  <option value="all">Todos</option>
                </select>
              </Field>
            </Row>
            <Field label="Frecuencia del problema">
              <select value={problem.frequency || ""}
                onChange={(e) => setProblem({ ...problem, frequency: (e.target.value || undefined) as IssueFrequency })}>
                <option value="">— seleccionar —</option>
                {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </Section>
        )}

        {/* === Paso 3: Datos SAP dinámicos === */}
        {step === 3 && (
          <Section title={`3 · Datos SAP · ${spec.label}`}>
            <p style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: -6, marginBottom: 10 }}>
              Completá los campos relevantes. Cuanto más datos, más rápido podemos resolver en N1.
            </p>
            {spec.fields.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Sin spec específico para este módulo. Continuá al siguiente paso.
              </div>
            ) : (
              spec.fields.map((f) => (
                <Field key={f.id} label={f.label + (f.required ? " *" : "")} hint={f.hint}>
                  {f.type === "textarea" ? (
                    <textarea rows={3} value={sapData[f.id] || ""}
                      onChange={(e) => updateSapField(f.id, e.target.value)}
                      placeholder={f.placeholder} />
                  ) : (
                    <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={sapData[f.id] || ""}
                      onChange={(e) => updateSapField(f.id, e.target.value)}
                      placeholder={f.placeholder} />
                  )}
                </Field>
              ))
            )}
          </Section>
        )}

        {/* === Paso 4: Evidencia === */}
        {step === 4 && (
          <Section title="4 · Evidencia">
            <p style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: -6, marginBottom: 10 }}>
              Adjuntá una captura del error y/o pegá un log corto.
              <strong> Las imágenes no se guardan permanentemente</strong> — sólo se conservan
              el nombre, tipo, comentario y resumen del análisis.
            </p>
            <VisualEvidenceUploader
              evidence={evidence.items}
              onChange={setEvidenceItems}
              ticketTitle={draft.title}
              ticketDescription={problem.whatIntended + " " + problem.whereFails}
            />
            <Field label="Log o stack trace (opcional)"
              hint="Pegá un log corto (sin secretos, tokens ni passwords)">
              <textarea rows={4} value={evidence.textualLog || ""}
                onChange={(e) => setEvidence((cur) => ({ ...cur, textualLog: e.target.value }))}
                placeholder="Pegar log o stack trace..." />
            </Field>
          </Section>
        )}

        {/* === Paso 5: Readiness review === */}
        {step === 5 && (
          <Section title="5 · Readiness Score">
            <div style={{
              padding: 14, borderRadius: 8,
              background: "rgba(0,0,0,0.03)",
              border: `2px solid ${READINESS_COLORS[readiness.status]}`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)" }}>
                READINESS PARA N1
              </div>
              <div style={{
                fontSize: 48, fontWeight: 800,
                color: READINESS_COLORS[readiness.status],
                fontVariantNumeric: "tabular-nums", lineHeight: 1,
                margin: "6px 0",
              }}>
                {readiness.score}<span style={{ fontSize: 18, color: "var(--text-dim)" }}>/100</span>
              </div>
              <div style={{ fontSize: 14, color: READINESS_COLORS[readiness.status], fontWeight: 600 }}>
                {READINESS_LABELS[readiness.status]} · {
                  readiness.score >= 85 ? "Listo para N1" :
                  readiness.score >= 70 ? "Bueno para N1" :
                  readiness.score >= 40 ? "Parcial — falta info" :
                  "Insuficiente"
                }
              </div>
            </div>

            {readiness.missingItems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 6 }}>
                  FALTA COMPLETAR ({readiness.missingItems.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-soft)" }}>
                  {readiness.missingItems.slice(0, 8).map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}

            {readiness.recommendations.length > 0 && (
              <div style={{ marginTop: 12, padding: 10,
                background: "rgba(241,194,27,0.10)", border: "1px solid rgba(241,194,27,0.30)",
                borderRadius: 6, fontSize: 11.5 }}>
                <div style={{ color: "#f1c21b", fontWeight: 600, marginBottom: 4 }}>💡 Recomendaciones</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {readiness.recommendations.slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {readiness.score < 70 && (
              <div style={{ marginTop: 12, padding: 10,
                background: "rgba(250,77,86,0.10)", border: "1px solid rgba(250,77,86,0.30)",
                borderRadius: 6, fontSize: 12, color: "#fca5a5" }}>
                ⚠ Este ticket aún no tiene información suficiente para resolución N1.
                Podés volver atrás a completar datos, guardarlo como borrador, o crearlo
                con status "Espera información" para que el cliente complete.
              </div>
            )}
          </Section>
        )}

        {/* === Paso 6: Revisión final + título === */}
        {step === 6 && (
          <Section title="6 · Revisión final">
            <Field label="Título del ticket (auto-generado)"
              hint="Podés editarlo si querés algo distinto.">
              <input value={titleOverride || autoTitle}
                onChange={(e) => setTitleOverride(e.target.value)} />
            </Field>

            <div style={{ marginTop: 10, padding: 10,
              background: "rgba(0,0,0,0.03)", border: "1px solid var(--border-soft)",
              borderRadius: 6, fontSize: 11.5 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 6 }}>
                PAQUETE N1 PREVIEW
              </div>
              <div><strong>Clasificación:</strong> {n1Package.sapClassification.module} · {n1Package.sapClassification.process ?? "—"}{n1Package.sapClassification.transaction ? ` · ${n1Package.sapClassification.transaction}` : ""}</div>
              <div><strong>ETA preliminar:</strong> {n1Package.estimatedHours.min}-{n1Package.estimatedHours.max}h · confianza {n1Package.estimatedHours.confidence}</div>
              <div><strong>Playbook sugerido:</strong> {n1Package.suggestedPlaybook?.title ?? "—"}</div>
              <div><strong>Checklist N1:</strong> {n1Package.n1Checklist.length} pasos ({n1Package.n1Checklist.filter((c) => c.resolvableN1).length} resolubles N1)</div>
              {n1Package.escalationCriteria.length > 0 && (
                <div style={{ marginTop: 4, color: "#f1c21b" }}>
                  <strong>⚠ Criterios escalamiento:</strong> {n1Package.escalationCriteria.join(" · ")}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-soft)" }}>{n1Package.summary}</div>
            </div>

            {n1Package.initialCustomerResponse && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--text-soft)" }}>
                  ▶ Previsualizar respuesta inicial al cliente
                </summary>
                <div style={{ marginTop: 6, padding: 10, background: "rgba(0,0,0,0.05)",
                  borderRadius: 4, fontSize: 11, fontFamily: "ui-monospace, monospace",
                  whiteSpace: "pre-wrap" }}>
                  <strong>Asunto:</strong> {n1Package.initialCustomerResponse.subject}{"\n\n"}
                  {n1Package.initialCustomerResponse.body}
                </div>
              </details>
            )}
          </Section>
        )}

        {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}

        {/* === Navegación === */}
        <div className="row between" style={{ marginTop: 16, alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <button className="btn ghost" onClick={handleClose} disabled={busy}>Cancelar</button>
          <div className="row" style={{ gap: 8 }}>
            {step > 1 && (
              <button className="btn ghost" onClick={() => setStep((s) => (s - 1) as Step)} disabled={busy}>
                ← Atrás
              </button>
            )}
            {step < 6 && (
              <button className="btn primary" onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={busy || !canAdvance()}>
                Siguiente →
              </button>
            )}
            {step === 6 && (
              <>
                {readiness.score < 70 && (
                  <button className="btn ghost" onClick={() => submit({ waitingInformation: true })}
                    disabled={busy || enriching}
                    style={{ borderColor: "#f1c21b", color: "#f1c21b" }}>
                    {enriching ? "analizando…" : busy ? "creando…" : `⏳ Crear como "Espera información"`}
                  </button>
                )}
                <button className="btn primary" onClick={() => submit({ waitingInformation: false })}
                  disabled={busy || enriching || readiness.score < 40}
                  style={{
                    background: readiness.score >= 70
                      ? "linear-gradient(135deg, #10b981, #4589ff)"
                      : "linear-gradient(135deg, #6366f1, #a855f7)",
                    borderColor: readiness.score >= 70 ? "#10b981" : "#6366f1",
                  }}>
                  {enriching ? <><span className="spinner" /> analizando…</>
                    : busy ? "creando…"
                    : readiness.score >= 70 ? "✓ Crear ticket y preparar N1"
                    : "＋ Crear ticket"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* TCC v0.12 — banner enriching post-create */}
        {enriching && (
          <div className="alert info" style={{ marginTop: 10, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="spinner" /> 🤖 Agente AMS está analizando el ticket recién creado…
          </div>
        )}
      </div>
    </ModalPortal>
  );
}

// ============================================================
// Helpers de layout
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="tc-field">
      <span>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>{hint}</span>}
    </label>
  );
}
