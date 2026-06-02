// =============================================================================
// Historical Cases Matcher
// =============================================================================
// Encuentra los N casos históricos AMS más similares a un caso nuevo.
//
// Similarity scoring (0..1):
//   - exact module match: +0.35
//   - same process: +0.10
//   - same issueType: +0.20
//   - same transaction: +0.15
//   - matching error code: +0.15
//   - matching sap objects (types of): +0.05 c/u (cap 0.10)
//   - token overlap (Jaccard): +0..0.20 según overlap
//
// Output: top N casos con similarityScore + matchedSignals (las razones del match)
// 100% determinístico. Sin LLM.
// =============================================================================

import type { DetectedSapContext } from "@/utils/sap-context-detector";
import type { SimilarHistoricalCase } from "@/types/estimation";
import {
  AMS_HISTORICAL_CASES,
  type HistoricalAmsCase,
} from "@/data/ams-estimation-history";

// ============================================================
// Tokenizer reusable (mismo que el dataset)
// ============================================================

const STOPWORDS = new Set([
  "para", "como", "este", "esta", "esto", "with", "from", "that", "the",
  "and", "los", "las", "del", "por", "con", "una", "uno", "tiene",
  "hace", "todo", "todos", "todas", "muy", "más", "mas",
  "pero", "esta", "esto", "que", "qué", "esa", "ese", "eso",
  "donde", "cuando", "ahora", "antes", "después", "despues",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9_/]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ============================================================
// Scoring entre un caso histórico y el contexto detectado
// ============================================================

interface ScoredCase {
  case: HistoricalAmsCase;
  score: number;
  matchedSignals: string[];
}

function scoreCase(
  hc: HistoricalAmsCase,
  ctx: DetectedSapContext,
  ctxTokens: Set<string>,
): ScoredCase {
  let score = 0;
  const signals: string[] = [];

  // Módulo (peso fuerte)
  if (ctx.module === hc.module) {
    score += 0.35;
    signals.push(`mismo módulo (${hc.module})`);
  }

  // Proceso
  if (ctx.process === hc.process) {
    score += 0.10;
    signals.push(`mismo proceso (${hc.process})`);
  }

  // Sub-proceso
  if (ctx.subProcess && hc.subProcess && ctx.subProcess === hc.subProcess) {
    score += 0.05;
    signals.push(`mismo sub-proceso (${hc.subProcess})`);
  }

  // Issue type
  if (ctx.issueType === hc.issueType) {
    score += 0.20;
    signals.push(`mismo tipo de problema (${hc.issueType.replace(/_/g, " ")})`);
  }

  // Transacción
  if (hc.transaction && ctx.transactions.includes(hc.transaction.toUpperCase())) {
    score += 0.15;
    signals.push(`transacción ${hc.transaction}`);
  }

  // Error codes — si el caso histórico tiene algún tag de error y el contexto también
  const hcErrorTags = hc.tags.filter((t) =>
    /^(m7|m8|v1|vk|vbap|qm|st22|sm|dump|timeout)/i.test(t)
  );
  for (const errTag of hcErrorTags) {
    if (ctx.errorCodes.some((ec) => ec.toLowerCase().replace(/\s/g, "").includes(errTag.toLowerCase().replace(/\s/g, "")))) {
      score += 0.15;
      signals.push(`código de error ${errTag.toUpperCase()}`);
      break;
    }
  }

  // Objetos SAP — overlap por tipo de objeto referenciado
  let objMatches = 0;
  const ctxObjKeys = Object.keys(ctx.sapObjects).filter((k) => !!(ctx.sapObjects as Record<string, unknown>)[k]);
  const hcObjKeys = Object.keys(hc.detectedObjects).filter((k) => !!(hc.detectedObjects as Record<string, unknown>)[k]);
  for (const k of ctxObjKeys) {
    if (hcObjKeys.includes(k)) objMatches++;
  }
  if (objMatches > 0) {
    const objBoost = Math.min(0.10, objMatches * 0.04);
    score += objBoost;
    signals.push(`${objMatches} tipo(s) de objeto SAP en común`);
  }

  // Token overlap (Jaccard) del título + descripción
  const hcTokens = new Set(hc.searchTokens ?? []);
  const jacc = jaccardSimilarity(ctxTokens, hcTokens);
  if (jacc > 0) {
    const tokenBoost = Math.min(0.20, jacc * 0.5);
    score += tokenBoost;
    if (jacc >= 0.10) {
      signals.push(`vocabulario similar (overlap ${(jacc * 100).toFixed(0)}%)`);
    }
  }

  // Ambiente
  if (ctx.environment !== "NO_INFORMADO" && ctx.environment === hc.environment) {
    score += 0.03;
    signals.push(`mismo ambiente (${hc.environment})`);
  }

  return { case: hc, score: Math.min(1, score), matchedSignals: signals };
}

// ============================================================
// API pública
// ============================================================

export interface FindSimilarOptions {
  topN?: number;             // default 3
  minScore?: number;         // default 0.25
  /** Si pasás texto extra (ej: el texto del caso nuevo), lo incluye en tokens */
  extraText?: string;
}

/**
 * Encuentra los casos históricos AMS más similares al contexto detectado.
 * Determinístico, escala lineal con el dataset (30 casos hoy = irrelevante).
 *
 * Devuelve top N casos con similarity >= minScore.
 */
export function findSimilarHistoricalCases(
  context: DetectedSapContext,
  options: FindSimilarOptions = {},
): SimilarHistoricalCase[] {
  const topN = options.topN ?? 3;
  const minScore = options.minScore ?? 0.25;

  const ctxTokens = tokenize(`${context.inputText} ${options.extraText ?? ""}`);
  const scored: ScoredCase[] = [];
  for (const hc of AMS_HISTORICAL_CASES) {
    const s = scoreCase(hc, context, ctxTokens);
    if (s.score >= minScore) scored.push(s);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((s) => ({
    caseId: s.case.id,
    title: s.case.title,
    module: s.case.module,
    similarityScore: +s.score.toFixed(2),
    actualResolutionHours: s.case.actualResolutionHours,
    complexity: s.case.complexity,
    rootCause: s.case.rootCause,
    solutionSummary: s.case.solutionSummary,
    matchedSignals: s.matchedSignals,
  }));
}

/**
 * Estadísticas agregadas de los casos similares (para alimentar el rango total).
 */
export function aggregateSimilarCases(cases: SimilarHistoricalCase[]) {
  if (cases.length === 0) {
    return { count: 0, minHours: 0, maxHours: 0, avgHours: 0, medianHours: 0 };
  }
  const hours = cases.map((c) => c.actualResolutionHours).sort((a, b) => a - b);
  const sum = hours.reduce((s, n) => s + n, 0);
  const median = hours.length % 2 === 0
    ? (hours[hours.length / 2 - 1] + hours[hours.length / 2]) / 2
    : hours[Math.floor(hours.length / 2)];
  return {
    count: cases.length,
    minHours: hours[0],
    maxHours: hours[hours.length - 1],
    avgHours: +(sum / hours.length).toFixed(1),
    medianHours: +median.toFixed(1),
  };
}
