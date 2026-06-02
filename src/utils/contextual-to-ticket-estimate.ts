// =============================================================================
// Adapter: ContextualEstimationResult → TicketEstimatedResolution
// =============================================================================
// Cuando el consultor decide "aplicar al ticket" un resultado del motor
// contextual v2, hay que convertirlo al shape oficial TicketEstimatedResolution
// que persiste en el jsonb del ticket.
//
// La conversión preserva metadata clave (calibrationMode, appliedRules) y
// agrega marcadores que indican que vino del motor contextual.
// =============================================================================

import type {
  ContextualEstimationResult,
  TicketEstimatedResolution,
  TicketEstimatePhase,
  RequiredProfile,
  ComplexityLevel,
} from "@/types/estimation";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

/**
 * Mapea complexity de DetectedSapContext → ComplexityLevel.
 * El detector no expone un campo "complexity" formal, lo inferimos desde
 * issueType + flags.
 */
function inferComplexityFromContext(r: ContextualEstimationResult): ComplexityLevel {
  const ctx = r.detectedContext;
  if (ctx.requiresDevelopment || ctx.requiresIntegration) return "HIGH";
  if (ctx.severity === "CRITICAL") return "HIGH";
  if (ctx.severity === "HIGH") return "MEDIUM";
  if (ctx.issueType === "incident_functional_simple" || ctx.issueType === "authorization_issue") return "LOW";
  if (ctx.issueType === "change_with_development") return "HIGH";
  if (ctx.issueType === "critical_production_issue") return "VERY_HIGH";
  return "MEDIUM";
}

/**
 * Mapea las fases contextuales (que tienen min/expected/max + reason + owner)
 * a TicketEstimatePhase (que tiene min/max + dependencies + deliverables).
 */
function mapPhases(r: ContextualEstimationResult): TicketEstimatePhase[] {
  return r.phaseBreakdown.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.reason,            // razón contextual va a descripción
    minHours: p.minHours,
    maxHours: p.maxHours,
    ownerProfile: p.ownerProfile as RequiredProfile,
    required: p.required,
    status: "pending",
    dependencies: p.dependencies ?? [],
    deliverables: [],
  }));
}

/**
 * SLA sugerido en minutos según severidad. Heurística simple.
 */
function suggestSlaMinutes(r: ContextualEstimationResult): number {
  const sev = r.detectedContext.severity;
  const env = r.detectedContext.environment;
  if (sev === "CRITICAL" && env === "PRD") return 60;
  if (sev === "CRITICAL") return 240;
  if (sev === "HIGH" && env === "PRD") return 240;
  if (sev === "HIGH") return 480;
  if (sev === "MEDIUM") return 1440;
  return 2880;
}

/**
 * Convierte un ContextualEstimationResult al shape TicketEstimatedResolution
 * para persistir en el ticket. Preserva traza del origen contextual.
 *
 * @param r        Resultado del motor contextual.
 * @param ticketId Key del ticket donde aplicar.
 * @param actor    Quien aplica el cambio (para auditoría).
 */
export function contextualToTicketEstimate(
  r: ContextualEstimationResult,
  ticketId: string,
  actor: string,
): TicketEstimatedResolution {
  const phases = mapPhases(r);
  const complexity = inferComplexityFromContext(r);
  const slaMin = suggestSlaMinutes(r);
  const now = new Date().toISOString();

  // Convertir adjustments contextuales a string[] para appliedRules
  // (el shape clásico espera flat strings; el detalle queda en internalNotes)
  const appliedRules: string[] = [
    `contextual_engine:v${r.engineVersion}`,
    `issueType:${r.detectedContext.issueType}`,
    `detectedModule:${r.detectedContext.module}`,
    ...r.contextualAdjustments.map((a) =>
      `ctx_adj:${a.factor} x${a.impact.toFixed(2)} (${a.direction})`),
    `similar_cases:${r.similarCases.length}`,
    r.playbookMatch ? `playbook:${r.playbookMatch.playbookTitle}` : "no_playbook",
  ];

  // Assumptions combinadas: las del motor contextual + marcador de origen
  const assumptions = [
    ...r.assumptions,
    `🧠 Estimación aplicada desde motor contextual v${r.engineVersion} por ${actor}.`,
  ];

  return {
    id: uid("est"),
    ticketId,
    totalMinHours: r.totalRange.minHours,
    totalMaxHours: r.totalRange.maxHours,
    totalMinBusinessDays: r.totalRange.minBusinessDays,
    totalMaxBusinessDays: r.totalRange.maxBusinessDays,
    confidence: r.confidence,
    confidenceScore: r.confidenceScore,
    complexity,
    phaseBreakdown: phases,
    assumptions,
    risks: r.risks,
    dependencies: [
      ...((r.recommendations ?? []).find((re) => re.kind === "use_playbook")
        ? [`Ejecutar playbook "${r.playbookMatch?.playbookTitle}"`]
        : []),
    ],
    missingData: r.missingData,
    suggestedSlaMinutes: slaMin,
    generatedAt: now,
    lastRecalculatedAt: now,
    generatedBy: `CONTEXTUAL_ENGINE/${actor}`,
    manuallyAdjusted: true,    // Aplicado por humano desde contextual → cuenta como adjusted
    adjustedBy: actor,
    adjustmentReason: `Aplicado desde motor contextual v${r.engineVersion} · ` +
      `issueType ${r.detectedContext.issueType} · ` +
      `${r.similarCases.length} casos similares · ` +
      `${r.contextualAdjustments.length} factores`,
    appliedRules,
    calibrationMode: r.calibrationMode,
  };
}
