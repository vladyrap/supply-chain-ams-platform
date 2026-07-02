// =============================================================================
// custom-agents.api.ts — v1.3 Agent Hub
// Cliente del backend de agentes custom (library + studio + chat).
// =============================================================================

import { apiFetch, ApiError } from "./_http";

export interface CustomAgent {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description: string;
  instructions: string;
  kbModules: string[];
  icon: string;
  visibility: "private" | "team" | "public";
  isVerified: boolean;
  status: "active" | "archived";
  rating: number;
  ratingCount: number;
  chatCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  category: string;
  description?: string;
  instructions: string;
  kbModules?: string[];
  icon?: string;
  visibility?: "private" | "team" | "public";
  createdBy?: string | null;
}

export interface AgentChatResponse {
  success: true;
  agent: { id: string; name: string; category: string; icon: string };
  response: string;
  conversationId: string;
  metadata: {
    model: string;
    confidence: string;
    ragSources: Array<{ title?: string; sourceFile?: string }>;
    responseId: string;
  };
}

export interface AgentConversation {
  id: string;
  agentId: string;
  userId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: "user" | "agent";
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Apps Agénticas (v1.3 F8) ──

export interface AppStep {
  agentId: string;
  instruction: string;
  name?: string;
}

export interface AgenticApp {
  id: string;
  name: string;
  category: string;
  description: string;
  objective: string;
  steps: AppStep[];
  icon: string;
  status: "active" | "archived";
  runCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepOutput {
  stepIndex: number;
  stepName: string;
  agentId: string;
  status: "pending" | "running" | "done" | "failed";
  output: string;
  durationMs: number;
}

export interface AppRun {
  id: string;
  appId: string;
  input: string;
  status: "running" | "done" | "failed";
  stepsOutput: StepOutput[];
  finalOutput: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const AGENT_CATEGORIES = [
  "MM", "SD", "PP", "FI", "CO", "BTP", "EWM", "INTEGRACION",
  "PRODUCTIVIDAD", "REPORTING", "GENERAL",
] as const;

type Result<T> = ({ success: true } & T) | { success: false; error: string };

async function call<T>(path: string, opts: Parameters<typeof apiFetch>[1] = {}): Promise<Result<T>> {
  try {
    const data = await apiFetch<{ success: true } & T>(path, opts);
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: (err as Error).message ?? "Error de red" };
  }
}

export async function listAgents(filters: {
  category?: string;
  createdBy?: string;
  verified?: boolean;
  search?: string;
} = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.createdBy) params.set("createdBy", filters.createdBy);
  if (filters.verified) params.set("verified", "true");
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return call<{ count: number; agents: CustomAgent[] }>(`/api/agents${qs ? `?${qs}` : ""}`);
}

export async function getAgent(id: string) {
  return call<{ agent: CustomAgent }>(`/api/agents/${encodeURIComponent(id)}`);
}

export async function createAgent(input: CreateAgentInput) {
  return call<{ agent: CustomAgent }>("/api/agents", { method: "POST", body: input });
}

export async function updateAgent(id: string, input: Partial<CreateAgentInput> & { status?: "active" | "archived" }) {
  return call<{ agent: CustomAgent }>(`/api/agents/${encodeURIComponent(id)}`, { method: "PUT", body: input });
}

export async function deleteAgent(id: string) {
  return call<Record<string, never>>(`/api/agents/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function rateAgent(id: string, stars: number) {
  return call<{ agent: CustomAgent }>(`/api/agents/${encodeURIComponent(id)}/rating`, {
    method: "POST",
    body: { stars },
  });
}

export async function chatWithAgent(
  id: string,
  input: { message: string; user?: string; client?: string; environment?: string; conversationId?: string },
) {
  return call<Omit<AgentChatResponse, "success">>(`/api/agents/${encodeURIComponent(id)}/chat`, {
    method: "POST",
    body: input,
    timeoutMs: 90_000, // Gemini puede tardar
  });
}

// ── Conversaciones (v1.3 F6) ──

export async function listConversations(agentId: string, user: string) {
  return call<{ conversations: AgentConversation[] }>(
    `/api/agents/${encodeURIComponent(agentId)}/conversations?user=${encodeURIComponent(user)}`,
  );
}

export async function getConversation(conversationId: string) {
  return call<{ conversation: AgentConversation; messages: AgentMessage[] }>(
    `/api/agent-conversations/${encodeURIComponent(conversationId)}`,
  );
}

export async function deleteConversation(conversationId: string, user: string) {
  return call<Record<string, never>>(
    `/api/agent-conversations/${encodeURIComponent(conversationId)}?user=${encodeURIComponent(user)}`,
    { method: "DELETE" },
  );
}

// ── Apps Agénticas (v1.3 F8) ──

export async function listApps() {
  return call<{ count: number; apps: AgenticApp[] }>("/api/apps");
}

export async function getApp(id: string) {
  return call<{ app: AgenticApp }>(`/api/apps/${encodeURIComponent(id)}`);
}

export async function createApp(input: {
  name: string;
  category?: string;
  description?: string;
  objective?: string;
  steps: AppStep[];
  icon?: string;
  createdBy?: string | null;
}) {
  return call<{ app: AgenticApp }>("/api/apps", { method: "POST", body: input });
}

export async function deleteApp(id: string) {
  return call<Record<string, never>>(`/api/apps/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function runApp(id: string, input: string, user?: string) {
  return call<{ run: AppRun }>(`/api/apps/${encodeURIComponent(id)}/run`, {
    method: "POST",
    body: { input, user },
  });
}

export async function getRun(runId: string) {
  return call<{ run: AppRun }>(`/api/apps/runs/${encodeURIComponent(runId)}`);
}

export async function listRuns(appId: string) {
  return call<{ runs: AppRun[] }>(`/api/apps/${encodeURIComponent(appId)}/runs`);
}

// ============================================================
// Favoritos — localStorage por browser (como IBM: corazón en la card)
// ============================================================

const FAV_KEY = "ams-agent-favorites";

export function getFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function toggleFavorite(agentId: string): Set<string> {
  const favs = getFavorites();
  if (favs.has(agentId)) favs.delete(agentId);
  else favs.add(agentId);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch { /* storage lleno o bloqueado — ignorar */ }
  return favs;
}
