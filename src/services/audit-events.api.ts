// =============================================================================
// audit-events.api.ts — Client del nuevo Audit Trail backend (DH v0.9)
// =============================================================================
// Convención: cada función intenta el backend. Si falla, throw para que el
// caller pueda decidir el fallback (típicamente localStorage). El propósito
// es NO mostrar la falla al user — el caller mete el evento en local store
// y muestra un indicador "offline".
// =============================================================================

const BASE = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

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

/** Timeout helper para no colgar la UI si el backend está caído. */
async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = 3000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** POST evento. Throws si falla — el caller debe hacer fallback local. */
export async function recordEventRemote(event: AuditEventRemoteInput): Promise<AuditEventRemoteRecord> {
  const r = await fetchWithTimeout(`${BASE}/api/audit/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(event),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { success: boolean; event?: AuditEventRemoteRecord; error?: string };
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
  const r = await fetchWithTimeout(`${BASE}/api/audit/events?${qs.toString()}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { success: boolean; events?: AuditEventRemoteRecord[] };
  return data.events ?? [];
}

/** GET timeline de un ticket. */
export async function getByTicketRemote(ticketKey: string): Promise<AuditEventRemoteRecord[]> {
  const r = await fetchWithTimeout(
    `${BASE}/api/audit/events/by-ticket/${encodeURIComponent(ticketKey)}`,
    { credentials: "include" }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { success: boolean; events?: AuditEventRemoteRecord[] };
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
  const r = await fetchWithTimeout(`${BASE}/api/audit/summary`, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { success: boolean; summary?: never };
  return data.summary as never;
}

/** Healthcheck rápido sin throw — devuelve true si backend disponible. */
export async function isAuditBackendAvailable(): Promise<boolean> {
  try {
    const r = await fetchWithTimeout(`${BASE}/api/audit/summary`, { credentials: "include" }, 1500);
    return r.ok || r.status === 401 || r.status === 403; // si responde 401/403 igual está vivo
  } catch {
    return false;
  }
}
