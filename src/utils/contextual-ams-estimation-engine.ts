// =============================================================================
// Contextual AMS Estimation Engine
// =============================================================================
// Motor v2 que envuelve el baseline determinístico con análisis contextual.
//
// Pipeline:
//   1. Analiza el texto libre del caso (título + descripción + ...) con
//      sap-context-detector → extrae módulo/transacción/objetos/error/issueType.
//   2. Mapea hints clásicos del input (complexity, severity, urgency, env, flags)
//      sobre el contexto detectado.
//   3. Llama al baseline determinístico (estimate() / autoEstimateTicketResolution())
//      para obtener una banda inicial.
//   4. Busca top-3 casos históricos similares con similarity scoring.
//   5. Busca playbook aplicable.
//   6. Aplica ajustes contextuales (multiplicadores y deltas) con razones.
//   7. Genera escenarios optimista / esperado / pesimista narrados.
//   8. Genera fases enriquecidas con razones.
//   9. Computa confianza global combinando textQualityScore + cantidad de
//      casos similares + objetos detectados + ambiente conocido.
//  10. Genera missingData, recommendations, NBA, clientResponseDraft.
//
// El baseline determinístico (engine.ts) NO se reemplaza — se reusa como capa
// inicial. Si quitás el motor contextual, el sistema sigue funcionando.
//
// Sin LLM. Sin red. Sin claves. Preparado para futura conexión IA de visión y
// LLM para extracción semántica más profunda — interfaces ya están listas.
// =============================================================================

import { estimate as estimateProject, autoEstimateTicketResolution } from "@/lib/estimation/engine";
import { analyzeTicketTextForEstimation, type DetectedSapContext } from "@/utils/sap-context-detector";
import { findSimilarHistoricalCases, aggregateSimilarCases } from "@/utils/historical-cases-matcher";
import type {
  ContextualEstimationInput,
  ContextualEstimationResult,
  ContextualAdjustment,
  ContextualPhase,
  ContextualScenario,
  ContextualRecommendation,
  PlaybookMatch,
  EstimateInput,
  TicketEstimateInput,
  ConfidenceLevel,
  RequiredProfile,
} from "@/types/estimation";
import type { SapIssueType } from "@/utils/sap-context-detector";

// ============================================================
// Cap realista por issueType — evita ranges absurdos
// ============================================================
// El baseline puede generar números enormes (auth_issue 24h max, dev 290h max).
// Acá tenemos un techo realista por tipo de problema. Si el rango supera el
// techo Y no hay casos históricos que lo confirmen, lo cortamos.
//
// Si SÍ hay casos históricos con horas mayores, respetamos el histórico.

const REALISTIC_MAX_BY_ISSUE_TYPE: Record<SapIssueType, number> = {
  incident_functional_simple: 8,
  incident_functional_complex: 24,
  incident_technical: 32,
  defect: 24,
  requirement: 80,
  minor_change: 16,
  change_with_development: 120,
  integration_issue: 60,
  master_data_issue: 12,
  customizing_issue: 24,
  authorization_issue: 4,
  performance_issue: 40,
  interface_issue: 40,
  job_issue: 12,
  idoc_api_issue: 24,
  pricing_issue: 12,
  stock_issue: 8,
  mrp_issue: 24,
  transport_issue: 8,
  critical_production_issue: 48,
  unknown: 32,
};

const REALISTIC_MIN_BY_ISSUE_TYPE: Record<SapIssueType, number> = {
  incident_functional_simple: 0.5,
  incident_functional_complex: 1.5,
  incident_technical: 2,
  defect: 1,
  requirement: 8,
  minor_change: 2,
  change_with_development: 8,
  integration_issue: 4,
  master_data_issue: 0.5,
  customizing_issue: 2,
  authorization_issue: 0.25,
  performance_issue: 2,
  interface_issue: 2,
  job_issue: 1,
  idoc_api_issue: 2,
  pricing_issue: 0.5,
  stock_issue: 1,
  mrp_issue: 2,
  transport_issue: 0.5,
  critical_production_issue: 2,
  unknown: 1,
};

/** Aplica techo realista respetando casos históricos. */
function applyRealisticCap(
  issueType: SapIssueType,
  minH: number, maxH: number,
  historicalMaxHours: number,
): { minH: number; maxH: number } {
  const realisticMax = REALISTIC_MAX_BY_ISSUE_TYPE[issueType];
  const realisticMin = REALISTIC_MIN_BY_ISSUE_TYPE[issueType];
  // El cap respeta histórico — si un caso similar duró más, dejamos más margen.
  const cap = Math.max(realisticMax, historicalMaxHours * 1.3);
  return {
    minH: Math.max(realisticMin * 0.8, Math.min(minH, realisticMin * 4)),
    maxH: Math.max(minH * 1.4, Math.min(maxH, cap)),
  };
}

// ============================================================
// Constants
// ============================================================

const ENGINE_VERSION = "0.1.0-mock";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

// ============================================================
// Helper: convertir context + input → input del baseline ticket engine
// ============================================================

function toTicketEstimateInput(
  input: ContextualEstimationInput,
  ctx: DetectedSapContext,
): TicketEstimateInput {
  // El detector tiene prioridad sobre los hints — pero los hints explícitos
  // del input los respetamos si vienen.
  const sapModule = input.sapModule || ctx.module;
  const process = input.process || ctx.process;
  const subProcess = input.subProcess || ctx.subProcess;
  const env = input.environment || (ctx.environment as TicketEstimateInput["environment"]);
  const severity = input.severity || (ctx.severity as TicketEstimateInput["severity"]);
  const urgency = input.urgency
    || (ctx.severity === "CRITICAL" ? "IMMEDIATE" : ctx.severity === "HIGH" ? "URGENT" : "NORMAL");

  // Inferimos flags si no vienen explícitos
  const requiresDevelopment = input.requiresDevelopment ?? ctx.requiresDevelopment;
  const requiresIntegration = input.requiresIntegration ?? ctx.requiresIntegration;
  const requiresTransport = input.requiresTransport ?? ctx.requiresTransport;
  const requiresUAT = input.requiresUAT ?? ctx.requiresUAT;
  const hasErrorEvidence = input.hasErrorEvidence ?? ctx.hasExplicitErrorMessage;

  return {
    ticketId: input.ticketKey || input.sourceId || uid("tkt"),
    origin: "other",
    kind: input.kind ?? "incident",
    title: input.title || "Caso sin título",
    description: input.description,
    sapModule,
    process,
    subProcess,
    environment: env,
    severity,
    priority: urgency,
    complexity: input.complexity,
    serviceLevel: input.serviceLevel,
    requiresDevelopment,
    requiresIntegration,
    requiresTransport,
    requiresUAT,
    hasKnownPlaybook: input.hasPlaybook,
    hasKnowledgeMatch: input.hasPublishedKnowledge,
    hasScopeItemCoverage: !!input.scopeItemIds?.length,
    isRepeatedIncident: input.isRepeatedIncident,
    hasErrorEvidence,
    isProductive: input.isProductive ?? ctx.isProductive,
    missingData: input.internalNotes ? [] : undefined,
  };
}

// ============================================================
// Helper: convertir input a EstimateInput (para baseline /time-estimator)
// ============================================================

function toProjectEstimateInput(
  input: ContextualEstimationInput,
  ctx: DetectedSapContext,
): EstimateInput {
  return {
    title: input.title || "Caso sin título",
    description: input.description,
    sapModule: input.sapModule || ctx.module,
    process: input.process || ctx.process,
    subProcess: input.subProcess || ctx.subProcess,
    scopeItemIds: input.scopeItemIds,
    estimateType: input.estimateType ?? "INCIDENT_RESOLUTION",
    complexity: input.complexity,
    severity: input.severity || (ctx.severity as EstimateInput["severity"]),
    urgency: input.urgency,
    environment: input.environment || (ctx.environment as EstimateInput["environment"]),
    serviceLevel: input.serviceLevel ?? "STANDARD",
    requiresDevelopment: input.requiresDevelopment ?? ctx.requiresDevelopment,
    requiresIntegration: input.requiresIntegration ?? ctx.requiresIntegration,
    requiresTransport: input.requiresTransport ?? ctx.requiresTransport,
    requiresUAT: input.requiresUAT ?? ctx.requiresUAT,
    requiresApproval: input.requiresApproval,
    hasDocumentation: input.hasDocumentation,
    hasPlaybook: input.hasPlaybook,
    hasPublishedKnowledge: input.hasPublishedKnowledge,
    isProductive: input.isProductive ?? ctx.isProductive,
    isRepeatedIncident: input.isRepeatedIncident,
    tags: input.tags,
    createdBy: input.createdBy,
    internalNotes: input.internalNotes,
  };
}

// ============================================================
// Ajustes contextuales — el corazón del motor
// ============================================================

function buildContextualAdjustments(
  ctx: DetectedSapContext,
  input: ContextualEstimationInput,
  similarCount: number,
  hasPlaybook: boolean,
): ContextualAdjustment[] {
  const adj: ContextualAdjustment[] = [];

  // ── Complexity ────────────────────────────────────────────
  if (ctx.requiresDevelopment) {
    adj.push({
      factor: "Requiere desarrollo ABAP/BTP",
      impact: 1.25,
      direction: "increase",
      category: "complexity",
      reason: "Texto sugiere desarrollo: aumento de variabilidad por scope técnico.",
    });
  }
  if (ctx.requiresIntegration) {
    adj.push({
      factor: "Requiere integración cross-system",
      impact: 1.20,
      direction: "increase",
      category: "complexity",
      reason: "Caso cross-system: depende de disponibilidad y comportamiento del sistema externo.",
    });
  }
  if (ctx.severity === "CRITICAL") {
    adj.push({
      factor: "Severidad CRÍTICA",
      impact: 1.15,
      direction: "increase",
      category: "complexity",
      reason: "Severidad CRITICAL aumenta esfuerzo de validación y comunicación.",
    });
  }
  if (ctx.transactions.length > 2) {
    // Varias transacciones referenciadas — caso cross
    adj.push({
      factor: "Múltiples transacciones involucradas",
      impact: 1.10,
      direction: "increase",
      category: "complexity",
      reason: `Se mencionan ${ctx.transactions.length} transacciones distintas — caso multi-flujo.`,
    });
  }

  // ── Data quality ──────────────────────────────────────────
  if (ctx.textQualityScore < 40) {
    adj.push({
      factor: "Información del caso muy limitada",
      impact: 1.25,
      direction: "increase",
      category: "data_quality",
      reason: `Score de calidad de información ${ctx.textQualityScore}/100 — bandas más amplias para cubrir ambigüedad.`,
    });
  } else if (ctx.textQualityScore >= 75) {
    adj.push({
      factor: "Información del caso muy completa",
      impact: 0.95,
      direction: "decrease",
      category: "data_quality",
      reason: `Score de calidad ${ctx.textQualityScore}/100 — banda más ajustada por buen contexto.`,
    });
  }
  if (!ctx.hasExplicitErrorMessage && !ctx.hasReproduction) {
    adj.push({
      factor: "Sin mensaje de error ni pasos para reproducir",
      impact: 1.15,
      direction: "increase",
      category: "data_quality",
      reason: "Mayor esfuerzo de diagnóstico antes de poder atacar la causa raíz.",
    });
  }
  if (ctx.hasExplicitErrorMessage && ctx.hasReproduction) {
    adj.push({
      factor: "Error reproducible con mensaje claro",
      impact: 0.90,
      direction: "decrease",
      category: "data_quality",
      reason: "Diagnóstico más directo cuando el error es reproducible y tiene mensaje.",
    });
  }

  // ── Environment / impact ──────────────────────────────────
  if (ctx.isProductive) {
    adj.push({
      factor: "Ocurre en PRD",
      impact: 1.15,
      direction: "increase",
      category: "environment",
      reason: "PRD requiere doble verificación + plan de back-out + ventana controlada.",
    });
  }
  if (ctx.hasOperationHalted) {
    adj.push({
      factor: "Operación cliente detenida",
      impact: 1.10,
      direction: "increase",
      category: "environment",
      reason: "Caso con operativa detenida — overhead de comunicación + escalamiento.",
    });
  }
  if (ctx.affectsBilling || ctx.affectsDelivery || ctx.affectsReceiving) {
    adj.push({
      factor: "Afecta proceso operativo clave",
      impact: 1.08,
      direction: "increase",
      category: "environment",
      reason: "Impacta facturación / entrega / recepción — requiere coordinación con negocio.",
    });
  }

  // ── Knowledge availability ────────────────────────────────
  if (hasPlaybook) {
    adj.push({
      factor: "Playbook aplicable existente",
      impact: 0.80,
      direction: "decrease",
      category: "knowledge_availability",
      reason: "Procedimiento estándar disponible: ejecución guiada reduce variabilidad.",
    });
  }
  if (input.hasPublishedKnowledge) {
    adj.push({
      factor: "Conocimiento curado disponible",
      impact: 0.90,
      direction: "decrease",
      category: "knowledge_availability",
      reason: "Knowledge base contiene casos referencia para este escenario.",
    });
  }

  // ── Historical ────────────────────────────────────────────
  if (similarCount >= 2) {
    adj.push({
      factor: "Casos históricos similares encontrados",
      impact: 0.92,
      direction: "decrease",
      category: "historical",
      reason: `${similarCount} casos históricos similares — el rango se calibra contra histórico real.`,
    });
  } else if (similarCount === 0) {
    adj.push({
      factor: "Sin casos históricos similares",
      impact: 1.10,
      direction: "increase",
      category: "historical",
      reason: "Caso atípico — sin histórico para validar el rango, más incertidumbre.",
    });
  }

  // ── Risk ──────────────────────────────────────────────────
  if (ctx.isIntermittent) {
    adj.push({
      factor: "Problema intermitente",
      impact: 1.20,
      direction: "increase",
      category: "risk",
      reason: "Falla intermitente: reproducción puede demorar y costar tiempo extra.",
    });
  }
  if (ctx.affectsMultiplePlants || ctx.affectsMultipleUsers) {
    adj.push({
      factor: "Impacto multi-usuario / multi-centro",
      impact: 1.05,
      direction: "increase",
      category: "risk",
      reason: "Scope ampliado: comunicación + validación con múltiples stakeholders.",
    });
  }

  return adj;
}

// ============================================================
// Aplicar adjustments a un rango baseline
// ============================================================

function applyAdjustments(
  minH: number,
  maxH: number,
  adjustments: ContextualAdjustment[],
): { minH: number; maxH: number; totalMultiplier: number } {
  // Separar increases y decreases para aplicar cap por dirección. Si solo
  // multiplicamos todos sin segregar, 4 multiplicadores de 1.20 dan 2.07x
  // (escalado exponencial), lo cual explota la banda. Acá cada categoría
  // contribuye con magnitud sub-lineal: producto de magnitudes individuales
  // pero capeado por categoría.
  const byCategoryUp = new Map<string, number>();
  const byCategoryDown = new Map<string, number>();
  let totalDelta = 0;

  for (const a of adjustments) {
    if (a.hoursDelta) totalDelta += a.hoursDelta;
    if (a.direction === "increase") {
      // Tomar el MAYOR multiplier por categoría (no acumular)
      const cur = byCategoryUp.get(a.category) ?? 1;
      byCategoryUp.set(a.category, Math.max(cur, a.impact));
    } else if (a.direction === "decrease") {
      // Tomar el MENOR multiplier por categoría (más descuento)
      const cur = byCategoryDown.get(a.category) ?? 1;
      byCategoryDown.set(a.category, Math.min(cur, a.impact));
    }
  }

  // Multiplicar las contribuciones por categoría — cada categoría aporta máx 1
  let multiplier = 1;
  for (const v of byCategoryUp.values()) multiplier *= v;
  for (const v of byCategoryDown.values()) multiplier *= v;

  // Cap estricto: máximo 1.8x (subir), mínimo 0.6x (bajar)
  multiplier = Math.max(0.6, Math.min(1.8, multiplier));

  return {
    minH: Math.max(0.25, minH * multiplier + totalDelta * 0.6),
    maxH: maxH * multiplier + totalDelta,
    totalMultiplier: multiplier,
  };
}

// ============================================================
// Confianza global
// ============================================================

function computeContextualConfidence(opts: {
  baselineScore: number;
  textQualityScore: number;
  similarCount: number;
  hasPlaybook: boolean;
  objectCount: number;
  envInformed: boolean;
}): { confidence: ConfidenceLevel; score: number } {
  let s = 0;
  s += opts.baselineScore * 0.30;       // base
  s += opts.textQualityScore * 0.30;    // calidad del texto
  s += opts.similarCount >= 3 ? 18 : opts.similarCount * 6;
  s += opts.hasPlaybook ? 10 : 0;
  s += Math.min(8, opts.objectCount * 2);
  s += opts.envInformed ? 4 : 0;
  s = Math.max(0, Math.min(100, Math.round(s)));
  const confidence: ConfidenceLevel = s >= 75 ? "HIGH" : s <= 45 ? "LOW" : "MEDIUM";
  return { confidence, score: s };
}

// ============================================================
// Escenarios
// ============================================================

function buildScenarios(
  totalMin: number,
  totalMax: number,
  ctx: DetectedSapContext,
  similarCases: ReturnType<typeof findSimilarHistoricalCases>,
  hasPlaybook: boolean,
): { optimistic: ContextualScenario; expected: ContextualScenario; pessimistic: ContextualScenario; expectedMid: number } {
  const expected = +(((totalMin + totalMax) / 2)).toFixed(1);
  const optimistic = +((totalMin * 0.85).toFixed(1));
  const pessimistic = +((totalMax * 1.05).toFixed(1));

  // Si hay casos similares, usar median del histórico como guideline
  const agg = aggregateSimilarCases(similarCases);
  const finalOptimistic = Math.min(optimistic, agg.minHours > 0 ? agg.minHours : optimistic);
  const finalPessimistic = Math.max(pessimistic, agg.maxHours > 0 ? agg.maxHours * 1.1 : pessimistic);
  const finalExpected = agg.medianHours > 0
    ? +((expected * 0.5 + agg.medianHours * 0.5).toFixed(1))
    : expected;

  // Assumptions por escenario
  const optimisticAssumptions = [
    "Caso conocido o cubierto por knowledge / playbook.",
    "Datos completos (módulo, transacción, error, documento) desde el inicio.",
    "Reproducción inmediata en QA.",
    "No requiere desarrollo ni transporte.",
  ];
  const expectedAssumptions = [
    "Análisis funcional estándar AMS.",
    "Validación con key user en horario hábil.",
    "Solución funcional probable sin desarrollo extenso.",
  ];
  const pessimisticAssumptions = [
    "Datos incompletos — overhead de discovery.",
    ctx.requiresDevelopment ? "Requiere desarrollo ABAP + pruebas." : "Posible escalación técnica.",
    ctx.requiresIntegration ? "Coordinación con sistema externo." : "Requiere transporte controlado.",
    "Pruebas UAT + ventana de cutover.",
  ];

  return {
    optimistic: {
      hours: finalOptimistic,
      businessDays: +(finalOptimistic / 8).toFixed(1),
      explanation: hasPlaybook
        ? `Si el playbook aplica directamente: resolución en ${finalOptimistic}h.`
        : `Caso conocido sin sorpresas: resolución en ${finalOptimistic}h.`,
      assumptions: optimisticAssumptions,
    },
    expected: {
      hours: finalExpected,
      businessDays: +(finalExpected / 8).toFixed(1),
      explanation: agg.count > 0
        ? `Mediana de ${agg.count} casos similares: ${agg.medianHours}h. Esperado de este caso: ${finalExpected}h.`
        : `Estimación esperada según análisis contextual: ${finalExpected}h.`,
      assumptions: expectedAssumptions,
    },
    pessimistic: {
      hours: finalPessimistic,
      businessDays: +(finalPessimistic / 8).toFixed(1),
      explanation: `Si aparecen complicaciones (desarrollo, integración, UAT): hasta ${finalPessimistic}h.`,
      assumptions: pessimisticAssumptions,
    },
    expectedMid: finalExpected,
  };
}

// ============================================================
// Fases enriquecidas (con razones explícitas)
// ============================================================

function buildContextualPhases(
  ctx: DetectedSapContext,
  hasPlaybook: boolean,
  similarCount: number,
): ContextualPhase[] {
  const phases: ContextualPhase[] = [];
  let order = 0;
  const next = (
    name: string, reason: string,
    minH: number, expectedH: number, maxH: number,
    owner: RequiredProfile, required = true,
    confidence: ConfidenceLevel = "MEDIUM",
  ): ContextualPhase => ({
    id: `phase_${++order}`,
    order, name, reason,
    minHours: minH, expectedHours: expectedH, maxHours: maxH,
    ownerProfile: owner, required, confidence,
  });

  phases.push(next("Intake y clasificación",
    "Validar prioridad real + módulo + ambiente afectado.",
    0.25, 0.5, 1, "AMS_LEAD", true, "HIGH"));

  phases.push(next("Revisión de información",
    ctx.textQualityScore < 50
      ? "Información incompleta — buscar/pedir datos faltantes."
      : "Validar datos del ticket antes de invertir tiempo.",
    0.5, 1, 2, "FUNCTIONAL_CONSULTANT", true,
    ctx.textQualityScore < 50 ? "LOW" : "MEDIUM"));

  phases.push(next("Análisis funcional",
    `Diagnóstico en módulo ${ctx.module} / ${ctx.process}.`,
    0.5, 1.5, 3, "FUNCTIONAL_CONSULTANT", true,
    ctx.hasExplicitErrorMessage ? "HIGH" : "MEDIUM"));

  if (ctx.requiresDevelopment || ctx.module === "BASIS" || ctx.issueType === "incident_technical") {
    phases.push(next("Análisis técnico",
      "Logs ABAP / dumps ST22 / debug.",
      1, 2, 4, "ABAP_DEVELOPER", true, "MEDIUM"));
  }

  phases.push(next("Reproducción del error",
    ctx.hasReproduction
      ? "Pasos de reproducción ya están en el ticket."
      : "Construir pasos para reproducir en QA.",
    0.5, 1, 2.5, "FUNCTIONAL_CONSULTANT", true,
    ctx.hasReproduction ? "HIGH" : "LOW"));

  phases.push(next("Identificación de causa raíz",
    "Determinar root cause definitivo.",
    0.5, 1.5, 3, "FUNCTIONAL_CONSULTANT", true, "MEDIUM"));

  phases.push(next("Corrección o workaround",
    hasPlaybook
      ? "Ejecutar pasos del playbook aplicable."
      : "Implementar solución (config / data / workaround).",
    0.5, 2, 5, "FUNCTIONAL_CONSULTANT", true,
    hasPlaybook ? "HIGH" : "MEDIUM"));

  if (ctx.requiresDevelopment) {
    phases.push(next("Desarrollo",
      "Cambios de código ABAP / BTP / enhancement.",
      4, 12, 32, "ABAP_DEVELOPER", true, "LOW"));
    phases.push(next("Pruebas unitarias",
      "PU del developer en DEV.",
      1, 3, 6, "ABAP_DEVELOPER", true, "MEDIUM"));
  }

  if (ctx.requiresIntegration) {
    phases.push(next("Análisis middleware / payload",
      "Revisar mapping CPI / PI-PO + payload IDoc/API.",
      1, 2, 4, "INTEGRATION_CONSULTANT", true, "MEDIUM"));
    phases.push(next("Reproceso integración",
      "Reproceso IDoc (BD87/WE19) o re-trigger API.",
      0.5, 1, 2, "INTEGRATION_CONSULTANT", true, "MEDIUM"));
    phases.push(next("Validación end-to-end",
      "Confirmar flujo completo SAP → externo → SAP.",
      0.5, 1, 2, "INTEGRATION_CONSULTANT", true, "MEDIUM"));
  }

  if (ctx.requiresUAT) {
    phases.push(next("UAT",
      "Validación con key user en QA/UAT.",
      1, 2, 5, "KEY_USER", true, "MEDIUM"));
  }

  if (ctx.requiresTransport) {
    phases.push(next("Preparación transporte",
      "TR + downloads + plan back-out.",
      0.5, 1, 2, "BASIS_CONSULTANT", true, "MEDIUM"));
    phases.push(next("Pruebas QA",
      "Suite QA post-transporte.",
      0.5, 1.5, 3, "TESTING_CONSULTANT", true, "MEDIUM"));
    phases.push(next("Validación post-transporte",
      "Verificar en PRD que el TR resolvió y no rompió.",
      0.5, 1, 2, "AMS_LEAD", true, "MEDIUM"));
  }

  phases.push(next("Comunicación al cliente",
    "Update + cierre con el solicitante.",
    0.25, 0.5, 1, "AMS_LEAD", true, "HIGH"));

  phases.push(next("Documentación / RCA",
    similarCount === 0
      ? "Documentar el caso nuevo — sin histórico previo."
      : "Cerrar KB / actualizar playbook con este caso.",
    0.25, 0.75, 1.5, "FUNCTIONAL_CONSULTANT", false, "HIGH"));

  phases.push(next("Cierre / escalamiento",
    ctx.severity === "CRITICAL" ? "Posible escalación N2 si no se resuelve en plazo." : "Cierre estándar.",
    0.1, 0.5, 1, "AMS_LEAD", true, "HIGH"));

  return phases;
}

// ============================================================
// Datos faltantes
// ============================================================

function buildMissingData(ctx: DetectedSapContext, input: ContextualEstimationInput): string[] {
  const m: string[] = [];
  if (ctx.module === "NO_INFORMADO") m.push("Indicar módulo SAP afectado (MM / SD / PP / WM / EWM / QM / FI / etc).");
  if (ctx.transactions.length === 0) m.push("Indicar la transacción SAP donde se observa el problema.");
  if (ctx.errorCodes.length === 0 && !ctx.hasExplicitErrorMessage) m.push("Agregar mensaje de error SAP exacto + captura.");
  if (ctx.environment === "NO_INFORMADO") m.push("Confirmar ambiente exacto (DEV / QA / UAT / PRD / SANDBOX).");
  if (ctx.objectCount === 0) m.push("Informar número de documento SAP afectado (OC / pedido / entrega / IDoc / etc).");
  if (!ctx.hasReproduction) m.push("Indicar si el problema se reproduce siempre o es intermitente.");
  if (ctx.isProductive && !input.isProductive) m.push("Confirmar impacto operativo en negocio (cuántos usuarios / cuántos procesos afectados).");
  if (!ctx.sapObjects.user && ctx.issueType === "authorization_issue") m.push("Indicar usuario SAP afectado para análisis SU53.");
  if (!input.title || input.title.length < 10) m.push("Título más descriptivo (mínimo módulo + transacción + síntoma).");
  if (!input.description || input.description.length < 50) m.push("Descripción más detallada del comportamiento esperado vs observado.");
  return m;
}

// ============================================================
// Recomendaciones
// ============================================================

function buildRecommendations(
  ctx: DetectedSapContext,
  similarCount: number,
  hasPlaybook: boolean,
  missingDataCount: number,
): ContextualRecommendation[] {
  const recs: ContextualRecommendation[] = [];
  let i = 0;
  const push = (
    kind: ContextualRecommendation["kind"], title: string, description: string,
    expectedImpact: ContextualRecommendation["expectedImpact"],
  ) => recs.push({ id: `rec_${++i}`, kind, title, description, expectedImpact });

  if (missingDataCount >= 3) {
    push("improve_estimation",
      "Mejorar información del caso antes de comprometer una hora",
      `Faltan ${missingDataCount} datos clave. Estimar con mejor input puede ajustar la banda en ±30%.`,
      5);
  }
  if (!ctx.hasScreenshot && ctx.hasExplicitErrorMessage) {
    push("request_evidence",
      "Pedir captura del error al usuario",
      "Hay mención de error pero no captura. Una imagen acelera el diagnóstico funcional.",
      4);
  }
  if (hasPlaybook) {
    push("use_playbook",
      "Ejecutar playbook aplicable",
      "Hay procedimiento estándar para este escenario. Reduce el rango y la incertidumbre.",
      5);
  }
  if (!hasPlaybook && similarCount >= 2) {
    push("open_rca",
      "Abrir RCA + crear playbook al cerrar",
      "Hay histórico de casos similares pero no playbook. Curar un playbook al cierre acelera el próximo caso.",
      4);
  }
  if (ctx.severity === "CRITICAL" || ctx.hasOperationHalted) {
    push("escalate_n2",
      "Considerar escalamiento N2 ahora",
      "Severidad crítica + operación afectada — escalar temprano evita penalizaciones SLA.",
      5);
  }
  if (ctx.issueType === "change_with_development" || ctx.requiresDevelopment) {
    push("create_jira",
      "Crear Jira / Change Request",
      "Cambio con desarrollo: registrar en Jira con scope, spec técnica y estimación.",
      4);
  }
  if (ctx.objectCount === 0 && ctx.module !== "NO_INFORMADO") {
    push("ask_user",
      "Preguntar al usuario el documento SAP afectado",
      `Sin documento SAP referenciado, el análisis de ${ctx.module} arranca a ciegas.`,
      4);
  }
  if (ctx.environment === "NO_INFORMADO") {
    push("validate_data",
      "Confirmar ambiente exacto",
      "El motor asume PRD como peor caso. Confirmar ambiente real puede reducir la banda 15-20%.",
      3);
  }
  return recs;
}

// ============================================================
// Client response draft
// ============================================================

function buildClientResponseDraft(
  inputTitle: string,
  ctx: DetectedSapContext,
  totalMin: number,
  totalMax: number,
  expected: number,
  confidence: ConfidenceLevel,
  missingData: string[],
): string {
  const days = `${+(totalMin / 8).toFixed(1)} – ${+(totalMax / 8).toFixed(1)} días hábiles`;
  const confLbl = confidence === "HIGH" ? "alta" : confidence === "LOW" ? "baja" : "media";
  const closing = missingData.length >= 2
    ? `\nPara cerrar la banda con mayor precisión necesitaríamos:\n${missingData.map((m) => `- ${m}`).join("\n")}`
    : "\nQuedamos atentos a tu confirmación para avanzar.";
  const lines = [
    `Estimado/a,`,
    ``,
    `Tras revisar "${inputTitle}" (módulo ${ctx.module} · ${ctx.process}), nuestra estimación inicial es:`,
    ``,
    `- **Esfuerzo estimado**: ${totalMin}h – ${totalMax}h (${days}). Esperado: ~${expected}h.`,
    `- **Confianza**: ${confLbl} — ${ctx.detectionReasons.length} señales contextuales identificadas.`,
    `- **Tipo de caso**: ${ctx.issueType.replace(/_/g, " ")}.`,
    `${ctx.transactions.length ? `- **Transacciones involucradas**: ${ctx.transactions.join(", ")}.` : ""}`,
    `${ctx.errorCodes.length ? `- **Códigos de error detectados**: ${ctx.errorCodes.join(", ")}.` : ""}`,
    closing,
    ``,
    `Saludos,`,
    `Equipo AMS`,
  ].filter(Boolean);
  return lines.join("\n");
}

// ============================================================
// Playbook matching (heurístico simple — se puede mejorar con usePlaybooks)
// ============================================================

function matchPlaybookForEstimation(
  ctx: DetectedSapContext,
  input: ContextualEstimationInput,
): PlaybookMatch | null {
  if (input.hasPlaybook === false) return null;
  // El frontend pasa hasPlaybook=true si encuentra match con usePlaybooks.
  // Acá hacemos un fallback heurístico para BACKEND / casos sin frontend.
  if (input.hasPlaybook === true) {
    return {
      playbookId: "pb_external_match",
      playbookTitle: `Playbook ${ctx.module} aplicable`,
      matchScore: 0.85,
      steps: 8,
      estimatedMinutes: 240,
      reasons: ["Match indicado por consumer (hasPlaybook=true)"],
    };
  }
  // Heurística: si severidad CRITICAL + PRD, asumir playbook "Incidente P1 productivo"
  if (ctx.severity === "CRITICAL" && ctx.isProductive) {
    return {
      playbookId: "pb_p1_productive",
      playbookTitle: "Incidente crítico P1 en productivo",
      matchScore: 0.75,
      steps: 10,
      estimatedMinutes: 180,
      reasons: ["Severidad CRITICAL + ambiente PRD"],
    };
  }
  return null;
}

// ============================================================
// API principal
// ============================================================

/**
 * Estima la resolución de un caso AMS combinando baseline determinístico +
 * análisis contextual + casos históricos similares + playbooks + escenarios.
 *
 * Determinístico, sin LLM. Preparado para integrar IA en fase futura
 * (cuando el backend exponga endpoints de visión / extracción semántica).
 */
export function estimateAmsResolutionContextually(
  input: ContextualEstimationInput,
): ContextualEstimationResult {
  // 1. Detectar contexto del texto
  const detectedContext = analyzeTicketTextForEstimation({
    title: input.title,
    description: input.description,
    comments: input.comments,
    errorMessage: input.errorMessage,
    transcription: input.transcription,
    hintModule: input.sapModule as never,
    hintEnvironment: input.environment as never,
  });

  // 2. Baseline determinístico — usamos el ticket engine porque es más cercano
  //    a la semántica de "estimar un caso" (incidente/change/etc) que el
  //    motor de proyectos. El motor de proyectos queda como fallback opcional.
  const ticketInput = toTicketEstimateInput(input, detectedContext);
  const baseline = autoEstimateTicketResolution(ticketInput);
  const baselineEstimate = {
    minHours: baseline.totalMinHours,
    maxHours: baseline.totalMaxHours,
    confidence: baseline.confidence,
    confidenceScore: baseline.confidenceScore,
    source: "ticket_engine" as const,
  };

  // 3. Casos históricos similares
  const similarCases = findSimilarHistoricalCases(detectedContext, {
    topN: 3,
    minScore: 0.25,
    extraText: input.title,
  });

  // 4. Playbook match
  const playbookMatch = matchPlaybookForEstimation(detectedContext, input);

  // 5. Adjustments
  const contextualAdjustments = buildContextualAdjustments(
    detectedContext, input, similarCases.length, !!playbookMatch,
  );

  // 6. Aplicar adjustments al baseline
  const { minH: rawMin, maxH: rawMax } = applyAdjustments(
    baseline.totalMinHours, baseline.totalMaxHours, contextualAdjustments,
  );

  // 6b. Cap realista por issueType (respeta histórico SOLO de casos del MISMO
  //     issueType — un caso ABAP dump (incident_technical) NO debe inflar el
  //     cap de un caso de autorización simple aunque sean mismo módulo).
  const sameTypeCases = similarCases.filter((c) => c.issueType === detectedContext.issueType);
  const histMax = sameTypeCases.length > 0
    ? Math.max(...sameTypeCases.map((c) => c.actualResolutionHours))
    : 0;
  const { minH: adjustedMin, maxH: adjustedMax } = applyRealisticCap(
    detectedContext.issueType, rawMin, rawMax, histMax,
  );

  // 7. Escenarios — usar solo casos del mismo issueType para el histórico
  //    pesimista/optimista, evita contaminación cross-tipo.
  const scenarios = buildScenarios(
    adjustedMin, adjustedMax, detectedContext, sameTypeCases.length > 0 ? sameTypeCases : similarCases, !!playbookMatch,
  );

  // 8. Phase breakdown contextual
  const phaseBreakdown = buildContextualPhases(detectedContext, !!playbookMatch, similarCases.length);

  // 9. Confianza global
  const { confidence, score: confidenceScore } = computeContextualConfidence({
    baselineScore: baseline.confidenceScore,
    textQualityScore: detectedContext.textQualityScore,
    similarCount: similarCases.length,
    hasPlaybook: !!playbookMatch,
    objectCount: detectedContext.objectCount,
    envInformed: detectedContext.environment !== "NO_INFORMADO",
  });

  // 10. Missing data + recommendations
  const missingData = buildMissingData(detectedContext, input);
  const recommendations = buildRecommendations(
    detectedContext, similarCases.length, !!playbookMatch, missingData.length,
  );

  // 11. Total range coherente con escenarios
  const totalMin = scenarios.optimistic.hours;
  const totalMax = scenarios.pessimistic.hours;
  const expected = scenarios.expected.hours;

  // 12. Client response draft
  const clientResponseDraft = buildClientResponseDraft(
    input.title || "Caso AMS", detectedContext, totalMin, totalMax, expected, confidence, missingData,
  );

  // 13. NBA específica del estimador
  const nextBestAction = missingData.length >= 3
    ? {
        label: "Mejorar la información del caso",
        description: `Hay ${missingData.length} datos faltantes que mejorarían la estimación significativamente.`,
        cta: "Pedir datos al usuario",
      }
    : !playbookMatch && detectedContext.severity !== "CRITICAL" && similarCases.length === 0
      ? {
          label: "Levantar más contexto histórico",
          description: "No hay playbook ni casos similares. Considerá crear un playbook al cerrar.",
          cta: "Buscar en knowledge base",
        }
      : detectedContext.severity === "CRITICAL"
        ? {
            label: "Iniciar contención + escalar N2",
            description: "Caso crítico — activar playbook P1 + asignar especialista N2.",
            cta: "Escalar N2",
          }
        : {
            label: "Comenzar análisis funcional",
            description: "Información suficiente para arrancar diagnóstico.",
            cta: "Marcar como en análisis",
          };

  // 14. Risks y assumptions consolidados
  const assumptions: string[] = [
    `Estimación basada en contexto detectado (${detectedContext.detectionReasons.length} señales).`,
    `Horario hábil 9×5 sin recargos nocturnos ni de fin de semana.`,
    `Equipo cliente disponible para validar fix en ventana acordada.`,
  ];
  if (playbookMatch) {
    assumptions.push(`Existe playbook aplicable ("${playbookMatch.playbookTitle}") — se asume su reutilización.`);
  }
  if (similarCases.length > 0) {
    const agg = aggregateSimilarCases(similarCases);
    assumptions.push(`Histórico de ${similarCases.length} casos similares — mediana ${agg.medianHours}h.`);
  }
  // Calibration mode honesto
  if (baseline.calibrationMode === "BOOTSTRAP") {
    assumptions.push("Motor en modo BOOTSTRAP: bandas ampliadas hasta tener 20+ cierres reales del cliente.");
  }

  const risks: string[] = [];
  if (detectedContext.transactions.length > 2) {
    risks.push("Caso con múltiples flujos involucrados — alcance puede crecer.");
  }
  if (detectedContext.isProductive && detectedContext.severity === "CRITICAL") {
    risks.push("Productivo + crítico: cualquier desliz tiene impacto inmediato al negocio.");
  }
  if (detectedContext.requiresIntegration) {
    risks.push("Depende de sistema externo — latencia y disponibilidad fuera de nuestro control.");
  }
  if (detectedContext.requiresDevelopment) {
    risks.push("Desarrollo ABAP: variabilidad amplia hasta cerrar spec técnica.");
  }
  if (detectedContext.isIntermittent) {
    risks.push("Problema intermitente — reproducción puede demorar.");
  }
  if (detectedContext.textQualityScore < 40) {
    risks.push(`Calidad de información ${detectedContext.textQualityScore}/100 — rango con incertidumbre elevada.`);
  }

  // 15. Notas internas — debug
  const internalNotes = [
    `Engine v${ENGINE_VERSION}`,
    `Detector: ${detectedContext.detectionReasons.length} señales`,
    `Baseline: ${baseline.totalMinHours}h-${baseline.totalMaxHours}h (conf ${baseline.confidenceScore})`,
    `Adjustments: ${contextualAdjustments.length} factores aplicados`,
    `Similar cases: ${similarCases.length}`,
    `Playbook: ${playbookMatch ? playbookMatch.playbookTitle : "—"}`,
    `Final: ${totalMin}h-${totalMax}h (conf ${confidenceScore})`,
  ].join(" · ");

  return {
    estimateId: uid("ctx_est"),
    createdAt: now(),
    engineVersion: ENGINE_VERSION,

    inputSummary: {
      title: input.title,
      descriptionExcerpt: (input.description || "").slice(0, 240),
      sapModuleHint: input.sapModule,
      environmentHint: input.environment,
    },

    detectedContext,
    baselineEstimate,
    contextualAdjustments,
    similarCases,
    playbookMatch,

    optimisticScenario: scenarios.optimistic,
    expectedScenario: scenarios.expected,
    pessimisticScenario: scenarios.pessimistic,

    totalRange: {
      minHours: +totalMin.toFixed(1),
      expectedHours: +expected.toFixed(1),
      maxHours: +totalMax.toFixed(1),
      minBusinessDays: +(totalMin / 8).toFixed(1),
      expectedBusinessDays: +(expected / 8).toFixed(1),
      maxBusinessDays: +(totalMax / 8).toFixed(1),
    },

    phaseBreakdown,
    confidence, confidenceScore,
    assumptions, risks,
    missingData,
    recommendations,
    nextBestAction,
    clientResponseDraft,
    internalNotes,

    calibrationMode: baseline.calibrationMode,
  };
}

// ============================================================
// Fallback: si alguien quiere usar el motor de proyectos como baseline
// ============================================================

/**
 * Variante que usa el motor de proyectos (estimate) como baseline en lugar
 * del motor de tickets. Útil para /time-estimator cuando se está cotizando
 * un cambio mayor, no un incidente.
 */
export function estimateAmsResolutionContextuallyAsProject(
  input: ContextualEstimationInput,
): ContextualEstimationResult {
  // Mismo flow pero con el otro engine como baseline
  const detectedContext = analyzeTicketTextForEstimation({
    title: input.title, description: input.description, comments: input.comments,
    errorMessage: input.errorMessage, transcription: input.transcription,
    hintModule: input.sapModule as never, hintEnvironment: input.environment as never,
  });
  const projectInput = toProjectEstimateInput(input, detectedContext);
  const proj = estimateProject(projectInput);

  // Reusamos la función principal pero con baseline distinto
  const result = estimateAmsResolutionContextually(input);
  result.baselineEstimate = {
    minHours: proj.estimatedMinHours,
    maxHours: proj.estimatedMaxHours,
    confidence: proj.confidence,
    confidenceScore: proj.confidenceScore,
    source: "project_engine",
  };
  return result;
}
