// =============================================================================
// Basis / Auth Specialist — autorizaciones, performance, jobs, dumps
// =============================================================================

import type { SpecialistAnalysisInput, SpecialistAnalysisResult } from "../types";
import {
  buildHaystack, countMatches, levelFromMatches, detectGenericMissingData,
  buildBaseCustomerResponse, emptyResult,
  type SpecialistKnowledge,
} from "./_base";

export const BASIS_AUTH_KNOWLEDGE: SpecialistKnowledge = {
  specialist: "BASIS_AUTH",
  vocabulary: ["autorización", "rol", "perfil", "performance", "bloqueo", "usuario", "dump", "job", "ST22", "SU53", "SM21", "SM37"],
  transactions: ["SU53", "ST22", "SM21", "SM37"],
  sapObjects: ["rol", "perfil", "dump", "job", "lock entry"],
  commonIssues: [
    "Falta de objeto de autorización",
    "Dump runtime (MESSAGE_TYPE_X / SYSTEM_NO_SHM_MEMORY)",
    "Job cancelado por falla de RFC o memoria",
    "Bloqueo de usuario / lock entry colgada",
    "Performance degradada por work process saturado",
  ],
  requiredData: ["Usuario afectado", "Transacción / programa", "Timestamp", "SU53 captura completa", "ST22 short dump si aplica"],
  n1ChecklistRules: [
    "Pedir captura SU53 del usuario inmediatamente tras el error",
    "Identificar transacción y programa afectados",
    "Validar rol asignado vs requerido",
    "Si dump → traer ST22 completo (programa, línea, mensaje)",
    "Si job → SM37 con joblog completo",
    "Validar si afecta a 1 usuario o varios",
  ],
  n2EscalationRules: [
    "Requiere cambio de rol o perfil global",
    "Requiere intervención Basis (memoria, work processes, kernel)",
    "Bloqueo masivo / lock entries del sistema",
    "Impacto de performance generalizado",
  ],
  responseGuidelines: [
    "Pedir SU53 antes de prometer nada",
    "Coordinar con Basis antes de tocar work processes en horario operativo",
  ],
};

export function analyzeWithBasisAuthSpecialist(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  const haystack = buildHaystack(input);
  const totalMatches =
    countMatches(haystack, BASIS_AUTH_KNOWLEDGE.transactions) +
    countMatches(haystack, BASIS_AUTH_KNOWLEDGE.sapObjects) +
    countMatches(haystack, BASIS_AUTH_KNOWLEDGE.vocabulary);
  const { score, level } = levelFromMatches(totalMatches);

  let probableCause: string | undefined;
  if (haystack.includes("autorización") || haystack.includes("su53")) {
    probableCause = "Falta objeto de autorización. Pedir SU53 y mapear contra rol del usuario.";
  } else if (haystack.includes("dump") || haystack.includes("st22")) {
    probableCause = "Dump ABAP. Identificar programa + línea + tipo (MESSAGE_TYPE_X, SYSTEM_NO_SHM_MEMORY, etc.).";
  } else if (haystack.includes("performance") || haystack.includes("lento")) {
    probableCause = "Posible saturación de work processes o lock entries. Coordinar Basis.";
  } else if (haystack.includes("job") && haystack.includes("cancelad")) {
    probableCause = "Job cancelado. Revisar SM37 joblog para causa raíz.";
  }

  const diagnosis = `Caso BASIS/AUTH detectado. ${probableCause ?? "Pedir SU53/ST22 según tipo de error."}`;

  return {
    ...emptyResult("BASIS_AUTH"),
    confidenceScore: score,
    confidenceLevel: level,
    diagnosis,
    probableCause,
    n1Checklist: BASIS_AUTH_KNOWLEDGE.n1ChecklistRules,
    missingData: detectGenericMissingData(input),
    n2Criteria: BASIS_AUTH_KNOWLEDGE.n2EscalationRules,
    estimatedComplexity: "MEDIUM",
    canResolveAtN1: probableCause?.startsWith("Falta objeto de autorización") ?? false,
    customerResponseDraft: buildBaseCustomerResponse(
      input,
      "Analizamos el caso de Basis/Autorizaciones. Te pedimos compartir captura SU53 (o ST22 si hubo dump) para acelerar el diagnóstico.",
    ),
    internalNotes: `Señales BASIS/AUTH: ${totalMatches}`,
    risks: ["Cambios de rol en PRD requieren aprobación formal del owner del proceso"],
  };
}
