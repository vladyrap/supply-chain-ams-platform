// =============================================================================
// Clean Core Governance — Tipos
// =============================================================================
// "Clean Core" es la estrategia SAP (RISE with SAP / S/4HANA) para mantener el
// núcleo del sistema limpio: mínima modificación del estándar, extensiones
// released, integración API-first y datos/config gobernados. Un core limpio es
// upgrade-safe, cloud-ready y de menor TCO.
//
// Este módulo mide qué tan "limpio" está el core del cliente a través de 6
// dimensiones oficiales SAP, con un índice 0-100 y un backlog de remediación.
// =============================================================================

/** Las 6 dimensiones oficiales de SAP Clean Core. */
export type CleanCoreDimensionId =
  | "custom_code"     // ABAP custom cloud-ready + APIs released
  | "extensibility"   // extensiones released (BAdI/in-app/side-by-side), sin modificaciones
  | "integration"     // integración API-first, sin acceso directo a DB
  | "configuration"   // configuración estándar / Best Practices
  | "data"            // calidad + archiving + gobierno de datos maestros
  | "process";        // adopción de procesos estándar SAP

export type FindingSeverity = "critical" | "high" | "medium" | "low";

/** Ciclo de vida de un hallazgo de gobierno. */
export type FindingStatus =
  | "open"            // detectado, sin trabajar
  | "in_progress"     // en remediación
  | "resolved"        // remediado (ya no penaliza el índice)
  | "accepted_risk";  // desviación aceptada formalmente (penaliza reducido)

export interface CleanCoreDimensionDef {
  id: CleanCoreDimensionId;
  label: string;
  icon: string;
  /** Peso relativo en el índice global (los pesos suman 1). */
  weight: number;
  description: string;
  /** Métrica ancla que contextualiza el score (ej. "342 objetos Z escaneados"). */
  baseline: string;
}

export interface CleanCoreFinding {
  id: string;
  dimension: CleanCoreDimensionId;
  title: string;
  severity: FindingSeverity;
  /** Objeto SAP afectado (programa, tabla, BAdI, IDoc…). */
  object: string;
  /** Naturaleza del objeto ("Programa Z", "Modificación", "Acceso directo a tabla"…). */
  objectType: string;
  /** Módulo funcional SAP (MM, SD, PP, FI, Cross…). */
  sapModule: string;
  /** Qué rompe clean core. */
  problem: string;
  /** Remediación concreta (API released, BAdI, key-user extensibility…). */
  recommendation: string;
  /** Esfuerzo estimado de remediación en horas. */
  effortHours: number;
  status: FindingStatus;
  /** ¿El objeto es apto para cloud / upgrade-safe hoy? */
  cloudReady: boolean;
  /** Nota SAP, API released o scope item de referencia. */
  reference?: string;
}

// ── Resultado del motor ──────────────────────────────────────────────────────

export type CleanCoreBandId = "critical" | "at_risk" | "on_track" | "solid" | "clean";

export interface CleanCoreBand {
  id: CleanCoreBandId;
  label: string;
  color: string;
  min: number;
}

export interface DimensionResult {
  def: CleanCoreDimensionDef;
  score: number;            // 0-100
  band: CleanCoreBand;
  weightedContribution: number;  // score * weight
  findings: CleanCoreFinding[];
  openCount: number;        // open + in_progress
  criticalOpen: number;
  effortHours: number;      // esfuerzo pendiente (open + in_progress)
  topRecommendation: string | null;
}

export interface CleanCoreResult {
  index: number;            // 0-100 índice global ponderado
  band: CleanCoreBand;
  projectedIndex: number;   // índice si se remediaran todos los hallazgos abiertos
  dimensions: DimensionResult[];
  totals: {
    findings: number;
    open: number;           // open + in_progress
    resolved: number;
    acceptedRisk: number;
    critical: number;       // críticos abiertos
    high: number;           // altos abiertos
    effortHours: number;    // esfuerzo pendiente total
    cloudReadyRatio: number; // 0-1 sobre objetos con veredicto cloud-ready
  };
}
