// Modelo de auditoría por ticket — timeline de eventos.
// Persistencia frontend en localStorage por demo. Sin backend en G1.

export type TicketAuditEventType =
  | "TICKET_CREATED"
  | "AUTO_ESTIMATE_GENERATED"
  | "ESTIMATE_RECALCULATED"
  | "MANUAL_ADJUSTMENT"
  | "TICKET_CLASSIFIED"
  | "AGENT_RESPONSE_GENERATED"
  | "KNOWLEDGE_MATCHED"
  | "SCOPE_ITEM_MATCHED"
  | "PLAYBOOK_RECOMMENDED"
  | "N2_ESCALATION_SUGGESTED"
  | "N2_ESCALATION_CREATED"
  | "JIRA_DEMO_CREATED"
  | "SERVICENOW_DEMO_CREATED"
  | "DOCUMENT_GENERATED"
  | "TEST_CASE_CREATED"
  | "QUALITY_EVALUATED"
  | "CONVERTED_TO_KNOWLEDGE"
  | "STATUS_CHANGED"
  | "COMMENT_ADDED";

export interface TicketAuditEvent {
  id: string;
  ticketId: string;
  eventType: TicketAuditEventType;
  title: string;
  description?: string;
  actor: string;          // nombre/email/system
  actorRole?: string;     // ADMIN, SERVICE_LEAD, etc.
  source: "ui" | "agent" | "system" | "integration";
  metadata?: Record<string, unknown>;
  createdAt: string;      // ISO timestamp
}

export const AUDIT_STORAGE = {
  events: "supply-chain-ams-ticket-audit-events",
} as const;

export const EVENT_LABELS: Record<TicketAuditEventType, string> = {
  TICKET_CREATED: "Ticket creado",
  AUTO_ESTIMATE_GENERATED: "Estimación generada",
  ESTIMATE_RECALCULATED: "Estimación recalculada",
  MANUAL_ADJUSTMENT: "Ajuste manual",
  TICKET_CLASSIFIED: "Clasificado con agente",
  AGENT_RESPONSE_GENERATED: "Respuesta del agente",
  KNOWLEDGE_MATCHED: "Conocimiento relacionado",
  SCOPE_ITEM_MATCHED: "Scope item relacionado",
  PLAYBOOK_RECOMMENDED: "Playbook recomendado",
  N2_ESCALATION_SUGGESTED: "Sugerido escalar a N2",
  N2_ESCALATION_CREATED: "Escalado a N2",
  JIRA_DEMO_CREATED: "Ticket Jira creado",
  SERVICENOW_DEMO_CREATED: "Ticket ServiceNow creado",
  DOCUMENT_GENERATED: "Documento generado",
  TEST_CASE_CREATED: "Caso de prueba",
  QUALITY_EVALUATED: "Evaluación de calidad",
  CONVERTED_TO_KNOWLEDGE: "Convertido en conocimiento",
  STATUS_CHANGED: "Estado cambiado",
  COMMENT_ADDED: "Comentario",
};

export const EVENT_ICONS: Record<TicketAuditEventType, string> = {
  TICKET_CREATED: "🎫",
  AUTO_ESTIMATE_GENERATED: "⏱",
  ESTIMATE_RECALCULATED: "↻",
  MANUAL_ADJUSTMENT: "✎",
  TICKET_CLASSIFIED: "🤖",
  AGENT_RESPONSE_GENERATED: "💬",
  KNOWLEDGE_MATCHED: "📚",
  SCOPE_ITEM_MATCHED: "🎯",
  PLAYBOOK_RECOMMENDED: "📕",
  N2_ESCALATION_SUGGESTED: "⚠",
  N2_ESCALATION_CREATED: "🚨",
  JIRA_DEMO_CREATED: "↗",
  SERVICENOW_DEMO_CREATED: "↗",
  DOCUMENT_GENERATED: "📄",
  TEST_CASE_CREATED: "🧪",
  QUALITY_EVALUATED: "🏅",
  CONVERTED_TO_KNOWLEDGE: "🧠",
  STATUS_CHANGED: "🔁",
  COMMENT_ADDED: "💭",
};

export const EVENT_COLORS: Record<TicketAuditEventType, string> = {
  TICKET_CREATED: "#22d3ee",
  AUTO_ESTIMATE_GENERATED: "#a855f7",
  ESTIMATE_RECALCULATED: "#a855f7",
  MANUAL_ADJUSTMENT: "#fbbf24",
  TICKET_CLASSIFIED: "#10b981",
  AGENT_RESPONSE_GENERATED: "#10b981",
  KNOWLEDGE_MATCHED: "#22d3ee",
  SCOPE_ITEM_MATCHED: "#22d3ee",
  PLAYBOOK_RECOMMENDED: "#22d3ee",
  N2_ESCALATION_SUGGESTED: "#fbbf24",
  N2_ESCALATION_CREATED: "#ef4444",
  JIRA_DEMO_CREATED: "#5b8def",
  SERVICENOW_DEMO_CREATED: "#5b8def",
  DOCUMENT_GENERATED: "#a855f7",
  TEST_CASE_CREATED: "#a855f7",
  QUALITY_EVALUATED: "#fbbf24",
  CONVERTED_TO_KNOWLEDGE: "#10b981",
  STATUS_CHANGED: "#64748b",
  COMMENT_ADDED: "#64748b",
};
