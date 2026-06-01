// Motor determinístico de estimación de tiempos AMS.
// Sin LLM en Fase 1. Reglas + tablas calibradas con bandas (min/max).
// El objetivo: dado un EstimateInput, devolver horas, días, fases, riesgos,
// supuestos y un cliente-response listo para enviar.

import type {
  EstimateInput, EstimateType, ComplexityLevel, SeverityLevel,
  UrgencyLevel, EnvironmentLevel, RequiredProfile,
  EstimationResult, EstimatePhase, ConfidenceLevel,
  TicketEstimateInput, TicketEstimatedResolution, TicketEstimatePhase,
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

// ============================================================
// AUTOESTIMACIÓN DE RESOLUCIÓN (por ticket / incidente)
// ============================================================
// API independiente de estimate(): tomá un TicketEstimateInput y devuelve
// TicketEstimatedResolution para embebir directo en el ticket. Reutiliza las
// mismas tablas base y multiplicadores que el engine de proyectos.
//
// Reglas de ajuste por requirements/conocimiento implementadas:
// - Integración +8..40h · Desarrollo +16..80h · Transporte +2..8h · UAT +4..24h
// - Playbook -15% · Recurrente -25% · Sin evidencia +20% · Baja conf agente +30%
// ============================================================

function ticketPhase(
  id: string, name: string, description: string,
  minH: number, maxH: number, owner: RequiredProfile,
  opts: { required?: boolean; dependencies?: string[]; deliverables?: string[] } = {},
): TicketEstimatePhase {
  return {
    id, name, description, minHours: minH, maxHours: maxH, ownerProfile: owner,
    required: opts.required ?? true,
    dependencies: opts.dependencies ?? [],
    deliverables: opts.deliverables ?? [],
    status: "pending",
  };
}

// 10 fases AMS estándar para tickets/incidentes.
function amsStandardPhases(): TicketEstimatePhase[] {
  return [
    ticketPhase("p01", "Recepción y clasificación", "Triage, validación de impacto y módulo afectado.", 0.25, 0.75, "AMS_LEAD"),
    ticketPhase("p02", "Análisis funcional inicial", "Diagnóstico funcional + revisión de configuración.", 0.5, 2, "FUNCTIONAL_CONSULTANT", { dependencies: ["p01"] }),
    ticketPhase("p03", "Análisis técnico si aplica", "Logs, dumps, debug ABAP/BTP.", 0.5, 3, "ABAP_DEVELOPER", { required: false, dependencies: ["p02"] }),
    ticketPhase("p04", "Reproducción del error", "Replicar en QA/SBX con datos análogos.", 0.5, 2, "FUNCTIONAL_CONSULTANT", { dependencies: ["p02"] }),
    ticketPhase("p05", "Identificación de causa probable", "Root cause preliminar.", 0.5, 2, "FUNCTIONAL_CONSULTANT", { dependencies: ["p04"] }),
    ticketPhase("p06", "Resolución o workaround", "Aplicar fix definitivo o paliativo.", 0.5, 4, "FUNCTIONAL_CONSULTANT", { dependencies: ["p05"], deliverables: ["Solución aplicada"] }),
    ticketPhase("p07", "Validación en ambiente", "Pruebas con key user.", 0.25, 1.5, "TESTING_CONSULTANT", { dependencies: ["p06"], deliverables: ["Evidencia de prueba"] }),
    ticketPhase("p08", "Comunicación al cliente", "Update + cierre con el solicitante.", 0.25, 0.75, "AMS_LEAD", { dependencies: ["p07"] }),
    ticketPhase("p09", "Documentación del caso", "Actualizar KB / ticket / playbook.", 0.25, 1, "FUNCTIONAL_CONSULTANT", { dependencies: ["p08"], deliverables: ["KB actualizada"] }),
    ticketPhase("p10", "Cierre o escalamiento", "Cerrar o derivar a N2.", 0.1, 0.5, "AMS_LEAD", { dependencies: ["p09"] }),
  ];
}

// Fases adicionales para incidentes críticos en productivo.
function criticalPrdExtraPhases(): TicketEstimatePhase[] {
  return [
    ticketPhase("p11", "Contención inicial", "Workaround urgente para frenar el sangrado.", 0.5, 2, "AMS_LEAD", { deliverables: ["Workaround aplicado"] }),
    ticketPhase("p12", "Escalamiento Nivel 2", "Derivación al especialista N2.", 0.25, 1, "AMS_LEAD", { dependencies: ["p11"] }),
    ticketPhase("p13", "RCA preliminar", "Causa raíz preliminar dentro de las primeras 24h.", 1, 4, "FUNCTIONAL_CONSULTANT", { dependencies: ["p12"], deliverables: ["RCA preliminar"] }),
    ticketPhase("p14", "RCA final", "RCA definitivo con plan de acción.", 2, 8, "AMS_LEAD", { dependencies: ["p13"], deliverables: ["RCA final firmado"] }),
    ticketPhase("p15", "Hypercare o monitoreo", "Monitoreo intensivo 48-72h post-fix.", 4, 24, "AMS_LEAD", { dependencies: ["p14"], deliverables: ["Reporte hypercare"] }),
  ];
}

// 13 fases para change request / requerimiento.
function changeRequestPhases(): TicketEstimatePhase[] {
  return [
    ticketPhase("c01", "Análisis", "Toma de requerimiento.", 2, 6, "FUNCTIONAL_CONSULTANT"),
    ticketPhase("c02", "Diseño funcional", "Spec funcional.", 4, 16, "FUNCTIONAL_CONSULTANT", { dependencies: ["c01"], deliverables: ["Spec funcional"] }),
    ticketPhase("c03", "Diseño técnico", "Spec técnica ABAP/BTP.", 4, 16, "ABAP_DEVELOPER", { required: false, dependencies: ["c02"], deliverables: ["Spec técnica"] }),
    ticketPhase("c04", "Configuración", "Customizing SAP.", 2, 12, "FUNCTIONAL_CONSULTANT", { dependencies: ["c02"] }),
    ticketPhase("c05", "Desarrollo si aplica", "Codificación ABAP/BTP.", 8, 48, "ABAP_DEVELOPER", { required: false, dependencies: ["c03"] }),
    ticketPhase("c06", "Integración si aplica", "Mapeo + iflow.", 8, 40, "INTEGRATION_CONSULTANT", { required: false, dependencies: ["c05"] }),
    ticketPhase("c07", "Pruebas unitarias", "PU del developer.", 2, 8, "ABAP_DEVELOPER", { dependencies: ["c05"] }),
    ticketPhase("c08", "Pruebas funcionales", "QA funcional.", 4, 16, "TESTING_CONSULTANT", { dependencies: ["c07"] }),
    ticketPhase("c09", "UAT", "Aceptación key user.", 4, 24, "KEY_USER", { dependencies: ["c08"], deliverables: ["UAT firmada"] }),
    ticketPhase("c10", "Documentación", "Manual + spec final.", 2, 8, "FUNCTIONAL_CONSULTANT", { dependencies: ["c09"] }),
    ticketPhase("c11", "Transporte", "TR controlado.", 1, 4, "BASIS_CONSULTANT", { dependencies: ["c10"] }),
    ticketPhase("c12", "Puesta en marcha", "Pase productivo.", 2, 8, "AMS_LEAD", { dependencies: ["c11"], deliverables: ["Sistema productivo"] }),
    ticketPhase("c13", "Hypercare", "Monitoreo post go-live.", 8, 40, "AMS_LEAD", { dependencies: ["c12"] }),
  ];
}

// Confianza desde texto libre o ConfidenceLevel hacia HIGH/MEDIUM/LOW canónico.
function normalizeAgentConfidence(v: TicketEstimateInput["agentConfidence"]): ConfidenceLevel | null {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s === "high" || s === "alta") return "HIGH";
  if (s === "low" || s === "baja") return "LOW";
  if (s === "medium" || s === "media") return "MEDIUM";
  return null;
}

// Heurística rápida: deduce complejidad si no vino del input.
function inferComplexity(input: TicketEstimateInput): ComplexityLevel {
  if (input.complexity && input.complexity !== "UNKNOWN") return input.complexity;
  let score = 2; // MEDIUM por default
  if (input.requiresDevelopment) score += 2;
  if (input.requiresIntegration) score += 2;
  if (input.severity === "CRITICAL") score += 1;
  if (input.isProductive) score += 1;
  if (input.hasKnownPlaybook || input.hasKnowledgeMatch) score -= 1;
  if (input.isRepeatedIncident) score -= 1;
  if (score <= 0) return "VERY_LOW";
  if (score === 1) return "LOW";
  if (score === 2) return "MEDIUM";
  if (score === 3) return "HIGH";
  return "VERY_HIGH";
}

// SLA sugerido en minutos según severidad + ambiente.
function suggestedSla(severity: SeverityLevel, env: EnvironmentLevel): number {
  if (severity === "CRITICAL" && env === "PRD") return 60;        // 1h
  if (severity === "CRITICAL") return 240;                         // 4h
  if (severity === "HIGH" && env === "PRD") return 240;            // 4h
  if (severity === "HIGH") return 480;                             // 8h
  if (severity === "MEDIUM") return 1440;                          // 24h
  return 2880;                                                     // 48h
}

const uidEst = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const nowIso = () => new Date().toISOString();

/**
 * Autoestima la resolución de un ticket/incidente.
 * Determinístico, sin LLM. Devuelve banda mín/máx + fases + confianza + auditoría.
 */
export function autoEstimateTicketResolution(input: TicketEstimateInput): TicketEstimatedResolution {
  // ── Aplicar hints del análisis visual ANTES de cualquier inferencia ──
  // Si el análisis detectó módulo y el usuario no eligió uno, lo usamos.
  // Idem proceso/subProceso. La confianza alta del análisis sube la confianza global.
  const visual = input.visualAnalysisHints;
  if (visual) {
    if (!input.sapModule && visual.detectedSapModule) {
      input = { ...input, sapModule: visual.detectedSapModule };
    }
    if (!input.process && visual.detectedProcess) {
      input = { ...input, process: visual.detectedProcess };
    }
    if (!input.subProcess && visual.detectedSubProcess) {
      input = { ...input, subProcess: visual.detectedSubProcess };
    }
    // Si la imagen muestra mensaje de error → hay evidencia
    if (visual.detectedErrorCode || visual.detectedTransaction) {
      input = { ...input, hasErrorEvidence: true };
    }
  }

  const kind: "incident" | "change_request" | "service_request" = input.kind ?? "incident";
  const severity = input.severity ?? "MEDIUM";
  const env = input.environment ?? "NO_INFORMADO";
  const urgency = input.priority ?? (severity === "CRITICAL" ? "IMMEDIATE" : "NORMAL");
  const complexity = inferComplexity(input);
  const isProductive = !!input.isProductive || env === "PRD";
  const isCriticalPrd = isProductive && severity === "CRITICAL";

  // Selección de fases según tipo de ticket
  let phases: TicketEstimatePhase[] = kind === "change_request"
    ? changeRequestPhases()
    : amsStandardPhases();

  if (kind === "incident" && isCriticalPrd) {
    phases = [...phases, ...criticalPrdExtraPhases()];
  }

  // Filtrar fases opcionales que no aplican
  phases = phases.filter((p) => {
    if (p.required) return true;
    if (p.id === "p03" || p.id === "c03" || p.id === "c05") return !!input.requiresDevelopment;
    if (p.id === "c06") return !!input.requiresIntegration;
    return true;
  });

  // Base = suma de fases
  let baseMin = phases.reduce((s, p) => s + p.minHours, 0);
  let baseMax = phases.reduce((s, p) => s + p.maxHours, 0);

  const appliedRules: string[] = [];

  // Multiplicadores estándar
  const mult = COMPLEXITY_MULT[complexity] * SEVERITY_MULT[severity] * URGENCY_MULT[urgency] * ENV_MULT[env];
  baseMin *= mult;
  baseMax *= mult;
  appliedRules.push(`mult_base=${mult.toFixed(2)} (complex=${complexity} sev=${severity} urg=${urgency} env=${env})`);

  // Bumps absolutos por requirements (suman al techo, conservador en piso)
  const bump = (label: string, min: number, max: number) => {
    baseMin += min; baseMax += max; appliedRules.push(`bump:${label} +${min}/+${max}h`);
  };
  if (input.requiresDevelopment) bump("desarrollo", 16, 80);
  if (input.requiresIntegration) bump("integracion", 8, 40);
  if (input.requiresTransport)   bump("transporte", 2, 8);
  if (input.requiresUAT)         bump("UAT", 4, 24);

  // Discounts proporcionales
  const pct = (label: string, factor: number) => {
    baseMin *= factor; baseMax *= factor;
    appliedRules.push(`pct:${label} x${factor.toFixed(2)}`);
  };
  if (input.hasKnownPlaybook)   pct("playbook_-15%", 0.85);
  if (input.isRepeatedIncident) pct("recurrente_-25%", 0.75);

  // Bumps porcentuales por incertidumbre
  const agentConf = normalizeAgentConfidence(input.agentConfidence);
  if (agentConf === "LOW")            pct("agente_baja_+30%", 1.30);
  if (input.hasErrorEvidence === false) pct("sin_evidencia_+20%", 1.20);

  // Redondeo amigable y piso
  if (baseMin < 0.5) baseMin = 0.5;
  if (baseMax < baseMin) baseMax = baseMin * 1.5;
  const totalMinHours = Math.round(baseMin * 10) / 10;
  const totalMaxHours = Math.round(baseMax * 10) / 10;

  // Escalar las fases para que la suma respete el total (proporcional al base original)
  const scale = (totalMinHours + totalMaxHours) / Math.max(0.1,
    phases.reduce((s, p) => s + p.minHours + p.maxHours, 0));
  phases = phases.map((p) => ({
    ...p,
    minHours: Math.round(p.minHours * scale * 10) / 10,
    maxHours: Math.round(p.maxHours * scale * 10) / 10,
  }));

  // Confianza
  const missingData: string[] = [...(input.missingData ?? [])];
  if (!input.sapModule)                 missingData.push("Módulo SAP afectado.");
  if (!input.process)                   missingData.push("Proceso de negocio.");
  if (!input.environment || input.environment === "NO_INFORMADO") missingData.push("Ambiente objetivo.");
  if (input.hasErrorEvidence === false) missingData.push("Mensaje de error o evidencia (screenshot/log).");
  if (input.complexity === "UNKNOWN")   missingData.push("Estimación de complejidad funcional/técnica.");
  // Datos faltantes derivados del análisis visual
  if (visual?.extraMissingData) missingData.push(...visual.extraMissingData);

  let score = 100;
  if (missingData.length) score -= missingData.length * 10;
  if (complexity === "VERY_HIGH" || complexity === "HIGH") score -= 8;
  if (urgency === "IMMEDIATE") score -= 5;
  if (input.requiresDevelopment) score -= 8;
  if (input.requiresIntegration) score -= 12;
  if (input.hasKnownPlaybook)   score += 8;
  if (input.hasKnowledgeMatch)  score += 6;
  if (input.isRepeatedIncident) score += 8;
  if (agentConf === "LOW") score -= 12;
  if (agentConf === "HIGH") score += 6;
  // Análisis visual de alta confianza aporta a la confianza global
  const visualConf = String(visual?.confidence ?? "").toUpperCase();
  if (visualConf === "HIGH") score += 10;
  else if (visualConf === "MEDIUM") score += 4;
  if (score < 0) score = 0; if (score > 100) score = 100;
  let confidence: ConfidenceLevel = "MEDIUM";
  if (score >= 75) confidence = "HIGH";
  else if (score <= 45) confidence = "LOW";

  // Reglas legibles aplicadas (acumulador con las decisiones de fases)
  if (kind === "change_request") appliedRules.push("rule:change_request_phases");
  if (isCriticalPrd) appliedRules.push("rule:critical_prd_extra_phases");

  // Supuestos/riesgos/dependencias
  const assumptions: string[] = [
    `Estimación basada en módulo ${input.sapModule || "SAP genérico"} y complejidad ${complexity}.`,
    "Horario hábil 9×5 sin recargos nocturnos ni fin de semana.",
    "Equipo cliente disponible para validar fix en ventana acordada.",
  ];
  if (input.hasKnownPlaybook) assumptions.push("Existe playbook AMS aplicable, se asume reutilización completa.");
  // Supuestos derivados del análisis visual (transparencia)
  if (visual?.detectedErrorCode) {
    assumptions.push(`Análisis visual identificó código ${visual.detectedErrorCode}${
      visual.detectedTransaction ? ` en transacción ${visual.detectedTransaction}` : ""
    }.`);
  }
  if (visual?.extraHints) assumptions.push(...visual.extraHints.map((h) => `Hint visual: ${h}`));

  const risks: string[] = [];
  if (complexity === "VERY_HIGH" || complexity === "HIGH") risks.push("Complejidad alta: variabilidad amplia entre mín y máx.");
  if (isCriticalPrd) risks.push("Productivo + crítico: cualquier desliz tiene impacto al negocio.");
  if (input.requiresDevelopment) risks.push("Desarrollo ABAP/BTP: variabilidad por scope no cerrado.");
  if (input.requiresIntegration) risks.push("Integración cross-system: depende del externo.");
  if (agentConf === "LOW") risks.push("Confianza del agente baja en la categorización inicial.");

  const dependencies: string[] = [];
  if (input.requiresUAT)       dependencies.push("Disponibilidad del key user para UAT.");
  if (input.requiresTransport) dependencies.push("Ventana de transporte agendada por Basis.");
  if (env === "PRD")           dependencies.push("Plan de back-out validado con el cliente.");

  const totalMinBusinessDays = +(totalMinHours / 8).toFixed(1);
  const totalMaxBusinessDays = +(totalMaxHours / 8).toFixed(1);
  const slaMin = suggestedSla(severity, env);

  const t = nowIso();
  return {
    id: uidEst("est"),
    ticketId: input.ticketId,
    totalMinHours, totalMaxHours,
    totalMinBusinessDays, totalMaxBusinessDays,
    confidence, confidenceScore: score,
    complexity,
    phaseBreakdown: phases,
    assumptions, risks, dependencies, missingData,
    suggestedSlaMinutes: slaMin,
    generatedAt: t, lastRecalculatedAt: t,
    generatedBy: "SYSTEM_ESTIMATOR",
    manuallyAdjusted: false,
    appliedRules,
  };
}

/**
 * Recalcula una estimación preservando ajustes manuales si manuallyAdjusted=true.
 * Si quien recalcula tiene permiso "force", igual sobreescribe pero deja traza.
 */
export function recalculateTicketResolution(
  previous: TicketEstimatedResolution,
  input: TicketEstimateInput,
  options: { force?: boolean; actor?: string } = {},
): TicketEstimatedResolution {
  if (previous.manuallyAdjusted && !options.force) {
    return { ...previous, lastRecalculatedAt: nowIso() };
  }
  const fresh = autoEstimateTicketResolution(input);
  return {
    ...fresh,
    id: previous.id,
    generatedAt: previous.generatedAt,
    manuallyAdjusted: false,
    adjustedBy: options.force ? options.actor : previous.adjustedBy,
    adjustmentReason: options.force ? "force-recalc" : previous.adjustmentReason,
  };
}
