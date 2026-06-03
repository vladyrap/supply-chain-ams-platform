// =============================================================================
// Intelligence Core — Tipos compartidos del orquestador AMS Intelligence
// =============================================================================
// El Intelligence Core (`core.ts`) coordina los engines existentes y devuelve
// un objeto unificado `IntelligenceAnalysis`. No reemplaza ningún engine —
// los agrega y orquesta.
// =============================================================================

import type { Ticket } from "@/services/tickets.api";
import type { AmsDecisionResult, AmsRecommendedAction } from "@/utils/ams-decision-engine";
import type { TicketReadinessResult } from "@/utils/ticket-readiness-engine";
import type { ContextualEstimationResult } from "@/types/estimation";
import type { CustomerResponse } from "@/types/customer-response";
import type { N2EscalationAnalysis } from "@/types/n2-escalation-intelligence";
import type { CurationCandidate } from "@/types/knowledge-curation";

// ============================================================
// Input
// ============================================================

/** Contexto adicional opcional que el Intelligence Core recibe. */
export interface IntelligenceContext {
  hasKnowledgeMatch?: boolean;
  hasPlaybook?: boolean;
  playbookTitle?: string;
  hasScopeItem?: boolean;
  scopeItemIds?: string[];
  hasErrorEvidence?: boolean;
  hasVisualEvidence?: boolean;
  hasEscalationN2?: boolean;
  escalationKey?: string;
  similarPastTicketsCount?: number;
  hasReusableResolution?: boolean;
  daysSinceLastUpdate?: number;
  isProductive?: boolean;
  actor?: string;
}

// ============================================================
// Output: análisis completo
// ============================================================

/**
 * Análisis unificado del ticket — combina todos los engines.
 * Cada campo es opcional porque cualquier engine puede fallar individualmente
 * sin romper el resto.
 */
export interface IntelligenceAnalysis {
  // ── Metadata ──
  ticketId: string;
  createdAt: string;
  engineVersion: string;

  // ── Score agregado ──
  /** Confianza global 0..100 — promedio ponderado de las confidences individuales. */
  confidenceGlobal: number;
  /** Readiness 0..100 — qué tan completo está el ticket. */
  readinessScore: number;

  // ── Detección de contexto SAP ──
  detectedContext: {
    module: string | null;
    transaction: string | null;
    errorCode: string | null;
    issueType: string | null;
  };

  // ── Estimación ──
  estimatedResolution: {
    minHours: number;
    maxHours: number;
    confidence: "LOW" | "MEDIUM" | "HIGH" | string;
    source: "ticket" | "contextual" | "none";
  } | null;

  // ── Próxima mejor acción ──
  nextBestAction: {
    action: AmsRecommendedAction | string;
    label: string;
    confidence: "LOW" | "MEDIUM" | "HIGH" | string;
    reasoning: string[];
  } | null;

  // ── Recomendación de escalación ──
  escalationRecommendation: {
    verdict: N2EscalationAnalysis["verdict"];
    urgencyScore: number;
    confidenceScore: number;
    primarySpecialistName?: string;
    slaTier?: string;
    summary: string;
  } | null;

  // ── Sugerencia de respuesta al cliente ──
  customerResponseSuggestion: {
    responseType: CustomerResponse["responseType"];
    audience: CustomerResponse["audience"];
    qualityScore: number;
    canSend: boolean;
    blockingIssues: number;
    summary: string;
  } | null;

  // ── Playbook sugerido ──
  playbookSuggestion: {
    title: string;
    matchScore?: number;
    reason?: string;
  } | null;

  // ── Matches de conocimiento ──
  knowledgeMatches: {
    count: number;
    topTitles: string[];
  };

  // ── Candidato curación (si el ticket está cerrado) ──
  curationCandidate: {
    brilliantScore: number;
    proposedKbTitle: string;
  } | null;

  // ── Quality risks detectados ──
  qualityRisks: string[];

  // ── Datos faltantes para mejorar análisis ──
  missingData: string[];

  // ── Explicación humana ──
  explanation: string;

  // ── Engines que fallaron (para debug) ──
  failedEngines: string[];

  // ── Métricas runtime ──
  durationMs: number;
}

// ============================================================
// Re-export para conveniencia
// ============================================================
export type {
  Ticket, AmsDecisionResult, TicketReadinessResult, ContextualEstimationResult,
  CustomerResponse, N2EscalationAnalysis, CurationCandidate, AmsRecommendedAction,
};
