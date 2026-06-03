// =============================================================================
// auto-enrichment-pipeline.ts — Auto Intelligence Enrichment Pipeline (AIE v0.10)
// =============================================================================
// Orquesta el enriquecimiento automático de un ticket:
//   1. Compute inputHash
//   2. Ejecuta analyzeTicket() (Intelligence Core determinístico)
//   3. Ejecuta buildN1Package() (paquete N1 resoluble)
//   4. (opcional) Llama classifyTicket() para Gemini real con timeout 30s
//   5. Devuelve TicketIntelligence completo
//
// El pipeline NO persiste — el caller debe hacer PUT a tickets.api.
// Es determinístico y reusable; el hook `useAutoEnrichment` lo orquesta + lock.
// =============================================================================

import type { Ticket } from "@/services/tickets.api";
import { classifyTicket } from "@/services/tickets.api";
import type { TicketIntelligence, AgentClassificationResult } from "@/types/ticket-intelligence";
import { analyzeTicket, invalidateIntelligenceCache } from "./core";
import { buildN1Package } from "./n1-package-builder";
import { computeAnalysisInputHash } from "./input-hash";
import type { GuidedTicketDraft } from "@/types/guided-ticket-intake";
import { orchestrateAMSAnalysis } from "./ams-orchestrator";
import type { OrchestratedAMSAnalysis, SpecialistAnalysisInput } from "./specialists/types";

/** Opciones del pipeline. */
export interface PipelineOptions {
  /** Si true, llama Gemini real con timeout. Default true. */
  callGeminiAgent?: boolean;
  /** Timeout para llamada Gemini (ms). Default 30000. */
  geminiTimeoutMs?: number;
  /** Force re-ejecutar aunque hash no cambie. Default false. */
  force?: boolean;
  /** Quién ejecutó el pipeline (para enrichedBy). */
  actor?: string;
  /** Source del trigger: "auto" | "manual" | "guided_intake" | "demo". */
  source?: "auto" | "manual" | "guided_intake" | "demo";
  /** Si true, ejecuta AMS Specialists Orchestrator (v0.11). Default true. */
  callSpecialists?: boolean;
}

/** Resultado del pipeline. */
export interface PipelineResult {
  intelligence: TicketIntelligence;
  /** Si el pipeline detectó hash igual y status=enriched, devuelve skipped. */
  skipped: boolean;
  /** Si llamó Gemini, el resultado o null si falló/timeout. */
  geminiCalled: boolean;
  /** Si ejecutó AMS Specialists Orchestrator. */
  specialistsCalled: boolean;
  /** Duración total en ms. */
  durationMs: number;
}

/**
 * Convierte un Ticket en un GuidedTicketDraft mínimo para que buildN1Package
 * pueda trabajar (espera el shape del wizard guided intake).
 */
function ticketToDraft(ticket: Ticket): GuidedTicketDraft {
  return {
    title: ticket.title,
    context: {
      environment: ticket.environment || "",
      sapModule: ticket.sapModule || "",
      priority: ticket.priority || "Medium",
    },
    problem: {
      whatIntended: (ticket.description || "").slice(0, 500),
    },
    sapData: {},
    evidence: {
      items: [],
      textualLog: "",
    },
    reporter: ticket.reporter,
  };
}

/**
 * Wrapper de fetch con timeout. Si la promesa no resuelve antes del límite,
 * rechaza con `Timeout`.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label = "operation"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); })
           .catch((err) => { clearTimeout(t); reject(err); });
  });
}

/**
 * Ejecuta el pipeline completo. NO persiste. NO bloquea si algún engine falla.
 *
 * Reglas:
 *  - Si `force=false` Y `ticket.intelligence?.inputHash === computedHash` Y
 *    `status=enriched` → skipped:true sin re-ejecutar.
 *  - Si analyzeTicket falla → status=enrichment_failed, error en el mensaje.
 *  - Si buildN1Package falla → conserva analysis, n1Package=undefined.
 *  - Si Gemini falla/timeout → conserva todo, agentClassification=undefined.
 */
export async function runAutoEnrichmentPipeline(
  ticket: Ticket,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const t0 = Date.now();
  const {
    callGeminiAgent = true,
    geminiTimeoutMs = 30_000,
    force = false,
    actor = "system",
    source = "auto",
    callSpecialists = true,
  } = opts;

  // 1. Hash + idempotencia
  const inputHash = await computeAnalysisInputHash(ticket);
  const cachedHash = ticket.intelligence?.inputHash;
  const cachedStatus = ticket.intelligence?.status;

  if (!force && cachedHash === inputHash && cachedStatus === "enriched") {
    return {
      intelligence: ticket.intelligence as TicketIntelligence,
      skipped: true,
      geminiCalled: false,
      specialistsCalled: false,
      durationMs: Date.now() - t0,
    };
  }

  // 2. Intelligence Core local — siempre se ejecuta (es determinístico, rápido)
  let analysis;
  let analysisError: string | null = null;
  try {
    // Invalidar cache del core para asegurar análisis fresco
    invalidateIntelligenceCache(ticket.key);
    analysis = analyzeTicket(ticket, {
      isProductive: (ticket.environment || "").toUpperCase() === "PRD",
      hasErrorEvidence: (ticket.description || "").length > 80,
      hasVisualEvidence: !!(ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0),
      actor,
    });
  } catch (err) {
    analysisError = (err as Error).message;
  }

  if (!analysis) {
    return {
      intelligence: {
        status: "enrichment_failed",
        inputHash,
        enrichedAt: new Date().toISOString(),
        enrichedBy: actor,
        error: analysisError ?? "analyzeTicket falló sin error específico",
      },
      skipped: false,
      geminiCalled: false,
      specialistsCalled: false,
      durationMs: Date.now() - t0,
    };
  }

  // 3. N1 Package — best-effort
  let n1Package;
  try {
    const draft = ticketToDraft(ticket);
    n1Package = buildN1Package(draft);
  } catch (err) {
    // No fatal — conservamos analysis y seguimos sin n1Package
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auto-enrichment] buildN1Package failed:`, (err as Error).message);
    }
  }

  // 4. Gemini opcional con timeout (no bloqueante en caso de error)
  let agentClassification: AgentClassificationResult | undefined;
  let geminiCalled = false;
  if (callGeminiAgent) {
    geminiCalled = true;
    try {
      const result = await withTimeout(
        classifyTicket(ticket.key),
        geminiTimeoutMs,
        "Gemini classify",
      );
      if ("success" in result && result.success) {
        agentClassification = {
          response: result.classification.response,
          model: result.classification.model,
          confidence: String(result.classification.confidence),
        };
      }
    } catch (err) {
      // Timeout o error — no fatal, seguimos con lo que tenemos
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[auto-enrichment] Gemini call skipped:`, (err as Error).message);
      }
    }
  }

  // 4.5. AMS Specialists Orchestrator (v0.11) — best-effort, sin IA externa
  let specialistAnalysis: OrchestratedAMSAnalysis | undefined;
  let specialistsCalled = false;
  if (callSpecialists) {
    specialistsCalled = true;
    try {
      const specInput: SpecialistAnalysisInput = {
        ticketKey: ticket.key,
        title: ticket.title,
        description: ticket.description,
        module: ticket.sapModule ?? undefined,
        environment: ticket.environment ?? undefined,
        priority: ticket.priority ?? undefined,
        errorMessage: undefined,
        evidenceNotes: (ticket.visualEvidenceNotes ?? []).map((v) => v.analysisSummary).filter(Boolean),
        source: ticket.source === "jira" ? "jira" : ticket.source === "user" ? "ticket" : "demo",
      };
      specialistAnalysis = orchestrateAMSAnalysis(specInput);
    } catch (err) {
      // Best-effort — si falla, conservamos todo el resto
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[auto-enrichment] specialists orchestrator failed:`, (err as Error).message);
      }
    }
  }

  // 5. Construir resultado
  // TCC v0.12 — incrementar analysisVersion respecto al previo (si existía)
  const prevVersion = ticket.intelligence?.analysisVersion ?? 0;
  const intelligence: TicketIntelligence = {
    status: "enriched",
    enrichedAt: new Date().toISOString(),
    enrichedBy: actor,
    inputHash,
    analysis,
    n1Package,
    agentClassification,
    specialistAnalysis,
    analysisVersion: prevVersion + 1,
  };

  return {
    intelligence,
    skipped: false,
    geminiCalled,
    specialistsCalled,
    durationMs: Date.now() - t0,
  };
}

/**
 * Re-export del invalidate para que el hook pueda forzar refresh.
 */
export { invalidateIntelligenceCache };
