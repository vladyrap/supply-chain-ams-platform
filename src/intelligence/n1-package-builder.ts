// =============================================================================
// N1 Package Builder + Escalation Payload Builder
// =============================================================================
// Construye el paquete N1 completo a partir de un GuidedTicketDraft:
//   - readiness score
//   - clasificación SAP
//   - ETA preliminar (heurística simple en pre-creación)
//   - playbook sugerido (matching por módulo)
//   - checklist N1
//   - respuesta inicial al cliente
//   - criterios de escalamiento N2
//
// Y construye el payload completo para escalar a N2 si N1 decide hacerlo.
// =============================================================================

import type {
  GuidedTicketDraft, N1Package, EscalationN2Payload,
  ChecklistN1Item, N1EscalationCriterion,
} from "@/types/guided-ticket-intake";
import { ESCALATION_CRITERION_LABELS } from "@/types/guided-ticket-intake";
import { calculateDraftReadiness } from "@/utils/ticket-readiness-engine";
import { generateN1Checklist, detectEscalationCriteria } from "./n1-checklist-generator";
import { getSapIntakeSpec } from "@/lib/sap-intake-fields";

// ============================================================
// Helpers
// ============================================================

/** ETA preliminar muy simple — el motor contextual real se ejecuta al crear el ticket. */
function estimatePreliminaryHours(draft: GuidedTicketDraft): { min: number; max: number; confidence: "LOW" | "MEDIUM" | "HIGH" } {
  const ctx = draft.context;
  const isPrd = ctx.environment === "PRD";
  const isCritical = ctx.priority === "Highest" || ctx.priority === "High";
  const moduleKey = (ctx.sapModule || "").toUpperCase();

  // Heurística por módulo + criticidad
  let base: [number, number] = [2, 6];
  if (moduleKey === "MM") base = [2, 8];
  else if (moduleKey === "SD") base = [3, 10];
  else if (moduleKey === "WM" || moduleKey === "EWM") base = [4, 12];
  else if (moduleKey === "PP") base = [4, 16];
  else if (moduleKey === "INTEGRACION") base = [6, 20];
  else base = [2, 8];

  // Ajustes
  if (isPrd && isCritical) base = [base[0], Math.round(base[1] * 0.7)]; // priorizable, target menor
  if (!isPrd) base = [base[0], Math.round(base[1] * 1.2)];

  // Confianza: si readiness >= 70 → MEDIUM, sino LOW
  const r = calculateDraftReadiness(draft).score;
  const confidence: "LOW" | "MEDIUM" | "HIGH" = r >= 85 ? "HIGH" : r >= 70 ? "MEDIUM" : "LOW";

  return { min: base[0], max: base[1], confidence };
}

/** Sugiere un título de playbook según módulo + proceso (sin acceder a backend). */
function suggestPlaybookForDraft(draft: GuidedTicketDraft): N1Package["suggestedPlaybook"] {
  const ctx = draft.context;
  const module = (ctx.sapModule || "").toUpperCase();
  const proc = ctx.process || "";

  if (!module || module === "NO_INFORMADO") return null;

  // Heurística: nombre canónico por módulo + proceso
  const titles: Record<string, string> = {
    "MM_goods_receipt":      "Playbook AMS · MM · Resolución de errores en recepción de mercancía (MIGO)",
    "MM_invoice_verification": "Playbook AMS · MM · Verificación de factura (MIRO)",
    "SD_sales_order":        "Playbook AMS · SD · Errores en pedido de venta (VA01/02)",
    "SD_delivery":           "Playbook AMS · SD · Resolución de entregas (VL01N)",
    "SD_billing":            "Playbook AMS · SD · Facturación (VF01)",
    "WM_outbound":           "Playbook AMS · WM · Salida de mercancía (LT03)",
    "EWM_outbound":          "Playbook AMS · EWM · Salida de mercancía",
    "PP_mrp":                "Playbook AMS · PP · Corrida MRP (MD01/MD02)",
    "PP_production_order":   "Playbook AMS · PP · Orden de fabricación (CO01/02)",
    "INTEGRACION_idoc":      "Playbook AMS · Integración · IDoc fallidos",
    "INTEGRACION_cpi_iflow": "Playbook AMS · Integración · CPI / iFlow",
  };
  const key = `${module}_${proc}`;
  const title = titles[key] || `Playbook AMS · ${module} · General`;
  return {
    title,
    reason: `Match por módulo ${module}${proc ? ` y proceso ${proc}` : ""}`,
  };
}

/**
 * Genera respuesta inicial al cliente (texto Markdown).
 * No usa el engine completo de Customer Response — sólo arma un acknowledgement
 * básico. El engine completo se ejecuta al crear el ticket (sobre el Ticket persistido).
 */
function buildInitialCustomerResponse(
  draft: GuidedTicketDraft,
  readinessScore: number,
  eta: { min: number; max: number; confidence: string },
): N1Package["initialCustomerResponse"] {
  const ctx = draft.context;
  const subject = `[AMS] Recibimos tu caso · ${ctx.sapModule || "SAP"}${ctx.transaction ? ` / ${ctx.transaction}` : ""}`;

  const lines: string[] = [];
  lines.push("Hola,");
  lines.push("");
  lines.push("Confirmamos que recibimos tu caso y ya lo asignamos al equipo de soporte AMS.");
  lines.push("");
  lines.push("**Información recibida:**");
  if (ctx.sapModule)   lines.push(`- Módulo SAP: **${ctx.sapModule}**`);
  if (ctx.process)     lines.push(`- Proceso: ${ctx.process}`);
  if (ctx.transaction) lines.push(`- Transacción: \`${ctx.transaction}\``);
  if (ctx.environment) lines.push(`- Ambiente: ${ctx.environment}`);
  if (ctx.priority)    lines.push(`- Prioridad inicial: ${ctx.priority}`);
  lines.push("");

  if (readinessScore >= 70) {
    lines.push(`**Próximos pasos:** estimamos atención preliminar en ${eta.min}–${eta.max} horas hábiles (sujeto a validación con N2 si corresponde).`);
  } else {
    lines.push("**Próximos pasos:** estamos revisando si necesitamos información adicional antes de empezar el diagnóstico.");
  }
  lines.push("");
  lines.push("Te mantendremos al tanto del avance. Si tenés información adicional (capturas, números de documento), respondé este caso.");
  lines.push("");
  lines.push("Saludos cordiales,");
  lines.push("Equipo AMS Supply Chain");

  return {
    subject,
    body: lines.join("\n"),
    canSend: readinessScore >= 40, // bloquea sólo si es realmente insuficiente
  };
}

/** Construye summary humano del paquete. */
function buildPackageSummary(
  draft: GuidedTicketDraft, score: number,
  checklist: ChecklistN1Item[], escalations: N1EscalationCriterion[],
): string {
  const ctx = draft.context;
  const n1Items = checklist.filter((c) => c.resolvableN1).length;
  const escItems = checklist.length - n1Items;

  const parts: string[] = [];
  parts.push(`Ticket ${ctx.sapModule || "SAP"}${ctx.transaction ? `/${ctx.transaction}` : ""} en ${ctx.environment || "ambiente sin definir"}`);
  parts.push(`Readiness ${score}/100`);
  parts.push(`Checklist N1: ${n1Items} pasos resolubles N1${escItems > 0 ? `, ${escItems} requieren N2` : ""}`);
  if (escalations.length > 0) {
    parts.push(`Criterios de escalamiento: ${escalations.map((e) => ESCALATION_CRITERION_LABELS[e]).join(" · ")}`);
  } else {
    parts.push("Sin criterios automáticos de escalamiento detectados");
  }
  return parts.join(" · ");
}

// ============================================================
// API principal
// ============================================================

/**
 * Construye el paquete N1 completo a partir de un draft.
 * Determinístico, sin LLM, sin llamadas backend.
 */
export function buildN1Package(draft: GuidedTicketDraft): N1Package {
  const readiness = calculateDraftReadiness(draft);
  const checklist = generateN1Checklist(draft);
  const escalations = detectEscalationCriteria(draft);
  const eta = estimatePreliminaryHours(draft);
  const playbook = suggestPlaybookForDraft(draft);
  const response = buildInitialCustomerResponse(draft, readiness.score, eta);
  const summary = buildPackageSummary(draft, readiness.score, checklist, escalations);

  return {
    readinessScore: readiness.score,
    readinessStatus: readiness.status,
    completedInfo: readiness.completedItems,
    missingInfo: readiness.missingItems,
    sapClassification: {
      module: draft.context.sapModule || "NO_INFORMADO",
      process: draft.context.process,
      transaction: draft.context.transaction,
    },
    estimatedHours: eta,
    suggestedPlaybook: playbook,
    n1Checklist: checklist,
    missingData: readiness.recommendations,
    initialCustomerResponse: response,
    escalationCriteria: escalations,
    summary,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================
// Escalation payload builder
// ============================================================

export interface BuildEscalationInput {
  ticketKey: string;
  draft: GuidedTicketDraft;
  n1Package: N1Package;
  /** Acciones que N1 ya realizó (texto libre o IDs de items del checklist). */
  n1ActionsTaken: string[];
  /** Hipótesis descartadas con su razón. */
  hypothesesRuledOut: Array<{ hypothesis: string; reason: string }>;
  /** Por qué escala (texto libre del N1 que escala). */
  escalationReason: string;
  /** Criterio principal del catálogo. */
  primaryCriterion: N1EscalationCriterion;
  escalatedBy: string;
}

/**
 * Construye payload completo para enviar a N2.
 * Garantiza que el especialista N2 reciba contexto rico, no un ticket pobre.
 */
export function buildEscalationPayload(input: BuildEscalationInput): EscalationN2Payload {
  const { draft, n1Package } = input;
  const ctx = draft.context;
  const spec = getSapIntakeSpec(ctx.sapModule);

  // Mapear sapData a etiquetas humanas
  const sapFields: Record<string, string> = {};
  for (const f of spec.fields) {
    const v = draft.sapData[f.id];
    if (v && v.trim()) sapFields[f.label] = v;
  }

  // Evidence summary: solo descripciones de items, sin archivos
  const evidenceSummary = draft.evidence.items
    .map((e) => `${e.fileName} (${e.fileType})${e.userComment ? ` — ${e.userComment}` : ""}`)
    .concat(draft.evidence.textualLog ? [`Log pegado: ${draft.evidence.textualLog.slice(0, 200)}${draft.evidence.textualLog.length > 200 ? "…" : ""}`] : []);

  // Problem summary humano
  const problemParts: string[] = [];
  if (draft.problem.whatIntended) problemParts.push(`Intentaba: ${draft.problem.whatIntended}`);
  if (draft.problem.whereFails) problemParts.push(`Falla en: ${draft.problem.whereFails}`);
  if (draft.problem.errorMessageExact) problemParts.push(`Mensaje: ${draft.problem.errorMessageExact}`);
  if (draft.problem.sinceWhen) problemParts.push(`Desde: ${draft.problem.sinceWhen}`);
  if (draft.problem.workedBefore) problemParts.push(`Antes funcionaba: ${draft.problem.workedBefore}`);
  if (draft.problem.frequency) problemParts.push(`Frecuencia: ${draft.problem.frequency}`);
  const problemSummary = problemParts.join(" · ") || "Sin descripción detallada";

  return {
    ticketKey: input.ticketKey,
    problemSummary,
    sapData: {
      module: ctx.sapModule || "NO_INFORMADO",
      process: ctx.process,
      transaction: ctx.transaction,
      environment: ctx.environment,
      fields: sapFields,
    },
    evidenceSummary,
    n1ActionsTaken: input.n1ActionsTaken,
    n1ChecklistStatus: n1Package.n1Checklist,
    hypothesesRuledOut: input.hypothesesRuledOut,
    escalationReason: input.escalationReason,
    primaryEscalationCriterion: input.primaryCriterion,
    suggestedEta: {
      min: n1Package.estimatedHours.min,
      max: n1Package.estimatedHours.max,
      confidence: n1Package.estimatedHours.confidence,
    },
    priority: ctx.priority,
    businessImpact: {
      level: ctx.businessImpact || "blocks_user_work",
      detail: ctx.businessImpactDetail || "Sin detalle",
    },
    createdAt: new Date().toISOString(),
    escalatedBy: input.escalatedBy,
  };
}

/**
 * Construye la `description` Markdown estructurada para el CreateTicketInput.
 * Embebe los datos SAP estructurados + contexto + problema en formato legible.
 */
export function buildStructuredDescription(draft: GuidedTicketDraft): string {
  const ctx = draft.context;
  const prob = draft.problem;
  const spec = getSapIntakeSpec(ctx.sapModule);

  const lines: string[] = [];

  // Resumen
  if (prob.whatIntended) {
    lines.push("## Resumen");
    lines.push(prob.whatIntended);
    lines.push("");
  }

  // Detalle del problema
  if (prob.whereFails || prob.errorMessageExact) {
    lines.push("## Detalle del problema");
    if (prob.whereFails)         lines.push(`- **Dónde falla:** ${prob.whereFails}`);
    if (prob.errorMessageExact)  lines.push(`- **Mensaje exacto:** \`${prob.errorMessageExact}\``);
    if (prob.sinceWhen)          lines.push(`- **Desde cuándo:** ${prob.sinceWhen}`);
    if (prob.workedBefore)       lines.push(`- **Antes funcionaba:** ${prob.workedBefore}`);
    if (prob.affectedUsers)      lines.push(`- **Usuarios afectados:** ${prob.affectedUsers}`);
    if (prob.affectedDocs)       lines.push(`- **Documentos afectados:** ${prob.affectedDocs}`);
    if (prob.frequency)          lines.push(`- **Frecuencia:** ${prob.frequency}`);
    lines.push("");
  }

  // Datos SAP estructurados
  const sapFields = spec.fields.filter((f) => (draft.sapData[f.id] ?? "").trim().length > 0);
  if (sapFields.length > 0) {
    lines.push("## Datos SAP");
    for (const f of sapFields) {
      const v = draft.sapData[f.id];
      lines.push(`- **${f.label}:** ${v}`);
    }
    lines.push("");
  }

  // Impacto al negocio
  if (ctx.businessImpact || ctx.businessImpactDetail) {
    lines.push("## Impacto al negocio");
    if (ctx.businessImpact)        lines.push(`- **Nivel:** ${ctx.businessImpact}`);
    if (ctx.businessImpactDetail)  lines.push(`- **Detalle:** ${ctx.businessImpactDetail}`);
    lines.push("");
  }

  // Cliente / ambiente
  if (ctx.client) {
    lines.push("## Contexto");
    lines.push(`- **Cliente:** ${ctx.client}`);
    if (ctx.environment) lines.push(`- **Ambiente:** ${ctx.environment}`);
    lines.push("");
  }

  // Evidencia textual
  if (draft.evidence.textualLog && draft.evidence.textualLog.trim()) {
    lines.push("## Log pegado");
    lines.push("```");
    lines.push(draft.evidence.textualLog.trim());
    lines.push("```");
    lines.push("");
  }

  // Notas evidencia visual (sin archivos)
  if (draft.evidence.items.length > 0) {
    lines.push("## Evidencia visual adjuntada");
    for (const e of draft.evidence.items) {
      lines.push(`- ${e.fileName} (${e.fileType})${e.userComment ? ` — ${e.userComment}` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
