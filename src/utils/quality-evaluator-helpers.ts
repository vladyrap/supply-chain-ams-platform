// =============================================================================
// Quality Evaluator helpers
// =============================================================================
// Helpers puros (sin React) para resumir y deduplicar evaluaciones del agente.
// Usados por la card Quality del Ticket Command Center para evitar renderizar
// 1000 filas idénticas cuando el demo seed se ejecutó muchas veces.
// =============================================================================

import type { AgentEvaluation, HallucinationRiskLevel } from "@/types/ams-modules";

export interface QualityEvaluatorSummary {
  totalCount: number;
  averageScore: number;          // 0..5
  averagePrecision: number;       // 0..5
  averageUtility: number;
  averageClarity: number;
  averageCompleteness: number;
  dominantRisk: HallucinationRiskLevel | null;
  riskDistribution: Record<HallucinationRiskLevel, number>;
  latestEvaluations: AgentEvaluation[];
  /** Sólo informativo: cuántas se identificaron como duplicadas. */
  duplicatesFound: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Genera un resumen agregado de evaluaciones — preparado para mostrar score
 * promedio, riesgo dominante y últimas N evaluaciones SIN renderizar el array
 * completo.
 *
 * `limitLatest` controla cuántas evaluaciones más recientes se devuelven en
 * `latestEvaluations`. Default 3 (vista compacta).
 */
export function getQualityEvaluatorSummary(
  evaluations: AgentEvaluation[],
  limitLatest = 3,
): QualityEvaluatorSummary {
  if (evaluations.length === 0) {
    return {
      totalCount: 0,
      averageScore: 0,
      averagePrecision: 0,
      averageUtility: 0,
      averageClarity: 0,
      averageCompleteness: 0,
      dominantRisk: null,
      riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
      latestEvaluations: [],
      duplicatesFound: 0,
    };
  }

  const n = evaluations.length;
  let sumAcc = 0, sumUse = 0, sumCla = 0, sumCom = 0;
  const risk: Record<HallucinationRiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  for (const e of evaluations) {
    sumAcc += e.accuracyScore;
    sumUse += e.usefulnessScore;
    sumCla += e.clarityScore;
    sumCom += e.completenessScore;
    risk[e.hallucinationRisk] = (risk[e.hallucinationRisk] ?? 0) + 1;
  }

  const avgAcc = round1(sumAcc / n);
  const avgUse = round1(sumUse / n);
  const avgCla = round1(sumCla / n);
  const avgCom = round1(sumCom / n);
  const avgOverall = round1((sumAcc + sumUse + sumCla + sumCom) / (n * 4));

  // Riesgo dominante = el que más se repite
  const dominantRisk = (Object.entries(risk) as [HallucinationRiskLevel, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Últimas N por createdAt desc
  const latest = [...evaluations]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, Math.max(1, limitLatest));

  // Duplicados informativos: agrupados por fingerprint
  const seen = new Set<string>();
  let dupes = 0;
  for (const e of evaluations) {
    const fp = fingerprintEvaluation(e);
    if (seen.has(fp)) dupes++;
    else seen.add(fp);
  }

  return {
    totalCount: n,
    averageScore: avgOverall,
    averagePrecision: avgAcc,
    averageUtility: avgUse,
    averageClarity: avgCla,
    averageCompleteness: avgCom,
    dominantRisk,
    riskDistribution: risk,
    latestEvaluations: latest,
    duplicatesFound: dupes,
  };
}

/**
 * Devuelve las primeras N evaluaciones visibles (las más recientes).
 * Default 3, expand a 20. NUNCA devuelve más de 20.
 */
export function getVisibleQualityEvaluations(
  evaluations: AgentEvaluation[],
  limit = 3,
): AgentEvaluation[] {
  const safe = Math.min(Math.max(1, limit), 20);
  return [...evaluations]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, safe);
}

/**
 * Fingerprint para detectar duplicados exactos. Si dos evaluaciones tienen
 * el mismo incidentId + mismos 4 scores + mismo riesgo + mismo evaluator,
 * son duplicados (típicamente generados por demo seed corrido varias veces).
 *
 * NO usa createdAt para que los duplicados generados con timestamp distinto
 * sigan siendo detectables.
 */
function fingerprintEvaluation(e: AgentEvaluation): string {
  return [
    e.incidentId ?? "",
    e.accuracyScore,
    e.usefulnessScore,
    e.clarityScore,
    e.completenessScore,
    e.hallucinationRisk,
    e.technicalLevelFit,
    e.evaluator ?? "",
  ].join("|");
}

/**
 * Deduplica evaluaciones. Criterio:
 *   1. Por `id` si existe (típico de evaluaciones reales).
 *   2. Por fingerprint (mismo contenido + mismo evaluator) como fallback,
 *      ÚTIL para casos demo donde se generaron 1000 evaluaciones iguales.
 *
 * Conserva la más reciente (mayor `createdAt`) de cada grupo duplicado.
 * NO modifica el array original — devuelve uno nuevo.
 */
export function dedupeQualityEvaluations(evaluations: AgentEvaluation[]): {
  unique: AgentEvaluation[];
  removed: number;
} {
  if (evaluations.length === 0) return { unique: [], removed: 0 };

  // Ordenar desc por createdAt para que el primero de cada grupo sea el más reciente
  const sorted = [...evaluations].sort(
    (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const unique: AgentEvaluation[] = [];

  for (const e of sorted) {
    // 1) Dedupe por id
    if (e.id) {
      if (seenIds.has(e.id)) continue;
      seenIds.add(e.id);
    }
    // 2) Dedupe por fingerprint de contenido
    const fp = fingerprintEvaluation(e);
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);

    unique.push(e);
  }

  // Restaurar orden original (desc por createdAt) — ya está
  return { unique, removed: evaluations.length - unique.length };
}
