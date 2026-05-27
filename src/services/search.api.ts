const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

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
    const res = await fetch(`${API_BASE}/api/search?${params}`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as SearchResponse | { success: false; error: string } | null;
    if (!data) return { success: false, error: `HTTP ${res.status}` };
    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function reindexAll(force = false): Promise<{ success: true; ok: number; failed: number; byType: Record<string, number> } | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/search/reindex?force=${force}`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    return data ?? { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function getSearchStats(): Promise<{ success: true; total: number; byType: Record<string, number>; lastIndexed: string | null } | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/search/stats`, { credentials: "include", cache: "no-store" });
    return (await res.json()) ?? { success: false, error: "no data" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
