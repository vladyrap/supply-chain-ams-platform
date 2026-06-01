# 📞 Mesa de Soporte · Manual técnico

## Arquitectura

```
Frontend /support-desk/*
   ↓
services/support.api.ts
   ↓ HTTP
backend/src/routes/support.routes.ts (~20 endpoints)
   ↓
controllers/support.controller.ts
   ↓
services/support/
  ├─ triage.service.ts       (clasificación IA, escalación criterio)
  ├─ resolver.service.ts     (KB curada → RAG → respuesta IA con ::DECISION::)
  ├─ orchestrator.service.ts (junta triage + resolver + escalación + persistencia)
  ├─ ticket.service.ts       (crea MESA-XXXX, asigna SLA)
  ├─ kb.service.ts           (CRUD de kb_articles aprobados)
  └─ conversation.service.ts (hilos + mensajes)
```

## Tablas DB

```sql
support_conversations (id, client_name, channel, status, created_at, updated_at)
support_messages (id, conversation_id, sender, content, metadata jsonb, created_at)
support_tickets (id, code "MESA-NNNN", conversation_id, title, summary, system_affected,
                 category, priority, sla_minutes, sla_due_at, assigned_role, status,
                 evidences jsonb, created_at, updated_at)
kb_articles (id, title, problem, solution, system, module, tags[],
             status "draft|approved|archived", helpful_count, created_by, approved_by,
             created_at, updated_at)
support_audit (id, conversation_id, ticket_id, event_type, actor, metadata jsonb, ts)
```

## Endpoints clave (~20)

```
POST /api/support/conversations              → crear conversación + triage automático
POST /api/support/conversations/:id/messages → enviar mensaje, dispara resolver
POST /api/support/conversations/:id/escalate → forzar escalación
GET  /api/support/conversations              → listar
GET  /api/support/conversations/:id          → detalle con mensajes
GET  /api/support/tickets                    → listar MESA-XXXX
GET  /api/support/tickets/:code              → detalle
PATCH /api/support/tickets/:code/status      → cambiar status
POST /api/support/kb                         → crear artículo KB curado
PATCH /api/support/kb/:id                    → editar
POST /api/support/kb/:id/approve             → aprobar (rol N2)
GET  /api/support/kb                         → listar (con filtro status)
GET  /api/support/kb/search?q=...            → buscar
GET  /api/support/metrics                    → KPIs (% IA, escalaciones, SLA breach)
```

## Triage IA

`backend/src/services/support/triage.service.ts::triage(input)`:

```ts
interface TriageInput {
  message: string;
  client: string;
  systemHint?: string;       // si el cliente eligió "SAP MM" en el form
}

interface TriageOutput {
  category: "incident" | "request" | "question";
  module: SapModule;
  priority: "Highest" | "High" | "Medium" | "Low";
  urgency: "Immediate" | "Urgent" | "Normal";
  shouldEscalate: boolean;
  reason: string;
  confidence: "alta" | "media" | "baja";
}
```

Implementado con Gemini JSON output (response_mime_type: "application/json")
y schema validation. Si la respuesta no parsea, fallback a defaults.

## Resolver IA

`backend/src/services/support/resolver.service.ts::resolve(input)`:

1. Busca KB curada con full-text search en `kb_articles` filtrando por
   sistema/módulo/tags.
2. Si hay match con score > 0.7, devuelve la solución directa.
3. Si no, llama Gemini con contexto RAG (top 6 chunks de `agent_knowledge_documents`).
4. Espera respuesta con marcador `::DECISION:: { resolved, needs_more_info, should_escalate, kb_article_id }`.

```ts
interface ResolveOutput {
  response: string;
  decision: {
    resolved: boolean;
    needs_more_info: boolean;
    should_escalate: boolean;
    kb_article_id?: string;
  };
  sources: AgentResponseSource[];
}
```

## Orchestrator

`backend/src/services/support/orchestrator.service.ts`:

```ts
async function handleNewMessage(conversationId, message) {
  // 1. Persist message
  // 2. Run triage (si es primer mensaje)
  // 3. Run resolver
  // 4. Si decision.should_escalate → crear ticket N2 + audit
  // 5. Si decision.resolved → cerrar conversación + audit
  // 6. Si decision.needs_more_info → pedir datos al cliente
  // 7. Persist response
  // 8. Emit events (integrations)
}
```

## Frontend

Hooks: `useSupport()`, `useSupportKb()`.

Components principales:
- `src/components/support/SupportDeskCenter.tsx`
- `src/components/support/ConversationList.tsx`
- `src/components/support/MessageThread.tsx`
- `src/components/support/SupportTicketsList.tsx`
- `src/components/support/KbCuratedList.tsx`

## Gotchas

- KB curada vs RAG documental: NO confundir. El resolver consulta primero KB.
- `support_tickets.code` (MESA-NNNN) NO es el mismo que `tickets_demo.key` (AMS-NNN).
- El triage es JSON output — si Gemini devuelve algo no parseable cae a defaults silenciosamente. Revisar logs.
- El SLA está hardcoded por priority (no por contrato). Para customizar, agregar tabla `client_sla_overrides`.

## Roadmap

- Twilio Voice integration real (hoy modo demo).
- SLA dinámico por contrato cliente.
- Métricas históricas con time-series (hoy son agregadas).
