const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export type FeedbackSource = "support" | "agent_chat" | "voice" | "other";
export type FeedbackKind = "positive" | "negative";

export interface AiFeedback {
  id: string;
  source: FeedbackSource;
  kind: FeedbackKind;
  reason: string | null;
  conversation_id: string | null;
  message_id: string | null;
  ticket_id: string | null;
  query: string | null;
  response: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  recent7d: number;
  bySource: { source: string; positive: number; negative: number }[];
}

export interface SubmitFeedbackInput {
  source: FeedbackSource;
  kind: FeedbackKind;
  reason?: string;
  conversationId?: string;
  messageId?: string;
  ticketId?: string;
  query?: string;
  response?: string;
  metadata?: Record<string, unknown>;
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<
  { ok: true; feedback: AiFeedback } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/feedback`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; feedback?: AiFeedback; error?: string } | null;
    if (!data || !data.success || !data.feedback) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, feedback: data.feedback };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function listFeedback(filters: { source?: FeedbackSource; kind?: FeedbackKind; conversationId?: string; limit?: number } = {}): Promise<
  { ok: true; feedback: AiFeedback[] } | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.conversationId) params.set("conversationId", filters.conversationId);
  if (filters.limit) params.set("limit", String(filters.limit));
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/feedback?${params.toString()}`, {
      cache: "no-store", credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; feedback?: AiFeedback[]; error?: string } | null;
    if (!data || !data.success || !data.feedback) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, feedback: data.feedback };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function fetchFeedbackStats(): Promise<
  { ok: true; stats: FeedbackStats } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/feedback/stats`, { cache: "no-store", credentials: "include" });
    const data = (await res.json().catch(() => null)) as { success: boolean; stats?: FeedbackStats; error?: string } | null;
    if (!data || !data.success || !data.stats) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, stats: data.stats };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export interface ConversationTrace {
  conversation: {
    id: string; channel: string; status: string; user_name: string | null;
    user_email: string | null; client: string | null; sap_module: string | null;
    urgency: string | null; category: string | null; summary: string | null;
    message_count: number; ai_resolved: boolean; escalated_to_ticket: string | null;
    created_at: string; updated_at: string; closed_at: string | null;
  };
  messages: { id: string; role: string; text: string | null; metadata: Record<string, unknown>; created_at: string }[];
  feedback: AiFeedback[];
  ticket: {
    id: string; code: string; title: string; summary: string; status: string;
    priority: string; sla_minutes: number; sla_due_at: string | null;
    created_at: string; resolved_at: string | null; closed_at: string | null;
    assigned_role: string | null;
  } | null;
}

export async function fetchConversationTrace(id: string): Promise<
  { ok: true; trace: ConversationTrace } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/conversations/${id}/trace`, {
      cache: "no-store", credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; error?: string } & Partial<ConversationTrace> | null;
    if (!data || !data.success || !data.conversation) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return {
      ok: true,
      trace: {
        conversation: data.conversation,
        messages: data.messages || [],
        feedback: data.feedback || [],
        ticket: data.ticket || null,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
