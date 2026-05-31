// Motor determinístico de estimación de tiempos AMS.
// Sin LLM en Fase 1. Reglas + tablas calibradas con bandas (min/max).
// El objetivo: dado un EstimateInput, devolver horas, días, fases, riesgos,
// supuestos y un cliente-response listo para enviar.

import type {
  EstimateInput, EstimateType, ComplexityLevel, SeverityLevel,
  UrgencyLevel, EnvironmentLevel, RequiredProfile,
  EstimationResult, EstimatePhase, ConfidenceLevel,
} from "@/types/estimation";

// ============================================================
// Tablas base (horas) por tipo de estimación
// ============================================================

const BASE_HOURS: Record<EstimateType, { min: number; max: number }> = {
  INCIDENT_ANALYSIS:       { min: 1,    max: 4   },
  INCIDENT_RESOLUTION:     { min: 2,    max: 12  },
  CHANGE_REQUEST:          { min: 8,    max: 40  },
  SAP_CONFIGURATION:       { min: 4,    max: 24  },
  SAP_DEVELOPMENT:         { min: 16,   max: 80  },
  SAP_INTEGRATION:         { min: 24,   max: 120 },
  TESTING:                 { min: 8,    max: 40  },
  GO_LIVE:                 { min: 40,   max: 160 },
  HYPERCARE:               { min: 80,   max: 320 },
  AMS_SUPPORT:             { min: 80,   max: 160 }, // mensual
  PROJECT_IMPLEMENTATION:  { min: 400,  max: 2000 },
  SCOPE_ITEM_ACTIVATION:   { min: 40,   max: 160 },
  DOCUMENTATION:           { min: 4,    max: 16  },
  TRAINING:                { min: 8,    max: 24  },
};

// ============================================================
// Multiplicadores
// ============================================================

const COMPLEXITY_MULT: Record<ComplexityLevel, number> = {
  VERY_LOW: 0.6, LOW: 0.8, MEDIUM: 1.0, HIGH: 1.4, VERY_HIGH: 1.9, UNKNOWN: 1.2,
};

const SEVERITY_MULT: Record<SeverityLevel, number> = {
  LOW: 0.95, MEDIUM: 1.0, HIGH: 1.10, CRITICAL: 1.25,
};

const URGENCY_MULT: Record<UrgencyLevel, number> = {
  NORMAL: 1.0, URGENT: 1.15, IMMEDIATE: 1.30,
};

const ENV_MULT: Record<EnvironmentLevel, number> = {
  DEV: 0.9, QA: 1.0, UAT: 1.05, PRD: 1.20, SANDBOX: 0.85, TRAINING: 0.85, NO_INFORMADO: 1.0,
};

// ============================================================
// Catálogo de fases por tipo
// ============================================================

function phase(
  id: string, name: string, description: string,
  minH: number, maxH: number, owner: RequiredProfile,
  dependencies: string[] = [], deliverables: string[] = [], risks: string[] = [],
): EstimatePhase {
  return { id, name, description, minHours: minH, maxHours: maxH, ownerProfile: owner, dependencies, deliverables, risks };
}

function basePhases(type: EstimateType, mod: string): EstimatePhase[] {
  switch (type) {
    case "INCIDENT_ANALYSIS":
      return [
        phase("p1", "Triage", "Categorización, validación de impacto y módulo afectado.", 0.5, 1, "AMS_LEAD",
          [], ["Ticket actualizado con prioridad"], ["Falta contexto del key user"]),
        phase("p2", "Diagnóstico", `Investigación funcional ${mod} en sistema productivo.`, 1, 3, "FUNCTIONAL_CONSULTANT",
          ["p1"], ["RCA preliminar", "Logs adjuntos"], ["No reproducible en QA"]),
      ];
    case "INCIDENT_RESOLUTION":
      return [
        phase("p1", "Diagnóstico", `Validación del caso y root cause ${mod}.`, 1, 3, "FUNCTIONAL_CONSULTANT", [],
          ["RCA documentado"], ["Causa raíz desconocida al inicio"]),
        phase("p2", "Solución", "Implementación del fix (config o nota SAP).", 1, 6, "FUNCTIONAL_CONSULTANT", ["p1"],
          ["Solución en DEV"], ["Fix requiere desarrollo ABAP"]),
        phase("p3", "Validación", "Pruebas con key user + transporte controlado.", 0.5, 3, "TESTING_CONSULTANT", ["p2"],
          ["Evidencia de prueba", "Transport request"], ["Window de transporte fuera de horario"]),
      ];
    case "CHANGE_REQUEST":
      return [
        phase("p1", "Análisis funcional", "Levantamiento de requerimiento + spec.", 4, 12, "FUNCTIONAL_CONSULTANT", [],
          ["Spec funcional firmada"], ["Alcance no acotado"]),
        phase("p2", "Estimación + aprobación", "Estimación detallada y firma de Change Advisory Board.", 1, 4, "AMS_LEAD", ["p1"],
          ["Acta de aprobación"], ["CAB demora aprobación"]),
        phase("p3", "Construcción", "Configuración o desarrollo según corresponda.", 4, 16, "FUNCTIONAL_CONSULTANT", ["p2"],
          ["Solución en DEV"], []),
        phase("p4", "Pruebas + cutover", "QA, UAT y promoción a PRD con plan de back-out.", 2, 8, "TESTING_CONSULTANT", ["p3"],
          ["UAT firmada", "Cutover ejecutado"], ["No hay key user disponible"]),
      ];
    case "SAP_CONFIGURATION":
      return [
        phase("p1", "Diseño funcional", `Definición de variantes ${mod}, dependencias y owners.`, 2, 6, "FUNCTIONAL_CONSULTANT", [],
          ["Diseño funcional"], ["Customizing colisiona con BAU"]),
        phase("p2", "Configuración", "Customizing en DEV con documentación inline.", 2, 10, "FUNCTIONAL_CONSULTANT", ["p1"],
          ["Customizing en DEV"], []),
        phase("p3", "Pruebas + transporte", "Pruebas funcionales + TR controlado.", 1, 6, "TESTING_CONSULTANT", ["p2"],
          ["Transport request liberado"], ["Pruebas insuficientes en QA"]),
      ];
    case "SAP_DEVELOPMENT":
      return [
        phase("p1", "Spec técnica", "Documento técnico ABAP/BTP a partir de la spec funcional.", 4, 12, "ABAP_DEVELOPER", [],
          ["Spec técnica firmada"], ["Spec funcional incompleta"]),
        phase("p2", "Desarrollo", "Codificación + revisión por pares.", 12, 48, "ABAP_DEVELOPER", ["p1"],
          ["Objeto Z transportable"], ["Refactor por cambio de scope"]),
        phase("p3", "Pruebas unitarias", "PU + integración con módulos ligados.", 4, 12, "ABAP_DEVELOPER", ["p2"],
          ["Reporte PU"], ["Defectos descubiertos en QA"]),
        phase("p4", "QA + UAT", "QA funcional + UAT con key user.", 4, 16, "TESTING_CONSULTANT", ["p3"],
          ["UAT firmada"], []),
      ];
    case "SAP_INTEGRATION":
      return [
        phase("p1", "Diseño de integración", "Diagrama, contratos y mapeo de campos.", 8, 24, "INTEGRATION_CONSULTANT", [],
          ["Documento de diseño"], ["Sistema externo sin sandbox"]),
        phase("p2", "Construcción interfaz", "Implementación en CPI / PI-PO / BTP.", 12, 56, "INTEGRATION_CONSULTANT", ["p1"],
          ["iflow desplegado"], ["Credenciales no provistas"]),
        phase("p3", "Pruebas end-to-end", "E2E con sistema externo y monitoreo.", 4, 24, "TESTING_CONSULTANT", ["p2"],
          ["Evidencia E2E"], ["Latencia en sistema externo"]),
        phase("p4", "Cutover + handover", "Pase a productivo + handover a soporte.", 2, 16, "BASIS_CONSULTANT", ["p3"],
          ["Manual de operación"], []),
      ];
    case "TESTING":
      return [
        phase("p1", "Plan de pruebas", "Identificación de escenarios y casos.", 2, 8, "TESTING_CONSULTANT", [],
          ["Plan de pruebas"], []),
        phase("p2", "Ejecución", "Ejecución manual + script asistido.", 4, 24, "TESTING_CONSULTANT", ["p1"],
          ["Evidencia adjunta"], ["Defectos bloquean continuación"]),
        phase("p3", "Reporte", "Informe de pruebas + defectos abiertos.", 2, 8, "TESTING_CONSULTANT", ["p2"],
          ["Informe firmado"], []),
      ];
    case "GO_LIVE":
      return [
        phase("p1", "Cutover plan", "Plan detallado de cutover hora por hora.", 8, 24, "PROJECT_MANAGER", [],
          ["Cutover plan v1"], []),
        phase("p2", "Dry runs", "Ensayos con el equipo de cutover.", 16, 48, "AMS_LEAD", ["p1"],
          ["Acta de dry-run 1 y 2"], ["Falla descubierta en dry run"]),
        phase("p3", "Ejecución cutover", "Pase real + checkpoints + go/no-go.", 12, 48, "AMS_LEAD", ["p2"],
          ["Sistema productivo"], ["Roll-back necesario"]),
        phase("p4", "Estabilización", "Monitoreo intensivo primeras 48-72h.", 4, 40, "AMS_LEAD", ["p3"],
          ["Reporte estabilización"], []),
      ];
    case "HYPERCARE":
      return [
        phase("p1", "Setup hypercare", "Definición de SLA, war-room y guardias.", 8, 24, "AMS_LEAD", [],
          ["Plan hypercare"], []),
        phase("p2", "Soporte intensivo", "Atención prioritaria de incidentes + RCA diario.", 60, 240, "AMS_LEAD", ["p1"],
          ["Daily RCA", "Tablero incidentes"], ["Equipo cliente sobrepasado"]),
        phase("p3", "Cierre hypercare", "Handover a operación BAU + lessons learned.", 12, 56, "AMS_LEAD", ["p2"],
          ["Acta cierre hypercare"], []),
      ];
    case "AMS_SUPPORT":
      return [
        phase("p1", "Atención BAU mensual", "Resolución de tickets incoming + reportes.", 64, 128, "AMS_LEAD", [],
          ["Reporte mensual"], ["Acumulado de backlog"]),
        phase("p2", "Mejora continua", "Análisis de top tickets + correcciones preventivas.", 16, 32, "AMS_LEAD", ["p1"],
          ["Plan de mejora"], []),
      ];
    case "PROJECT_IMPLEMENTATION":
      return [
        phase("p1", "Prepare", "Kickoff, set-up, gobernanza.", 40, 120, "PROJECT_MANAGER", [], ["Acta kickoff"], []),
        phase("p2", "Explore", "Workshops fit-to-standard.", 80, 320, "PROJECT_MANAGER", ["p1"], ["BBP / minutas"], ["Gaps no priorizados"]),
        phase("p3", "Realize", "Configuración + desarrollo + pruebas.", 160, 800, "FUNCTIONAL_CONSULTANT", ["p2"], ["Sistema construido"], []),
        phase("p4", "Deploy", "Cutover + go-live.", 80, 320, "AMS_LEAD", ["p3"], ["Sistema productivo"], []),
        phase("p5", "Run", "Hypercare + handover.", 40, 240, "AMS_LEAD", ["p4"], ["Cierre proyecto"], []),
      ];
    case "SCOPE_ITEM_ACTIVATION":
      return [
        phase("p1", "Fit-to-standard", "Workshop con key users sobre el scope item.", 8, 24, "FUNCTIONAL_CONSULTANT", [],
          ["Acta workshop"], []),
        phase("p2", "Activación + customizing", "Activación SSCUI + ajustes.", 16, 56, "FUNCTIONAL_CONSULTANT", ["p1"],
          ["SSCUI activado"], []),
        phase("p3", "Pruebas + handover", "Pruebas e2e + entrega a usuario.", 8, 40, "TESTING_CONSULTANT", ["p2"],
          ["Evidencia E2E"], []),
      ];
    case "DOCUMENTATION":
      return [
        phase("p1", "Levantamiento", "Recolección de información.", 1, 4, "FUNCTIONAL_CONSULTANT", [], ["Borrador"], []),
        phase("p2", "Redacción", "Documento estandarizado.", 2, 8, "FUNCTIONAL_CONSULTANT", ["p1"], ["Documento final"], []),
        phase("p3", "Revisión", "Revisión por pares + publicación.", 1, 4, "AMS_LEAD", ["p2"], ["Documento publicado"], []),
      ];
    case "TRAINING":
      return [
        phase("p1", "Diseño instruccional", "Objetivos + material.", 2, 6, "FUNCTIONAL_CONSULTANT", [], ["Plan instruccional"], []),
        phase("p2", "Sesión + evaluación", "Sesión live + quiz + evidencia.", 4, 12, "FUNCTIONAL_CONSULTANT", ["p1"], ["Evidencia + asistentes"], []),
        phase("p3", "Feedback + ajustes", "Feedback de asistentes + ajustes finales.", 2, 6, "AMS_LEAD", ["p2"], ["Reporte cierre"], []),
      ];
  }
}

// ============================================================
// Profiles por tipo (para sugerencia de equipo)
// ============================================================

const PROFILES_BY_TYPE: Record<EstimateType, RequiredProfile[]> = {
  INCIDENT_ANALYSIS:       ["FUNCTIONAL_CONSULTANT", "AMS_LEAD"],
  INCIDENT_RESOLUTION:     ["FUNCTIONAL_CONSULTANT", "TESTING_CONSULTANT"],
  CHANGE_REQUEST:          ["FUNCTIONAL_CONSULTANT", "AMS_LEAD", "TESTING_CONSULTANT"],
  SAP_CONFIGURATION:       ["FUNCTIONAL_CONSULTANT", "TESTING_CONSULTANT"],
  SAP_DEVELOPMENT:         ["FUNCTIONAL_CONSULTANT", "ABAP_DEVELOPER", "TESTING_CONSULTANT"],
  SAP_INTEGRATION:         ["INTEGRATION_CONSULTANT", "BTP_CONSULTANT", "BASIS_CONSULTANT", "TESTING_CONSULTANT"],
  TESTING:                 ["TESTING_CONSULTANT", "KEY_USER"],
  GO_LIVE:                 ["PROJECT_MANAGER", "AMS_LEAD", "BASIS_CONSULTANT", "FUNCTIONAL_CONSULTANT"],
  HYPERCARE:               ["AMS_LEAD", "FUNCTIONAL_CONSULTANT", "ABAP_DEVELOPER"],
  AMS_SUPPORT:             ["AMS_LEAD", "FUNCTIONAL_CONSULTANT"],
  PROJECT_IMPLEMENTATION:  ["PROJECT_MANAGER", "SAP_ARCHITECT", "FUNCTIONAL_CONSULTANT", "ABAP_DEVELOPER", "TESTING_CONSULTANT"],
  SCOPE_ITEM_ACTIVATION:   ["FUNCTIONAL_CONSULTANT", "KEY_USER", "TESTING_CONSULTANT"],
  DOCUMENTATION:           ["FUNCTIONAL_CONSULTANT", "AMS_LEAD"],
  TRAINING:                ["FUNCTIONAL_CONSULTANT", "KEY_USER"],
};

// ============================================================
// Engine principal
// ============================================================

export function estimate(input: EstimateInput): EstimationResult {
  const type = input.estimateType;
  const complexity = input.complexity ?? "UNKNOWN";
  const severity = input.severity ?? "MEDIUM";
  const urgency = input.urgency ?? "NORMAL";
  const env = input.environment ?? "NO_INFORMADO";
  const mod = (input.sapModule || "SAP").toUpperCase();

  const base = BASE_HOURS[type];
  let minH = base.min;
  let maxH = base.max;

  const mult = COMPLEXITY_MULT[complexity] * SEVERITY_MULT[severity] * URGENCY_MULT[urgency] * ENV_MULT[env];
  minH *= mult;
  maxH *= mult;

  // Bumps por requirements
  const bumps: { label: string; min: number; max: number }[] = [];
  if (input.requiresDevelopment) bumps.push({ label: "Requiere desarrollo ABAP/BTP", min: 8, max: 32 });
  if (input.requiresIntegration) bumps.push({ label: "Requiere integración con sistema externo", min: 8, max: 40 });
  if (input.requiresTransport)   bumps.push({ label: "Requiere transporte controlado", min: 1, max: 4 });
  if (input.requiresUAT)         bumps.push({ label: "Requiere UAT con key user", min: 4, max: 16 });
  if (input.requiresApproval)    bumps.push({ label: "Requiere aprobación CAB", min: 1, max: 8 });
  for (const b of bumps) { minH += b.min; maxH += b.max; }

  // Discounts
  const discounts: { label: string; min: number; max: number }[] = [];
  if (input.hasPlaybook)            discounts.push({ label: "Existe playbook AMS aplicable", min: -1, max: -6 });
  if (input.hasPublishedKnowledge)  discounts.push({ label: "Conocimiento curado publicado", min: -1, max: -4 });
  if (input.hasDocumentation)       discounts.push({ label: "Documentación funcional disponible", min: -0.5, max: -2 });
  if (input.isRepeatedIncident)     discounts.push({ label: "Incidente recurrente con histórico", min: -1, max: -6 });
  for (const d of discounts) { minH += d.min; maxH += d.max; }

  if (minH < 0.5) minH = 0.5;
  if (maxH < minH) maxH = minH * 1.5;

  // Redondeos amigables
  minH = round1(minH);
  maxH = round1(maxH);

  const minDays = +(minH / 8).toFixed(1);
  const maxDays = +(maxH / 8).toFixed(1);
  const weeks   = +(maxDays / 5).toFixed(1);

  // Assumptions / risks / missing data
  const assumptions = buildAssumptions(input);
  const risks = buildRisks(input);
  const missingData = buildMissingData(input);
  const dependencies = buildDependencies(input);

  const requiredProfiles = PROFILES_BY_TYPE[type];

  // Confidence
  const { confidence, score } = scoreConfidence(input, missingData.length);

  // Fases
  const phaseBreakdown = scalePhases(basePhases(type, mod), mult, bumps.reduce((s, b) => s + b.max, 0) / Math.max(1, maxH));

  // Narrative
  const suggestedPlan = renderPlan(input, type, mod, minH, maxH, phaseBreakdown);
  const clientResponse = renderClientResponse(input, type, mod, minH, maxH, weeks, confidence);

  return {
    estimatedMinHours: minH,
    estimatedMaxHours: maxH,
    estimatedMinDays: minDays,
    estimatedMaxDays: maxDays,
    estimatedWeeks: weeks,
    confidence,
    confidenceScore: score,
    assumptions,
    risks,
    dependencies,
    missingData,
    requiredProfiles,
    phaseBreakdown,
    suggestedPlan,
    clientResponse,
  };
}

// ============================================================
// Helpers
// ============================================================

function round1(n: number): number { return Math.round(n * 10) / 10; }

function scalePhases(phases: EstimatePhase[], mult: number, bumpRatio: number): EstimatePhase[] {
  const factor = mult * (1 + Math.max(0, bumpRatio) * 0.3);
  return phases.map((p) => ({
    ...p,
    minHours: round1(p.minHours * factor),
    maxHours: round1(p.maxHours * factor),
  }));
}

function buildAssumptions(input: EstimateInput): string[] {
  const a: string[] = [];
  a.push(`Estimación basada en módulo ${input.sapModule || "SAP genérico"} y complejidad ${input.complexity ?? "UNKNOWN"}.`);
  a.push("Disponibilidad estándar del equipo cliente (key user reachable en horario AMS).");
  a.push("Horario hábil 9×5 sin recargos de fin de semana ni nocturno.");
  if (input.environment === "PRD") a.push("Pase a productivo requiere ventana validada por el cliente.");
  if (input.requiresUAT) a.push("Existe key user identificado y disponible para UAT.");
  if (!input.requiresApproval) a.push("No requiere paso por Change Advisory Board (CAB).");
  return a;
}

function buildRisks(input: EstimateInput): string[] {
  const r: string[] = [];
  if ((input.complexity ?? "UNKNOWN") === "UNKNOWN") r.push("Complejidad no caracterizada — banda mínima/máxima amplia.");
  if (input.severity === "CRITICAL") r.push("Severidad crítica: prioridad sobre BAU, posible recarga al equipo.");
  if (input.urgency === "IMMEDIATE") r.push("Urgencia inmediata: el cliente espera respuesta en horas, no días.");
  if (input.environment === "PRD") r.push("Trabajo directo sobre productivo: requiere doble verificación y back-out plan.");
  if (input.requiresDevelopment) r.push("Desarrollo ABAP/BTP: variabilidad alta si la spec no está cerrada.");
  if (input.requiresIntegration) r.push("Integración cross-system: depende de disponibilidad y latencia del externo.");
  if (input.requiresApproval) r.push("Cadencia del CAB puede empujar la fecha objetivo.");
  if (input.isProductive && input.severity === "CRITICAL") r.push("Productivo + crítico: cualquier desliz tiene impacto al negocio.");
  return r;
}

function buildMissingData(input: EstimateInput): string[] {
  const m: string[] = [];
  if (!input.sapModule) m.push("Módulo SAP afectado (MM / SD / PP / WM / EWM / QM / PM / Ariba / IBP).");
  if (!input.process) m.push("Proceso de negocio específico (ej. liberación de OC, picking, MRP).");
  if (!input.complexity || input.complexity === "UNKNOWN") m.push("Complejidad funcional/técnica estimada.");
  if (!input.severity) m.push("Severidad/impacto al negocio.");
  if (!input.environment || input.environment === "NO_INFORMADO") m.push("Ambiente objetivo (DEV / QA / UAT / PRD).");
  if (!input.description) m.push("Descripción detallada del incidente o requerimiento.");
  return m;
}

function buildDependencies(input: EstimateInput): string[] {
  const d: string[] = [];
  if (input.requiresApproval) d.push("Aprobación del Change Advisory Board (CAB).");
  if (input.requiresTransport) d.push("Ventana de transporte agendada por Basis.");
  if (input.requiresUAT) d.push("Disponibilidad del key user para UAT.");
  if (input.requiresIntegration) d.push("Credenciales y ambiente del sistema externo.");
  if (input.environment === "PRD") d.push("Plan de back-out validado por el cliente.");
  return d;
}

function scoreConfidence(input: EstimateInput, missingCount: number): { confidence: ConfidenceLevel; score: number } {
  let score = 100;
  if (missingCount > 0) score -= missingCount * 12;
  if ((input.complexity ?? "UNKNOWN") === "UNKNOWN") score -= 10;
  if (!input.description) score -= 5;
  if (input.urgency === "IMMEDIATE") score -= 5;
  if (input.requiresDevelopment) score -= 8;
  if (input.requiresIntegration) score -= 12;
  if (input.hasPlaybook) score += 6;
  if (input.hasPublishedKnowledge) score += 4;
  if (input.isRepeatedIncident) score += 6;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  let confidence: ConfidenceLevel = "MEDIUM";
  if (score >= 75) confidence = "HIGH";
  else if (score <= 45) confidence = "LOW";
  return { confidence, score };
}

function renderPlan(
  input: EstimateInput, type: EstimateType, mod: string,
  minH: number, maxH: number, phases: EstimatePhase[],
): string {
  const lines: string[] = [];
  lines.push(`# Plan estimado · ${input.title}`);
  lines.push("");
  lines.push(`**Tipo:** ${type} · **Módulo:** ${mod} · **Banda:** ${minH}h – ${maxH}h`);
  if (input.targetDate) lines.push(`**Fecha objetivo:** ${input.targetDate}`);
  lines.push("");
  lines.push("## Fases");
  for (const [i, p] of phases.entries()) {
    lines.push(`### ${i + 1}. ${p.name}  *(${p.minHours}h – ${p.maxHours}h · ${p.ownerProfile})*`);
    lines.push(p.description);
    if (p.deliverables.length) lines.push(`- **Entregables:** ${p.deliverables.join(", ")}`);
    if (p.risks.length) lines.push(`- **Riesgos:** ${p.risks.join("; ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderClientResponse(
  input: EstimateInput, type: EstimateType, mod: string,
  minH: number, maxH: number, weeks: number, confidence: ConfidenceLevel,
): string {
  const days = `${+(minH / 8).toFixed(1)}–${+(maxH / 8).toFixed(1)} días hábiles`;
  const confLbl = confidence === "HIGH" ? "alta" : confidence === "LOW" ? "baja" : "media";
  const closing = confidence === "LOW"
    ? "Para cerrar la banda necesitamos algunos datos adicionales que detallamos en la sección de información requerida."
    : "Quedamos atentos a tu confirmación para iniciar.";
  return `Estimado/a,

Adjuntamos la estimación para "${input.title}" (${type} · ${mod}).

- **Esfuerzo:** ${minH}h – ${maxH}h (${days}, ~${weeks} semanas).
- **Confianza:** ${confLbl}.
- **Supuestos clave:** horario hábil estándar, key user disponible en UAT y disponibilidad del ambiente solicitado.

${closing}

Saludos,
Equipo AMS`;
}
