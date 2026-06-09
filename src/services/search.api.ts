import { apiGet, apiPost, ApiError } from "./_http";

export type SearchSourceType = "incident" | "ticket" | "conversation" | "kb" | "meeting" | "inbound";

export interface SearchHit {
  source_type: SearchSourceType;
  source_id: string;
  title: string;
  excerpt: string;
  href: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface SearchResponse {
  success: true;
  count: number;
  results: SearchHit[];
  grouped: Record<string, SearchHit[]>;
}

export async function semanticSearch(q: string, opts: { types?: SearchSourceType[]; limit?: number } = {}): Promise<SearchResponse | { success: false; error: string }> {
  const params = new URLSearchParams({ q });
  if (opts.types && opts.types.length > 0) params.set("types", opts.types.join(","));
  if (opts.limit) params.set("limit", String(opts.limit));
  try {
    const data = await apiGet<SearchResponse | { success: false; error: string }>(`/api/search?${params}`);
    if (!data) return { success: false, error: "no data" };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function reindexAll(force = false): Promise<{ success: true; ok: number; failed: number; byType: Record<string, number> } | { success: false; error: string }> {
  try {
    const data = await apiPost<{ success: true; ok: number; failed: number; byType: Record<string, number> } | { success: false; error: string }>(
      `/api/search/reindex?force=${force}`,
    );
    return data ?? { success: false, error: "no data" };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function getSearchStats(): Promise<{ success: true; total: number; byType: Record<string, number>; lastIndexed: string | null } | { success: false; error: string }> {
  try {
    const data = await apiGet<{ success: true; total: number; byType: Record<string, number>; lastIndexed: string | null } | { success: false; error: string }>(
      "/api/search/stats",
    );
    return data ?? { success: false, error: "no data" };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
