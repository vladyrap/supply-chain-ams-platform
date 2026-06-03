// Ticket Readiness Engine.
// Calcula qué tan completo está un ticket para que AMS pueda resolverlo.
// Score 0-100 distribuido en 10 criterios.
//
// Este score es señal para el Decision Engine: si es bajo y prioridad no
// es crítica, NBA recomienda mejorar info antes de escalar.

import type { Ticket } from "@/services/tickets.api";

export type ReadinessStatus = "LOW" | "MEDIUM" | "HIGH" | "READY";

export interface ReadinessCriterion {
  id: string;
  label: string;
  points: number;
  satisfied: boolean;
  /** Qué hacer para satisfacerlo (recomendación accionable) */
  fixHint?: string;
  /** ID de sección del Command Center al que scrollear */
  scrollTargetId?: string;
}

export interface TicketReadinessResult {
  score: number;
  status: ReadinessStatus;
  completedItems: string[];
  missingItems: string[];
  recommendations: string[];
  criteria: ReadinessCriterion[];
}

const SAP_TRANSACTION_RX = /\b(MIGO|ME2[123]N?|MIRO|VA0[123]|VL0[123]N?|VF0[1234]|MD0[1234]|CO0[123]|QA0[123]|QA32|WE[02]2|BD87|BD10|LT0[13]|LM01|MM0[123]|MMBE|MB5B|ML81N)\b/i;
const SAP_DOC_RX = /\b(45\d{8}|\d{10})\b|orden de compra|sales order|entrega \d{6,}|delivery \d{6,}|idoc \d{6,}/i;
const ERROR_RX = /\b[a-z]{1,3}\s*\d{2,3}\b|error|fail|abort|dump|cancelad/i;

export function calculateTicketReadiness(ticket: Ticket): TicketReadinessResult {
  const title = (ticket.title || "").trim();
  const description = (ticket.description || "").trim();
  const haystack = `${title} ${description}`;
  const hasVisualEvidence = !!(ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0);
  const hasTransaction = SAP_TRANSACTION_RX.test(haystack)
    || !!(ticket.visualEvidenceNotes?.some((n) => n.detectedTransaction));
  const hasError = ERROR_RX.test(haystack)
    || !!(ticket.visualEvidenceNotes?.some((n) => n.detectedErrorCode));
  const hasDocument = SAP_DOC_RX.test(haystack)
    || !!(ticket.visualEvidenceNotes?.some((n) => n.detectedObjects?.purchaseOrder
                                                || n.detectedObjects?.salesOrder
                                                || n.detectedObjects?.delivery));

  // Sub-proceso lo derivamos de la estimación si el ticket no lo tiene como campo dedicado
  const hasProcess = !!(ticket.estimatedResolution?.phaseBreakdown?.length);

  const criteria: ReadinessCriterion[] = [
    {
      id: "title", label: "Título claro", points: 10,
      satisfied: title.length >= 10,
      fixHint: "Ampliá el título a al menos 10 caracteres descriptivos.",
      scrollTargetId: "section-summary",
    },
    {
      id: "description", label: "Descripción completa", points: 15,
      satisfied: description.length >= 80,
      fixHint: "Sumá pasos para reproducir, transacciones y contexto del usuario.",
      scrollTargetId: "section-summary",
    },
    {
      id: "priority", label: "Prioridad definida", points: 5,
      satisfied: !!ticket.priority && ticket.priority !== "Medium",
      fixHint: "Confirmá la prioridad real con el usuario afectado.",
      scrollTargetId: "section-header",
    },
    {
      id: "environment", label: "Ambiente definido", points: 10,
      satisfied: !!ticket.environment && ticket.environment !== "NO_INFORMADO",
      fixHint: "Indicá el ambiente afectado (DEV / QA / UAT / PRD).",
      scrollTargetId: "section-header",
    },
    {
      id: "sapModule", label: "Módulo SAP definido", points: 10,
      satisfied: !!ticket.sapModule && ticket.sapModule !== "NO_INFORMADO",
      fixHint: "Asigná el módulo SAP afectado (MM, SD, PP, EWM, etc.).",
      scrollTargetId: "section-header",
    },
    {
      id: "process", label: "Proceso / subproceso identificado", points: 10,
      satisfied: hasProcess,
      fixHint: "Clasificá con el Agente AMS para detectar proceso y subproceso.",
      scrollTargetId: "section-classification",
    },
    {
      id: "transaction", label: "Transacción detectada", points: 10,
      satisfied: hasTransaction,
      fixHint: "Mencioná la transacción SAP en la descripción (MIGO, VA01, etc.) o adjuntá captura.",
      scrollTargetId: "section-summary",
    },
    {
      id: "errorMessage", label: "Mensaje de error informado", points: 10,
      satisfied: hasError,
      fixHint: "Copiá el mensaje de error literal o adjuntá captura.",
      scrollTargetId: "section-summary",
    },
    {
      id: "sapDocument", label: "Documento SAP informado", points: 10,
      satisfied: hasDocument,
      fixHint: "Incluí el número del documento SAP (OC, pedido, entrega, IDoc).",
      scrollTargetId: "section-summary",
    },
    {
      id: "visualEvidence", label: "Evidencia visual o comentario", points: 10,
      satisfied: hasVisualEvidence,
      fixHint: "Adjuntá una captura del error con el botón ＋ Crear ticket (o re-crealo si ya existe).",
      scrollTargetId: "section-visual",
    },
  ];

  const completedItems: string[] = [];
  const missingItems: string[] = [];
  let score = 0;
  for (const c of criteria) {
    if (c.satisfied) {
      score += c.points;
      completedItems.push(c.label);
    } else {
      missingItems.push(c.label);
    }
  }

  let status: ReadinessStatus = "LOW";
  if (score >= 90) status = "READY";
  else if (score >= 70) status = "HIGH";
  else if (score >= 40) status = "MEDIUM";

  // Recomendaciones = fixHints de los criterios faltantes ordenados por puntos desc
  const recommendations = criteria
    .filter((c) => !c.satisfied && c.fixHint)
    .sort((a, b) => b.points - a.points)
    .map((c) => c.fixHint!)
    .slice(0, 4);

  return { score, status, completedItems, missingItems, recommendations, criteria };
}

export const READINESS_COLORS: Record<ReadinessStatus, string> = {
  LOW: "#ef4444",
  MEDIUM: "#fbbf24",
  HIGH: "#22d3ee",
  READY: "#10b981",
};

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  READY: "Listo",
};

// =============================================================================
// DH v0.9.1 — Guided Ticket Intake: readiness sobre un draft pre-creación
// =============================================================================
// El wizard necesita calcular el score ANTES de POST al backend. Trabajamos
// sobre un GuidedTicketDraft (estructurado) en vez de un Ticket persistido.
// =============================================================================

import type { GuidedTicketDraft } from "@/types/guided-ticket-intake";
import { getSapIntakeSpec } from "@/lib/sap-intake-fields";

/**
 * Calcula readiness para un draft del wizard (pre-creación).
 * 10 criterios, score 0-100. Mismo status que un Ticket existente.
 */
export function calculateDraftReadiness(draft: GuidedTicketDraft): TicketReadinessResult {
  const ctx = draft.context;
  const prob = draft.problem;
  const sapData = draft.sapData;
  const ev = draft.evidence;
  const title = (draft.title || "").trim();

  // Combinar texto para regex
  const haystack = [
    title,
    prob.whatIntended ?? "",
    prob.whereFails ?? "",
    prob.errorMessageExact ?? "",
    ctx.businessImpactDetail ?? "",
    Object.values(sapData).join(" "),
  ].join(" ");

  const hasTransaction = !!ctx.transaction || SAP_TRANSACTION_RX.test(haystack);
  const hasError = !!prob.errorMessageExact || ERROR_RX.test(haystack);
  const hasDocument = SAP_DOC_RX.test(haystack);
  // Datos SAP estructurados → cuento como "documento informado" si llenó al menos 1
  // campo required del spec
  const spec = getSapIntakeSpec(ctx.sapModule);
  const filledRequired = spec.fields.filter((f) => f.required && (sapData[f.id] ?? "").trim().length > 0).length;
  const totalRequired = spec.fields.filter((f) => f.required).length;
  const hasStructuredData = totalRequired > 0 ? filledRequired >= Math.ceil(totalRequired / 2) : false;
  const hasVisualEvidence = (ev.items?.length ?? 0) > 0 || !!ev.textualLog;
  const hasImpact = !!ctx.businessImpact && !!ctx.businessImpactDetail;
  const hasFrequency = !!prob.frequency;

  const criteria: ReadinessCriterion[] = [
    { id: "title",        label: "Título claro",                   points: 10,
      satisfied: title.length >= 10,
      fixHint: "Generar título descriptivo (paso Revisión final)." },
    { id: "description",  label: "Descripción / problema completo", points: 10,
      satisfied: (prob.whatIntended ?? "").length + (prob.whereFails ?? "").length >= 60,
      fixHint: "Completar 'qué intentabas' + 'dónde falla' en el paso Problema." },
    { id: "priority",     label: "Prioridad definida",             points: 5,
      satisfied: !!ctx.priority && ctx.priority !== "Medium",
      fixHint: "Confirmar prioridad real en paso Contexto." },
    { id: "environment",  label: "Ambiente definido",              points: 10,
      satisfied: !!ctx.environment,
      fixHint: "Indicar DEV / QA / UAT / PRD en paso Contexto." },
    { id: "sapModule",    label: "Módulo SAP definido",            points: 10,
      satisfied: !!ctx.sapModule,
      fixHint: "Seleccionar módulo SAP en paso Contexto." },
    { id: "process",      label: "Proceso identificado",           points: 5,
      satisfied: !!ctx.process,
      fixHint: "Elegir proceso afectado en paso Contexto." },
    { id: "transaction",  label: "Transacción / Fiori informada",  points: 10,
      satisfied: hasTransaction,
      fixHint: "Indicar transacción SAP o app Fiori afectada." },
    { id: "errorMessage", label: "Mensaje de error literal",       points: 10,
      satisfied: hasError,
      fixHint: "Copiar mensaje de error EXACTO en paso Problema o en datos SAP." },
    { id: "sapData",      label: "Datos SAP estructurados",        points: 15,
      satisfied: hasStructuredData || hasDocument,
      fixHint: `Completar al menos ${Math.ceil(totalRequired / 2)} de ${totalRequired} campos requeridos del módulo en paso Datos SAP.` },
    { id: "impact",       label: "Impacto al negocio descrito",    points: 5,
      satisfied: hasImpact,
      fixHint: "Indicar nivel de impacto + detalle en paso Contexto." },
    { id: "frequency",    label: "Frecuencia del problema",        points: 5,
      satisfied: hasFrequency,
      fixHint: "Indicar si es siempre / intermitente / con datos específicos / única vez." },
    { id: "evidence",     label: "Evidencia visual o log",         points: 5,
      satisfied: hasVisualEvidence,
      fixHint: "Adjuntar captura del error o pegar log corto en paso Evidencia." },
  ];

  const completedItems: string[] = [];
  const missingItems: string[] = [];
  let score = 0;
  for (const c of criteria) {
    if (c.satisfied) {
      score += c.points;
      completedItems.push(c.label);
    } else {
      missingItems.push(c.label);
    }
  }
  // Cap a 100 (los criterios suman 100 exactos: 10+10+5+10+10+5+10+10+15+5+5+5 = 100)

  let status: ReadinessStatus = "LOW";
  if (score >= 85) status = "READY";
  else if (score >= 70) status = "HIGH";
  else if (score >= 40) status = "MEDIUM";

  const recommendations = criteria
    .filter((c) => !c.satisfied && c.fixHint)
    .sort((a, b) => b.points - a.points)
    .map((c) => c.fixHint!)
    .slice(0, 5);

  return { score, status, completedItems, missingItems, recommendations, criteria };
}
