// =============================================================================
// AMS Intelligence Core — Orquestador unificado de engines
// =============================================================================
// `analyzeTicket(ticket, context)` coordina todos los engines determinísticos
// del frontend y devuelve un `IntelligenceAnalysis` unificado.
//
// Reglas:
//   - NO reemplaza ningún engine. Los agrega.
//   - Si un engine falla, NO rompe el resto. Se reporta en `failedEngines[]`.
//   - Memoización opcional vía cache map por ticket.key.
//   - Todos los engines son síncronos y determinísticos (sin LLM).
// =============================================================================

import type { Ticket } from "@/services/tickets.api";
import type { IntelligenceAnalysis, IntelligenceContext } from "./types";

import { analyzeTicketDecision, AMS_ACTION_LABELS } from "@/utils/ams-decision-engine";
import { calculateTicketReadiness } from "@/utils/ticket-readiness-engine";
import { analyzeTicketTextForEstimation } from "@/utils/sap-context-detector";
import { estimateAmsResolutionContextually } from "@/utils/contextual-ams-estimation-engine";
import { generateCustomerResponse, buildResponseContextFromTicket } from "./customer-response-engine";
import { analyzeN2Escalation } from "./n2-escalation-intelligence-engine";
import { analyzeCurationCandidate } from "./knowledge-curation-engine";

export const INTELLIGENCE_CORE_VERSION = "0.1.0-core";

// ============================================================
// Cache simple por ticket.key (in-memory, single-tab)
// ============================================================
const cache = new Map<string, { ts: number; analysis: IntelligenceAnalysis }>();
const CACHE_TTL_MS = 30_000; // 30s para no recalcular en cada render del TCC

export function invalidateIntelligenceCache(ticketKey?: string): void {
  if (ticketKey) cache.delete(ticketKey);
  else cache.clear();
}

// ============================================================
// Helper: ejecutar un engine con try/catch + reporting
// ============================================================
function safeExec<T>(name: string, fn: () => T, failed: string[]): T | null {
  try {
    return fn();
  } catch (err) {
    failed.push(name);
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[intelligence-core] ${name} failed:`, (err as Error).message);
    }
    return null;
  }
}

// ============================================================
// Función principal
// ============================================================

/**
 * Orquestador principal — analiza un ticket usando TODOS los engines.
 * Si un engine falla, queda registrado en `failedEngines[]` pero el resto sigue.
 */
export function analyzeTicket(
  ticket: Ticket,
  ctx: IntelligenceContext = {},
): IntelligenceAnalysis {
  // Cache hit?
  const cached = cache.get(ticket.key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.analysis;
  }

  const startedAt = Date.now();
  const failedEngines: string[] = [];
  const qualityRisks: string[] = [];
  const missingData: string[] = [];
  const confidences: number[] = [];

  // ── 1. SAP context detection ───────────────────────────────
  const sapContext = safeExec("sap-context-detector", () =>
    analyzeTicketTextForEstimation({
      title: ticket.title,
      description: ticket.description,
      hintModule: (ticket.sapModule as never) ?? undefined,
    }),
  failedEngines);

  const detectedContext = {
    module: (sapContext?.module as string | undefined) ?? ticket.sapModule ?? null,
    transaction: sapContext?.transactions?.[0] ?? null,
    errorCode: sapContext?.errorCodes?.[0] ?? null,
    issueType: (sapContext?.issueType as string | undefined) ?? null,
  };

  // ── 2. Ticket readiness ────────────────────────────────────
  const readiness = safeExec("ticket-readiness-engine", () =>
    calculateTicketReadiness(ticket),
  failedEngines);
  const readinessScore = readiness?.score ?? 0;
  if (readiness && readiness.criteria) {
    for (const c of readiness.criteria) {
      if (!c.satisfied && c.fixHint) missingData.push(c.fixHint);
    }
  }

  // ── 3. Decision engine (NBA) ───────────────────────────────
  const decision = safeExec("ams-decision-engine", () =>
    analyzeTicketDecision(ticket, ticket.estimatedResolution, {
      hasKnowledgeMatch: !!ctx.hasKnowledgeMatch,
      hasPlaybook: !!ctx.hasPlaybook,
      hasScopeItem: !!ctx.hasScopeItem,
      scopeItems: [],
      hasErrorEvidence: !!ctx.hasErrorEvidence,
      isResolved: /resol|done|closed/i.test(ticket.status),
      isProductive: ctx.isProductive ?? (ticket.environment?.toUpperCase() === "PRD"),
      hasComplexSolution: (ticket.estimatedResolution?.totalMaxHours ?? 0) >= 12,
      agentConfidence: null,
      hasExistingTestCase: false,
      hasExistingRca: false,
      similarPastTicketsCount: ctx.similarPastTicketsCount ?? 0,
      hasReusableResolution: !!ctx.hasReusableResolution,
      daysSinceLastUpdate: ctx.daysSinceLastUpdate ?? 0,
    }),
  failedEngines);

  const nextBestAction = decision ? {
    action: decision.recommendedAction,
    label: AMS_ACTION_LABELS[decision.recommendedAction] ?? String(decision.recommendedAction),
    confidence: decision.confidence,
    reasoning: decision.reasons || [],
  } : null;
  if (decision?.confidence === "HIGH") confidences.push(90);
  else if (decision?.confidence === "MEDIUM") confidences.push(60);
  else if (decision?.confidence === "LOW") confidences.push(30);

  // ── 4. Estimación: prioridad ticket.estimatedResolution → contextual
  let estimatedResolution: IntelligenceAnalysis["estimatedResolution"] = null;
  if (ticket.estimatedResolution) {
    estimatedResolution = {
      minHours: ticket.estimatedResolution.totalMinHours,
      maxHours: ticket.estimatedResolution.totalMaxHours,
      confidence: ticket.estimatedResolution.confidence,
      source: "ticket",
    };
    const conf = ticket.estimatedResolution.confidence;
    if (conf === "HIGH") confidences.push(85);
    else if (conf === "MEDIUM") confidences.push(55);
    else confidences.push(25);
    if (ticket.estimatedResolution.missingData) {
      missingData.push(...ticket.estimatedResolution.missingData);
    }
  } else {
    const contextual = safeExec("contextual-ams-estimation", () =>
      estimateAmsResolutionContextually({
        ticketKey: ticket.key,
        title: ticket.title,
        description: ticket.description,
        sapModule: ticket.sapModule ?? undefined,
        environment: (ticket.environment as "PRD" | "QA" | "DEV" | "SANDBOX" | "NO_INFORMADO" | undefined) ?? undefined,
        severity: /high|critical/i.test(ticket.priority) ? "HIGH" : "MEDIUM",
        isProductive: ctx.isProductive ?? (ticket.environment?.toUpperCase() === "PRD"),
        hasPlaybook: !!ctx.hasPlaybook,
        hasPublishedKnowledge: !!ctx.hasKnowledgeMatch,
        scopeItemIds: ctx.scopeItemIds ?? [],
        createdBy: ctx.actor ?? "system",
      }),
    failedEngines);
    if (contextual) {
      estimatedResolution = {
        minHours: contextual.totalRange.minHours,
        maxHours: contextual.totalRange.maxHours,
        confidence: contextual.confidence,
        source: "contextual",
      };
      if (contextual.confidence === "HIGH") confidences.push(75);
      else if (contextual.confidence === "MEDIUM") confidences.push(50);
      else confidences.push(25);
    }
  }

  // ── 5. N2 escalation intelligence ──────────────────────────
  const escalation = safeExec("n2-escalation-intelligence", () =>
    analyzeN2Escalation({
      ticketKey: ticket.key,
      ticketTitle: ticket.title,
      ticketDescription: ticket.description,
      ticketPriority: ticket.priority,
      sapModule: ticket.sapModule,
      environment: ticket.environment,
      isProductive: ctx.isProductive ?? (ticket.environment?.toUpperCase() === "PRD"),
      hasPlaybook: !!ctx.hasPlaybook,
      hasKnowledgeMatch: !!ctx.hasKnowledgeMatch,
      hasScopeItem: !!ctx.hasScopeItem,
      hasErrorEvidence: !!ctx.hasErrorEvidence,
      hasVisualEvidence: !!ctx.hasVisualEvidence,
      estimationConfidence: ticket.estimatedResolution?.confidence as "LOW" | "MEDIUM" | "HIGH" | undefined,
      estimationMinHours: ticket.estimatedResolution?.totalMinHours,
      estimationMaxHours: ticket.estimatedResolution?.totalMaxHours,
      similarPastTicketsCount: ctx.similarPastTicketsCount ?? 0,
      daysOpen: ctx.daysSinceLastUpdate ?? 0,
      affectsCriticalProcess: ctx.isProductive ?? false,
    }),
  failedEngines);

  const escalationRecommendation = escalation ? {
    verdict: escalation.verdict,
    urgencyScore: escalation.urgencyScore,
    confidenceScore: escalation.confidenceScore,
    primarySpecialistName: escalation.specialistRecommendations?.[0]?.responsibleName,
    slaTier: escalation.slaRecommendation?.tier,
    summary: escalation.executiveSummary,
  } : null;
  if (escalation) confidences.push(escalation.confidenceScore);

  // ── 6. Customer response suggestion ────────────────────────
  const responseContext = safeExec("customer-response-context-builder", () =>
    buildResponseContextFromTicket(ticket, {
      hasKnowledgeMatch: !!ctx.hasKnowledgeMatch,
      hasPlaybook: !!ctx.hasPlaybook,
      playbookTitle: ctx.playbookTitle,
      hasScopeItem: !!ctx.hasScopeItem,
      hasErrorEvidence: !!ctx.hasErrorEvidence,
      hasVisualEvidence: !!ctx.hasVisualEvidence,
      hasEscalationN2: !!ctx.hasEscalationN2,
      escalationKey: ctx.escalationKey,
      confidence: ticket.estimatedResolution?.confidence,
      missingData: ticket.estimatedResolution?.missingData,
    }),
  failedEngines);

  let customerResponseSuggestion: IntelligenceAnalysis["customerResponseSuggestion"] = null;
  if (responseContext) {
    const response = safeExec("customer-response-engine", () =>
      generateCustomerResponse(responseContext, {}),
    failedEngines);
    if (response) {
      customerResponseSuggestion = {
        responseType: response.responseType,
        audience: response.audience,
        qualityScore: response.qualityGate.score,
        canSend: response.qualityGate.canSend,
        blockingIssues: response.qualityGate.issues.filter((i) => i.severity === "block").length,
        summary: response.summary || "Respuesta sugerida automáticamente",
      };
      if (response.qualityGate.score < 60) qualityRisks.push("Respuesta cliente con score quality bajo");
      if (!response.qualityGate.canSend) qualityRisks.push("Quality gate bloquea envío");
    }
  }

  // ── 7. Knowledge curation (sólo si ticket cerrado) ────────
  let curationCandidate: IntelligenceAnalysis["curationCandidate"] = null;
  if (/resol|done|closed/i.test(ticket.status)) {
    const candidate = safeExec("knowledge-curation", () =>
      analyzeCurationCandidate({
        ticketKey: ticket.key,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        sapModule: ticket.sapModule,
        hasClosureResponse: true,
        closureQualityScore: 70,
        hasRootCauseValidated: true,
        isFirstOfItsKind: (ctx.similarPastTicketsCount ?? 0) === 0,
        similarUnresolvedCount: 0,
      }),
    failedEngines);
    if (candidate) {
      curationCandidate = {
        brilliantScore: candidate.brilliantScore,
        proposedKbTitle: candidate.proposedKbTitle,
      };
    }
  }

  // ── 8. Playbook suggestion (de ctx, no engine) ────────────
  const playbookSuggestion = ctx.playbookTitle ? {
    title: ctx.playbookTitle,
    reason: "Match por módulo SAP y tipo de incidente",
  } : null;

  // ── 9. Knowledge matches (passthrough desde ctx) ──────────
  const knowledgeMatches = {
    count: ctx.hasKnowledgeMatch ? 1 : 0,
    topTitles: [] as string[],
  };

  // ── 10. Confidence global ─────────────────────────────────
  const confidenceGlobal = confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 0;

  // ── 11. Explanation humana ────────────────────────────────
  const explanationLines: string[] = [];
  if (detectedContext.module) explanationLines.push(`Módulo SAP: ${detectedContext.module}`);
  if (detectedContext.transaction) explanationLines.push(`Transacción detectada: ${detectedContext.transaction}`);
  if (detectedContext.errorCode) explanationLines.push(`Código error: ${detectedContext.errorCode}`);
  if (estimatedResolution) explanationLines.push(`ETA: ${estimatedResolution.minHours}-${estimatedResolution.maxHours}h (${estimatedResolution.confidence}, ${estimatedResolution.source})`);
  if (nextBestAction) explanationLines.push(`Acción: ${nextBestAction.label}`);
  if (escalationRecommendation) explanationLines.push(`Escalación: ${escalationRecommendation.verdict} (urgencia ${escalationRecommendation.urgencyScore}/100)`);
  if (qualityRisks.length > 0) explanationLines.push(`Riesgos: ${qualityRisks.join("; ")}`);
  if (missingData.length > 0) explanationLines.push(`Faltan datos: ${missingData.slice(0, 3).join("; ")}${missingData.length > 3 ? "…" : ""}`);
  const explanation = explanationLines.join(" · ") || "Sin datos suficientes para explicar.";

  const result: IntelligenceAnalysis = {
    ticketId: ticket.key,
    createdAt: new Date().toISOString(),
    engineVersion: INTELLIGENCE_CORE_VERSION,
    confidenceGlobal,
    readinessScore,
    detectedContext,
    estimatedResolution,
    nextBestAction,
    escalationRecommendation,
    customerResponseSuggestion,
    playbookSuggestion,
    knowledgeMatches,
    curationCandidate,
    qualityRisks,
    missingData: Array.from(new Set(missingData)), // dedupe
    explanation,
    failedEngines,
    durationMs: Date.now() - startedAt,
  };

  cache.set(ticket.key, { ts: Date.now(), analysis: result });
  return result;
}
