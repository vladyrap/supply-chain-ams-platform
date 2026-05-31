// Tipos del módulo Escalamiento Nivel 2.
// Frontend-only con localStorage en Fase 1. Backend futuro documentado en docs/escalation-n2.md.

import type { Severity } from "@/types/ams-modules";

// ============================================================
// Status + canales + estrategias
// ============================================================

export type EscalationStatus =
  | "NEW"
  | "REVIEW_REQUIRED"
  | "READY_TO_ESCALATE"
  | "ESCALATED"
  | "ASSIGNED_TO_N2"
  | "IN_PROGRESS_N2"
  | "RESOLVED_BY_N2"
  | "RETURNED_TO_N1"
  | "CANCELLED";

export type EscalationChannel =
  | "JIRA"
  | "SERVICENOW"
  | "SAP_CLOUD_ALM_FUTURE"
  | "EMAIL_FUTURE"
  | "TEAMS_FUTURE"
  | "MANUAL";

export type AssignmentStrategy =
  | "BY_MODULE"
  | "BY_CLIENT"
  | "BY_SEVERITY"
  | "BY_AVAILABILITY"
  | "BY_WORKLOAD"
  | "ROUND_ROBIN"
  | "MANUAL"
  | "FIXED_PERSON";

export type N2AvailabilityStatus =
  | "AVAILABLE"
  | "BUSY"
  | "OFFLINE"
  | "ON_CALL"
  | "VACATION";

export type N2Role =
  | "N2_FUNCTIONAL_CONSULTANT"
  | "N2_TECHNICAL_CONSULTANT"
  | "N2_INTEGRATION_SPECIALIST"
  | "N2_BTP_SPECIALIST"
  | "N2_ABAP_SPECIALIST"
  | "N2_SERVICE_LEAD"
  | "N2_ARCHITECT";

export type ItsmMode = "DEMO" | "REAL" | "FUTURE";

// ============================================================
// Condiciones de regla
// ============================================================

export interface EscalationCondition {
  sapModule?: string;
  process?: string;
  client?: string;
  environment?: string;
  severity?: Severity | "CRITICAL"; // CRITICAL == P1
  confidenceBelow?: number;          // 0..100
  keywords?: string[];                // OR — cualquiera matchea
  serviceLevel?: string;
  role?: string;
  repeatedIncident?: boolean;
  businessImpact?: "LOW" | "MEDIUM" | "HIGH";
  technicalImpact?: "LOW" | "MEDIUM" | "HIGH";
  noSolutionFound?: boolean;
  agentRecommendedEscalation?: boolean;
}

// ============================================================
// Regla de escalamiento
// ============================================================

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;                  // 1 = más alta
  conditions: EscalationCondition;
  targetLevel: 2 | 3;
  assignmentStrategy: AssignmentStrategy;
  targetTeam?: string;
  targetRole?: N2Role;
  targetUserId?: string;
  channel: EscalationChannel;
  slaMinutes: number;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Responsable N2
// ============================================================

export interface N2Responsible {
  id: string;
  name: string;
  email: string;
  role: N2Role;
  team: string;
  sapModules: string[];
  processes: string[];
  clients: string[];
  countries: string[];
  serviceLevels: string[];
  availabilityStatus: N2AvailabilityStatus;
  workingHours: string;              // "08:00-18:00 CLT"
  timezone: string;                  // "America/Santiago"
  maxActiveCases: number;
  currentActiveCases: number;
  skills: string[];
  jiraAccountId?: string;            // sólo ID, nunca token
  serviceNowUserId?: string;
  teamsUserId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Registro de escalamiento
// ============================================================

export interface EscalationRecord {
  id: string;
  incidentId: string;
  escalationNumber: string;          // ESC-2026-001
  fromLevel: 1 | 2;
  toLevel: 2 | 3;
  reason: string;
  summary: string;                   // resumen técnico para N2
  clientSummary?: string;            // resumen ejecutivo opcional
  assignedTo?: string;               // N2Responsible.id
  assignedToName?: string;           // snapshot del nombre
  assignedTeam?: string;
  channel: EscalationChannel;
  ruleId?: string;                   // qué regla aplicó (si aplicó)
  externalTicketId?: string;
  externalTicketUrl?: string;
  status: EscalationStatus;
  slaTarget: string;                 // ISO date
  slaMinutes: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  requiresApproval: boolean;
  mode: ItsmMode;                    // DEMO | REAL
  payload?: ItsmTicketPayload;
  events: EscalationEvent[];
  /** Autoestimación copiada del incidente al escalar; puede recalcularse en N2. */
  estimatedResolution?: import("./estimation").TicketEstimatedResolution | null;
  /** Snapshot original al momento de la escalación, para mostrar diff N1↔N2. */
  estimatedResolutionOriginal?: import("./estimation").TicketEstimatedResolution | null;
  createdAt: string;
  updatedAt: string;
}

export type EscalationEventType =
  | "ESCALATION_CREATED"
  | "APPROVAL_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SENT_TO_JIRA"
  | "SENT_TO_SERVICENOW"
  | "ASSIGNED_TO_N2"
  | "UPDATED"
  | "RESOLVED"
  | "RETURNED_TO_N1";

export interface EscalationEvent {
  type: EscalationEventType;
  at: string;
  by: string;
  note?: string;
}

// ============================================================
// Conectores ITSM
// ============================================================

export interface JiraConnectorConfig {
  enabled: boolean;
  mode: ItsmMode;
  baseUrl: string;
  projectKey: string;
  issueType: string;
  defaultPriority: string;
  authConfigured: boolean;           // SOLO flag — nunca token
  userEmail?: string;
  apiTokenConfigured: boolean;       // SOLO flag
  defaultAssigneeAccountId?: string;
  labels: string[];
  components: string[];
}

export interface ServiceNowConnectorConfig {
  enabled: boolean;
  mode: ItsmMode;
  instanceUrl: string;
  table: string;                     // "incident"
  assignmentGroup: string;
  defaultPriority: string;
  authConfigured: boolean;
  username?: string;
  tokenConfigured: boolean;
}

export interface SapCloudAlmConnectorConfig {
  enabled: boolean;
  mode: "FUTURE";
  endpoint: string;
  note: string;
}

export interface ItsmConnectorConfig {
  jira: JiraConnectorConfig;
  serviceNow: ServiceNowConnectorConfig;
  sapCloudAlm: SapCloudAlmConnectorConfig;
  manualEnabled: boolean;            // siempre true
}

// ============================================================
// Payload de ticket
// ============================================================

export interface JiraTicketPayload {
  project: { key: string };
  issuetype: { name: string };
  summary: string;
  description: string;
  priority: { name: string };
  assignee?: { accountId: string };
  labels: string[];
  components: { name: string }[];
}

export interface ServiceNowTicketPayload {
  short_description: string;
  description: string;
  priority: string;
  assignment_group: string;
  assigned_to?: string;
  category: string;
  subcategory: string;
}

export type ItsmTicketPayload =
  | { channel: "JIRA"; payload: JiraTicketPayload }
  | { channel: "SERVICENOW"; payload: ServiceNowTicketPayload }
  | { channel: "MANUAL"; payload: { recipientEmail: string; subject: string; body: string } };

// ============================================================
// Settings del módulo
// ============================================================

export interface EscalationSettings {
  requiresApprovalDefault: boolean;
  allowAutoEscalationInDemo: boolean;
  defaultChannel: EscalationChannel;
  defaultTargetLevel: 2 | 3;
  slaBySeverity: Record<Severity, number>; // minutos
  useAvailabilityForAssignment: boolean;
  useWorkloadForAssignment: boolean;
  notifyClientOnEscalation: boolean;
  autoCreateEscalationDocument: boolean;
  autoCreateKnowledgeIfResolved: boolean;
  autoCreateRcaIfCritical: boolean;
}

// ============================================================
// Candidato para escalamiento (vista derivada de incidente)
// ============================================================

export interface EscalationCandidate {
  incidentId: string;
  clientName: string;
  userName: string;
  sapModule: string;
  process?: string;
  environment: string;
  message: string;
  agentResponse?: string;
  confidence: number;                // 0..100 normalizado
  severity: Severity;
  reason: string;                    // por qué es candidato
  matchedRule?: EscalationRule;
  suggestedAssignee?: N2Responsible;
  suggestedChannel: EscalationChannel;
  suggestedSlaMinutes: number;
  alreadyEscalated: boolean;
  escalationRecordId?: string;
  createdAt: string;
}

// ============================================================
// Storage keys
// ============================================================

export const ESCALATION_STORAGE = {
  rules:        "supply-chain-ams-escalation-rules",
  responsibles: "supply-chain-ams-n2-responsibles",
  records:      "supply-chain-ams-escalation-records",
  connectors:   "supply-chain-ams-itsm-connectors",
  settings:     "supply-chain-ams-escalation-settings",
} as const;

// ============================================================
// Labels para UI
// ============================================================

export const ESCALATION_STATUS_LABELS: Record<EscalationStatus, string> = {
  NEW:                "Nuevo",
  REVIEW_REQUIRED:    "Requiere revisión",
  READY_TO_ESCALATE:  "Listo para escalar",
  ESCALATED:          "Escalado",
  ASSIGNED_TO_N2:     "Asignado a N2",
  IN_PROGRESS_N2:     "En curso N2",
  RESOLVED_BY_N2:     "Resuelto por N2",
  RETURNED_TO_N1:     "Devuelto a N1",
  CANCELLED:          "Cancelado",
};

export const N2_ROLE_LABELS: Record<N2Role, string> = {
  N2_FUNCTIONAL_CONSULTANT:  "Consultor Funcional N2",
  N2_TECHNICAL_CONSULTANT:   "Consultor Técnico N2",
  N2_INTEGRATION_SPECIALIST: "Especialista Integraciones",
  N2_BTP_SPECIALIST:         "Especialista BTP",
  N2_ABAP_SPECIALIST:        "Especialista ABAP",
  N2_SERVICE_LEAD:           "Líder de Servicio N2",
  N2_ARCHITECT:              "Arquitecto",
};

export const AVAILABILITY_LABELS: Record<N2AvailabilityStatus, string> = {
  AVAILABLE: "Disponible",
  BUSY:      "Ocupado",
  OFFLINE:   "Fuera de línea",
  ON_CALL:   "En guardia",
  VACATION:  "Vacaciones",
};

export const CHANNEL_LABELS: Record<EscalationChannel, string> = {
  JIRA:                  "Jira",
  SERVICENOW:            "ServiceNow",
  SAP_CLOUD_ALM_FUTURE:  "SAP Cloud ALM (futuro)",
  EMAIL_FUTURE:          "Email (futuro)",
  TEAMS_FUTURE:          "Teams (futuro)",
  MANUAL:                "Manual",
};
