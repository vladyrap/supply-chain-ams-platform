// =============================================================================
// Guided Ticket Intake — Tipos
// =============================================================================
// Modelo del flujo guiado de creación de tickets. El draft se construye en el
// wizard de 6 pasos y se transforma en CreateTicketInput al enviar.
//
// Política respetada: ninguna evidencia visual se guarda en localStorage. Sólo
// notas resumen vía visualEvidenceNotes (consistente con CreateTicketModal).
// =============================================================================

import type { TemporaryVisualEvidence } from "./visual-evidence";

/** Severidad del impacto al negocio (humanizado). */
export type BusinessImpactLevel =
  | "blocks_critical_process"     // bloquea proceso crítico (logística, facturación)
  | "blocks_user_work"            // bloquea trabajo de un equipo/usuario
  | "workaround_exists"           // hay workaround temporal
  | "cosmetic";                    // sólo molestia visual

/** Frecuencia del problema. */
export type IssueFrequency =
  | "always"              // siempre que se ejecuta
  | "intermittent"        // a veces
  | "specific_data"       // sólo con datos específicos
  | "first_time";         // ocurrió una sola vez

/** Status del ticket cuando se crea con info insuficiente. */
export const WAITING_INFORMATION_STATUS = "Waiting Information" as const;

// ============================================================
// Campos SAP dinámicos por módulo
// ============================================================

export type SapFieldType = "text" | "number" | "date" | "textarea";

export interface SapModuleField {
  id: string;                       // ej. "purchase_order"
  label: string;                    // ej. "Orden de compra"
  type: SapFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** Validación regex opcional (ej. patrón OC: /^45\d{8}$/) */
  pattern?: string;
}

export interface SapModuleIntakeSpec {
  module: string;                   // "MM" | "SD" | "WM" | "EWM" | "PP" | "INTEGRACION" | "DEFAULT"
  label: string;                    // "Materials Management"
  processes: { id: string; label: string }[];
  fields: SapModuleField[];
}

// ============================================================
// Draft del wizard
// ============================================================

/** Datos del paso 1 (Contexto). */
export interface IntakeContext {
  client?: string;
  environment: string;               // "DEV" | "QA" | "UAT" | "PRD" | "SANDBOX" | ""
  sapModule: string;                 // "MM" | "SD" | ...
  process?: string;                  // id de proceso del módulo
  transaction?: string;              // "MIGO" / "VA01" / Fiori app
  priority: string;                  // "Highest" | "High" | "Medium" | "Low"
  businessImpact?: BusinessImpactLevel;
  businessImpactDetail?: string;     // explicación humana
}

/** Datos del paso 2 (Problema). */
export interface IntakeProblem {
  whatIntended?: string;             // qué intentaba hacer
  whereFails?: string;               // en qué paso falla
  errorMessageExact?: string;        // texto literal del error
  sinceWhen?: string;                // fecha o "hoy" / "desde el go-live"
  workedBefore?: "yes" | "no" | "unknown";
  affectedUsers?: "one" | "team" | "all";
  affectedDocs?: "one" | "multiple" | "all";
  frequency?: IssueFrequency;
}

/** Datos del paso 3 (Datos SAP). Map de field.id → valor. */
export type IntakeSapData = Record<string, string>;

/** Datos del paso 4 (Evidencia). Reusa el componente existente. */
export interface IntakeEvidence {
  items: TemporaryVisualEvidence[];
  textualLog?: string;               // pegado de log corto
}

/** Draft completo. */
export interface GuidedTicketDraft {
  id?: string;                       // si es un borrador guardado
  title: string;                     // generado automáticamente desde context
  context: IntakeContext;
  problem: IntakeProblem;
  sapData: IntakeSapData;
  evidence: IntakeEvidence;
  reporter?: string | null;
  createdAt?: string;                // ISO si es borrador guardado
  updatedAt?: string;
}

// ============================================================
// Output: Checklist N1
// ============================================================

export interface ChecklistN1Item {
  id: string;
  label: string;
  description?: string;
  /** Si true, este paso puede resolverse en N1. Si false, fuerza escalamiento. */
  resolvableN1: boolean;
  /** Razón de escalamiento si resolvableN1=false. */
  escalateReason?: string;
  /** Orden en la lista. */
  order: number;
  /** Si ya está completado (para tracking en TCC). */
  completed?: boolean;
}

export type N1EscalationCriterion =
  | "requires_config"
  | "requires_transport"
  | "requires_abap_debug"
  | "requires_external_integration"
  | "massive_prd_impact"
  | "requires_functional_approval"
  | "no_playbook_available"
  | "low_confidence_high_priority"
  | "financial_or_logistic_critical";

export const ESCALATION_CRITERION_LABELS: Record<N1EscalationCriterion, string> = {
  requires_config:                    "Requiere configuración",
  requires_transport:                 "Requiere transporte",
  requires_abap_debug:                "Requiere debugging ABAP",
  requires_external_integration:      "Requiere integración externa",
  massive_prd_impact:                 "Afecta PRD masivamente",
  requires_functional_approval:       "Requiere autorización funcional",
  no_playbook_available:              "No existe playbook documentado",
  low_confidence_high_priority:       "Confianza baja con prioridad alta",
  financial_or_logistic_critical:     "Impacto financiero o logístico crítico",
};

// ============================================================
// Output: Paquete N1 completo
// ============================================================

export interface N1Package {
  /** Score de readiness del draft. */
  readinessScore: number;
  readinessStatus: "LOW" | "MEDIUM" | "HIGH" | "READY";
  /** Items completados / faltantes (humanos). */
  completedInfo: string[];
  missingInfo: string[];
  /** Clasificación SAP sugerida (módulo + proceso). */
  sapClassification: { module: string; process?: string; transaction?: string };
  /** ETA preliminar en horas. */
  estimatedHours: { min: number; max: number; confidence: "LOW" | "MEDIUM" | "HIGH" };
  /** Playbook sugerido. */
  suggestedPlaybook: { id?: string; title: string; reason: string } | null;
  /** Checklist N1 generado. */
  n1Checklist: ChecklistN1Item[];
  /** Datos faltantes para mejor resolución. */
  missingData: string[];
  /** Respuesta inicial al cliente (subject + body markdown). */
  initialCustomerResponse: { subject: string; body: string; canSend: boolean } | null;
  /** Criterios potenciales de escalamiento N2. */
  escalationCriteria: N1EscalationCriterion[];
  /** Resumen textual del paquete. */
  summary: string;
  createdAt: string;
}

// ============================================================
// Output: Payload para escalar a N2 con paquete completo
// ============================================================

export interface EscalationN2Payload {
  ticketKey: string;
  /** Resumen del problema. */
  problemSummary: string;
  /** Datos SAP estructurados. */
  sapData: {
    module: string;
    process?: string;
    transaction?: string;
    environment: string;
    fields: Record<string, string>;   // values from intake
  };
  /** Evidencia descrita (sin archivos). */
  evidenceSummary: string[];
  /** Acciones que N1 ya realizó. */
  n1ActionsTaken: string[];
  /** Checklist N1 (items completados o no). */
  n1ChecklistStatus: ChecklistN1Item[];
  /** Hipótesis que N1 descartó (con razón). */
  hypothesesRuledOut: { hypothesis: string; reason: string }[];
  /** Por qué se escala. */
  escalationReason: string;
  primaryEscalationCriterion: N1EscalationCriterion;
  /** ETA sugerida (puede venir del Intelligence Core). */
  suggestedEta: { min: number; max: number; confidence: string };
  priority: string;
  /** Impacto al negocio. */
  businessImpact: { level: BusinessImpactLevel; detail: string };
  /** Timestamps. */
  createdAt: string;
  escalatedBy: string;
}

// ============================================================
// Storage para drafts (localStorage)
// ============================================================

export const INTAKE_DRAFTS_STORAGE = "supply-chain-ams-intake-drafts" as const;
export const MAX_DRAFTS = 5;
