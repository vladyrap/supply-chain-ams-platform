const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export type DestinationType = "webhook" | "slack" | "email" | "sap";

export type SapAdapter = "cloud_alm" | "s4_odata" | "btp_workflow" | "idoc_http" | "solman";
export type DeliveryStatus = "pending" | "sent" | "failed";

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  secret?: string;
}
export interface SlackConfig { webhookUrl: string; channel?: string }
export interface EmailConfig { to: string[]; from?: string; subject_prefix?: string }
export interface SapConfig {
  adapter: SapAdapter;
  baseUrl: string;
  path: string;
  auth: "basic" | "bearer" | "oauth2_client_credentials" | "none";
  username?: string;
  password?: string;
  bearerToken?: string;
  oauthTokenUrl?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  sapClient?: string;
  headers?: Record<string, string>;
  fetchCsrf?: boolean;
  bodyTemplate?: string;
}
export type DestinationConfig = WebhookConfig | SlackConfig | EmailConfig | SapConfig;

export interface IntegrationDestination {
  id: string;
  name: string;
  type: DestinationType;
  config: DestinationConfig;
  event_filter: string[];
  active: boolean;
  last_used_at: string | null;
  last_status: "ok" | "error" | "never" | null;
  last_error: string | null;
  delivery_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}
export interface IntegrationDelivery {
  id: string;
  destination_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  http_status: number | null;
  response_excerpt: string | null;
  attempts: number;
  last_attempted_at: string | null;
  created_at: string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!data) return { success: false, error: `HTTP ${res.status}` };
    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export const integrationsApi = {
  listDestinations: () => call<{ success: true; count: number; destinations: IntegrationDestination[] }>(
    "/api/integrations/destinations"
  ),
  createDestination: (p: {
    name: string; type: DestinationType; config: DestinationConfig;
    event_filter?: string[]; active?: boolean;
  }) => call<{ success: true; destination: IntegrationDestination }>(
    "/api/integrations/destinations",
    { method: "POST", body: JSON.stringify(p) }
  ),
  updateDestination: (id: string, p: Partial<{
    name: string; config: DestinationConfig; event_filter: string[]; active: boolean;
  }>) => call<{ success: true; destination: IntegrationDestination }>(
    `/api/integrations/destinations/${id}`,
    { method: "PATCH", body: JSON.stringify(p) }
  ),
  deleteDestination: (id: string) => call<{ success: true }>(
    `/api/integrations/destinations/${id}`,
    { method: "DELETE" }
  ),
  testDestination: (id: string) => call<{
    success: true;
    result: { ok: boolean; httpStatus?: number; responseExcerpt?: string; error?: string };
  }>(`/api/integrations/destinations/${id}/test`, { method: "POST" }),

  listDeliveries: (filters?: { status?: DeliveryStatus; eventType?: string; destinationId?: string }) => {
    const p = new URLSearchParams();
    if (filters?.status) p.set("status", filters.status);
    if (filters?.eventType) p.set("eventType", filters.eventType);
    if (filters?.destinationId) p.set("destinationId", filters.destinationId);
    return call<{ success: true; count: number; deliveries: IntegrationDelivery[] }>(
      `/api/integrations/deliveries?${p.toString()}`
    );
  },

  listEvents: () => call<{ success: true; events: { name: string; description: string }[] }>(
    "/api/integrations/events"
  ),

  emit: (eventType: string, data?: Record<string, unknown>) => call<{ success: true }>(
    "/api/integrations/emit",
    { method: "POST", body: JSON.stringify({ eventType, data: data ?? {} }) }
  ),
};
