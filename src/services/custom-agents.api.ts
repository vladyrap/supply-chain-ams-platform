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
  metadata: {
    model: string;
    confidence: string;
    ragSources: Array<{ title?: string; sourceFile?: string }>;
    responseId: string;
  };
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
  input: { message: string; user?: string; client?: string; environment?: string },
) {
  return call<Omit<AgentChatResponse, "success">>(`/api/agents/${encodeURIComponent(id)}/chat`, {
    method: "POST",
    body: input,
    timeoutMs: 90_000, // Gemini puede tardar
  });
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
