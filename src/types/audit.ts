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
  | "COMMENT_ADDED"
  // Visual analysis
  | "VISUAL_EVIDENCE_ATTACHED"
  | "VISUAL_EVIDENCE_ANALYZED"
  | "TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS"
  // Demo guiada end-to-end
  | "DEMO_STARTED"
  | "DEMO_STEP_COMPLETED"
  | "DEMO_COMPLETED"
  // Customer Response Intelligence
  | "CUSTOMER_RESPONSE_GENERATED"
  | "CUSTOMER_RESPONSE_QUALITY_CHECKED"
  | "CUSTOMER_RESPONSE_BLOCKED"
  | "CUSTOMER_RESPONSE_APPROVED"
  | "CUSTOMER_RESPONSE_SAVED"
  | "CUSTOMER_RESPONSE_SENT_MANUAL"
  // N2 Escalation Intelligence
  | "N2_INTELLIGENCE_ANALYZED"
  | "N2_INTELLIGENCE_VERDICT_ESCALATE"
  | "N2_INTELLIGENCE_VERDICT_STAY"
  // Knowledge Auto-Curation Intelligence
  | "KB_CURATION_CANDIDATE_PROPOSED"
  | "KB_CURATION_APPROVED"
  | "KB_CURATION_REJECTED"
  | "KB_CURATION_PUBLISHED"
  // Guided Ticket Intake (v0.9.1)
  | "GUIDED_TICKET_INTAKE_STARTED"
  | "GUIDED_TICKET_INTAKE_COMPLETED"
  | "TICKET_READINESS_CALCULATED"
  | "TICKET_CREATED_WITH_N1_PACKAGE"
  | "TICKET_CREATED_WAITING_INFORMATION"
  | "N1_CHECKLIST_GENERATED"
  | "N1_CHECKLIST_COMPLETED"
  | "TICKET_RESOLVED_BY_N1"
  | "TICKET_ESCALATED_TO_N2_WITH_PACKAGE"
  // Auto Intelligence Enrichment (v0.10.0)
  | "TICKET_AUTO_ENRICHMENT_QUEUED"
  | "TICKET_AUTO_ENRICHMENT_STARTED"
  | "TICKET_AUTO_ENRICHMENT_COMPLETED"
  | "TICKET_AUTO_ENRICHMENT_FAILED"
  | "TICKET_REANALYSIS_REQUESTED"
  | "TICKET_REANALYSIS_COMPLETED"
  | "TICKET_REANALYSIS_FAILED"
  // AMS Specialist Agents (v0.11.0) — orquestador interno, agente único de cara al usuario
  | "AMS_SPECIALIST_ROUTING_STARTED"
  | "AMS_SPECIALIST_ROUTING_COMPLETED"
  | "AMS_SPECIALIST_ANALYSIS_STARTED"
  | "AMS_SPECIALIST_ANALYSIS_COMPLETED"
  | "AMS_SPECIALIST_ANALYSIS_FAILED"
  | "AMS_ORCHESTRATOR_ANALYSIS_COMPLETED"
  | "AMS_SPECIALIST_REANALYSIS_REQUESTED"
  | "AMS_SPECIALIST_REANALYSIS_COMPLETED"
  // TCC v0.12 — edición y cambios críticos de campos
  | "TICKET_EDITED"
  | "TICKET_CRITICAL_FIELDS_CHANGED"
  | "TICKET_ANALYSIS_HASH_CHANGED"
  // Gemini Governance v0.13
  | "GEMINI_CALL_STARTED"
  | "GEMINI_CALL_COMPLETED"
  | "GEMINI_CALL_FAILED"
  | "GEMINI_FALLBACK_USED"
  // Case Timeline & Knowledge Evolution (F0) — evolución del caso
  | "KNOWLEDGE_SNAPSHOT"        // marcador de versión de análisis (read-model)
  | "SAP_NOTE_LINKED"
  | "ABAP_UPLOADED"
  | "ATTACHMENT_ADDED"
  | "EVIDENCE_UPLOADED"
  | "FINDING_ADDED"
  | "FINDING_REMOVED"
  | "SEVERITY_CHANGED"
  | "PRIORITY_CHANGED"
  | "HYPOTHESIS_CHANGED"
  | "ROOT_CAUSE_CHANGED"
  | "RECOMMENDATION_UPDATED"
  | "KNOWLEDGE_UPDATED"
  | "FUNCTIONAL_CONTEXT_ADDED"
  | "TECHNICAL_CONTEXT_ADDED"
  | "CASE_REOPENED"
  | "CASE_CLOSED"
  | "MANUAL_REVIEW";

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
  VISUAL_EVIDENCE_ATTACHED: "Imagen adjuntada",
  VISUAL_EVIDENCE_ANALYZED: "Imagen analizada",
  TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS: "Estimado con análisis visual",
  DEMO_STARTED: "Demo iniciada",
  DEMO_STEP_COMPLETED: "Paso demo completado",
  DEMO_COMPLETED: "Demo completada",
  CUSTOMER_RESPONSE_GENERATED: "Respuesta cliente generada",
  CUSTOMER_RESPONSE_QUALITY_CHECKED: "Quality gate evaluado",
  CUSTOMER_RESPONSE_BLOCKED: "Respuesta cliente bloqueada",
  CUSTOMER_RESPONSE_APPROVED: "Respuesta cliente aprobada",
  CUSTOMER_RESPONSE_SAVED: "Respuesta guardada en ticket",
  CUSTOMER_RESPONSE_SENT_MANUAL: "Respuesta enviada manualmente",
  N2_INTELLIGENCE_ANALYZED: "N2 Intelligence ejecutada",
  N2_INTELLIGENCE_VERDICT_ESCALATE: "N2 Intelligence: ESCALAR",
  N2_INTELLIGENCE_VERDICT_STAY: "N2 Intelligence: mantener en N1",
  KB_CURATION_CANDIDATE_PROPOSED: "Candidato KB propuesto auto",
  KB_CURATION_APPROVED: "Candidato KB aprobado",
  KB_CURATION_REJECTED: "Candidato KB rechazado",
  KB_CURATION_PUBLISHED: "KB publicado desde curación",
  // Guided Ticket Intake v0.9.1
  GUIDED_TICKET_INTAKE_STARTED:        "Intake guiado iniciado",
  GUIDED_TICKET_INTAKE_COMPLETED:      "Intake guiado completado",
  TICKET_READINESS_CALCULATED:         "Readiness calculado",
  TICKET_CREATED_WITH_N1_PACKAGE:      "Ticket creado con paquete N1",
  TICKET_CREATED_WAITING_INFORMATION:  "Ticket creado · espera info",
  N1_CHECKLIST_GENERATED:              "Checklist N1 generado",
  N1_CHECKLIST_COMPLETED:              "Checklist N1 completado",
  TICKET_RESOLVED_BY_N1:               "Resuelto por N1",
  TICKET_ESCALATED_TO_N2_WITH_PACKAGE: "Escalado a N2 con paquete",
  // AIE v0.10
  TICKET_AUTO_ENRICHMENT_QUEUED:       "Enriquecimiento encolado",
  TICKET_AUTO_ENRICHMENT_STARTED:      "Enriquecimiento iniciado",
  TICKET_AUTO_ENRICHMENT_COMPLETED:    "Enriquecimiento completado",
  TICKET_AUTO_ENRICHMENT_FAILED:       "Enriquecimiento falló",
  TICKET_REANALYSIS_REQUESTED:         "Reanálisis solicitado",
  TICKET_REANALYSIS_COMPLETED:         "Reanálisis completado",
  TICKET_REANALYSIS_FAILED:            "Reanálisis falló",
  AMS_SPECIALIST_ROUTING_STARTED:      "Router de especialistas iniciado",
  AMS_SPECIALIST_ROUTING_COMPLETED:    "Router de especialistas completado",
  AMS_SPECIALIST_ANALYSIS_STARTED:     "Análisis de especialista iniciado",
  AMS_SPECIALIST_ANALYSIS_COMPLETED:   "Análisis de especialista completado",
  AMS_SPECIALIST_ANALYSIS_FAILED:      "Análisis de especialista falló",
  AMS_ORCHESTRATOR_ANALYSIS_COMPLETED: "Orquestador AMS consolidado",
  AMS_SPECIALIST_REANALYSIS_REQUESTED: "Reanálisis especialistas solicitado",
  AMS_SPECIALIST_REANALYSIS_COMPLETED: "Reanálisis especialistas completado",
  TICKET_EDITED:                       "Ticket editado",
  TICKET_CRITICAL_FIELDS_CHANGED:      "Campos críticos modificados",
  TICKET_ANALYSIS_HASH_CHANGED:        "Hash de análisis cambió",
  GEMINI_CALL_STARTED:                 "Gemini · llamada iniciada",
  GEMINI_CALL_COMPLETED:               "Gemini · llamada completada",
  GEMINI_CALL_FAILED:                  "Gemini · llamada falló",
  GEMINI_FALLBACK_USED:                "Gemini · fallback determinístico",
  // Case Timeline (F0)
  KNOWLEDGE_SNAPSHOT:                  "Snapshot de análisis",
  SAP_NOTE_LINKED:                     "SAP Note vinculada",
  ABAP_UPLOADED:                       "Código ABAP agregado",
  ATTACHMENT_ADDED:                    "Adjunto agregado",
  EVIDENCE_UPLOADED:                   "Evidencia cargada",
  FINDING_ADDED:                       "Hallazgo agregado",
  FINDING_REMOVED:                     "Hallazgo eliminado",
  SEVERITY_CHANGED:                    "Severidad cambiada",
  PRIORITY_CHANGED:                    "Prioridad cambiada",
  HYPOTHESIS_CHANGED:                  "Hipótesis actualizada",
  ROOT_CAUSE_CHANGED:                  "Causa raíz actualizada",
  RECOMMENDATION_UPDATED:              "Recomendación actualizada",
  KNOWLEDGE_UPDATED:                   "Conocimiento actualizado",
  FUNCTIONAL_CONTEXT_ADDED:            "Contexto funcional agregado",
  TECHNICAL_CONTEXT_ADDED:             "Contexto técnico agregado",
  CASE_REOPENED:                       "Caso reabierto",
  CASE_CLOSED:                         "Caso cerrado",
  MANUAL_REVIEW:                       "Revisión manual",
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
  VISUAL_EVIDENCE_ATTACHED: "📷",
  VISUAL_EVIDENCE_ANALYZED: "🔬",
  TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS: "🎯",
  DEMO_STARTED: "🎬",
  DEMO_STEP_COMPLETED: "▶",
  DEMO_COMPLETED: "🏁",
  CUSTOMER_RESPONSE_GENERATED: "✉",
  CUSTOMER_RESPONSE_QUALITY_CHECKED: "🛡",
  CUSTOMER_RESPONSE_BLOCKED: "🚫",
  CUSTOMER_RESPONSE_APPROVED: "✅",
  CUSTOMER_RESPONSE_SAVED: "💾",
  CUSTOMER_RESPONSE_SENT_MANUAL: "📤",
  N2_INTELLIGENCE_ANALYZED: "🧠",
  N2_INTELLIGENCE_VERDICT_ESCALATE: "🚨",
  N2_INTELLIGENCE_VERDICT_STAY: "🔧",
  KB_CURATION_CANDIDATE_PROPOSED: "🧠",
  KB_CURATION_APPROVED: "✅",
  KB_CURATION_REJECTED: "✕",
  KB_CURATION_PUBLISHED: "📚",
  GUIDED_TICKET_INTAKE_STARTED:        "🧭",
  GUIDED_TICKET_INTAKE_COMPLETED:      "🎯",
  TICKET_READINESS_CALCULATED:         "📊",
  TICKET_CREATED_WITH_N1_PACKAGE:      "📦",
  TICKET_CREATED_WAITING_INFORMATION:  "⏳",
  N1_CHECKLIST_GENERATED:              "📝",
  N1_CHECKLIST_COMPLETED:              "✅",
  TICKET_RESOLVED_BY_N1:               "🟢",
  TICKET_ESCALATED_TO_N2_WITH_PACKAGE: "🚀",
  TICKET_AUTO_ENRICHMENT_QUEUED:       "⏸",
  TICKET_AUTO_ENRICHMENT_STARTED:      "🔄",
  TICKET_AUTO_ENRICHMENT_COMPLETED:    "🤖",
  TICKET_AUTO_ENRICHMENT_FAILED:       "⚠",
  TICKET_REANALYSIS_REQUESTED:         "↻",
  TICKET_REANALYSIS_COMPLETED:         "🔁",
  TICKET_REANALYSIS_FAILED:            "✕",
  AMS_SPECIALIST_ROUTING_STARTED:      "🧭",
  AMS_SPECIALIST_ROUTING_COMPLETED:    "🎯",
  AMS_SPECIALIST_ANALYSIS_STARTED:     "🔍",
  AMS_SPECIALIST_ANALYSIS_COMPLETED:   "✅",
  AMS_SPECIALIST_ANALYSIS_FAILED:      "⚠",
  AMS_ORCHESTRATOR_ANALYSIS_COMPLETED: "🤝",
  AMS_SPECIALIST_REANALYSIS_REQUESTED: "↻",
  AMS_SPECIALIST_REANALYSIS_COMPLETED: "🔁",
  TICKET_EDITED:                       "✎",
  TICKET_CRITICAL_FIELDS_CHANGED:      "⚠",
  TICKET_ANALYSIS_HASH_CHANGED:        "#",
  GEMINI_CALL_STARTED:                 "▶",
  GEMINI_CALL_COMPLETED:               "✓",
  GEMINI_CALL_FAILED:                  "✕",
  GEMINI_FALLBACK_USED:                "⤺",
  // Case Timeline (F0) — emoji fallback; la CaseTimeline usa iconos Lucide (F1)
  KNOWLEDGE_SNAPSHOT:                  "🧠",
  SAP_NOTE_LINKED:                     "🔗",
  ABAP_UPLOADED:                       "📘",
  ATTACHMENT_ADDED:                    "📎",
  EVIDENCE_UPLOADED:                   "📥",
  FINDING_ADDED:                       "➕",
  FINDING_REMOVED:                     "➖",
  SEVERITY_CHANGED:                    "⚠",
  PRIORITY_CHANGED:                    "🔺",
  HYPOTHESIS_CHANGED:                  "💡",
  ROOT_CAUSE_CHANGED:                  "🎯",
  RECOMMENDATION_UPDATED:              "📌",
  KNOWLEDGE_UPDATED:                   "📚",
  FUNCTIONAL_CONTEXT_ADDED:            "🗂",
  TECHNICAL_CONTEXT_ADDED:             "🛠",
  CASE_REOPENED:                       "🔓",
  CASE_CLOSED:                         "🔒",
  MANUAL_REVIEW:                       "🔍",
};

export const EVENT_COLORS: Record<TicketAuditEventType, string> = {
  TICKET_CREATED: "#4589ff",
  AUTO_ESTIMATE_GENERATED: "#a855f7",
  ESTIMATE_RECALCULATED: "#a855f7",
  MANUAL_ADJUSTMENT: "#f1c21b",
  TICKET_CLASSIFIED: "#10b981",
  AGENT_RESPONSE_GENERATED: "#10b981",
  KNOWLEDGE_MATCHED: "#4589ff",
  SCOPE_ITEM_MATCHED: "#4589ff",
  PLAYBOOK_RECOMMENDED: "#4589ff",
  N2_ESCALATION_SUGGESTED: "#f1c21b",
  N2_ESCALATION_CREATED: "#fa4d56",
  JIRA_DEMO_CREATED: "#4589ff",
  SERVICENOW_DEMO_CREATED: "#4589ff",
  DOCUMENT_GENERATED: "#a855f7",
  TEST_CASE_CREATED: "#a855f7",
  QUALITY_EVALUATED: "#f1c21b",
  CONVERTED_TO_KNOWLEDGE: "#10b981",
  STATUS_CHANGED: "#64748b",
  COMMENT_ADDED: "#64748b",
  VISUAL_EVIDENCE_ATTACHED: "#4589ff",
  VISUAL_EVIDENCE_ANALYZED: "#a855f7",
  TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS: "#10b981",
  DEMO_STARTED: "#f1c21b",
  DEMO_STEP_COMPLETED: "#4589ff",
  DEMO_COMPLETED: "#10b981",
  CUSTOMER_RESPONSE_GENERATED: "#f59e0b",
  CUSTOMER_RESPONSE_QUALITY_CHECKED: "#4589ff",
  CUSTOMER_RESPONSE_BLOCKED: "#fa4d56",
  CUSTOMER_RESPONSE_APPROVED: "#10b981",
  CUSTOMER_RESPONSE_SAVED: "#a855f7",
  CUSTOMER_RESPONSE_SENT_MANUAL: "#10b981",
  N2_INTELLIGENCE_ANALYZED: "#4589ff",
  N2_INTELLIGENCE_VERDICT_ESCALATE: "#fa4d56",
  N2_INTELLIGENCE_VERDICT_STAY: "#10b981",
  KB_CURATION_CANDIDATE_PROPOSED: "#4589ff",
  KB_CURATION_APPROVED: "#10b981",
  KB_CURATION_REJECTED: "#fa4d56",
  KB_CURATION_PUBLISHED: "#a855f7",
  GUIDED_TICKET_INTAKE_STARTED:        "#4589ff",
  GUIDED_TICKET_INTAKE_COMPLETED:      "#10b981",
  TICKET_READINESS_CALCULATED:         "#a855f7",
  TICKET_CREATED_WITH_N1_PACKAGE:      "#10b981",
  TICKET_CREATED_WAITING_INFORMATION:  "#f1c21b",
  N1_CHECKLIST_GENERATED:              "#4589ff",
  N1_CHECKLIST_COMPLETED:              "#10b981",
  TICKET_RESOLVED_BY_N1:               "#10b981",
  TICKET_ESCALATED_TO_N2_WITH_PACKAGE: "#fa4d56",
  TICKET_AUTO_ENRICHMENT_QUEUED:       "#64748b",
  TICKET_AUTO_ENRICHMENT_STARTED:      "#4589ff",
  TICKET_AUTO_ENRICHMENT_COMPLETED:    "#10b981",
  TICKET_AUTO_ENRICHMENT_FAILED:       "#fa4d56",
  TICKET_REANALYSIS_REQUESTED:         "#a855f7",
  TICKET_REANALYSIS_COMPLETED:         "#10b981",
  TICKET_REANALYSIS_FAILED:            "#fa4d56",
  AMS_SPECIALIST_ROUTING_STARTED:      "#64748b",
  AMS_SPECIALIST_ROUTING_COMPLETED:    "#4589ff",
  AMS_SPECIALIST_ANALYSIS_STARTED:     "#4589ff",
  AMS_SPECIALIST_ANALYSIS_COMPLETED:   "#10b981",
  AMS_SPECIALIST_ANALYSIS_FAILED:      "#fa4d56",
  AMS_ORCHESTRATOR_ANALYSIS_COMPLETED: "#10b981",
  AMS_SPECIALIST_REANALYSIS_REQUESTED: "#a855f7",
  AMS_SPECIALIST_REANALYSIS_COMPLETED: "#10b981",
  TICKET_EDITED:                       "#4589ff",
  TICKET_CRITICAL_FIELDS_CHANGED:      "#f59e0b",
  TICKET_ANALYSIS_HASH_CHANGED:        "#a855f7",
  GEMINI_CALL_STARTED:                 "#64748b",
  GEMINI_CALL_COMPLETED:               "#10b981",
  GEMINI_CALL_FAILED:                  "#fa4d56",
  GEMINI_FALLBACK_USED:                "#f59e0b",
  // Case Timeline (F0)
  KNOWLEDGE_SNAPSHOT:                  "#8a3ffc",
  SAP_NOTE_LINKED:                     "#10b981",
  ABAP_UPLOADED:                       "#4589ff",
  ATTACHMENT_ADDED:                    "#4589ff",
  EVIDENCE_UPLOADED:                   "#f1c21b",
  FINDING_ADDED:                       "#10b981",
  FINDING_REMOVED:                     "#fa4d56",
  SEVERITY_CHANGED:                    "#f59e0b",
  PRIORITY_CHANGED:                    "#f59e0b",
  HYPOTHESIS_CHANGED:                  "#a855f7",
  ROOT_CAUSE_CHANGED:                  "#a855f7",
  RECOMMENDATION_UPDATED:              "#4589ff",
  KNOWLEDGE_UPDATED:                   "#4589ff",
  FUNCTIONAL_CONTEXT_ADDED:            "#4589ff",
  TECHNICAL_CONTEXT_ADDED:             "#4589ff",
  CASE_REOPENED:                       "#f1c21b",
  CASE_CLOSED:                         "#10b981",
  MANUAL_REVIEW:                       "#64748b",
};
