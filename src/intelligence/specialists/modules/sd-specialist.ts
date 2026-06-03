// =============================================================================
// SD Specialist — Ventas / Distribución
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const SD_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "SD",
  vocabulary: ["pedido de venta", "entrega", "factura", "pricing", "precio", "condición", "bloqueo", "picking", "salida de mercancía"],
  transactions: ["VA01", "VA02", "VA03", "VL01N", "VL02N", "VF01", "VK11", "VK12"],
  sapObjects: ["pedido", "entrega", "factura", "cliente", "material", "organización de ventas", "canal", "sector", "condición de precio"],
  commonIssues: [
    "Pricing no determinado o incorrecto",
    "Bloqueo de crédito en pedido",
    "Bloqueo de entrega por disponibilidad",
    "Falla en picking/packing",
    "Condición de precio no encontrada en VK11/VK12",
    "Factura no generada por copy control",
  ],
  requiredData: ["Número de pedido / entrega / factura", "Cliente", "Material", "Org ventas / canal / sector", "Mensaje SAP exacto"],
  n1ChecklistRules: [
    "Validar pedido / entrega / factura afectada",
    "Validar cliente y material involucrados",
    "Validar organización de ventas / canal / sector",
    "Validar mensaje SAP completo",
    "Validar si ocurre en un documento o varios",
    "Revisar condiciones de precio (VK13) si es pricing",
    "Confirmar si hay bloqueo de crédito (FD32)",
  ],
  n2EscalationRules: [
    "Requiere configuración de pricing / esquema de cálculo",
    "Requiere copy control entre tipos de documento",
    "Requiere desarrollo ABAP (user exit SD)",
    "Impacto en cierre comercial / facturación masiva en PRD",
  ],
  responseGuidelines: [
    "Si hay bloqueo de crédito, recomendar contacto con tesorería antes de desbloquear",
    "No prometer entrega si falta stock o data maestro",
    "Adjuntar número de pedido + cliente para trazabilidad",
  ],
};

export function analyzeWithSDSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const txMatches = countMatches(haystack, SD_KNOWLEDGE.transactions);
  const objMatches = countMatches(haystack, SD_KNOWLEDGE.sapObjects);
  const kwMatches = countMatches(haystack, SD_KNOWLEDGE.vocabulary);
  const totalMatches = txMatches + objMatches + kwMatches;
  const { score, level } = levelFromMatches(totalMatches);

  const detectedTx = SD_KNOWLEDGE.transactions.filter((t) => haystack.includes(t.toLowerCase()));
  const tx = detectedTx[0] || (input.transaction || "").toUpperCase();

  let probableCause: string | undefined;
  if (haystack.includes("pricing") || haystack.includes("precio") || haystack.includes("condición")) {
    probableCause = "Pricing no determinado correctamente. Revisar VK13 / esquema de cálculo / fechas de validez.";
  } else if (haystack.includes("bloqueo") && haystack.includes("crédito")) {
    probableCause = "Bloqueo de crédito. Coordinar con tesorería (FD32 / FBL5N).";
  } else if (haystack.includes("entrega") && (haystack.includes("picking") || haystack.includes("packing"))) {
    probableCause = "Falla en picking/packing. Validar ubicaciones de stock y WM/EWM.";
  } else if (haystack.includes("factura") && haystack.includes("vf")) {
    probableCause = "Factura no generada. Validar copy control y status de la entrega.";
  }

  const diagnosis = tx
    ? `Caso SD detectado sobre transacción ${tx}. ${probableCause ?? "Pedir mensaje SAP exacto + documento afectado antes de actuar."}`
    : "Caso SD detectado por vocabulario. Pedir transacción + número de documento.";

  const customerResponseDraft = buildBaseCustomerResponse(
    input,
    `Analizamos el caso del módulo SD${tx ? ` sobre ${tx}` : ""}. ` +
    `Validamos ${probableCause ? "la hipótesis identificada" : "datos maestros y mensaje SAP"} para confirmar la causa.`,
  );

  return {
    ...emptyResult("SD"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: SD_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: SD_KNOWLEDGE.n2EscalationRules,
    suggestedPlaybook: probableCause?.includes("Pricing") ? "Playbook Pricing SD" : undefined,
    estimatedComplexity: probableCause ? "LOW" : "MEDIUM",
    canResolveAtN1: !!probableCause && level !== "LOW",
    customerResponseDraft,
    internalNotes:
      `Señales SD: ${totalMatches} (tx=${txMatches}, obj=${objMatches}, vocab=${kwMatches}).`,
    risks: probableCause
      ? ["Si afecta facturación del día, coordinar antes de tocar maestros"]
      : ["Sin causa raíz clara — riesgo de probar en pedido productivo"],
  };
}
