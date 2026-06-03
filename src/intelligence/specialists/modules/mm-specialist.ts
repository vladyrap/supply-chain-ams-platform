// =============================================================================
// MM Specialist — Compras / Logística de entrada
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const MM_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "MM",
  vocabulary: ["pedido de compra", "recepción", "entrada de mercancía", "factura logística", "liberación", "estrategia de liberación"],
  transactions: ["MIGO", "MIRO", "ME21N", "ME22N", "ME23N", "ME29N"],
  sapObjects: ["OC", "posición", "material", "centro", "almacén", "proveedor", "clase de movimiento", "documento material"],
  commonIssues: [
    "Cantidad pendiente de recepción incorrecta",
    "Material no extendido al centro",
    "Almacén bloqueado para recepción",
    "Clase de movimiento incompatible",
    "Bloqueo de factura por diferencia de precio/cantidad",
    "Estrategia de liberación no encontrada",
  ],
  requiredData: ["Número de OC + posición", "Material + centro", "Almacén destino", "Mensaje SAP exacto", "Usuario afectado"],
  n1ChecklistRules: [
    "Validar mensaje SAP completo y código (Mxx / MExx)",
    "Validar OC y posición referenciadas",
    "Validar que el material esté extendido al centro",
    "Validar centro/almacén destino correctos",
    "Validar cantidad pendiente de recepción (ME23N → historial)",
    "Validar clase de movimiento (101/103/105/121/122...)",
    "Confirmar si ocurre en una OC o varias",
    "Revisar si existe playbook MIGO/MIRO publicado",
  ],
  n2EscalationRules: [
    "Requiere customizing (clases de movimiento, estrategias de liberación)",
    "Requiere desarrollo ABAP / BADI MM",
    "Impacto masivo en PRD (>10 usuarios o proceso de cierre)",
    "Diferencia FI/CO sin trazabilidad clara",
  ],
  responseGuidelines: [
    "No prometer plazo si falta validar customizing",
    "Mencionar OC + material + centro en la respuesta para contexto",
    "Sugerir reintento solo si la causa raíz está identificada",
  ],
};

export function analyzeWithMMSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const txMatches = countMatches(haystack, MM_KNOWLEDGE.transactions);
  const objMatches = countMatches(haystack, MM_KNOWLEDGE.sapObjects);
  const kwMatches = countMatches(haystack, MM_KNOWLEDGE.vocabulary);
  const totalMatches = txMatches + objMatches + kwMatches;

  const { score, level } = levelFromMatches(totalMatches);

  // Diagnóstico
  const detectedTx = MM_KNOWLEDGE.transactions.filter((t) => haystack.includes(t.toLowerCase()));
  const tx = detectedTx[0] || (input.transaction || "").toUpperCase();

  let probableCause: string | undefined;
  if (/m7\d{1,3}/i.test(haystack)) {
    probableCause = "Error M7xx — típicamente material/centro/almacén o cantidad pendiente. Validar maestros y stock.";
  } else if (haystack.includes("liberación") || haystack.includes("estrategia")) {
    probableCause = "Bloqueo por estrategia de liberación. Validar grupo de liberación y aprobadores activos.";
  } else if (haystack.includes("bloqueo") && (haystack.includes("factura") || haystack.includes("miro"))) {
    probableCause = "Bloqueo de factura logística (MIRO). Diferencia precio/cantidad o tolerancia superada.";
  }

  const diagnosis = tx
    ? `Caso MM detectado sobre transacción ${tx}. ` +
      (probableCause ?? "Revisar maestros (material/centro/almacén/proveedor) y mensaje SAP completo antes de actuar.")
    : "Caso MM detectado por vocabulario, sin transacción explícita. Pedir transacción y mensaje SAP exacto.";

  const missingData = [
    ...detectGenericMissingData(input),
    ...(haystack.includes("oc ") || haystack.includes("pedido de compra")
      ? []
      : ["Número de OC y posición afectada"]),
  ];

  const customerResponseDraft = buildBaseCustomerResponse(
    input,
    `Analizamos el caso del módulo MM${tx ? ` sobre la transacción ${tx}` : ""}. ` +
    `Estamos validando ${probableCause ? "la hipótesis identificada" : "los datos maestros y mensaje SAP"} para confirmar la causa raíz.`,
  );

  const result: SpecialistAnalysisResult = {
    ...emptyResult("MM"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: MM_KNOWLEDGE.n1ChecklistRules,
    missingData,
    n2Criteria: MM_KNOWLEDGE.n2EscalationRules,
    suggestedPlaybook: tx === "MIGO" || tx === "MIRO" ? `Playbook ${tx} estándar` : undefined,
    estimatedComplexity: probableCause ? "LOW" : "MEDIUM",
    canResolveAtN1: !!probableCause && level !== "LOW",
    customerResponseDraft,
    internalNotes:
      `Señales detectadas: ${totalMatches} (tx=${txMatches}, obj=${objMatches}, vocab=${kwMatches}). ` +
      `Recomendación: ${probableCause ? "ejecutar checklist N1 enfocado" : "pedir datos faltantes antes de actuar"}.`,
    risks: probableCause
      ? ["Si afecta cierre de mes, comunicar al usuario antes de tocar"]
      : ["Sin causa raíz clara — riesgo de probar a ciegas en PRD"],
  };

  return result;
}
