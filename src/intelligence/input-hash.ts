// =============================================================================
// input-hash.ts — Hash determinístico de campos críticos del ticket
// =============================================================================
// Usado por el Auto Intelligence Enrichment Pipeline para idempotencia:
// si el hash no cambió, no se re-ejecuta el pipeline.
//
// Implementación SHA-256 sobre JSON canónico (claves ordenadas) → primeros
// 16 caracteres (suficiente, riesgo de colisión despreciable para este uso).
// =============================================================================

import type { Ticket } from "@/services/tickets.api";

/**
 * Devuelve un hash de 16 chars hex de los campos críticos del ticket.
 * Si cualquiera de estos campos cambia → el hash cambia → se reanaliza.
 */
export async function computeAnalysisInputHash(ticket: Ticket): Promise<string> {
  // Construimos objeto canónico con claves ordenadas y valores normalizados
  const canonical: Record<string, unknown> = {
    title: (ticket.title || "").trim(),
    description: (ticket.description || "").trim(),
    module: ticket.sapModule || null,
    priority: ticket.priority || "Medium",
    environment: ticket.environment || null,
    evidenceCount: ticket.visualEvidenceNotes?.length ?? 0,
    estimateMin: ticket.estimatedResolution?.totalMinHours ?? null,
    estimateMax: ticket.estimatedResolution?.totalMaxHours ?? null,
    estimateConfidence: ticket.estimatedResolution?.confidence ?? null,
  };
  const json = JSON.stringify(canonical);

  // Web Crypto API (browser + Node 18+)
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }

  // Fallback simple — djb2 (no criptográfico pero suficiente para idempotencia)
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash) + json.charCodeAt(i);
    hash = hash | 0; // 32-bit
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
}

/**
 * Versión sincrónica fallback (sin crypto.subtle).
 * Para uso en código sync que no puede await.
 */
export function computeAnalysisInputHashSync(ticket: Ticket): string {
  const canonical: Record<string, unknown> = {
    title: (ticket.title || "").trim(),
    description: (ticket.description || "").trim(),
    module: ticket.sapModule || null,
    priority: ticket.priority || "Medium",
    environment: ticket.environment || null,
    evidenceCount: ticket.visualEvidenceNotes?.length ?? 0,
    estimateMin: ticket.estimatedResolution?.totalMinHours ?? null,
    estimateMax: ticket.estimatedResolution?.totalMaxHours ?? null,
    estimateConfidence: ticket.estimatedResolution?.confidence ?? null,
  };
  const json = JSON.stringify(canonical);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash) + json.charCodeAt(i);
    hash = hash | 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
}
