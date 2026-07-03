// =============================================================================
// Ticket Intelligence — Tipos (AIE v0.10)
// =============================================================================
// Espejo del backend `TicketIntelligence`. Se persiste en `tickets_demo.intelligence`
// JSONB y representa el resultado del Auto Intelligence Enrichment Pipeline.
// =============================================================================

import type { IntelligenceAnalysis } from "@/intelligence/types";
import type { N1Package } from "@/types/guided-ticket-intake";
import type { OrchestratedAMSAnalysis } from "@/intelligence/specialists/types";

export type IntelligenceStatus =
  | "pending_enrichment"
  | "enriching"
  | "enriched"
  | "enrichment_failed"
  | "enrichment_skipped";

export interface AgentClassificationResult {
  response: string;     // texto del agente Gemini (legacy /classify)
  model: string;
  confidence: string;
}

export interface TicketIntelligence {
  status: IntelligenceStatus;
  enrichedAt?: string;
  enrichedBy?: string;
  /** Hash de los campos críticos del ticket. Cambia → reanalizar. */
  inputHash?: string;
  /** Output completo de `analyzeTicket()` del Intelligence Core. */
  analysis?: IntelligenceAnalysis;
  /** Output de `buildN1Package(draft)` del N1 builder. */
  n1Package?: N1Package;
  /** Clasificación de Gemini real (opcional). */
  agentClassification?: AgentClassificationResult;
  /** AMS Specialists v0.11 — análisis del orchestrator (router + specialists). */
  specialistAnalysis?: OrchestratedAMSAnalysis;
  /** TCC v0.12 — versión incremental del análisis (incrementa cada reanalyze). */
  analysisVersion?: number;
  /** Mensaje de error si status=enrichment_failed. */
  error?: string;
}

/** Entrada del historial de análisis (TCC v0.12). */
export interface IntelligenceHistoryEntry {
  id: string;
  ticketKey: string;
  version: number;
  intelligence: TicketIntelligence;
  inputHash: string | null;
  snapshotAt: string;
  snapshotReason: string | null;
}

export const ENRICHMENT_LABELS: Record<IntelligenceStatus, string> = {
  pending_enrichment:  "Pendiente",
  enriching:           "Analizando",
  enriched:            "Enriquecido",
  enrichment_failed:   "Falló análisis",
  enrichment_skipped:  "Análisis omitido",
};

export const ENRICHMENT_ICONS: Record<IntelligenceStatus, string> = {
  pending_enrichment:  "⏸",
  enriching:           "🔄",
  enriched:            "✓",
  enrichment_failed:   "✕",
  enrichment_skipped:  "—",
};

export const ENRICHMENT_COLORS: Record<IntelligenceStatus, string> = {
  pending_enrichment:  "#64748b",
  enriching:           "#4589ff",
  enriched:            "#10b981",
  enrichment_failed:   "#fa4d56",
  enrichment_skipped:  "#94a3b8",
};
