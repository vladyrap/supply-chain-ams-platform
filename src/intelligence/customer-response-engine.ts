// =============================================================================
// Customer Response Intelligence — Engine
// =============================================================================
// Genera respuestas al cliente AMS combinando:
//   - context del ticket (módulo, transacción, severidad, etc.)
//   - estimación (banda de horas + confianza)
//   - señales de inteligencia (playbook, knowledge, evidence, escalation)
//   - audiencia + tono solicitados
//
// Determinístico, sin LLM. Compone bloques + valida con quality gate.
//
// Reglas duras del motor:
//   - confidence LOW → analysis usa lenguaje condicional.
//   - missing data presente → bloque missing_data obligatorio.
//   - PRD + CRITICAL → autoUrgentForCriticalPrd fuerza tone URGENT + flag review.
//   - playbook existente → next_steps menciona procedimiento, no detalles internos.
//   - escalation N2 activa → block escalation obligatorio.
//   - RCA preliminary → lenguaje "sujeto a validación".
//   - CLOSURE → require resolution + validation + prevention.
//
// Output pasa por evaluateCustomerResponseQuality antes de retornarse.
// =============================================================================

import type {
  CustomerResponse,
  CustomerResponseContext,
  CustomerResponseOptions,
  CustomerResponseType,
  CustomerResponseAudience,
  CustomerResponseTone,
  CustomerResponseConfidence,
  ResponseBlock,
} from "@/types/customer-response";
import {
  blockGreeting, blockAcknowledgement, blockAnalysis, blockMissingData,
  blockNextSteps, blockEta, blockWorkaround, blockRca,
  blockResolutionSummary, blockValidation, blockPrevention,
  blockEscalation, blockClosing, blockInternalNote,
} from "./customer-response-blocks";
import { RESPONSE_TEMPLATES, buildSubject } from "./customer-response-templates";
import { evaluateCustomerResponseQuality } from "./customer-response-quality-gate";

export const ENGINE_VERSION = "0.1.0-customer-response";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

// ============================================================
// Detección automática del responseType si no se pasa
// ============================================================

function detectResponseType(ctx: CustomerResponseContext): CustomerResponseType {
  if (ctx.duplicateOfTicketKey) return "DUPLICATE_CASE";
  if (ctx.scopeRationale) return "OUT_OF_SCOPE";
  if (ctx.delayReason) return "DELAY_NOTICE";

  // Closure: rootCauseValidated + resolution + validation
  if (ctx.rootCauseValidated && ctx.resolutionSummary && ctx.validationSummary) {
    return "CLOSURE";
  }

  // RCA Final: causa validada
  if (ctx.rootCauseValidated && ctx.rootCauseSummary) return "RCA_FINAL";

  // RCA Preliminary: causa identificada sin validar
  if (ctx.rootCauseSummary && !ctx.rootCauseValidated) return "RCA_PRELIMINARY";

  // Resolution proposal: hay resolutionSummary pero sin validar todavía
  if (ctx.resolutionSummary && !ctx.validationSummary) return "RESOLUTION_PROPOSAL";

  // Escalation notice: hay escalation activa
  if (ctx.hasEscalationN2) return "ESCALATION_NOTICE";

  // Workaround: hay solutionSummary marcado como temporal
  // (handled antes de resolution_proposal arriba si está validado)

  // Request more info: hay missing data CRÍTICOS
  if (ctx.missingData && ctx.missingData.length >= 3) return "REQUEST_MORE_INFO";

  // Preliminary diagnosis: hay análisis básico (módulo + algo más)
  if (ctx.sapModule && (ctx.confidence === "MEDIUM" || ctx.confidence === "HIGH")) {
    return "PRELIMINARY_DIAGNOSIS";
  }

  // Default: acknowledgement
  return "ACKNOWLEDGEMENT";
}

function detectAudience(ctx: CustomerResponseContext): CustomerResponseAudience {
  // Heurística simple — por defecto FUNCTIONAL_USER.
  // En el futuro: leer del ticket.reporter o customField "audience type".
  if (ctx.hasEscalationN2) return "N2_CONSULTANT";
  return "FUNCTIONAL_USER";
}

function detectTone(
  ctx: CustomerResponseContext,
  audience: CustomerResponseAudience,
  autoUrgent: boolean,
): CustomerResponseTone {
  const isCriticalPrd = ctx.isProductive
    && (ctx.ticketPriority?.toLowerCase().includes("high")
      || ctx.ticketPriority?.toLowerCase().includes("critical")
      || ctx.ticketPriority?.toLowerCase().includes("p1"));

  if (autoUrgent && isCriticalPrd) return "URGENT";
  if (audience === "MANAGER") return "EXECUTIVE";
  if (audience === "TECHNICAL_USER" || audience === "N2_CONSULTANT") return "TECHNICAL";
  if (audience === "INTERNAL_AMS") return "TECHNICAL";
  return "FORMAL";
}

function deriveConfidence(ctx: CustomerResponseContext): CustomerResponseConfidence {
  if (ctx.confidence) return ctx.confidence;
  if (!ctx.estimation) return "LOW";
  const conf = ctx.estimation.confidence;
  if (conf === "HIGH") return "HIGH";
  if (conf === "MEDIUM") return "MEDIUM";
  return "LOW";
}

// ============================================================
// Composición del body
// ============================================================

function composeBody(blocks: ResponseBlock[]): { body: string; summary: string } {
  const visibleBlocks = blocks.filter((b) => b.kind !== "internal_note");
  const body = visibleBlocks.map((b) => b.content).join("\n\n").trim();

  // Summary: primera frase del acknowledgement
  const ack = blocks.find((b) => b.kind === "acknowledgement");
  let summary = "";
  if (ack) {
    const firstSentence = ack.content.split(/\.\s/)[0];
    summary = firstSentence.length > 240 ? firstSentence.slice(0, 240) + "…" : firstSentence + ".";
  } else {
    summary = body.slice(0, 200);
  }

  return { body, summary };
}

function extractNextSteps(blocks: ResponseBlock[]): string[] {
  const nb = blocks.find((b) => b.kind === "next_steps");
  if (!nb) return [];
  return nb.content
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

function extractMissingDataRequests(blocks: ResponseBlock[]): string[] {
  const mb = blocks.find((b) => b.kind === "missing_data");
  if (!mb) return [];
  return mb.content
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

function extractEtaStatement(blocks: ResponseBlock[]): string | null {
  const eb = blocks.find((b) => b.kind === "eta");
  return eb ? eb.content : null;
}

function buildRiskWarnings(
  ctx: CustomerResponseContext,
  responseType: CustomerResponseType,
  confidence: CustomerResponseConfidence,
): string[] {
  const w: string[] = [];
  if (ctx.isProductive && (ctx.ticketPriority?.toLowerCase().includes("high") || ctx.ticketPriority?.toLowerCase().includes("critical"))) {
    w.push("Caso crítico en PRD — recomendado revisión humana antes de enviar.");
  }
  if (confidence === "LOW") {
    w.push("Confianza baja en el análisis — evitar afirmaciones definitivas.");
  }
  if (responseType === "RCA_PRELIMINARY" && !ctx.rootCauseValidated) {
    w.push("RCA preliminar sin validar — comunicar como hipótesis.");
  }
  if (responseType === "CLOSURE" && !ctx.validationSummary) {
    w.push("Cierre sin validación documentada — agregar evidencia antes de enviar.");
  }
  if (responseType === "RESOLUTION_PROPOSAL" && confidence === "LOW") {
    w.push("Propuesta con confianza baja — evaluar si conviene esperar más data.");
  }
  return w;
}

function buildInternalNotes(
  ctx: CustomerResponseContext,
  blocks: ResponseBlock[],
  responseType: CustomerResponseType,
): string {
  const lines: string[] = [];
  lines.push(`Engine v${ENGINE_VERSION}`);
  lines.push(`Type: ${responseType}`);
  lines.push(`Blocks: ${blocks.map((b) => b.kind).join(" → ")}`);
  if (ctx.estimation) {
    lines.push(`Estimación: ${ctx.estimation.totalMinHours}h-${ctx.estimation.totalMaxHours}h conf ${ctx.estimation.confidence}`);
  }
  if (ctx.hasPlaybook) lines.push(`Playbook: ${ctx.playbookTitle ?? "match detectado"}`);
  if (ctx.hasEscalationN2) lines.push(`Escalación: ${ctx.escalationKey ?? "activa"}`);
  if (ctx.missingData && ctx.missingData.length) lines.push(`Missing data: ${ctx.missingData.length} items`);
  return lines.join(" · ");
}

// ============================================================
// API principal
// ============================================================

export function generateCustomerResponse(
  context: CustomerResponseContext,
  options: CustomerResponseOptions = {},
): CustomerResponse {
  // 1. Resolución de parámetros
  const responseType = options.responseType ?? detectResponseType(context);
  const audience = options.audience ?? detectAudience(context);
  const autoUrgent = options.autoUrgentForCriticalPrd ?? true;
  const tone = options.tone ?? detectTone(context, audience, autoUrgent);
  const confidence = deriveConfidence(context);
  const signature = options.signature || "Equipo AMS";
  const generatedBy = options.generatedBy || "system";
  const enforceQualityGate = options.enforceQualityGate ?? true;

  // 2. Recoger template
  const blockSpecs = RESPONSE_TEMPLATES[responseType];

  // 3. Construir bloques aplicables
  const blocks: ResponseBlock[] = [];
  const ctxForBlocks = { ...context, confidence };

  for (const spec of blockSpecs) {
    let block: ResponseBlock | null = null;
    switch (spec) {
      case "greeting":
        block = blockGreeting(audience, tone); break;
      case "acknowledgement":
        block = blockAcknowledgement(ctxForBlocks, audience, tone); break;
      case "analysis":
        block = blockAnalysis(ctxForBlocks, audience, tone); break;
      case "missing_data":
        if (options.includeMissingData !== false) {
          block = blockMissingData(ctxForBlocks, tone);
        }
        break;
      case "eta":
        if (options.includeEta !== false) {
          const hasEtaSignal = !!context.estimation && (context.hasEta ?? true);
          if (hasEtaSignal) block = blockEta({ ...ctxForBlocks, hasEta: true }, tone);
        }
        break;
      case "next_steps":
        if (options.includeNextSteps !== false) {
          block = blockNextSteps(ctxForBlocks, audience, tone, responseType);
        }
        break;
      case "workaround":
        if (options.includeWorkaround !== false) {
          block = blockWorkaround(ctxForBlocks);
        }
        break;
      case "escalation":
        block = blockEscalation(ctxForBlocks); break;
      case "rca_preliminary":
        block = blockRca(ctxForBlocks, false); break;
      case "rca_final":
        block = blockRca(ctxForBlocks, true); break;
      case "resolution_summary":
        block = blockResolutionSummary(ctxForBlocks); break;
      case "validation":
        block = blockValidation(ctxForBlocks); break;
      case "prevention":
        block = blockPrevention(ctxForBlocks); break;
      case "closing":
        block = blockClosing(audience, tone, signature); break;
    }
    if (block) blocks.push(block);
  }

  // 4. Bloque interno opcional para INTERNAL_AMS
  if (audience === "INTERNAL_AMS") {
    blocks.push(blockInternalNote(ctxForBlocks, [
      `Ticket ${context.ticketKey} · prioridad ${context.ticketPriority ?? "—"} · ${context.environment ?? "?"}`,
      `Type: ${responseType} · Tone: ${tone} · Confidence: ${confidence}`,
    ]));
  }

  // 5. Subject + body + summary
  const subject = buildSubject(responseType, context.ticketKey, context.ticketTitle);
  const { body, summary } = composeBody(blocks);

  // 6. Extracciones
  const nextSteps = extractNextSteps(blocks);
  const missingDataRequests = extractMissingDataRequests(blocks);
  const etaStatement = extractEtaStatement(blocks);
  const riskWarnings = buildRiskWarnings(ctxForBlocks, responseType, confidence);

  const responseId = uid("resp");
  const createdAt = new Date().toISOString();
  const internalNotes = buildInternalNotes(ctxForBlocks, blocks, responseType);

  // 7. Quality Gate — siempre se evalúa, pero `enforceQualityGate=false` solo
  //    afecta la decisión final (canSendToClient se mantiene true aunque haya
  //    issues bloqueantes).
  const qualityGate = evaluateCustomerResponseQuality(
    { subject, body, blocks, nextSteps, missingDataRequests, etaStatement, riskWarnings, summary },
    {
      responseType,
      audience,
      tone,
      confidence,
      context: ctxForBlocks,
      humanReviewed: options.humanReviewed,
    },
  );

  const canSendToClient = enforceQualityGate ? qualityGate.canSend : true;
  const status: CustomerResponse["status"] = qualityGate.canSend
    ? (options.humanReviewed ? "REVIEWED" : "DRAFT")
    : "BLOCKED";

  return {
    responseId,
    ticketKey: context.ticketKey,
    createdAt,
    responseType,
    audience,
    tone,
    confidence,
    subject,
    body,
    summary,
    blocks,
    nextSteps,
    missingDataRequests,
    etaStatement,
    riskWarnings,
    internalNotes,
    qualityGate,
    canSendToClient,
    status,
    generatedBy,
    engineVersion: ENGINE_VERSION,
  };
}

// ============================================================
// Helper: derivar context desde el ticket + estimación + señales del TCC
// ============================================================

export interface TicketLikeForResponse {
  key: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  sapModule?: string | null;
  environment?: string | null;
  estimatedResolution?: import("@/types/estimation").TicketEstimatedResolution | null;
}

export interface IntelligenceSignals {
  hasKnowledgeMatch?: boolean;
  hasPlaybook?: boolean;
  playbookTitle?: string;
  hasScopeItem?: boolean;
  hasErrorEvidence?: boolean;
  hasReproduction?: boolean;
  hasVisualEvidence?: boolean;
  hasEscalationN2?: boolean;
  escalationKey?: string;
  missingData?: string[];
  confidence?: CustomerResponseConfidence;
  sapTransaction?: string;
  sapProcess?: string;
}

/**
 * Construye un CustomerResponseContext desde lo que el TCC ya tiene a mano.
 * Convierte señales del decision-engine, estimación y señales de inteligencia
 * en el shape canónico del engine.
 */
export function buildResponseContextFromTicket(
  ticket: TicketLikeForResponse,
  signals: IntelligenceSignals = {},
  extras: Partial<CustomerResponseContext> = {},
): CustomerResponseContext {
  return {
    ticketKey: ticket.key,
    ticketTitle: ticket.title,
    ticketDescription: ticket.description,
    ticketStatus: ticket.status,
    ticketPriority: ticket.priority,
    sapModule: ticket.sapModule,
    sapTransaction: signals.sapTransaction,
    sapProcess: signals.sapProcess,
    environment: ticket.environment,
    isProductive: (ticket.environment || "").toUpperCase() === "PRD",
    estimation: ticket.estimatedResolution ?? null,
    hasEta: !!ticket.estimatedResolution,
    confidence: signals.confidence ?? ticket.estimatedResolution?.confidence as CustomerResponseConfidence | undefined,
    hasKnowledgeMatch: signals.hasKnowledgeMatch,
    hasPlaybook: signals.hasPlaybook,
    playbookTitle: signals.playbookTitle,
    hasScopeItem: signals.hasScopeItem,
    hasErrorEvidence: signals.hasErrorEvidence,
    hasReproduction: signals.hasReproduction,
    hasVisualEvidence: signals.hasVisualEvidence,
    hasEscalationN2: signals.hasEscalationN2,
    escalationKey: signals.escalationKey,
    missingData: signals.missingData ?? ticket.estimatedResolution?.missingData,
    ...extras,
  };
}
