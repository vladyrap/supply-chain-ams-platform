// =============================================================================
// audit-events.api.ts — Client del nuevo Audit Trail backend (DH v0.9)
// =============================================================================
// Convención: cada función intenta el backend. Si falla, throw para que el
// caller pueda decidir el fallback (típicamente localStorage). El propósito
// es NO mostrar la falla al user — el caller mete el evento en local store
// y muestra un indicador "offline".
// =============================================================================

import { apiFetch, ApiError } from "./_http";

export interface AuditEventRemoteInput {
  eventType: string;
  category?: string;
  severity?: "info" | "warning" | "error" | "critical";
  source?: "ui" | "agent" | "system" | "integration" | "api";
  ticketId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  payload?: Record<string, unknown> | null;
  correlationId?: string | null;
  tenantId?: string | null;
}

export interface AuditEventRemoteRecord {
  id: string;
  tenantId: string | null;
  ticketId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  eventType: string;
  category: string;
  severity: string;
  payload: unknown;
  source: string;
  correlationId: string | null;
  createdAt: string;
}

/** POST evento. Throws si falla — el caller debe hacer fallback local. */
export async function recordEventRemote(event: AuditEventRemoteInput): Promise<AuditEventRemoteRecord> {
  const data = await apiFetch<{ success: boolean; event?: AuditEventRemoteRecord; error?: string }>(
    "/api/audit/events",
    { method: "POST", body: event, timeoutMs: 3000 },
  );
  if (!data.success || !data.event) throw new Error(data.error || "Backend returned no event");
  return data.event;
}

/** GET listado con filtros. */
export async function listEventsRemote(filters: {
  limit?: number; offset?: number;
  ticketId?: string; eventType?: string; category?: string;
  severity?: string; actorUserId?: string;
  fromDate?: string; toDate?: string;
} = {}): Promise<AuditEventRemoteRecord[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const data = await apiFetch<{ success: boolean; events?: AuditEventRemoteRecord[] }>(
    `/api/audit/events?${qs.toString()}`,
    { timeoutMs: 3000 },
  );
  return data.events ?? [];
}

/** GET timeline de un ticket. */
export async function getByTicketRemote(ticketKey: string): Promise<AuditEventRemoteRecord[]> {
  const data = await apiFetch<{ success: boolean; events?: AuditEventRemoteRecord[] }>(
    `/api/audit/events/by-ticket/${encodeURIComponent(ticketKey)}`,
    { timeoutMs: 3000 },
  );
  return data.events ?? [];
}

/** GET summary agregado. */
export async function getSummaryRemote(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byEventType: Array<{ eventType: string; count: number }>;
  last7Days: number;
  last24h: number;
}> {
  const data = await apiFetch<{ success: boolean; summary?: never }>("/api/audit/summary", { timeoutMs: 3000 });
  return data.summary as never;
}

/** Healthcheck rápido sin throw — devuelve true si backend disponible. */
export async function isAuditBackendAvailable(): Promise<boolean> {
  try {
    await apiFetch("/api/audit/summary", { timeoutMs: 1500 });
    return true;
  } catch (err) {
    // 401/403 igual significa que el backend está vivo
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return true;
    return false;
  }
}
