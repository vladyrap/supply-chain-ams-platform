// =============================================================================
// _base.ts — helpers compartidos entre especialistas (sin IA externa)
// =============================================================================

import type {
  SpecialistAnalysisInput,
  SpecialistAnalysisResult,
  SAPModuleSpecialist,
} from "../types";

/** Knowledge declarativo que un especialista expone para auditoría / docs. */
export interface SpecialistKnowledge {
  specialist: SAPModuleSpecialist;
  vocabulary: string[];
  transactions: string[];
  sapObjects: string[];
  commonIssues: string[];
  requiredData: string[];
  n1ChecklistRules: string[];
  n2EscalationRules: string[];
  responseGuidelines: string[];
}

/** Construye un haystack canonical desde el input para detectar señales. */
export function buildHaystack(input: SpecialistAnalysisInput): string {
  return [
    input.title,
    input.description,
    input.module,
    input.process,
    input.transaction,
    input.errorMessage,
    input.businessImpact,
    ...(input.evidenceNotes ?? []),
  ].filter(Boolean).join(" \n ").toLowerCase();
}

/** Cuenta cuántos items del array están presentes en el haystack. */
export function countMatches(haystack: string, terms: string[]): number {
  let n = 0;
  for (const t of terms) if (haystack.includes(t.toLowerCase())) n++;
  return n;
}

/** Convierte número de matches en nivel de confianza local del especialista. */
export function levelFromMatches(
  matches: number,
  threshold: { high: number; medium: number } = { high: 4, medium: 2 },
): { score: number; level: "LOW" | "MEDIUM" | "HIGH" } {
  const score = Math.min(100, 30 + matches * 12);
  const level =
    matches >= threshold.high ? "HIGH" :
    matches >= threshold.medium ? "MEDIUM" : "LOW";
  return { score, level };
}

/** Detecta missing data básicos comunes a todos los especialistas. */
export function detectGenericMissingData(input: SpecialistAnalysisInput): string[] {
  const out: string[] = [];
  if (!input.module) out.push("Módulo SAP no declarado");
  if (!input.environment) out.push("Ambiente (DEV/QAS/PRD) no declarado");
  if (!input.errorMessage && !/error|fall|dump|abort/i.test(input.description)) {
    out.push("Mensaje SAP exacto no incluido");
  }
  if (!input.transaction && !/T\d{2,3}/i.test(input.description)) {
    out.push("Transacción afectada no declarada");
  }
  return out;
}

/** Construye un borrador de respuesta cliente neutral. */
export function buildBaseCustomerResponse(
  input: SpecialistAnalysisInput,
  diagnosisShort: string,
): string {
  const ticketRef = input.ticketKey ? ` (ticket ${input.ticketKey})` : "";
  return [
    `Hola,`,
    ``,
    `Recibimos tu caso${ticketRef} y ya está siendo analizado por el equipo AMS.`,
    ``,
    diagnosisShort,
    ``,
    `Te confirmamos próximos pasos a la brevedad.`,
    ``,
    `— Equipo AMS`,
  ].join("\n");
}

/** Resultado vacío base — los especialistas lo extienden. */
export function emptyResult(specialist: SAPModuleSpecialist): SpecialistAnalysisResult {
  return {
    specialist,
    confidenceScore: 0,
    confidenceLevel: "LOW",
    diagnosis: "",
    n1Checklist: [],
    missingData: [],
    n2Criteria: [],
    estimatedComplexity: "MEDIUM",
    canResolveAtN1: false,
    customerResponseDraft: "",
    internalNotes: "",
    risks: [],
  };
}
