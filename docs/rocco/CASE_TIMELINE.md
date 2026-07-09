# ROCCO · Case Timeline & Knowledge Evolution

Historia completa, versionada, auditable y navegable de cada caso (ticket).
Construido **reutilizando el substrato de memoria existente** — no un almacén paralelo.

## Principio de arquitectura

ROCCO ya tenía dos sistemas de historia:

- **Flujo de eventos** (`audit_events`) — append-only, 90+ tipos de evento.
- **Snapshots de estado** (`ticket_intelligence_history`) — versión auto-incremental del análisis.

Más la **Memoria Organizacional + Knowledge Graph** (`memory_record`, `kg_node/edge`).

El Case Timeline es un **read-model de solo-lectura** que fusiona esas fuentes.
No persiste su propia copia. Todo tenant-scoped. Secretos/PII redactados en el backend.

## Endpoints (agent)

| Método · Ruta | Rol |
|---|---|
| `GET /api/tickets/:key/timeline` | Read-model unificado (audit_events + intelligence_history), más reciente primero |
| `GET /api/tickets/:key/intelligence/history` | Snapshots versionados (cap 50) para Compare Versions |
| `POST /api/tickets/:key/artifacts` · `GET …/artifacts` | Artefactos de 1ª clase (redacta + hashea + emite evento) |
| `POST /api/memory/learning` | Persiste aprendizaje del caso → Memoria Org + emite `KNOWLEDGE_UPDATED` |

Todos bajo `requirePermission("ticket_command_center", …)` salvo `/memory/learning`
(`conocimiento_rag:create`).

## Fases entregadas

- **F0** · Fundación backend-authoritative: read-model `getCaseTimeline`, util `redact.ts`, 18 tipos de evento nuevos.
- **F1** · Pestaña Case Timeline (tab shell en TCC) + UI REDL (`CaseTimeline`, iconos Lucide, estados vacío/loading/error, búsqueda + filtros).
- **F2** · Compare Versions: motor `version-diff.ts` (diff field-aware) + `CompareVersions`. Cap de historial 20→50.
- **F3** · Knowledge Evolution: `knowledge-evolution.ts` ("qué aprendimos / descartamos / riesgo ▲▼") + `KnowledgeEvolutionCard` → guarda a Memoria Org.
- **F4** · Artefactos de 1ª clase (mig 012 `case_artifacts`) + re-análisis desde el timeline.
- **F5** · Export del timeline (JSON) + esta documentación + hardening.

## Componentes (platform)

```
src/lib/timeline-icons.tsx         · resolver Lucide por tipo de evento
src/lib/version-diff.ts            · diff field-aware entre snapshots
src/lib/knowledge-evolution.ts     · narrativa de evolución del conocimiento
src/components/tickets/CaseTimeline.tsx          · feed + toolbar + alta de artefactos
src/components/tickets/CompareVersions.tsx       · diff V↔V
src/components/tickets/KnowledgeEvolutionCard.tsx · delta + guardar aprendizaje
```

## Follow-ups deliberados (no bloqueantes)

- **Hash encadenado tamper-evident** en `audit_events`: retrofit de columnas `prev_hash`/`hash`
  sobre la tabla viva de prod — merece su propia migración cuidadosa, no un cambio "de corrido".
  Los artefactos y memory_records ya llevan `content_hash`.
- **Permalinks por evento**: requiere ruta dedicada (`/tickets/[key]/timeline`).
- **Point-in-time completo**: reproyección de estado a una versión N.
- **Tickets `source="jira"`**: hoy no persisten intelligence al backend → versionado parcial.

## Diseño

100% ROCCO Enterprise Design Language (REDL): navy oscuro, IBM Blue, iconos Lucide
outline, cards minimalistas, sin emoji en producto.
