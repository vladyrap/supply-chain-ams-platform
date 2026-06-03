// =============================================================================
// PP/MRP Specialist — Producción y planificación
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const PP_MRP_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "PP_MRP",
  vocabulary: ["MRP", "orden previsional", "planificación", "demanda", "BOM", "lista de materiales", "hoja de ruta", "orden de fabricación"],
  transactions: ["MD01", "MD02", "MD04"],
  sapObjects: ["BOM", "hoja de ruta", "orden previsional", "orden de fabricación", "demanda independiente"],
  commonIssues: [
    "Corrida MRP no genera órdenes esperadas",
    "BOM desactualizada o sin uso correcto",
    "Hoja de ruta sin componentes",
    "Demanda mal cargada (PIR)",
    "Stock de seguridad mal parametrizado",
  ],
  requiredData: ["Material", "Centro", "Versión BOM / hoja de ruta", "Tipo de MRP (PD/MO/etc.)"],
  n1ChecklistRules: [
    "Validar material + centro de la corrida",
    "Verificar tipo de MRP del material (MARC)",
    "Revisar MD04 para entender stock/demanda",
    "Validar BOM y hoja de ruta activas",
    "Validar parámetros de planificación (tamaño de lote, stock seguridad)",
    "Reproducir corrida en QAS si es posible",
  ],
  n2EscalationRules: [
    "Customizing de MRP / tipos de planificación",
    "Desarrollo BADI BAdI_MD_PIR / BAdI_MD_MRP_RUN",
    "Impacto masivo en plan de producción",
  ],
  responseGuidelines: [
    "No correr MD01 en PRD sin coordinación con planificación",
  ],
};

export function analyzeWithPPMRPSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const totalMatches =
    countMatches(haystack, PP_MRP_KNOWLEDGE.transactions) +
    countMatches(haystack, PP_MRP_KNOWLEDGE.sapObjects) +
    countMatches(haystack, PP_MRP_KNOWLEDGE.vocabulary);
  const { score, level } = levelFromMatches(totalMatches);

  let probableCause: string | undefined;
  if (haystack.includes("mrp") && (haystack.includes("no genera") || haystack.includes("no se generan"))) {
    probableCause = "MRP no genera órdenes esperadas. Validar tipo MRP, demanda y stock.";
  } else if (haystack.includes("bom") || haystack.includes("lista de materiales")) {
    probableCause = "Problema en BOM. Validar uso, alternativa y vigencia.";
  }

  const diagnosis = `Caso PP/MRP detectado. ${probableCause ?? "Validar material + centro + MD04 antes de actuar."}`;

  return {
    ...emptyResult("PP_MRP"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: PP_MRP_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: PP_MRP_KNOWLEDGE.n2EscalationRules,
    estimatedComplexity: "MEDIUM",
    canResolveAtN1: false, // PP típicamente requiere coordinación con planificación
    customerResponseDraft: buildBaseCustomerResponse(
      input,
      "Analizamos el caso del módulo PP/MRP. Estamos validando maestros (BOM, hoja de ruta) y la corrida afectada.",
    ),
    internalNotes: `Señales PP/MRP: ${totalMatches}`,
    risks: ["Cualquier corrida MD01 en PRD debe coordinarse con planificación industrial"],
  };
}
