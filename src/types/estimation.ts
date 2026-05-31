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
