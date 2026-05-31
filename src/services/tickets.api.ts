import type { TicketEstimatedResolution } from "@/types/estimation";

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

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
}

export interface Classification {
  response: string;
  model: string;
  confidence: "baja" | "media" | "alta" | "no_detectada";
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

export async function listTickets() {
  return call<{ success: true; source: "jira" | "mock"; count: number; tickets: Ticket[] } | { success: false; error: string }>(
    "/api/tickets"
  );
}

export async function createTicket(input: CreateTicketInput) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    "/api/tickets",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export async function recalculateTicket(key: string, opts: { force?: boolean; actor?: string } = {}) {
  return call<{ success: true; ticket: Ticket } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(key)}/recalculate`,
    { method: "POST", body: JSON.stringify(opts) }
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
    { method: "PATCH", body: JSON.stringify(patch) }
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
