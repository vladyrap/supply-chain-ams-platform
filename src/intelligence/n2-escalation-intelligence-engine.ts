// =============================================================================
// N2 Escalation Intelligence — Engine
// =============================================================================
// Decide automáticamente:
//   1. CUÁNDO escalar a N2 (verdict: ESCALATE_NOW/SOON/WAIT/RESOLVE_AT_N1)
//   2. A QUIÉN escalar (top-3 specialists con scoring detallado)
//   3. CON QUÉ SLA (tier basado en severity + ambiente + segmento)
//   4. QUÉ PLAYBOOK ejecutar (match con catálogo)
//
// Determinístico, sin LLM. Construye sobre EscalationRule + N2Responsible
// existentes (src/types/escalation.ts) agregando 9 categorías de señales.
//
// Output: N2EscalationAnalysis con executiveSummary + reasoning + risks +
// missingData para que el consultor entienda EL POR QUÉ.
// =============================================================================

import type {
  N2EscalationInput, N2EscalationAnalysis, EscalationVerdict,
  EscalationSignal, SpecialistRecommendation, SlaRecommendation,
  PlaybookRecommendation, EscalationSlaTier,
} from "@/types/n2-escalation-intelligence";
import { SLA_TIER_MINUTES } from "@/types/n2-escalation-intelligence";
import type { N2Responsible, EscalationRule } from "@/types/escalation";
import {
  N2_SPECIALISTS_MOCK, N2_SPECIALISTS_HISTORY,
  getHistoryForResponsible, getActiveSpecialists,
} from "@/data/n2-specialists-mock";

export const N2_ENGINE_VERSION = "0.1.0-n2-intelligence";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

// ============================================================
// SEÑALES — 9 categorías que empujan a escalar o quedarse en N1
// ============================================================

interface SignalBuilder {
  category: EscalationSignal["category"];
  evaluate: (input: N2EscalationInput) => EscalationSignal | null;
}

function isCriticalPrd(input: N2EscalationInput): boolean {
  return !!input.isProductive
    && (input.ticketPriority?.toLowerCase() ?? "").match(/high|highest|critical|p1/) != null;
}

const SIGNAL_BUILDERS: SignalBuilder[] = [
  // 1. Severity
  {
    category: "severity",
    evaluate: (i) => {
      if (isCriticalPrd(i)) {
        return {
          id: "sig_critical_prd", category: "severity", weight: 0.95,
          direction: "push_escalate",
          message: "Caso crítico en productivo (PRD + prioridad alta).",
        };
      }
      if ((i.ticketPriority?.toLowerCase() ?? "").includes("medium")
        && i.isProductive) {
        return {
          id: "sig_medium_prd", category: "severity", weight: 0.35,
          direction: "push_escalate",
          message: "Caso medio en productivo — escalación recomendada si N1 no resuelve en 2h.",
        };
      }
      if ((i.ticketPriority?.toLowerCase() ?? "").includes("low")) {
        return {
          id: "sig_low_priority", category: "severity", weight: 0.40,
          direction: "push_stay",
          message: "Prioridad baja — N1 puede manejar.",
        };
      }
      return null;
    },
  },

  // 2. Complejidad técnica
  {
    category: "complexity",
    evaluate: (i) => {
      if (i.estimationConfidence === "LOW"
        && i.estimationMaxHours
        && i.estimationMaxHours >= 16) {
        return {
          id: "sig_complex_low_conf", category: "complexity", weight: 0.65,
          direction: "push_escalate",
          message: "Estimación amplia con baja confianza — requiere expertise N2 para acotar.",
          evidence: `${i.estimationMinHours}h-${i.estimationMaxHours}h conf LOW`,
        };
      }
      if (i.estimationMaxHours && i.estimationMaxHours <= 4
        && i.estimationConfidence === "HIGH") {
        return {
          id: "sig_quick_high_conf", category: "complexity", weight: 0.55,
          direction: "push_stay",
          message: "Caso rápido con alta confianza — N1 resuelve.",
        };
      }
      return null;
    },
  },

  // 3. Data quality
  {
    category: "data_quality",
    evaluate: (i) => {
      const signals: string[] = [];
      if (!i.hasErrorEvidence) signals.push("sin mensaje de error explícito");
      if (!i.hasReproduction) signals.push("sin pasos de reproducción");
      if (!i.sapTransaction) signals.push("sin transacción identificada");
      if (signals.length >= 2) {
        return {
          id: "sig_low_data_quality", category: "data_quality", weight: 0.50,
          direction: "push_stay",
          message: "Información insuficiente — N1 debe levantar datos antes de escalar.",
          evidence: signals.join(", "),
        };
      }
      if (i.hasErrorEvidence && i.hasReproduction && i.hasVisualEvidence) {
        return {
          id: "sig_rich_data", category: "data_quality", weight: 0.35,
          direction: "push_escalate",
          message: "Información completa — N2 puede atacar sin esperar más datos.",
        };
      }
      return null;
    },
  },

  // 4. Expertise required
  {
    category: "expertise_required",
    evaluate: (i) => {
      const text = `${i.ticketTitle || ""} ${i.ticketDescription || ""}`.toLowerCase();
      const needsDev = /\babap\b|\bbadi\b|user.exit|enhancement|programa\s+z|reporte\s+z/i.test(text);
      const needsIntegration = /\bidoc\b|\bcpi\b|\bpi\/po\b|\bapi\b.*\brest\b|middleware/i.test(text);
      const needsBasis = /\bperformance\b|\bdump\b|\bst22\b|\bjob\b.*cancel|\bsm37\b|\bauthorization\b/i.test(text);
      if (needsDev) {
        return {
          id: "sig_needs_dev", category: "expertise_required", weight: 0.70,
          direction: "push_escalate",
          message: "Caso requiere desarrollo ABAP/BTP — N2 técnico es necesario.",
        };
      }
      if (needsIntegration) {
        return {
          id: "sig_needs_integration", category: "expertise_required", weight: 0.65,
          direction: "push_escalate",
          message: "Caso de integración cross-system — especialista integraciones requerido.",
        };
      }
      if (needsBasis) {
        return {
          id: "sig_needs_basis", category: "expertise_required", weight: 0.60,
          direction: "push_escalate",
          message: "Caso de Basis (performance/jobs/auth) — consultor Basis requerido.",
        };
      }
      return null;
    },
  },

  // 5. N1 capability
  {
    category: "n1_capability",
    evaluate: (i) => {
      if ((i.n1AttemptsCount ?? 0) >= 2
        && (i.n1HoursInvested ?? 0) >= 4) {
        return {
          id: "sig_n1_exhausted", category: "n1_capability", weight: 0.85,
          direction: "push_escalate",
          message: `N1 invirtió ${i.n1HoursInvested}h en ${i.n1AttemptsCount} intentos — escalación justificada.`,
        };
      }
      if (i.hasPlaybook) {
        return {
          id: "sig_n1_has_playbook", category: "n1_capability", weight: 0.55,
          direction: "push_stay",
          message: "Existe playbook AMS — N1 debería poder ejecutarlo.",
        };
      }
      if (i.hasKnowledgeMatch) {
        return {
          id: "sig_n1_has_kb", category: "n1_capability", weight: 0.40,
          direction: "push_stay",
          message: "Hay knowledge base con casos similares — N1 puede consultarla.",
        };
      }
      return null;
    },
  },

  // 6. Business impact
  {
    category: "business_impact",
    evaluate: (i) => {
      if (i.affectsCompliance) {
        return {
          id: "sig_compliance", category: "business_impact", weight: 0.90,
          direction: "push_escalate",
          message: "Caso con impacto en compliance — escalación obligatoria.",
        };
      }
      if (i.affectsBilling) {
        return {
          id: "sig_billing", category: "business_impact", weight: 0.75,
          direction: "push_escalate",
          message: "Caso afecta facturación — impacto directo en revenue.",
        };
      }
      if (i.affectsCriticalProcess) {
        return {
          id: "sig_critical_process", category: "business_impact", weight: 0.70,
          direction: "push_escalate",
          message: "Caso afecta proceso crítico de negocio.",
        };
      }
      if (i.customerSegment === "ENTERPRISE") {
        return {
          id: "sig_enterprise_customer", category: "business_impact", weight: 0.50,
          direction: "push_escalate",
          message: "Cliente ENTERPRISE — SLA prioritario.",
        };
      }
      return null;
    },
  },

  // 7. Historical (casos similares)
  {
    category: "historical",
    evaluate: (i) => {
      if ((i.similarPastTicketsCount ?? 0) >= 3 && i.hasReusableResolution) {
        return {
          id: "sig_reusable_resolution", category: "historical", weight: 0.70,
          direction: "push_stay",
          message: `${i.similarPastTicketsCount} casos similares con resolución conocida — N1 puede reutilizar.`,
        };
      }
      if ((i.similarPastTicketsCount ?? 0) >= 2 && !i.hasReusableResolution) {
        return {
          id: "sig_repeats_no_resolution", category: "historical", weight: 0.50,
          direction: "push_escalate",
          message: "Caso recurrente sin resolución estable — N2 debe atacar causa raíz definitiva.",
        };
      }
      return null;
    },
  },

  // 8. Compliance
  {
    category: "compliance",
    evaluate: (i) => {
      if (i.affectsCompliance && i.isProductive) {
        return {
          id: "sig_compliance_prd", category: "compliance", weight: 0.95,
          direction: "push_escalate",
          message: "Compliance + PRD — escalación inmediata + revisión legal posible.",
        };
      }
      return null;
    },
  },

  // 9. SLA risk — el más severo primero
  {
    category: "sla_risk",
    evaluate: (i) => {
      if ((i.daysOpen ?? 0) >= 4) {
        return {
          id: "sig_sla_breach_imminent", category: "sla_risk", weight: 0.85,
          direction: "push_escalate",
          message: `Riesgo de breach de SLA inminente (${i.daysOpen} días abierto).`,
        };
      }
      if ((i.daysOpen ?? 0) >= 2 && i.isProductive) {
        return {
          id: "sig_sla_at_risk", category: "sla_risk", weight: 0.70,
          direction: "push_escalate",
          message: `Ticket abierto hace ${i.daysOpen} días en PRD — SLA en riesgo.`,
        };
      }
      return null;
    },
  },
];

// ============================================================
// Verdict + urgency from signals
// ============================================================

function computeVerdict(
  push: EscalationSignal[], stay: EscalationSignal[],
  input: N2EscalationInput,
): {
  verdict: EscalationVerdict; confidence: number; urgency: number; withinHours: number | null;
} {
  if (input.ticketTitle === "" && input.ticketDescription === undefined) {
    return { verdict: "INSUFFICIENT_DATA", confidence: 0, urgency: 0, withinHours: null };
  }

  const pushScore = push.reduce((s, sig) => s + sig.weight, 0);
  const stayScore = stay.reduce((s, sig) => s + sig.weight, 0);
  const net = pushScore - stayScore;

  // Confianza = (señales totales / 9) * 100, ajustado por divergencia
  const totalSignals = push.length + stay.length;
  const baseConf = Math.min(100, (totalSignals / 9) * 100);
  const divergence = Math.abs(net) / Math.max(0.1, pushScore + stayScore);
  const confidence = Math.round(baseConf * 0.6 + divergence * 40);

  // Urgencia: alta si hay push fuerte de severity + compliance + business
  const urgentCategories: EscalationSignal["category"][] = ["severity", "compliance", "business_impact"];
  const urgentScore = push
    .filter((s) => urgentCategories.includes(s.category))
    .reduce((sum, s) => sum + s.weight, 0);
  const urgency = Math.round(Math.min(100, urgentScore * 50));

  // Verdict
  let verdict: EscalationVerdict;
  let withinHours: number | null = null;
  if (totalSignals === 0) {
    verdict = "INSUFFICIENT_DATA";
  } else if (urgency >= 70 && net > 0.5) {
    verdict = "ESCALATE_NOW";
  } else if (net > 0.8) {
    verdict = "ESCALATE_SOON";
    withinHours = urgency >= 50 ? 2 : urgency >= 30 ? 4 : 8;
  } else if (net < -0.5) {
    verdict = "RESOLVE_AT_N1";
  } else if (net > 0.2) {
    verdict = "ESCALATE_SOON";
    withinHours = 8;
  } else {
    verdict = "WAIT_AND_SEE";
  }

  return { verdict, confidence: Math.max(0, Math.min(100, confidence)), urgency, withinHours };
}

// ============================================================
// Specialist matching
// ============================================================

function scoreSpecialist(spec: N2Responsible, input: N2EscalationInput): {
  score: number; reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // 1. Module match (peso fuerte)
  if (input.sapModule && spec.sapModules.includes(input.sapModule)) {
    score += 35;
    reasons.push(`Cubre módulo ${input.sapModule}`);
  } else if (input.sapModule && spec.sapModules.length > 0) {
    score -= 5; // penalización leve si no cubre el módulo
  }

  // 2. Skills match
  const text = `${input.ticketTitle || ""} ${input.ticketDescription || ""} ${input.sapTransaction || ""}`.toLowerCase();
  const skillMatches = spec.skills.filter((sk) => text.includes(sk.toLowerCase()));
  if (skillMatches.length > 0) {
    score += Math.min(25, skillMatches.length * 6);
    reasons.push(`Skills: ${skillMatches.slice(0, 3).join(", ")}`);
  }

  // 3. Workload — penaliza si está saturado
  const workloadPct = (spec.currentActiveCases / Math.max(1, spec.maxActiveCases)) * 100;
  if (workloadPct >= 100) {
    score -= 25;
    reasons.push(`⚠ workload saturado (${spec.currentActiveCases}/${spec.maxActiveCases})`);
  } else if (workloadPct >= 80) {
    score -= 10;
    reasons.push(`workload alto (${Math.round(workloadPct)}%)`);
  } else if (workloadPct <= 30) {
    score += 8;
    reasons.push(`disponibilidad alta`);
  }

  // 4. Availability — VACATION/OFFLINE penaliza muy fuerte
  if (spec.availabilityStatus === "VACATION" || spec.availabilityStatus === "OFFLINE") {
    score -= 80;
    reasons.push("⚠ NO disponible (vacation/offline)");
  } else if (spec.availabilityStatus === "BUSY") {
    score -= 12;
    reasons.push("ocupado");
  } else if (spec.availabilityStatus === "AVAILABLE") {
    score += 5;
  } else if (spec.availabilityStatus === "ON_CALL") {
    score += 3;
    reasons.push("on-call");
  }

  // 5. Historical match (issueType + módulo)
  const history = getHistoryForResponsible(spec.id);
  if (history) {
    if (input.sapModule && history.topModules.includes(input.sapModule)) {
      score += 12;
      reasons.push(`${history.recentCasesCount} casos recientes ${input.sapModule}`);
    }
    // CSAT alto suma
    if (history.customerSatisfactionScore >= 90) {
      score += 8;
      reasons.push(`CSAT ${history.customerSatisfactionScore}/100`);
    }
    // Within-band alto suma
    if (history.withinBandPct >= 75) {
      score += 5;
      reasons.push(`calibración ${history.withinBandPct}%`);
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

function matchSpecialists(
  input: N2EscalationInput,
): SpecialistRecommendation[] {
  const pool = input.availableSpecialists ?? getActiveSpecialists();
  const scored = pool
    .map((spec) => {
      const { score, reasons } = scoreSpecialist(spec, input);
      const history = getHistoryForResponsible(spec.id);
      const workloadPct = (spec.currentActiveCases / Math.max(1, spec.maxActiveCases)) * 100;
      return {
        spec, score, reasons, history, workloadPct,
      };
    })
    .filter((s) => s.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((s, idx) => ({
    responsibleId: s.spec.id,
    responsibleName: s.spec.name,
    email: s.spec.email,
    matchScore: s.score,
    rank: idx + 1,
    matchReasons: s.reasons,
    currentWorkloadPct: Math.round(s.workloadPct),
    availability: s.spec.availabilityStatus,
    skills: s.spec.skills,
    sapModules: s.spec.sapModules,
    historicalCasesCount: s.history?.recentCasesCount ?? 0,
    estimatedHoursToResolve: s.history
      ? { min: s.history.avgResolutionHours * 0.8, max: s.history.avgResolutionHours * 1.3 }
      : undefined,
    isPrimary: idx === 0,
  }));
}

// ============================================================
// SLA recommendation
// ============================================================

function recommendSla(input: N2EscalationInput, verdict: EscalationVerdict): SlaRecommendation {
  const isPrd = !!input.isProductive;
  const isCritical = (input.ticketPriority?.toLowerCase() ?? "").match(/highest|critical|p1/) != null;
  const isHigh = (input.ticketPriority?.toLowerCase() ?? "").match(/high|p2/) != null;

  let tier: EscalationSlaTier;
  let reasoning: string;

  if (isCritical && isPrd) {
    tier = "P1_60MIN";
    reasoning = "P1 (60 min) — caso crítico en productivo según contrato AMS estándar.";
  } else if (isCritical) {
    tier = "P1_4H";
    reasoning = "P1 (4h) — prioridad crítica fuera de PRD.";
  } else if (isHigh && isPrd) {
    tier = "P2_4H";
    reasoning = "P2 (4h) — prioridad alta en productivo.";
  } else if (isHigh) {
    tier = "P2_8H";
    reasoning = "P2 (8h) — prioridad alta sin PRD.";
  } else if (verdict === "ESCALATE_NOW" || verdict === "ESCALATE_SOON") {
    tier = "P3_24H";
    reasoning = "P3 (24h) — caso estándar escalado.";
  } else {
    tier = "P4_48H";
    reasoning = "P4 (48h) — prioridad baja, escalación opcional.";
  }

  const m = SLA_TIER_MINUTES[tier];
  return { tier, responseMinutes: m.response, resolutionMinutes: m.resolution, reasoning };
}

// ============================================================
// Playbook recommendation
// ============================================================

function recommendPlaybook(input: N2EscalationInput): PlaybookRecommendation | null {
  if (!input.availablePlaybooks || input.availablePlaybooks.length === 0) {
    // Heurística genérica si no hay playbooks pasados
    if ((input.ticketPriority?.toLowerCase() ?? "").match(/highest|critical|p1/) && input.isProductive) {
      return {
        playbookId: "pb_p1_critical_prd",
        playbookTitle: "Incidente crítico P1 en productivo",
        matchScore: 0.85,
        reason: "Severidad CRITICAL + PRD — procedimiento estándar P1.",
      };
    }
    return null;
  }

  // Match por módulo + trigger keywords
  const text = `${input.ticketTitle || ""} ${input.ticketDescription || ""}`.toLowerCase();
  let best: { id: string; title: string; score: number } | null = null;
  for (const pb of input.availablePlaybooks) {
    if (pb.status && pb.status !== "ACTIVE") continue;
    let score = 0;
    if (pb.sapModule && input.sapModule && pb.sapModule === input.sapModule) score += 0.5;
    if (pb.triggerWhen && new RegExp(pb.triggerWhen, "i").test(text)) score += 0.4;
    if (score > 0 && (!best || score > best.score)) {
      best = { id: pb.id, title: pb.title, score };
    }
  }
  if (!best) return null;
  return {
    playbookId: best.id,
    playbookTitle: best.title,
    matchScore: best.score,
    reason: `Match por módulo${input.sapModule ? " (" + input.sapModule + ")" : ""} y/o trigger del playbook.`,
  };
}

// ============================================================
// Rule matching (catálogo existente del módulo escalation)
// ============================================================

function matchRule(input: N2EscalationInput): EscalationRule | null {
  if (!input.rules || input.rules.length === 0) return null;
  const text = `${input.ticketTitle || ""} ${input.ticketDescription || ""}`.toLowerCase();
  // El catálogo tiene EscalationCondition como objeto (no array)
  for (const rule of input.rules.filter((r) => r.enabled)) {
    const c = rule.conditions;
    if (!c) continue;
    // sapModule + environment + keywords match
    if (c.sapModule && input.sapModule?.toLowerCase() === c.sapModule.toLowerCase()) return rule;
    if (c.environment && input.environment?.toLowerCase() === c.environment.toLowerCase()) return rule;
    if (c.severity && input.ticketPriority?.toLowerCase().includes(c.severity.toLowerCase())) return rule;
    if (c.keywords && c.keywords.some((k) => text.includes(k.toLowerCase()))) return rule;
  }
  return null;
}

// ============================================================
// Reasoning + summaries
// ============================================================

function buildExecutiveSummary(
  verdict: EscalationVerdict, urgency: number,
  primary: SpecialistRecommendation | null,
  sla: SlaRecommendation,
): string {
  if (verdict === "INSUFFICIENT_DATA") {
    return "No hay suficientes señales para tomar una decisión. Completar información del ticket.";
  }
  if (verdict === "RESOLVE_AT_N1") {
    return "Recomendación: resolver en N1. Caso dentro de la capacidad del primer nivel con apoyo de knowledge/playbook.";
  }
  if (verdict === "WAIT_AND_SEE") {
    return "Recomendación: mantener en N1 + monitorear próximas 2h. Escalación opcional según evolución.";
  }
  const who = primary
    ? `${primary.responsibleName} (score ${primary.matchScore}/100)`
    : "especialista por definir";
  if (verdict === "ESCALATE_NOW") {
    return `Escalar AHORA a ${who}. SLA ${sla.tier}. Urgencia ${urgency}/100.`;
  }
  return `Escalar dentro de las próximas horas a ${who}. SLA ${sla.tier}.`;
}

function buildReasoning(push: EscalationSignal[], stay: EscalationSignal[], verdict: EscalationVerdict): string[] {
  const out: string[] = [];
  if (push.length > 0) {
    out.push(`Señales a favor de escalar (${push.length}): ${push.slice(0, 3).map((s) => s.message).join(" | ")}`);
  }
  if (stay.length > 0) {
    out.push(`Señales a favor de N1 (${stay.length}): ${stay.slice(0, 3).map((s) => s.message).join(" | ")}`);
  }
  if (verdict === "ESCALATE_NOW") {
    out.push("Peso conjunto de señales críticas justifica escalación inmediata.");
  } else if (verdict === "ESCALATE_SOON") {
    out.push("Balance favorece escalación pero sin urgencia inmediata.");
  } else if (verdict === "RESOLVE_AT_N1") {
    out.push("Señales sugieren que N1 puede resolver con knowledge/playbook existentes.");
  }
  return out;
}

function buildRisksIfNotEscalated(verdict: EscalationVerdict, input: N2EscalationInput): string[] {
  const risks: string[] = [];
  if (verdict !== "ESCALATE_NOW" && verdict !== "ESCALATE_SOON") return risks;
  if (input.affectsCompliance) risks.push("Riesgo de incumplimiento normativo / compliance.");
  if (input.affectsBilling) risks.push("Riesgo de pérdida de revenue por facturación detenida.");
  if (input.isProductive) risks.push("Operación productiva afectada — clientes finales impactados.");
  if (input.customerSegment === "ENTERPRISE") risks.push("Cliente Enterprise — incumplimiento SLA penalizado.");
  if ((input.daysOpen ?? 0) >= 2) risks.push(`Ticket abierto ${input.daysOpen} días — visibilidad ante sponsor del cliente.`);
  return risks;
}

function buildMissingData(input: N2EscalationInput): string[] {
  const m: string[] = [];
  if (!input.sapModule) m.push("Indicar módulo SAP afectado.");
  if (!input.environment) m.push("Confirmar ambiente exacto.");
  if (input.estimationConfidence === undefined) m.push("Generar estimación previa del caso.");
  if (input.customerSegment === undefined) m.push("Identificar segmento del cliente (Enterprise/Premium/etc).");
  if (input.affectsCriticalProcess === undefined && input.affectsBilling === undefined) {
    m.push("Mapear impacto a procesos críticos / facturación.");
  }
  return m;
}

// ============================================================
// API principal
// ============================================================

export function analyzeN2Escalation(input: N2EscalationInput): N2EscalationAnalysis {
  // 1. Evaluar todas las señales
  const all: EscalationSignal[] = [];
  for (const b of SIGNAL_BUILDERS) {
    const s = b.evaluate(input);
    if (s) all.push(s);
  }
  const push = all.filter((s) => s.direction === "push_escalate");
  const stay = all.filter((s) => s.direction === "push_stay");

  // 2. Verdict
  const { verdict, confidence, urgency, withinHours } = computeVerdict(push, stay, input);

  // 3. Specialists
  const specialists = matchSpecialists(input);

  // 4. SLA
  const sla = recommendSla(input, verdict);

  // 5. Playbook
  const playbook = recommendPlaybook(input);

  // 6. Rule
  const rule = matchRule(input);

  // 7. Reasoning
  const primary = specialists.find((s) => s.isPrimary) ?? null;
  const executiveSummary = buildExecutiveSummary(verdict, urgency, primary, sla);
  const reasoning = buildReasoning(push, stay, verdict);
  const risks = buildRisksIfNotEscalated(verdict, input);
  const missingData = buildMissingData(input);

  const internalNotes = [
    `Engine v${N2_ENGINE_VERSION}`,
    `Signals: ${push.length} push / ${stay.length} stay`,
    `Verdict: ${verdict} (conf ${confidence}, urg ${urgency})`,
    `Specialists: ${specialists.length}`,
    `SLA: ${sla.tier}`,
    `Playbook: ${playbook?.playbookTitle ?? "—"}`,
    `Rule: ${rule?.name ?? "—"}`,
  ].join(" · ");

  return {
    analysisId: uid("n2_an"),
    createdAt: now(),
    engineVersion: N2_ENGINE_VERSION,
    ticketKey: input.ticketKey,
    verdict, confidenceScore: confidence, urgencyScore: urgency,
    escalateWithinHours: withinHours,
    pushEscalate: push, pushStay: stay,
    specialistRecommendations: specialists,
    slaRecommendation: sla,
    playbookRecommendation: playbook,
    matchedRule: rule,
    executiveSummary, reasoning,
    risksIfNotEscalated: risks,
    missingData,
    internalNotes,
  };
}

// Export dataset accessor for UI
export { N2_SPECIALISTS_MOCK, N2_SPECIALISTS_HISTORY };
