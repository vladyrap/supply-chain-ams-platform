"use client";

// =============================================================================
// useAutoEnrichment — Hook que dispara el Auto Intelligence Enrichment
// =============================================================================
// Cuando el TCC monta un ticket:
//   - Si `ticket.intelligence?.status === "enriched"` con hash actual → no hace nada
//   - Si pendiente o hash cambió → ejecuta pipeline + PUT al backend
//   - Lock por ticketKey en memoria para evitar runs paralelos
//   - Para tickets `source === "jira"` → NO persiste al backend (solo memoria local)
//
// Audit events emitidos: TICKET_AUTO_ENRICHMENT_QUEUED / STARTED / COMPLETED / FAILED
// Reanálisis manual: TICKET_REANALYSIS_REQUESTED / COMPLETED / FAILED
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ticket } from "@/services/tickets.api";
import { updateTicketIntelligence } from "@/services/tickets.api";
import type { TicketIntelligence } from "@/types/ticket-intelligence";
import { runAutoEnrichmentPipeline } from "@/intelligence/auto-enrichment-pipeline";
import { computeAnalysisInputHash } from "@/intelligence/input-hash";
import { useTicketAudit } from "./useTicketAudit";

/** Lock global por ticketKey para evitar pipelines paralelos. */
const inFlightLocks = new Map<string, Promise<TicketIntelligence | null>>();

/** Cache en memoria para tickets jira (no se persiste al backend). */
const jiraInMemoryCache = new Map<string, TicketIntelligence>();

export interface UseAutoEnrichmentResult {
  status: TicketIntelligence["status"] | "idle";
  intelligence: TicketIntelligence | null;
  error: string | null;
  /** Reejecuta el pipeline forzando re-cálculo. */
  reanalyze: () => Promise<void>;
  /** True si el hash actual difiere del cacheado (datos cambiaron). */
  hasNewData: boolean;
}

export function useAutoEnrichment(
  ticket: Ticket | null,
  opts: { actor?: string; autoTrigger?: boolean; callGeminiAgent?: boolean } = {},
): UseAutoEnrichmentResult {
  const { actor = "system", autoTrigger = true, callGeminiAgent = true } = opts;
  const audit = useTicketAudit();
  const [intelligence, setIntelligence] = useState<TicketIntelligence | null>(
    ticket?.intelligence ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [hasNewData, setHasNewData] = useState(false);

  // Refs para evitar dependencias inestables en useEffect
  const ticketRef = useRef(ticket);
  ticketRef.current = ticket;

  /** Ejecuta el pipeline (con lock + audit + persistencia). */
  const runPipeline = useCallback(async (force: boolean, source: "auto" | "manual" | "reanalysis"): Promise<TicketIntelligence | null> => {
    const t = ticketRef.current;
    if (!t) return null;
    const key = t.key;

    // Si ya hay run en vuelo, esperar al resultado existente
    const existing = inFlightLocks.get(key);
    if (existing) return existing;

    // Hidratación inicial desde memoria local si es jira
    if (t.source === "jira" && !force) {
      const cached = jiraInMemoryCache.get(key);
      if (cached && cached.status === "enriched") {
        setIntelligence(cached);
        return cached;
      }
    }

    // Audit: QUEUED
    audit.record({
      ticketId: key,
      eventType: source === "reanalysis" ? "TICKET_REANALYSIS_REQUESTED" : "TICKET_AUTO_ENRICHMENT_QUEUED",
      title: source === "reanalysis" ? "Reanálisis solicitado manualmente" : "Enriquecimiento encolado",
      actor, actorRole: "system", source: source === "reanalysis" ? "ui" : "system",
    });

    // Lanzar pipeline con lock
    const promise = (async (): Promise<TicketIntelligence | null> => {
      // Status enriching primero (para UI)
      const enrichingState: TicketIntelligence = { status: "enriching" };
      setIntelligence(enrichingState);
      setError(null);

      audit.record({
        ticketId: key,
        eventType: "TICKET_AUTO_ENRICHMENT_STARTED",
        title: "Pipeline iniciado",
        actor, actorRole: "system", source: "system",
      });

      try {
        const result = await runAutoEnrichmentPipeline(t, {
          force,
          actor,
          source: source === "reanalysis" ? "manual" : "auto",
          callGeminiAgent,
        });

        // Si jira → solo memoria local
        if (t.source === "jira") {
          jiraInMemoryCache.set(key, result.intelligence);
          setIntelligence(result.intelligence);
          audit.record({
            ticketId: key,
            eventType: source === "reanalysis" ? "TICKET_REANALYSIS_COMPLETED" : "TICKET_AUTO_ENRICHMENT_COMPLETED",
            title: `Enriquecimiento ${source === "reanalysis" ? "reejecutado" : "completado"} (jira - local memory)`,
            description: `readiness ${result.intelligence.analysis?.readinessScore ?? "?"} · gemini=${result.geminiCalled}`,
            actor, actorRole: "system", source: "system",
            metadata: {
              readinessScore: result.intelligence.analysis?.readinessScore,
              durationMs: result.durationMs,
              geminiCalled: result.geminiCalled,
            },
          });
          return result.intelligence;
        }

        // Persistir al backend
        const persisted = await updateTicketIntelligence(key, result.intelligence);
        if ("success" in persisted && persisted.success) {
          const finalIntel = persisted.ticket.intelligence ?? result.intelligence;
          setIntelligence(finalIntel);
          audit.record({
            ticketId: key,
            eventType: source === "reanalysis" ? "TICKET_REANALYSIS_COMPLETED" : "TICKET_AUTO_ENRICHMENT_COMPLETED",
            title: `Enriquecimiento ${source === "reanalysis" ? "reejecutado" : "completado"}`,
            description: `readiness ${finalIntel.analysis?.readinessScore ?? "?"} · ETA ${finalIntel.analysis?.estimatedResolution?.minHours ?? "?"}-${finalIntel.analysis?.estimatedResolution?.maxHours ?? "?"}h`,
            actor, actorRole: "system", source: "system",
            metadata: {
              readinessScore: finalIntel.analysis?.readinessScore,
              eta: finalIntel.analysis?.estimatedResolution,
              nextBestAction: finalIntel.analysis?.nextBestAction?.action,
              confidence: finalIntel.analysis?.confidenceGlobal,
              durationMs: result.durationMs,
              geminiCalled: result.geminiCalled,
              skipped: result.skipped,
            },
          });
          return finalIntel;
        } else {
          throw new Error("error" in persisted ? persisted.error : "Backend rechazó PUT");
        }
      } catch (err) {
        const errMsg = (err as Error).message;
        const failedIntel: TicketIntelligence = {
          status: "enrichment_failed",
          inputHash: await computeAnalysisInputHash(t).catch(() => ""),
          enrichedAt: new Date().toISOString(),
          enrichedBy: actor,
          error: errMsg,
        };
        setIntelligence(failedIntel);
        setError(errMsg);
        audit.record({
          ticketId: key,
          eventType: source === "reanalysis" ? "TICKET_REANALYSIS_FAILED" : "TICKET_AUTO_ENRICHMENT_FAILED",
          title: `Enriquecimiento falló: ${errMsg.slice(0, 80)}`,
          actor, actorRole: "system", source: "system",
          metadata: { error: errMsg },
        });
        return failedIntel;
      }
    })();

    inFlightLocks.set(key, promise);
    try {
      return await promise;
    } finally {
      inFlightLocks.delete(key);
    }
  }, [actor, audit, callGeminiAgent]);

  // Sincronizar con cambios del ticket prop
  useEffect(() => {
    setIntelligence(ticket?.intelligence ?? null);
  }, [ticket?.key, ticket?.intelligence]);

  // Auto-trigger: ejecutar pipeline si pending O hash cambió
  useEffect(() => {
    if (!autoTrigger || !ticket) return;
    let cancelled = false;
    (async () => {
      const newHash = await computeAnalysisInputHash(ticket);
      const cachedHash = ticket.intelligence?.inputHash;
      const status = ticket.intelligence?.status;

      // Detectar "datos nuevos" para mostrar badge en UI
      if (status === "enriched" && cachedHash && cachedHash !== newHash) {
        if (!cancelled) setHasNewData(true);
        return;  // No re-disparar automáticamente, solo avisar
      }

      // Disparar si pending o nunca enriquecido
      if (status === "pending_enrichment" || !status || status === undefined) {
        if (cancelled) return;
        await runPipeline(false, "auto");
        if (!cancelled) setHasNewData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticket, autoTrigger, runPipeline]);

  // Reanálisis manual
  const reanalyze = useCallback(async (): Promise<void> => {
    await runPipeline(true, "reanalysis");
    setHasNewData(false);
  }, [runPipeline]);

  return {
    status: intelligence?.status ?? "idle",
    intelligence,
    error,
    reanalyze,
    hasNewData,
  };
}
