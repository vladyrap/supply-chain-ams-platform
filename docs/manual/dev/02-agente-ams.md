# 🤖 Agente AMS · Manual técnico

> **Ruta frontend:** `/agent` · **Backend:** `POST /api/ams/chat` + stream `/api/ams/chat/stream`

## Arquitectura

```
ChatPanel.tsx (UI)
  ↓ services/agent.api.ts → sendMessage()
backend/src/controllers/ams.controller.ts → postChat
  ↓
backend/src/services/claude.service.ts → chatWithAgent(input)
  ↓
  ├─ prepareRequest()              // arma systemPrompt + RAG context + few-shot Q&A
  ├─ retryWithBackoff(...)         // 3 reintentos con backoff exponencial
  ├─ ai.models.generateContent()   // Gemini (a pesar del nombre del archivo)
  ├─ detectConfidence(text)        // alta/media/baja/no_detectada
  ├─ ragSourcesFromChunks(chunks)  // metadata trazable
  ├─ recordProvenance()             // tabla agent_response_provenance
  └─ checkHallucinations()          // fire-and-forget
  ↓
controller → buildAgentMetadata({model, confidence, sources, responseId})
  ↓
saveIncident() → tabla incidents (con estimación auto via ticket-estimate.service)
  ↓
Response JSON con: response, metadata { agentVersion, kbVersion, mode, sources, ... }
```

## Archivos clave

### Frontend
| Path | Rol |
|---|---|
| `src/app/(platform)/agent/page.tsx` | Page wrapper con RBAC |
| `src/components/agent/ChatPanel.tsx` | UI principal del chat |
| `src/components/agent/MarkdownView.tsx` | Render con remark-gfm |
| `src/components/voice/VoiceControls.tsx` | Modo voz (Web Speech API) |
| `src/services/agent.api.ts` | Cliente HTTP |
| `src/types/index.ts` | `AgentChatRequest`, `AgentChatResponseOk`, `AgentResponseMetadata`, `AgentResponseSource` |

### Backend
| Path | Rol |
|---|---|
| `backend/src/controllers/ams.controller.ts` | `postChat`, `postChatStream`, `postResearch` |
| `backend/src/services/claude.service.ts` | Llama Gemini (nombre histórico Claude — internamente Gemini) |
| `backend/src/services/incident.service.ts` | `saveIncident()` + autoestimación |
| `backend/src/services/ticket-estimate.service.ts` | Persistencia estimación |
| `backend/src/services/provenance.service.ts` | Tabla `agent_response_provenance` |
| `backend/src/services/hallucination-detector.service.ts` | Check post-response fire-and-forget |
| `backend/src/services/agent-knowledge.service.ts` | RAG con pgvector |
| `backend/src/utils/agent-meta.ts` | `buildAgentMetadata()` + `getAgentVersion()` + `getKnowledgeBaseVersion()` |

## Tipos clave

```ts
// src/types/index.ts
export interface AgentChatRequest {
  message: string;
  user?: string;
  module?: SapModule;
  client?: string;
  environment?: Environment;
  attachments?: Attachment[];
}

export interface AgentResponseMetadata {
  model: string;
  timestamp: string;
  confidence: "alta" | "media" | "baja" | "no_detectada";
  agentVersion?: string;
  kbVersion?: string;
  mode?: "demo" | "real";
  responseId?: string;
  sources?: AgentResponseSource[];
}

export interface AgentResponseSource {
  id: string;
  sourceType: "rag_document" | "kb_article" | "playbook" | "scope_item" | "qa";
  title: string;
  chunkIndex?: number;
  relevance?: number;
}
```

## RAG pipeline

1. **Indexación** (offline, vía worker BullMQ):
   - PDF/DOCX/XLSX/MD/TXT subidos en `/knowledge` → cola `rag-ingest`
   - Worker: pdf-parse / mammoth / xlsx para extraer texto
   - Chunking: 3500 chars con overlap 400
   - Embedding: `gemini-embedding-001` a 768 dims
   - Persistido en tabla `agent_knowledge_documents` (pgvector)

2. **Retrieval** (online, en cada chat):
   - `claude.service.ts → prepareRequest()` llama `searchRelevantChunks(input)`
   - Top K=6 con MIN_SCORE=0.55
   - Inyectados al systemPrompt como `[CONTEXTO RAG]`
   - El agente cita las fuentes en la respuesta

3. **Tracking** (después de cada chat):
   - `recordProvenance({ responseId, qaIds, itemIds, ragDocIds, userQuery })`
   - Permite que el feedback humano ajuste scores futuros

## Detección de confianza

`detectConfidence(text: string)`:

- Si la respuesta contiene "no sé", "no encuentro información", "no tengo datos" → `baja`
- Si contiene "posiblemente", "podría ser", "probable" → `media`
- Si es respuesta firme con pasos concretos → `alta`
- Si no coincide ningún patrón → `no_detectada`

Heurística simple, no ML. Cuando haya histórico, se reemplaza por regresión.

## Hallucination check (fire-and-forget)

Post-response, dispara:
```ts
checkHallucinations({ responseId, userQuery, responseText })
```

Hace un segundo prompt al LLM pidiendo que evalúe si la respuesta tiene
afirmaciones no sustanciadas. Resultado va a tabla `agent_hallucination_checks`
sin bloquear la respuesta al usuario.

## Endpoints

| Método | Path | Body | Notas |
|---|---|---|---|
| POST | `/api/ams/chat` | `AgentChatRequest` | Respuesta sync, ~5-10s con Gemini |
| POST | `/api/ams/chat/stream` | `AgentChatRequest` | SSE streaming, eventos `delta` + `done` |
| POST | `/api/ams/research` | `AgentChatRequest` + `mode: "research"` | Multi-iteration con tool use (agent-research.service) |

## Retry / backoff

`retryWithBackoff(fn, { label, retries: 3 })`:
- Retry en 5xx, 429, 503 INTERNAL
- Backoff exponencial: 1s, 2s, 4s
- Implementado en `backend/src/utils/retry.ts`

## Variables env relevantes

```bash
GEMINI_API_KEY=...                  # obligatoria
GEMINI_MODEL=gemini-2.5-flash       # default
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIM=768

RAG_ENABLED=true
RAG_TOP_K=6
RAG_MIN_SCORE=0.55
RAG_CHUNK_CHARS=3500
RAG_CHUNK_OVERLAP=400

AMS_AGENT_VERSION=v0.1.0            # override del package.json
```

## Cómo extender

**Cambiar el modelo:**
```bash
GEMINI_MODEL=gemini-2.5-pro npm run dev
```

**Agregar tool al modo research:**
- `backend/src/services/agent-research.service.ts` → array `TOOLS`
- Cada tool tiene `name`, `description`, `args` schema, `execute(args)`

**Agregar fuente al provenance:**
- `claude.service.ts` línea ~250 — `recordProvenance({...})` recibe nuevos campos opcionales
- Tabla `agent_response_provenance` necesita ALTER si es nueva columna

## Tablas DB

```sql
-- incidents: cada interacción del agente
incidents (id, user_name, client_name, sap_module, environment,
           message, response, confidence, model,
           attachments JSONB, estimated_resolution JSONB,
           created_at)

-- agent_response_provenance: fuentes usadas en cada respuesta
agent_response_provenance (response_id, qa_ids[], item_ids[], rag_doc_ids[],
                           user_query, module, created_at)

-- agent_knowledge_documents: chunks indexados con pgvector
agent_knowledge_documents (id, document_id, chunk_index, content,
                           embedding vector(768), source_file, metadata jsonb)

-- agent_hallucination_checks: post-validación
agent_hallucination_checks (response_id, has_hallucination, claims jsonb,
                            confidence, created_at)
```

## Costos típicos (Gemini)

- Input: ~$0.075 por 1M tokens (Flash) o $1.25 (Pro)
- Output: ~$0.30 por 1M tokens (Flash) o $5 (Pro)
- Embedding: gratis (free tier 1500 RPD)

Para 1000 chats/mes con ~2000 tokens cada uno: **~$1/mes en Flash, ~$20 en Pro**.

## Gotchas

- `claude.service.ts` se llama "claude" pero usa **Gemini**. Renaming pendiente para no confundir.
- `attachments` se guardan como base64 en DB → tickets viejos pesan. Migración futura a S3.
- `detectConfidence` es heurística — no la confundas con la confianza del Decision Engine.
