// =============================================================================
// enrichment-kickoff.ts — Disparar el AIE inmediatamente al crear un ticket
// =============================================================================
// El hook `useAutoEnrichment` se monta sólo cuando se abre el TCC. Para que un
// ticket recién creado quede ya enriquecido **antes** de que el modal cierre,
// los Create modals (rápido y guiado) invocan este helper.
//
// Reusa el mismo lock global del hook (vía la promesa que retorna el pipeline)
// para que el auto-trigger del TCC vea el run en curso y no dispare otro.
// =============================================================================

import type { Ticket } from "@/services/tickets.api";
import { updateTicketIntelligence } from "@/services/tickets.api";
import type { TicketIntelligence } from "@/types/ticket-intelligence";
import type { N1Package } from "@/types/guided-ticket-intake";
import {
  runAutoEnrichmentPipeline,
  type PipelineResult,
} from "./auto-enrichment-pipeline";

/** Lock compartido — mismo Map que `useAutoEnrichment` para evitar dobles runs. */
const kickoffLocks = new Map<string, Promise<PipelineResult>>();

/** Cache jira local — espejo del que tiene el hook. */
const jiraCache = new Map<string, TicketIntelligence>();

export interface KickoffOptions {
  /** Quién creó el ticket (para enrichedBy). */
  actor?: string;
  /** N1 Package ya construido por el Guided Intake — evita recompilar. */
  preloadedN1Package?: N1Package;
  /** Timeout total del kickoff (ms). Default 30000. */
  timeoutMs?: number;
  /** Si el caller quiere saltearse Gemini (modo offline). */
  skipGemini?: boolean;
}

/**
 * Dispara el pipeline AIE para un ticket recién creado y persiste el resultado
 * al backend (excepto jira → memoria). Devuelve la intelligence final.
 *
 * Nunca throwea — los errores se materializan como `enrichment_failed`.
 */
export async function kickoffEnrichmentForNewTicket(
  ticket: Ticket,
  opts: KickoffOptions = {},
): Promise<TicketIntelligence> {
  const { actor = "system", preloadedN1Package, skipGemini = false } = opts;

  // Lock: si ya hay run en vuelo para este ticket, esperarlo
  const existing = kickoffLocks.get(ticket.key);
  if (existing) {
    const r = await existing;
    return r.intelligence;
  }

  const promise = runAutoEnrichmentPipeline(ticket, {
    actor,
    source: "auto",
    callGeminiAgent: !skipGemini,
    callSpecialists: true,
    force: false,
  });

  kickoffLocks.set(ticket.key, promise);

  try {
    const result = await promise;

    // Si el wizard guiado pasó un N1Package precomputado, lo embebemos por
    // encima (el pipeline también lo genera, pero el del wizard tiene más
    // contexto del usuario — readiness real, evidencia, etc.)
    const finalIntel: TicketIntelligence = preloadedN1Package
      ? { ...result.intelligence, n1Package: preloadedN1Package }
      : result.intelligence;

    // Tickets jira → memoria local (mismo contrato que el hook)
    if (ticket.source === "jira") {
      jiraCache.set(ticket.key, finalIntel);
      return finalIntel;
    }

    // Resto → PUT al backend
    const persisted = await updateTicketIntelligence(ticket.key, finalIntel);
    if ("success" in persisted && persisted.success) {
      return persisted.ticket.intelligence ?? finalIntel;
    }
    // PUT falló pero el análisis local existe — devolver lo que tenemos
    return finalIntel;
  } catch (err) {
    // Materializa el error como TicketIntelligence con status failed
    return {
      status: "enrichment_failed",
      enrichedAt: new Date().toISOString(),
      enrichedBy: actor,
      error: (err as Error).message,
    };
  } finally {
    kickoffLocks.delete(ticket.key);
  }
}

/** Helper que un caller puede consultar para saber si hay run en vuelo. */
export function isEnrichmentInFlight(ticketKey: string): boolean {
  return kickoffLocks.has(ticketKey);
}

/** Lookup del cache jira — usado por el TCC al montar para hidratar. */
export function getJiraCachedIntelligence(ticketKey: string): TicketIntelligence | null {
  return jiraCache.get(ticketKey) ?? null;
}
