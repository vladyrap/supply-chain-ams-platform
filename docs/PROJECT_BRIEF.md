# PROJECT_BRIEF — Supply Chain AMS (platform + agent)

> Dossier técnico exhaustivo del sistema, pensado para subirse a un **ChatGPT
> Project** como archivo de contexto. Cubre los dos repos centrales que
> componen el producto: `supply-chain-ams-platform` (frontend Next.js) y
> `supply-chain-ams-agent` (backend Fastify + Gemini).
>
> Última actualización: **2026-06-02 · v0.8.1**
> Mantenedor: Vladimir Matta (Chile, Windows + Git Bash)

---

## Índice

1. [Identidad del producto](#1-identidad-del-producto)
2. [Arquitectura general](#2-arquitectura-general)
3. [Stack técnico](#3-stack-técnico)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Catálogo de 37 módulos](#5-catálogo-de-37-módulos)
6. [RBAC — 26 screens, 7 actions, 5 roles](#6-rbac--26-screens-7-actions-5-roles)
7. [Hooks de la platform (23)](#7-hooks-de-la-platform)
8. [Services / API clients (23)](#8-services--api-clients)
9. [Type definitions](#9-type-definitions)
10. [Contexts globales](#10-contexts-globales)
11. [Engines de inteligencia](#11-engines-de-inteligencia)
12. [Páginas Next.js (49 routes)](#12-páginas-nextjs)
13. [Backend — endpoints del agent](#13-backend--endpoints-del-agent)
14. [Persistencia](#14-persistencia)
15. [Audit logs](#15-audit-logs)
16. [Variables de entorno](#16-variables-de-entorno)
17. [Docker y puertos](#17-docker-y-puertos)
18. [Comandos comunes](#18-comandos-comunes)
19. [Patrones de código](#19-patrones-de-código)
20. [Decisiones técnicas](#20-decisiones-técnicas)
21. [Roadmap y pendientes](#21-roadmap-y-pendientes)
22. [Anti-patterns / qué NO hacer](#22-anti-patterns--qué-no-hacer)
23. [Glosario AMS / SAP](#23-glosario-ams--sap)

---

## 1. Identidad del producto

**Supply Chain AMS Platform** es una plataforma SaaS multi-módulo para
industrializar el servicio AMS (Application Management Services) de SAP
Supply Chain. Reemplaza la mesa de soporte tradicional con un **agente IA
Nivel 1** + flujo de **escalamiento humano N2** + gobierno de IA +
generación documental + testing intelligent.

**Audiencia objetivo:**
- Consultoras SAP que venden AMS a clientes finales.
- Equipos AMS internos de empresas que quieren racionalizar soporte.
- Líderes de servicio que necesitan trazabilidad y métricas.

**Propuesta de valor:**
- Agente conversacional con RAG sobre documentación del cliente.
- Estimador de tiempos contextual con calibración (estimado vs real).
- Quality Evaluator de cada respuesta del agente.
- Escalamiento N2 con matching automático de especialista.
- Document Factory: RCA, minutas, specs, manuales, hypercare, cutover.
- Customer Response Intelligence con quality gate (no promesas vacías,
  no culpar al cliente, no lenguaje absoluto).
- Knowledge Auto-Curation: detecta casos brillantes y los propone como KB.
- Testing Intelligence con grabación de pantalla + scripts SAP.
- Mission Control wallboard 4K para presentación a cliente.

**No es:** un reemplazo de Jira/ServiceNow. **Convive** con ellos (puede
mirror tickets de Jira si hay credenciales, sino usa mock).

**Datos del cliente quedan en su VPS.** No hay multi-tenant compartido.

---

## 2. Arquitectura general

```
                            INTERNET
                                │
                          ┌─────┴──────┐
                          │  Caddy/    │  HTTPS reverse proxy
                          │  Nginx     │  (futuro: VPS de cliente)
                          └─────┬──────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
       ┌────▼─────┐       ┌─────▼─────┐       ┌─────▼──────┐
       │ Platform │ ←───→ │   Agent   │ ←───→ │ PostgreSQL │
       │ Next.js  │  REST │  Fastify  │       │  pgvector  │
       │  :6700   │       │  :6601    │       │  :6602     │
       └──────────┘       └─────┬─────┘       └────────────┘
                                │
                ┌───────────────┼──────────────────┐
                │               │                  │
           ┌────▼────┐    ┌─────▼─────┐      ┌─────▼─────┐
           │  Redis  │    │  Whisper  │      │   Gemini   │
           │  :6603  │    │  ASR      │      │ 2.5 Flash  │
           │ BullMQ  │    │  :6611    │      │ (Google)   │
           └─────────┘    └───────────┘      └────────────┘
```

**Repos centrales:**

| Repo | Path | Rol |
|------|------|-----|
| `supply-chain-ams-platform` | `~/Desktop/supply-chain-ams-platform` | Frontend Next.js 14 App Router |
| `supply-chain-ams-agent` | `~/Desktop/supply-chain-ams-agent` | Backend Fastify + Gemini |

**Comunicación:**
- Frontend → Backend: REST HTTP en `NEXT_PUBLIC_AGENT_API_URL`
  (default `http://localhost:6601`).
- Cookie-based session (autenticación legacy). RBAC adicional en localStorage
  del frontend.
- Backend → Gemini: Google Generative AI SDK (`@google/genai 0.7.0`).
- Backend → Whisper: HTTP local (ASR self-hosted).

**Persistencia dual:**
- Backend: PostgreSQL 16 + pgvector (knowledge embeddings, audit, users,
  meetings, tickets si los hay).
- Frontend: localStorage para módulos cuya persistencia backend aún es
  opcional (RBAC override, customer responses, knowledge curation,
  contextual estimations, sidebar prefs, demo mode).

---

## 3. Stack técnico

### Platform (`supply-chain-ams-platform`)

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Next.js (App Router) | `14.2.15` |
| Runtime | React | `18.3.1` |
| TypeScript | strict mode | `5.6.3` |
| Estilos | CSS global puro (`src/styles/globals.css`) + inline styles | — |
| 3D / canvas | three.js | `^0.169.0` |
| Markdown | react-markdown + remark-gfm | `9.0.1` / `4.0.0` |
| Error tracking | @sentry/nextjs | `^7.120.4` |
| Tests | No hay framework — solo smoke scripts en `scripts/` | — |
| Node | 20 alpine | — |

**Scripts npm:**
```json
"dev":       "next dev -p 3000"
"build":     "next build"
"start":     "next start -p 3000"
"lint":      "next lint"
"typecheck": "tsc --noEmit"
```

### Agent (`supply-chain-ams-agent`)

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Fastify | `4.28.1` |
| LLM SDK | @google/genai (Gemini) | `0.7.0` |
| DB driver | pg (PostgreSQL) | `8.13.1` |
| Queue | BullMQ + ioredis | `5.21.2` / `5.4.1` |
| Logger | Pino | `9.5.0` |
| Auth | bcryptjs | `2.4.3` |
| Observability | @sentry/node + prom-client | `7.120.4` / `15.1.3` |
| CORS / multipart | @fastify/cors, @fastify/multipart, @fastify/formbody | — |
| Embeddings | gemini-embedding-001 (768 dims) | — |

**Scripts:**
```bash
npm run build      # tsc → dist/
npm run dev        # tsx watch
npm run start      # node dist/index.js
npm run typecheck  # tsc --noEmit
```

---

## 4. Estructura de carpetas

### Platform

```
supply-chain-ams-platform/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (platform)/            # Group con layout principal (sidebar + header)
│   │   │   ├── layout.tsx         # PlatformLayout (Sidebar + Header + FX)
│   │   │   ├── welcome/page.tsx   # Landing /welcome
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── agent/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── tickets/page.tsx
│   │   │   ├── ...                # 37 módulos (ver §5)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── page.tsx               # / redirect a /welcome
│   │   └── layout.tsx             # RootLayout (providers)
│   ├── components/
│   │   ├── layout/                # Sidebar, Header, CommandPalette
│   │   ├── admin/                 # RBAC: RequirePermission, AdminAccessPanel, ...
│   │   ├── tickets/               # TicketCommandCenter + 7 subcomponentes
│   │   ├── quality/               # QualityEvaluatorCenter + QualityEvaluationsCard
│   │   ├── escalation/            # EscalationCenter + N2IntelligenceCard
│   │   ├── documents/             # DocumentFactoryCenter
│   │   ├── testing/               # TestingIntelligenceCenter
│   │   ├── playbooks/             # PlaybooksCenter
│   │   ├── training/              # TrainingCenter
│   │   ├── customer-response/     # GenerateResponseModal, QualityGateReport, ResponseHistoryList
│   │   ├── knowledge/             # KnowledgeCurationCard + QuickActions
│   │   ├── estimation/            # TimeEstimatorCenter, ContextualEstimationView
│   │   ├── dashboard/             # KPI tiles, BusinessValueFullCenter
│   │   ├── readiness/             # AgentReadinessCenter
│   │   ├── audit/                 # GlobalAuditCenter, TicketAuditTimeline
│   │   ├── demo/                  # GuidedAmsDemo (portal)
│   │   ├── fx/                    # AuroraBackground, GlobalParallax, BrandSplash
│   │   ├── jarvis/                # Jaimito, TourController
│   │   ├── agent/                 # MessageList, MarkdownView
│   │   ├── ui/                    # ModalPortal, Badge, KPI, Charts
│   │   └── charts/                # Donut, Gauge, Heatmap, StackedLine
│   ├── context/                   # 4 React contexts (ver §10)
│   ├── hooks/                     # 23 hooks (ver §7)
│   ├── services/                  # 23 API clients (ver §8)
│   ├── intelligence/              # 7 engines determinísticos sin LLM (ver §11)
│   ├── utils/                     # 19 utilidades (engines + helpers)
│   ├── lib/                       # modules.ts, commands.ts, roles.ts, rbac-audit.ts, sentry.ts, sounds.ts, demo/*, training/*, testing/*, playbooks/*, escalation/*
│   ├── types/                     # 12 type files
│   ├── data/                      # ams-estimation-history.ts (30 casos)
│   └── styles/globals.css         # CSS único de la app
├── docs/                          # Markdown docs (este archivo + access-control, manual, etc)
├── scripts/                       # smoke-test-*.ts (ejecutables con tsx)
├── public/                        # Assets estáticos
├── package.json
├── Dockerfile                     # multi-stage build → standalone server.js
├── docker-compose.yml             # Service: platform :6700
├── next.config.js
├── tsconfig.json
└── .env.example                   # solo NEXT_PUBLIC_AGENT_API_URL + NODE_ENV
```

### Agent

```
supply-chain-ams-agent/
├── backend/
│   ├── src/
│   │   ├── index.ts               # entrypoint (PORT default 8000)
│   │   ├── server.ts              # Fastify setup + rutas + middleware
│   │   ├── routes/                # 24 archivos (ams, knowledge, auth, tickets, sap, ...)
│   │   ├── controllers/           # Handlers de cada ruta
│   │   ├── services/              # 54 servicios (Gemini, RAG, Jira, ServiceNow, Twilio, ...)
│   │   ├── database/db.ts         # pg pool
│   │   ├── types/
│   │   └── utils/                 # logger.ts, sentry.ts, metrics.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                 # Node 20 alpine multi-stage
├── database/init.sql              # 10 tablas + pgvector + indices ivfflat
├── prompts/                       # Templates RAG + agent (read-only volume)
├── docker-compose.yml             # 9 servicios: backend, frontend, db, redis, whisper, ES, kibana, logstash, prom, grafana
└── .env.example                   # ~140 líneas con todas las env vars
```

---

## 5. Catálogo de 37 módulos

Fuente única: `src/lib/modules.ts → MODULES`. Cada `ModuleDef` declara:
- `id`, `label`, `icon`, `href`, `description`, `status`, `phase`
- `rolesAllowed` — Role legacy (fallback)
- `permissionKey` — `PlatformScreen` RBAC (**fuente de verdad** desde v0.8.0)
- `group` — `ModuleGroup` para el sidebar
- `public?: boolean` — bypass de RBAC sólo para Welcome

Grupos del sidebar (en orden):

### 5.1 Operación

| id | label | href | permissionKey |
|----|-------|------|---------------|
| `welcome` | Bienvenida | `/welcome` | `dashboard` (public) |
| `dashboard` | Dashboard | `/dashboard` | `dashboard` |
| `agent` | Agente AMS | `/agent` | `agente_ams` |
| `history` | Historial | `/history` | `incidentes` |
| `mission-control` | Mission Control | `/mission-control` | `reportes` |
| `topology` | Topology | `/topology` | `reportes` |
| `tv` | TV Mode | `/tv` | `reportes` |
| `demo` | Demo en vivo | `/demo` | `reportes` |

### 5.2 Visualizaciones (todas requieren `reportes`)

| id | label | href |
|----|-------|------|
| `launchpad` | Launchpad | `/launchpad` |
| `wallboard` | Wallboard 4K | `/wallboard` |
| `war-room` | War Room | `/war-room` |
| `brain` | Agent Brain | `/brain` |
| `terminal` | Bloomberg | `/terminal` |
| `hud` | Arc Reactor | `/hud` |
| `forecast` | Forecast IA | `/forecast` |
| `flow` | Data Flow | `/flow` |

### 5.3 AMS avanzado

| id | label | href | permissionKey |
|----|-------|------|---------------|
| `tickets` | Tickets | `/tickets` | `ticket_command_center` |
| `support-desk` | Mesa de Soporte | `/support-desk` | `servicios` |
| `voice-calls` | Canal Telefónico | `/voice-calls` | `canal_telefonico` |
| `knowledge` | Conocimiento | `/knowledge` | `conocimiento_rag` |
| `agent-training` | Entrenamiento IA | `/knowledge/training` | `entrenamiento_ia` |
| `playbooks` | Playbooks AMS | `/playbooks` | `playbooks_ams` |
| `document-factory` | Document Factory | `/document-factory` | `document_factory` |
| `quality-evaluator` | Quality Evaluator | `/quality-evaluator` | `quality_evaluator` |
| `escalation-n2` | Escalamiento N2 | `/escalation-n2` | `escalamiento_n2` |
| `testing-intelligence` | Testing Intelligence | `/testing-intelligence` | `testing_intelligence` |
| `time-estimator` | Estimador de Tiempos | `/time-estimator` | `time_estimator` |
| `agent-lab` | Agent Lab | `/agent-lab` | `agente_ams` |
| `integrations` | Integraciones | `/integrations` | `integraciones` |
| `sap-readonly` | SAP Read-Only | `/sap-readonly` | `modulos_sap` |
| `meetings` | Reuniones AMS | `/meetings` | `servicios` |

### 5.4 Sistema

| id | label | href | permissionKey |
|----|-------|------|---------------|
| `executive` | Ejecutivo | `/executive` | `reportes` |
| `business-value` | Valor Económico | `/business-value` | `business_value_dashboard` |
| `agent-readiness` | Agent Readiness | `/agent-readiness` | `agent_readiness` |
| `audit` | Audit Trail | `/audit` | `audit_trail` |
| `settings` | Configuración | `/settings` | `configuracion` |
| `admin` | Administración | `/admin` | `administracion` |

---

## 6. RBAC — 26 screens, 7 actions, 5 roles

Fuente: `src/types/rbac.ts` + `src/utils/rbac.ts` + `src/hooks/usePermissions.ts`.

### 6.1 Acciones (`PermissionAction`)

`view` · `create` · `edit` · `delete` · `export` · `configure` · `approve`

### 6.2 Pantallas (`PlatformScreen` — 26)

```
dashboard · agente_ams · incidentes · modulos_sap · servicios · reportes
auditoria · administracion · configuracion · canal_telefonico
conocimiento_rag · integraciones · usuarios · roles · entrenamiento_ia
playbooks_ams · document_factory · quality_evaluator · escalamiento_n2
testing_intelligence · time_estimator · ticket_command_center · audit_trail
global_search · agent_readiness · business_value_dashboard
```

### 6.3 Roles iniciales (`buildDefaultRoles`)

| Code | Nombre | Resumen |
|------|--------|---------|
| `ADMIN` | Administrador | Acceso total. Gestión de usuarios y roles |
| `SERVICE_LEAD` | Líder Servicio | Aprueba, exporta, supervisa. Sin gestión de users |
| `AMS_CONSULTANT` | Consultor AMS | Atiende consultas. Sin administrar roles |
| `CLIENT_USER` | Usuario Cliente | Cliente final. Ve sus propios incidentes |
| `GENERAL_USER` | Usuario General | Acceso básico. Solo agente + dashboard |

Todos `isSystem: true`. Custom roles se crean desde `/admin → Roles` con
`isSystem: false`.

### 6.4 Mapeo Role legacy ↔ RBAC

| Legacy `Role` | `roleCode` RBAC |
|---------------|------------------|
| `viewer` | `GENERAL_USER` |
| `consultor` | `AMS_CONSULTANT` |
| `aprobador` | `SERVICE_LEAD` |
| `admin` | `ADMIN` |

### 6.5 Enforcement de 3 niveles (v0.8.0+)

1. **Sidebar** → `MODULES.filter(canSeeModule)`. Sin permiso → módulo
   oculto. Grupos vacíos se ocultan también.
2. **Ruta** → `<RequirePermission screen="..." action="...">` muestra
   `AccessLockedCard` + emite evento `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`.
3. **Acciones internas** → `const { can } = usePermissions()` + render
   condicional: `{can("escalamiento_n2", "approve") && <button>}`.

**Fail-closed:** módulo sin `permissionKey` Y `public !== true` → oculto.

### 6.6 Persistencia RBAC (localStorage)

| Key | Contenido |
|-----|-----------|
| `supply-chain-ams-platform-roles` | `PlatformRole[]` |
| `supply-chain-ams-platform-users` | `PlatformUser[]` |
| `supply-chain-ams-platform-current-user` | id user simulado (o vacío) |
| `supply-chain-ams-rbac-audit-events` | log de eventos RBAC (cap 500) |

Cambios disparan `CustomEvent("ams-rbac-changed")` para re-render
sincronizado en el mismo tab.

---

## 7. Hooks de la platform

Ubicación: `src/hooks/*.ts`. Patrón estándar: cada hook tiene su `EVT`
custom + `storage event listener` + hidratación opcional desde backend.

| Hook | Storage key | Propósito |
|------|-------------|-----------|
| `useAuth` (context) | cookie + `users` API | Sesión backend |
| `useAccessAdmin` | `…-roles`, `…-users`, `…-current-user` | CRUD RBAC + emite audit events |
| `usePermissions` | (lee de useAccessAdmin) | API única: `can / canAny / canAll / canSeeModule / visibleModules` |
| `usePlatform` (context) | local | Cliente activo + ambiente + role legacy |
| `useAgentTraining` | `…-training-knowledge`, `…-versions`, `…-gaps` | KB items + versiones + brechas |
| `useContextualEstimations` | `…-contextual-estimations` | Histórico del motor v2 contextual |
| `useCustomerResponses` | `…-customer-responses` | Respuestas generadas por ticket |
| `useDemoMode` | `…-demo-mode` | Estado del modo demo cliente |
| `useDocumentFactory` | `…-documents` | Documentos generados (RCA, minutas, etc) |
| `useEscalation` | `…-escalations` | Reglas + responsibles + records N2 |
| `useEventSounds` | local | Toggle de sonidos UI |
| `useKnowledgeConversion` | `…-knowledge-conversions` | Conversiones de incidentes a KB |
| `useKnowledgeCuration` | `…-curation-candidates` | Candidatos a publicar como KB (auto) |
| `useMagnetic` | DOM ref | Efecto magnético en botones |
| `usePlaybooks` | `…-playbooks`, `…-playbook-executions` | Playbooks + checklists en vivo |
| `useQualityEvaluator` | `…-evaluations` | Evaluaciones del agente + `cleanupQualityEvaluatorDemoData()` (v0.8.1) |
| `useScopeItems` | TTL cache 5min | Scope items SAP cargados del backend |
| `useScreenRecorder` | DOM API | Grabación de pantalla para Testing Intelligence |
| `useSidebarBadges` | computed | Badges numéricos en el sidebar |
| `useSidebarPrefs` | `…-sidebar-prefs` | Favoritos + secciones colapsadas |
| `useSpeechRecognition` | Web Speech API | STT en /agent/voice |
| `useSpeechSynthesis` | Web Speech API | TTS en /agent/voice |
| `useTestingIntelligence` | `…-testing-scenarios`, `…-evidences` | Casos de prueba + evidencias |
| `useTicketAudit` | `…-ticket-audit-events` (cap 1000) | Timeline cross-ticket |
| `useTimeEstimator` | local | Motor de estimación clásico |

---

## 8. Services / API clients

Ubicación: `src/services/*.api.ts`. Convención: cada service exporta funciones
async que devuelven `{ success: true, ... } | { success: false, error: string }`.

Base URL: `process.env.NEXT_PUBLIC_AGENT_API_URL` (default `http://localhost:6601`).

| Service | Endpoints clave | Propósito |
|---------|-----------------|-----------|
| `agent.api.ts` | `/api/ams/chat`, `/incidents`, `/audit`, `/stats` | Chat con agente, listado de incidentes |
| `agent-lab.api.ts` | `/api/agent-lab/{feedback\|playground\|wizard}` | Agent Lab (replay, debug, feedback) |
| `ams-modules.api.ts` | `/api/playbooks/*`, `/api/documents/*`, `/api/quality/*` | Tres módulos en un solo client |
| `auth.api.ts` | `/api/auth/{signup\|login\|logout\|refresh\|me\|sessions}` | Sesión backend |
| `customer-responses.api.ts` | `/api/customer-responses/*` | Persistencia respuestas cliente |
| `dashboard.api.ts` | `/api/dashboard/{advanced\|executive\|usage}` | KPIs |
| `escalation.api.ts` | `/api/escalation/{snapshot\|rules\|responsibles\|records}` | Escalamiento N2 |
| `eval.api.ts` | `/api/admin/eval/*` | Evaluación A/B del agente |
| `graph.api.ts` | `/api/graph` | Knowledge graph |
| `integrations.api.ts` | `/api/integrations/{destinations\|deliveries}` | Webhooks salientes (Slack, Email, Jira) |
| `knowledge.api.ts` | `/api/knowledge/{ingest\|search\|documents\|overview}` | RAG + KB |
| `meetings.api.ts` | `/api/meetings/{upload\|list}` | Reuniones + Whisper |
| `rbac.api.ts` | `/api/rbac/{snapshot\|roles\|users}` | Sync RBAC con backend |
| `sap.api.ts` | `/api/sap/*` | Read-only SAP (mock o real) |
| `sap-inbound.api.ts` | `/api/sap/inbound/{idoc\|short-dump\|...\|tokens}` | Webhooks de SAP entrantes |
| `scope-items.api.ts` | `/api/scope-items/*` | Catálogo SAP Best Practices |
| `search.api.ts` | `/api/search/global` | Global Intelligence Search |
| `stats.api.ts` | `/api/stats/*` | Métricas agregadas |
| `support.api.ts` | `/api/support/{triage\|resolve\|orchestrator}` | Mesa de Soporte IA N1 |
| `testing.api.ts` | `/api/testing/*` | Testing Intelligence (scripts + evidencias) |
| `tickets.api.ts` | `/api/tickets/*` (`list`, `create`, `classify`, `recalculate`, `adjust`, `close`, `replaceEstimateFull`) | CRUD tickets + Jira mirror |
| `training.api.ts` | `/api/training/*` | Pipeline de entrenamiento del agente |
| `voice.api.ts` | `/api/voice/*` | Canal telefónico Twilio |

---

## 9. Type definitions

Ubicación: `src/types/`. Resumen de tipos más usados:

### `index.ts` — core
- `Role` legacy = `"viewer" | "consultor" | "aprobador" | "admin"`
- `AuthUser { id, email, name, role, active, created_at }`
- `Environment = "NO_INFORMADO" | "DEV" | "QA" | "PRD" | "SANDBOX"`
- `SapModule = "MM" | "SD" | "PP" | "WM" | "EWM" | "QM" | "PM" | "ARIBA" | "IBP" | "BTP" | "INTEGRACION" | "NO_INFORMADO"`
- `ModuleDef` (catálogo): `id, label, icon, href, description, status, phase, rolesAllowed, permissionKey?, group?, public?`
- `ModuleGroup = "operacion" | "visualizaciones" | "ams_avanzado" | "sistema"`
- `ChatMessage`, `AgentChatRequest`, `AgentChatResponse`,
  `AgentResponseMetadata { model, timestamp, confidence, agentVersion?, kbVersion?, mode?, responseId?, sources? }`

### `rbac.ts` — RBAC
- `PermissionAction` (7 acciones)
- `PlatformScreen` (26 screens)
- `RolePermission { view, create, edit, delete, export, configure, approve }`
- `RolePermissionMap = Record<PlatformScreen, RolePermission>`
- `PlatformRole { id, name, code, description, isSystem, permissions, createdAt, updatedAt }`
- `PlatformUser { id, name, email, roleCode, serviceLevel, status, createdAt }`
- `ServiceLevel = "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE"`

### `audit.ts` — Ticket Audit Trail (39 event types)
Incluye: `TICKET_CREATED`, `AUTO_ESTIMATE_GENERATED`, `ESTIMATE_RECALCULATED`,
`MANUAL_ADJUSTMENT`, `TICKET_CLASSIFIED`, `AGENT_RESPONSE_GENERATED`,
`KNOWLEDGE_MATCHED`, `SCOPE_ITEM_MATCHED`, `PLAYBOOK_RECOMMENDED`,
`N2_ESCALATION_*`, `JIRA_DEMO_CREATED`, `SERVICENOW_DEMO_CREATED`,
`DOCUMENT_GENERATED`, `TEST_CASE_CREATED`, `QUALITY_EVALUATED`,
`CONVERTED_TO_KNOWLEDGE`, `STATUS_CHANGED`, `COMMENT_ADDED`,
`VISUAL_EVIDENCE_*`, `DEMO_*`, `CUSTOMER_RESPONSE_*`,
`N2_INTELLIGENCE_*`, `KB_CURATION_*`.

### `customer-response.ts`
- `CustomerResponseType = "ACKNOWLEDGEMENT" | "STATUS_UPDATE" | "REQUEST_MORE_INFO" | "CLOSURE" | "EXPLANATION" | "PROPOSAL"`
- `CustomerResponseStatus = "DRAFT" | "REVIEWED" | "APPROVED" | "BLOCKED" | "SENT_MANUAL" | "ARCHIVED"`
- `CustomerResponse { responseId, ticketKey, responseType, audience, status, qualityGate, ... }`
- `QualityGateReport { score (0-100), issues [], requiresHumanReview }`
- 12 reglas de quality gate (no promesas, no culpar cliente, no lenguaje absoluto, etc).

### `estimation.ts`
- `ContextualEstimationInput`, `ContextualEstimationResult`
- `TicketEstimate { totalMinHours, totalMaxHours, confidence, phaseBreakdown, ... }`

### `escalation.ts`
- `N2Responsible`, `EscalationRule`, `EscalationRecord`

### `n2-escalation-intelligence.ts`
- `EscalationVerdict = "ESCALATE_NOW" | "ESCALATE_SOON" | "WAIT_AND_SEE" | "RESOLVE_AT_N1" | "INSUFFICIENT_DATA"`
- `N2EscalationAnalysis` con `verdict`, `confidenceScore`, `urgencyScore`,
  `pushEscalate[]`, `pushStay[]`, `specialistRecommendations[]`,
  `slaRecommendation`, `playbookRecommendation`.

### `knowledge-curation.ts`
- `CurationCandidate { brilliantScore (0-100), scoreFactors, proposedKbTitle, ... }`
- `CurationStatus = "PROPOSED" | "REVIEWED" | "APPROVED" | "REJECTED" | "PUBLISHED"`

### `testing.ts`, `training.ts`, `visual-evidence.ts`, `ams-modules.ts`
Tipos específicos de cada módulo (ver archivos).

---

## 10. Contexts globales

| Context | Path | Propósito |
|---------|------|-----------|
| `AuthContext` | `src/context/AuthContext.tsx` | Sesión backend (`user, loading, refresh, logout`). Cookie-based. |
| `PlatformContext` | `src/context/PlatformContext.tsx` | Cliente activo + ambiente + role legacy (para mocks/demos). |
| `ToastContext` | `src/context/ToastContext.tsx` | Toasts globales. |
| `CommandPaletteContext` | `src/context/CommandPaletteContext.tsx` | Apertura programática del Cmd+K. |

Tree de providers en `src/app/layout.tsx`:
```
ToastProvider
  └─ AuthProvider
       └─ PlatformProvider
            └─ CommandPaletteProvider
                 └─ {children}
```

---

## 11. Engines de inteligencia

Determinísticos, **sin LLM**. Pensados para corren en el frontend con
datos locales.

### `src/intelligence/`

| Engine | Función principal |
|--------|-------------------|
| `customer-response-engine.ts` | `generateCustomerResponse(context, type)` → respuesta + quality gate |
| `customer-response-blocks.ts` | Bloques modulares (acknowledgement, status, etc) |
| `customer-response-templates.ts` | Templates por tipo de respuesta |
| `customer-response-quality-gate.ts` | 12 reglas (no promesas, no absolutos, no culpar) |
| `customer-response-jira-export.ts` | Convierte respuesta → Jira comment + ServiceNow worknote |
| `knowledge-curation-engine.ts` | `analyzeCurationCandidate(input)` → propone KB con score 0-100 |
| `n2-escalation-intelligence-engine.ts` | `analyzeN2Escalation(input)` → verdict + specialist match + SLA |

### `src/utils/` (engines)

| Engine | Función principal |
|--------|-------------------|
| `ams-decision-engine.ts` | Decisión central: 18 acciones recomendadas (`AmsRecommendedAction`) |
| `time-estimation-engine.ts` | Motor clásico de estimación por fases |
| `contextual-ams-estimation-engine.ts` | Motor v2 contextual: histórico + ajustes |
| `estimate-explainability-engine.ts` | Explica qué factores subieron/bajaron la ETA |
| `historical-cases-matcher.ts` | Matching de tickets parecidos por keywords + módulo |
| `sap-context-detector.ts` | Detecta contexto SAP en texto libre (transacción, módulo, tabla) |
| `visual-error-analysis-engine.ts` | Procesa OCR de screenshots SAP |
| `ticket-readiness-engine.ts` | Score 0-100 de "qué le falta al ticket para ser resoluble" |
| `agent-readiness-engine.ts` | Score 0-100 de cobertura del agente por módulo SAP |
| `business-value-engine.ts` | Calcula USD evitado + horas ahorradas |
| `escalation-engine.ts` | Matching de N2Responsible vs ticket |
| `testing-engine.ts` | Gen de test scripts con pasos SAP |
| `ticket-factory.ts` | Constructor de tickets demo con datos consistentes |
| `ticket-to-incident-adapter.ts` | Convierte Ticket → IncidentSummary (para QuickActions) |
| `contextual-to-ticket-estimate.ts` | Convierte resultado contextual → TicketEstimate |
| `contextual-export.ts` | Markdown export del análisis contextual |
| `quality-evaluator-helpers.ts` | `getQualityEvaluatorSummary`, `getVisibleQualityEvaluations`, `dedupeQualityEvaluations` (v0.8.1) |
| `permissions.ts` | (DEPRECATED) thin adapter — usar `moduleScreen` de modules.ts |
| `rbac.ts` | `hasPermission`, `buildDefaultRoles`, `buildDefaultUsers`, `legacyRoleToCode`, `migrateRolesAddingMissingScreens` |

---

## 12. Páginas Next.js

49 routes en `src/app/`. Layout principal en `src/app/(platform)/layout.tsx`
agrupa todas con sidebar + header.

**Públicas** (sin `(platform)` group):
- `/` → redirect a `/welcome`
- `/login`
- `/signup`

**Platform** (todas dentro de `(platform)/`):
- `/welcome` · `/dashboard` · `/agent` · `/agent/think` · `/agent/voice`
- `/history` · `/tickets` · `/mission-control` · `/topology` · `/tv`
- `/demo` · `/launchpad` · `/wallboard` · `/war-room` · `/brain`
- `/terminal` · `/hud` · `/forecast` · `/flow`
- `/support-desk` · `/support-desk/conversations` · `/support-desk/kanban`
- `/support-desk/kb` · `/support-desk/simulator` · `/support-desk/tickets`
- `/voice-calls` · `/voice-calls/[sid]`
- `/knowledge` · `/knowledge/training` · `/knowledge/graph`
- `/playbooks` · `/document-factory` · `/quality-evaluator`
- `/escalation-n2` · `/testing-intelligence` · `/time-estimator`
- `/integrations` · `/integrations/sap-inbound` · `/sap-readonly`
- `/meetings` · `/agent-lab` · `/executive` · `/business-value`
- `/agent-readiness` · `/audit` · `/settings`
- `/admin` · `/admin/eval`

**Patrón de página protegida (v0.8.0+):**
```tsx
"use client";
import RequirePermission from "@/components/admin/RequirePermission";
import FooCenter from "@/components/foo/FooCenter";

export default function FooPage() {
  return (
    <RequirePermission screen="foo_screen" reason="...">
      <FooCenter />
    </RequirePermission>
  );
}
```

---

## 13. Backend — endpoints del agent

Base: `http://localhost:6601` (puerto host, mapeado a `:8000` interno).

### Agente AMS
- `POST /api/ams/chat` · `POST /api/ams/chat/stream` (SSE)
- `POST /api/ams/research` · `POST /api/ams/research/stream`
- `GET  /api/ams/incidents`
- `GET  /api/ams/audit`
- `GET  /api/ams/stats`

### Auth
- `POST /api/auth/{signup,login,logout,refresh,logout-all}`
- `GET  /api/auth/{me,sessions,users}`

### Knowledge (RAG)
- `POST /api/knowledge/{ingest,ingest-text,ingest-url}`
- `POST /api/knowledge/search`
- `GET  /api/knowledge/{documents,overview}`

### Tickets
- `GET/POST /api/tickets`
- `POST /api/tickets/estimate`
- `POST /api/tickets/{:key}/{classify,recalculate,adjust,close,replaceEstimateFull}`

### Support Desk
- `GET/POST /api/support/{triage,resolve,orchestrator}`

### SAP
- `POST /api/sap/inbound/{idoc,short-dump,oss-note,job-failure,transport,generic}`
- `GET  /api/sap/inbound/{events,tokens}`
- `POST/DELETE /api/sap/inbound/tokens`

### Dashboard
- `GET /api/dashboard/{advanced,executive,usage}`
- `GET /api/notifications`

### Meetings & Voice
- `POST /api/meetings/upload`
- `GET  /api/meetings`
- `POST/GET /api/voice/*` (incluye Twilio webhook)

### Integraciones
- `GET/POST/PATCH/DELETE /api/integrations/destinations`
- `GET/POST /api/integrations/deliveries`

### RBAC
- `GET  /api/rbac/snapshot`
- `POST /api/rbac/{roles,users}`

### Escalación N2
- `GET  /api/escalation/snapshot`
- `POST /api/escalation/{rules,responsibles,records}`
- `PATCH /api/escalation/{connectors,settings}`

### Calidad (ams-modules)
- `GET  /api/quality/snapshot`
- `POST /api/quality/evaluations`
- (mismo patrón para `/api/playbooks/*` y `/api/documents/*`)

### Training & Agent Lab
- `POST /api/training/{upload,curate}`
- `POST /api/agent-lab/{feedback,playground/*,wizard/*}`

### Health / metrics
- `GET /health` · `GET /health/deep` · `GET /metrics` (Prometheus)
- `GET /api/graph` · `GET /api/demo/run`

---

## 14. Persistencia

### 14.1 Backend (PostgreSQL + pgvector)

Schema en `database/init.sql`. **10 tablas core:**

| Tabla | Propósito |
|-------|-----------|
| `users` | Auth local. Role legacy. bcrypt password hash. |
| `sessions` | Token-based sessions (cookie). |
| `incidents` | Historial conversacional del agente. JSONB para attachments. |
| `audit_logs` | Trazabilidad cross-cutting de eventos. |
| `agent_feedback` | Rating 1-5 + comentario para retraining. |
| `knowledge_documents` | 1 fila por archivo subido (PDF, DOCX, MD). |
| `knowledge_items` | Chunks con embedding `vector(768)`. Índice `ivfflat cosine 100 listas`. |
| `meetings` | Transcripciones + minute JSONB. |
| `call_logs` | Llamadas Twilio. Sin audio — solo metadatos + texto. |
| `call_turns` | Turnos USER/AI/SYSTEM de cada call_log. |

Extensión: `pgvector`. Sin migrations versionadas — `init.sql` es
idempotente (`CREATE TABLE IF NOT EXISTS`).

### 14.2 Frontend (localStorage)

Convención: `supply-chain-ams-platform-{slug}` o `supply-chain-ams-{slug}`.

| Key | Hook que lo escribe |
|-----|---------------------|
| `…-platform-roles` | `useAccessAdmin` |
| `…-platform-users` | `useAccessAdmin` |
| `…-platform-current-user` | `useAccessAdmin` |
| `…-rbac-audit-events` | `appendRbacAuditEvent` (cap 500) |
| `…-platform-evaluations` | `useQualityEvaluator` (`AMS_MODULES_STORAGE.evaluations`) |
| `…-playbooks` | `usePlaybooks` |
| `…-playbook-executions` | `usePlaybooks` |
| `…-documents` | `useDocumentFactory` |
| `…-escalations` | `useEscalation` |
| `…-testing-scenarios` | `useTestingIntelligence` |
| `…-evidences` | `useTestingIntelligence` |
| `…-customer-responses` | `useCustomerResponses` |
| `…-curation-candidates` | `useKnowledgeCuration` |
| `…-contextual-estimations` | `useContextualEstimations` |
| `…-training-knowledge` | `useAgentTraining` |
| `…-versions` | `useAgentTraining` |
| `…-gaps` | `useAgentTraining` |
| `…-demo-mode` | `useDemoMode` |
| `…-ticket-audit-events` | `useTicketAudit` (cap 1000) |
| `…-sidebar-prefs` | `useSidebarPrefs` |
| `…-tenant-signature` / `…-tenant-brand` | Settings page |

Cada hook que muta dispara un `CustomEvent` específico para que otros
componentes en el mismo tab re-rendeen.

---

## 15. Audit logs

### 15.1 Ticket Audit (`src/types/audit.ts`)

Por-ticket. **39 event types.** Persistencia: localStorage cap 1000.
Componentes que lo leen: `TicketAuditTimeline`, `GlobalAuditCenter`.

Categorías:
- Ciclo de vida: `TICKET_CREATED`, `STATUS_CHANGED`, `COMMENT_ADDED`
- Estimación: `AUTO_ESTIMATE_GENERATED`, `ESTIMATE_RECALCULATED`, `MANUAL_ADJUSTMENT`
- Agente: `TICKET_CLASSIFIED`, `AGENT_RESPONSE_GENERATED`
- Conocimiento: `KNOWLEDGE_MATCHED`, `SCOPE_ITEM_MATCHED`, `PLAYBOOK_RECOMMENDED`, `CONVERTED_TO_KNOWLEDGE`
- Escalación: `N2_ESCALATION_*`, `N2_INTELLIGENCE_*`
- Integraciones: `JIRA_DEMO_CREATED`, `SERVICENOW_DEMO_CREATED`
- Productos: `DOCUMENT_GENERATED`, `TEST_CASE_CREATED`, `QUALITY_EVALUATED`
- Visual: `VISUAL_EVIDENCE_*`, `TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS`
- Demo: `DEMO_STARTED`, `DEMO_STEP_COMPLETED`, `DEMO_COMPLETED`
- Customer Response: `CUSTOMER_RESPONSE_{GENERATED,QUALITY_CHECKED,BLOCKED,APPROVED,SAVED,SENT_MANUAL}`
- Knowledge Curation: `KB_CURATION_{CANDIDATE_PROPOSED,APPROVED,REJECTED,PUBLISHED}`

### 15.2 RBAC Audit (`src/lib/rbac-audit.ts`)

Sistema-wide. **7 event types.** Persistencia: localStorage cap 500.
Visor: tab "Log de auditoría" de `AdminAccessPanel`.

| Event type | Disparador |
|------------|------------|
| `ROLE_PERMISSIONS_UPDATED` | `togglePermission()` / `setRolePermissions()` |
| `ROLE_CREATED` | `createRole()` |
| `ROLE_DELETED` | `deleteRole()` |
| `USER_ROLE_CHANGED` | `updateUser()` con `roleCode` distinto |
| `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT` | `<RequirePermission>` bloqueando una ruta |
| `RBAC_OVERRIDE_ACTIVATED` | `setCurrentUser(id)` (admin simula) |
| `RBAC_OVERRIDE_CLEARED` | `setCurrentUser(null)` |

Actor siempre es el **authUser real**, nunca el simulado.

---

## 16. Variables de entorno

### 16.1 Platform (`supply-chain-ams-platform/.env.example`)

Mínimo:
```
NEXT_PUBLIC_AGENT_API_URL=http://localhost:6601
NODE_ENV=development
```

(El frontend es público — todas las env empiezan con `NEXT_PUBLIC_*`.
Sentry usa `NEXT_PUBLIC_SENTRY_DSN` si se quiere activar.)

### 16.2 Agent (`supply-chain-ams-agent/.env.example`)

**REQUERIDAS:**
```
GEMINI_API_KEY=__PLACEHOLDER__
POSTGRES_USER=ams_user
POSTGRES_PASSWORD=__PLACEHOLDER__
POSTGRES_DB=ams_agent
DATABASE_URL=postgresql://ams_user:__PASSWORD__@db:5432/ams_agent
REDIS_URL=redis://redis:6379
```

**OPCIONALES (cada bloque desactiva su feature si falta):**

```
# RAG
RAG_ENABLED=true
RAG_TOP_K=8
RAG_MIN_SCORE=0.65
RAG_CHUNK_CHARS=1200

# Jira mirror
JIRA_BASE_URL=https://tuempresa.atlassian.net
JIRA_EMAIL=tu@empresa.com
JIRA_API_TOKEN=__PLACEHOLDER__
JIRA_PROJECT_KEY=AMS

# SAP read-only
SAP_BASE_URL=...
SAP_USER=...
SAP_PASSWORD=...
SAP_READONLY_ENABLED=true

# ServiceNow
SERVICENOW_INSTANCE_URL=...
SERVICENOW_USERNAME=...
SERVICENOW_TOKEN=__PLACEHOLDER__

# Email (SMTP)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=__PLACEHOLDER__

# Voice (Twilio)
TWILIO_ACCOUNT_SID=__PLACEHOLDER__
TWILIO_AUTH_TOKEN=__PLACEHOLDER__
TWILIO_PHONE_NUMBER=+56...
VOICE_DEFAULT_LANGUAGE=es-CL
VOICE_MODEL=base

# SAP Cloud ALM (OAuth2)
CLOUD_ALM_BASE_URL=...
CLOUD_ALM_CLIENT_ID=...
CLOUD_ALM_CLIENT_SECRET=__PLACEHOLDER__
CLOUD_ALM_TOKEN_URL=...

# Observability
SENTRY_DSN=https://...@sentry.io/...
SENTRY_TRACES_SAMPLE_RATE=0.1

# Seguridad
COOKIE_SECRET=__GENERATE_64_HEX__
CORS_ORIGINS=http://localhost:6700,https://app.cliente.com
AUTH_BCRYPT_ROUNDS=12

# Bootstrap inicial (crea admin si están seteadas)
AMS_BOOTSTRAP_ADMIN_EMAIL=admin@empresa.com
AMS_BOOTSTRAP_ADMIN_PASSWORD=__PLACEHOLDER__

# Logging
NODE_ENV=production
LOG_LEVEL=info
```

> **Nunca commitear `.env` con valores reales.** Sólo `.env.example` con
> placeholders. Si se filtró un secreto: rotarlo inmediatamente.

---

## 17. Docker y puertos

### Stack completo (docker-compose en `supply-chain-ams-agent/`)

| Servicio | Puerto host | Puerto interno | Propósito |
|----------|-------------|----------------|-----------|
| `frontend` (platform) | **6600** o **6700** | 3000 | Next.js standalone |
| `backend` (agent) | **6601** | 8000 | Fastify |
| `db` (postgres pgvector) | **6602** | 5432 | DB principal |
| `redis` | **6603** | 6379 | Queue + cache |
| `kibana` | **6604** | 5601 | Logs UI |
| `grafana` | **6605** | 3000 | Métricas UI |
| `logstash` | **6610** | 5044 | Logs pipeline |
| `whisper` | **6611** | 9000 | ASR self-hosted |
| `prometheus` | **6609** | 9090 | Métricas |
| `elasticsearch` | **6620** | 9200 | Full-text + logs |

> **Convención de puertos:** todo el stack vive en el rango `66xx`/`67xx`
> para evitar colisión con otros proyectos de Vladimir (miespejo,
> EliteCards, MyF landing).

### Dockerfile platform (multi-stage)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

(`next.config.js` debe tener `output: "standalone"`.)

---

## 18. Comandos comunes

### Local dev (sin Docker)

**Backend:**
```bash
cd ~/Desktop/supply-chain-ams-agent/backend
npm install
npm run dev          # tsx watch, escucha en :8000
```

**Frontend:**
```bash
cd ~/Desktop/supply-chain-ams-platform
npm install
npm run dev          # Next dev, :3000
# acceder http://localhost:3000
```

### Docker stack (recomendado)

```bash
cd ~/Desktop/supply-chain-ams-agent
docker compose up -d
docker compose logs -f backend frontend
docker compose down               # parar
docker compose down -v            # parar + borrar volúmenes
```

Healthchecks:
```bash
curl http://localhost:6601/health
curl http://localhost:6601/health/deep    # incluye DB, Redis, Whisper
curl http://localhost:6700                # frontend
```

### Typecheck (CI)

```bash
# platform
npx tsc --noEmit                          # debe terminar con exit 0

# agent
cd backend && npx tsc --noEmit
```

### Smoke tests (platform)

```bash
cd ~/Desktop/supply-chain-ams-platform
npx tsx scripts/smoke-test-contextual.ts
npx tsx scripts/smoke-test-customer-response.ts
npx tsx scripts/smoke-test-n2-intelligence.ts
npx tsx scripts/debug-auth.ts
```

### Build de producción

```bash
# platform
npm run build && npm run start    # standalone server.js

# agent
npm run build && npm run start    # node dist/index.js
```

### Git workflow

```bash
git status -s
git add <archivos-explícitos>      # NO git add -A
git commit -m "feat(scope): ..."   # convención commits
git tag -a v0.X.Y -m "..."
git push --tags
```

---

## 19. Patrones de código

### 19.1 Cómo agregar un módulo nuevo al sidebar

1. Crear la página: `src/app/(platform)/mi-modulo/page.tsx` envuelto en
   `<RequirePermission screen="...">`.
2. (Si requiere una screen nueva) extender `PlatformScreen` en
   `src/types/rbac.ts` + agregar a `SCREEN_LABELS`/`SCREEN_GROUPS`
   en `src/utils/rbac.ts`.
3. Agregar entrada en `src/lib/modules.ts → MODULES`:
   ```ts
   { id: "mi-modulo", label: "Mi Módulo", icon: "✨", href: "/mi-modulo",
     description: "...", status: "available", phase: 9,
     rolesAllowed: ["consultor", "aprobador", "admin"],
     permissionKey: "mi_screen_rbac", group: "ams_avanzado" }
   ```
4. (Opcional) Agregar a `src/lib/commands.ts` para que aparezca en Cmd+K.
5. Si el módulo necesita persistencia local, crear hook en `src/hooks/`
   siguiendo el patrón storage + `EVT` + hidratación backend.

### 19.2 Cómo proteger una ruta

```tsx
"use client";
import RequirePermission from "@/components/admin/RequirePermission";
import { usePermissions } from "@/hooks/usePermissions";
import MiCenter from "@/components/mi-modulo/MiCenter";

function MiCenterInner() {
  const { effectiveUser, can } = usePermissions();
  return <MiCenter canEdit={can("mi_screen", "edit")}
                   canApprove={can("mi_screen", "approve")}
                   actor={effectiveUser?.email} />;
}

export default function MiPage() {
  return (
    <RequirePermission screen="mi_screen" reason="...">
      <MiCenterInner />
    </RequirePermission>
  );
}
```

### 19.3 Cómo ocultar botones por permiso

```tsx
const { can } = usePermissions();
{can("escalamiento_n2", "approve") && (
  <button onClick={handleApprove}>Aprobar</button>
)}
```

### 19.4 Cómo emitir un evento de audit por ticket

```ts
const audit = useTicketAudit();
audit.record({
  ticketId: ticket.key,
  eventType: "DOCUMENT_GENERATED",
  title: "RCA generado",
  description: "...",
  actor: actor, actorRole: actorRole, source: "ui",
  metadata: { docId: "..." },
});
```

### 19.5 Cómo llamar al backend desde un service

```ts
// src/services/foo.api.ts
const BASE = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export async function listFoo(): Promise<
  { success: true; items: Foo[] } | { success: false; error: string }
> {
  try {
    const r = await fetch(`${BASE}/api/foo`, { credentials: "include" });
    if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
    const data = await r.json();
    return { success: true, items: data.items };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
```

### 19.6 Convenciones de commit

```
feat(scope): título corto
fix(scope): título corto
chore(scope): título corto
docs(scope): título corto
refactor(scope): título corto

Body explicando el "why" y los cambios. Sin emojis.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Scopes usados: `rbac`, `tickets`, `intelligence`, `estimation`, `quality`,
`escalation`, `customer-response`, `knowledge`, `testing`, `auth`,
`integrations`, `deploy`, `docs`.

### 19.7 ModalPortal — NUNCA modales inline

Cualquier modal **debe** envolverse en `<ModalPortal open onClose>` para
escapar de stacking contexts y no quedar "atrapado" detrás de cards.

---

## 20. Decisiones técnicas

### 20.1 RBAC fail-closed (v0.8.0)

- Módulo sin `permissionKey` Y `public !== true` → oculto.
- Ruta sin permiso → `<AccessLockedCard>` + audit `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`.
- 3 capas de defensa: Sidebar (filtro) + RequirePermission (guard) + `can(...)` (botones).
- Sin `legacyRoleToCode` como fallback de visibilidad — solo para mapear sesión legacy.

### 20.2 Sin LLM en frontend

Todo el agente vive en el backend. La platform es UI + estados + render.
Engines determinísticos del frontend (`/intelligence/`, `/utils/`) **NO
llaman a Gemini directamente** — siempre delegan al backend.

### 20.3 localStorage como persistencia tier 1, backend como tier 2

Algunos módulos (customer responses, knowledge curation, contextual
estimations) viven primero en localStorage para iterar UX sin esperar
endpoints. Backend persistence va por feature, no de golpe. Hook hidrata
desde backend si está vivo.

### 20.4 Convivencia auth legacy + RBAC nuevo

`AuthUser.role` (legacy) sigue vigente para sesión backend. RBAC nuevo es
**capa adicional** que mapea el legacy a `roleCode` y permite simular
otros usuarios sin tocar la sesión real.

### 20.5 Datos del cliente en su VPS

No hay multi-tenant compartido. Cada cliente despliega su propio stack
en su VPS (modelo Caddy + Docker compose). Esto es deal-breaker para
clientes enterprise con compliance.

### 20.6 Sin guardar imágenes

Las screenshots SAP subidas en "Análisis Visual" se procesan en RAM y
**no se persisten**. Solo se conserva el resumen textual del análisis.
Nada de base64 en localStorage. Nada de uploads permanentes.

### 20.7 Convención de puertos 66xx/67xx

Para evitar colisión con miespejo (4000), MyF landing (5173), EliteCards
(8000) en la misma máquina dev.

### 20.8 Layout fail-safe para /tickets (v0.8.1)

`/tickets` usa shell scoped (`.tickets-page`) con `height:calc(100vh-48px)
+ overflow:hidden`. Lista y Command Center son paneles independientes con
scroll propio. `scrollIntoView` internos quedan dentro del pane, no
arrastran el body.

### 20.9 Cap defensivo en Quality Evaluator (v0.8.1)

`QualityEvaluationsCard` renderiza máximo 20 filas (3 por default, 20
expandido con scroll interno). `dedupeQualityEvaluations` corre solo
bajo botón "Compactar duplicados" — nunca automático.

---

## 21. Roadmap y pendientes

### Versiones publicadas (tags)

| Tag | Fecha | Highlights |
|-----|-------|-----------|
| `v0.5.0` | — | Checkpoint pre-deploy |
| `v0.6.0` | — | Customer Response Intelligence v0.1 |
| `v0.7.0` | — | Trilogía Intelligence (N2 + KB Curation + Customer Response v0.2) |
| `v0.8.0` | 2026-06-02 | RBAC fail-closed en 3 niveles + audit log |
| `v0.8.1` | 2026-06-02 | Fix layout /tickets + cap Quality Evaluator |

### Pendientes activos (de MEMORY.md y task list)

- Rotar credenciales que se filtraron en sesiones anteriores.
- Activar billing Google Cloud para el chat real con Gemini en demo público.
- Sincronizar fixes `sed` aplicados localmente al repo deployable.
- Conectar Jira real con credenciales productivas (cuando cliente lo pida).
- Migrar RBAC localStorage → backend Postgres (`rbac_roles` /
  `rbac_role_permissions` / `rbac_users` / `rbac_audit_log`).
- SSO Azure AD / Google Workspace (mapeo claims → roleCode).
- Decorar endpoints sensibles del agent con `requirePermission(screen, action)`.

### Próximas iteraciones sugeridas

- Document Factory v2 con templates por cliente.
- Voice channel: handoff humano + transcripción en vivo.
- Knowledge graph: visualización 3D del KB.
- Multi-tenant opcional (segregación por DB schema).

---

## 22. Anti-patterns / qué NO hacer

### Seguridad
- ❌ **NUNCA pedir al usuario que pegue secretos en chat.** Hubo leaks
  previos — usar siempre placeholders y referenciar `.env` vars.
- ❌ **NUNCA guardar imágenes en localStorage / base64 persistente.**
- ❌ **NUNCA persistir archivos subidos para "Análisis Visual" o
  Testing Intelligence** más allá del análisis.
- ❌ **NUNCA conectar SAP real / Jira real / ServiceNow real** sin
  pedido explícito + credenciales del cliente.
- ❌ **NUNCA guardar tokens de auth en localStorage** — son cookie-based.
- ❌ **NUNCA commitear `.env`**. Solo `.env.example` con placeholders.

### Código
- ❌ **NUNCA hardcodear permisos por rol** en componentes. Usar
  `usePermissions().can(screen, action)`.
- ❌ **NUNCA bypassear `<RequirePermission>`** con un check inline en la
  page — siempre usar el wrapper.
- ❌ **NUNCA renderizar arrays unbounded** (`.map` sin `.slice`).
  Aprendizaje del bug Quality Evaluator.
- ❌ **NUNCA usar `min-height: 100vh`** en `.app` si querés que un pane
  scrollee independiente — usar el patrón `.tickets-page`.
- ❌ **NUNCA modales sin `ModalPortal`** — quedan atrapados detrás de
  cards con stacking context.
- ❌ **NUNCA git add -A** — siempre agregar archivos explícitos para
  evitar incluir `.env` o uploads.
- ❌ **NUNCA skip hooks** (`--no-verify`) salvo pedido explícito.
- ❌ **NUNCA `git rebase -i`** desde Claude — no soporta interactivo.

### UX
- ❌ **NUNCA `scrollIntoView` apuntando al document** desde una page
  con shell scoped — usar contenedor scrollable propio.
- ❌ **NUNCA disparar `setState` infinito en useEffect** sin dep array
  correcto.
- ❌ **NUNCA seed demo en useEffect** sin guard idempotente — causó el
  bug de 1000 evaluaciones.

### Conversación con el usuario
- Usuario es Chile, Windows + Git Bash. Comandos copy-paste paso a paso.
- Trabajamos psicólogos como "Ps." y "psicólogo/a", **nunca "Dr." ni "médico"**
  (del proyecto miespejo, importa por terminología).
- Etiquetar siempre los bloques de comando: **"local Windows" vs
  "VPS SSH"** para evitar mix-ups.

---

## 23. Glosario AMS / SAP

| Sigla | Significado |
|-------|-------------|
| AMS | Application Management Services — soporte a apps SAP en producción |
| N1 | Nivel 1 (mesa de soporte / agente IA) |
| N2 | Nivel 2 (especialista humano) |
| RCA | Root Cause Analysis |
| KB | Knowledge Base |
| RAG | Retrieval-Augmented Generation |
| ETA | Estimated Time to resolution / Arrival |
| SLA | Service Level Agreement |
| MIGO | SAP transaction — Goods Receipt |
| MIRO | SAP transaction — Invoice Receipt |
| MB52 | SAP transaction — Display Warehouse Stock |
| ME21N | SAP transaction — Create Purchase Order |
| MD01 | SAP transaction — MRP Run |
| VA01 | SAP transaction — Create Sales Order |
| LT03 | SAP transaction — Create Transfer Order |
| OC | Orden de Compra (Purchase Order) |
| OS | Orden de Servicio |
| OSS Note | SAP support note (parche oficial) |
| IDoc | Intermediate Document (mensaje EDI SAP) |
| HU | Handling Unit (en EWM/WM) |
| BTP | Business Technology Platform (SAP cloud) |
| IBP | Integrated Business Planning (SAP cloud) |
| EWM | Extended Warehouse Management |
| WM | Warehouse Management (módulo legacy) |
| MM | Materials Management |
| SD | Sales & Distribution |
| PP | Production Planning |
| QM | Quality Management |
| PM | Plant Maintenance |
| Cloud ALM | SAP Cloud Application Lifecycle Management |
| Hypercare | Período post go-live con soporte intensivo |
| Cutover | Plan de migración / corte productivo |
| Scope Item | Best Practice del catálogo SAP (ej. J45 "Procurement of Direct Materials") |

---

## Cómo usar este brief en ChatGPT

1. Subí este archivo a tu **ChatGPT Project** como "Project files".
2. En las "Project instructions", pegá algo como:

> "Eres copiloto técnico del proyecto Supply Chain AMS Platform. Usás como
> contexto el PROJECT_BRIEF.md adjunto. Cuando responda, citá la sección
> relevante (§N). Si te piden código, seguí los patrones de §19 y respetá
> los anti-patterns de §22. Si una env var está marcada como
> `__PLACEHOLDER__`, NUNCA inventes un valor — pedíselo al usuario o
> indicá que debe definirse en `.env`. Cuando dudes entre RBAC fail-open
> y fail-closed, siempre fail-closed."

3. Para chats nuevos: empezá con un resumen del problema (1-3 frases),
   ChatGPT consultará el brief automáticamente.

4. Para regenerar este brief tras cambios mayores, pedí a Claude Code:
   "regenerá `docs/PROJECT_BRIEF.md` con los cambios desde v0.8.1".

---

**Fin del brief.** Total: 26 secciones · 37 módulos · 26 screens RBAC ·
23 hooks · 23 services · 49 páginas · 39 ticket event types · 7 RBAC
event types · 10 tablas Postgres · 9 servicios Docker.
