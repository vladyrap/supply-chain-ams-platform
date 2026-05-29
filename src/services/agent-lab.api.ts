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

// ============================================================================
// WIZARD ticket → KB
// ============================================================================
export interface ConvertibleTicket {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  conversation_id: string | null;
  resolved_at: string | null;
  has_kb: boolean;
  client: string | null;
  sap_module: string | null;
}

export interface KbDraft {
  title: string;
  problem: string;
  solution: string;
  category: string | null;
  system: string | null;
  tags: string[];
  sourceSummary: string;
}

export interface DraftResult {
  draft: KbDraft;
  ticket: {
    id: string; code: string; title: string; summary: string; client: string | null;
    sap_module: string | null; priority: string;
  };
  conversationMessages: number;
  model: string;
  latencyMs: number;
  tokens: { prompt: number; completion: number; total: number };
}

export async function fetchConvertibleTickets(): Promise<
  { ok: true; tickets: ConvertibleTicket[] } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/wizard/tickets`, { cache: "no-store", credentials: "include" });
    const data = (await res.json().catch(() => null)) as { success: boolean; tickets?: ConvertibleTicket[]; error?: string } | null;
    if (!data || !data.success || !data.tickets) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, tickets: data.tickets };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function generateWizardDraft(ticketId: string): Promise<
  { ok: true; result: DraftResult } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/wizard/draft/${ticketId}`, {
      method: "POST", credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; error?: string } & Partial<DraftResult> | null;
    if (!data || !data.success || !data.draft) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return {
      ok: true,
      result: {
        draft: data.draft,
        ticket: data.ticket!,
        conversationMessages: data.conversationMessages ?? 0,
        model: data.model ?? "gemini-2.5-flash",
        latencyMs: data.latencyMs ?? 0,
        tokens: data.tokens ?? { prompt: 0, completion: 0, total: 0 },
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export interface WizardCommitInput {
  ticketId?: string;
  title: string;
  problem: string;
  solution: string;
  category?: string | null;
  system?: string | null;
  tags?: string[];
}

export async function commitWizardArticle(input: WizardCommitInput): Promise<
  { ok: true; article: { id: string; title: string; status: string } } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/wizard/commit`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; article?: { id: string; title: string; status: string }; error?: string } | null;
    if (!data || !data.success || !data.article) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, article: data.article };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

// ============================================================================
// PLAYGROUND
// ============================================================================
export interface PlaygroundRunInput {
  systemPrompt: string;
  query: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface PlaygroundRunResult {
  text: string;
  model: string;
  latencyMs: number;
  tokens: { prompt: number; completion: number; total: number };
}

export async function runPlaygroundQuery(input: PlaygroundRunInput): Promise<
  { ok: true; result: PlaygroundRunResult } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/playground/run`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; error?: string } & Partial<PlaygroundRunResult> | null;
    if (!data || !data.success || typeof data.text !== "string") return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return {
      ok: true,
      result: {
        text: data.text,
        model: data.model ?? "gemini-2.5-flash",
        latencyMs: data.latencyMs ?? 0,
        tokens: data.tokens ?? { prompt: 0, completion: 0, total: 0 },
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

// ============================================================================
// PROMPT VERSIONING — adoptar como activo / listar / activar
// ============================================================================
export interface PromptVersion {
  id: string;
  label: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  active: boolean;
  created_by: string;
  adoption_notes: string | null;
  created_at: string;
}

export interface AdoptPromptInput {
  label: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  adoptionNotes?: string;
}

export async function adoptPlaygroundPrompt(input: AdoptPromptInput): Promise<
  { ok: true; version: PromptVersion } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/playground/adopt`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; version?: PromptVersion; error?: string } | null;
    if (!data || !data.success || !data.version) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, version: data.version };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function fetchActivePrompt(): Promise<
  { ok: true; version: PromptVersion | null } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/playground/active`, {
      credentials: "include", cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; version?: PromptVersion | null; error?: string } | null;
    if (!data || !data.success) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, version: data.version ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function fetchPromptVersions(): Promise<
  { ok: true; versions: PromptVersion[] } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/playground/versions`, {
      credentials: "include", cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; versions?: PromptVersion[]; error?: string } | null;
    if (!data || !data.success || !data.versions) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, versions: data.versions };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function activatePromptVersion(id: string): Promise<
  { ok: true; version: PromptVersion } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-lab/playground/versions/${id}/activate`, {
      method: "POST", credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; version?: PromptVersion; error?: string } | null;
    if (!data || !data.success || !data.version) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, version: data.version };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
