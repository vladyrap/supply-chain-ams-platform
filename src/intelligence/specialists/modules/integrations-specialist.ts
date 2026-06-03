// =============================================================================
// Integrations Specialist — IDoc, CPI/PI/PO, API, OData, RFC
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const INTEGRATIONS_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "INTEGRATIONS",
  vocabulary: ["IDoc", "CPI", "PI", "PO", "API", "REST", "OData", "RFC", "payload", "middleware", "timeout", "error 500", "integración", "interfaz"],
  transactions: ["WE02", "WE05", "BD87", "SXMB_MONI"],
  sapObjects: ["IDoc", "interfaz", "payload", "sistema origen", "sistema destino", "API", "RFC", "OData"],
  commonIssues: [
    "IDoc en estado 51/64/69 sin reproceso",
    "Mapping de campos roto",
    "Timeout entre SAP y middleware",
    "Certificado/credenciales caducadas",
    "Payload con tipos incompatibles",
  ],
  requiredData: ["Sistema origen + destino", "ID interfaz / IDoc number", "Timestamp del error", "Mensaje exacto", "Payload (sanitizado)"],
  n1ChecklistRules: [
    "Identificar sistema origen y destino",
    "Identificar IDoc / interfaz afectada",
    "Validar timestamp y frecuencia del error",
    "Validar mensaje exacto en el monitor (WE05 / SXMB_MONI / CPI)",
    "Reprocesar IDoc si la causa raíz está clara (BD87)",
    "Validar disponibilidad del sistema destino",
  ],
  n2EscalationRules: [
    "Requiere cambio en mapping CPI/PI/PO",
    "Requiere desarrollo de proxy o RFC",
    "Problema de certificado / red / firewall",
    "Volumen masivo de IDocs en error (>500)",
  ],
  responseGuidelines: [
    "No prometer reproceso si el sistema destino está caído",
    "Mencionar tiempo de retención del payload por compliance",
  ],
};

export function analyzeWithIntegrationsSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const totalMatches =
    countMatches(haystack, INTEGRATIONS_KNOWLEDGE.transactions) +
    countMatches(haystack, INTEGRATIONS_KNOWLEDGE.sapObjects) +
    countMatches(haystack, INTEGRATIONS_KNOWLEDGE.vocabulary);
  const { score, level } = levelFromMatches(totalMatches);

  let probableCause: string | undefined;
  if (haystack.includes("timeout")) {
    probableCause = "Timeout entre SAP y middleware. Validar red, disponibilidad del destino y SLAs configurados.";
  } else if (haystack.includes("idoc") && (haystack.includes("51") || haystack.includes("64") || haystack.includes("69"))) {
    probableCause = "IDoc con error funcional. Validar mapping y reprocesar con BD87 si la data es correcta.";
  } else if (/error\s*5\d{2}/i.test(haystack) || /http\s*5\d{2}/i.test(haystack)) {
    probableCause = "Error 5xx del destino. Coordinar con equipo del sistema destino antes de reprocesar.";
  } else if (haystack.includes("certificado") || haystack.includes("ssl")) {
    probableCause = "Posible problema de certificado / SSL. Coordinar con Basis.";
  }

  const diagnosis = `Caso INTEGRATIONS detectado. ${probableCause ?? "Pedir sistema origen/destino + payload sanitizado + timestamp."}`;

  return {
    ...emptyResult("INTEGRATIONS"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: INTEGRATIONS_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: INTEGRATIONS_KNOWLEDGE.n2EscalationRules,
    estimatedComplexity: probableCause ? "MEDIUM" : "HIGH",
    canResolveAtN1: probableCause?.startsWith("IDoc con error funcional") ?? false,
    customerResponseDraft: buildBaseCustomerResponse(
      input,
      "Analizamos el caso de integraciones. Estamos validando el monitor de interfaces y la disponibilidad del sistema destino.",
    ),
    internalNotes: `Señales INTEGRATIONS: ${totalMatches}`,
    risks: ["Reprocesar IDocs sin validar destino puede duplicar documentos en el sistema receptor"],
  };
}
