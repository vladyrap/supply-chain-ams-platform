// =============================================================================
// Knowledge Auto-Curation Intelligence — engine
// =============================================================================
// Evalúa un ticket cerrado y propone si conviene publicarlo como KB con
// brilliantScore 0..100. Determinístico.
//
// Factores:
//   + Closure response generada (quality score)
//   + Root cause validated
//   + Validación documentada
//   + Prevention documentada
//   + Within-band de estimación
//   + Primer caso de su tipo (novelty)
//   + Casos similares sin resolver (utilidad)
// =============================================================================

import type {
  CurationCandidate, CurationInput, CurationStatus,
} from "@/types/knowledge-curation";

export const CURATION_ENGINE_VERSION = "0.1.0-curation";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

interface ScoreFactor {
  factor: string;
  weight: number;
  reason: string;
}

// ============================================================
// Scoring
// ============================================================

function scoreCandidate(input: CurationInput): { score: number; factors: ScoreFactor[] } {
  const factors: ScoreFactor[] = [];
  let score = 0;

  // 1. Closure response existente
  if (input.hasClosureResponse) {
    const qs = input.closureQualityScore ?? 50;
    const contribution = Math.round((qs / 100) * 20); // hasta +20
    score += contribution;
    factors.push({
      factor: "Closure response generada",
      weight: contribution,
      reason: `Quality score ${qs}/100 del closure cliente.`,
    });
  }

  // 2. Root cause validated
  if (input.hasRootCauseValidated && input.rootCauseSummary && input.rootCauseSummary.length > 30) {
    score += 25;
    factors.push({
      factor: "Causa raíz validada y documentada",
      weight: 25,
      reason: "Tiene rootCauseSummary completo + validated=true.",
    });
  }

  // 3. Validation documented
  if (input.hasValidationDocumented && input.validationSummary && input.validationSummary.length > 30) {
    score += 15;
    factors.push({
      factor: "Validación documentada",
      weight: 15,
      reason: "Validación con evidencia documentada.",
    });
  }

  // 4. Prevention documented
  if (input.hasPreventionDocumented && input.preventionRecommendation) {
    score += 10;
    factors.push({
      factor: "Recomendación preventiva",
      weight: 10,
      reason: "Solución previene recurrencia futura.",
    });
  }

  // 5. Within-band de estimación (calibración)
  if ((input.withinBandPct ?? 0) >= 80) {
    score += 8;
    factors.push({
      factor: "Estimación dentro de banda",
      weight: 8,
      reason: `Estimación calibrada (${input.withinBandPct}% within-band).`,
    });
  } else if (input.variancePct != null && Math.abs(input.variancePct) <= 20) {
    score += 5;
    factors.push({
      factor: "Variance baja",
      weight: 5,
      reason: `Desviación de estimación |${input.variancePct}%| <= 20%.`,
    });
  }

  // 6. Novelty: primer caso de su tipo
  if (input.isFirstOfItsKind) {
    score += 12;
    factors.push({
      factor: "Primer caso de su tipo",
      weight: 12,
      reason: "No hay KB previa para este escenario.",
    });
  }

  // 7. Utilidad: muchos similares sin resolver
  if ((input.similarUnresolvedCount ?? 0) >= 2) {
    score += 10;
    factors.push({
      factor: "Casos similares pendientes",
      weight: 10,
      reason: `${input.similarUnresolvedCount} casos similares sin resolver — KB ayudará a otros.`,
    });
  }

  return { score: Math.min(100, Math.round(score)), factors };
}

// ============================================================
// Tags suggester
// ============================================================

function suggestTags(input: CurationInput): string[] {
  const tags = new Set<string>();
  if (input.sapModule) tags.add(input.sapModule.toLowerCase());
  if (input.issueType) tags.add(input.issueType.toLowerCase().replace(/_/g, "-"));

  // Detectar tags desde el texto
  const text = `${input.ticketTitle ?? ""} ${input.rootCauseSummary ?? ""} ${input.solutionSummary ?? ""}`.toLowerCase();
  const knownTags = [
    "migo", "miro", "me21n", "me22n", "va01", "va02", "vl01n", "vf01",
    "md01", "md04", "we02", "bd87", "su53", "pfcg", "st22", "sm37",
    "customizing", "master-data", "pricing", "stock", "delivery",
    "performance", "authorization", "idoc", "interface", "abap", "transport",
  ];
  for (const tag of knownTags) {
    if (text.includes(tag.replace("-", " ")) || text.includes(tag)) {
      tags.add(tag);
    }
  }
  return Array.from(tags).slice(0, 10);
}

// ============================================================
// Title suggester
// ============================================================

function suggestKbTitle(input: CurationInput): string {
  const mod = input.sapModule ?? "AMS";
  // Heurística simple: "{módulo}: {título sin clave} — resolución"
  const title = input.ticketTitle
    .replace(/^\[?[A-Z]+-\d+\]?\s*[:·-]\s*/i, "")
    .slice(0, 80);
  return `${mod}: ${title} — resolución`;
}

// ============================================================
// API
// ============================================================

const MIN_SCORE_TO_PROPOSE = 60;

export function analyzeCurationCandidate(input: CurationInput): CurationCandidate | null {
  // Pre-requisitos básicos
  if (!input.hasClosureResponse && !input.hasRootCauseValidated) return null;
  if (!input.rootCauseSummary && !input.solutionSummary) return null;

  const { score, factors } = scoreCandidate(input);
  if (score < MIN_SCORE_TO_PROPOSE) return null;

  return {
    candidateId: uid("kc"),
    ticketKey: input.ticketKey,
    ticketTitle: input.ticketTitle,
    sapModule: input.sapModule ?? null,
    issueType: input.issueType,
    brilliantScore: score,
    scoreFactors: factors,
    proposedKbTitle: suggestKbTitle(input),
    problemSummary: (input.ticketDescription ?? input.ticketTitle).slice(0, 400),
    rootCauseSummary: input.rootCauseSummary ?? "",
    solutionSummary: input.solutionSummary ?? "",
    validationSummary: input.validationSummary,
    preventionRecommendation: input.preventionRecommendation,
    proposedTags: suggestTags(input),
    status: "PROPOSED" as CurationStatus,
    createdAt: now(),
  };
}
