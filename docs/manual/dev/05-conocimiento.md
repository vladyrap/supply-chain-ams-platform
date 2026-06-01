# 📚 Conocimiento (RAG) · Manual técnico

## Pipeline RAG

```
Upload (multipart) → /api/knowledge/ingest
  ↓
backend/src/services/knowledge.service.ts → ingestDocument()
  ↓
encola en Redis (BullMQ) → cola "rag-ingest"
  ↓
worker/src/jobs/rag-ingest.ts
  ├─ extract text (pdf-parse / mammoth / xlsx / fs)
  ├─ chunk (3500 chars con overlap 400)
  ├─ embed each chunk (gemini-embedding-001 a 768 dims)
  └─ INSERT INTO agent_knowledge_documents (... embedding vector(768))
  ↓
Status: pending → processing → indexed → ready
```

## Tabla DB

```sql
CREATE TABLE agent_knowledge_documents (
  id           UUID PRIMARY KEY,
  document_id  UUID NOT NULL,            -- agrupa chunks del mismo archivo
  source_file  TEXT,                     -- nombre archivo
  source_path  TEXT,                     -- path en /app/uploads
  chunk_index  INT NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(768),
  metadata     JSONB,                    -- { module, client, tags, page }
  status       TEXT,                     -- pending|processing|indexed|ready|failed
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_knowledge_embedding
  ON agent_knowledge_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

## Endpoints

| Método | Path | Body | Devuelve |
|---|---|---|---|
| POST | `/api/knowledge/ingest` | multipart | `{ documentId, jobId }` |
| GET | `/api/knowledge/documents` | — | array de `KnowledgeDocument` |
| GET | `/api/knowledge/documents/:id` | — | detalle + chunks |
| DELETE | `/api/knowledge/documents/:id` | — | `{ success }` |
| GET | `/api/knowledge/overview` | — | métricas (total, indexed, failed) |
| POST | `/api/search/semantic` | `{ query, limit }` | top K chunks ordenados |

## Búsqueda semántica

`backend/src/services/agent-knowledge.service.ts::searchRelevantChunks(query)`:

```ts
const queryEmbedding = await embed(query);   // gemini-embedding-001
const { rows } = await query(`
  SELECT id, document_id, content, metadata,
         1 - (embedding <=> $1::vector) AS score
  FROM agent_knowledge_documents
  WHERE status = 'ready'
    AND 1 - (embedding <=> $1::vector) > $2
  ORDER BY embedding <=> $1::vector
  LIMIT $3
`, [queryEmbedding, RAG_MIN_SCORE, RAG_TOP_K]);
```

`<=>` es el operador de distancia coseno de pgvector.

## Variables env

```bash
RAG_ENABLED=true
RAG_TOP_K=6
RAG_MIN_SCORE=0.55
RAG_CHUNK_CHARS=3500
RAG_CHUNK_OVERLAP=400
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIM=768
```

## Worker

`worker/src/index.ts` arranca BullMQ worker. Procesa `rag-ingest` jobs con concurrencia 2 (configurable).

Reintentos: 3 con backoff exponencial. Si falla persistente → status `failed` + log.

## Custom: agregar tipo de archivo

`worker/src/jobs/rag-ingest.ts::extractText(filePath, mimeType)`:

```ts
switch (mimeType) {
  case 'application/pdf':                  return pdfParse(buffer).then(d => d.text);
  case 'application/vnd.openxml...docx':   return mammoth.extractRawText({ buffer }).then(r => r.value);
  case 'application/vnd.openxml...xlsx':   return xlsxToText(buffer);
  case 'text/markdown':
  case 'text/plain':                        return buffer.toString('utf8');
  // ← agregar nuevo case
  default: throw new Error('Unsupported');
}
```

## Gotchas

- pgvector requiere extension habilitada: `CREATE EXTENSION IF NOT EXISTS vector;` (corre en init.sql).
- Si reduce el chunk size en env, los docs ya indexados NO se reindexan automáticamente. Hay que `DELETE` y resubir.
- Embedding rate-limit Gemini free: 1500 RPD → si subís 200 docs grandes en 1 día, podés tocar techo.
- Los archivos originales viven en `/app/uploads` (volumen Docker `ams-prod-uploads`). Backup separado.

## Roadmap

- OCR automático para PDFs escaneados (tesseract worker).
- Indexación incremental (solo nuevos chunks vs reindex completo).
- Búsqueda híbrida (BM25 + vector).
- Migración a MinIO/S3 para archivos originales.
