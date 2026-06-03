// =============================================================================
// Consolidator — merge resultados primary + secondaries en una única vista
// =============================================================================
// Funciones puras. Deduplica, prioriza, recorta a tope manejable y arma el
// payload final que verá el TCC.
// =============================================================================

import type { SpecialistAnalysisResult, SAPModuleSpecialist } from "./types";

/** Dedup + cap N. */
function dedupCap(items: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = (raw || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

export function consolidateDiagnosis(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
): string {
  if (secondaries.length === 0) return primary.diagnosis;
  const secondaryBits = secondaries
    .map((s) => `[${s.specialist}] ${s.diagnosis}`)
    .join("\n");
  return [
    primary.diagnosis,
    "",
    "Vistas complementarias:",
    secondaryBits,
  ].join("\n");
}

export function consolidateChecklist(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
): string[] {
  return dedupCap(
    [
      ...primary.n1Checklist,
      ...secondaries.flatMap((s) => s.n1Checklist.map((c) => `(${s.specialist}) ${c}`)),
    ],
    14,
  );
}

export function consolidateMissingData(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
): string[] {
  return dedupCap(
    [...primary.missingData, ...secondaries.flatMap((s) => s.missingData)],
    10,
  );
}

export function consolidateN2Criteria(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
): string[] {
  return dedupCap(
    [
      ...primary.n2Criteria,
      ...secondaries.flatMap((s) => s.n2Criteria.map((c) => `(${s.specialist}) ${c}`)),
    ],
    10,
  );
}

/** Confianza global = peso 0.7 al primary + peso 0.3 al promedio de secondaries. */
export function computeGlobalConfidence(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
  routingScore: number,
): { score: number; level: "LOW" | "MEDIUM" | "HIGH" } {
  const secAvg = secondaries.length === 0
    ? primary.confidenceScore
    : Math.round(secondaries.reduce((s, x) => s + x.confidenceScore, 0) / secondaries.length);
  const analystScore = Math.round(primary.confidenceScore * 0.7 + secAvg * 0.3);
  // Combinar con el routing score 50/50 para que router débil baje la confianza global
  const score = Math.min(100, Math.round((analystScore + routingScore) / 2));
  const level: "LOW" | "MEDIUM" | "HIGH" =
    score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  return { score, level };
}

/** Genera Next Best Action a partir de los resultados consolidados. */
export function pickNextBestAction(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
  missingData: string[],
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH",
): string {
  if (primary.specialist === "UNKNOWN") {
    return "REQUEST_MORE_INFO · Pedir módulo, transacción y mensaje SAP exacto antes de continuar.";
  }
  if (missingData.length >= 3) {
    return `REQUEST_MORE_INFO · Faltan ${missingData.length} datos críticos. Pedir antes de actuar.`;
  }
  if (!primary.canResolveAtN1) {
    return `ESCALATE_N2 · El especialista ${primary.specialist} indica que el caso requiere N2 (${primary.estimatedComplexity}).`;
  }
  if (confidenceLevel === "LOW") {
    return "REQUEST_HUMAN_REVIEW · Confianza baja del orquestador, pedir validación de líder funcional.";
  }
  if (secondaries.length > 0) {
    return `EXECUTE_CHECKLIST_N1 · Caso cross-module (${primary.specialist} + ${secondaries.map((s) => s.specialist).join(",")}). Ejecutar checklist consolidado.`;
  }
  return `EXECUTE_CHECKLIST_N1 · Especialista ${primary.specialist} con causa probable identificada.`;
}

/** Construye el customer response final tomando el del primary y ajustando. */
export function pickCustomerResponseDraft(
  primary: SpecialistAnalysisResult,
  secondaries: SpecialistAnalysisResult[],
): string {
  if (secondaries.length === 0) return primary.customerResponseDraft;
  // Si hay cross-module, mencionar áreas involucradas pero sin abrumar al cliente.
  const modules = [primary.specialist, ...secondaries.map((s) => s.specialist)]
    .filter((m) => m !== "UNKNOWN")
    .join(", ");
  return primary.customerResponseDraft.replace(
    "Recibimos tu caso",
    `Recibimos tu caso (afecta ${modules})`,
  );
}

/** Helper para mostrar lista de specialists involucrados. */
export function listSpecialistsInvolved(
  primary: SAPModuleSpecialist,
  secondaries: SAPModuleSpecialist[],
): SAPModuleSpecialist[] {
  return [primary, ...secondaries];
}
