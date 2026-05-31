// Agent Readiness Engine.
// Calcula un score 0-100 de cuán "listo" está el agente para operar por
// módulo SAP, basado en cobertura de conocimiento, Q&A, casos de prueba,
// scope items y brechas.

import type { SapScopeItem, SapModule } from "@/services/scope-items.api";

export type ReadinessState = "LOW" | "MEDIUM" | "HIGH" | "READY";

export interface ReadinessInput {
  module: SapModule;
  knowledgePublishedCount: number;
  qaApprovedCount: number;
  testCasesCount: number;
  scopeItemsTotal: number;
  scopeItemsCovered: number;
  criticalGapsCount: number;
}

export interface ReadinessResult {
  module: SapModule;
  score: number;          // 0-100
  state: ReadinessState;
  breakdown: {
    knowledge: number;    // 0-35
    qa: number;           // 0-20
    tests: number;        // 0-15
    scope: number;        // 0-15
    lowGaps: number;      // 0-15
  };
  hints: string[];        // qué subir para mejorar
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function calculateModuleReadiness(input: ReadinessInput): ReadinessResult {
  // Knowledge: 0-35 con techo a 8 artículos publicados
  const knowledge = Math.round(clamp(input.knowledgePublishedCount / 8, 0, 1) * 35);
  // Q&A: 0-20 con techo a 20 pares Q&A aprobados
  const qa = Math.round(clamp(input.qaApprovedCount / 20, 0, 1) * 20);
  // Tests: 0-15 con techo a 10 casos
  const tests = Math.round(clamp(input.testCasesCount / 10, 0, 1) * 15);
  // Scope coverage: 0-15 según ratio cubiertos/total
  const scope = input.scopeItemsTotal > 0
    ? Math.round((input.scopeItemsCovered / input.scopeItemsTotal) * 15)
    : 0;
  // LowGaps: 0-15. 0 gaps = 15. 5+ gaps = 0.
  const lowGaps = Math.round(clamp(1 - input.criticalGapsCount / 5, 0, 1) * 15);

  const score = knowledge + qa + tests + scope + lowGaps;
  let state: ReadinessState = "LOW";
  if (score >= 85) state = "READY";
  else if (score >= 65) state = "HIGH";
  else if (score >= 40) state = "MEDIUM";

  const hints: string[] = [];
  if (knowledge < 20) hints.push("Publicar más artículos de KB para este módulo.");
  if (qa < 10) hints.push("Validar más Q&A aprobadas.");
  if (tests < 8) hints.push("Generar más casos de prueba.");
  if (scope < 10) hints.push("Cubrir más Scope Items con conocimiento.");
  if (lowGaps < 8) hints.push("Cerrar brechas críticas abiertas.");

  return {
    module: input.module,
    score,
    state,
    breakdown: { knowledge, qa, tests, scope, lowGaps },
    hints,
  };
}

/**
 * Calcula readiness para todos los módulos a partir de las listas globales.
 * Inputs débiles (cuando no se tiene desglose por módulo) → fallback a 0.
 */
export interface ReadinessAggregateInput {
  scopeItems: SapScopeItem[];
  // Datos por módulo (counts ya filtrados)
  perModule: Partial<Record<SapModule, {
    knowledgePublished: number;
    qaApproved: number;
    testCases: number;
    criticalGaps: number;
  }>>;
}

export function calculateAgentReadiness(input: ReadinessAggregateInput): ReadinessResult[] {
  // Agrupar scope items por módulo
  const scopeByModule = new Map<SapModule, { total: number; covered: number }>();
  for (const it of input.scopeItems) {
    const cur = scopeByModule.get(it.module) || { total: 0, covered: 0 };
    cur.total += 1;
    if (it.hasKnowledge || it.hasQa) cur.covered += 1;
    scopeByModule.set(it.module, cur);
  }

  const modules: SapModule[] = Array.from(new Set([
    ...Object.keys(input.perModule),
    ...Array.from(scopeByModule.keys()),
  ])) as SapModule[];

  return modules.map((m) => {
    const dataM = input.perModule[m] || { knowledgePublished: 0, qaApproved: 0, testCases: 0, criticalGaps: 0 };
    const sc = scopeByModule.get(m) || { total: 0, covered: 0 };
    return calculateModuleReadiness({
      module: m,
      knowledgePublishedCount: dataM.knowledgePublished,
      qaApprovedCount: dataM.qaApproved,
      testCasesCount: dataM.testCases,
      scopeItemsTotal: sc.total,
      scopeItemsCovered: sc.covered,
      criticalGapsCount: dataM.criticalGaps,
    });
  }).sort((a, b) => b.score - a.score);
}

export const READINESS_LABELS: Record<ReadinessState, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  READY: "Listo",
};

export const READINESS_COLORS: Record<ReadinessState, string> = {
  LOW: "#ef4444",
  MEDIUM: "#fbbf24",
  HIGH: "#22d3ee",
  READY: "#10b981",
};
