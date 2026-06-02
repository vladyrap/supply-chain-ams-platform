// =============================================================================
// Knowledge Auto-Curation Intelligence — types
// =============================================================================
// Detecta tickets cerrados con casos brillantes (CLOSURE + alto quality score
// + variance baja + root cause validated) y propone publicarlos como KB.
// Cierra el loop de aprendizaje del sistema.
// =============================================================================

export type CurationStatus =
  | "PROPOSED"
  | "REVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export interface CurationCandidate {
  candidateId: string;
  ticketKey: string;
  ticketTitle: string;
  sapModule?: string | null;
  issueType?: string;
  /** Score 0..100 — qué tan brillante es este caso para publicar como KB. */
  brilliantScore: number;
  /** Razones del score. */
  scoreFactors: { factor: string; weight: number; reason: string }[];
  /** Propuesta de título del KB. */
  proposedKbTitle: string;
  /** Resumen del problema (extraído del ticket). */
  problemSummary: string;
  /** Causa raíz validada. */
  rootCauseSummary: string;
  /** Solución aplicada. */
  solutionSummary: string;
  /** Validación documentada. */
  validationSummary?: string;
  /** Prevención recomendada. */
  preventionRecommendation?: string;
  /** Tags propuestos. */
  proposedTags: string[];
  status: CurationStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface CurationInput {
  ticketKey: string;
  ticketTitle: string;
  ticketDescription?: string;
  sapModule?: string | null;
  issueType?: string;

  // Señales de calidad
  hasClosureResponse?: boolean;
  closureQualityScore?: number;     // 0-100
  hasRootCauseValidated?: boolean;
  hasValidationDocumented?: boolean;
  hasPreventionDocumented?: boolean;

  // Señales de estimación
  withinBandPct?: number;            // si actualHours cayó dentro de min-max
  variancePct?: number;              // |variance| menor = mejor calibración
  estimationConfidence?: "LOW" | "MEDIUM" | "HIGH";

  // Señales históricas
  isFirstOfItsKind?: boolean;         // primer caso de este tipo
  similarUnresolvedCount?: number;    // cuántos similares aún no resueltos

  // Texto del CLOSURE
  rootCauseSummary?: string;
  solutionSummary?: string;
  validationSummary?: string;
  preventionRecommendation?: string;
}

export const CURATION_STORAGE = {
  candidates: "supply-chain-ams-curation-candidates",
} as const;
