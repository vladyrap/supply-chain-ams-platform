# Gemini Governance (v0.13)

Arquitectura gobernada para todas las llamadas a Gemini en AMS Platform.
Reemplaza el patrón anterior donde cada caller construía su propio prompt y
parseaba texto libre.

## Principios

1. **Gemini no responde libremente sin contexto.** Toda tarea pasa por un `taskType` con prompt pack específico.
2. **Cada tarea usa su propio prompt + schema.** No hay un prompt único de 199 líneas para todo.
3. **JSON estructurado o nada.** Tasks marcadas `jsonOutput: true` piden `responseMimeType: "application/json"` + `responseSchema`.
4. **Reparación antes que falla.** Si Gemini devuelve JSON inválido → 1 retry con prompt corregido → si vuelve a fallar → fallback determinístico.
5. **Determinístico siempre disponible.** Intelligence Core + AMS Specialists Orchestrator + Customer Response Engine pueden cubrir todas las tareas sin Gemini.
6. **Auditable.** Cada llamada deja audit event (`GEMINI_CALL_STARTED/COMPLETED/FAILED/FALLBACK_USED`) en `audit_events` table + localStorage frontend.

## Arquitectura

```
caller (controller / pipeline)
  │
  ▼
callGeminiStructured({ taskType, userMessage, audit })
  │
  ├─► selectModelForTask(taskType)      ← decide model + temp + maxTokens + promptPack
  │
  ├─► loadPromptForTask(promptPack)     ← carga system-base.md + {pack}.prompt.md
  │
  ├─► fillPlaceholders(prompt, vars)    ← reemplaza {{TICKET_CONTEXT}}, {{RAG_CONTEXT}}, etc.
  │
  ├─► client.generateContent({
  │     systemInstruction,
  │     responseMimeType: "application/json",
  │     responseSchema: SCHEMA_BY_TASK[taskType]
  │   })
  │
  ├─► parseOrRepair(rawText)            ← JSON.parse → si falla → 1 retry corregido
  │
  ├─► metrics + audit                   ← geminiCallsTotal, geminiCallDuration, etc.
  │
  ▼
{ data, repaired, modelUsed, durationMs }   ← caller hace lo suyo

  Cualquier falla → throw StructuredCallError
  caller catch → engine determinístico (Intelligence Core / Specialists)
                 + audit GEMINI_FALLBACK_USED
```

## Task Router (`backend/src/intelligence/task-router.ts`)

| Task | Model | Temperature | maxTokens | jsonOutput | Prompt Pack |
|---|---|---|---|---|---|
| CHAT | gemini-2.5-flash | 0.4 | 4096 | false | system-base |
| CLASSIFICATION | gemini-2.5-flash | 0.3 | 2048 | **true** | classify |
| ESTIMATION | gemini-2.5-flash | 0.2 | 1024 | **true** | summary |
| RCA | gemini-2.5-flash | 0.4 | 4096 | false | rca |
| CUSTOMER_RESPONSE | gemini-2.5-flash | 0.3 | 2048 | **true** | customer_response |
| QUALITY_GATE | gemini-2.5-flash | 0.1 | 1024 | **true** | customer_response |
| DOCUMENTATION | gemini-2.5-flash | 0.4 | 8192 | false | rca |
| SUMMARY | gemini-2.5-flash | 0.3 | 1024 | **true** | summary |
| TECHNICAL_REASONING | gemini-2.5-flash | 0.4 | 4096 | false | system-base |

## Prompt Packs (`backend/prompts/`)

| Archivo | Tarea | Output |
|---|---|---|
| `ams-system-prompt.md` | Base común (concatenado a todos) | — |
| `classify.prompt.md` | CLASSIFICATION | JSON con primaryModule, transactions, errorCodes, missingData, confidence |
| `customer_response.prompt.md` | CUSTOMER_RESPONSE / QUALITY_GATE | JSON con customerSafeResponse, internalAMSNotes, riskWarnings |
| `summary.prompt.md` | SUMMARY / ESTIMATION | JSON con tldr, keyFacts, openQuestions, nextSteps |
| `rca.prompt.md` | RCA / DOCUMENTATION | Markdown estructurado (8 secciones) |

## JSON Schemas (`backend/src/schemas/gemini-schemas.ts`)

- `CLASSIFICATION_SCHEMA`
- `CUSTOMER_RESPONSE_SCHEMA`
- `SUMMARY_SCHEMA`

Mapeo task → schema en `SCHEMA_BY_TASK`. Tasks sin schema = texto libre.

## RAG priorizado (G-F6)

`retrieveRelevantChunks()` aplica boost multiplicativo por tipo:

| Tipo | Boost |
|---|---|
| playbook | × 2.0 |
| historical_case / case | × 1.5 |
| knowledge / kb | × 1.2 |
| scope_item | × 1.0 |
| otros | × 0.9 |

El boost se aplica después de cosine similarity, antes del orden final. Esto garantiza que un playbook explícito gane a un fragmento KB tangencialmente relacionado.

## Audit events nuevos

| Event | Cuándo |
|---|---|
| `GEMINI_CALL_STARTED` | Antes de generateContent |
| `GEMINI_CALL_COMPLETED` | Tras parse exitoso (con o sin reparación) |
| `GEMINI_CALL_FAILED` | API error, config error, JSON irrecuperable |
| `GEMINI_FALLBACK_USED` | Cuando el pipeline cae a engine determinístico |

Persistencia: backend `audit_events` table + frontend localStorage (vía el patrón estándar del Audit Trail v0.9). Categoría: `gemini`.

## Métricas Prometheus (`/metrics`)

| Métrica | Tipo | Labels |
|---|---|---|
| `ams_gemini_calls_total` | Counter | task_type, model, result |
| `ams_gemini_json_invalid_total` | Counter | task_type |
| `ams_gemini_repair_attempts_total` | Counter | task_type, outcome |
| `ams_gemini_timeout_total` | Counter | task_type |
| `ams_gemini_fallback_used_total` | Counter | task_type, reason |
| `ams_gemini_call_duration_seconds` | Histogram | task_type, model |
| `ams_gemini_confidence_level_total` | Counter | task_type, level |

## Customer Response sigue determinístico

`customer-response-engine.ts` **no llama Gemini en v0.13**. El motor es 100% determinístico con Quality Gate de 8 reglas bloqueantes. Esta es decisión arquitectónica intencional para evitar alucinaciones en respuestas que van al cliente.

Cuando se decida activar Gemini para refinamiento de tono, el infra ya está: existe `CUSTOMER_RESPONSE_SCHEMA`, prompt pack `customer_response.prompt.md` y task type. Solo hay que llamar `callGeminiStructured({ taskType: "CUSTOMER_RESPONSE", ... })` desde el engine después del Quality Gate.

## Mock mode

Variables de entorno:

- `FORCE_MOCK_LLM=1` en backend → `callGeminiStructured` lanza `StructuredCallError("mock_no_fallback")` y emite audit `GEMINI_FALLBACK_USED`. Caller debe usar engine determinístico.
- `NEXT_PUBLIC_FORCE_MOCK_LLM=1` en frontend → ya existía en `llm-provider-adapter.ts`.

Útil para demos sin credenciales o tests E2E.

## Compatibilidad con código previo

- `chatWithAgent()` (chat libre) sigue funcionando sin cambios. No usa el nuevo stack.
- `postClassifyTicket` endpoint sigue funcionando. Migrar a `callGeminiStructured` queda como mejora opcional v0.14.
- Frontend `auto-enrichment-pipeline.ts` sigue llamando `classifyTicket` legacy. Migrar a un endpoint nuevo `/classify-structured` queda como mejora opcional v0.14.

El default global = comportamiento previo a v0.13. Lo nuevo es **opt-in por tarea**.
