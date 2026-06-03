# AMS Specialist Agents (v0.11)

> Arquitectura interna de agentes especialistas SAP dentro de AMS Platform.
> El usuario sigue conversando con **un solo Agente AMS**; internamente, un
> orquestador enruta el caso a especialistas por módulo SAP y consolida la
> respuesta.

---

## 1. Por qué no hay múltiples bots visibles

Decisión de producto: el usuario AMS no debe elegir manualmente entre
"MM Agent / SD Agent / WM Agent". Esa elección es ruido cognitivo y rompe la
metáfora de "un único copiloto AMS".

La estrategia inversa — un único agente que **internamente** consulta
especialistas — preserva la UX y permite escalar conocimiento por módulo SAP
sin proliferar pantallas.

---

## 2. Qué es el AMS Orchestrator

Función pura del frontend (`src/intelligence/ams-orchestrator.ts`) con un único
entry point:

```ts
orchestrateAMSAnalysis(input: SpecialistAnalysisInput): OrchestratedAMSAnalysis
```

Pasos:

1. Invoca `routeToSpecialist(input)` → `SpecialistRoutingDecision`.
2. Ejecuta el especialista principal vía `runSpecialist(primary, input)`.
3. Si hay secundarios (`maxSecondaries=2`), ejecuta cada uno.
4. Consolida diagnóstico, checklist N1, missing data y criterios N2.
5. Calcula confianza global combinando confianza analista + score del router.
6. Genera Next Best Action y borrador de respuesta al cliente.
7. Marca `requiresHumanReview` si confidence es baja o el caso es ambiguo
   cross-module en ambiente productivo.

**Nunca lanza excepción al caller** — los errores se materializan como
`UNKNOWN` con `risks` poblados.

---

## 3. Qué es el Specialist Router

Función pura (`src/intelligence/specialists/specialist-router.ts`).
Reglas declarativas + scoring por señal:

| Señal | Peso |
|---|---|
| Transacción detectada (`MIGO`, `VL01N`, etc.) | 30 |
| Patrón de error (`M7\d+`, `HTTP 5\d{2}`, etc.) | 25 |
| Campo `module` declarado en el ticket | 20 |
| Objeto SAP textual (OC, pedido, factura, IDoc, etc.) | 12 |
| Keyword genérico (pricing, recepción, etc.) | 8 |

El módulo con mayor score puntual es `primarySpecialist`. Los demás que
superen score ≥35 son `secondarySpecialists` (cap 2).

### Reglas cross-module

Pueden **forzar** al primary o agregar secundarios obligados:

| Disparador | Resultado |
|---|---|
| IDoc + VL01N | primary INTEGRATIONS · secondary SD |
| MIGO + contabilización/FI | primary MM · secondary FI_CROSS |
| pricing + ABAP | primary SD · secondary ABAP_TECHNICAL |
| autorización / SU53 / rol | primary BASIS_AUTH · secondary = primary original |
| API/OData + VA01/MIGO/VL01N | primary INTEGRATIONS · secondary = primary original |

Confianza del router:

```
confidence = clamp(0..100, round(share*70 + magnitude*1))
share      = primaryScore / totalScore
magnitude  = min(30, round(primaryScore / 4))
```

`needsHumanReview = true` si confidence < 50 OR primary = UNKNOWN OR
caso ambiguo cross-module sin HIGH.

---

## 4. Qué especialistas existen

| Specialist | Archivo | Cubre |
|---|---|---|
| `MM` | `modules/mm-specialist.ts` | MIGO, MIRO, ME21N/22N/23N, liberación, OC |
| `SD` | `modules/sd-specialist.ts` | VA01-03, VL01N/02N, VF01, VK11/12, pricing |
| `WM` / `EWM` | `modules/wm-ewm-specialist.ts` | LT03/12, VL06, HU, monitor EWM (decide WM vs EWM por señales) |
| `PP_MRP` | `modules/pp-mrp-specialist.ts` | MD01/02/04, BOM, hoja de ruta, orden previsional |
| `INTEGRATIONS` | `modules/integrations-specialist.ts` | IDoc, WE02/05, BD87, CPI/PI/PO, REST/OData/RFC |
| `BASIS_AUTH` | `modules/basis-auth-specialist.ts` | SU53, ST22, SM21/37, autorizaciones, dumps, jobs |
| `ABAP_TECHNICAL` | `modules/abap-technical-specialist.ts` | Programa Z, BADI, user exit, CDS, RAP, transportes |
| `FI_CROSS` | `modules/fi-cross-specialist.ts` | OBYC/VKOA, sociedad, cuenta, centro de costo |

Cada uno expone un `SpecialistKnowledge` declarativo (`vocabulary`,
`transactions`, `sapObjects`, `commonIssues`, `requiredData`,
`n1ChecklistRules`, `n2EscalationRules`, `responseGuidelines`) consumible
desde docs, UI y auditoría.

El registry vive en `src/intelligence/specialists/index.ts`:

```ts
runSpecialist(specialist, input) → SpecialistAnalysisResult
```

---

## 5. Cómo decide el enrutamiento

Pipeline determinístico:

```
input (ticket / draft / chat)
  → buildHaystack(title + description + module + transaction + error + evidence)
  → para cada especialista:
       sum(transactionMatches * 30)
     + sum(errorPatternMatches * 25)
     + (moduleField bonus 20)
     + sum(objectMatches * 12)
     + sum(keywordMatches * 8)
  → primary = argmax(scores)
  → applyCrossModuleRules(primary, signals)   // puede sobreescribir primary
  → secondaries = top-2 con score ≥ 35 (excluyendo primary)
  → confidence = f(share, magnitude)
  → needsHumanReview = confidence<50 OR UNKNOWN OR (ambiguo cross + ¬HIGH)
```

100% reproducible sin red ni IA externa.

---

## 6. Cómo se integra con tickets

El orchestrator está cosido al **Auto Intelligence Enrichment Pipeline (AIE
v0.10)** ya existente. Cuando un ticket se enriquece:

```
runAutoEnrichmentPipeline(ticket)
  1. computeAnalysisInputHash → idempotencia
  2. analyzeTicket            (Intelligence Core — ya existía)
  3. buildN1Package           (best-effort — ya existía)
  4. Gemini classify          (opcional, timeout 30s — ya existía)
  4.5 orchestrateAMSAnalysis  ← NUEVO: especialistas SAP
  5. Construir TicketIntelligence con specialistAnalysis embebido
```

Persistencia: `tickets_demo.intelligence` jsonb (mismo flujo que AIE; el
backend NO cambia — el jsonb es opaco). Tickets `source==="jira"` siguen
guardándose en `jiraInMemoryCache` sin tocar backend.

---

## 7. Cómo se integra con TCC

Componente nuevo: `AmsSpecialistsSection` (`src/components/tickets/`).

Posición en el TCC: justo debajo del `AmsIntelligenceSummaryCard` (alto en la
jerarquía visual). Muestra:

- Especialista principal con su confianza y label
- Chips de especialistas secundarios con score individual
- Motivos del enrutamiento (texto auditable)
- Diagnóstico consolidado
- Next Best Action
- (Expand) Señales detectadas, checklist N1, missing data, criterios N2
- Borrador de respuesta al cliente
- Botón **↻ Reanalizar especialistas** que reusa `aie.reanalyze` (mismo lock
  y mismo flujo que AIE)

No se rompe ninguna sección existente.

---

## 8. Cómo se prepara para multi-model provider

`src/intelligence/providers/llm-provider-adapter.ts` expone:

```ts
selectProviderForTask(taskType, ctx) → { ideal, effective, reason, fallbackApplied }
```

Mapeo declarativo task → ideal provider:

| Task | Ideal | Realidad v0.11 |
|---|---|---|
| CLASSIFICATION | GEMINI | GEMINI |
| ESTIMATION | GEMINI | GEMINI |
| RCA | CLAUDE | fallback → GEMINI |
| CUSTOMER_RESPONSE | OPENAI | fallback → GEMINI |
| QUALITY_GATE | OPENAI | fallback → GEMINI |
| DOCUMENTATION | CLAUDE | fallback → GEMINI |
| SUMMARY | GEMINI | GEMINI |
| TECHNICAL_REASONING | CLAUDE | fallback → GEMINI |

Override de runtime: si `NEXT_PUBLIC_FORCE_MOCK_LLM=1`, devuelve `MOCK` para
todas las tareas — útil en demos sin credenciales.

**En esta versión los especialistas NO llaman al provider.** El adapter
existe para que cuando se integre Claude/OpenAI, el cableado sea cambiar 1
línea en el caller, no migrar todos los engines.

---

## 9. Por qué Gemini sigue siendo default

- Es el único provider con credenciales conectadas en el backend agent.
- Latencia y cuota bajas para clasificación rápida y alto volumen.
- Modelo gratuito Gemini 2.5 Flash; permite demos sin costo.
- Quality suficiente para los engines determinísticos actuales.

Cambiar default requiere: (a) conectar el nuevo provider en
`backend/src/services/`, (b) extender `AVAILABLE_PROVIDERS` en el adapter,
(c) ajustar `TASK_PROVIDER_PREFERENCE` si la matriz cambia.

---

## 10. Cómo se podría usar Claude / OpenAI en el futuro

Roadmap (sin commitir fechas):

1. **Backend agent** — agregar `services/claude-cloud.service.ts` y
   `services/openai.service.ts` con clientes propios y rate-limits.
2. **Endpoint** — extender `/api/agent/analyze-ticket` para aceptar
   `?provider=claude|openai|gemini` (override) y `provider=auto` (default,
   usa el adapter).
3. **Adapter** — `AVAILABLE_PROVIDERS.add("CLAUDE")` y `"OPENAI"`. La matriz
   `TASK_PROVIDER_PREFERENCE` automáticamente activa Claude para `RCA`
   y `DOCUMENTATION`, y OpenAI para `CUSTOMER_RESPONSE` y `QUALITY_GATE`.
4. **Specialists** — opcionalmente, cada especialista puede invocar al
   provider efectivo para un "second-opinion" cuando la confianza local es
   `LOW` (`if (level === "LOW") askProvider(taskType, context)`).
5. **Audit** — los eventos `AMS_SPECIALIST_*` ya están definidos y solo
   agregaríamos `provider` al metadata.

Todo sin tocar la UI: el usuario sigue viendo un solo Agente AMS.

---

## Resumen de archivos

```
src/intelligence/specialists/
  ├── types.ts                          (SA-F1)
  ├── specialist-router.ts              (SA-F2)
  ├── consolidator.ts                   (SA-F4)
  ├── index.ts                          (registry + runSpecialist)
  └── modules/
      ├── _base.ts                      (helpers comunes)
      ├── mm-specialist.ts              (SA-F3)
      ├── sd-specialist.ts
      ├── wm-ewm-specialist.ts
      ├── pp-mrp-specialist.ts
      ├── integrations-specialist.ts
      ├── basis-auth-specialist.ts
      ├── abap-technical-specialist.ts
      └── fi-cross-specialist.ts

src/intelligence/
  ├── ams-orchestrator.ts               (SA-F4 · entry point)
  └── auto-enrichment-pipeline.ts       (SA-F6 · integra orchestrator)

src/intelligence/providers/
  └── llm-provider-adapter.ts           (SA-F5)

src/components/tickets/
  └── AmsSpecialistsSection.tsx         (SA-F7)

src/types/
  ├── ticket-intelligence.ts            (SA-F6 · +specialistAnalysis)
  └── audit.ts                          (SA-F8 · +8 AMS_SPECIALIST_*)

src/hooks/
  └── useAutoEnrichment.ts              (SA-F8 · emite eventos)

docs/
  └── AMS_SPECIALIST_AGENTS.md          (este archivo, SA-F9)
```

## Audit Events nuevos (8)

| Evento | Cuándo |
|---|---|
| `AMS_SPECIALIST_ROUTING_STARTED` | Router invocado |
| `AMS_SPECIALIST_ROUTING_COMPLETED` | Router devuelve primary + secondaries |
| `AMS_SPECIALIST_ANALYSIS_STARTED` | Primer especialista arranca |
| `AMS_SPECIALIST_ANALYSIS_COMPLETED` | Primer especialista termina OK |
| `AMS_SPECIALIST_ANALYSIS_FAILED` | Especialista threw |
| `AMS_ORCHESTRATOR_ANALYSIS_COMPLETED` | Consolidación lista (emitido por hook) |
| `AMS_SPECIALIST_REANALYSIS_REQUESTED` | Botón "↻ Reanalizar especialistas" |
| `AMS_SPECIALIST_REANALYSIS_COMPLETED` | Reanálisis manual completado |
