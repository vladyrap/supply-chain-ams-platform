// Fábrica de tickets/incidentes con autoestimación embebida.
// Punto único para que cualquier flujo (chat agente, manual, escalación,
// testing defect, jira/SN demo) cree el objeto con la estimación adentro.

import {
  autoEstimateTicketResolution,
  recalculateTicketResolution,
} from "@/lib/estimation/engine";
import type {
  TicketEstimateInput,
  TicketEstimatedResolution,
  TicketEstimateOrigin,
} from "@/types/estimation";

// Cualquier shape de ticket/incidente con un id y opcionalmente la estimación.
export interface HasEstimate {
  id: string;
  estimatedResolution?: TicketEstimatedResolution;
}

/**
 * Toma datos del ticket que se está por crear, genera la autoestimación y
 * devuelve el objeto enriquecido. No persiste — eso es responsabilidad del
 * caller (que ya tiene su servicio/hook propio).
 */
export function createTicketWithAutoEstimate<T extends HasEstimate>(
  ticket: T,
  input: Omit<TicketEstimateInput, "ticketId">,
  origin: TicketEstimateOrigin,
): T & { estimatedResolution: TicketEstimatedResolution } {
  const estimate = autoEstimateTicketResolution({
    ...input,
    ticketId: ticket.id,
    origin,
  });
  return { ...ticket, estimatedResolution: estimate };
}

/**
 * Si el ticket no tiene estimación todavía (caso de tickets antiguos
 * pre-autoestimación), la genera lazy. Idempotente — si ya tiene, devuelve igual.
 */
export function enrichTicketWithEstimate<T extends HasEstimate>(
  ticket: T,
  buildInput: (t: T) => Omit<TicketEstimateInput, "ticketId">,
  origin: TicketEstimateOrigin = "other",
): T & { estimatedResolution: TicketEstimatedResolution } {
  if (ticket.estimatedResolution) {
    return ticket as T & { estimatedResolution: TicketEstimatedResolution };
  }
  const input = buildInput(ticket);
  return createTicketWithAutoEstimate(ticket, input, origin);
}

/**
 * Recalcula la estimación preservando ajustes manuales salvo force=true.
 * El input debería reflejar el estado actualizado del ticket (severidad,
 * complejidad, etc. ya cambiados).
 */
export function recalculateTicketEstimate<T extends HasEstimate>(
  ticket: T & { estimatedResolution?: TicketEstimatedResolution },
  input: Omit<TicketEstimateInput, "ticketId">,
  options: { force?: boolean; actor?: string } = {},
): T & { estimatedResolution: TicketEstimatedResolution } {
  const full: TicketEstimateInput = { ...input, ticketId: ticket.id };
  if (!ticket.estimatedResolution) {
    return { ...ticket, estimatedResolution: autoEstimateTicketResolution(full) };
  }
  const next = recalculateTicketResolution(ticket.estimatedResolution, full, options);
  return { ...ticket, estimatedResolution: next };
}

/**
 * Aplica un ajuste manual (un humano corrige horas/confianza/complejidad/etc.).
 * Marca manuallyAdjusted=true + traza quién y por qué. Una vez ajustado manualmente,
 * recalculateTicketEstimate sin force no lo va a pisar.
 */
export function applyManualAdjustment(
  current: TicketEstimatedResolution,
  patch: Partial<Pick<TicketEstimatedResolution,
    | "totalMinHours" | "totalMaxHours"
    | "confidence" | "confidenceScore"
    | "complexity" | "phaseBreakdown"
    | "assumptions" | "risks" | "dependencies"
  >>,
  actor: string,
  reason: string,
): TicketEstimatedResolution {
  const next: TicketEstimatedResolution = { ...current, ...patch };
  // Recalcular días hábiles si tocaron horas
  if (patch.totalMinHours !== undefined) next.totalMinBusinessDays = +(next.totalMinHours / 8).toFixed(1);
  if (patch.totalMaxHours !== undefined) next.totalMaxBusinessDays = +(next.totalMaxHours / 8).toFixed(1);
  next.manuallyAdjusted = true;
  next.adjustedBy = actor;
  next.adjustmentReason = reason;
  next.lastRecalculatedAt = new Date().toISOString();
  return next;
}

/**
 * Helper para armar el TicketEstimateInput a partir de un Incident del agente
 * (forma `agent.api.IncidentSummary`). Útil para enriquecer al cargar history.
 */
export function buildEstimateInputFromIncident(inc: {
  message: string;
  sap_module?: string | null;
  environment?: string | null;
  confidence?: string | null;
  response?: string | null;
  attachments?: unknown;
}): Omit<TicketEstimateInput, "ticketId"> {
  const env = (inc.environment || "NO_INFORMADO").toUpperCase() as TicketEstimateInput["environment"];
  return {
    origin: "agent_chat",
    kind: "incident",
    title: inc.message.slice(0, 80),
    description: inc.message,
    sapModule: inc.sap_module || undefined,
    environment: env,
    agentConfidence: (inc.confidence ?? undefined) as TicketEstimateInput["agentConfidence"],
    hasErrorEvidence: Array.isArray(inc.attachments) && (inc.attachments as unknown[]).length > 0,
    isProductive: env === "PRD",
  };
}
