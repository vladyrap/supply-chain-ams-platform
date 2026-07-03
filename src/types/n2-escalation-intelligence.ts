// =============================================================================
// N2 Escalation Intelligence — types
// =============================================================================
// Tipos del motor que decide CUÁNDO escalar a N2 + A QUIÉN + CON QUÉ SLA +
// QUÉ PLAYBOOK ejecutar. Construye encima de las reglas existentes de
// EscalationRule + N2Responsible (src/types/escalation.ts) agregando análisis
// contextual y scoring.
//
// Determinístico, sin LLM. Preparado para conexión IA futura.
// =============================================================================

import type { N2Responsible, EscalationRule } from "./escalation";

// ============================================================
// Decisiones del motor
// ============================================================

/** Recomendación de si conviene escalar a N2. */
export type EscalationVerdict =
  | "ESCALATE_NOW"        // Escalar inmediatamente
  | "ESCALATE_SOON"       // Escalar pronto (próximas N horas)
  | "WAIT_AND_SEE"        // Mantener N1, monitorear
  | "RESOLVE_AT_N1"       // Resolver en N1 con apoyo
  | "INSUFFICIENT_DATA";  // Faltan datos para decidir

/** Categoría del SLA sugerido. */
export type EscalationSlaTier =
  | "P1_60MIN"
  | "P1_4H"
  | "P2_4H"
  | "P2_8H"
  | "P3_24H"
  | "P4_48H";

/** Una señal que dispara la recomendación de escalar. */
export interface EscalationSignal {
  id: string;
  category:
    | "severity"
    | "complexity"
    | "data_quality"
    | "expertise_required"
    | "n1_capability"
    | "business_impact"
    | "historical"
    | "compliance"
    | "sla_risk";
  /** weight 0..1 — qué tanto pesa esta señal en la decisión final. */
  weight: number;
  /** "+" = empuja a escalar, "-" = empuja a NO escalar. */
  direction: "push_escalate" | "push_stay";
  /** Descripción humana legible. */
  message: string;
  /** Razón estructurada para debug. */
  evidence?: string;
}

/** Recomendación de un especialista N2 con scoring detallado. */
export interface SpecialistRecommendation {
  responsibleId: string;
  responsibleName: string;
  email?: string;
  /** Score 0..100 con cómo encaja para este caso. */
  matchScore: number;
  rank: number;
  /** Por qué este score. */
  matchReasons: string[];
  /** Workload actual: 0..100 (porcentaje sobre max_active_cases). */
  currentWorkloadPct: number;
  availability: "AVAILABLE" | "BUSY" | "OFFLINE" | "ON_CALL" | "VACATION";
  /** Skills propios del especialista. */
  skills: string[];
  /** Módulos SAP cubiertos. */
  sapModules: string[];
  /** Casos similares resueltos previamente por este N2 (count). */
  historicalCasesCount: number;
  /** Estimación de horas a resolución por este N2 (basado en histórico). */
  estimatedHoursToResolve?: { min: number; max: number };
  /** Si es la opción principal recomendada. */
  isPrimary: boolean;
}

/** SLA sugerido con razones. */
export interface SlaRecommendation {
  tier: EscalationSlaTier;
  /** Minutos hasta la primera respuesta. */
  responseMinutes: number;
  /** Minutos hasta resolución (target). */
  resolutionMinutes: number;
  reasoning: string;
}

/** Match opcional con playbook a ejecutar al escalar. */
export interface PlaybookRecommendation {
  playbookId: string;
  playbookTitle: string;
  reason: string;
  matchScore: number;
}

/** Reporte completo del motor de Intelligence. */
export interface N2EscalationAnalysis {
  analysisId: string;
  createdAt: string;
  engineVersion: string;
  ticketKey: string;

  // ── Decisión principal ──────────────────────────────────
  verdict: EscalationVerdict;
  /** Score 0..100 con la confianza del verdict. */
  confidenceScore: number;
  /** Score 0..100 — qué tanto urge escalar (0=nada, 100=ahora). */
  urgencyScore: number;
  /** Si verdict=ESCALATE_SOON, en cuántas horas conviene escalar. */
  escalateWithinHours: number | null;

  // ── Señales analizadas ──────────────────────────────────
  pushEscalate: EscalationSignal[];
  pushStay: EscalationSignal[];

  // ── Recomendaciones específicas ─────────────────────────
  /** Lista ordenada de especialistas (top-3 típico). */
  specialistRecommendations: SpecialistRecommendation[];
  /** SLA sugerido para este caso. */
  slaRecommendation: SlaRecommendation;
  /** Playbook que debería ejecutarse junto con la escalación. */
  playbookRecommendation: PlaybookRecommendation | null;
  /** Rule matched (si alguna del catálogo existente). */
  matchedRule: EscalationRule | null;

  // ── Razones y narrativa ─────────────────────────────────
  /** Resumen ejecutivo en una frase. */
  executiveSummary: string;
  /** Razones detalladas. */
  reasoning: string[];
  /** Riesgos de NO escalar. */
  risksIfNotEscalated: string[];
  /** Datos faltantes para mejorar la decisión. */
  missingData: string[];

  /** Notas internas (debug). */
  internalNotes: string;
}

// ============================================================
// Input al motor — qué necesita saber
// ============================================================

export interface N2EscalationInput {
  ticketKey: string;
  ticketTitle: string;
  ticketDescription?: string;
  ticketPriority?: string;
  sapModule?: string | null;
  sapTransaction?: string;
  environment?: string | null;
  isProductive?: boolean;

  // Contexto AMS
  hasPlaybook?: boolean;
  hasKnowledgeMatch?: boolean;
  hasScopeItem?: boolean;
  hasErrorEvidence?: boolean;
  hasReproduction?: boolean;
  hasVisualEvidence?: boolean;

  // Señales del estimador
  estimationConfidence?: "LOW" | "MEDIUM" | "HIGH";
  estimationMinHours?: number;
  estimationMaxHours?: number;

  // Histórico
  similarPastTicketsCount?: number;
  hasReusableResolution?: boolean;

  // N1 attempts
  n1AttemptsCount?: number;
  n1HoursInvested?: number;

  // Misc
  daysOpen?: number;
  customerSegment?: "ENTERPRISE" | "PREMIUM" | "STANDARD" | "BASIC";
  affectsCriticalProcess?: boolean;
  affectsBilling?: boolean;
  affectsCompliance?: boolean;

  // Available specialists para evaluar match
  availableSpecialists?: N2Responsible[];
  /** Reglas catalogadas para matchear opcionalmente. */
  rules?: EscalationRule[];
  /** Playbooks disponibles para sugerir uno. */
  availablePlaybooks?: Array<{
    id: string;
    title: string;
    sapModule?: string;
    triggerWhen?: string;
    status?: string;
  }>;
}

// ============================================================
// Storage
// ============================================================

export const N2_INTELLIGENCE_STORAGE = {
  analyses: "supply-chain-ams-n2-intelligence-analyses",
} as const;

// ============================================================
// Labels para UI
// ============================================================

export const VERDICT_LABELS: Record<EscalationVerdict, string> = {
  ESCALATE_NOW: "Escalar ahora",
  ESCALATE_SOON: "Escalar pronto",
  WAIT_AND_SEE: "Esperar y monitorear",
  RESOLVE_AT_N1: "Resolver en N1",
  INSUFFICIENT_DATA: "Datos insuficientes",
};

export const VERDICT_ICONS: Record<EscalationVerdict, string> = {
  ESCALATE_NOW: "🚨",
  ESCALATE_SOON: "⏰",
  WAIT_AND_SEE: "👀",
  RESOLVE_AT_N1: "🔧",
  INSUFFICIENT_DATA: "❓",
};

export const VERDICT_COLORS: Record<EscalationVerdict, string> = {
  ESCALATE_NOW: "#fa4d56",
  ESCALATE_SOON: "#f59e0b",
  WAIT_AND_SEE: "#4589ff",
  RESOLVE_AT_N1: "#10b981",
  INSUFFICIENT_DATA: "#64748b",
};

export const SLA_TIER_LABELS: Record<EscalationSlaTier, string> = {
  P1_60MIN: "P1 · 1 hora",
  P1_4H: "P1 · 4 horas",
  P2_4H: "P2 · 4 horas",
  P2_8H: "P2 · 8 horas",
  P3_24H: "P3 · 24 horas",
  P4_48H: "P4 · 48 horas",
};

export const SLA_TIER_MINUTES: Record<EscalationSlaTier, { response: number; resolution: number }> = {
  P1_60MIN: { response: 15, resolution: 60 },
  P1_4H:    { response: 30, resolution: 240 },
  P2_4H:    { response: 60, resolution: 240 },
  P2_8H:    { response: 60, resolution: 480 },
  P3_24H:   { response: 240, resolution: 1440 },
  P4_48H:   { response: 480, resolution: 2880 },
};
