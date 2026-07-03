// Tipos compartidos por los nuevos módulos AMS (Playbooks, Document Factory,
// Quality Evaluator, Modo Demo Cliente, Convertir Incidente → Conocimiento).
//
// Todo se persiste en localStorage en Fase 1. Cada entidad mapea 1:1 a un
// futuro endpoint backend cuando exista.

// ============================================================================
// PLAYBOOK
// ============================================================================
export type PlaybookStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "NEEDS_REVIEW";
export type Severity = "P1" | "P2" | "P3" | "P4";

export interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  responsibleRole: string;
  estimatedMinutes: number;
  evidenceRequired: boolean;
  completionCriteria: string;
}

export interface AmsPlaybook {
  id: string;
  title: string;
  description: string;
  sapModule: string;
  process: string;
  severity: Severity;
  triggerWhen: string;
  steps: PlaybookStep[];
  requiredData: string[];
  responsibleRole: string;
  slaTargetMinutes: number;
  escalationRules: string;
  evidenceRequired: string[];
  communicationTemplate: string;
  relatedKnowledgeItems: string[];
  relatedScopeItems: string[];
  status: PlaybookStatus;
  version: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// Una ejecución de un playbook (checklist en vivo)
export interface PlaybookExecution {
  id: string;
  playbookId: string;
  startedAt: string;
  finishedAt: string | null;
  startedBy: string;
  incidentId: string | null;
  completedSteps: string[];   // step ids
  notes: Record<string, string>;  // step id → notas
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
}

// ============================================================================
// DOCUMENT FACTORY
// ============================================================================
export type DocumentType =
  | "RCA"
  | "MEETING_MINUTES"
  | "CLIENT_RESPONSE"
  | "FUNCTIONAL_SPEC"
  | "TECHNICAL_SPEC"
  | "TEST_CASE"
  | "USER_MANUAL"
  | "CUTOVER_PLAN"
  | "HYPERCARE_PLAN"
  | "EXECUTIVE_REPORT"
  | "GO_LIVE_CHECKLIST"
  | "REMEDIATION_PLAN"
  | "GAPS_REPORT"
  | "AGENT_CHANGELOG"
  | "ESTIMATE_RESOLUTION";

export type DocumentStatus = "DRAFT" | "GENERATED" | "REVIEWED" | "APPROVED" | "EXPORTED";

export type DocumentSourceType =
  | "incident" | "knowledge" | "playbook" | "scope_item" | "manual" | "evaluation";

export interface GeneratedDocument {
  id: string;
  title: string;
  documentType: DocumentType;
  sourceType: DocumentSourceType;
  sourceId: string | null;
  content: string;          // Markdown
  status: DocumentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  formData: Record<string, string>;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  RCA:                "RCA — Root Cause Analysis",
  MEETING_MINUTES:    "Minuta de reunión",
  CLIENT_RESPONSE:    "Respuesta formal al cliente",
  FUNCTIONAL_SPEC:    "Especificación funcional",
  TECHNICAL_SPEC:     "Especificación técnica",
  TEST_CASE:          "Caso de prueba",
  USER_MANUAL:        "Manual de usuario",
  CUTOVER_PLAN:       "Plan de cutover",
  HYPERCARE_PLAN:     "Plan de hypercare",
  EXECUTIVE_REPORT:   "Informe ejecutivo AMS",
  GO_LIVE_CHECKLIST:  "Checklist de go-live",
  REMEDIATION_PLAN:   "Plan de remediación",
  GAPS_REPORT:        "Informe de brechas",
  AGENT_CHANGELOG:    "Changelog del agente",
  ESTIMATE_RESOLUTION:"Estimación de resolución",
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  RCA: "🔍", MEETING_MINUTES: "📝", CLIENT_RESPONSE: "✉️",
  FUNCTIONAL_SPEC: "📋", TECHNICAL_SPEC: "🛠", TEST_CASE: "🧪",
  USER_MANUAL: "📘", CUTOVER_PLAN: "🚀", HYPERCARE_PLAN: "🩺",
  EXECUTIVE_REPORT: "📊", GO_LIVE_CHECKLIST: "✅",
  REMEDIATION_PLAN: "🔧", GAPS_REPORT: "🚧", AGENT_CHANGELOG: "🧠",
  ESTIMATE_RESOLUTION: "⏱",
};

// ============================================================================
// QUALITY EVALUATOR
// ============================================================================
export type HallucinationRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type TechnicalLevelFit = "TOO_SIMPLE" | "ADEQUATE" | "TOO_TECHNICAL";

export interface AgentEvaluation {
  id: string;
  incidentId: string | null;
  responseText: string;
  evaluator: string;
  role: string;
  accuracyScore: number;        // 1-5
  usefulnessScore: number;      // 1-5
  clarityScore: number;         // 1-5
  completenessScore: number;    // 1-5
  hallucinationRisk: HallucinationRiskLevel;
  technicalLevelFit: TechnicalLevelFit;
  needsHumanReview: boolean;
  canBecomeKnowledge: boolean;
  wasUsefulForClient: boolean;
  requiresEscalation: boolean;
  comments: string;
  createdAt: string;
}

export const RISK_COLORS: Record<HallucinationRiskLevel, string> = {
  LOW: "#10b981", MEDIUM: "#f1c21b", HIGH: "#fa4d56",
};
export const FIT_LABELS: Record<TechnicalLevelFit, string> = {
  TOO_SIMPLE: "Demasiado simple", ADEQUATE: "Adecuado", TOO_TECHNICAL: "Demasiado técnico",
};

// ============================================================================
// DEMO MODE
// ============================================================================
export type DemoScenarioId =
  | "ams_supply_chain"
  | "executive"
  | "training_ia"
  | "ia_governance"
  | "documentation"
  | "ams_full_flow";

export interface DemoScenarioStep {
  href: string;
  title: string;
  description: string;
}

export interface DemoScenario {
  id: DemoScenarioId;
  label: string;
  icon: string;
  description: string;
  steps: DemoScenarioStep[];
}

export interface DemoModeState {
  enabled: boolean;
  activeScenario: DemoScenarioId | null;
  startedAt: string | null;
  currentStepIndex: number;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================
export const AMS_MODULES_STORAGE = {
  playbooks:      "supply-chain-ams-playbooks",
  playbookRuns:   "supply-chain-ams-playbook-executions",
  documents:      "supply-chain-ams-generated-documents",
  evaluations:    "supply-chain-ams-agent-evaluations",
  demoMode:       "supply-chain-ams-demo-mode",
} as const;
