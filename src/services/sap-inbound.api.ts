import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

export type InboundSource =
  | "idoc" | "short_dump" | "oss_note" | "job_failure" | "transport" | "generic";

export interface InboundEvent {
  id: string;
  source: InboundSource;
  sap_system: string | null;
  sap_client: string | null;
  severity: string | null;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  incident_id: string | null;
  support_ticket_id: string | null;
  kb_article_id: string | null;
  auth_token_hint: string | null;
  received_from_ip: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface InboundToken {
  id: string;
  name: string;
  sources: string[];
  active: boolean;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
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

export const sapInboundApi = {
  listEvents: (source?: InboundSource) => {
    const p = new URLSearchParams();
    if (source) p.set("source", source);
    return call<{ success: true; count: number; events: InboundEvent[] }>(
      `/api/sap/inbound/events?${p.toString()}`
    );
  },
  getEvent: (id: string) => call<{ success: true; event: InboundEvent }>(`/api/sap/inbound/events/${id}`),

  listTokens: () => call<{ success: true; count: number; tokens: InboundToken[] }>("/api/sap/inbound/tokens"),

  createToken: (name: string, sources?: string[]) => call<{
    success: true; token: string; record: InboundToken;
  }>("/api/sap/inbound/tokens", {
    method: "POST",
    body: { name, sources },
  }),

  deleteToken: (id: string) => call<{ success: true }>(
    `/api/sap/inbound/tokens/${id}`,
    { method: "DELETE" }
  ),
};
