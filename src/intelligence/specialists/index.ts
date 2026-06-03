// =============================================================================
// Specialists Registry — mapeo SAPModuleSpecialist → función analizadora
// =============================================================================
// Permite al AMS Orchestrator invocar al especialista por su key sin un switch
// gigante y facilita agregar nuevos módulos en el futuro.
// =============================================================================

import type {
  SAPModuleSpecialist,
  SpecialistAnalysisInput,
  SpecialistAnalysisResult,
} from "./types";

import { analyzeWithMMSpecialist, MM_KNOWLEDGE } from "./modules/mm-specialist";
import { analyzeWithSDSpecialist, SD_KNOWLEDGE } from "./modules/sd-specialist";
import { analyzeWithWMEWMSpecialist, WM_EWM_KNOWLEDGE } from "./modules/wm-ewm-specialist";
import { analyzeWithPPMRPSpecialist, PP_MRP_KNOWLEDGE } from "./modules/pp-mrp-specialist";
import { analyzeWithIntegrationsSpecialist, INTEGRATIONS_KNOWLEDGE } from "./modules/integrations-specialist";
import { analyzeWithBasisAuthSpecialist, BASIS_AUTH_KNOWLEDGE } from "./modules/basis-auth-specialist";
import { analyzeWithABAPTechnicalSpecialist, ABAP_TECHNICAL_KNOWLEDGE } from "./modules/abap-technical-specialist";
import { analyzeWithFICrossSpecialist, FI_CROSS_KNOWLEDGE } from "./modules/fi-cross-specialist";
import type { SpecialistKnowledge } from "./modules/_base";
import { emptyResult } from "./modules/_base";

export type SpecialistAnalyzer = (input: SpecialistAnalysisInput) => SpecialistAnalysisResult;

/** Fallback para UNKNOWN — devuelve un resultado neutro pidiendo más data. */
function analyzeUnknown(input: SpecialistAnalysisInput): SpecialistAnalysisResult {
  return {
    ...emptyResult("UNKNOWN"),
    diagnosis:
      "No se detectó un módulo SAP claro. Se necesita más información para enrutar al especialista correcto.",
    n1Checklist: [
      "Pedir mensaje SAP exacto al usuario",
      "Pedir transacción y código de error",
      "Pedir módulo + proceso afectado",
      "Pedir capturas si hay error visual",
    ],
    missingData: [
      "Módulo SAP",
      "Transacción afectada",
      "Mensaje SAP exacto",
      "Código de error",
      "Ambiente (DEV/QAS/PRD)",
    ],
    n2Criteria: ["Si tras pedir data sigue sin clasificar, escalar a líder funcional"],
    estimatedComplexity: "HIGH",
    canResolveAtN1: false,
    customerResponseDraft: input.ticketKey
      ? `Hola, recibimos tu caso (ticket ${input.ticketKey}). Para acelerar el análisis necesitamos: módulo SAP, transacción, mensaje exacto y capturas. — Equipo AMS`
      : "Hola, para acelerar el análisis necesitamos: módulo SAP, transacción, mensaje exacto y capturas. — Equipo AMS",
    internalNotes: "Router devolvió UNKNOWN. Pedir data antes de actuar.",
    risks: ["Actuar sin clasificación clara"],
  };
}

export const SPECIALIST_REGISTRY: Record<SAPModuleSpecialist, SpecialistAnalyzer> = {
  MM: analyzeWithMMSpecialist,
  SD: analyzeWithSDSpecialist,
  WM: analyzeWithWMEWMSpecialist,
  EWM: analyzeWithWMEWMSpecialist, // mismo analizador, decide WM vs EWM internamente
  PP_MRP: analyzeWithPPMRPSpecialist,
  INTEGRATIONS: analyzeWithIntegrationsSpecialist,
  BASIS_AUTH: analyzeWithBasisAuthSpecialist,
  ABAP_TECHNICAL: analyzeWithABAPTechnicalSpecialist,
  FI_CROSS: analyzeWithFICrossSpecialist,
  UNKNOWN: analyzeUnknown,
};

/** Knowledge declarativo accesible para docs / auditoría / UI. */
export const SPECIALIST_KNOWLEDGE: Partial<Record<SAPModuleSpecialist, SpecialistKnowledge>> = {
  MM: MM_KNOWLEDGE,
  SD: SD_KNOWLEDGE,
  WM: WM_EWM_KNOWLEDGE,
  EWM: WM_EWM_KNOWLEDGE,
  PP_MRP: PP_MRP_KNOWLEDGE,
  INTEGRATIONS: INTEGRATIONS_KNOWLEDGE,
  BASIS_AUTH: BASIS_AUTH_KNOWLEDGE,
  ABAP_TECHNICAL: ABAP_TECHNICAL_KNOWLEDGE,
  FI_CROSS: FI_CROSS_KNOWLEDGE,
};

/** Ejecuta el especialista por key — entry point del orquestador. */
export function runSpecialist(
  specialist: SAPModuleSpecialist,
  input: SpecialistAnalysisInput,
): SpecialistAnalysisResult {
  const fn = SPECIALIST_REGISTRY[specialist] ?? analyzeUnknown;
  return fn(input);
}

export type { SpecialistKnowledge };
