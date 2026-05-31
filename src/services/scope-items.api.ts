import type { ConfidenceLevel } from "@/types";

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export type SapModule = "MM" | "SD" | "PP" | "EWM" | "QM" | "WM" | "ARIBA" | "IBP" | "BTP" | "INTEGRACION";

export interface SapScopeItem {
  code: string;
  title: string;
  module: SapModule;
  process: string;
  subProcess: string | null;
  description: string;
  hasKnowledge: boolean;
  hasPlaybook: boolean;
  hasQa: boolean;
  createdAt: string;
  updatedAt: string;
}

// re-export por convención
export type { ConfidenceLevel };

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

export async function listScopeItems(module?: SapModule) {
  const qs = module ? `?module=${encodeURIComponent(module)}` : "";
  return call<{ success: true; count: number; items: SapScopeItem[] } | { success: false; error: string }>(
    `/api/scope-items${qs}`
  );
}

export async function getScopeItem(code: string) {
  return call<{ success: true; item: SapScopeItem } | { success: false; error: string }>(
    `/api/scope-items/${encodeURIComponent(code)}`
  );
}

export async function suggestScopeItemsForTicket(input: { module?: string; title?: string; description?: string }) {
  return call<{ success: true; items: SapScopeItem[] } | { success: false; error: string }>(
    "/api/scope-items/suggest",
    { method: "POST", body: JSON.stringify(input) }
  );
}
