// =============================================================================
// AMS Orchestrator — único entry point para análisis especialista
// =============================================================================
// El usuario sigue viendo "Agente AMS". Internamente:
//   1. Specialist Router decide primary + secondaries
//   2. Cada especialista corre su análisis determinístico
//   3. Consolidator merge los resultados en un único OrchestratedAMSAnalysis
//   4. Calcula confianza global, NBA, customer response y requiresHumanReview
//
// No llama IA externa. Es ms-range y reusable.
// =============================================================================

import type {
  SpecialistAnalysisInput,
  SpecialistAnalysisResult,
  OrchestratedAMSAnalysis,
} from "./specialists/types";
import { routeToSpecialist } from "./specialists/specialist-router";
import { runSpecialist } from "./specialists/index";
import {
  consolidateDiagnosis,
  consolidateChecklist,
  consolidateMissingData,
  consolidateN2Criteria,
  computeGlobalConfidence,
  pickNextBestAction,
  pickCustomerResponseDraft,
} from "./specialists/consolidator";

/** Genera un analysisId determinístico-ish (basta para idempotencia simple). */
function genAnalysisId(input: SpecialistAnalysisInput): string {
  const seed = `${input.ticketKey ?? "no-key"}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `ams-${seed}`;
}

export interface OrchestratorOptions {
  /** Si true, corre también los secondaries. Default true. */
  runSecondaries?: boolean;
  /** Cap de secondaries a ejecutar. Default 2. */
  maxSecondaries?: number;
}

/**
 * Entry point único. Devuelve siempre un análisis (nunca throw — los errores
 * caen como UNKNOWN/risks). El caller (pipeline AIE) lo embebe en
 * `ticket.intelligence.specialistAnalysis`.
 */
export function orchestrateAMSAnalysis(
  input: SpecialistAnalysisInput,
  opts: OrchestratorOptions = {},
): OrchestratedAMSAnalysis {
  const { runSecondaries = true, maxSecondaries = 2 } = opts;
  const auditEvents: string[] = [];

  // 1. Routing
  auditEvents.push("AMS_SPECIALIST_ROUTING_STARTED");
  const routing = routeToSpecialist(input);
  auditEvents.push("AMS_SPECIALIST_ROUTING_COMPLETED");

  // 2. Primary
  auditEvents.push("AMS_SPECIALIST_ANALYSIS_STARTED");
  let primaryAnalysis: SpecialistAnalysisResult;
  try {
    primaryAnalysis = runSpecialist(routing.primarySpecialist, input);
    auditEvents.push("AMS_SPECIALIST_ANALYSIS_COMPLETED");
  } catch (err) {
    auditEvents.push("AMS_SPECIALIST_ANALYSIS_FAILED");
    primaryAnalysis = {
      specialist: routing.primarySpecialist,
      confidenceScore: 0,
      confidenceLevel: "LOW",
      diagnosis: `Especialista falló: ${(err as Error).message}`,
      n1Checklist: [],
      missingData: [],
      n2Criteria: [],
      estimatedComplexity: "MEDIUM",
      canResolveAtN1: false,
      customerResponseDraft: "",
      internalNotes: "Specialist threw — revisar logs.",
      risks: ["Análisis incompleto"],
    };
  }

  // 3. Secondaries
  let secondaryAnalyses: SpecialistAnalysisResult[] = [];
  if (runSecondaries && routing.secondarySpecialists.length > 0) {
    const toRun = routing.secondarySpecialists.slice(0, maxSecondaries);
    secondaryAnalyses = toRun.map((sp) => {
      try {
        return runSpecialist(sp, input);
      } catch {
        return {
          specialist: sp,
          confidenceScore: 0,
          confidenceLevel: "LOW",
          diagnosis: "Especialista secundario falló silenciosamente.",
          n1Checklist: [],
          missingData: [],
          n2Criteria: [],
          estimatedComplexity: "MEDIUM",
          canResolveAtN1: false,
          customerResponseDraft: "",
          internalNotes: "",
          risks: [],
        } as SpecialistAnalysisResult;
      }
    });
  }

  // 4. Consolidación
  const consolidatedDiagnosis = consolidateDiagnosis(primaryAnalysis, secondaryAnalyses);
  const consolidatedN1Checklist = consolidateChecklist(primaryAnalysis, secondaryAnalyses);
  const consolidatedMissingData = consolidateMissingData(primaryAnalysis, secondaryAnalyses);
  const consolidatedN2Criteria = consolidateN2Criteria(primaryAnalysis, secondaryAnalyses);

  // 5. Confianza global
  const { score: globalConfidence, level: globalLevel } = computeGlobalConfidence(
    primaryAnalysis,
    secondaryAnalyses,
    routing.confidenceScore,
  );

  // 6. NBA + customer response
  const nextBestAction = pickNextBestAction(
    primaryAnalysis,
    secondaryAnalyses,
    consolidatedMissingData,
    globalLevel,
  );
  const customerResponseDraft = pickCustomerResponseDraft(primaryAnalysis, secondaryAnalyses);

  // 7. Human review
  const requiresHumanReview =
    routing.needsHumanReview ||
    globalLevel === "LOW" ||
    !!(input.priority?.toLowerCase().includes("high") && globalLevel !== "HIGH");

  auditEvents.push("AMS_ORCHESTRATOR_ANALYSIS_COMPLETED");

  return {
    analysisId: genAnalysisId(input),
    createdAt: new Date().toISOString(),
    ticketKey: input.ticketKey,
    routing,
    primaryAnalysis,
    secondaryAnalyses,
    consolidatedDiagnosis,
    consolidatedN1Checklist,
    consolidatedMissingData,
    consolidatedN2Criteria,
    nextBestAction,
    customerResponseDraft,
    confidenceScore: globalConfidence,
    confidenceLevel: globalLevel,
    requiresHumanReview,
    auditEvents,
  };
}

// Re-exports útiles para consumidores
export type { OrchestratedAMSAnalysis, SpecialistAnalysisInput, SpecialistAnalysisResult };
export { routeToSpecialist };
