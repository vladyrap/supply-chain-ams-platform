# Manual AMS Platform · Dev / Técnico

**Audiencia:** desarrolladores que se suman al equipo, integradores, arquitectos.
**Propósito:** entender la arquitectura, dónde toca cada cosa, cómo extender el sistema sin romper nada.

## Stack

| Capa | Tecnología | Path |
|---|---|---|
| **Frontend** | Next.js 14.2 App Router + TS + Standalone build | `supply-chain-ams-platform/` |
| **Backend** | Node 20 + Fastify + TS + Anthropic SDK (usa Gemini hoy) | `supply-chain-ams-agent/backend/` |
| **Worker** | Node 20 + BullMQ (RAG indexing + transcription + cron) | `supply-chain-ams-agent/worker/` |
| **DB** | Postgres 16 + pgvector (RAG embeddings) | tabla seeds en `database/init.sql` y runtime via services |
| **Queue** | Redis 7 | — |
| **Vision/Audio** | Whisper local (opcional `--profile voice`) + Gemini Vision (futuro) | — |
| **Orquestador** | `supply-chain-ams-stack/` con `docker compose` `include:` | — |

Puertos host: backend `:6601` · platform `:6700` · db `:6602` · redis `:6603`.

## Cómo navegar la base de código

```
supply-chain-ams-platform/src/
├── app/(platform)/                  ← rutas Next.js
│   ├── tickets/page.tsx
│   ├── dashboard/page.tsx
│   └── ...
├── components/
│   ├── ui/                          ← ModalPortal, TcModalShell, KPI, Badge
│   ├── tickets/                     ← TicketCommandCenter, TicketQuickActions, NBA, Readiness
│   ├── estimation/                  ← TicketEstimateDetail, EstimateExplainabilityCard
│   ├── escalation/                  ← EscalationModal, EscalationQuickAction
│   ├── documents/                   ← DocumentFactoryCenter, DocumentFactoryQuickAction
│   ├── testing/                     ← TestScenarioFormModal, TestingQuickAction
│   ├── quality/                     ← EvaluationForm, QualityQuickAction
│   ├── knowledge/                   ← IncidentToKnowledgeWizard, KnowledgeQuickActions
│   ├── playbooks/                   ← PlaybookExecutionChecklist, PlaybookQuickAction
│   ├── audit/                       ← TicketAuditTimeline, AuditEventCard, GlobalAuditCenter
│   ├── readiness/                   ← AgentReadinessCenter, ReadinessModuleCard
│   └── demo/                        ← GuidedAmsDemo, DemoGuidedTour
├── hooks/
│   ├── useTicketAudit.ts            ← audit trail por ticket
│   ├── useDocumentFactory.ts        ← documents store + sync backend
│   ├── useTestingIntelligence.ts
│   ├── useQualityEvaluator.ts
│   ├── useEscalation.ts
│   ├── usePlaybooks.ts
│   ├── useAgentTraining.ts
│   ├── useTimeEstimator.ts
│   └── useScopeItems.ts             ← cache scope items SAP
├── services/                        ← clientes HTTP del backend
│   ├── agent.api.ts
│   ├── tickets.api.ts
│   ├── scope-items.api.ts
│   ├── escalation.api.ts
│   └── ...
├── utils/
│   ├── ams-decision-engine.ts       ← 15 acciones, 13 reglas v2
│   ├── ticket-readiness-engine.ts   ← score 0-100 por ticket
│   ├── estimate-explainability-engine.ts
│   ├── business-value-engine.ts
│   ├── agent-readiness-engine.ts    ← score por módulo SAP
│   ├── visual-error-analysis-engine.ts
│   ├── ticket-factory.ts
│   └── ticket-to-incident-adapter.ts
├── types/
│   ├── estimation.ts                ← TicketEstimatedResolution, TimeEstimate
│   ├── audit.ts                     ← TicketAuditEvent + 22 tipos
│   ├── visual-evidence.ts
│   ├── rbac.ts                      ← 25 screens, 7 actions
│   └── ...
└── styles/globals.css               ← .card (transform 3D), .tc-modal-back, etc.

supply-chain-ams-agent/backend/src/
├── controllers/                     ← ams, ticket, escalation, support, scope-items
├── services/
│   ├── claude.service.ts            ← agente Gemini con RAG
│   ├── incident.service.ts          ← incidents table + estimación auto
│   ├── ticket.service.ts            ← tickets_demo + recalc + mirror
│   ├── scope-items.service.ts       ← catálogo SAP
│   ├── escalation.service.ts
│   ├── support/                     ← Mesa de Soporte (triage, resolver)
│   └── rbac.service.ts
├── routes/                          ← Fastify routes
└── utils/
    ├── agent-meta.ts                ← agentVersion + kbVersion + mode + sources
    └── estimation.ts                ← port del engine (espejo del frontend)
```

## Patrones clave que tenés que conocer

### 1. QuickAction (orquestación de módulos)

Patrón establecido: cada módulo expone su `XQuickAction.tsx` que envuelve su modal/wizard
con un botón compacto. Se usan desde el `TicketCommandCenter` para ejecutar acciones del
módulo sin salir del ticket.

**Existentes:**
- `EscalationQuickAction`
- `KnowledgeQuickActions`
- `DocumentFactoryQuickAction`
- `TestingQuickAction`
- `QualityQuickAction`
- `PlaybookQuickAction`

### 2. ModalPortal / TcModalShell

Todos los modales deben pasar por uno de estos wrappers, no usar `position: fixed` inline.
Razón: `.card { transform + backdrop-filter }` crea un nuevo containing block que rompe `position: fixed`.

- `ModalPortal`: para modales custom (CreateTicketModal, DocumentFactoryQuickAction modal, etc.).
- `TcModalShell`: drop-in wrapper para modales que usan las clases `.tc-modal-back/.tc-modal` ya existentes.

Ambos hacen `createPortal(content, document.body)`.

### 3. Decision Engine como fuente de verdad

`utils/ams-decision-engine.ts::analyzeTicketDecision(ticket, estimate, context)` es el cerebro
de las recomendaciones. 15 acciones (`AmsRecommendedAction`), 13 reglas v2. Output incluye
`nextBestActions[]` ordenadas por peso y `reasons[]`.

Componentes que lo consumen: `TicketNextBestAction`, `TicketQuickActions` (deprecated), las cards
del Command Center.

### 4. Audit Trail por ticket

`useTicketAudit().record({ ticketId, eventType, title, ... })` registra cualquier acción
relevante. 22 tipos de evento. Vive en `localStorage` (clave `supply-chain-ams-ticket-audit-events`).
Visible en sección "Auditoría · Timeline" del Command Center y en `/audit`.

### 5. Storage convention

LocalStorage keys siempre con prefijo `supply-chain-ams-`. Ejemplos:

```
supply-chain-ams-ticket-audit-events
supply-chain-ams-time-estimates
supply-chain-ams-platform-roles
supply-chain-ams-platform-users
supply-chain-ams-documents
supply-chain-ams-playbooks
supply-chain-ams-playbook-runs
supply-chain-ams-evaluations
supply-chain-ams-scope-items-cache
```

### 6. Persistencia en DB

Tablas de Postgres relevantes:

| Tabla | Service | Notas |
|---|---|---|
| `incidents` | `incident.service.ts` | Chat del agente. Columna `estimated_resolution jsonb` + `attachments jsonb` |
| `tickets_demo` | `ticket.service.ts` | Tickets creados desde UI + mocks seedeados. Schema runtime con `ALTER ADD COLUMN IF NOT EXISTS` |
| `sap_scope_items` | `scope-items.service.ts` | 35 scope items seedeados (MM, SD, PP, EWM, QM, etc.) |
| `escalation_records` | `escalation.service.ts` | Audit + payload jsonb |
| `support_tickets` | `support/ticket.service.ts` | Mesa de Soporte con códigos MESA-XXXX |
| `platform_roles` / `platform_users` | `rbac.service.ts` | RBAC backend con backfill auto |
| `agent_knowledge` / `agent_qa` | `training.service.ts` | KB curado + Q&A |
| `refresh_tokens` / `sessions` | `auth.service.ts` | Auth con rotation |

### 7. Backend agent metadata

Cada respuesta del agente devuelve:

```typescript
metadata: {
  model: "gemini-2.5-flash-lite",
  timestamp: "2026-06-01T...",
  confidence: "alta" | "media" | "baja" | "no_detectada",
  agentVersion: "v0.1.0",          // de package.json o env
  kbVersion: "KB-2026-06-01-1430-n42",
  mode: "demo" | "real",
  responseId: "resp_xxx",          // para feedback loop
  sources: [{ id, sourceType, title, relevance, chunkIndex }],
}
```

## Tabla maestra · 36 módulos

| # | Módulo | Page route | Componente principal | Hook principal | Engine/utils | Tabla DB |
|---|---|---|---|---|---|---|
| 1 | Bienvenida | `/welcome` | inline | — | — | — |
| 2 | Dashboard | `/dashboard` | inline | varios | `business-value-engine` | varias |
| 3 | Agente AMS | `/agent` | `ChatPanel` | — | `claude.service` (BE) | `incidents` |
| 4 | Historial | `/history` | inline | `useTicketAudit` | — | `incidents` |
| 5 | Mission Control | `/mission-control` | `MissionControl` | varios | — | varias |
| 6 | Topology | `/topology` | `TopologyView` | varios | — | varias |
| 7 | TV Mode | `/tv` | `TvSlideshow` | — | — | — |
| 8 | Demo en vivo | `/demo` | `DemoModeCenter` | `useDemoMode` | — | — |
| 9 | Launchpad | `/launchpad` | `Launchpad` | — | — | — |
| 10 | Wallboard 4K | `/wallboard` | `Wallboard` | varios | — | varias |
| 11 | War Room | `/war-room` | `WarRoom3D` | — | — | — |
| 12 | Agent Brain | `/brain` | `BrainView` | — | — | — |
| 13 | Bloomberg | `/terminal` | `Terminal` | varios | — | varias |
| 14 | Arc Reactor | `/hud` | `Hud` | — | — | — |
| 15 | Forecast IA | `/forecast` | `Forecast` | — | regresión inline | `incidents` |
| 16 | Data Flow | `/flow` | `FlowView` | — | — | — |
| 17 | **Tickets ⭐** | `/tickets` | `TicketCommandCenter` | múltiples | `ams-decision-engine` + `ticket-readiness-engine` + `estimate-explainability-engine` | `tickets_demo` |
| 18 | Mesa de Soporte | `/support-desk` | `SupportDeskCenter` | `useSupport` | — | `support_tickets`, `support_conversations`, `support_messages` |
| 19 | Canal Telefónico | `/voice-calls` | `VoiceCallsCenter` | — | Twilio SDK | `voice_calls` |
| 20 | Conocimiento | `/knowledge` | `KnowledgeDocumentsCenter` | — | `knowledge.service` (BE) | `agent_knowledge_documents` + pgvector |
| 21 | Entrenamiento IA | `/knowledge/training` | `AgentTrainingCenter` | `useAgentTraining` | — | `agent_knowledge`, `agent_qa`, `training_versions`, `knowledge_gaps` |
| 22 | Playbooks AMS | `/playbooks` | `PlaybooksCenter` | `usePlaybooks` | — | localStorage `playbooks` + `playbook-runs` |
| 23 | Document Factory | `/document-factory` | `DocumentFactoryCenter` | `useDocumentFactory` | `lib/documents/templates.ts` | localStorage + sync `documents.api` |
| 24 | Quality Evaluator | `/quality-evaluator` | `QualityEvaluatorCenter` | `useQualityEvaluator` | — | localStorage `evaluations` |
| 25 | Escalamiento N2 | `/escalation-n2` | `EscalationCenter` | `useEscalation` | `escalation-engine` | `escalation_records`, `escalation_rules`, `n2_responsibles` |
| 26 | Testing Intelligence | `/testing-intelligence` | `TestingIntelligenceCenter` | `useTestingIntelligence` | `testing-engine` | localStorage + futuro `testing_*` BE |
| 27 | Estimador de Tiempos | `/time-estimator` | `TimeEstimatorCenter` | `useTimeEstimator` | `lib/estimation/engine` | localStorage |
| 28 | Tickets Jira | `/tickets` (status section) | inline | — | `ticket.service` (BE) | `tickets_demo` |
| 29 | Integraciones | `/integrations` | `IntegrationsCenter` | — | `integrations/adapters` (BE) | `integration_destinations`, `integration_deliveries` |
| 30 | SAP Read-Only | `/sap-readonly` | `SapReadOnlyCenter` | — | `sap.service` (BE) | — (proxy a SAP) |
| 31 | Reuniones AMS | `/meetings` | `MeetingsCenter` | — | Whisper + Gemini extraction | `meetings`, `meeting_minutes` |
| 32 | Agent Lab | `/agent-lab` | `AgentLabCenter` | — | `feedback.service` (BE) | `agent_feedback` |
| 33 | Ejecutivo | `/executive` | `ExecutiveCenter` | varios | — | varias |
| 34 | Valor Económico | `/business-value` | `BusinessValueFullCenter` | varios | `business-value-engine` | varias |
| 35 | Agent Readiness | `/agent-readiness` | `AgentReadinessCenter` | varios | `agent-readiness-engine` | varias |
| 36 | Audit Trail | `/audit` | `GlobalAuditCenter` | `useTicketAudit` | — | localStorage `ticket-audit-events` |
| 37 | Configuración | `/settings` | `SettingsCenter` | — | — | localStorage |
| 38 | Administración | `/admin` | `AdminCenter` | `useAccessAdmin` | `rbac` | `platform_roles`, `platform_users` |

## Patrones de extensión

### Agregar un módulo nuevo
1. `src/lib/modules.ts` — registrar (`id`, `label`, `icon`, `href`, `description`, `rolesAllowed`, `phase`)
2. `src/types/rbac.ts` — agregar `PlatformScreen` nueva
3. `src/utils/rbac.ts` — agregar permisos default por rol + nueva screen en `ALL_SCREENS`
4. `backend/src/services/rbac.service.ts` — espejar lo anterior (sino el backfill auto del backend agrega `noPerm()`)
5. `src/app/(platform)/<modulo>/page.tsx` — con AccessLockedCard según patrón
6. `src/components/<modulo>/<Modulo>Center.tsx`
7. `src/components/layout/Sidebar.tsx` SECTIONS — agregar `id` a la sección correspondiente

### Agregar un campo opcional a Ticket
1. `src/services/tickets.api.ts` — type `Ticket`
2. `backend/src/services/ticket.service.ts` — type, mapper, `ALTER TABLE ADD COLUMN IF NOT EXISTS`
3. (Opcional) `CreateTicketInput` si se setea al crear

### Agregar un Audit Event nuevo
1. `src/types/audit.ts` — agregar al type, `EVENT_LABELS`, `EVENT_ICONS`, `EVENT_COLORS`
2. Llamar `useTicketAudit().record({ eventType: "NUEVO", ... })` desde donde corresponda

## Próximos archivos de este manual

Cada uno con detalle técnico + arquitectura interna:

- [ ] `01-tickets.md` — Command Center, Decision Engine, Readiness, Explicabilidad
- [ ] `02-agente-ams.md` — claude.service, RAG, retry, provenance
- [ ] `03-backend-rbac.md` — roles, screens, backfill auto
- [ ] `04-estimation-engine.md` — autoEstimateTicketResolution, reglas, bumps, discounts
- [ ] `05-modal-portal-pattern.md` — por qué hace falta, cuándo usar ModalPortal vs TcModalShell
- [ ] ... (resto de los módulos)
