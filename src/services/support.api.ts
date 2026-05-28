const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

// ============ types (idénticos al backend) ============
export type SupportChannel = "chat" | "whatsapp" | "voice" | "email";
export type SupportStatus =
  | "open" | "ai_handling" | "waiting_user"
  | "escalated" | "resolved" | "closed";
export type Urgency = "baja" | "media" | "alta" | "critica";
export type Priority = Urgency;
export type TicketStatus =
  | "new" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type KbStatus = "draft" | "approved" | "archived";
export type MessageRole = "user" | "ai" | "agent" | "system";

export interface SupportConversation {
  id: string;
  channel: SupportChannel;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  client: string | null;
  status: SupportStatus;
  intent: string | null;
  sap_module: string | null;
  urgency: Urgency | null;
  category: string | null;
  summary: string | null;
  message_count: number;
  ai_resolved: boolean;
  escalated_to_ticket: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}
export interface SupportMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
export interface SupportTicket {
  id: string;
  code: string;
  conversation_id: string | null;
  title: string;
  summary: string;
  system_affected: string | null;
  category: string | null;
  priority: Priority;
  sla_minutes: number;
  sla_due_at: string | null;
  assigned_role: string | null;
  assigned_to: string | null;
  status: TicketStatus;
  evidences: { type: string; label: string; value: string }[];
  resolution: string | null;
  kb_article_id: string | null;
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}
export interface KbArticle {
  id: string;
  title: string;
  problem: string;
  solution: string;
  system: string | null;
  category: string | null;
  tags: string[];
  status: KbStatus;
  source: "manual" | "from_ticket" | "from_meeting";
  source_ticket_id: string | null;
  use_count: number;
  helpful_count: number;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
}

// ============ helpers ============
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

// ============ conversations ============
export interface StartConvPayload {
  channel?: SupportChannel;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  client?: string;
  initial_message?: string;
}
export interface FirstResponsePayload {
  conversation: SupportConversation;
  aiMessage: SupportMessage;
  triage: {
    intent: string; sap_module: string; urgency: string; category: string;
    title: string; summary: string; confidence: string;
  };
  decision: {
    resolved: boolean; needs_more_info: boolean; should_escalate: boolean;
    kb_article_id: string | null;
  };
  kbHitsUsed: { id: string; title: string }[];
  escalatedTicket?: SupportTicket;
}

export const supportApi = {
  startConversation: (p: StartConvPayload) => call<{
    success: true;
    conversation: SupportConversation;
    welcome?: string;
    firstResponse?: FirstResponsePayload;
  }>("/api/support/conversations", {
    method: "POST",
    body: JSON.stringify(p),
  }),

  sendMessage: (id: string, text: string) => call<{
    success: true;
  } & FirstResponsePayload>(`/api/support/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  }),

  listConversations: (filters?: { status?: SupportStatus; channel?: SupportChannel }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.channel) params.set("channel", filters.channel);
    return call<{ success: true; count: number; conversations: SupportConversation[] }>(
      `/api/support/conversations?${params.toString()}`
    );
  },

  getConversation: (id: string) => call<{
    success: true;
    conversation: SupportConversation;
    messages: SupportMessage[];
  }>(`/api/support/conversations/${id}`),

  closeConversation: (id: string, resolved = false) => call<{ success: true }>(
    `/api/support/conversations/${id}/close`,
    { method: "POST", body: JSON.stringify({ resolved }) }
  ),

  escalateConversation: (id: string, reason?: string) => call<{ success: true; ticket: SupportTicket }>(
    `/api/support/conversations/${id}/escalate`,
    { method: "POST", body: JSON.stringify({ reason: reason ?? "" }) }
  ),

  // tickets de mesa
  listTickets: (filters?: { status?: TicketStatus; priority?: Priority }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    return call<{ success: true; count: number; tickets: SupportTicket[] }>(
      `/api/support/tickets?${params.toString()}`
    );
  },
  getTicket: (id: string) => call<{ success: true; ticket: SupportTicket }>(`/api/support/tickets/${id}`),
  assignTicket: (id: string) => call<{ success: true; ticket: SupportTicket }>(
    `/api/support/tickets/${id}/assign`,
    { method: "POST", body: JSON.stringify({}) }
  ),
  resolveTicket: (id: string, resolution: string, createKb: boolean) => call<{
    success: true; ticket: SupportTicket; kbArticle?: KbArticle;
  }>(`/api/support/tickets/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolution, create_kb_article: createKb }),
  }),
  closeTicket: (id: string) => call<{ success: true; ticket: SupportTicket }>(
    `/api/support/tickets/${id}/close`,
    { method: "POST" }
  ),
  setTicketStatus: (id: string, status: TicketStatus) => call<{ success: true; ticket: SupportTicket }>(
    `/api/support/tickets/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  ),

  // KB
  listKb: (filters?: { status?: KbStatus; system?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.system) params.set("system", filters.system);
    return call<{ success: true; count: number; articles: KbArticle[] }>(
      `/api/support/kb?${params.toString()}`
    );
  },
  getKb: (id: string) => call<{ success: true; article: KbArticle }>(`/api/support/kb/${id}`),
  createKb: (p: {
    title: string; problem: string; solution: string;
    system?: string; category?: string; tags?: string[];
  }) => call<{ success: true; article: KbArticle }>("/api/support/kb", {
    method: "POST",
    body: JSON.stringify(p),
  }),
  approveKb: (id: string) => call<{ success: true; article: KbArticle }>(
    `/api/support/kb/${id}/approve`,
    { method: "POST" }
  ),
  archiveKb: (id: string) => call<{ success: true; article: KbArticle }>(
    `/api/support/kb/${id}/archive`,
    { method: "POST" }
  ),
  deleteKb: (id: string) => call<{ success: true }>(`/api/support/kb/${id}`, { method: "DELETE" }),
  markKbHelpful: (id: string) => call<{ success: true }>(`/api/support/kb/${id}/helpful`, { method: "POST" }),

  // métricas
  metrics: () => call<{
    success: true;
    conversations: { total: number; byStatus: { key: string; count: number }[]; byChannel: { key: string; count: number }[] };
    aiResolution: { closedConversations: number; resolvedByAi: number; rate: number };
    tickets: { byStatus: { key: string; count: number }[]; byPriority: { key: string; count: number }[]; slaBreaches: number };
    kb: { byStatus: { key: string; count: number }[] };
  }>("/api/support/metrics"),
};
