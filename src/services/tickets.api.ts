import type { TicketEstimatedResolution } from "@/types/estimation";
import type { VisualEvidenceNote } from "@/types/visual-evidence";
import type { TicketIntelligence, IntelligenceHistoryEntry } from "@/types/ticket-intelligence";
import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

export interface Ticket {
  source: "jira" | "mock" | "user";
  key: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  reporter: string | null;
  assignee: string | null;
  sapModule?: string | null;
  environment?: string | null;
  created: string;
  updated: string;
  url?: string;
  estimatedResolution?: TicketEstimatedResolution | null;
  /** Resúmenes textuales del análisis visual de imágenes adjuntas (sin archivos). */
  visualEvidenceNotes?: VisualEvidenceNote[] | null;
  /** Auto Intelligence Enrichment (AIE v0.10). Null si ticket viejo sin enriquecer. */
  intelligence?: TicketIntelligence | null;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority?: string;
  reporter?: string | null;
  assignee?: string | null;
  sapModule?: string | null;
  environment?: string | null;
  complexity?: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "UNKNOWN";
  requiresDevelopment?: boolean;
  requiresIntegration?: boolean;
  requiresUAT?: boolean;
  requiresTransport?: boolean;
  /** Análisis visual ya hecho client-side. El backend lo persiste y usa los hints
   *  para mejorar la autoestimación. No incluye archivos ni base64. */
  visualEvidenceNotes?: VisualEvidenceNote[];
}

export interface Classification {
  response: string;
  model: string;
  confidence: "baja" | "media" | "alta" | "no_detectada";
}

async function call<T>(path: string, opts: ApiFetchOptions = {}): Promise<T | { success: false; error: string }> {
  try {
    const data = await apiFetch<T>(path, opts);
    if (data === null || data === undefined) return { success: false, error: "no data" } as { success: false; error: string };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function listTickets() {
  return call<{ success: true; source: "jira" | "mock"; count: number; tickets: Ticket[] } | { success: false; error: string }>(
    "/api/tickets"
  );
}

export async function createTicket(input: CreateTicketInput) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    "/api/tickets",
    { method: "POST", body: input }
  );
}

export async function recalculateTicket(key: string, opts: { force?: boolean; actor?: string } = {}) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/recalculate`,
    { method: "POST", body: opts }
  );
}

export interface ManualTicketEstimatePatch {
  totalMinHours?: number;
  totalMaxHours?: number;
  confidence?: "LOW" | "MEDIUM" | "HIGH";
  complexity?: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "UNKNOWN";
  actor: string;
  reason: string;
}

export async function adjustTicketEstimate(key: string, patch: ManualTicketEstimatePatch) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/estimate`,
    { method: "PATCH", body: patch }
  );
}

export async function getProviderStatus() {
  return call<{
    success: true;
    jiraConfigured: boolean;
    jiraReachable: boolean;
    source: "jira" | "mock";
    totalLastFetch: number;
  } | { success: false; error: string }>("/api/tickets/provider");
}

export async function classifyTicket(key: string) {
  return call<{ success: true; ticket: Ticket; classification: Classification } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/classify`,
    { method: "POST" }
  );
}

export interface CloseTicketInput {
  /** Horas reales que tomó resolver. Input humano al cerrar. */
  actualHours: number;
  /** Usuario que cierra y captura las horas. */
  closedBy: string;
  /** Nota opcional explicando desviación grande (>50%). */
  closeNote?: string;
}

/**
 * Cierra un ticket capturando las horas reales. Backend computa variance contra
 * la estimación generada al crear y persiste todo en el jsonb del ticket.
 * Esta data alimenta el tile "Estimación · Desviación" del dashboard y la
 * recalibración del motor.
 */
export async function closeTicket(key: string, input: CloseTicketInput) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/close`,
    { method: "POST", body: input }
  );
}

/**
 * Sobrescribe la estimación completa del ticket — usado por el motor contextual
 * cuando el consultor decide "aplicar al ticket". El backend valida el shape
 * y reemplaza el jsonb entero.
 */
export async function replaceTicketEstimateFull(
  key: string,
  input: { estimate: TicketEstimatedResolution; actor: string; reason?: string },
) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/estimate/full`,
    { method: "POST", body: input }
  );
}

// =============================================================================
// AIE v0.10 — Auto Intelligence Enrichment endpoints
// =============================================================================

/** PUT /api/tickets/:key/intelligence — persiste resultado del pipeline. */
export async function updateTicketIntelligence(
  key: string,
  intelligence: TicketIntelligence,
) {
  return call<{ success: true; ticket: Ticket; conflict: { reason: string; serverHash: string } | null } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/intelligence`,
    { method: "PUT", body: { intelligence } }
  );
}

/** GET /api/tickets/:key/intelligence — lee solo el intelligence (lighter). */
export async function getTicketIntelligence(key: string) {
  return call<{ success: true; intelligence: TicketIntelligence | null } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/intelligence`
  );
}

// =============================================================================
// TCC v0.12 — Historial de intelligence + Edición general del ticket
// =============================================================================

/** GET /api/tickets/:key/intelligence/history — devuelve max 20 versiones. */
export async function getIntelligenceHistory(key: string) {
  return call<{ success: true; entries: IntelligenceHistoryEntry[] } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/intelligence/history`
  );
}

/** Campos editables del ticket via PATCH /api/tickets/:key. */
export interface UpdateTicketInput {
  title?: string;
  description?: string;
  sapModule?: string | null;
  environment?: string | null;
  priority?: string;
  assignee?: string | null;
  reporter?: string | null;
  status?: string;
}

/** PATCH /api/tickets/:key — actualiza campos generales (whitelist en backend). */
export async function updateTicket(key: string, patch: UpdateTicketInput) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}`,
    { method: "PATCH", body: patch }
  );
}
