// =============================================================================
// Customer Response · Templates por responseType
// =============================================================================
// Cada template indica QUÉ bloques componen cada tipo de respuesta. El engine
// itera los blockSpecs en orden y arma el body. No incluye textos — los textos
// vienen de los block builders.
// =============================================================================

import type { CustomerResponseType } from "@/types/customer-response";

export type BlockSpec =
  | "greeting"
  | "acknowledgement"
  | "analysis"
  | "missing_data"
  | "eta"
  | "next_steps"
  | "workaround"
  | "escalation"
  | "rca_preliminary"
  | "rca_final"
  | "resolution_summary"
  | "validation"
  | "prevention"
  | "closing";

/**
 * Estructura de cada responseType — lista ordenada de bloques candidatos.
 * Los block builders devuelven null si el bloque no aplica al contexto,
 * así que cada respuesta es dinámica aunque parta de un template fijo.
 */
export const RESPONSE_TEMPLATES: Record<CustomerResponseType, BlockSpec[]> = {
  ACKNOWLEDGEMENT: [
    "greeting",
    "acknowledgement",
    "next_steps",
    "closing",
  ],

  REQUEST_MORE_INFO: [
    "greeting",
    "acknowledgement",
    "missing_data",
    "next_steps",
    "closing",
  ],

  PRELIMINARY_DIAGNOSIS: [
    "greeting",
    "acknowledgement",
    "analysis",
    "missing_data",
    "next_steps",
    "eta",
    "closing",
  ],

  STATUS_UPDATE: [
    "greeting",
    "acknowledgement",
    "analysis",
    "next_steps",
    "eta",
    "closing",
  ],

  WORKAROUND: [
    "greeting",
    "acknowledgement",
    "workaround",
    "next_steps",
    "eta",
    "closing",
  ],

  ESCALATION_NOTICE: [
    "greeting",
    "acknowledgement",
    "escalation",
    "next_steps",
    "eta",
    "closing",
  ],

  RESOLUTION_PROPOSAL: [
    "greeting",
    "acknowledgement",
    "analysis",
    "resolution_summary",
    "next_steps",
    "eta",
    "closing",
  ],

  RCA_PRELIMINARY: [
    "greeting",
    "acknowledgement",
    "rca_preliminary",
    "next_steps",
    "eta",
    "closing",
  ],

  RCA_FINAL: [
    "greeting",
    "acknowledgement",
    "rca_final",
    "resolution_summary",
    "validation",
    "prevention",
    "closing",
  ],

  CLOSURE: [
    "greeting",
    "acknowledgement",
    "rca_final",
    "resolution_summary",
    "validation",
    "prevention",
    "closing",
  ],

  DELAY_NOTICE: [
    "greeting",
    "acknowledgement",
    "next_steps",
    "eta",
    "closing",
  ],

  DUPLICATE_CASE: [
    "greeting",
    "acknowledgement",
    "next_steps",
    "closing",
  ],

  OUT_OF_SCOPE: [
    "greeting",
    "acknowledgement",
    "next_steps",
    "closing",
  ],
};

/**
 * Subject según responseType + ticketKey + ticketTitle.
 * Devuelve un subject claro, no genérico.
 */
export function buildSubject(
  type: CustomerResponseType,
  ticketKey: string,
  ticketTitle: string,
): string {
  const shortTitle = ticketTitle.length > 60 ? ticketTitle.slice(0, 60) + "…" : ticketTitle;
  switch (type) {
    case "ACKNOWLEDGEMENT":
      return `[${ticketKey}] Caso recibido: ${shortTitle}`;
    case "REQUEST_MORE_INFO":
      return `[${ticketKey}] Información requerida para avanzar`;
    case "PRELIMINARY_DIAGNOSIS":
      return `[${ticketKey}] Análisis preliminar: ${shortTitle}`;
    case "STATUS_UPDATE":
      return `[${ticketKey}] Actualización de avance`;
    case "WORKAROUND":
      return `[${ticketKey}] Solución temporal disponible`;
    case "ESCALATION_NOTICE":
      return `[${ticketKey}] Caso derivado a especialista N2`;
    case "RESOLUTION_PROPOSAL":
      return `[${ticketKey}] Propuesta de solución para aprobación`;
    case "RCA_PRELIMINARY":
      return `[${ticketKey}] Causa raíz preliminar identificada`;
    case "RCA_FINAL":
      return `[${ticketKey}] Causa raíz validada`;
    case "CLOSURE":
      return `[${ticketKey}] Cierre del caso: ${shortTitle}`;
    case "DELAY_NOTICE":
      return `[${ticketKey}] Aviso de demora en la atención`;
    case "DUPLICATE_CASE":
      return `[${ticketKey}] Caso duplicado — referencia a ticket existente`;
    case "OUT_OF_SCOPE":
      return `[${ticketKey}] Caso fuera del alcance contractual`;
    default:
      return `[${ticketKey}] ${shortTitle}`;
  }
}
