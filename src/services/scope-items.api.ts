import type { ConfidenceLevel } from "@/types";
import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

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
    { method: "POST", body: input }
  );
}
