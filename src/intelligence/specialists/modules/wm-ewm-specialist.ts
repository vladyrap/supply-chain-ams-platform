// =============================================================================
// WM/EWM Specialist — Almacén estándar + Extended Warehouse
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult, SAPModuleSpecialist } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const WM_EWM_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "WM",
  vocabulary: ["warehouse", "ubicación", "transferencia", "picking", "packing", "WM", "EWM", "cola", "monitor EWM", "handling unit", "HU"],
  transactions: ["LT03", "LT12", "VL06"],
  sapObjects: ["ubicación", "transferencia", "HU", "monitor EWM", "cola"],
  commonIssues: [
    "Orden de transporte (TO) no creada",
    "Ubicación bloqueada o sin stock",
    "Cola EWM caída / detenida",
    "Handling Unit con error",
    "Picking confirmado parcialmente",
  ],
  requiredData: ["Almacén", "Ubicación origen/destino", "Material", "Número de TO o HU", "Mensaje exacto del monitor"],
  n1ChecklistRules: [
    "Identificar almacén y tipo (WM clásico vs EWM)",
    "Validar TO o tarea de almacén afectada",
    "Validar ubicación origen y destino",
    "Validar HU y status (si EWM)",
    "Revisar cola/monitor EWM por errores acumulados",
    "Confirmar si afecta una HU o el almacén completo",
  ],
  n2EscalationRules: [
    "Cola EWM caída requiere Basis o equipo EWM",
    "Customizing de tipos de almacén / estrategias de put-away/picking",
    "Desarrollo MFS / RF",
    "Impacto en operación logística productiva",
  ],
  responseGuidelines: [
    "Coordinar con líder de turno antes de tocar cola EWM",
    "No prometer reproceso de HU sin validar status",
  ],
};

/** Decide si el caso es WM clásico o EWM por las señales. */
function decideSpecialist(haystack: string): SAPModuleSpecialist {
  if (haystack.includes("ewm") || haystack.includes("monitor ewm") || haystack.includes("hu ") || haystack.includes("handling unit")) {
    return "EWM";
  }
  return "WM";
}

export function analyzeWithWMEWMSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const spec = decideSpecialist(haystack);
  const txMatches = countMatches(haystack, WM_EWM_KNOWLEDGE.transactions);
  const objMatches = countMatches(haystack, WM_EWM_KNOWLEDGE.sapObjects);
  const kwMatches = countMatches(haystack, WM_EWM_KNOWLEDGE.vocabulary);
  const totalMatches = txMatches + objMatches + kwMatches;
  const { score, level } = levelFromMatches(totalMatches);

  let probableCause: string | undefined;
  if (haystack.includes("cola") && spec === "EWM") {
    probableCause = "Cola EWM detenida. Validar monitor y reiniciar con Basis si está confirmado el bloqueo.";
  } else if (haystack.includes("picking") && haystack.includes("parcial")) {
    probableCause = "Picking parcial. Validar stock real en ubicación y TO origen.";
  } else if (haystack.includes("hu") || haystack.includes("handling unit")) {
    probableCause = "Problema con Handling Unit. Validar status y composición.";
  }

  const diagnosis = `Caso ${spec} detectado. ${probableCause ?? "Validar TO/HU + monitor EWM o cola antes de actuar."}`;

  const customerResponseDraft = buildBaseCustomerResponse(
    input,
    `Analizamos el caso del módulo ${spec}. ${probableCause ? "Estamos validando la hipótesis identificada." : "Revisamos cola/monitor + ubicaciones afectadas."}`,
  );

  return {
    ...emptyResult(spec),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: WM_EWM_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: WM_EWM_KNOWLEDGE.n2EscalationRules,
    estimatedComplexity: probableCause ? "MEDIUM" : "HIGH",
    canResolveAtN1: probableCause?.includes("picking") ? true : false,
    customerResponseDraft,
    internalNotes: `Señales ${spec}: ${totalMatches} (tx=${txMatches}, obj=${objMatches}, vocab=${kwMatches}).`,
    risks: ["Tocar cola EWM en horario operativo puede frenar todo el almacén"],
  };
}
