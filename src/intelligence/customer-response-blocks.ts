// =============================================================================
// Customer Response · Building blocks
// =============================================================================
// Cada función construye UN bloque (greeting, acknowledgement, analysis, etc.)
// adaptado al contexto + audiencia + tono. Sin LLM, determinístico.
//
// Las funciones devuelven null cuando el bloque NO aplica al caso (ej. no hay
// missing data → no se incluye missing_data block).
// =============================================================================

import type {
  ResponseBlock, CustomerResponseAudience, CustomerResponseTone,
  CustomerResponseContext,
} from "@/types/customer-response";

// ============================================================
// Helpers de tono
// ============================================================

function honorific(audience: CustomerResponseAudience, tone: CustomerResponseTone): string {
  if (audience === "MANAGER" && tone === "EXECUTIVE") return "Estimado/a";
  if (tone === "FORMAL") return "Estimado/a";
  if (tone === "SIMPLE") return "Hola";
  if (tone === "URGENT") return "Atención";
  return "Hola";
}

function closingPhrase(tone: CustomerResponseTone): string {
  if (tone === "FORMAL" || tone === "EXECUTIVE") return "Quedamos atentos a su confirmación.";
  if (tone === "URGENT") return "Por favor confirmar a la brevedad para avanzar.";
  if (tone === "TECHNICAL") return "Avisar cualquier dato adicional que ayude al análisis.";
  if (tone === "SIMPLE") return "Cualquier consulta, decimos.";
  return "Quedamos atentos.";
}

function technicalLanguage(tone: CustomerResponseTone): boolean {
  return tone === "TECHNICAL";
}

function conditionalVerb(confidence: "LOW" | "MEDIUM" | "HIGH"): string {
  if (confidence === "HIGH") return "indica";
  if (confidence === "MEDIUM") return "sugiere";
  return "podría apuntar a";
}

// ============================================================
// Block builders
// ============================================================

export function blockGreeting(
  audience: CustomerResponseAudience,
  tone: CustomerResponseTone,
): ResponseBlock {
  return {
    id: "greeting",
    kind: "greeting",
    content: `${honorific(audience, tone)},`,
  };
}

export function blockAcknowledgement(
  ctx: CustomerResponseContext,
  audience: CustomerResponseAudience,
  tone: CustomerResponseTone,
): ResponseBlock {
  const techHint = ctx.sapTransaction || ctx.sapModule
    ? ` sobre la transacción ${ctx.sapTransaction ?? ""} ${ctx.sapModule ? `del módulo ${ctx.sapModule}` : ""}`.trim()
    : "";
  const titleRef = ctx.ticketTitle
    ? ` "${ctx.ticketTitle.slice(0, 100)}${ctx.ticketTitle.length > 100 ? "…" : ""}"`
    : "";

  let content: string;
  if (audience === "MANAGER" && tone === "EXECUTIVE") {
    content = `confirmamos la recepción del caso ${ctx.ticketKey}${titleRef}. ` +
      `Este reporte ya está en seguimiento por nuestro equipo AMS.`;
  } else if (tone === "URGENT") {
    content = `confirmamos recepción inmediata del caso ${ctx.ticketKey}${techHint}. ` +
      `Iniciamos análisis de forma prioritaria.`;
  } else if (tone === "TECHNICAL") {
    content = `hemos recibido el ticket ${ctx.ticketKey}${techHint}. ` +
      `${ctx.ticketDescription ? `Detalle reportado: ${ctx.ticketDescription.slice(0, 200)}${ctx.ticketDescription.length > 200 ? "…" : ""}` : "Procedemos con la revisión técnica."}`;
  } else {
    content = `hemos recibido el caso reportado${techHint}. ` +
      `Nos encontramos revisando la información para avanzar lo antes posible.`;
  }

  return { id: "acknowledgement", kind: "acknowledgement", content };
}

export function blockAnalysis(
  ctx: CustomerResponseContext,
  _audience: CustomerResponseAudience,
  tone: CustomerResponseTone,
): ResponseBlock | null {
  const conf = ctx.confidence ?? "LOW";
  const verb = conditionalVerb(conf);
  const conditional = conf !== "HIGH";

  const parts: string[] = [];
  const moduleRef = ctx.sapModule ? `en el módulo ${ctx.sapModule}` : "en el módulo afectado";
  const processRef = ctx.sapProcess ? ` (${ctx.sapProcess})` : "";

  if (conf === "LOW" || !ctx.hasErrorEvidence) {
    parts.push(
      `Con la información disponible, el análisis preliminar ${verb} ` +
      `una posible inconsistencia ${moduleRef}${processRef}. ` +
      `Esta hipótesis será confirmada durante la revisión funcional.`
    );
  } else if (conf === "MEDIUM") {
    parts.push(
      `El análisis ${verb} que el comportamiento observado ${moduleRef}${processRef} ` +
      `puede estar relacionado con la configuración o los datos maestros asociados. ` +
      `Lo validaremos antes de avanzar con la solución.`
    );
  } else {
    parts.push(
      `El análisis ${verb} que el caso ${moduleRef}${processRef} ` +
      `corresponde a un escenario conocido. Procedemos con la solución estándar.`
    );
  }

  if (technicalLanguage(tone) && ctx.sapTransaction) {
    parts.push(`Foco de revisión inicial: ${ctx.sapTransaction} y dependencias asociadas.`);
  }

  return {
    id: "analysis",
    kind: "analysis",
    content: parts.join(" "),
    conditional,
  };
}

export function blockMissingData(
  ctx: CustomerResponseContext,
  tone: CustomerResponseTone,
): ResponseBlock | null {
  const md = ctx.missingData ?? [];
  if (md.length === 0) return null;

  const intro = tone === "URGENT"
    ? "Para avanzar con el caso necesitamos URGENTE confirmar:"
    : tone === "EXECUTIVE"
      ? "Para precisar el alcance solicitamos la siguiente información:"
      : "Para avanzar con mayor precisión, necesitamos confirmar:";

  const lines = [intro, ...md.slice(0, 8).map((m) => `- ${m}`)];

  return {
    id: "missing_data",
    kind: "missing_data",
    content: lines.join("\n"),
  };
}

export function blockNextSteps(
  ctx: CustomerResponseContext,
  audience: CustomerResponseAudience,
  tone: CustomerResponseTone,
  responseType: string,
): ResponseBlock | null {
  const steps: string[] = [];

  if (ctx.hasPlaybook && ctx.playbookTitle) {
    // No exponemos detalles internos del playbook al cliente
    if (audience === "INTERNAL_AMS" || audience === "N2_CONSULTANT") {
      steps.push(`Ejecutar playbook "${ctx.playbookTitle}".`);
    } else {
      steps.push(`Aplicar el procedimiento estándar AMS para este escenario.`);
    }
  }

  if (responseType === "REQUEST_MORE_INFO") {
    steps.push(`Esperar confirmación de los datos solicitados.`);
    steps.push(`Una vez recibidos, iniciar el análisis funcional/técnico.`);
  } else if (responseType === "PRELIMINARY_DIAGNOSIS") {
    if (ctx.sapModule === "MM") {
      steps.push(`Revisar la consistencia de la OC, el maestro de material y las condiciones de recepción asociadas.`);
    } else if (ctx.sapModule === "SD") {
      steps.push(`Revisar el maestro de cliente, las condiciones de precio y la determinación de datos del pedido.`);
    } else {
      steps.push(`Revisar configuración y datos maestros asociados al escenario reportado.`);
    }
  } else if (responseType === "ESCALATION_NOTICE") {
    steps.push(`Derivar el caso al especialista N2.`);
    if (ctx.escalationKey) {
      steps.push(`Seguimiento con la referencia ${ctx.escalationKey}.`);
    }
  } else if (responseType === "WORKAROUND") {
    steps.push(`Mantener el workaround mientras se investiga la causa raíz definitiva.`);
  } else if (responseType === "RCA_PRELIMINARY") {
    steps.push(`Validar la hipótesis con pruebas adicionales.`);
    steps.push(`Comunicar RCA definitivo al cierre.`);
  } else if (responseType === "DELAY_NOTICE") {
    steps.push(`Reanudar el análisis ${ctx.newEstimatedDate ? `el ${ctx.newEstimatedDate}` : "en breve"}.`);
  } else if (responseType !== "CLOSURE") {
    steps.push(`Continuar el análisis y comunicar avance.`);
  }

  if (steps.length === 0) return null;

  const intro = tone === "TECHNICAL"
    ? "Próximos pasos técnicos:"
    : audience === "MANAGER" && tone === "EXECUTIVE"
      ? "Próximos pasos:"
      : "Próximo paso:";

  return {
    id: "next_steps",
    kind: "next_steps",
    content: [intro, ...steps.map((s) => `- ${s}`)].join("\n"),
  };
}

export function blockEta(
  ctx: CustomerResponseContext,
  tone: CustomerResponseTone,
): ResponseBlock | null {
  const est = ctx.estimation;
  if (!est) return null;
  if (!ctx.hasEta) return null;

  const minH = est.totalMinHours;
  const maxH = est.totalMaxHours;
  if (!minH || !maxH) return null;

  const conf = ctx.confidence ?? "LOW";
  const conditional = conf !== "HIGH";

  const days = `${est.totalMinBusinessDays.toFixed(1)}–${est.totalMaxBusinessDays.toFixed(1)} días hábiles`;

  let label = "Tiempo estimado preliminar";
  if (conf === "HIGH") label = "Tiempo estimado";
  if (tone === "URGENT") label = "Tiempo estimado prioritario";

  const conditionLine = conditional
    ? "Sujeto a la confirmación de los datos solicitados y validación del análisis inicial."
    : "Estimación con confianza alta basada en casos similares previos.";

  const content = `${label}:\nEntre ${minH} y ${maxH} horas hábiles (${days}).\n${conditionLine}`;

  return { id: "eta", kind: "eta", content, conditional };
}

export function blockWorkaround(ctx: CustomerResponseContext): ResponseBlock | null {
  if (!ctx.resolutionSummary) return null;
  return {
    id: "workaround",
    kind: "workaround",
    content: `Mientras se confirma la solución definitiva:\n${ctx.resolutionSummary}\n` +
      `Esta acción es de carácter temporal hasta validar la causa raíz.`,
    conditional: true,
  };
}

export function blockRca(
  ctx: CustomerResponseContext,
  isFinal: boolean,
): ResponseBlock | null {
  if (!ctx.rootCauseSummary) return null;

  if (!isFinal || !ctx.rootCauseValidated) {
    return {
      id: "rca",
      kind: "rca",
      content: `Causa raíz preliminar identificada:\n${ctx.rootCauseSummary}\n` +
        `Este análisis está sujeto a validación adicional antes del cierre.`,
      conditional: true,
    };
  }

  return {
    id: "rca",
    kind: "rca",
    content: `Causa raíz validada:\n${ctx.rootCauseSummary}`,
  };
}

export function blockResolutionSummary(ctx: CustomerResponseContext): ResponseBlock | null {
  if (!ctx.resolutionSummary) return null;
  return {
    id: "resolution_summary",
    kind: "resolution_summary",
    content: `Acción realizada:\n${ctx.resolutionSummary}`,
  };
}

export function blockValidation(ctx: CustomerResponseContext): ResponseBlock | null {
  if (!ctx.validationSummary) return null;
  return {
    id: "validation",
    kind: "validation",
    content: `Validación:\n${ctx.validationSummary}`,
  };
}

export function blockPrevention(ctx: CustomerResponseContext): ResponseBlock | null {
  if (!ctx.preventionRecommendation) return null;
  return {
    id: "prevention",
    kind: "prevention",
    content: `Recomendación preventiva:\n${ctx.preventionRecommendation}`,
  };
}

export function blockEscalation(ctx: CustomerResponseContext): ResponseBlock | null {
  if (!ctx.hasEscalationN2) return null;
  const ref = ctx.escalationKey ? ` (referencia ${ctx.escalationKey})` : "";
  return {
    id: "escalation",
    kind: "escalation",
    content:
      `Para garantizar la mejor resolución, el caso fue derivado a un consultor ` +
      `especialista N2${ref}. El nuevo responsable continuará el análisis con ` +
      `todo el contexto ya registrado.`,
  };
}

export function blockClosing(
  audience: CustomerResponseAudience,
  tone: CustomerResponseTone,
  signature: string,
): ResponseBlock {
  const phrase = closingPhrase(tone);
  const sig = audience === "INTERNAL_AMS" || audience === "N2_CONSULTANT"
    ? "" // Nota interna no usa firma cliente
    : `\n\nSaludos,\n${signature}`;

  return {
    id: "closing",
    kind: "closing",
    content: `${phrase}${sig}`,
  };
}

export function blockInternalNote(
  ctx: CustomerResponseContext,
  notes: string[],
): ResponseBlock {
  const lines = [
    "INTERNAL NOTE — no incluir en mensaje al cliente:",
    ...notes,
    ctx.estimation ? `Estimación interna: ${ctx.estimation.totalMinHours}h-${ctx.estimation.totalMaxHours}h (conf ${ctx.estimation.confidence}).` : "",
  ].filter(Boolean);
  return {
    id: "internal_note",
    kind: "internal_note",
    content: lines.join("\n"),
  };
}
