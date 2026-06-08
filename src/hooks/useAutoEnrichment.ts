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
  // v0.14.3 — si el env fuerza mock, desactivamos Gemini real en el pipeline.
  // Útil cuando la quota free tier está agotada (20/día) o en demos sin credenciales.
  const forceMock = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_FORCE_MOCK_LLM === "1";
  const { actor = "system", autoTrigger = true, callGeminiAgent = !forceMock } = opts;
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

        // SA v0.11 — emitir audit trail del orchestrator si corrió
        const sa = result.intelligence.specialistAnalysis;
        if (sa) {
          if (source === "reanalysis") {
            audit.record({
              ticketId: key,
              eventType: "AMS_SPECIALIST_REANALYSIS_REQUESTED",
              title: "Reanálisis de especialistas solicitado",
              actor, actorRole: "system", source: "ui",
            });
          }
          audit.record({
            ticketId: key,
            eventType: "AMS_ORCHESTRATOR_ANALYSIS_COMPLETED",
            title: `Orquestador AMS · ${sa.primaryAnalysis.specialist} (${sa.confidenceScore}%)`,
            description:
              `${sa.routing.primarySpecialist} primary, ${sa.secondaryAnalyses.length} secondaries. ` +
              `${sa.nextBestAction}`,
            actor, actorRole: "system", source: "system",
            metadata: {
              primarySpecialist: sa.primaryAnalysis.specialist,
              secondarySpecialists: sa.secondaryAnalyses.map((s) => s.specialist),
              routingConfidence: sa.routing.confidenceScore,
              globalConfidence: sa.confidenceScore,
              confidenceLevel: sa.confidenceLevel,
              requiresHumanReview: sa.requiresHumanReview,
              analysisId: sa.analysisId,
            },
          });
          if (source === "reanalysis") {
            audit.record({
              ticketId: key,
              eventType: "AMS_SPECIALIST_REANALYSIS_COMPLETED",
              title: "Reanálisis de especialistas completado",
              actor, actorRole: "system", source: "system",
            });
          }
        }

        // Si jira → solo memoria local
        if (t.source === "jira") {
          jiraInMemoryCache.set(key, result.intelligence);
          setIntelligence(result.intelligence);
          audit.record({
            ticketId: key,
            eventType: source === "reanalysis" ? "TICKET_REANALYSIS_COMPLETED" : "TICKET_AUTO_ENRICHMENT_COMPLETED",
            title: `Enriquecimiento ${source === "reanalysis" ? "reejecutado" : "completado"} (jira - local memory)`,
            description: `readiness ${result.intelligence.analysis?.readinessScore ?? "?"} · gemini=${result.geminiCalled} · specialists=${result.specialistsCalled}`,
            actor, actorRole: "system", source: "system",
            metadata: {
              readinessScore: result.intelligence.analysis?.readinessScore,
              durationMs: result.durationMs,
              geminiCalled: result.geminiCalled,
              specialistsCalled: result.specialistsCalled,
              primarySpecialist: sa?.primaryAnalysis.specialist,
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
              specialistsCalled: result.specialistsCalled,
              primarySpecialist: finalIntel.specialistAnalysis?.primaryAnalysis.specialist,
              specialistConfidence: finalIntel.specialistAnalysis?.confidenceScore,
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
        // FIX v0.14.11 — persistir el failed state al backend.
        // Sin esto, el backend queda en pending_enrichment forever y la próxima carga
        // del ticket re-dispara el pipeline (que vuelve a fallar) → loop infinito.
        // Causa real del bug observado el 2026-06-08: tickets "pegados en enriching"
        // tras quota agotada de Gemini, +16k audit_events duplicados generados.
        if (t.source !== "jira") {
          try {
            await updateTicketIntelligence(key, failedIntel);
          } catch (persistErr) {
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.warn(`[AIE] ${key} no se pudo persistir failed state al backend:`, persistErr);
            }
            // best-effort, no rethrow — ya estamos en error path
          }
        }
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
  // TCC v0.12 — anti-loop reforzado:
  //   1. Si hay lock en vuelo para este ticketKey → skip
  //   2. Si status=enriching → skip (alguien más lo está corriendo)
  //   3. Si status=enriched + hash igual + analysis presente → skip
  //   4. FIX v0.12.1: enriched pero analysis vacío → tratar como pending
  //   5. Si status=enrichment_failed → NO auto-disparar (loop risk); requiere reanalyze manual
  //   6. Si pending o sin status → disparar
  useEffect(() => {
    if (!autoTrigger || !ticket) return;
    let cancelled = false;
    (async () => {
      // Guard 1: lock en vuelo
      if (inFlightLocks.has(ticket.key)) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[AIE] ${ticket.key} skip: lock en vuelo`);
        }
        return;
      }

      const newHash = await computeAnalysisInputHash(ticket);
      const cachedHash = ticket.intelligence?.inputHash;
      const status = ticket.intelligence?.status;
      const hasAnalysis = !!ticket.intelligence?.analysis;

      // Guard 2: ya está enriching
      if (status === "enriching") return;

      // Guard 5: enrichment_failed — no auto-disparar (requiere acción manual)
      if (status === "enrichment_failed") {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[AIE] ${ticket.key} skip: enrichment_failed — usá Reanalizar manualmente`);
        }
        return;
      }

      // Detectar "datos nuevos" para mostrar badge en UI
      if (status === "enriched" && cachedHash && cachedHash !== newHash) {
        if (!cancelled) setHasNewData(true);
        return;
      }

      // Guard 3: enriched + hash igual + tiene analysis real → skip
      if (status === "enriched" && cachedHash === newHash && hasAnalysis) return;

      // Guard 4: enriched pero analysis vacío/missing (seed antiguo, DB drift) → disparar
      if (status === "enriched" && !hasAnalysis) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[AIE] ${ticket.key} status=enriched pero analysis vacío — re-disparando`);
        }
        if (cancelled) return;
        await runPipeline(true, "auto"); // force=true para sobrescribir el enriched vacío
        if (!cancelled) setHasNewData(false);
        return;
      }

      // Caso normal: pending o sin status
      if (status === "pending_enrichment" || !status) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[AIE] ${ticket.key} disparando (status=${status ?? "none"})`);
        }
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
