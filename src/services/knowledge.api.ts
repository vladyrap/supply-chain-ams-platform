import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

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

export async function ingestDocument(p: IngestPayload): Promise<
  { ok: true; document: KnowledgeDocument } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; document?: KnowledgeDocument; error?: string }>(
    "/api/knowledge/ingest",
    { method: "POST", body: p },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.document) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, document: r.data.document };
}

export async function listKnowledgeDocuments(filters: { module?: string; client?: string; status?: string } = {}): Promise<
  { ok: true; documents: KnowledgeDocument[] } | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filters.module) params.set("module", filters.module);
  if (filters.client) params.set("client", filters.client);
  if (filters.status) params.set("status", filters.status);
  const r = await tryFetch<{ success: boolean; documents?: KnowledgeDocument[]; error?: string }>(
    `/api/knowledge/documents?${params.toString()}`,
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.documents) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, documents: r.data.documents };
}

export async function deleteKnowledgeDocument(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await tryFetch<{ success: boolean; error?: string }>(
    `/api/knowledge/documents/${id}`,
    { method: "DELETE" },
  );
  if (!r.ok) return r;
  if (!r.data.success) return { ok: false, error: r.data.error || "no data" };
  return { ok: true };
}

export async function fetchKnowledgeOverview(): Promise<
  { ok: true; stats: KnowledgeStats } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; stats?: KnowledgeStats; error?: string }>("/api/knowledge/overview");
  if (!r.ok) return r;
  if (!r.data.success || !r.data.stats) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, stats: r.data.stats };
}

// =====================================================
// Quick-add: ingest text directo (sin archivo)
// =====================================================
export async function ingestText(p: { title?: string; content: string; module?: string; client?: string }): Promise<
  { ok: true; document: KnowledgeDocument } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; document?: KnowledgeDocument; error?: string }>(
    "/api/knowledge/ingest-text",
    { method: "POST", body: p },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.document) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, document: r.data.document };
}

// Ingest desde URL pública (HTML, MD o TXT)
export async function ingestUrl(p: { url: string; title?: string; module?: string; client?: string }): Promise<
  { ok: true; document: KnowledgeDocument } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; document?: KnowledgeDocument; error?: string }>(
    "/api/knowledge/ingest-url",
    { method: "POST", body: p },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.document) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, document: r.data.document };
}

// =====================================================
// Chunks de un documento (para auditar calidad RAG)
// =====================================================
export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  module: string | null;
  client: string | null;
  source_file: string;
  source_type: string;
  estimated_tokens: number;
}

export async function fetchDocumentChunks(documentId: string, limit = 200): Promise<
  { ok: true; chunks: KnowledgeChunk[] } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; chunks?: KnowledgeChunk[]; error?: string }>(
    `/api/knowledge/documents/${documentId}/chunks?limit=${limit}`,
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.chunks) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, chunks: r.data.chunks };
}

// =====================================================
// RAG search playground
// =====================================================
export interface RagSearchHit {
  id: string;
  documentId: string;
  title: string;
  sourceType: string;
  sourceFile: string;
  module: string | null;
  client: string | null;
  chunkIndex: number;
  content: string;
  score: number;
}

export async function searchKnowledge(query: string, filters: { module?: string; client?: string } = {}): Promise<
  { ok: true; chunks: RagSearchHit[]; query: string } | { ok: false; error: string }
> {
  const r = await tryFetch<{ success: boolean; chunks?: RagSearchHit[]; query?: string; error?: string }>(
    "/api/knowledge/search",
    { method: "POST", body: { query, module: filters.module, client: filters.client } },
  );
  if (!r.ok) return r;
  if (!r.data.success || !r.data.chunks) return { ok: false, error: r.data.error || "no data" };
  return { ok: true, chunks: r.data.chunks, query: r.data.query || query };
}
