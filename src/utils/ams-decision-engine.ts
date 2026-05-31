// AMS Decision Engine.
// Dado un ticket + su contexto, decide qué acción recomendar y qué "next best
// actions" mostrar. Determinístico. Reglas mínimas según spec.

import type { Ticket } from "@/services/tickets.api";
import type { TicketEstimatedResolution } from "@/types/estimation";
import type { SapScopeItem } from "@/services/scope-items.api";

export type AmsRecommendedAction =
  | "REQUEST_MORE_INFO"
  | "SUGGEST_SOLUTION"
  | "USE_PLAYBOOK"
  | "ESCALATE_N2"
  | "CREATE_JIRA"
  | "CREATE_SERVICENOW"
  | "GENERATE_RCA"
  | "CREATE_TEST_CASE"
  | "CONVERT_TO_KNOWLEDGE"
  | "CREATE_KNOWLEDGE_GAP"
  | "CLOSE_WITH_DOCUMENTATION"
  | "WAIT_FOR_USER_CONFIRMATION";

export interface AmsNextBestAction {
  action: AmsRecommendedAction;
  label: string;
  reason: string;
  weight: number; // 0-100
}

export interface AmsDecisionResult {
  recommendedAction: AmsRecommendedAction;
  shouldAskForMoreData: boolean;
  shouldSuggestSolution: boolean;
  shouldEscalateN2: boolean;
  shouldCreateJira: boolean;
  shouldCreateServiceNow: boolean;
  shouldGenerateDocument: boolean;
  shouldCreateTestCase: boolean;
  shouldConvertToKnowledge: boolean;
  shouldCreateKnowledgeGap: boolean;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  nextBestActions: AmsNextBestAction[];
}

export interface DecisionContext {
  hasKnowledgeMatch: boolean;
  hasPlaybook: boolean;
  hasScopeItem: boolean;
  scopeItems: SapScopeItem[];
  hasErrorEvidence: boolean;
  isResolved: boolean;
  isProductive: boolean;
  hasComplexSolution: boolean;
  agentConfidence?: "LOW" | "MEDIUM" | "HIGH" | "alta" | "media" | "baja" | null;
}

function normalizePriority(p: string): "highest" | "high" | "medium" | "low" {
  const lp = p.toLowerCase();
  if (lp.includes("highest") || lp.includes("critical")) return "highest";
  if (lp.includes("high")) return "high";
  if (lp.includes("low")) return "low";
  return "medium";
}

function normConfidence(v: DecisionContext["agentConfidence"]): "LOW" | "MEDIUM" | "HIGH" | null {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s === "high" || s === "alta") return "HIGH";
  if (s === "low" || s === "baja") return "LOW";
  if (s === "medium" || s === "media") return "MEDIUM";
  return null;
}

const LABELS: Record<AmsRecommendedAction, string> = {
  REQUEST_MORE_INFO: "Pedir más información",
  SUGGEST_SOLUTION: "Sugerir solución",
  USE_PLAYBOOK: "Usar playbook",
  ESCALATE_N2: "Escalar a N2",
  CREATE_JIRA: "Crear ticket Jira",
  CREATE_SERVICENOW: "Crear ServiceNow",
  GENERATE_RCA: "Generar RCA",
  CREATE_TEST_CASE: "Crear caso de prueba",
  CONVERT_TO_KNOWLEDGE: "Convertir en conocimiento",
  CREATE_KNOWLEDGE_GAP: "Marcar brecha de conocimiento",
  CLOSE_WITH_DOCUMENTATION: "Cerrar con documentación",
  WAIT_FOR_USER_CONFIRMATION: "Esperar confirmación del cliente",
};

export function analyzeTicketDecision(
  ticket: Ticket,
  estimate: TicketEstimatedResolution | null | undefined,
  context: DecisionContext,
): AmsDecisionResult {
  const priority = normalizePriority(ticket.priority);
  const env = (ticket.environment || "").toUpperCase();
  const isPrd = env === "PRD" || context.isProductive;
  const agentConf = normConfidence(context.agentConfidence);

  const reasons: string[] = [];
  const actions: AmsNextBestAction[] = [];

  // Regla 9 — Si baja confianza del agente
  if (agentConf === "LOW") {
    actions.push({ action: "ESCALATE_N2", label: LABELS.ESCALATE_N2, weight: 60,
      reason: "Confianza baja del agente — revisión humana recomendada." });
    reasons.push("Confianza del agente baja.");
  }

  // Regla 3 — Crítico productivo
  if ((priority === "highest" || ticket.priority.toLowerCase() === "critical") && isPrd) {
    actions.push({ action: "ESCALATE_N2", label: LABELS.ESCALATE_N2, weight: 95,
      reason: "Prioridad crítica en productivo — escalación inmediata." });
    actions.push({ action: "CREATE_JIRA", label: LABELS.CREATE_JIRA, weight: 80,
      reason: "Trazabilidad en ITSM para incidentes críticos." });
    reasons.push("Crítico en productivo.");
  }

  // Regla 2 — Faltan datos críticos
  const missing = estimate?.missingData ?? [];
  const noEvidence = !context.hasErrorEvidence;
  if (missing.length >= 2 || noEvidence) {
    actions.push({ action: "REQUEST_MORE_INFO", label: LABELS.REQUEST_MORE_INFO, weight: 85,
      reason: `${missing.length} datos faltantes${noEvidence ? " + sin evidencia de error" : ""}.` });
    reasons.push("Faltan datos para diagnosticar.");
  }

  // Regla 9 — Playbook existente
  if (context.hasPlaybook) {
    actions.push({ action: "USE_PLAYBOOK", label: LABELS.USE_PLAYBOOK, weight: 75,
      reason: "Existe playbook AMS aplicable — seguirlo antes de escalar." });
    reasons.push("Playbook disponible.");
  }

  // Regla 1 — Confianza alta + knowledge
  if (agentConf === "HIGH" && context.hasKnowledgeMatch) {
    actions.push({ action: "SUGGEST_SOLUTION", label: LABELS.SUGGEST_SOLUTION, weight: 90,
      reason: "Confianza alta + conocimiento curado disponible." });
    reasons.push("Solución con respaldo de KB.");
  }

  // Regla 4 — Sin conocimiento
  if (!context.hasKnowledgeMatch) {
    actions.push({ action: "CREATE_KNOWLEDGE_GAP", label: LABELS.CREATE_KNOWLEDGE_GAP, weight: 40,
      reason: "No hay conocimiento previo del problema — abrir brecha." });
    reasons.push("Sin KB previo.");
  }

  // Regla 7 — Funcional SAP → caso de prueba
  if (context.hasScopeItem) {
    actions.push({ action: "CREATE_TEST_CASE", label: LABELS.CREATE_TEST_CASE, weight: 45,
      reason: `Scope item ${context.scopeItems[0]?.code} aplicable — caso de prueba útil.` });
  }

  // Regla 5 + 6 — Resuelto
  if (context.isResolved) {
    actions.push({ action: "CONVERT_TO_KNOWLEDGE", label: LABELS.CONVERT_TO_KNOWLEDGE, weight: 80,
      reason: "Ticket resuelto — capitalizar la solución como conocimiento." });
    if (context.hasComplexSolution) {
      actions.push({ action: "GENERATE_RCA", label: LABELS.GENERATE_RCA, weight: 70,
        reason: "Solución compleja — generar RCA documentado." });
    }
    actions.push({ action: "CLOSE_WITH_DOCUMENTATION", label: LABELS.CLOSE_WITH_DOCUMENTATION, weight: 60,
      reason: "Cerrar formalmente con documentación adjunta." });
  }

  // Pick top recommendation por weight
  actions.sort((a, b) => b.weight - a.weight);
  let recommended: AmsRecommendedAction = actions[0]?.action ?? "WAIT_FOR_USER_CONFIRMATION";

  // Override: si missing datos crítico > escalación, gana missing
  const hasMissingAction = actions.find((a) => a.action === "REQUEST_MORE_INFO");
  if (hasMissingAction && hasMissingAction.weight >= 80) {
    recommended = "REQUEST_MORE_INFO";
  }

  // Mapear flags shouldX
  const has = (a: AmsRecommendedAction) => actions.some((x) => x.action === a);

  let confidence: AmsDecisionResult["confidence"] = "MEDIUM";
  const score = estimate?.confidenceScore ?? 50;
  if (score >= 75) confidence = "HIGH";
  else if (score <= 45) confidence = "LOW";

  return {
    recommendedAction: recommended,
    shouldAskForMoreData: has("REQUEST_MORE_INFO"),
    shouldSuggestSolution: has("SUGGEST_SOLUTION"),
    shouldEscalateN2: has("ESCALATE_N2"),
    shouldCreateJira: has("CREATE_JIRA"),
    shouldCreateServiceNow: has("CREATE_SERVICENOW"),
    shouldGenerateDocument: has("GENERATE_RCA") || has("CLOSE_WITH_DOCUMENTATION"),
    shouldCreateTestCase: has("CREATE_TEST_CASE"),
    shouldConvertToKnowledge: has("CONVERT_TO_KNOWLEDGE"),
    shouldCreateKnowledgeGap: has("CREATE_KNOWLEDGE_GAP"),
    confidence,
    reasons,
    nextBestActions: actions.slice(0, 6),
  };
}

export { LABELS as AMS_ACTION_LABELS };
