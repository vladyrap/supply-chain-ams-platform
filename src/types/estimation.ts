// Tipos del módulo Estimador Inteligente de Tiempos.
// Frontend-only con localStorage. Mismo patrón que los módulos enterprise previos.
// El motor de estimación es DETERMINÍSTICO basado en reglas — no LLM en Fase 1.

// ============================================================
// Enums
// ============================================================

export type EstimateType =
  | "INCIDENT_ANALYSIS"
  | "INCIDENT_RESOLUTION"
  | "CHANGE_REQUEST"
  | "SAP_CONFIGURATION"
  | "SAP_DEVELOPMENT"
  | "SAP_INTEGRATION"
  | "TESTING"
  | "GO_LIVE"
  | "HYPERCARE"
  | "AMS_SUPPORT"
  | "PROJECT_IMPLEMENTATION"
  | "SCOPE_ITEM_ACTIVATION"
  | "DOCUMENTATION"
  | "TRAINING";

export type ComplexityLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "UNKNOWN";
export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type UrgencyLevel = "NORMAL" | "URGENT" | "IMMEDIATE";
export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export type RequiredProfile =
  | "FUNCTIONAL_CONSULTANT"
  | "ABAP_DEVELOPER"
  | "INTEGRATION_CONSULTANT"
  | "BTP_CONSULTANT"
  | "BASIS_CONSULTANT"
  | "TESTING_CONSULTANT"
  | "AMS_LEAD"
  | "SAP_ARCHITECT"
  | "KEY_USER"
  | "BUSINESS_USER"
  | "PROJECT_MANAGER";

export type EstimateStatus = "DRAFT" | "GENERATED" | "REVIEWED" | "APPROVED" | "REJECTED" | "EXPORTED";

export type EstimateSourceType = "manual" | "incident" | "scope_item" | "playbook" | "agent_chat" | "testing_scenario";

export type EnvironmentLevel = "DEV" | "QA" | "UAT" | "PRD" | "SANDBOX" | "TRAINING" | "NO_INFORMADO";

// ============================================================
// Fase de estimación
// ============================================================

export interface EstimatePhase {
  id: string;
  name: string;
  description: string;
  minHours: number;
  maxHours: number;
  ownerProfile: RequiredProfile;
  dependencies: string[];     // ids de otras fases
  deliverables: string[];
  risks: string[];
}

// ============================================================
// Estimación completa
// ============================================================

export interface TimeEstimate {
  id: string;
  title: string;
  description: string;
  sourceType: EstimateSourceType;
  sourceId: string | null;       // id del incidente, scope item, etc.
  sapModule: string;
  process: string;
  subProcess?: string;
  scopeItemIds: string[];
  estimateType: EstimateType;
  complexity: ComplexityLevel;
  severity: SeverityLevel;
  urgency: UrgencyLevel;
  environment: EnvironmentLevel;
  serviceLevel: string;          // BASIC/STANDARD/PREMIUM/ENTERPRISE

  // Booleanos que mueven la estimación
  requiresDevelopment: boolean;
  requiresIntegration: boolean;
  requiresTransport: boolean;
  requiresUAT: boolean;
  requiresApproval: boolean;
  hasDocumentation: boolean;
  hasPlaybook: boolean;
  hasPublishedKnowledge: boolean;
  isProductive: boolean;
  isRepeatedIncident: boolean;

  // Resultado de la estimación
  estimatedMinHours: number;
  estimatedMaxHours: number;
  estimatedMinDays: number;        // hábiles (8h/día)
  estimatedMaxDays: number;
  estimatedWeeks: number;           // aproximación del max
  confidence: ConfidenceLevel;
  confidenceScore: number;          // 0..100

  // Detalles cualitativos
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  missingData: string[];            // qué pedir para mejorar
  requiredProfiles: RequiredProfile[];
  phaseBreakdown: EstimatePhase[];
  suggestedPlan: string;            // Markdown
  clientResponse: string;           // texto sugerido para enviar al cliente
  internalNotes: string;

  // Workflow
  status: EstimateStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// ============================================================
// Input que arma el motor
// ============================================================

export interface EstimateInput {
  title: string;
  description?: string;
  sourceType?: EstimateSourceType;
  sourceId?: string | null;
  sapModule?: string;
  process?: string;
  subProcess?: string;
  scopeItemIds?: string[];
  estimateType: EstimateType;
  complexity?: ComplexityLevel;
  severity?: SeverityLevel;
  urgency?: UrgencyLevel;
  environment?: EnvironmentLevel;
  serviceLevel?: string;
  requiresDevelopment?: boolean;
  requiresIntegration?: boolean;
  requiresTransport?: boolean;
  requiresUAT?: boolean;
  requiresApproval?: boolean;
  hasDocumentation?: boolean;
  hasPlaybook?: boolean;
  hasPublishedKnowledge?: boolean;
  isProductive?: boolean;
  isRepeatedIncident?: boolean;
  targetDate?: string;
  internalNotes?: string;
  createdBy?: string;
  tags?: string[];
}

// ============================================================
// Output del engine (antes de persistir)
// ============================================================

export interface EstimationResult {
  estimatedMinHours: number;
  estimatedMaxHours: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  estimatedWeeks: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  missingData: string[];
  requiredProfiles: RequiredProfile[];
  phaseBreakdown: EstimatePhase[];
  suggestedPlan: string;
  clientResponse: string;
}

// ============================================================
// Storage keys
// ============================================================

export const ESTIMATION_STORAGE = {
  estimates: "supply-chain-ams-time-estimates",
} as const;

// ============================================================
// Labels para UI
// ============================================================

export const ESTIMATE_TYPE_LABELS: Record<EstimateType, string> = {
  INCIDENT_ANALYSIS:       "Análisis de incidente",
  INCIDENT_RESOLUTION:     "Resolución de incidente",
  CHANGE_REQUEST:          "Request de cambio",
  SAP_CONFIGURATION:       "Configuración SAP",
  SAP_DEVELOPMENT:         "Desarrollo SAP (ABAP/BTP)",
  SAP_INTEGRATION:         "Integración SAP",
  TESTING:                 "Testing",
  GO_LIVE:                 "Puesta en marcha",
  HYPERCARE:               "Hypercare",
  AMS_SUPPORT:             "Soporte AMS",
  PROJECT_IMPLEMENTATION:  "Implementación proyecto",
  SCOPE_ITEM_ACTIVATION:   "Activación Scope Item",
  DOCUMENTATION:           "Documentación",
  TRAINING:                "Capacitación",
};

export const ESTIMATE_TYPE_ICONS: Record<EstimateType, string> = {
  INCIDENT_ANALYSIS:       "🔎",
  INCIDENT_RESOLUTION:     "🛠",
  CHANGE_REQUEST:          "📝",
  SAP_CONFIGURATION:       "⚙",
  SAP_DEVELOPMENT:         "💻",
  SAP_INTEGRATION:         "🔌",
  TESTING:                 "🧪",
  GO_LIVE:                 "🚀",
  HYPERCARE:               "🩺",
  AMS_SUPPORT:             "🛟",
  PROJECT_IMPLEMENTATION:  "📋",
  SCOPE_ITEM_ACTIVATION:   "📦",
  DOCUMENTATION:           "📄",
  TRAINING:                "🎓",
};

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  VERY_LOW:  "Muy baja",
  LOW:       "Baja",
  MEDIUM:    "Media",
  HIGH:      "Alta",
  VERY_HIGH: "Muy alta",
  UNKNOWN:   "Desconocida",
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  LOW:      "Baja",
  MEDIUM:   "Media",
  HIGH:     "Alta",
  CRITICAL: "Crítica",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  NORMAL:    "Normal",
  URGENT:    "Urgente",
  IMMEDIATE: "Inmediata",
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  LOW:    "Baja",
  MEDIUM: "Media",
  HIGH:   "Alta",
};

export const PROFILE_LABELS: Record<RequiredProfile, string> = {
  FUNCTIONAL_CONSULTANT:   "Consultor funcional SAP",
  ABAP_DEVELOPER:          "Consultor técnico ABAP",
  INTEGRATION_CONSULTANT:  "Consultor integración",
  BTP_CONSULTANT:          "Consultor BTP",
  BASIS_CONSULTANT:        "Consultor Basis",
  TESTING_CONSULTANT:      "Consultor testing",
  AMS_LEAD:                "Líder AMS",
  SAP_ARCHITECT:           "Arquitecto SAP",
  KEY_USER:                "Key user cliente",
  BUSINESS_USER:           "Usuario negocio",
  PROJECT_MANAGER:         "PM / Project Manager",
};

export const STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT:     "Borrador",
  GENERATED: "Generada",
  REVIEWED:  "Revisada",
  APPROVED:  "Aprobada",
  REJECTED:  "Rechazada",
  EXPORTED:  "Exportada",
};

// Constants útiles
export const ESTIMATE_TYPES: EstimateType[] = [
  "INCIDENT_ANALYSIS", "INCIDENT_RESOLUTION", "CHANGE_REQUEST",
  "SAP_CONFIGURATION", "SAP_DEVELOPMENT", "SAP_INTEGRATION",
  "TESTING", "GO_LIVE", "HYPERCARE", "AMS_SUPPORT",
  "PROJECT_IMPLEMENTATION", "SCOPE_ITEM_ACTIVATION",
  "DOCUMENTATION", "TRAINING",
];
export const COMPLEXITY_LEVELS: ComplexityLevel[] = ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH", "UNKNOWN"];
export const SEVERITY_LEVELS: SeverityLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const URGENCY_LEVELS: UrgencyLevel[] = ["NORMAL", "URGENT", "IMMEDIATE"];
export const ENVIRONMENT_LEVELS: EnvironmentLevel[] = ["DEV", "QA", "UAT", "PRD", "SANDBOX", "TRAINING", "NO_INFORMADO"];

// ============================================================
// Autoestimación de Resolución (por ticket/incidente)
// ============================================================
// El feature `/time-estimator` produce TimeEstimate (cotización manual de proyectos).
// Esta sección define la estructura para autoestimaciones embebidas en cada
// ticket/incidente: se generan automáticamente al crear, viven dentro del JSONB
// del ticket, y son recalculables cuando cambian factores.

export type TicketEstimateOrigin =
  | "agent_chat"
  | "manual_incident"
  | "escalation_n2"
  | "testing_defect"
  | "jira_demo"
  | "servicenow_demo"
  | "support_desk"
  | "demo_cliente"
  | "other";

export type TicketKind = "incident" | "change_request" | "service_request";

export interface TicketEstimatePhase {
  id: string;
  name: string;
  description: string;
  minHours: number;
  maxHours: number;
  ownerProfile: RequiredProfile;
  required: boolean;
  status?: "pending" | "in_progress" | "done" | "skipped";
  dependencies: string[];
  deliverables: string[];
}

export interface TicketEstimateInput {
  ticketId: string;
  origin: TicketEstimateOrigin;
  kind?: TicketKind;
  title: string;
  description?: string;
  sapModule?: string;
  process?: string;
  subProcess?: string;
  environment?: EnvironmentLevel;
  severity?: SeverityLevel;
  priority?: UrgencyLevel;
  complexity?: ComplexityLevel;
  serviceLevel?: string;
  agentConfidence?: ConfidenceLevel | "no_detectada" | "baja" | "media" | "alta";
  requiresDevelopment?: boolean;
  requiresIntegration?: boolean;
  requiresTransport?: boolean;
  requiresTesting?: boolean;
  requiresUAT?: boolean;
  hasKnownPlaybook?: boolean;
  hasKnowledgeMatch?: boolean;
  hasScopeItemCoverage?: boolean;
  isRepeatedIncident?: boolean;
  affectedUsers?: number;
  businessImpact?: "low" | "medium" | "high" | "critical";
  technicalImpact?: "low" | "medium" | "high" | "critical";
  hasErrorEvidence?: boolean;
  isProductive?: boolean;
  missingData?: string[];
  /** Hints derivados del análisis visual de imágenes adjuntas. Opcional. */
  visualAnalysisHints?: {
    detectedSapModule?: string;
    detectedProcess?: string;
    detectedSubProcess?: string;
    detectedErrorCode?: string;
    detectedTransaction?: string;
    confidence?: ConfidenceLevel | "low" | "medium" | "high";
    extraMissingData?: string[];
    extraHints?: string[];
  };
}

/**
 * Modo de calibración del motor de estimación.
 *
 * - BOOTSTRAP (default): para tenants con <20 cierres reales. Bandas más amplias,
 *   confianza tope MEDIUM, disclaimer en clientResponse. Evita falsa precisión.
 * - CALIBRATED: para tenants con >=20 cierres + factor de ajuste aceptado.
 *   Bandas estrictas, puede devolver confianza HIGH.
 *
 * Setear vía tenant_settings.estimationCalibrationMode (UI en /admin),
 * o por env `NEXT_PUBLIC_ESTIMATION_MODE`. Default sigue siendo BOOTSTRAP.
 */
export type EstimationCalibrationMode = "BOOTSTRAP" | "CALIBRATED";

export interface TicketEstimatedResolution {
  id: string;
  ticketId: string;
  totalMinHours: number;
  totalMaxHours: number;
  totalMinBusinessDays: number;
  totalMaxBusinessDays: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  complexity: ComplexityLevel;
  phaseBreakdown: TicketEstimatePhase[];
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  missingData: string[];
  suggestedSlaMinutes: number;
  // metadatos de origen / auditoría
  generatedAt: string;
  lastRecalculatedAt: string;
  generatedBy: "SYSTEM_ESTIMATOR" | string;
  manuallyAdjusted: boolean;
  adjustedBy?: string;
  adjustmentReason?: string;
  // factores aplicados (útil para explicar el resultado)
  appliedRules: string[];
  // Modo de calibración usado al generar (BOOTSTRAP por default)
  calibrationMode?: EstimationCalibrationMode;

  // ── Trackeo estimado vs real (se llenan al cerrar el ticket) ──────────────
  /** Horas que efectivamente tomó la resolución (input humano al cerrar). */
  actualHours?: number;
  /** Días hábiles efectivos (actualHours / 8). */
  actualBusinessDays?: number;
  /** Cuándo se cerró el ticket. */
  closedAt?: string;
  /** Quien capturó las horas reales. */
  closedBy?: string;
  /**
   * Desviación = actualHours - midEstimate. Negativo si fue más rápido.
   * midEstimate = (totalMinHours + totalMaxHours) / 2.
   */
  varianceHours?: number;
  /** Desviación relativa: (actualHours - mid) / mid · 100. */
  variancePct?: number;
  /** Si actualHours cayó dentro del rango min-max → true. */
  withinBand?: boolean;
}

/**
 * Agregado a nivel tenant: cuántos tickets cerrados con `actualHours` hay y cuál
 * es la desviación promedio. Sirve para el tile del dashboard y para decidir si
 * el motor ya puede promoverse a CALIBRATED.
 */
export interface EstimationCalibrationSnapshot {
  closedTicketsWithActual: number;
  averageVariancePct: number;        // signed: positivo = subestimamos
  averageAbsVariancePct: number;     // unsigned: error medio
  withinBandPct: number;              // % de tickets cuyo actual cayó dentro del min-max
  recommendedMode: EstimationCalibrationMode;
  suggestedAdjustmentFactor: number;  // 1.0 = sin ajuste, 1.3 = motor subestima 30%, multiplicar
  lastComputedAt: string;
  // Promedios por estimateType — para ajustar pesos más finos en el futuro
  byKind?: Record<string, { samples: number; avgVariancePct: number }>;
}

// Storage para autoestimaciones (clave separada para no mezclar con TimeEstimate del módulo /time-estimator)
export const TICKET_ESTIMATE_STORAGE = {
  estimates: "supply-chain-ams-ticket-estimates",
  calibrationSnapshot: "supply-chain-ams-estimation-calibration",
} as const;

// =============================================================================
// CONTEXTUAL AMS ESTIMATION ENGINE
// =============================================================================
// Tipos del motor contextual (v2). Envuelve el baseline determinístico con:
// - análisis semántico del texto
// - detección de objetos SAP
// - matching con casos históricos
// - matching con playbooks
// - escenarios optimista/esperado/pesimista
// - explicabilidad por factor
// =============================================================================

import type { DetectedSapContext } from "@/utils/sap-context-detector";

/** Factor que sube o baja la estimación, con razón legible. */
export interface ContextualAdjustment {
  factor: string;
  /** Multiplicador aplicado (1.0 = neutro, 1.30 = sube 30%, 0.80 = baja 20%). */
  impact: number;
  /** Tipo de impacto */
  direction: "increase" | "decrease" | "neutral";
  /** Categoría a la que pertenece — sirve para agrupar en UI */
  category:
    | "complexity"
    | "data_quality"
    | "environment"
    | "scope"
    | "knowledge_availability"
    | "historical"
    | "risk";
  /** Explicación humana. */
  reason: string;
  /** Delta en horas si es absoluto en lugar de multiplicador */
  hoursDelta?: number;
}

/** Un caso histórico similar para benchmarking. */
export interface SimilarHistoricalCase {
  caseId: string;
  title: string;
  module: string;
  /** Tipo de problema del caso histórico — sirve para filtrar al aplicar cap. */
  issueType: string;
  similarityScore: number;            // 0..1
  actualResolutionHours: number;
  complexity: ComplexityLevel;
  rootCause: string;
  solutionSummary: string;
  matchedSignals: string[];           // qué coincidió: ["MM", "MIGO", "M7 022"]
}

/** Una fase del breakdown contextual con horas + razón + confianza. */
export interface ContextualPhase {
  id: string;
  order: number;
  name: string;
  reason: string;                     // por qué esta fase aplica al caso
  minHours: number;
  expectedHours: number;
  maxHours: number;
  ownerProfile: RequiredProfile;
  required: boolean;
  confidence: ConfidenceLevel;
  evidenceRequired?: boolean;
  dependencies?: string[];
}

/** Escenario probabilístico — narrativo + numérico. */
export interface ContextualScenario {
  hours: number;
  businessDays: number;
  explanation: string;
  assumptions: string[];
}

/** Match opcional con un playbook AMS. */
export interface PlaybookMatch {
  playbookId: string;
  playbookTitle: string;
  matchScore: number;
  steps: number;
  estimatedMinutes: number;
  /** Reasons del match */
  reasons: string[];
}

/** Recomendación accionable que el motor produce además del número. */
export interface ContextualRecommendation {
  id: string;
  /** Tipo de acción que aplica */
  kind:
    | "improve_estimation"
    | "ask_user"
    | "escalate_n2"
    | "create_jira"
    | "use_playbook"
    | "request_evidence"
    | "open_rca"
    | "validate_data";
  title: string;
  description: string;
  /** Score 1-5 — qué tanto impactaría aplicarla */
  expectedImpact: 1 | 2 | 3 | 4 | 5;
}

/** Output completo del Contextual AMS Estimation Engine. */
export interface ContextualEstimationResult {
  estimateId: string;
  createdAt: string;
  engineVersion: string;              // ej "0.1.0-mock"

  /** Resumen del texto que entró al motor */
  inputSummary: {
    title?: string;
    descriptionExcerpt?: string;
    sapModuleHint?: string;
    environmentHint?: string;
  };

  /** Contexto detectado por el sap-context-detector */
  detectedContext: DetectedSapContext;

  /** Baseline del motor determinístico (sin contexto) */
  baselineEstimate: {
    minHours: number;
    maxHours: number;
    confidence: ConfidenceLevel;
    confidenceScore: number;
    source: "ticket_engine" | "project_engine";
  };

  /** Ajustes contextuales aplicados sobre el baseline */
  contextualAdjustments: ContextualAdjustment[];

  /** Casos históricos top-N similares */
  similarCases: SimilarHistoricalCase[];

  /** Match con playbook AMS (null si no hay aplicable) */
  playbookMatch: PlaybookMatch | null;

  /** Escenarios probabilísticos */
  optimisticScenario: ContextualScenario;
  expectedScenario: ContextualScenario;
  pessimisticScenario: ContextualScenario;

  /** Rango total — superset de los 3 escenarios */
  totalRange: {
    minHours: number;
    expectedHours: number;
    maxHours: number;
    minBusinessDays: number;
    expectedBusinessDays: number;
    maxBusinessDays: number;
  };

  /** Breakdown por fases con horas + confianza por fase */
  phaseBreakdown: ContextualPhase[];

  /** Confianza global del motor */
  confidence: ConfidenceLevel;
  confidenceScore: number;            // 0-100

  /** Supuestos del cálculo */
  assumptions: string[];

  /** Riesgos identificados */
  risks: string[];

  /** Datos que faltan y mejorarían la precisión */
  missingData: string[];

  /** Recomendaciones accionables */
  recommendations: ContextualRecommendation[];

  /** NBA específica del estimador */
  nextBestAction: {
    label: string;
    description: string;
    cta?: string;
  };

  /** Texto pre-armado para responder al cliente con la estimación */
  clientResponseDraft: string;

  /** Notas internas (debug + razones del cálculo) */
  internalNotes: string;

  /** Modo de calibración usado al estimar (heredado del baseline) */
  calibrationMode?: EstimationCalibrationMode;
}

/** Input mínimo para el motor contextual. Permite tanto texto libre como
 * los flags clásicos del estimador determinístico. Todos los campos son
 * opcionales — si falta algo, el motor lo marca como missingData. */
export interface ContextualEstimationInput {
  // Identificación
  sourceId?: string;
  ticketKey?: string;

  // Texto (lo central — alimenta el detector)
  title?: string;
  description?: string;
  comments?: string;
  errorMessage?: string;
  transcription?: string;

  // Hints clásicos (sobreescriben al detector si están)
  sapModule?: string;
  process?: string;
  subProcess?: string;
  environment?: EnvironmentLevel;
  severity?: SeverityLevel;
  urgency?: UrgencyLevel;
  complexity?: ComplexityLevel;
  serviceLevel?: string;
  estimateType?: EstimateType;
  kind?: TicketKind;

  // Booleanos clásicos (override del detector)
  requiresDevelopment?: boolean;
  requiresIntegration?: boolean;
  requiresTransport?: boolean;
  requiresUAT?: boolean;
  requiresApproval?: boolean;
  hasDocumentation?: boolean;
  hasPlaybook?: boolean;
  hasPublishedKnowledge?: boolean;
  hasErrorEvidence?: boolean;
  isProductive?: boolean;
  isRepeatedIncident?: boolean;

  // Datos auxiliares
  scopeItemIds?: string[];
  tags?: string[];
  createdBy?: string;
  internalNotes?: string;
}
