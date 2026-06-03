// =============================================================================
// LLM Provider Adapter — capa de selección de modelo por tarea
// =============================================================================
// Arquitectura preparada para multi-model. En v0.11 SOLO Gemini está conectado
// (vía el endpoint /api/tickets/:key/classify del backend agent) o MOCK para
// modo offline / demo sin credenciales.
//
// NUNCA llamar Claude/OpenAI directo desde acá todavía. Esta función decide
// "qué provider TENDRÍA que usarse" pero el caller actualmente sólo soporta
// Gemini real; Claude/OpenAI quedan stubbed.
// =============================================================================

export type LLMProvider = "GEMINI" | "CLAUDE" | "OPENAI" | "LOCAL" | "MOCK";

export type LLMTaskType =
  | "CLASSIFICATION"
  | "ESTIMATION"
  | "RCA"
  | "CUSTOMER_RESPONSE"
  | "QUALITY_GATE"
  | "DOCUMENTATION"
  | "SUMMARY"
  | "TECHNICAL_REASONING";

export interface LLMProviderSelectionContext {
  /** Prioridad del ticket si aplica — afecta selección. */
  priority?: string;
  /** Ambiente del ticket — PRD prioriza modelos más caros pero precisos. */
  isProductive?: boolean;
  /** Si la respuesta va al cliente final, sube quality bar. */
  customerFacing?: boolean;
  /** Si offline / sin credenciales → forzar MOCK. */
  offlineMode?: boolean;
}

export interface LLMProviderSelection {
  /** Qué provider IDEALMENTE deberíamos usar. */
  ideal: LLMProvider;
  /** Qué provider REALMENTE vamos a usar hoy (limitado por integraciones). */
  effective: LLMProvider;
  /** Razón legible de la elección. */
  reason: string;
  /** Si el ideal no está disponible. */
  fallbackApplied: boolean;
}

// ---------------------------------------------------------------------------
// Mapeo declarativo task → ideal provider
// ---------------------------------------------------------------------------

const TASK_PROVIDER_PREFERENCE: Record<LLMTaskType, LLMProvider> = {
  CLASSIFICATION: "GEMINI",        // rápido + estructurado
  ESTIMATION: "GEMINI",            // alto volumen
  RCA: "CLAUDE",                   // razonamiento profundo
  CUSTOMER_RESPONSE: "OPENAI",     // calidad de tono
  QUALITY_GATE: "OPENAI",          // validación cruzada
  DOCUMENTATION: "CLAUDE",         // textos largos
  SUMMARY: "GEMINI",               // resumen rápido
  TECHNICAL_REASONING: "CLAUDE",   // análisis ambiguo
};

/** Providers que tenemos realmente conectados en v0.11. */
const AVAILABLE_PROVIDERS: ReadonlySet<LLMProvider> = new Set(["GEMINI", "MOCK"]);

function isOfflineEnv(): boolean {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_FORCE_MOCK_LLM === "1") {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function selectProviderForTask(
  taskType: LLMTaskType,
  context: LLMProviderSelectionContext = {},
): LLMProviderSelection {
  // Override duro: si estamos en modo offline → MOCK
  if (context.offlineMode || isOfflineEnv()) {
    return {
      ideal: TASK_PROVIDER_PREFERENCE[taskType],
      effective: "MOCK",
      reason: "Modo offline / sin credenciales → MOCK forzado",
      fallbackApplied: true,
    };
  }

  const ideal = TASK_PROVIDER_PREFERENCE[taskType];

  if (AVAILABLE_PROVIDERS.has(ideal)) {
    return {
      ideal,
      effective: ideal,
      reason: `Provider ideal ${ideal} disponible para tarea ${taskType}`,
      fallbackApplied: false,
    };
  }

  // Fallback: si el ideal no está conectado, usamos Gemini (único real hoy)
  return {
    ideal,
    effective: "GEMINI",
    reason: `Ideal ${ideal} no conectado todavía (v0.11). Fallback → GEMINI.`,
    fallbackApplied: true,
  };
}

/** Helper para audit / docs. */
export function listAvailableProviders(): LLMProvider[] {
  return [...AVAILABLE_PROVIDERS];
}
