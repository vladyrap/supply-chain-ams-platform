import type { AgentChatRequest, AgentChatResponse, AgentChatResponseOk } from "@/types";
import { apiFetch, ApiError, API_BASE } from "./_http";

// API_BASE re-export interno para el wrapper SSE más abajo (que NO usa apiFetch).
const SSE_BASE = API_BASE.replace(/\/+$/, "");

export async function sendChat(payload: AgentChatRequest): Promise<AgentChatResponse> {
  try {
    const data = await apiFetch<AgentChatResponse>("/api/ams/chat", {
      method: "POST",
      body: payload,
    });
    if (!data) return { success: false, error: "Respuesta inválida del backend" };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return {
      success: false,
      error: err instanceof Error ? `Error de red: ${err.message}` : "Error de red desconocido",
    };
  }
}

// ============================================================
// Streaming SSE: POST /api/ams/chat/stream
// ============================================================
export type ChatStreamEvent =
  | { type: "start"; input: AgentChatResponseOk["input"] & { attachmentCount: number } }
  | { type: "delta"; text: string }
  | { type: "done"; incidentId: string; metadata: AgentChatResponseOk["metadata"] }
  | { type: "error"; error: string };

export interface ChatStreamHandlers {
  onStart?: (ev: Extract<ChatStreamEvent, { type: "start" }>) => void;
  onDelta?: (text: string) => void;
  onDone?: (ev: Extract<ChatStreamEvent, { type: "done" }>) => void;
  onError?: (error: string) => void;
}

// ============================================================
// Research mode: tool-use (sin streaming)
// ============================================================
export interface ToolCallSummary {
  name: string;
  args: Record<string, unknown>;
  durationMs: number;
  resultSummary: string;
}

export interface ResearchResponse {
  success: true;
  agent: string;
  mode: "research";
  input: AgentChatResponseOk["input"] & { attachmentCount: number };
  response: string;
  metadata: AgentChatResponseOk["metadata"] & {
    iterations: number;
    toolCalls: ToolCallSummary[];
  };
}

export async function sendResearch(payload: AgentChatRequest): Promise<ResearchResponse | { success: false; error: string }> {
  try {
    const data = await apiFetch<ResearchResponse | { success: false; error: string }>("/api/ams/research", {
      method: "POST",
      body: payload,
    });
    if (!data) return { success: false, error: "no data" };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? `Error de red: ${err.message}` : "Error de red" };
  }
}

/**
 * Lee un stream SSE de POST /api/ams/chat/stream y dispara handlers.
 * Resuelve cuando el stream termina (normal o por error).
 *
 * NOTA: Esta función NO usa apiFetch porque _http.ts no soporta SSE.
 * Mantiene fetch() raw para acceder al ReadableStream del body.
 */
export async function sendChatStream(payload: AgentChatRequest, handlers: ChatStreamHandlers): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${SSE_BASE}/api/ams/chat/stream`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    handlers.onError?.(err instanceof Error ? `Error de red: ${err.message}` : "Error de red");
    return;
  }
  if (!response.ok || !response.body) {
    let msg = `HTTP ${response.status}`;
    try {
      const j = await response.json();
      if (j && typeof j.error === "string") msg = j.error;
    } catch { /* no JSON */ }
    handlers.onError?.(msg);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLines = raw
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6));
      if (dataLines.length === 0) continue;
      const dataStr = dataLines.join("\n");
      try {
        const ev = JSON.parse(dataStr) as ChatStreamEvent;
        if (ev.type === "start") handlers.onStart?.(ev);
        else if (ev.type === "delta") handlers.onDelta?.(ev.text);
        else if (ev.type === "done") handlers.onDone?.(ev);
        else if (ev.type === "error") handlers.onError?.(ev.error);
      } catch { /* ignorar líneas corruptas */ }
    }
  }
}

export async function getHealth(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await apiFetch("/health", { method: "GET" });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, detail: err.message };
    return { ok: false, detail: err instanceof Error ? err.message : "unknown" };
  }
}

// Re-export del tipo de autoestimación para que los consumidores no tengan
// que importar de dos paths distintos.
import type { TicketEstimatedResolution } from "@/types/estimation";

export interface IncidentSummary {
  id: string;
  user_name: string | null;
  client_name: string | null;
  sap_module: string | null;
  environment: string | null;
  message: string;
  response: string | null;
  confidence: string | null;
  model: string | null;
  attachments: { name: string; mimeType: string; sizeBytes: number }[];
  /** Autoestimación generada por el backend en saveIncident o en lazy backfill */
  estimatedResolution?: TicketEstimatedResolution | null;
  created_at: string;
}

export interface IncidentDetail extends Omit<IncidentSummary, "attachments"> {
  attachments: { name: string; mimeType: string; sizeBytes: number; dataBase64?: string }[];
}

export interface ListIncidentsFilters {
  module?: string;
  client?: string;
  environment?: string;
  fromDate?: string;
  toDate?: string;
  hasAttachments?: boolean;
  search?: string;
  limit?: number;
}

export async function listIncidents(filters: ListIncidentsFilters = {}): Promise<
  { ok: true; incidents: IncidentSummary[] } | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filters.module)         params.set("module", filters.module);
  if (filters.client)         params.set("client", filters.client);
  if (filters.environment)    params.set("environment", filters.environment);
  if (filters.fromDate)       params.set("fromDate", filters.fromDate);
  if (filters.toDate)         params.set("toDate", filters.toDate);
  if (filters.hasAttachments !== undefined) params.set("hasAttachments", String(filters.hasAttachments));
  if (filters.search)         params.set("search", filters.search);
  if (filters.limit)          params.set("limit", String(filters.limit));

  try {
    const data = await apiFetch<{ success: boolean; incidents?: IncidentSummary[]; error?: string }>(
      `/api/ams/incidents?${params.toString()}`,
    );
    if (!data || !data.success || !data.incidents) {
      return { ok: false, error: data?.error || "no data" };
    }
    return { ok: true, incidents: data.incidents };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function getIncident(id: string): Promise<
  { ok: true; incident: IncidentDetail } | { ok: false; error: string }
> {
  try {
    const data = await apiFetch<{ success: boolean; incident?: IncidentDetail; error?: string }>(
      `/api/ams/incidents/${id}`,
    );
    if (!data || !data.success || !data.incident) {
      return { ok: false, error: data?.error || "no data" };
    }
    return { ok: true, incident: data.incident };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
