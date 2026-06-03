// =============================================================================
// AMS Specialist Agents — Tipos base (v0.11)
// =============================================================================
// Capa interna de "agentes especialistas" que el AMS Orchestrator consulta
// para enriquecer un ticket. El usuario sigue viendo un solo Agente AMS;
// los especialistas son razonamiento interno auditable.
//
// IMPORTANTE: en esta versión todos los especialistas son DETERMINÍSTICOS
// (reglas + diccionarios locales). No se llama a Claude/OpenAI todavía.
// Gemini sigue siendo el provider real, vía el pipeline AIE existente.
// =============================================================================

/** Módulos SAP cubiertos por la primera ola de especialistas. */
export type SAPModuleSpecialist =
  | "MM"
  | "SD"
  | "WM"
  | "EWM"
  | "PP_MRP"
  | "INTEGRATIONS"
  | "BASIS_AUTH"
  | "ABAP_TECHNICAL"
  | "FI_CROSS"
  | "UNKNOWN";

/** Decisión del Specialist Router para un input dado. */
export interface SpecialistRoutingDecision {
  /** Especialista principal que se ejecuta sí o sí. */
  primarySpecialist: SAPModuleSpecialist;
  /** Especialistas secundarios opcionales (cross-module). */
  secondarySpecialists: SAPModuleSpecialist[];
  /** Score 0–100 — qué tan seguro está el router del primary. */
  confidenceScore: number;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  /** Razones legibles del por qué de la selección. */
  reasons: string[];
  /** Señales detectadas en el ticket (para auditar). */
  detectedSignals: {
    transactions: string[];
    sapObjects: string[];
    errorCodes: string[];
    keywords: string[];
    modules: string[];
  };
  /** True si la confianza es baja o cross-module ambiguo. */
  needsHumanReview: boolean;
}

/** Input que recibe el orquestador y los especialistas. */
export interface SpecialistAnalysisInput {
  ticketKey?: string;
  title: string;
  description: string;
  module?: string;
  process?: string;
  transaction?: string;
  environment?: string;
  priority?: string;
  sapData?: Record<string, unknown>;
  errorMessage?: string;
  businessImpact?: string;
  evidenceNotes?: string[];
  source?: "ticket" | "guided_intake" | "agent_chat" | "demo" | "jira" | "servicenow";
}

/** Resultado del análisis de un especialista individual. */
export interface SpecialistAnalysisResult {
  specialist: SAPModuleSpecialist;
  confidenceScore: number;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  /** Diagnóstico breve (1–3 párrafos). */
  diagnosis: string;
  /** Causa probable (si el especialista la tiene). */
  probableCause?: string;
  /** Pasos N1 ejecutables por el operador. */
  n1Checklist: string[];
  /** Datos que faltan al ticket para resolverlo. */
  missingData: string[];
  /** Criterios para escalar a N2. */
  n2Criteria: string[];
  /** Playbook sugerido si aplica. */
  suggestedPlaybook?: string;
  estimatedComplexity: "LOW" | "MEDIUM" | "HIGH";
  /** Si el caso típicamente se cierra en N1. */
  canResolveAtN1: boolean;
  /** Borrador de respuesta al cliente. */
  customerResponseDraft: string;
  /** Notas internas (consultor / coach). */
  internalNotes: string;
  /** Riesgos detectados. */
  risks: string[];
}

/**
 * Resultado consolidado del AMS Orchestrator — lo que se persiste en
 * `ticket.intelligence.specialistAnalysis` y se muestra en el TCC.
 */
export interface OrchestratedAMSAnalysis {
  analysisId: string;
  createdAt: string;
  ticketKey?: string;
  routing: SpecialistRoutingDecision;
  primaryAnalysis: SpecialistAnalysisResult;
  secondaryAnalyses: SpecialistAnalysisResult[];
  consolidatedDiagnosis: string;
  consolidatedN1Checklist: string[];
  consolidatedMissingData: string[];
  consolidatedN2Criteria: string[];
  nextBestAction: string;
  customerResponseDraft: string;
  confidenceScore: number;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresHumanReview: boolean;
  /** Trail de eventos audit emitidos durante la orquestación (string ids). */
  auditEvents: string[];
}

// ---------------------------------------------------------------------------
// Labels y colores para UI (consumidos por AmsSpecialistsSection)
// ---------------------------------------------------------------------------

export const SPECIALIST_LABELS: Record<SAPModuleSpecialist, string> = {
  MM: "MM · Compras / Logística entrada",
  SD: "SD · Ventas / Distribución",
  WM: "WM · Gestión de almacén",
  EWM: "EWM · Extended Warehouse",
  PP_MRP: "PP/MRP · Producción y planificación",
  INTEGRATIONS: "Integraciones · IDoc/CPI/API",
  BASIS_AUTH: "Basis / Autorizaciones",
  ABAP_TECHNICAL: "ABAP · Desarrollo técnico",
  FI_CROSS: "FI Cross · Contabilidad cruzada",
  UNKNOWN: "Sin clasificar",
};

export const SPECIALIST_ICONS: Record<SAPModuleSpecialist, string> = {
  MM: "📦",
  SD: "💰",
  WM: "🏬",
  EWM: "🏭",
  PP_MRP: "⚙",
  INTEGRATIONS: "🔌",
  BASIS_AUTH: "🔐",
  ABAP_TECHNICAL: "💻",
  FI_CROSS: "📊",
  UNKNOWN: "❓",
};

export const SPECIALIST_COLORS: Record<SAPModuleSpecialist, string> = {
  MM: "#22d3ee",
  SD: "#10b981",
  WM: "#a855f7",
  EWM: "#a855f7",
  PP_MRP: "#f59e0b",
  INTEGRATIONS: "#5b8def",
  BASIS_AUTH: "#ef4444",
  ABAP_TECHNICAL: "#fbbf24",
  FI_CROSS: "#64748b",
  UNKNOWN: "#94a3b8",
};
