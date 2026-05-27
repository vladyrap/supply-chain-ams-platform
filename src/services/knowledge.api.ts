const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export interface KnowledgeDocument {
  id: string;
  title: string | null;
  source_file: string | null;
  source_type: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  module: string | null;
  process: string | null;
  client: string | null;
  status: "pending" | "processing" | "indexed" | "error";
  error_message: string | null;
  chunk_count: number;
  total_tokens: number;
  created_at: string;
  indexed_at: string | null;
}

export interface KnowledgeStats {
  documents: number;
  documentsIndexed: number;
  documentsPending: number;
  documentsError: number;
  chunks: number;
  totalTokens: number;
}

export interface IngestPayload {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  title?: string;
  module?: string;
  process?: string;
  client?: string;
}

export async function ingestDocument(p: IngestPayload): Promise<
  { ok: true; document: KnowledgeDocument } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/ingest`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const data = (await res.json().catch(() => null)) as { success: boolean; document?: KnowledgeDocument; error?: string } | null;
    if (!data || !data.success || !data.document) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, document: data.document };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function listKnowledgeDocuments(filters: { module?: string; client?: string; status?: string } = {}): Promise<
  { ok: true; documents: KnowledgeDocument[] } | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filters.module) params.set("module", filters.module);
  if (filters.client) params.set("client", filters.client);
  if (filters.status) params.set("status", filters.status);
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/documents?${params.toString()}`, { cache: "no-store", credentials: "include" });
    const data = (await res.json().catch(() => null)) as { success: boolean; documents?: KnowledgeDocument[]; error?: string } | null;
    if (!data || !data.success || !data.documents) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, documents: data.documents };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function deleteKnowledgeDocument(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/documents/${id}`, { method: "DELETE", credentials: "include" });
    const data = (await res.json().catch(() => null)) as { success: boolean; error?: string } | null;
    if (!data || !data.success) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function fetchKnowledgeOverview(): Promise<
  { ok: true; stats: KnowledgeStats } | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/overview`, { cache: "no-store", credentials: "include" });
    const data = (await res.json().catch(() => null)) as { success: boolean; stats?: KnowledgeStats; error?: string } | null;
    if (!data || !data.success || !data.stats) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, stats: data.stats };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
