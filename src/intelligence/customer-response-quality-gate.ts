// =============================================================================
// Customer Response · Quality Gate
// =============================================================================
// Evalúa una respuesta generada y la bloquea/avisa según 8 reglas duras:
//
//   1. claim_root_cause_low_confidence  → "causa raíz es X" + conf=LOW
//   2. claim_resolved_without_evidence  → "resuelto" sin validación documentada
//   3. promise_exact_eta_no_baseline    → fecha/hora absoluta sin baseline
//   4. blame_user                       → patrones culpabilizadores
//   5. absolute_language                → "siempre", "nunca", "garantizado", "100%"
//   6. critical_prd_no_human_review     → severity=CRITICAL+PRD sin revisión humana
//   7. missing_subject                  → subject vacío o genérico
//   8. body_too_short                   → body < 80 chars
//
// Cada regla devuelve QualityIssue con severity = block | warn | info.
// Score 0-100 ponderando issues. canSend=false si hay algún issue block.
// safeVersion: si hay block, reescribe automáticamente con lenguaje condicional.
// =============================================================================

import type {
  QualityGateReport, QualityIssue,
  CustomerResponseType, CustomerResponseAudience, CustomerResponseTone,
  CustomerResponseConfidence, CustomerResponseContext, ResponseBlock,
} from "@/types/customer-response";

// ============================================================
// Input mínimo para evaluar — evita acoplar con el output completo
// ============================================================

export interface QualityInputResponse {
  subject: string;
  body: string;
  blocks: ResponseBlock[];
  nextSteps: string[];
  missingDataRequests: string[];
  etaStatement: string | null;
  riskWarnings: string[];
  summary: string;
}

export interface QualityContext {
  responseType: CustomerResponseType;
  audience: CustomerResponseAudience;
  tone: CustomerResponseTone;
  confidence: CustomerResponseConfidence;
  context: CustomerResponseContext;
  humanReviewed?: boolean;
}

// ============================================================
// Reglas individuales
// ============================================================

/** Rule 1: afirma causa raíz con confidence LOW. */
function ruleClaimRootCauseLowConfidence(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (ctx.confidence !== "LOW") return null;
  const patterns = [
    /\bla causa raíz es\b/i,
    /\bel problema (?:es|está) causado por\b/i,
    /\bse confirma que\b/i,
    /\bse identific[oó] (?:que|la causa)\b/i,
    /\bcausa identificada:\b/i,
  ];
  for (const rx of patterns) {
    const m = resp.body.match(rx);
    if (m) {
      return {
        ruleId: "claim_root_cause_low_confidence",
        severity: "block",
        message: "Afirma causa raíz con confianza baja. Usar lenguaje condicional.",
        matchedText: m[0],
        suggestedFix: 'Reemplazar por "podría apuntar a" / "sugiere que" / "hipótesis preliminar".',
      };
    }
  }
  return null;
}

/** Rule 2: dice "resuelto" sin evidencia de validación. */
function ruleClaimResolvedNoEvidence(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  const hasValidation = !!ctx.context.validationSummary
    || ctx.context.rootCauseValidated === true;
  if (hasValidation) return null;
  const patterns = [
    /\b(?:caso|problema|incidente|ticket) resuelto\b/i,
    /\b(?:queda|está) solucionado\b/i,
    /\bcerrado satisfactoriamente\b/i,
    /\bfix aplicado y validado\b/i,
    /\bsoluci[oó]n confirmada\b/i,
  ];
  for (const rx of patterns) {
    const m = resp.body.match(rx);
    if (m) {
      return {
        ruleId: "claim_resolved_without_evidence",
        severity: "block",
        message: "Afirma resolución sin documentar validación.",
        matchedText: m[0],
        suggestedFix: 'Agregar bloque "Validación:" o cambiar a "solución aplicada, pendiente de validación".',
      };
    }
  }
  return null;
}

/** Rule 3: promete fecha/hora exacta sin baseline (estimación). */
function rulePromiseExactEtaNoBaseline(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  const hasBaseline = !!ctx.context.estimation;
  if (hasBaseline) return null;
  // Promesa de fecha/hora ABSOLUTA sin estimación detrás
  const patterns = [
    /\bestaremos listos? (?:a las|el)\b/i,
    /\bse entrega (?:el|antes del)\b/i,
    /\bplazo (?:exacto|garantizado):/i,
    /\ba más tardar (?:el|antes del)\b/i,
    /\bantes de las? \d/i,
  ];
  for (const rx of patterns) {
    const m = resp.body.match(rx);
    if (m) {
      return {
        ruleId: "promise_exact_eta_no_baseline",
        severity: "block",
        message: "Promete fecha exacta sin estimación que la respalde.",
        matchedText: m[0],
        suggestedFix: 'Usar "estimación preliminar sujeta a validación".',
      };
    }
  }
  return null;
}

/** Rule 4: culpa al usuario o cliente. */
function ruleBlameUser(resp: QualityInputResponse): QualityIssue | null {
  const patterns = [
    /\b(?:el|la) (?:usuario|cliente) no debi[oó]\b/i,
    /\bel error fue (?:cometido|provocado) por\b/i,
    /\b(?:el|la) (?:usuario|cliente) (?:falla|fallo|equivoc[oó])\b/i,
    /\b(?:culpa|responsabilidad) (?:del|de la|de los) (?:usuario|cliente)\b/i,
    /\bdebi[oó] (?:haber|tener) (?:cuidado|atención)\b/i,
    /\bes un error humano (?:del|de la) (?:usuario|cliente)\b/i,
  ];
  for (const rx of patterns) {
    const m = resp.body.match(rx);
    if (m) {
      return {
        ruleId: "blame_user",
        severity: "block",
        message: "Lenguaje culpabilizador hacia el usuario/cliente.",
        matchedText: m[0],
        suggestedFix: 'Reformular como "se detectó una desviación en el proceso" o "una variable del flujo no se cumplió".',
      };
    }
  }
  return null;
}

/** Rule 5: lenguaje absoluto sin contexto seguro. */
function ruleAbsoluteLanguage(resp: QualityInputResponse): QualityIssue | null {
  // Detectar fuera de contexto seguro (no si está dentro de "X siempre que" condicional)
  const dangerous = [
    /\bgarantiza(?:do|mos)\b/i,
    /\b(?:100|cien)\s*%\s*(?:seguro|garantizado|confirmado)\b/i,
    /\b(?:nunca|jamás) (?:falla|fallará|tendrá)\b/i,
    /\b(?:siempre|todo) funciona(?:rá)?\s*(?:sin|bien|perfecto)\b/i,
    /\bsoluci[oó]n definitiva sin riesgo\b/i,
    /\bzero (?:bug|error)\b/i,
  ];
  for (const rx of dangerous) {
    const m = resp.body.match(rx);
    if (m) {
      return {
        ruleId: "absolute_language",
        severity: "block",
        message: "Lenguaje absoluto sin sustento — promesa difícil de cumplir.",
        matchedText: m[0],
        suggestedFix: 'Usar "esperamos que..." o "según las pruebas realizadas...".',
      };
    }
  }
  return null;
}

/** Rule 6: caso crítico PRD sin revisión humana. */
function ruleCriticalPrdNoHumanReview(
  _resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  const isPrd = !!ctx.context.isProductive;
  const isCritical =
    (ctx.context.ticketPriority?.toLowerCase() ?? "").includes("high")
    || (ctx.context.ticketPriority?.toLowerCase() ?? "").includes("critical")
    || (ctx.context.ticketPriority?.toLowerCase() ?? "").includes("highest")
    || (ctx.context.ticketPriority?.toLowerCase() ?? "").includes("p1");
  if (!(isPrd && isCritical)) return null;
  if (ctx.humanReviewed === true) return null;
  return {
    ruleId: "critical_prd_no_human_review",
    severity: "block",
    message: "Caso crítico en PRD requiere revisión humana antes de enviar al cliente.",
    suggestedFix: "Marcar como revisada por consultor senior, o asignar a Service Lead.",
  };
}

/** Rule 7: subject vacío o genérico. */
function ruleMissingSubject(resp: QualityInputResponse): QualityIssue | null {
  if (!resp.subject || resp.subject.trim().length < 8) {
    return {
      ruleId: "missing_subject",
      severity: "block",
      message: "Subject vacío o demasiado corto.",
      suggestedFix: 'Usar formato "[KEY] Tipo: título". Ej: "[AMS-201] Análisis preliminar".',
    };
  }
  const generic = /^(ticket|caso|consulta|importante|urgente|update)\s*$/i;
  if (generic.test(resp.subject.trim())) {
    return {
      ruleId: "missing_subject",
      severity: "block",
      message: "Subject genérico — el cliente no entenderá el contexto.",
      suggestedFix: "Incluir clave del ticket y tipo de respuesta.",
    };
  }
  return null;
}

/** Rule 8: body demasiado corto para ser útil. */
function ruleBodyTooShort(resp: QualityInputResponse): QualityIssue | null {
  if (resp.body.length < 80) {
    return {
      ruleId: "body_too_short",
      severity: "block",
      message: `Body demasiado corto (${resp.body.length} chars). Mínimo 80.`,
      suggestedFix: "Incluir contexto, análisis o próximo paso.",
    };
  }
  if (resp.body.length < 150) {
    return {
      ruleId: "body_too_short",
      severity: "warn",
      message: `Body breve (${resp.body.length} chars). Considere agregar contexto.`,
    };
  }
  return null;
}

/** Rule 9 (warn): falta next_steps en respuestas operativas. */
function ruleMissingNextSteps(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  const requiresNextSteps: CustomerResponseType[] = [
    "ACKNOWLEDGEMENT", "REQUEST_MORE_INFO", "PRELIMINARY_DIAGNOSIS",
    "STATUS_UPDATE", "WORKAROUND", "ESCALATION_NOTICE",
    "RESOLUTION_PROPOSAL", "RCA_PRELIMINARY", "DELAY_NOTICE",
  ];
  if (!requiresNextSteps.includes(ctx.responseType)) return null;
  if (resp.nextSteps.length > 0) return null;
  return {
    ruleId: "missing_next_steps",
    severity: "warn",
    message: "No incluye próximos pasos — el cliente queda sin claridad de qué sigue.",
    suggestedFix: "Agregar al menos un próximo paso concreto.",
  };
}

/** Rule 10 (warn): tono ejecutivo con texto técnico denso (mismatch). */
function ruleToneMismatch(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  // Si es EXECUTIVE pero el body tiene muchas transacciones SAP → mismatch
  if (ctx.tone === "EXECUTIVE" || ctx.audience === "MANAGER") {
    const techHits = (resp.body.match(/\b[A-Z]{2,3}\d{2,3}[A-Z]?\b/g) || []).length;
    if (techHits > 3) {
      return {
        ruleId: "tone_mismatch",
        severity: "info",
        message: `Tono ejecutivo con ${techHits} referencias técnicas — considere simplificar.`,
        suggestedFix: "Redactar para sponsor: ocultar transacciones SAP, enfatizar impacto al negocio.",
      };
    }
  }
  return null;
}

// ============================================================
// Rules v0.2 — 5 reglas adicionales
// ============================================================

/** Rule 11 (warn): falta de cierre profesional ("Saludos", etc.). */
function ruleMissingProfessionalClosing(resp: QualityInputResponse): QualityIssue | null {
  const tail = resp.body.slice(-200).toLowerCase();
  if (!/saludos|atentos|cordialmente|sinceramente|equipo|regards|respetuosamente/i.test(tail)) {
    return {
      ruleId: "missing_professional_closing",
      severity: "warn",
      message: "Falta cierre profesional al final del cuerpo.",
      suggestedFix: 'Cerrar con "Saludos," + firma del equipo.',
    };
  }
  return null;
}

/** Rule 12 (warn): respuesta excesivamente larga (>3000 chars). */
function ruleBodyTooLong(resp: QualityInputResponse): QualityIssue | null {
  if (resp.body.length > 3000) {
    return {
      ruleId: "body_too_long",
      severity: "warn",
      message: `Respuesta demasiado larga (${resp.body.length} chars). Cliente puede no leer todo.`,
      suggestedFix: "Mover detalles técnicos a un adjunto. Mantener body en <2000 chars.",
    };
  }
  return null;
}

/** Rule 13 (warn): jerga técnica SAP excesiva sin glosario para audiencias funcionales. */
function ruleExcessiveJargon(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (ctx.audience !== "FUNCTIONAL_USER" && ctx.audience !== "MANAGER") return null;
  // Cuenta acrónimos SAP en el body
  const acronyms = resp.body.match(/\b(?:OMB1|VOFM|NACE|MIRO|MIGO|VKOA|OVKK|OB52|VFX3|VL\d{2}N?|VA\d{2}|ME\d{2}N?|MD\d{2}|WE\d{2}|BD\d{2}|SU\d{2}|ST\d{2}|SM\d{2}|FB\d{2}|MM\d{2}|XK\d{2}|FK\d{2}|XD\d{2}|FD\d{2}|OB\w{2,3}|OV\w{2,3})\b/g) || [];
  if (acronyms.length >= 5) {
    return {
      ruleId: "excessive_jargon",
      severity: "warn",
      message: `${acronyms.length} acrónimos SAP — exceso de jerga para audiencia ${ctx.audience.toLowerCase()}.`,
      suggestedFix: "Simplificar o agregar explicación entre paréntesis (ej. 'OMB1 — customizing de stock').",
    };
  }
  return null;
}

/** Rule 14 (info): falta confidence label visible en el cuerpo. */
function ruleNoConfidenceDisclosure(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (ctx.responseType === "ACKNOWLEDGEMENT" || ctx.responseType === "DUPLICATE_CASE") return null;
  if (!/confianza|preliminar|sujeto a|hip[oó]tesis/i.test(resp.body)) {
    return {
      ruleId: "no_confidence_disclosure",
      severity: "info",
      message: "Body no explicita confianza ni naturaleza preliminar del análisis.",
      suggestedFix: "Agregar frase del tipo 'confianza media' o 'análisis preliminar sujeto a validación'.",
    };
  }
  return null;
}

/** Rule 15 (block): subject NO incluye ticket key. */
function ruleSubjectMissingTicketKey(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (!resp.subject.includes(ctx.context.ticketKey)) {
    return {
      ruleId: "subject_missing_ticket_key",
      severity: "warn",
      message: "Subject no incluye la clave del ticket.",
      suggestedFix: `Incluir ${ctx.context.ticketKey} al inicio del subject para tracking del cliente.`,
    };
  }
  return null;
}

// ============================================================
// Safe version builder — reescribe con lenguaje condicional
// ============================================================

function buildSafeVersion(
  resp: QualityInputResponse,
  issues: QualityIssue[],
): string {
  let safe = resp.body;

  // Aplicar fixes por regla bloqueante
  for (const issue of issues.filter((i) => i.severity === "block")) {
    if (issue.ruleId === "claim_root_cause_low_confidence") {
      safe = safe.replace(/\bla causa raíz es\b/gi, "una hipótesis preliminar apunta a");
      safe = safe.replace(/\bel problema (?:es|está) causado por\b/gi, "el problema podría estar relacionado con");
      safe = safe.replace(/\bse confirma que\b/gi, "se observa que (sujeto a validación)");
      safe = safe.replace(/\bse identific[oó] (?:que|la causa)\b/gi, "se sospecha");
      safe = safe.replace(/\bcausa identificada:/gi, "hipótesis preliminar:");
    }
    if (issue.ruleId === "claim_resolved_without_evidence") {
      safe = safe.replace(/\b(?:caso|problema|incidente|ticket) resuelto\b/gi, "$& (pendiente de validación)");
      safe = safe.replace(/\b(?:queda|está) solucionado\b/gi, "solución aplicada — pendiente de validación con key user");
      safe = safe.replace(/\bcerrado satisfactoriamente\b/gi, "solución aplicada sujeta a validación");
      safe = safe.replace(/\bfix aplicado y validado\b/gi, "fix aplicado — validación pendiente");
      safe = safe.replace(/\bsoluci[oó]n confirmada\b/gi, "solución aplicada, pendiente de confirmación");
    }
    if (issue.ruleId === "promise_exact_eta_no_baseline") {
      safe = safe.replace(/\bestaremos listos? (?:a las|el)\b/gi, "buscamos completar en la ventana estimada para el");
      safe = safe.replace(/\bse entrega (?:el|antes del)\b/gi, "objetivo de entrega aproximado para el");
      safe = safe.replace(/\bplazo (?:exacto|garantizado):/gi, "estimación preliminar:");
      safe = safe.replace(/\ba más tardar (?:el|antes del)\b/gi, "objetivo aproximado para el");
    }
    if (issue.ruleId === "blame_user") {
      safe = safe.replace(/\b(?:el|la) (?:usuario|cliente) no debi[oó]\b/gi, "se detectó que el flujo");
      safe = safe.replace(/\bel error fue (?:cometido|provocado) por\b/gi, "se observa una desviación en");
      safe = safe.replace(/\bes un error humano (?:del|de la) (?:usuario|cliente)\b/gi, "se observa una variable del flujo no cumplida");
    }
    if (issue.ruleId === "absolute_language") {
      safe = safe.replace(/\bgarantiza(?:do|mos)\b/gi, "buscamos asegurar");
      safe = safe.replace(/\b(?:100|cien)\s*%\s*(?:seguro|garantizado|confirmado)\b/gi, "validado con alta confianza");
      safe = safe.replace(/\b(?:nunca|jamás) (?:falla|fallará|tendrá)\b/gi, "es muy poco probable que falle");
      safe = safe.replace(/\bzero (?:bug|error)\b/gi, "sin errores conocidos");
    }
    if (issue.ruleId === "body_too_short") {
      safe = safe + "\n\nQuedamos atentos a cualquier información adicional que ayude a precisar el análisis.";
    }
  }

  if (safe === resp.body) return safe; // sin cambios
  return safe;
}

// ============================================================
// Score & level
// ============================================================

function computeScore(issues: QualityIssue[]): number {
  let s = 100;
  for (const i of issues) {
    if (i.severity === "block") s -= 25;
    else if (i.severity === "warn") s -= 10;
    else if (i.severity === "info") s -= 3;
  }
  return Math.max(0, s);
}

function levelFromScore(score: number, hasBlock: boolean): QualityGateReport["level"] {
  if (hasBlock) return "blocked";
  if (score >= 85) return "good";
  if (score >= 70) return "acceptable";
  return "needs_review";
}

function buildSuggestions(issues: QualityIssue[]): string[] {
  const out: string[] = [];
  for (const i of issues) {
    if (i.suggestedFix && !out.includes(i.suggestedFix)) out.push(i.suggestedFix);
  }
  return out;
}

// ============================================================
// API pública
// ============================================================

// ============================================================
// DH v0.9 — Reglas adicionales (hardening Customer Response)
// ============================================================

/** Rule 16: Workaround debe marcarse explícitamente como temporal. */
function ruleWorkaroundNotMarkedTemporary(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (ctx.responseType !== "WORKAROUND") return null;
  // Buscar señales de "temporal" / "provisional" / "mientras tanto"
  const hasTemporaryFlag = /\b(temporal(?:mente)?|provisional|mientras tanto|hasta que|solución parche|workaround temporal)\b/i.test(resp.body);
  if (!hasTemporaryFlag) {
    return {
      ruleId: "workaround_not_marked_temporary",
      severity: "warn",
      message: "Tipo WORKAROUND debe indicar explícitamente que es una solución temporal.",
      suggestedFix: 'Agregar frase como "Esta es una solución temporal mientras trabajamos en la corrección definitiva."',
    };
  }
  return null;
}

/** Rule 17: RCA preliminar debe llevar disclaimer "preliminar" / "sujeto a validación". */
function ruleRcaPreliminaryMissingDisclaimer(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (ctx.responseType !== "RCA_PRELIMINARY") return null;
  const hasDisclaimer = /\b(preliminar|sujeto a validaci[oó]n|pendiente de confirmaci[oó]n|hip[oó]tesis|análisis inicial)\b/i.test(resp.body);
  if (!hasDisclaimer) {
    return {
      ruleId: "rca_preliminary_missing_disclaimer",
      severity: "warn",
      message: "RCA preliminar debe declararse explícitamente como tal, no como conclusión definitiva.",
      suggestedFix: 'Agregar "Análisis preliminar — sujeto a validación" al inicio del bloque RCA.',
    };
  }
  return null;
}

/** Rule 18: Closure debe incluir acción, validación y recomendación preventiva. */
function ruleClosureMissingPreventionOrValidation(
  resp: QualityInputResponse, ctx: QualityContext,
): QualityIssue | null {
  if (ctx.responseType !== "CLOSURE") return null;
  const hasValidation = /\b(validad[ao]|verificad[ao]|confirmad[ao]|prob[ae]?d[ao])\b/i.test(resp.body)
    || ctx.context.validationSummary;
  const hasPrevention = /\b(prevenc[ií]ón|para evitar|recomend(?:ación|amos)|en el futuro|a futuro)\b/i.test(resp.body)
    || ctx.context.preventionRecommendation;
  if (!hasValidation || !hasPrevention) {
    const missing: string[] = [];
    if (!hasValidation) missing.push("validación documentada");
    if (!hasPrevention) missing.push("recomendación preventiva");
    return {
      ruleId: "closure_missing_prevention_or_validation",
      severity: "warn",
      message: `Cierre debería incluir ${missing.join(" y ")}.`,
      suggestedFix: "Completar con qué se validó después del fix + una recomendación para evitar recurrencia.",
    };
  }
  return null;
}

const ALL_RULES = [
  ruleClaimRootCauseLowConfidence,
  ruleClaimResolvedNoEvidence,
  rulePromiseExactEtaNoBaseline,
  ruleBlameUser,
  ruleAbsoluteLanguage,
  ruleCriticalPrdNoHumanReview,
  ruleMissingSubject,
  ruleBodyTooShort,
  ruleMissingNextSteps,
  ruleToneMismatch,
  // v0.2
  ruleMissingProfessionalClosing,
  ruleBodyTooLong,
  ruleExcessiveJargon,
  ruleNoConfidenceDisclosure,
  ruleSubjectMissingTicketKey,
  // DH v0.9 — hardening
  ruleWorkaroundNotMarkedTemporary,
  ruleRcaPreliminaryMissingDisclaimer,
  ruleClosureMissingPreventionOrValidation,
];

/**
 * Evalúa una respuesta y devuelve el reporte del quality gate.
 * Determinístico, sin LLM.
 */
export function evaluateCustomerResponseQuality(
  resp: QualityInputResponse,
  ctx: QualityContext,
): QualityGateReport {
  const issues: QualityIssue[] = [];
  for (const rule of ALL_RULES) {
    const issue = rule(resp, ctx);
    if (issue) issues.push(issue);
  }

  const hasBlock = issues.some((i) => i.severity === "block");
  const score = computeScore(issues);
  const level = levelFromScore(score, hasBlock);
  const canSend = !hasBlock;
  const requiresHumanReview =
    !!ctx.context.isProductive
    && ((ctx.context.ticketPriority?.toLowerCase() ?? "").includes("high")
      || (ctx.context.ticketPriority?.toLowerCase() ?? "").includes("critical")
      || (ctx.context.ticketPriority?.toLowerCase() ?? "").includes("p1"))
    && ctx.humanReviewed !== true;

  const safeVersion = hasBlock ? buildSafeVersion(resp, issues) : null;
  const suggestions = buildSuggestions(issues);

  return {
    score,
    level,
    canSend,
    requiresHumanReview,
    issues,
    suggestions,
    safeVersion,
    evaluatedAt: new Date().toISOString(),
  };
}
