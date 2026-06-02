// =============================================================================
// Customer Response Intelligence — types
// =============================================================================
// Tipos para la capa de generación de respuestas al cliente AMS.
// Determinístico, sin LLM. Reglas duras de seguridad y composición por bloques.
// =============================================================================

import type { TicketEstimatedResolution } from "./estimation";

// ============================================================
// Enums
// ============================================================

/** 13 tipos de respuesta soportados — cada uno tiene una estructura distinta. */
export type CustomerResponseType =
  | "ACKNOWLEDGEMENT"          // Confirmamos recepción del caso
  | "REQUEST_MORE_INFO"        // Pedimos datos faltantes
  | "PRELIMINARY_DIAGNOSIS"    // Análisis preliminar con hipótesis
  | "STATUS_UPDATE"            // Actualización de avance
  | "WORKAROUND"               // Solución temporal
  | "ESCALATION_NOTICE"        // Aviso de escalación a N2/N3
  | "RESOLUTION_PROPOSAL"      // Propuesta de solución para aprobar
  | "RCA_PRELIMINARY"          // Causa raíz preliminar
  | "RCA_FINAL"                // Causa raíz definitiva
  | "CLOSURE"                  // Cierre del caso
  | "DELAY_NOTICE"             // Aviso de demora
  | "DUPLICATE_CASE"           // Caso duplicado
  | "OUT_OF_SCOPE";            // Fuera del alcance del contrato

export type CustomerResponseAudience =
  | "FUNCTIONAL_USER"          // Key user, business user
  | "TECHNICAL_USER"           // Consultor del lado del cliente
  | "MANAGER"                  // Sponsor, dueño del proceso
  | "INTERNAL_AMS"             // Equipo AMS interno (nota interna)
  | "N2_CONSULTANT";           // Especialista N2 al que se deriva

export type CustomerResponseTone =
  | "FORMAL"
  | "EXECUTIVE"
  | "TECHNICAL"
  | "SIMPLE"
  | "URGENT"
  | "NEUTRAL";

export type CustomerResponseConfidence = "LOW" | "MEDIUM" | "HIGH";

export type CustomerResponseStatus =
  | "DRAFT"                    // Recién generada, no revisada
  | "REVIEWED"                 // Revisada por humano
  | "APPROVED"                 // Aprobada para enviar
  | "BLOCKED"                  // Bloqueada por quality gate
  | "SENT_MANUAL"              // Marcada como enviada manualmente
  | "ARCHIVED";

// ============================================================
// Quality Gate
// ============================================================

export type QualityIssueSeverity = "block" | "warn" | "info";

/** Una observación del quality gate sobre la respuesta. */
export interface QualityIssue {
  /** ID estable de la regla — útil para ignorar warnings específicos. */
  ruleId:
    | "claim_root_cause_low_confidence"
    | "claim_resolved_without_evidence"
    | "promise_exact_eta_no_baseline"
    | "blame_user"
    | "absolute_language"
    | "critical_prd_no_human_review"
    | "missing_subject"
    | "body_too_short"
    | "missing_next_steps"
    | "no_eta_when_promised"
    | "tone_mismatch"
    | string;
  severity: QualityIssueSeverity;
  message: string;
  /** Sugerencia textual de cómo mejorar. */
  suggestedFix?: string;
  /** Snippet del cuerpo donde se detectó el problema (para resaltar en UI). */
  matchedText?: string;
}

/** Reporte completo del quality gate. */
export interface QualityGateReport {
  /** Score 0..100. 80+ = OK, 60-79 = warning, <60 = bloqueo. */
  score: number;
  level: "good" | "acceptable" | "needs_review" | "blocked";
  /** Permite enviar al cliente. False si hay algún issue con severity=block. */
  canSend: boolean;
  /** True si el caso es crítico PRD sin revisión humana — UI debe mostrar warning. */
  requiresHumanReview: boolean;
  issues: QualityIssue[];
  suggestions: string[];
  /**
   * Versión "safe" reescrita automáticamente con lenguaje condicional cuando
   * la respuesta original tiene issues bloqueantes. null si no hubo bloqueo.
   */
  safeVersion: string | null;
  evaluatedAt: string;
}

// ============================================================
// Bloques composables de la respuesta
// ============================================================

/**
 * Una respuesta está compuesta por bloques. El engine selecciona qué bloques
 * incluir según responseType + audience + tone + contexto. Cada bloque es
 * autónomo y serializable.
 */
export interface ResponseBlock {
  id: string;
  kind:
    | "greeting"               // "Hola,"
    | "acknowledgement"        // "hemos recibido el caso..."
    | "analysis"               // "El análisis preliminar apunta a..."
    | "missing_data"           // "Para avanzar necesitamos..."
    | "next_steps"             // "Próximos pasos:"
    | "eta"                    // "Tiempo estimado preliminar:"
    | "workaround"             // "Mientras tanto:"
    | "rca"                    // "Causa raíz identificada:"
    | "resolution_summary"     // "Acción realizada:"
    | "validation"             // "Validación:"
    | "prevention"             // "Recomendación preventiva:"
    | "escalation"             // "Derivado a especialista N2:"
    | "closing"                // "Saludos."
    | "internal_note";         // Solo visible en INTERNAL_AMS

  /** Contenido renderizado del bloque (markdown plano). */
  content: string;
  /**
   * Si el bloque usa lenguaje condicional (sujeto a validación, posible, etc.)
   * por confidence bajo. Útil para el quality gate.
   */
  conditional?: boolean;
}

// ============================================================
// Contexto de entrada al engine (lo que el engine necesita)
// ============================================================

/**
 * Bundle de inteligencia disponible sobre el ticket — lo que el TCC ya tiene
 * a mano. Todos los campos son opcionales; el engine se adapta.
 */
export interface CustomerResponseContext {
  // Identificación
  ticketKey: string;
  ticketTitle: string;
  ticketDescription?: string;
  ticketStatus?: string;
  ticketPriority?: string;

  // Datos SAP
  sapModule?: string | null;
  sapTransaction?: string;
  sapProcess?: string;
  environment?: string | null;
  isProductive?: boolean;

  // Estimación (del motor clásico o contextual)
  estimation?: TicketEstimatedResolution | null;
  hasEta?: boolean;

  // Confianza global del análisis
  confidence?: CustomerResponseConfidence;

  // Señales de inteligencia
  hasKnowledgeMatch?: boolean;
  hasPlaybook?: boolean;
  playbookTitle?: string;
  hasScopeItem?: boolean;
  hasErrorEvidence?: boolean;
  hasReproduction?: boolean;
  hasVisualEvidence?: boolean;
  hasEscalationN2?: boolean;
  escalationKey?: string;

  // Datos faltantes (del motor contextual o detectados manualmente)
  missingData?: string[];

  // Para CLOSURE / RCA
  rootCauseValidated?: boolean;
  rootCauseSummary?: string;
  resolutionSummary?: string;
  validationSummary?: string;
  preventionRecommendation?: string;

  // Para DELAY_NOTICE
  delayReason?: string;
  newEstimatedDate?: string;

  // Para DUPLICATE_CASE
  duplicateOfTicketKey?: string;

  // Para OUT_OF_SCOPE
  scopeRationale?: string;

  // Humano que revisó (si aplica)
  humanReviewedBy?: string;
}

/**
 * Opciones del que llama al engine — qué tipo/audiencia/tono quiere + qué
 * incluir o no.
 */
export interface CustomerResponseOptions {
  responseType?: CustomerResponseType;
  audience?: CustomerResponseAudience;
  tone?: CustomerResponseTone;
  includeEta?: boolean;
  includeMissingData?: boolean;
  includeNextSteps?: boolean;
  includeWorkaround?: boolean;
  /** Si true, pasa por quality gate y bloquea si no pasa. Default true. */
  enforceQualityGate?: boolean;
  /** Si true, fuerza tono URGENT para PRD crítico. Default true. */
  autoUrgentForCriticalPrd?: boolean;
  /** Generador (consultor que armó la respuesta) — para audit trail. */
  generatedBy?: string;
  /** Firma del tenant (configurable en /settings). */
  signature?: string;
  /** Si ya fue revisada por humano (afecta crítico PRD rule). */
  humanReviewed?: boolean;
}

// ============================================================
// Respuesta generada
// ============================================================

export interface CustomerResponse {
  responseId: string;
  ticketKey: string;
  createdAt: string;

  responseType: CustomerResponseType;
  audience: CustomerResponseAudience;
  tone: CustomerResponseTone;
  confidence: CustomerResponseConfidence;

  /** Asunto del mensaje (para email/jira comment). */
  subject: string;
  /** Cuerpo final completo (markdown plano listo para copiar). */
  body: string;
  /** Resumen 1-2 frases — útil para audit + previews. */
  summary: string;

  /** Bloques que compusieron el body — para debug + re-edit. */
  blocks: ResponseBlock[];

  // Datos extraídos / decisiones del engine
  nextSteps: string[];
  missingDataRequests: string[];
  etaStatement: string | null;
  riskWarnings: string[];

  /** Notas internas (no aparecen en el body al cliente). */
  internalNotes: string;

  /** Reporte del quality gate. */
  qualityGate: QualityGateReport;

  /** Shortcut: qualityGate.canSend. */
  canSendToClient: boolean;

  // Workflow
  status: CustomerResponseStatus;
  generatedBy: string;
  /** Versión del engine — útil para distinguir entre upgrades del motor. */
  engineVersion: string;
}

// ============================================================
// Storage
// ============================================================

export const CUSTOMER_RESPONSE_STORAGE = {
  responses: "supply-chain-ams-customer-responses",
} as const;

// ============================================================
// Labels para UI
// ============================================================

export const RESPONSE_TYPE_LABELS: Record<CustomerResponseType, string> = {
  ACKNOWLEDGEMENT: "Confirmación de recepción",
  REQUEST_MORE_INFO: "Solicitud de información",
  PRELIMINARY_DIAGNOSIS: "Diagnóstico preliminar",
  STATUS_UPDATE: "Actualización de avance",
  WORKAROUND: "Workaround temporal",
  ESCALATION_NOTICE: "Aviso de escalación N2",
  RESOLUTION_PROPOSAL: "Propuesta de solución",
  RCA_PRELIMINARY: "RCA preliminar",
  RCA_FINAL: "RCA definitivo",
  CLOSURE: "Cierre del caso",
  DELAY_NOTICE: "Aviso de demora",
  DUPLICATE_CASE: "Caso duplicado",
  OUT_OF_SCOPE: "Fuera del alcance",
};

export const RESPONSE_TYPE_ICONS: Record<CustomerResponseType, string> = {
  ACKNOWLEDGEMENT: "👋",
  REQUEST_MORE_INFO: "❓",
  PRELIMINARY_DIAGNOSIS: "🔬",
  STATUS_UPDATE: "📊",
  WORKAROUND: "🩹",
  ESCALATION_NOTICE: "🚨",
  RESOLUTION_PROPOSAL: "💡",
  RCA_PRELIMINARY: "🔎",
  RCA_FINAL: "✅",
  CLOSURE: "🎯",
  DELAY_NOTICE: "⏰",
  DUPLICATE_CASE: "🔁",
  OUT_OF_SCOPE: "🚫",
};

export const AUDIENCE_LABELS: Record<CustomerResponseAudience, string> = {
  FUNCTIONAL_USER: "Usuario funcional",
  TECHNICAL_USER: "Usuario técnico",
  MANAGER: "Gerencia / sponsor",
  INTERNAL_AMS: "Equipo AMS interno",
  N2_CONSULTANT: "Consultor N2",
};

export const TONE_LABELS: Record<CustomerResponseTone, string> = {
  FORMAL: "Formal",
  EXECUTIVE: "Ejecutivo",
  TECHNICAL: "Técnico",
  SIMPLE: "Simple",
  URGENT: "Urgente",
  NEUTRAL: "Neutro",
};

export const STATUS_LABELS: Record<CustomerResponseStatus, string> = {
  DRAFT: "Borrador",
  REVIEWED: "Revisada",
  APPROVED: "Aprobada",
  BLOCKED: "Bloqueada por quality gate",
  SENT_MANUAL: "Enviada manualmente",
  ARCHIVED: "Archivada",
};

export const ALL_RESPONSE_TYPES: CustomerResponseType[] = [
  "ACKNOWLEDGEMENT", "REQUEST_MORE_INFO", "PRELIMINARY_DIAGNOSIS",
  "STATUS_UPDATE", "WORKAROUND", "ESCALATION_NOTICE",
  "RESOLUTION_PROPOSAL", "RCA_PRELIMINARY", "RCA_FINAL",
  "CLOSURE", "DELAY_NOTICE", "DUPLICATE_CASE", "OUT_OF_SCOPE",
];

export const ALL_AUDIENCES: CustomerResponseAudience[] = [
  "FUNCTIONAL_USER", "TECHNICAL_USER", "MANAGER", "INTERNAL_AMS", "N2_CONSULTANT",
];

export const ALL_TONES: CustomerResponseTone[] = [
  "FORMAL", "EXECUTIVE", "TECHNICAL", "SIMPLE", "URGENT", "NEUTRAL",
];
