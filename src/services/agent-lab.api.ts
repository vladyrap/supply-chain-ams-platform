import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

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

async function tryFetch<T>(path: string, opts?: ApiFetchOptions): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await apiFetch<T>(path, opts);
    if (data === null || data === undefined) return { ok: false, error: "no data" };
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<
  { ok: true; feedback: AiFeedback } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; feedback?: AiFeedback; error?: string }>(
    "/api/agent-lab/feedback",
    { method: "POST", body: input },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.feedback) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, feedback: r.data.feedback };
}

export async function listFeedback(filters: { source?: FeedbackSource; kind?: FeedbackKind; conversationId?: string; limit?: number } = {}): Promise<
  { ok: true; feedback: AiFeedback[] } | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.conversationId) params.set("conversationId", filters.conversationId);
  if (filters.limit) params.set("limit", String(filters.limit));
  const r = await tryFetch<{ success: boolean; feedback?: AiFeedback[]; error?: string }>(
    `/api/agent-lab/feedback?${params.toString()}`,
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.feedback) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, feedback: r.data.feedback };
}

export async function fetchFeedbackStats(): Promise<
  { ok: true; stats: FeedbackStats } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; stats?: FeedbackStats; error?: string }>("/api/agent-lab/feedback/stats");
  if (!r.ok) return r;
  if (!r.data.success || !r.data.stats) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, stats: r.data.stats };
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
  const r = await tryFetch<{ success: boolean; error?: string } & Partial<ConversationTrace>>(
    `/api/agent-lab/conversations/${id}/trace`,
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.conversation) return { ok: false, error: r.data.error || "no data" };
  return {
    ok: true,
    trace: {
      conversation: r.data.conversation,
      messages: r.data.messages || [],
      feedback: r.data.feedback || [],
      ticket: r.data.ticket || null,
    },
  };
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
  const r = await tryFetch<{ success: boolean; tickets?: ConvertibleTicket[]; error?: string }>(
    "/api/agent-lab/wizard/tickets",
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.tickets) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, tickets: r.data.tickets };
}

export async function generateWizardDraft(ticketId: string): Promise<
  { ok: true; result: DraftResult } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; error?: string } & Partial<DraftResult>>(
    `/api/agent-lab/wizard/draft/${ticketId}`,
    { method: "POST" },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.draft) return { ok: false, error: r.data.error || "no data" };
  return {
    ok: true,
    result: {
      draft: r.data.draft,
      ticket: r.data.ticket!,
      conversationMessages: r.data.conversationMessages ?? 0,
      model: r.data.model ?? "gemini-2.5-flash",
      latencyMs: r.data.latencyMs ?? 0,
      tokens: r.data.tokens ?? { prompt: 0, completion: 0, total: 0 },
    },
  };
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
  const r = await tryFetch<{ success: boolean; article?: { id: string; title: string; status: string }; error?: string }>(
    "/api/agent-lab/wizard/commit",
    { method: "POST", body: input },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.article) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, article: r.data.article };
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
  const r = await tryFetch<{ success: boolean; error?: string } & Partial<PlaygroundRunResult>>(
    "/api/agent-lab/playground/run",
    { method: "POST", body: input },
  );
  if (!r.ok) return r;
  if (!r.data.success || typeof r.data.text !== "string") return { ok: false, error: r.data.error || "no data" };
  return {
    ok: true,
    result: {
      text: r.data.text,
      model: r.data.model ?? "gemini-2.5-flash",
      latencyMs: r.data.latencyMs ?? 0,
      tokens: r.data.tokens ?? { prompt: 0, completion: 0, total: 0 },
    },
  };
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
  const r = await tryFetch<{ success: boolean; version?: PromptVersion; error?: string }>(
    "/api/agent-lab/playground/adopt",
    { method: "POST", body: input },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.version) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, version: r.data.version };
}

export async function fetchActivePrompt(): Promise<
  { ok: true; version: PromptVersion | null } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; version?: PromptVersion | null; error?: string }>(
    "/api/agent-lab/playground/active",
  );
  if (!r.ok) return r;
  if (!r.data.success) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, version: r.data.version ?? null };
}

export async function fetchPromptVersions(): Promise<
  { ok: true; versions: PromptVersion[] } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; versions?: PromptVersion[]; error?: string }>(
    "/api/agent-lab/playground/versions",
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.versions) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, versions: r.data.versions };
}

export async function activatePromptVersion(id: string): Promise<
  { ok: true; version: PromptVersion } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; version?: PromptVersion; error?: string }>(
    `/api/agent-lab/playground/versions/${id}/activate`,
    { method: "POST" },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.version) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, version: r.data.version };
}
