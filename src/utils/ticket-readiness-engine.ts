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
