// =============================================================================
// ABAP Technical Specialist — desarrollo Z, enhancements, BADIs, RAP/CDS
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const ABAP_TECHNICAL_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "ABAP_TECHNICAL",
  vocabulary: ["ABAP", "programa Z", "enhancement", "BADI", "user exit", "debug", "dump", "transporte", "desarrollo", "CDS", "OData", "RAP"],
  transactions: ["SE38", "SE80", "SE24", "SE11", "STMS"],
  sapObjects: ["programa Z", "include", "BADI", "user exit", "CDS view", "OData service", "transporte"],
  commonIssues: [
    "Programa Z con dump por cambio de estructura",
    "BADI/user exit que rompe estándar",
    "Transporte fallido (RC=8 / RC=12)",
    "OData devolviendo 500 por código Z",
    "CDS view con join que mata performance",
  ],
  requiredData: ["Nombre programa / clase / BADI", "Línea del dump", "Número de transporte", "Mensaje exacto"],
  n1ChecklistRules: [
    "Identificar objeto Z (programa / clase / CDS / BADI)",
    "Revisar ST22 / SLG1 si hay dump",
    "Validar último transporte aplicado",
    "Reproducir en DEV antes de tocar PRD",
    "Validar dependencias del objeto",
  ],
  n2EscalationRules: [
    "Requiere modificación del código Z",
    "Requiere nuevo transporte (DEV → QAS → PRD)",
    "Implica cambio de estándar SAP",
    "Impacto en otros desarrollos dependientes",
  ],
  responseGuidelines: [
    "No prometer fix sin probar en QAS",
    "Comunicar ventana de despliegue si requiere transporte",
  ],
};

export function analyzeWithABAPTechnicalSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const totalMatches =
    countMatches(haystack, ABAP_TECHNICAL_KNOWLEDGE.transactions) +
    countMatches(haystack, ABAP_TECHNICAL_KNOWLEDGE.sapObjects) +
    countMatches(haystack, ABAP_TECHNICAL_KNOWLEDGE.vocabulary);
  const { score, level } = levelFromMatches(totalMatches);

  let probableCause: string | undefined;
  if (haystack.includes("dump") && (haystack.includes("z") || haystack.includes("programa"))) {
    probableCause = "Dump en código Z. Identificar línea + causa (estructura cambiada, división por cero, etc.).";
  } else if (haystack.includes("transporte") && (haystack.includes("rc=8") || haystack.includes("rc=12") || haystack.includes("fallid"))) {
    probableCause = "Transporte con RC>=8. Revisar log de importación y dependencias.";
  } else if (haystack.includes("odata") || haystack.includes("rap")) {
    probableCause = "Issue OData/RAP. Validar servicio publicado + autorización + código Z asociado.";
  }

  const diagnosis = `Caso ABAP TECHNICAL detectado. ${probableCause ?? "Pedir nombre del objeto y mensaje exacto."}`;

  return {
    ...emptyResult("ABAP_TECHNICAL"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: ABAP_TECHNICAL_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: ABAP_TECHNICAL_KNOWLEDGE.n2EscalationRules,
    estimatedComplexity: "HIGH",
    canResolveAtN1: false, // ABAP técnico casi nunca es N1
    customerResponseDraft: buildBaseCustomerResponse(
      input,
      "Analizamos el caso técnico ABAP. Coordinaremos con desarrollo si requiere cambio de código o transporte.",
    ),
    internalNotes: `Señales ABAP: ${totalMatches}`,
    risks: ["Cualquier transporte directo a PRD sin pasar QAS rompe ciclo y trazabilidad"],
  };
}
