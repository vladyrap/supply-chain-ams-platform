// =============================================================================
// FI Cross Specialist — contabilización cross-módulo
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const FI_CROSS_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "FI_CROSS",
  vocabulary: ["contabilización", "documento contable", "sociedad", "cuenta", "centro de costo", "imputación", "FI", "CO"],
  transactions: ["FB03", "FB50", "FAGLB03", "FBL3N"],
  sapObjects: ["documento contable", "sociedad", "cuenta contable", "centro de costo", "elemento PEP", "área CO"],
  commonIssues: [
    "Contabilización no se genera al recibir/facturar",
    "Cuenta determinada incorrecta (OBYC / VKOA)",
    "Imputación CO faltante",
    "Diferencia entre FI y módulo origen (MM/SD)",
    "Documento sin liberación",
  ],
  requiredData: ["Sociedad", "Documento origen + fecha", "Cuenta esperada vs encontrada", "Mensaje SAP"],
  n1ChecklistRules: [
    "Identificar sociedad y ejercicio",
    "Trazar documento contable desde el origen (MIGO/MIRO/VF01)",
    "Validar determinación de cuentas (OBYC para MM, VKOA para SD)",
    "Validar imputación CO si aplica (CO-PA, centro de costo)",
    "Validar libros y períodos abiertos",
  ],
  n2EscalationRules: [
    "Requiere cambio en determinación de cuentas",
    "Requiere coordinación con FI/CO/CO-PA",
    "Impacto en cierre contable",
    "Diferencia masiva entre módulos",
  ],
  responseGuidelines: [
    "Coordinar con finanzas antes de tocar determinación de cuentas",
    "Confirmar período abierto antes de proponer reproceso",
  ],
};

export function analyzeWithFICrossSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const totalMatches =
    countMatches(haystack, FI_CROSS_KNOWLEDGE.transactions) +
    countMatches(haystack, FI_CROSS_KNOWLEDGE.sapObjects) +
    countMatches(haystack, FI_CROSS_KNOWLEDGE.vocabulary);
  const { score, level } = levelFromMatches(totalMatches);

  let probableCause: string | undefined;
  if (haystack.includes("cuenta") && (haystack.includes("incorrect") || haystack.includes("error"))) {
    probableCause = "Determinación de cuentas. Revisar OBYC (MM) / VKOA (SD) / FAGLL03.";
  } else if (haystack.includes("imputación") || haystack.includes("centro de costo")) {
    probableCause = "Imputación CO faltante. Validar derivación y reglas de sustitución.";
  } else if (haystack.includes("período") && haystack.includes("cerrad")) {
    probableCause = "Período cerrado. Coordinar reapertura controlada con finanzas.";
  }

  const diagnosis = `Caso FI CROSS detectado. ${probableCause ?? "Pedir documento origen + sociedad + cuenta esperada."}`;

  return {
    ...emptyResult("FI_CROSS"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: FI_CROSS_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: FI_CROSS_KNOWLEDGE.n2EscalationRules,
    estimatedComplexity: "MEDIUM",
    canResolveAtN1: false, // FI casi siempre requiere validar con finanzas
    customerResponseDraft: buildBaseCustomerResponse(
      input,
      "Analizamos el caso de contabilidad cruzada. Coordinamos con FI/CO para validar determinación de cuentas e imputación.",
    ),
    internalNotes: `Señales FI_CROSS: ${totalMatches}`,
    risks: ["Cualquier ajuste en período cerrado requiere aprobación contable formal"],
  };
}
