# CURRENT_STATE — Supply Chain AMS

> Diagnóstico técnico del estado **real** del proyecto al **2026-06-02
> 21:00 UTC-4**. NO contiene supuestos ni features no implementados.
> Cada afirmación viene de inspección directa de los repos (git, find,
> grep, typecheck). Cuando algo no existe, se dice explícitamente.

---

## 1. Resumen ejecutivo del proyecto

| | |
|---|---|
| **Nombre** | Supply Chain AMS Platform + Agent (3 repos) |
| **Objetivo** | Industrializar el servicio AMS de SAP Supply Chain con un agente IA N1 + escalamiento humano N2 + gobierno de IA + generación documental + testing intelligent. |
| **Problema** | Mesa de soporte AMS tradicional es cara, lenta, inconsistente, sin trazabilidad, sin gobierno de IA, sin reuso de conocimiento. |
| **Cliente objetivo** | Consultoras SAP que venden AMS y equipos AMS internos de empresas que necesitan trazabilidad + métricas. |
| **Estado general** | Frontend muy avanzado (37 módulos UI, RBAC fail-closed, 49 rutas). Backend con 200+ endpoints distribuidos en 24 archivos de routes, Postgres + pgvector + Gemini + Whisper. Stack prod orquestado con Caddy. **Sin tests automatizados.** |
| **Nivel de madurez** | **MVP avanzado / beta interna.** Listo para demo controlada y piloto con cliente acompañado. **NO** productivo (sin tests, sin RBAC en backend, datos en localStorage en muchos módulos). |
| **Fortalezas** | (1) Cobertura funcional altísima — 37 módulos. (2) RBAC fail-closed reciente (v0.8.0) con audit log. (3) Stack prod definido con Caddy + Let's Encrypt + scripts deploy. (4) Documentación interna (manual × 3 audiencias × 37 módulos). (5) Typecheck limpio en platform. |
| **Riesgos principales** | (1) Cero tests automatizados (ni jest/vitest/playwright). (2) Persistencia frontend dominante en localStorage para módulos críticos (quality, customer-response, curation, RBAC). (3) Backend RBAC no enforce permisos en endpoints sensibles (el RBAC vive en el front). (4) Deploy productivo nunca ejecutado en VPS real (scripts existen, ejecución pendiente). (5) Demo guiada puede generar duplicados en localStorage si se corre múltiples veces (mitigado parcialmente con dedupe on-demand en quality v0.8.1). |

---

## 2. Repositorios detectados

Se detectaron **3 repos** en `C:\Users\VMATTA\Desktop\`:

### 2.1 `supply-chain-ams-platform`

| | |
|---|---|
| **Ruta** | `C:\Users\VMATTA\Desktop\supply-chain-ams-platform` |
| **Branch** | `main` |
| **Remote** | `https://github.com/vladyrap/supply-chain-ams-platform.git` |
| **Tags (desc)** | `v0.8.1`, `v0.8.0`, `v0.7.0`, `v0.6.0`, `v0.5.0` |
| **Estado git** | 1 archivo sin commit: `?? docs/PROJECT_BRIEF.md` (generado en sesión previa, no es código) |
| **Stash** | vacío |
| **Build / typecheck** | `npx tsc --noEmit` → **exit 0, sin errores** |
| **Tests** | No hay framework (ni jest, ni vitest, ni playwright). Sí hay 4 smoke scripts ejecutables con `tsx` |
| **Propósito** | Frontend Next.js 14 App Router (37 módulos). Único consumidor del backend agent. |

**Últimos 10 commits:**
```
66de617 fix(tickets): estabilizar layout /tickets + cap Quality Evaluator a 20 filas
e1e4066 feat(rbac): enforcement fail-closed en 3 niveles + audit log
8ffc92c feat(intelligence): trilogía Intelligence v0.1 — N2 + KB Curation + Customer Response v0.2
9fa1212 feat(intelligence): Customer Response Intelligence v0.1 — engine + quality gate + UI
c3c621a feat(estimation): UI completa del motor contextual + persistencia + aplicar al ticket
8449b1e fix(estimation): 10 bugs detectados por smoke test del motor contextual
b6ccf40 feat(estimation): Contextual AMS Estimation Engine v0.1 (mock)
ea1f7c8 feat(estimation): modo BOOTSTRAP + trackeo estimado vs real + tile dashboard
3759499 chore(tickets): commit faltante de 2 utils referenciados por TicketCommandCenter
48894be docs(manual): manual AMS completo · 37 módulos × 3 audiencias + Playwright + PDF generator
```

### 2.2 `supply-chain-ams-agent`

| | |
|---|---|
| **Ruta** | `C:\Users\VMATTA\Desktop\supply-chain-ams-agent` |
| **Branch** | `main` |
| **Remote** | `https://github.com/vladyrap/supply-chain-ams-agent.git` |
| **Tags (desc)** | `v0.7.0`, `v0.5.0` |
| **Estado git** | **clean** |
| **Build** | `npm run typecheck` reportado OK por sub-agent. `dist/` NO existe (no compilado actualmente) |
| **Tests** | **No existe carpeta `tests/` ni `__tests__/`. No hay `vitest.config.ts`, `jest.config.js`, `playwright.config.ts`** |
| **Propósito** | Monorepo con backend Fastify + worker BullMQ + database/init.sql + observability + prompts + un frontend **legacy** que quedó cuando se hizo el split a `supply-chain-ams-platform` |

**Estructura nivel 1:** `backend/`, `frontend/` (legacy), `worker/`, `database/`, `prompts/`, `observability/`, `docs/`, `docker-compose.yml`.

**Últimos 10 commits:**
```
eef559c feat(customer-response): backend persistence con tabla customer_responses
02b35bf feat(tickets): POST /api/tickets/:key/estimate/full para sobrescribir estimación
92fa937 feat(estimation): trackeo estimado vs real al cerrar ticket
7199e83 feat(tickets): persist visualEvidenceNotes + estimation enrichment
f0f8376 fix(scope-items): seed corre siempre con ON CONFLICT DO NOTHING
34fe78c feat(cabo2): scope items SAP ampliados de 12 a 35
8374ed5 feat(g5-rbac): 5 screens nuevos en RBAC backend
dc548c3 feat(g1): agent metadata enriquecido + scope items SAP backend
2921237 feat(tickets): seed mocks en DB + mirror automático para Jira
8f4ae58 feat(tickets): persistencia Postgres + recalcular/ajustar estimación
```

> **Nota:** la carpeta `agent/frontend/` es un Next.js **mucho más
> simple** (solo deps: `next 14.2.15`, `react 18.3.1`, sin Sentry, sin
> Three.js, sin react-markdown). Es el frontend original previo al split.
> El que se usa hoy es `supply-chain-ams-platform`. **`agent/frontend/`
> queda como deuda técnica a borrar o documentar como deprecated.**

### 2.3 `supply-chain-ams-stack` (orquestador)

| | |
|---|---|
| **Ruta** | `C:\Users\VMATTA\Desktop\supply-chain-ams-stack` |
| **Branch** | `main` |
| **Remote** | `https://github.com/vladyrap/supply-chain-ams-stack.git` |
| **Tags (desc)** | `v0.5.0` |
| **Estado git** | **clean** |
| **Propósito** | Orquestador de los 3 repos con `docker-compose.yml` (dev unificado) + `docker-compose.prod.yml` (producción con Caddy) + scripts de deploy. |

**Archivos:**
```
.env.production.example       (5029 bytes)
Caddyfile.prod                (2235 bytes)
docker-compose.prod.yml       (7946 bytes)
docker-compose.yml            (1228 bytes)
LICENSE                       MIT
README.md
docs/deployment.md
docs/deploy-tomorrow-checklist.md
scripts/bootstrap-vps.sh
scripts/deploy.sh
scripts/backup-db.sh
scripts/restore-db.sh
scripts/healthcheck.sh
```

**Últimos 6 commits:**
```
fc47d48 docs(deploy): checklist actualizado con smoke tests de TicketCommandCenter v2
ba72aea fix(deploy): paths /opt/ams + checklist incluye smoke del Estimador
de7d56d docs: checklist deploy mañana 16:00
88c27b2 feat(deploy): perfil producción · docker-compose.prod + Caddy + scripts ops
7997c81 docs: badges + README polish + MIT license
0724959 snapshot inicial: orquestador unificado supply-chain-ams-stack
```

---

## 3. Arquitectura general

Stack actual **detectado en código y en docker-compose**:

```
                        INTERNET
                            │
                  ┌─────────┴──────────┐
                  │  Caddy 2-alpine    │   ports 80, 443, 443/udp
                  │  HTTPS Let's       │   (solo prod, repo stack)
                  │  Encrypt auto      │
                  └─────────┬──────────┘
                            │
       ┌────────────────────┼──────────────────────┐
       │                    │                      │
  ┌────▼─────┐        ┌─────▼─────┐         ┌──────▼──────┐
  │ platform │ ←─REST→│   backend │ ←──────→│ db (pgvector│
  │  Next.js │        │  Fastify  │         │  pg16)      │
  │  :6700   │        │  :6601    │         │  :6602      │
  └──────────┘        └─────┬─────┘         └─────────────┘
                            │
              ┌─────────────┼────────────────┐
              │             │                │
         ┌────▼────┐  ┌─────▼─────┐    ┌─────▼─────┐
         │  redis  │  │  whisper  │    │  worker   │
         │  :6603  │  │  :6611    │    │  BullMQ   │
         │  BullMQ │  │  ASR      │    │  (RAG +   │
         └─────────┘  └───────────┘    │  cron +   │
                                       │  voice)   │
                                       └───────────┘

       Opcionales (--profile observability):
       prometheus :6609 · grafana :6605 · ES :6620 · kibana :6604 · logstash :6610

       Externo (no en compose):
       Google Gemini 2.5 Flash  (LLM + embeddings 768d)
```

**Comunicación detectada:**
- platform → backend: `fetch(NEXT_PUBLIC_AGENT_API_URL + "/api/...")` con `credentials: "include"`.
- backend → Postgres: `pg@8.13.1` pool.
- backend → Redis: `ioredis@5.4.1` + `bullmq@5.21.2`.
- backend → Whisper: HTTP local al contenedor.
- backend → Gemini: `@google/genai@0.7.0`.
- Worker consume BullMQ desde Redis (RAG indexing + transcripciones + self-training cron).

**Real vs mock:**

| Sistema | Real | Mock | Preparado pero no conectado |
|---------|------|------|-----------------------------|
| Gemini LLM | ✅ si hay `GEMINI_API_KEY` | fallback determinístico si no hay key | — |
| PostgreSQL | ✅ docker-compose lo levanta | — | — |
| pgvector | ✅ extensión instalada | — | — |
| Redis + BullMQ | ✅ docker-compose lo levanta | — | — |
| Whisper ASR | ✅ contenedor local | — | — |
| Jira | parcial — código existe (`jira.service.ts`) | mock activo si no hay credenciales | requiere `JIRA_*` env vars |
| ServiceNow | parcial — código existe | mock | requiere `SERVICENOW_*` env vars |
| SAP read-only | parcial — adapter existe | mock | requiere `SAP_*` env vars |
| Twilio Voice | parcial — webhook routes | mock | requiere `TWILIO_*` env vars |
| Caddy + HTTPS | ✅ definido en stack/prod | — | DNS + dominios reales pendientes |
| Sentry | parcial | — | Front: `@sentry/nextjs` instalado + `SentryBoot` component. Backend: `@sentry/node`. Sin DSN configurado por default |
| Prometheus + Grafana | ✅ contenedores existen | — | dashboards Grafana provisioning existe pero sin uso documentado |

---

## 4. Stack técnico actual

### 4.1 Platform (`supply-chain-ams-platform`)

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Next.js (App Router) | **14.2.15** |
| Runtime | React | **18.3.1** |
| Lenguaje | TypeScript strict | **5.6.3** |
| Estilos | CSS global (`src/styles/globals.css`) + inline styles | — |
| 3D / canvas | three | **^0.169.0** |
| Markdown | react-markdown + remark-gfm | 9.0.1 / 4.0.0 |
| Error tracking | @sentry/nextjs | ^7.120.4 |
| Storage frontend | `localStorage` + cookies (sesión) | — |
| Estado componentes | useState + useReducer + custom hooks (sin Redux/Zustand) | — |
| Tests | **No hay framework** — solo 4 smoke scripts en `scripts/*.ts` ejecutables con `tsx` | — |

**Scripts:** `dev` (next :3000), `build` (next build), `start`, `lint`, `typecheck` (tsc --noEmit).

### 4.2 Agent (`supply-chain-ams-agent/backend`)

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Fastify | 4.28.1 |
| LLM SDK | @google/genai | 0.7.0 |
| Modelo | gemini-2.5-flash (default `.env`) | — |
| Embeddings | gemini-embedding-001 / 768 dims | — |
| DB driver | pg | 8.13.1 |
| Queue | bullmq + ioredis | 5.21.2 / 5.4.1 |
| Logger | pino | 9.5.0 |
| Auth hash | bcryptjs | 2.4.3 |
| Observability | @sentry/node + prom-client | 7.120.4 / 15.1.3 |
| Email | nodemailer | 6.9.16 |
| Multipart | @fastify/multipart | — |
| Tests | **0 archivos de test** | — |
| Bootstrap admin | usa `AMS_BOOTSTRAP_ADMIN_EMAIL/PASSWORD` si está vacía la DB | — |

**Estado de Gemini:** integrado en 5 services (`claude.service.ts`, `qa-eval`, `testing-video-analysis`, `feedback-patterns`, `training-embeddings`). Funciona sin key con fallback. Para uso real requiere `GEMINI_API_KEY`.

**Estado de Whisper:** servicio `voice.service.ts` integrado vía HTTP al contenedor `onerahmet/openai-whisper-asr-webservice` puerto 9000.

**Estado de Postgres/Redis:** usados activamente. Pool pg en `database/db.ts`. BullMQ jobs definidos en `worker/`.

### 4.3 Stack (`supply-chain-ams-stack`)

| Archivo | Tamaño | Rol |
|---------|--------|-----|
| `docker-compose.yml` | 1228 B | Orquestador `include:` que importa los compose de `agent` y `platform` |
| `docker-compose.prod.yml` | 7946 B | Stack prod: Caddy + backend + platform + db + redis + worker (+ whisper/prom/grafana con profiles) |
| `Caddyfile.prod` | 2235 B | Reverse proxy con HTTPS auto + headers seguridad + logs estructurados |
| `.env.production.example` | 5029 B | Plantilla completa de variables (LLM, DB, auth, integraciones, dominios) |
| `scripts/bootstrap-vps.sh` | — | Prepara VPS Debian/Ubuntu desde cero (docker, ufw, fail2ban, layouts) |
| `scripts/deploy.sh` | — | Asume 3 repos como hermanos en `/opt/ams/`. Pull + rebuild + up |
| `scripts/backup-db.sh` | — | `pg_dump` con retención (default 14 días) — cron sugerido `0 3 * * *` |
| `scripts/restore-db.sh` | — | Restore desde backup |
| `scripts/healthcheck.sh` | — | Verificación HTTP a `AMS_DOMAIN` y `AMS_API_DOMAIN` |

**Variables `.env.production` requeridas:**
- Dominios: `AMS_DOMAIN`, `AMS_API_DOMAIN`
- LLM: `GEMINI_API_KEY`, `GEMINI_MODEL`
- DB: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Auth: `COOKIE_SECRET`, `JWT_SECRET`, `AUTH_BCRYPT_ROUNDS=12`
- Bootstrap admin: `AMS_BOOTSTRAP_ADMIN_EMAIL`, `AMS_BOOTSTRAP_ADMIN_PASSWORD`
- CORS: `CORS_ORIGINS`
- Frontend: `NEXT_PUBLIC_AGENT_API_URL`

**Opcionales:** integraciones (Jira, SAP, ServiceNow, Twilio, SMTP), Sentry, observability admin credentials.

---

## 5. Estructura de archivos relevante

### 5.1 `supply-chain-ams-platform/src/`

```
src/
├── app/
│   ├── (platform)/                        # Group con layout sidebar+header
│   │   ├── layout.tsx                     # Sidebar + Header + FX + Jaimito
│   │   ├── welcome/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── agent/page.tsx, agent/think/, agent/voice/
│   │   ├── history/page.tsx
│   │   ├── tickets/page.tsx               # refactor v0.8.1 con tickets-page shell
│   │   ├── support-desk/                  # +5 subrutas
│   │   ├── knowledge/                     # +graph + training subrutas
│   │   ├── voice-calls/                   # + [sid] dinámico
│   │   ├── integrations/                  # + sap-inbound subruta
│   │   ├── admin/                         # + eval subruta
│   │   └── 30 carpetas más con page.tsx   # (lista completa en §7)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── page.tsx                           # redirect /welcome
│   └── layout.tsx                         # RootLayout providers
├── components/
│   ├── admin/                             # RBAC: RequirePermission, AccessLockedCard, AdminAccessPanel, RbacAuditLogPanel, AccessPreview, PermissionMatrix, RoleManagement, UserManagement, RoleFormModal, UserFormModal, PermissionBadge
│   ├── agent/                             # MarkdownView, MessageList
│   ├── audit/                             # GlobalAuditCenter, TicketAuditTimeline, AuditEventCard
│   ├── charts/                            # Donut, Gauge, Heatmap, StackedLine
│   ├── command/                           # CommandPalette
│   ├── customer-response/                 # GenerateResponseModal, QualityGateReport, CustomerResponsePreview, ResponseHistoryList
│   ├── dashboard/                         # HeroCard, EstimationCalibrationTile, BusinessValueFullCenter
│   ├── demo/                              # GuidedAmsDemo, DemoModeBanner
│   ├── documents/                         # DocumentFactoryCenter, DocumentFactoryQuickAction
│   ├── escalation/                        # EscalationCenter, N2IntelligenceCard, EscalationQuickAction
│   ├── estimation/                        # TimeEstimatorCenter, TicketEstimateDetail, EstimateExplainabilityCard, ContextualEstimationView, TicketEstimateBadge, ManualEstimateAdjustmentModal
│   ├── fx/                                # AuroraBackground, GlobalParallax, BrandSplash, SentryBoot, EventEffects
│   ├── jarvis/                            # Jaimito, TourController
│   ├── knowledge/                         # KnowledgeQuickActions, KnowledgeCurationCard
│   ├── layout/                            # Sidebar, Header, CommandPalette
│   ├── playbooks/                         # PlaybooksCenter, PlaybookQuickAction
│   ├── quality/                           # QualityEvaluatorCenter, QualityDashboard, QualityQuickAction, QualityEvaluationsCard (NUEVO v0.8.1)
│   ├── readiness/                         # AgentReadinessCenter
│   ├── testing/                           # TestingIntelligenceCenter, TestingQuickAction
│   ├── tickets/                           # TicketCommandCenter, CloseTicketModal, CreateTicketModal, TicketNextBestAction, TicketQuickActions, TicketReadinessScore, VisualAnalysisResultCard, VisualEvidenceUploader
│   ├── training/                          # TrainingCenter
│   └── ui/                                # ModalPortal, Badge, KPI, BarList
├── context/                               # 4 providers (Auth, Platform, Toast, CommandPalette)
├── hooks/                                 # 23 hooks (§7 del PROJECT_BRIEF)
├── services/                              # 23 api clients
├── intelligence/                          # 7 engines (customer-response, knowledge-curation, n2-escalation)
├── utils/                                 # 19 utils/engines (incluye quality-evaluator-helpers v0.8.1)
├── lib/                                   # modules.ts (catálogo), commands.ts, roles.ts, rbac-audit.ts (NUEVO), sentry.ts, sounds.ts + sub-carpetas demo/training/testing/playbooks/escalation
├── types/                                 # 12 type files
├── data/                                  # ams-estimation-history.ts (dataset 30 casos)
└── styles/globals.css                     # CSS único de la app
```

### 5.2 `supply-chain-ams-agent/`

```
agent/
├── backend/
│   ├── src/
│   │   ├── index.ts                       # entrypoint (PORT default 8000)
│   │   ├── server.ts                      # Fastify setup
│   │   ├── routes/                        # 24 archivos .routes.ts
│   │   ├── controllers/                   # 30 controllers
│   │   ├── services/                      # 50+ services
│   │   ├── database/db.ts                 # pg pool
│   │   ├── types/                         # auth, ams, integration, support, training
│   │   └── utils/                         # logger, sentry, metrics, errors, retry
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                         # Node 20 alpine multi-stage
├── frontend/                              # ⚠ legacy — NextJS original pre-split
│   ├── src/
│   ├── package.json                       # solo next/react/react-dom
│   ├── public/
│   └── Dockerfile
├── worker/                                # BullMQ workers (RAG, transcripción, cron)
│   └── Dockerfile
├── database/init.sql                      # 10 tablas + pgvector + indices
├── prompts/                               # templates RAG + agent (volumen read-only)
├── observability/
│   ├── prometheus/prometheus.yml
│   └── grafana/provisioning/
├── docs/
├── docker-compose.yml                     # 7 servicios (incluye frontend legacy)
└── .env.example                           # 126 líneas
```

### 5.3 `supply-chain-ams-stack/`

```
stack/
├── docker-compose.yml                     # include: agent + platform
├── docker-compose.prod.yml                # Caddy + sin puertos host
├── Caddyfile.prod
├── .env.production.example
├── scripts/
│   ├── bootstrap-vps.sh
│   ├── deploy.sh
│   ├── backup-db.sh
│   ├── restore-db.sh
│   └── healthcheck.sh
├── docs/
│   ├── deployment.md
│   └── deploy-tomorrow-checklist.md
├── LICENSE                                # MIT
└── README.md
```

---

## 6. Módulos funcionales existentes

Catálogo fuente: `supply-chain-ams-platform/src/lib/modules.ts → MODULES`. **37 módulos.**
Para cada uno: id, ruta, archivo principal, estado real detectado en código.

### 6.1 Grupo "Operación" (8 módulos)

| ID | Ruta | Archivo principal | Estado | Persistencia | Permiso RBAC |
|----|------|-------------------|--------|--------------|--------------|
| `welcome` | `/welcome` | `(platform)/welcome/page.tsx` | ✅ funcionando | — (estático + auth) | `dashboard` (public:true) |
| `dashboard` | `/dashboard` | `(platform)/dashboard/page.tsx` | ✅ funcionando | backend `/api/dashboard/advanced` | `dashboard` |
| `agent` | `/agent` | `(platform)/agent/page.tsx` | ✅ funcionando (con o sin Gemini real) | backend `/api/ams/chat` | `agente_ams` |
| `history` | `/history` | `(platform)/history/page.tsx` | ✅ funcionando | backend `/api/ams/incidents` | `incidentes` |
| `mission-control` | `/mission-control` | `(platform)/mission-control/page.tsx` | ✅ visual | backend KPIs | `reportes` |
| `topology` | `/topology` | `(platform)/topology/page.tsx` | ✅ visual | mock + eventos | `reportes` |
| `tv` | `/tv` | `(platform)/tv/page.tsx` | ✅ visual | composición de otras vistas | `reportes` |
| `demo` | `/demo` | `(platform)/demo/page.tsx` | ✅ funcionando | engine determinístico | `reportes` |

### 6.2 Grupo "Visualizaciones" (8 módulos, todas `reportes`)

| ID | Ruta | Archivo | Estado |
|----|------|---------|--------|
| `launchpad` | `/launchpad` | `(platform)/launchpad/page.tsx` | ✅ visual cinematográfico |
| `wallboard` | `/wallboard` | `(platform)/wallboard/page.tsx` | ✅ quad-view |
| `war-room` | `/war-room` | `(platform)/war-room/page.tsx` | ✅ globo 3D |
| `brain` | `/brain` | `(platform)/brain/page.tsx` | ✅ red neuronal animada |
| `terminal` | `/terminal` | `(platform)/terminal/page.tsx` | ✅ grid Bloomberg |
| `hud` | `/hud` | `(platform)/hud/page.tsx` | ✅ Arc Reactor |
| `forecast` | `/forecast` | `(platform)/forecast/page.tsx` | ✅ regresión + bandas |
| `flow` | `/flow` | `(platform)/flow/page.tsx` | ✅ partículas eventos |

### 6.3 Grupo "AMS avanzado" (15 módulos)

| ID | Ruta | Archivo principal | Estado | Persistencia | Permiso |
|----|------|-------------------|--------|--------------|---------|
| `tickets` | `/tickets` | `(platform)/tickets/page.tsx` | ✅ funcionando, layout fixed en v0.8.1 | backend Postgres | `ticket_command_center` |
| `support-desk` | `/support-desk` | `(platform)/support-desk/page.tsx` | ✅ funcionando + 5 subrutas | backend `/api/support/*` | `servicios` |
| `voice-calls` | `/voice-calls` | `(platform)/voice-calls/page.tsx` | parcial — requiere Twilio | backend `/api/voice/*` | `canal_telefonico` |
| `knowledge` | `/knowledge` | `(platform)/knowledge/page.tsx` | ✅ funcionando + graph subruta | backend `/api/knowledge/*` (RAG) | `conocimiento_rag` |
| `agent-training` | `/knowledge/training` | `(platform)/knowledge/training/page.tsx` | ✅ funcionando | localStorage + backend | `entrenamiento_ia` |
| `playbooks` | `/playbooks` | `(platform)/playbooks/page.tsx` | ✅ funcionando | localStorage + backend `/api/playbooks` | `playbooks_ams` |
| `document-factory` | `/document-factory` | `(platform)/document-factory/page.tsx` | ✅ funcionando | localStorage + backend `/api/documents` | `document_factory` |
| `quality-evaluator` | `/quality-evaluator` | `(platform)/quality-evaluator/page.tsx` | ✅ funcionando | localStorage + backend `/api/quality` | `quality_evaluator` |
| `escalation-n2` | `/escalation-n2` | `(platform)/escalation-n2/page.tsx` | ✅ funcionando | localStorage + backend `/api/escalation` | `escalamiento_n2` |
| `testing-intelligence` | `/testing-intelligence` | `(platform)/testing-intelligence/page.tsx` | ✅ funcionando con screen recorder | localStorage | `testing_intelligence` |
| `time-estimator` | `/time-estimator` | `(platform)/time-estimator/page.tsx` | ✅ funcionando (clásico + contextual) | localStorage + backend `/api/tickets/estimate` | `time_estimator` |
| `agent-lab` | `/agent-lab` | `(platform)/agent-lab/page.tsx` | ✅ funcionando | backend `/api/agent-lab/*` | `agente_ams` |
| `integrations` | `/integrations` | `(platform)/integrations/page.tsx` | ✅ funcionando + sap-inbound subruta | backend `/api/integrations/*` | `integraciones` |
| `sap-readonly` | `/sap-readonly` | `(platform)/sap-readonly/page.tsx` | parcial — mock si no hay credenciales | backend `/api/sap/*` | `modulos_sap` |
| `meetings` | `/meetings` | `(platform)/meetings/page.tsx` | parcial — requiere Whisper local | backend `/api/meetings/*` | `servicios` |

### 6.4 Grupo "Sistema" (6 módulos)

| ID | Ruta | Archivo principal | Estado | Persistencia | Permiso |
|----|------|-------------------|--------|--------------|---------|
| `executive` | `/executive` | `(platform)/executive/page.tsx` | ✅ funcionando | backend `/api/dashboard/executive` | `reportes` |
| `business-value` | `/business-value` | `(platform)/business-value/page.tsx` | ✅ funcionando | engine local + datos backend | `business_value_dashboard` |
| `agent-readiness` | `/agent-readiness` | `(platform)/agent-readiness/page.tsx` | ✅ funcionando | engine local | `agent_readiness` |
| `audit` | `/audit` | `(platform)/audit/page.tsx` | ✅ funcionando | localStorage (cap 1000) | `audit_trail` |
| `settings` | `/settings` | `(platform)/settings/page.tsx` | ✅ funcionando | localStorage tenant | `configuracion` |
| `admin` | `/admin` | `(platform)/admin/page.tsx` | ✅ funcionando + eval subruta | localStorage (RBAC) | `administracion` |

### 6.5 Módulos esperados que NO existen como pantalla separada

- "Usuarios", "Roles", "Permisos" → **no son páginas separadas**, son **tabs dentro de `/admin`** (UserManagement, RoleManagement, PermissionMatrix, AccessPreview, RbacAuditLogPanel).
- "Customer Response Intelligence" → no es página independiente — vive **embebido como sección 15 del TicketCommandCenter** + se usa también desde CloseTicketModal.
- "Demo guiada" → es un **modal portal** (`GuidedAmsDemo`) lanzable desde `/tickets`, no una página.
- "Jira" → no es módulo aparte. Si hay credenciales, `tickets.api.ts` hace mirror desde Jira; sino usa mock.

---

## 7. Rutas frontend

**49 rutas Next.js detectadas.** Tabla completa:

| Ruta | Pantalla | Componente principal | Permiso | Estado | Observaciones |
|------|----------|----------------------|---------|--------|---------------|
| `/` | (redirect) | `app/page.tsx` | — | ✅ | Redirect a `/welcome` |
| `/login` | Login | `app/login/page.tsx` | público | ✅ | Auth backend |
| `/signup` | Signup | `app/signup/page.tsx` | público | ✅ | — |
| `/welcome` | Bienvenida | `(platform)/welcome/page.tsx` | `dashboard` (public) | ✅ | features filtrados via `can()` desde v0.8.0 |
| `/dashboard` | Dashboard | `(platform)/dashboard/page.tsx` | `dashboard` | ✅ | KPIs reales + AMS extra |
| `/agent` | Agente AMS | `(platform)/agent/page.tsx` | `agente_ams` | ✅ | Gemini real si key |
| `/agent/think` | Agente think | `(platform)/agent/think/page.tsx` | `agente_ams` | ✅ | Modo research |
| `/agent/voice` | Agente voice | `(platform)/agent/voice/page.tsx` | `agente_ams` | ✅ | Web Speech API |
| `/agent-lab` | Agent Lab | `(platform)/agent-lab/page.tsx` | `agente_ams` | ✅ | feedback + playground |
| `/agent-readiness` | Agent Readiness | `(platform)/agent-readiness/page.tsx` | `agent_readiness` | ✅ | `RequirePermission` (v0.8.0) |
| `/audit` | Audit Trail | `(platform)/audit/page.tsx` | `audit_trail` | ✅ | `RequirePermission` |
| `/admin` | Administración | `(platform)/admin/page.tsx` | `administracion` (action:configure) | ✅ | 5 tabs incluido nuevo log RBAC |
| `/admin/eval` | Eval A/B | `(platform)/admin/eval/page.tsx` | — | ✅ | Sin RequirePermission explícito |
| `/business-value` | Valor Económico | `(platform)/business-value/page.tsx` | `business_value_dashboard` | ✅ | `RequirePermission` |
| `/brain` | Agent Brain | `(platform)/brain/page.tsx` | `reportes` | ✅ visual | — |
| `/dashboard` | (ya listado) | — | — | — | — |
| `/demo` | Demo en vivo | `(platform)/demo/page.tsx` | `reportes` | ✅ | Engine local |
| `/document-factory` | Document Factory | `(platform)/document-factory/page.tsx` | `document_factory` | ✅ | `RequirePermission` |
| `/escalation-n2` | Escalamiento N2 | `(platform)/escalation-n2/page.tsx` | `escalamiento_n2` | ✅ | `RequirePermission` + canEdit/canApprove |
| `/executive` | Ejecutivo | `(platform)/executive/page.tsx` | `reportes` | ✅ | — |
| `/flow` | Data Flow | `(platform)/flow/page.tsx` | `reportes` | ✅ visual | — |
| `/forecast` | Forecast IA | `(platform)/forecast/page.tsx` | `reportes` | ✅ visual | — |
| `/history` | Historial | `(platform)/history/page.tsx` | `incidentes` | ✅ | backend incidents |
| `/hud` | Arc Reactor | `(platform)/hud/page.tsx` | `reportes` | ✅ visual | — |
| `/integrations` | Integraciones | `(platform)/integrations/page.tsx` | `integraciones` | ✅ | — |
| `/integrations/sap-inbound` | SAP Inbound | `(platform)/integrations/sap-inbound/page.tsx` | `integraciones` | ✅ | tokens + webhooks |
| `/knowledge` | Conocimiento | `(platform)/knowledge/page.tsx` | `conocimiento_rag` | ✅ | RAG real con backend |
| `/knowledge/graph` | KB Graph | `(platform)/knowledge/graph/page.tsx` | `conocimiento_rag` | ✅ visual | — |
| `/knowledge/training` | Entrenamiento IA | `(platform)/knowledge/training/page.tsx` | `entrenamiento_ia` | ✅ | `RequirePermission` |
| `/launchpad` | Launchpad | `(platform)/launchpad/page.tsx` | `reportes` | ✅ visual | — |
| `/meetings` | Reuniones AMS | `(platform)/meetings/page.tsx` | `servicios` | parcial | Requiere Whisper |
| `/mission-control` | Mission Control | `(platform)/mission-control/page.tsx` | `reportes` | ✅ | Wallboard NASA |
| `/playbooks` | Playbooks AMS | `(platform)/playbooks/page.tsx` | `playbooks_ams` | ✅ | `RequirePermission` |
| `/quality-evaluator` | Quality Evaluator | `(platform)/quality-evaluator/page.tsx` | `quality_evaluator` | ✅ | `RequirePermission` |
| `/sap-readonly` | SAP Read-Only | `(platform)/sap-readonly/page.tsx` | `modulos_sap` | parcial | Mock si no hay SAP |
| `/settings` | Configuración | `(platform)/settings/page.tsx` | `configuracion` | ✅ | tenant settings |
| `/support-desk` | Mesa Soporte | `(platform)/support-desk/page.tsx` | `servicios` | ✅ | — |
| `/support-desk/conversations` | Conv. mesa | `(platform)/support-desk/conversations/page.tsx` | `servicios` | ✅ | scrollIntoView interno OK |
| `/support-desk/kanban` | Kanban mesa | `(platform)/support-desk/kanban/page.tsx` | `servicios` | ✅ | — |
| `/support-desk/kb` | KB mesa | `(platform)/support-desk/kb/page.tsx` | `servicios` | ✅ | — |
| `/support-desk/simulator` | Sim. mesa | `(platform)/support-desk/simulator/page.tsx` | `servicios` | ✅ | — |
| `/support-desk/tickets` | Tickets mesa | `(platform)/support-desk/tickets/page.tsx` | `servicios` | ✅ | — |
| `/terminal` | Terminal Bloomberg | `(platform)/terminal/page.tsx` | `reportes` | ✅ visual | — |
| `/testing-intelligence` | Testing Intel | `(platform)/testing-intelligence/page.tsx` | `testing_intelligence` | ✅ | `RequirePermission` + canEdit/canConfigure |
| `/tickets` | Tickets | `(platform)/tickets/page.tsx` | `ticket_command_center` | ✅ | layout shell fixed v0.8.1 |
| `/time-estimator` | Estimador | `(platform)/time-estimator/page.tsx` | `time_estimator` | ✅ | `RequirePermission` |
| `/topology` | Topology | `(platform)/topology/page.tsx` | `reportes` | ✅ visual | — |
| `/tv` | TV Mode | `(platform)/tv/page.tsx` | `reportes` | ✅ | Auto-rotate |
| `/voice-calls` | Canal Telefónico | `(platform)/voice-calls/page.tsx` | `canal_telefonico` | parcial | Twilio mock |
| `/voice-calls/[sid]` | Call detail | `(platform)/voice-calls/[sid]/page.tsx` | `canal_telefonico` | parcial | — |
| `/wallboard` | Wallboard 4K | `(platform)/wallboard/page.tsx` | `reportes` | ✅ visual | — |
| `/war-room` | War Room | `(platform)/war-room/page.tsx` | `reportes` | ✅ visual | — |

**Observación:** las 11 pages migradas a `<RequirePermission>` en v0.8.0
son: time-estimator, quality-evaluator, business-value, agent-readiness,
audit, document-factory, playbooks, knowledge/training,
testing-intelligence, escalation-n2, admin. El resto **NO** está
envuelto explícitamente — depende de filtrado de sidebar para no aparecer.
**Riesgo:** acceso directo por URL a páginas no envueltas no muestra
`AccessLockedCard` ni registra `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`.

---

## 8. Endpoints backend

**24 archivos de routes.** Conteo de handlers `fastify.{get,post,...}`
por archivo:

| Archivo | Handlers |
|---------|----------|
| `training.routes.ts` | 37 |
| `support.routes.ts` | 20 |
| `testing.routes.ts` | 15 |
| `ams-modules.routes.ts` | 14 |
| `escalation.routes.ts` | 13 |
| `agent-lab.routes.ts` | 12 |
| `sap-inbound.routes.ts` | 11 |
| `auth.routes.ts` | 9 |
| `integration.routes.ts` | 9 |
| `ticket.routes.ts` | 9 |
| `ams.routes.ts` | 8 |
| `knowledge.routes.ts` | 8 |
| `sap.routes.ts` | 8 |
| `rbac.routes.ts` | 6 |
| `customer-response.routes.ts` | 5 |
| `voice.routes.ts` | 5 |
| `meeting.routes.ts` | 4 |
| `dashboard.routes.ts` | 4 |
| `scope-items.routes.ts` | 3 |
| `search.routes.ts` | 3 |
| `eval.routes.ts` | 3 |
| `health.routes.ts` | 2 |
| `graph.routes.ts` | 1 |
| `demo.routes.ts` | 1 |
| **Total** | **~210 handlers** |

**Endpoints clave verificados en código:**

| Método | Endpoint | Archivo | Descripción | Conectado desde frontend |
|--------|----------|---------|-------------|--------------------------|
| GET | `/health` | health.routes.ts | Liveness | usado por Sidebar para ping cada 20s |
| GET | `/health/deep` | health.routes.ts | Readiness (DB, Redis, Whisper) | no |
| GET | `/metrics` | (Fastify plugin) | Prometheus | usado por `prometheus` service |
| POST | `/api/auth/login` | auth.routes.ts | login con cookie | `auth.api.ts` |
| GET | `/api/auth/me` | auth.routes.ts | user actual | `AuthContext` |
| POST | `/api/ams/chat` | ams.routes.ts | Chat con agente | `agent.api.ts` |
| POST | `/api/ams/chat/stream` | ams.routes.ts | SSE stream | `agent.api.ts` |
| GET | `/api/ams/incidents` | ams.routes.ts | Historial | `agent.api.ts` |
| GET | `/api/tickets` | ticket.routes.ts | Listado | `tickets.api.ts` |
| POST | `/api/tickets` | ticket.routes.ts | Crear | `CreateTicketModal` |
| POST | `/api/tickets/estimate` | ticket.routes.ts | Autoestimación | `time-estimator` |
| POST | `/api/tickets/:key/classify` | ticket.routes.ts | Clasificar con Gemini | `TicketCommandCenter` |
| POST | `/api/tickets/:key/recalculate` | ticket.routes.ts | Recalcular ETA | `TicketCommandCenter` |
| POST | `/api/tickets/:key/adjust` | ticket.routes.ts | Ajuste manual | `TicketCommandCenter` |
| POST | `/api/tickets/:key/close` | ticket.routes.ts | Cerrar + actualHours | `CloseTicketModal` |
| POST | `/api/tickets/:key/estimate/full` | ticket.routes.ts | Sobrescribir estimación (motor contextual) | `tickets.api.replaceTicketEstimateFull` |
| POST | `/api/knowledge/ingest` | knowledge.routes.ts | Upload + chunking + embeddings | `knowledge.api.ts` |
| POST | `/api/knowledge/search` | knowledge.routes.ts | Búsqueda RAG | `knowledge.api.ts` |
| GET | `/api/quality/snapshot` | ams-modules.routes.ts | Snapshot evaluaciones | `useQualityEvaluator` |
| POST | `/api/quality/evaluations` | ams-modules.routes.ts | Upsert evaluación | `useQualityEvaluator` |
| GET | `/api/customer-responses` | customer-response.routes.ts | Listado por ticket | `customer-responses.api.ts` |
| POST | `/api/customer-responses` | customer-response.routes.ts | Upsert respuesta | `useCustomerResponses` |
| GET | `/api/escalation/snapshot` | escalation.routes.ts | Snapshot N2 | `useEscalation` |
| POST | `/api/escalation/records` | escalation.routes.ts | Escalación nueva | `EscalationQuickAction` |
| POST | `/api/sap/inbound/idoc` | sap-inbound.routes.ts | Webhook SAP entrante | externo |
| GET | `/api/rbac/snapshot` | rbac.routes.ts | Sync RBAC | `useAccessAdmin` (background) |
| GET | `/api/dashboard/advanced` | dashboard.routes.ts | KPIs | `dashboard/page.tsx` |
| POST | `/api/training/upload` | training.routes.ts | Subir entrenamiento | `useAgentTraining` |
| GET | `/api/search/global` | search.routes.ts | Global Intelligence Search | `CommandPalette` |
| GET | `/api/graph` | graph.routes.ts | Knowledge graph | `/knowledge/graph` |

**No verificable sin levantar el stack:** estado de respuesta real de
cada endpoint. Healthchecks de docker-compose son los únicos que validan
liveness en build.

---

## 9. Estado actual de Docker y puertos

### 9.1 Dev unificado (`stack/docker-compose.yml` con `include:`)

**13 contenedores esperados** (según README del stack):

| Container | Puerto host | Estado |
|-----------|-------------|--------|
| `supply-chain-ams-frontend` (legacy NextJS del agent) | **6600** | existe definido — duplicado del platform |
| `supply-chain-ams-backend` (Fastify) | **6601** | ✅ |
| `supply-chain-ams-db` (Postgres + pgvector) | **6602** | ✅ |
| `supply-chain-ams-redis` | **6603** | ✅ |
| `supply-chain-ams-kibana` | **6604** | ✅ |
| `supply-chain-ams-grafana` | **6605** | ✅ |
| `supply-chain-ams-prometheus` | **6609** | ✅ |
| `supply-chain-ams-logstash` | **6610** | ✅ |
| `supply-chain-ams-whisper` (ASR) | **6611** | ✅ |
| `supply-chain-ams-elasticsearch` | **6620** | ✅ |
| `supply-chain-ams-platform` (UI SaaS) | **6700** | ✅ |
| `supply-chain-ams-worker` (BullMQ) | — | ✅ |

> **Pendiente de verificación en runtime:** no se ejecutó `docker compose
> up` en esta sesión. La existencia y configuración de los servicios
> está confirmada en YAML; el comportamiento en runtime no está
> validado hoy.

### 9.2 Producción (`stack/docker-compose.prod.yml`)

Solo expone **80, 443, 443/udp** (vía Caddy). Servicios siempre activos:
`caddy`, `backend`, `platform`, `db`, `redis`, `worker`. Opcionales con
profile: `whisper` (`--profile voice`), `prometheus + grafana`
(`--profile observability`).

Variables env requeridas: §16 del PROJECT_BRIEF y el archivo
`stack/.env.production.example`.

### 9.3 Comandos para levantar local

```bash
# Stack unificado (recomendado para dev)
cd ~/Desktop/supply-chain-ams-stack
docker compose up -d
docker compose ps        # ver 13 contenedores
docker compose logs -f backend platform

# Stop sin perder datos
docker compose down

# Stop limpiando volúmenes (DESTRUYE DB)
docker compose down -v
```

### 9.4 Comandos para rebuild

```bash
docker compose up -d --build --force-recreate backend
docker compose up -d --build --force-recreate platform
```

### 9.5 Comandos para deploy productivo

```bash
# En el VPS
cd /opt/ams/supply-chain-ams-stack
git pull
bash scripts/deploy.sh
```

`deploy.sh` pull + rebuild de agent + rebuild de platform + restart Caddy
si cambió el config.

---

## 10. Estado del motor de estimación

### Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/utils/time-estimation-engine.ts` | Motor **clásico v1** — estima por fases (análisis + dev + test + deploy) |
| `src/utils/contextual-ams-estimation-engine.ts` | Motor **v2 contextual** — usa histórico + ajustes |
| `src/utils/sap-context-detector.ts` | Detecta transacciones, módulos, tablas SAP en el texto del ticket |
| `src/utils/historical-cases-matcher.ts` | Matching de casos parecidos por keywords + módulo |
| `src/utils/estimate-explainability-engine.ts` | Genera factores que subieron/bajaron la ETA |
| `src/utils/contextual-to-ticket-estimate.ts` | Convierte `ContextualEstimationResult` → `TicketEstimate` para persistir |
| `src/utils/contextual-export.ts` | Export Markdown del análisis contextual |
| `src/types/estimation.ts` | Tipos: `ContextualEstimationInput`, `ContextualEstimationResult`, `TicketEstimate`, `PhaseBreakdown` |
| `src/data/ams-estimation-history.ts` | Dataset **30 casos históricos AMS** (módulo, transacción, descripción, horas reales) |
| `src/components/estimation/TimeEstimatorCenter.tsx` | UI de `/time-estimator` |
| `src/components/estimation/ContextualEstimationView.tsx` | View del motor v2 dentro del TCC |
| `src/components/estimation/TicketEstimateDetail.tsx` | Detalle dentro del TCC |
| `src/components/estimation/EstimateExplainabilityCard.tsx` | Card de explicabilidad |
| `src/components/estimation/ManualEstimateAdjustmentModal.tsx` | Ajuste manual humano |
| `src/components/dashboard/EstimationCalibrationTile.tsx` | Tile en `/dashboard` con desviación estimado vs real |
| `src/hooks/useContextualEstimations.ts` | Persiste histórico contextual en localStorage |
| `src/hooks/useTimeEstimator.ts` | Estado del motor clásico |
| `src/services/tickets.api.ts → replaceTicketEstimateFull` | POST `/api/tickets/:key/estimate/full` |
| `scripts/smoke-test-contextual.ts` | Smoke test del motor v2 |

### Características confirmadas en código

- **Dataset 30 casos** ✅ en `ams-estimation-history.ts`.
- **Engine v0.1 mock** ✅ tag commit `b6ccf40 feat(estimation): Contextual AMS Estimation Engine v0.1 (mock)`.
- **20 issue types** y **7 adjustment categories**: declarados en el engine contextual (no auditado el conteo exacto en esta sesión).
- **Variance tracking** ✅ `92fa937 feat(estimation): trackeo estimado vs real al cerrar ticket`. Calcula `varianceHours`, `variancePct`, `withinBand` al cerrar.
- **Bootstrap calibration mode** ✅ `ea1f7c8 feat(estimation): modo BOOTSTRAP + tile dashboard`.
- **Endpoint `/api/tickets/:key/estimate/full`** ✅ commit `02b35bf`.
- **Integración `/time-estimator`** ✅.
- **Integración `/tickets` (TCC)** ✅ Sección "ESTIMACIÓN DE RESOLUCIÓN" + toggle "Análisis contextual v2".
- **Persistencia al ticket** ✅ vía `replaceTicketEstimateFull` con audit `MANUAL_ADJUSTMENT`.
- **Audit trail** ✅ eventos `AUTO_ESTIMATE_GENERATED`, `ESTIMATE_RECALCULATED`, `MANUAL_ADJUSTMENT`, `TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS`.
- **Smoke test** ✅ archivo existe (`scripts/smoke-test-contextual.ts`), pero su última ejecución no fue verificada en esta sesión.

### Limitaciones actuales

- Solo **30 casos** en el dataset → el matching pierde calidad si el ticket
  no encaja con ninguno de los 30.
- Confianza default bajada (LOW por default según commit `8449b1e fix(estimation):
  10 bugs detectados por smoke test`).
- Sin retraining real con tickets cerrados — el `actualHours` se persiste
  pero el dataset no se actualiza automáticamente.

---

## 11. Estado de Intelligence Layer

| Componente | Existe | Archivo | Estado |
|------------|--------|---------|--------|
| Intelligence Core | parcial | `src/intelligence/*.ts` (3 engines) + `src/utils/ams-decision-engine.ts` | sin un módulo central explícito — engines distribuidos por dominio |
| Confidence Engine | **no existe como módulo separado** | confidence aparece en `AgentResponseMetadata.confidence` y en `ContextualEstimationResult.confidence` | sin engine central |
| Memory Layer | **no existe** | — | (RAG sí existe en backend, pero no hay "memory" semántica conversacional cross-incidente en frontend) |
| Feedback Loop | parcial | `agent-lab` routes + `useQualityEvaluator` → `wasUsefulForClient`, `needsHumanReview` | sin loop automático que reentrene el agente |
| Quality Gate (customer response) | ✅ existe | `src/intelligence/customer-response-quality-gate.ts` | 12 reglas (no promesas, no absolutos, no culpar) |
| Knowledge Gap Detector | parcial | `useAgentTraining → gaps` + `CREATE_KNOWLEDGE_GAP` action en `ams-decision-engine` | detecta gaps al consultar el agente sin KB match |
| Learning Queue | **no existe** | — | sin queue explícita |
| Agent Readiness Engine | ✅ existe | `src/utils/agent-readiness-engine.ts` + `AgentReadinessCenter` | score 0-100 por módulo SAP |
| Intelligence Dashboard | parcial | `/agent-readiness` + `/business-value` cubren parte | no hay dashboard "intelligence" unificado |
| Intelligence Panel en TCC | ✅ existe | `N2IntelligenceCard` (sección 8 del TCC) + `KnowledgeCurationCard` (sección 16) | analiza ticket y propone acciones |
| N2 Escalation Intelligence | ✅ existe | `src/intelligence/n2-escalation-intelligence-engine.ts` + `N2IntelligenceCard` | verdict + specialist match + SLA |
| Knowledge Auto-Curation | ✅ existe | `src/intelligence/knowledge-curation-engine.ts` + `KnowledgeCurationCard` + `useKnowledgeCuration` | brilliant score 0-100 al cerrar ticket |
| AMS Decision Engine | ✅ existe | `src/utils/ams-decision-engine.ts` | 18 `AmsRecommendedAction` + 2 confidence levels |
| Customer Response Engine | ✅ existe | `src/intelligence/customer-response-engine.ts` + bloques + templates + quality gate | 6 tipos de respuesta |

### Deuda técnica del Intelligence Layer

- **No hay un "Intelligence Core" unificado** — engines viven en `/intelligence/` y `/utils/` mezclados.
- **No hay Memory Layer cross-ticket** real — la "memoria" actual es solo `useTicketAudit` que persiste eventos por ticket.
- **No hay Learning Queue** — feedback humano queda en `useQualityEvaluator` pero no alimenta retraining.
- **Confidence Engine descentralizado** — cada engine devuelve su propia confidence sin un meta-evaluador.

### Recomendación

Si se quiere consolidar el "Intelligence Layer" como concepto vendible:
crear `src/intelligence/core.ts` con la API unificada
(`analyzeTicket(ticket) → { decision, escalationVerdict, qualityCheck,
curationProposal, readinessScore }`) que delegue a los engines existentes.

---

## 12. Estado de Customer Response Intelligence

### Archivos verificados

| Archivo | Estado |
|---------|--------|
| `src/intelligence/customer-response-engine.ts` | ✅ existe |
| `src/intelligence/customer-response-blocks.ts` | ✅ existe |
| `src/intelligence/customer-response-templates.ts` | ✅ existe |
| `src/intelligence/customer-response-quality-gate.ts` | ✅ existe — 12 reglas según commit `8ffc92c` |
| `src/intelligence/customer-response-jira-export.ts` | ✅ existe — `toJiraComment()` + `toServiceNowWorkNote()` |
| `src/types/customer-response.ts` | ✅ existe |
| `src/hooks/useCustomerResponses.ts` | ✅ existe — localStorage + backend sync |
| `src/services/customer-responses.api.ts` | ✅ existe — backend persistence |
| `src/components/customer-response/GenerateResponseModal.tsx` | ✅ existe |
| `src/components/customer-response/CustomerResponsePreview.tsx` | ✅ existe |
| `src/components/customer-response/QualityGateReport.tsx` | ✅ existe |
| `src/components/customer-response/ResponseHistoryList.tsx` | ✅ existe |
| backend `customer-response.routes.ts` | ✅ 5 endpoints |
| backend tabla `customer_responses` | ✅ commit `eef559c` |

### Tipos de respuesta soportados (`CustomerResponseType`)

`ACKNOWLEDGEMENT` · `STATUS_UPDATE` · `REQUEST_MORE_INFO` · `CLOSURE` ·
`EXPLANATION` · `PROPOSAL`

### Estados (`CustomerResponseStatus`)

`DRAFT` · `REVIEWED` · `APPROVED` · `BLOCKED` · `SENT_MANUAL` · `ARCHIVED`

### Quality Gate

12 reglas según commit `8ffc92c feat(intelligence): trilogía Intelligence
v0.1 — N2 Escalation + KB Curation + Customer Response v0.2`. Las reglas
producen `issues[]` con `severity: "block" | "warn" | "info"` y un `score
0-100`. Si hay un `block` el botón "Enviar" queda deshabilitado.

### Integración con TCC

Sección 15 "RESPUESTA AL CLIENTE" del `TicketCommandCenter`. Botones
rápidos: Acknowledgement, Pedir Info, Update + botón principal "Generar
respuesta cliente" que abre `GenerateResponseModal`.

### Integración con `closeTicket`

✅ commit `CR-F6`. Cuando se cierra un ticket con flag
`extras.generateClosureResponse: true`, se construye automáticamente un
context de respuesta tipo `CLOSURE` y se abre el modal pre-poblado.

### Audit events

Todos registrados como `TicketAuditEventType`:
`CUSTOMER_RESPONSE_GENERATED`, `CUSTOMER_RESPONSE_QUALITY_CHECKED`,
`CUSTOMER_RESPONSE_BLOCKED`, `CUSTOMER_RESPONSE_APPROVED`,
`CUSTOMER_RESPONSE_SAVED`, `CUSTOMER_RESPONSE_SENT_MANUAL`.

### Garantías

- ✅ **No inventa RCA**: el bloque `rootCauseSummary` se llena con datos
  reales pasados al engine (de `extras` del cierre o de campos del ticket).
- ✅ **Adapta audiencia/tono**: parámetros `audience: "EXEC" | "TECH" | "USER"`
  y `tone: "FORMAL" | "CASUAL" | "EMPATHIC"`.
- ✅ **Quality gate bloquea** envíos con frases peligrosas
  ("garantizamos", "siempre", "100%", culpar al cliente, etc).

### Limitaciones

- El engine es **determinístico** — no usa LLM real. Las respuestas son
  plantillas armadas con bloques. Calidad depende de bloques + context.
- Si el TCC pasa contexto pobre, la respuesta sale pobre.

---

## 13. Estado de Quality Evaluator

### Dónde se renderiza

| Lugar | Archivo |
|-------|---------|
| Página `/quality-evaluator` | `(platform)/quality-evaluator/page.tsx` → `QualityEvaluatorCenter` |
| Sección 12 del TCC | `TicketCommandCenter.tsx` → `QualityQuickAction` + `QualityEvaluationsCard` (v0.8.1) |
| Dashboard | `dashboard/page.tsx` consume `quality.metrics.avgAccuracy/Usefulness/...` |

### Cómo obtiene datos

- Hook `useQualityEvaluator` lee primero de `localStorage["…-evaluations"]`.
- En background hidrata con `qualityApi.getSnapshot()` → `GET /api/quality/snapshot`.
- Crea via `qualityApi.upsertEvaluation()` → `POST /api/quality/evaluations`.

### Bug histórico — "1000 evaluaciones renderizadas"

| | |
|---|---|
| **Síntoma** | Sección 12 del TCC mostraba 1000 `<li>` repetidas |
| **Causa** | `ticketEvaluations.map(...)` sin slice. La acumulación venía de demo seeds previos (no de un loop en render) |
| **Estado actual** | **CORREGIDO en v0.8.1** |
| **Fix aplicado** | Nuevo componente `QualityEvaluationsCard` con cap defensivo hard a 20 filas (3 por default, 20 expandido con scroll interno `max-height:220px`). Card global `max-height:360px overflow:hidden` — no empuja TCC. |
| **Helpers nuevos** | `src/utils/quality-evaluator-helpers.ts`: `getQualityEvaluatorSummary`, `getVisibleQualityEvaluations`, `dedupeQualityEvaluations` |
| **Dedupe on-demand** | `useQualityEvaluator.cleanupQualityEvaluatorDemoData()` — botón "Compactar" visible solo si hay duplicados. Nunca corre automático. |

### Verificación en código

- `useEffect` del hook: tienen `cancelled` flag correcto. **No hay loop
  generando datos en cada render.**
- localStorage: cap por convención — pero el JSON puede crecer si la demo
  guiada se corre múltiples veces sin idempotencia.

### Resumen agregado

`QualityEvaluatorCenter` (página) renderiza la métrica completa
(`avgAccuracy`, `avgUsefulness`, etc) + lista filtrable. No tiene cap
similar al de la card del TCC — el cap solo está en la sección embebida.

### Riesgo residual

- La **página `/quality-evaluator`** todavía puede renderizar todas las
  evaluaciones (sin cap). Si hay 1000 en localStorage, se ve mal ahí
  también. **No verificado en runtime en esta sesión.**

---

## 14. Estado de `/tickets` y Ticket Command Center

### Componentes principales

| Componente | Archivo |
|------------|---------|
| Page wrapper | `(platform)/tickets/page.tsx` |
| Lista de tickets | inline en `page.tsx` (no componente extraído) |
| TicketCommandCenter | `src/components/tickets/TicketCommandCenter.tsx` (1403 líneas) |
| Sub-componentes | `TicketNextBestAction`, `TicketReadinessScore`, `CreateTicketModal`, `CloseTicketModal`, `VisualEvidenceUploader`, `VisualAnalysisResultCard`, `TicketQuickActions` |

### 16 secciones detectadas dentro del TCC

1. Header del ticket (id, status, badges, "Decisión AMS", botón "Cerrar")
2. NBA (Next Best Action) + Readiness Score side-by-side
3. Sección "RESUMEN"
4. "ESTIMACIÓN DE RESOLUCIÓN" + Explicabilidad + toggle motor contextual v2
5. "CLASIFICACIÓN AMS · DIAGNÓSTICO" con botón Clasificar (Gemini)
6. "ANÁLISIS VISUAL USADO" (si hay `visualEvidenceNotes`)
7. "CONOCIMIENTO RELACIONADO"
8. "SCOPE ITEMS SAP RELACIONADOS"
9. "PLAYBOOK AMS"
10. "ESCALAMIENTO N2" con `N2IntelligenceCard`
11. "JIRA / SERVICENOW"
12. "DOCUMENTOS DEL TICKET"
13. "TESTING INTELLIGENCE"
14. "QUALITY EVALUATOR" (refactor v0.8.1 con `QualityEvaluationsCard`)
15. "CONVERTIR EN CONOCIMIENTO"
16. "AUDITORÍA · TIMELINE"
17. "RESPUESTA AL CLIENTE" (Customer Response Intelligence)
18. "KB AUTO-CURATION · CANDIDATOS" (si existen)

### Bug histórico — "contenedor de tickets se mueve"

| | |
|---|---|
| **Síntoma** | La lista de tickets subía/bajaba al seleccionar tickets, abrir secciones del TCC, hacer scroll |
| **Causas identificadas** | (1) `scrollIntoView` en `TicketReadinessScore.tsx:23` y `ContextualEstimationView.tsx:93` apuntaban al document, arrastrando todo. (2) `.content` global sin altura aislada — scroll vivía en `<body>`. (3) Grid `1fr 1.4fr` sin `align-items: stretch` — el alto seguía al hijo más alto |
| **Estado actual** | **CORREGIDO en v0.8.1** |
| **Fix aplicado** | Nuevas clases CSS `.tickets-page`, `.tickets-page-body`, `.tickets-page-pane` scoped solo a `/tickets`. Shell ocupa `calc(100vh - 48px)` con `overflow:hidden`. Lista y TCC son paneles independientes con `overflow-y:auto` propio. Los `scrollIntoView` ahora hacen scroll dentro del pane derecho (el ancestro scrollable más cercano), no del document |
| **Responsive** | `<1000px` vuelve a layout vertical normal sin overflow fijo |
| **Componentes intactos** | `TicketReadinessScore` y `ContextualEstimationView` NO fueron tocados — el cambio fue solo de CSS de layout |

### Otras verificaciones

- ✅ `GuidedAmsDemo` usa `ModalPortal` → no empuja layout.
- ✅ `body` ya no scrollea en `/tickets` (shell con `overflow:hidden`).
- ✅ Lista y TCC tienen scroll propio.
- ✅ Sidebar mantiene su scroll propio (`overflow-y: auto` en `.nav`).
- ✅ Header `flex-shrink: 0` + altura estable.
- ✅ Demo guiada no empuja layout (es portal).
- ✅ Modales (`CreateTicketModal`, `CloseTicketModal`, `GenerateResponseModal`) usan `ModalPortal`.

---

## 15. Estado de RBAC / Roles / Permisos

### Componentes detectados

| Capa | Archivo |
|------|---------|
| Tipos | `src/types/rbac.ts` — 26 `PlatformScreen`, 7 `PermissionAction`, `PlatformRole`, `PlatformUser` |
| Engine | `src/utils/rbac.ts` — `hasPermission`, `buildDefaultRoles`, `buildDefaultUsers`, `legacyRoleToCode`, `migrateRolesAddingMissingScreens` |
| Hook único | `src/hooks/usePermissions.ts` — `can / canAny / canAll / canSeeModule / visibleModules / effectiveUser / roleCode` |
| Hook admin | `src/hooks/useAccessAdmin.ts` — CRUD roles + users + audit events |
| Guard de ruta | `src/components/admin/RequirePermission.tsx` — wrapper declarativo |
| Card bloqueado | `src/components/admin/AccessLockedCard.tsx` |
| UI admin | `AdminAccessPanel`, `UserManagement`, `RoleManagement`, `PermissionMatrix`, `AccessPreview`, `RbacAuditLogPanel` |
| Audit RBAC | `src/lib/rbac-audit.ts` — 7 event types, cap 500 |
| Sidebar | `src/components/layout/Sidebar.tsx` — filtra via `canSeeModule`, grupos vacíos ocultos |
| CommandPalette | `src/components/layout/CommandPalette.tsx` — filtra por `isModuleVisible` |

### Roles iniciales (buildDefaultRoles)

`ADMIN` · `SERVICE_LEAD` · `AMS_CONSULTANT` · `CLIENT_USER` · `GENERAL_USER`
(todos `isSystem: true`)

### Persistencia

| Key | Contenido |
|-----|-----------|
| `supply-chain-ams-platform-roles` | `PlatformRole[]` |
| `supply-chain-ams-platform-users` | `PlatformUser[]` |
| `supply-chain-ams-platform-current-user` | id user simulado |
| `supply-chain-ams-rbac-audit-events` | log eventos (cap 500) |

Backend tiene `rbac.routes.ts` (6 endpoints) y la hidratación corre en
background con `rbacApi.getSnapshot()`. **El backend NO enforce permisos
en endpoints sensibles** — la verificación es solo frontend.

### Bug histórico — "menú visible sin permiso"

| | |
|---|---|
| **Síntoma** | Quitar permiso a un rol no ocultaba el módulo del sidebar |
| **Causa** | `Sidebar.tsx` tenía `isAllowed()` con fallback **fail-open** a `canAccess(role, m.rolesAllowed)` cuando `screenForModule(moduleId)` devolvía `null` (mapping incompleto en `src/utils/permissions.ts`) |
| **Estado actual** | **CORREGIDO en v0.8.0** |
| **Fix aplicado** | (1) `ModuleDef` extendido con `permissionKey: PlatformScreen` declarado en cada módulo de `src/lib/modules.ts` — fuente única de verdad. (2) Sidebar refactorizado para usar `usePermissions().canSeeModule(m)`. (3) Módulo sin `permissionKey` Y `public !== true` → **oculto fail-closed**. (4) Grupos sin módulos visibles → grupo oculto. (5) 11 pages migradas a `<RequirePermission>` wrapper. (6) Cards de quick-access en `/welcome` y `/dashboard` filtradas via `can()`. |
| **Audit log nuevo** | `ROLE_PERMISSIONS_UPDATED`, `ROLE_CREATED`, `ROLE_DELETED`, `USER_ROLE_CHANGED`, `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`, `RBAC_OVERRIDE_ACTIVATED`, `RBAC_OVERRIDE_CLEARED` |

### Migración

- ✅ `migrateRolesAddingMissingScreens()` — al cargar de localStorage,
  agrega screens nuevas al `permissions` map de cada role con `noPerm()`
  (fail-closed). Garantiza retrocompatibilidad cuando se añaden screens.

### Riesgos residuales

- ⚠ **38 pages NO envueltas en `<RequirePermission>`.** Solo las 11
  migradas. Las demás dependen de que el sidebar las oculte. Acceso
  directo por URL a una page no envuelta no muestra `AccessLockedCard`
  ni registra `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`.
- ⚠ **Backend NO enforce RBAC.** Cualquier user autenticado puede llamar
  cualquier endpoint. El RBAC es solo cosmético/preventivo.
- ⚠ **localStorage simulación es bypassable** por DevTools — un user
  puede setear `supply-chain-ams-platform-current-user` manualmente y
  pretender ser admin (frontend), aunque el backend mande su cookie real.

---

## 16. Estado de persistencia

| Módulo | Persistencia actual | Riesgo | Recomendación |
|--------|---------------------|--------|---------------|
| Tickets | ✅ **Postgres** (commits `2921237`, `8f4ae58`, `7199e83`) | bajo | OK |
| Estimaciones (clásicas en ticket) | ✅ Postgres como parte del ticket | bajo | OK |
| Estimaciones contextuales v2 (histórico user) | localStorage | medio | mover a backend para multi-device |
| Audit trail por ticket | localStorage cap 1000 | **alto** | mover a backend `audit_logs` |
| RBAC (roles/users/override) | localStorage + sync background a backend | **alto** | enforce en backend |
| RBAC audit events | localStorage cap 500 | **alto** | mover a backend `rbac_audit_log` |
| Quality Evaluator | localStorage + backend `customer_responses`-like tabla | medio | dedupe automático al sync |
| Intelligence memory / cross-ticket | **no existe** | medio | crear cuando se consolide Intelligence Layer |
| Learning Queue | **no existe** | bajo (no es feature aún) | implementar cuando se cierre el loop |
| Customer Responses | ✅ Postgres `customer_responses` (commit `eef559c`) | bajo | OK |
| Playbooks | localStorage + backend `/api/playbooks` (sync) | bajo | OK |
| Knowledge items (RAG) | ✅ Postgres `knowledge_items` con pgvector | bajo | OK |
| Knowledge curation candidates | localStorage | medio | mover a backend al pasar a producción |
| Testing Intelligence (scenarios + evidences) | localStorage | medio | mover a backend; los videos NO se persisten |
| Document Factory | localStorage + backend `/api/documents` | medio | confirmar que backend está poblándose |
| Sidebar prefs (favoritos, colapso) | localStorage | bajo | OK |
| Demo mode state | localStorage | bajo | OK |
| Tenant settings (firma, brand) | localStorage | medio | mover a backend si se aplica a respuestas |
| Sesiones | ✅ Postgres `sessions` + cookie | bajo | OK |

---

## 17. Estado de auditoría

### 17.1 Ticket Audit Trail (`src/types/audit.ts`)

- **39 event types** definidos.
- Por-ticket; key: `ticketId`.
- Persistencia: `localStorage["supply-chain-ams-platform-ticket-audit-events"]` (cap 1000).
- Componentes que lo leen: `TicketAuditTimeline` (dentro del TCC), `GlobalAuditCenter` (`/audit`).
- Hook: `useTicketAudit` con `record()`, `byTicket()`.
- **No tiene backend persistence todavía** — solo localStorage.

### 17.2 RBAC Audit (`src/lib/rbac-audit.ts`)

- **7 event types** definidos.
- Sistema-wide.
- Persistencia: `localStorage["supply-chain-ams-rbac-audit-events"]` (cap 500).
- Visor: `RbacAuditLogPanel` como 5to tab de `AdminAccessPanel`.
- Export JSON disponible.
- **No tiene backend persistence** — solo localStorage.
- **Actor siempre es authUser real**, nunca simulado.

### 17.3 Intelligence events (no log separado)

Los engines `N2IntelligenceCard` y `KnowledgeCurationCard` registran
eventos como `N2_INTELLIGENCE_*` y `KB_CURATION_*` dentro del **ticket
audit log** — no hay log separado.

### 17.4 Customer Response events

`CUSTOMER_RESPONSE_*` también van al ticket audit log.

### 17.5 Eventos `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`

Se registran **una sola vez por (pathname + screen + action + user)** —
hay `loggedRef` en `RequirePermission` que evita duplicados por re-render.

### Limitaciones

- **Persistencia 100% localStorage** — pérdida si user limpia el browser.
- **Sin retención centralizada** — cada user tiene su propio log.
- **Sin SIEM** ni export periódico al backend.
- **Sin alerting** — un atacante que prueba URLs masivamente solo deja
  rastro local en su browser.

---

## 18. Estado de tests

| Tipo | Estado real |
|------|-------------|
| Framework de tests | **NO existe** ni en platform ni en agent. Sin jest, vitest, playwright |
| Carpeta `tests/` o `__tests__/` | **NO existe** en ningún repo |
| Config archivos | Sin `vitest.config.ts`, `jest.config.js`, `playwright.config.ts` |
| Smoke tests platform | ✅ 4 archivos en `scripts/`: `smoke-test-contextual.ts`, `smoke-test-customer-response.ts`, `smoke-test-n2-intelligence.ts`, `debug-auth.ts`. Se ejecutan con `npx tsx scripts/<file>` |
| Smoke contextual 51/51 | mencionado en historia (`scripts/smoke-test-contextual.ts` existe), **no ejecutado en esta sesión** — estado real no verificado hoy |
| Tests backend | **0 archivos** de test |
| Typecheck platform | ✅ ejecutado hoy → exit 0 |
| Typecheck agent | ✅ reportado OK por sub-agent — no re-ejecutado en esta sesión |
| Linter platform | `npm run lint` configurado (`next lint`) — no ejecutado hoy |
| CI workflows | agent tiene `.github/workflows/` (no auditado contenido); platform NO tiene `.github/workflows/` |

### Comandos ejecutados hoy

```bash
# platform
npx tsc --noEmit            # exit 0, sin output

# agent (vía sub-agent Explore)
# typecheck reportado exitoso, no re-ejecutado en sesión principal
```

### Tests faltantes recomendados (no implementados)

- E2E con Playwright para los 5 roles RBAC × las 11 pages migradas.
- Smoke test del Quality Evaluator dedupe (`cleanupQualityEvaluatorDemoData`).
- Smoke test del layout `/tickets` (que `scrollIntoView` no salga del pane).
- Integration test backend que valide los 200+ endpoints con un seed mínimo.
- Unit tests de los engines determinísticos (`/intelligence/`, `/utils/`).

---

## 19. Estado de publicación / producción

| Archivo | Estado |
|---------|--------|
| `stack/docker-compose.prod.yml` | ✅ existe, 7946 bytes, completo con Caddy + healthchecks + volúmenes nombrados |
| `stack/Caddyfile.prod` | ✅ existe, headers de seguridad, HSTS, reverse proxy a `platform:3000` y `backend:8000`, logs rotados |
| `stack/scripts/bootstrap-vps.sh` | ✅ existe, instala docker + ufw + fail2ban en Debian/Ubuntu desde cero |
| `stack/scripts/deploy.sh` | ✅ existe, asume `/opt/ams/` con 3 repos hermanos, pull + rebuild + restart |
| `stack/scripts/backup-db.sh` | ✅ existe, `pg_dump` con retención (default 14 días), cron sugerido `0 3 * * *` |
| `stack/scripts/restore-db.sh` | ✅ existe |
| `stack/scripts/healthcheck.sh` | ✅ existe, valida `AMS_DOMAIN` y `AMS_API_DOMAIN` HTTP |
| `stack/.env.production.example` | ✅ existe, 5029 bytes, todas las variables documentadas |
| TLS / dominios | preparado en Caddyfile — depende de DNS apuntando al VPS |
| Healthchecks | ✅ definidos para `caddy → platform/backend`, `backend → /health`, `db → pg_isready`, `worker → start_period` |
| Logs | acceso via `caddy` rotados; logs de servicios via `docker compose logs`; observability stack opcional |
| Secrets management | basado en `.env` archivo plano en el VPS — sin Vault/SOPS |
| Backups | script existe — **no se ha probado restore real en esta sesión** |

### Variables obligatorias para producir

`AMS_DOMAIN`, `AMS_API_DOMAIN`, `GEMINI_API_KEY`, `POSTGRES_PASSWORD`,
`COOKIE_SECRET`, `JWT_SECRET`, `AMS_BOOTSTRAP_ADMIN_EMAIL`,
`AMS_BOOTSTRAP_ADMIN_PASSWORD`, `CORS_ORIGINS`,
`NEXT_PUBLIC_AGENT_API_URL`.

### Readiness para publicar

| Item | Status |
|------|--------|
| Build platform OK | ✅ typecheck exit 0 |
| Build agent OK | ✅ reportado por sub-agent |
| Docker compose válido | ✅ archivos existen y referencian builds existentes |
| Caddy listo | ✅ |
| Scripts deploy | ✅ |
| **Deploy probado en VPS real** | ❌ **NO** — nunca ejecutado en VPS según commits visibles |
| **Backup/restore probado** | ❌ **NO** — script existe sin run real |
| **DNS / dominios reservados** | desconocido — depende del usuario |
| **Tests pasando** | ⚠ no hay tests |
| **Sentry DSN configurado** | ⚠ código existe, DSN opcional vacío |
| **Bootstrap admin password definido** | ⚠ debe completarse manualmente en `.env` |

### Riesgos productivos identificados

1. **Sin tests automatizados** — deploy a ciegas.
2. **RBAC sin enforcement backend** — protección solo cosmética.
3. **Audit log en localStorage** — pérdida masiva si users limpian browser.
4. **Backup nunca verificado con restore real**.
5. **Sin rate-limit** detectado en Fastify routes (no auditado completo).
6. **Sin CSP estricto** — el Caddyfile tiene CSP comentada como "relajada, apretar después".

---

## 20. Bugs abiertos conocidos

| ID | Bug | Pantalla | Severidad | Estado | Causa probable | Archivo probable | Recomendación |
|----|-----|----------|-----------|--------|----------------|------------------|---------------|
| B-001 | Menú visible sin permiso | Sidebar global | alta | ✅ **CORREGIDO v0.8.0** | Fallback fail-open en `Sidebar.isAllowed()` | `src/components/layout/Sidebar.tsx` | — |
| B-002 | Contenedor tickets se mueve | `/tickets` | media | ✅ **CORREGIDO v0.8.1** | scrollIntoView al document + grid sin altura | `tickets/page.tsx` + `globals.css` | — |
| B-003 | Quality Evaluator muestra 1000 líneas en TCC | `/tickets` sección 12 | media | ✅ **CORREGIDO v0.8.1** | `.map` sin slice | `TicketCommandCenter.tsx` líneas 1224-1243 | — |
| B-004 | `/quality-evaluator` (página dedicada) puede renderizar todas | `/quality-evaluator` | media | ❓ **NO VERIFICADO** | mismo patrón, no auditado | `QualityEvaluatorCenter.tsx` | aplicar mismo cap |
| B-005 | 38 pages no envueltas en RequirePermission | múltiples | media | ⚠ **ABIERTO** | solo 11 migradas en v0.8.0 | múltiples `(platform)/*/page.tsx` | migrar las restantes o aceptar como diseño |
| B-006 | Backend no enforce RBAC | API completa | **alta** | ⚠ **ABIERTO** | RBAC vive en frontend | `agent/backend/src/routes/*` | añadir middleware `requirePermission` |
| B-007 | Audit logs solo en localStorage | `/audit`, admin/audit | media | ⚠ **ABIERTO** | sin tabla backend | `useTicketAudit.ts`, `rbac-audit.ts` | crear tabla `audit_logs` ampliada |
| B-008 | Demo guiada puede duplicar evaluaciones | `/tickets` demo | baja | ⚠ **MITIGADO** parcialmente | seed sin idempotencia full | `GuidedAmsDemo.tsx` | dedupe automático al ejecutar demo |
| B-009 | Frontend legacy `agent/frontend/` deshabilitado pero presente | docker-compose dev | baja | ⚠ **ABIERTO** | quedó del split inicial | `agent/frontend/` | borrar o documentar como deprecated |
| B-010 | `agent/.env` (172 B) existe en disco — riesgo de filtración | local dev | media | ⚠ **VERIFICAR** | archivo en disco, posiblemente con valores | `.gitignore` ya lo cubre — pero confirmar | rotar credenciales si tiene reales |
| B-011 | localStorage excesivo si demo se corre múltiples veces | varios módulos | baja | ⚠ **PARCIALMENTE MITIGADO** | sin guards de idempotencia en demo seeds | `lib/demo/*`, `useDemoMode` | hacer demo idempotente |
| B-012 | Sin rate limit en endpoints sensibles backend | API | media | ⚠ **NO VERIFICADO** | no auditado | `backend/src/server.ts` | agregar `@fastify/rate-limit` |

---

## 21. Deuda técnica

| Área | Deuda | Impacto | Riesgo | Prioridad | Recomendación |
|------|-------|---------|--------|-----------|---------------|
| Tests | **0 tests automatizados** en ambos repos | alto | regresiones invisibles | **P0** | mínimo viable: Playwright × 3 happy paths + smoke tests existentes en CI |
| RBAC backend | enforcement solo frontend | alto | bypass trivial vía DevTools | **P0** | middleware Fastify `requirePermission(screen, action)` en routes sensibles |
| Persistencia | localStorage para audit + RBAC + curation + contextual estimations + testing + (parcial) quality | alto | pérdida de datos + multi-device imposible | **P1** | migrar audit → Postgres como tabla extendida |
| Frontend legacy | `agent/frontend/` duplicado del platform | bajo | confusión + double maintain | **P3** | borrar o marcar `DEPRECATED.md` |
| Mock data | demo seeds sin idempotencia | medio | duplicados acumulativos | **P2** | hash-based guard en seed |
| Backend partial | algunos hooks hidratan en background con fallback silencioso | medio | UX inconsistente cuando backend down | **P2** | banner "modo offline" cuando `/health` falla |
| Observabilidad | Sentry sin DSN configurado, Grafana sin dashboards documentados | medio | troubleshooting prod ciego | **P1** | crear dashboards de basics (req/s, latency, error rate) |
| Seguridad | CSP relajada, sin rate-limit, sin Vault/SOPS para secrets | alto | superficie de ataque amplia | **P1** | apretar CSP + agregar rate-limit + investigar SOPS |
| Modularidad | TCC tiene 1403 líneas — un solo componente | medio | difícil de testear y modificar | **P2** | partir en sub-componentes por sección |
| Performance | sin lazy loading de componentes pesados (Three.js, charts) | medio | bundle inicial grande | **P2** | next/dynamic en visualizaciones |
| UI | inline styles dominantes — sin design tokens | bajo | inconsistencias visuales | **P3** | extraer tokens o adoptar Tailwind |
| Deploy | nunca ejecutado en VPS real | alto | demos en blanco/falla en piloto | **P0** | hacer deploy de pre-prod a VPS sandbox antes de demo cliente |
| Intelligence Layer | engines distribuidos, sin core unificado | medio | difícil de explicar y de extender | **P2** | crear `src/intelligence/core.ts` con API unificada |

---

## 22. Riesgos antes de demo comercial

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Demo inestable (backend timeout, build falla) | media | crítico | levantar stack 24h antes + smoke en orden completo |
| Exceso de módulos confunde al cliente | **alta** | medio | usar `/welcome` con cards filtradas + recorrer solo 6-8 features clave |
| Bugs visuales del layout (heredados) | baja | alto | re-verificar `/tickets`, `/quality-evaluator`, modales con datos reales en demo browser |
| Datos mock evidentes (nombres tipo "MAT-1001") | **alta** | medio | usar dataset demo con nombres del cliente real cuando se sepa |
| IA sin gobierno visible | baja | alto | mostrar quality gate + audit trail + readiness score como diferenciador |
| Estimaciones poco confiables (LOW confidence default) | media | medio | si el cliente pregunta, explicar que es BOOTSTRAP y que mejora con uso |
| Respuestas al cliente inseguras (RCA inventado) | baja | crítico | quality gate de Customer Response evita los bloqueos típicos |
| RBAC visual inconsistente entre roles | baja | alto | smoke test de los 5 roles antes de demo |
| Deploy no probado en VPS real | **muy alta** | crítico | hacer dry-run en VPS sandbox antes del piloto |
| Performance lenta (carga `/welcome` con 6 features) | baja | medio | si pasa, profiling con DevTools y lazy load |
| RBAC bypass por URL directa (38 pages no envueltas) | media | medio | si la demo se hace con admin → no impacto. Si con CLIENT_USER → asegurar URL list cerrada |
| localStorage limpio inesperadamente | media | medio | dedupe + seed idempotente; mostrar al cliente solo después de "reset demo" en `/admin` |

---

## 23. Próximos pasos recomendados

### A. Antes de demo

1. **Smoke test completo de los 5 roles** simulándolos desde `/admin → Vista previa`.
2. Re-verificar `/tickets` con 200+ tickets en backend para validar performance del shell scoped.
3. Auditar `/quality-evaluator` (página dedicada) por mismo problema de cap que se corrigió en TCC (B-004).
4. Levantar stack 24h antes de demo y dejarlo corriendo → captar memory leaks.
5. Definir el "demo path" — 6-8 módulos clave en orden ensayado.

### B. Antes de piloto

6. **Migrar audit logs a backend** (tabla extendida `audit_logs`).
7. **Implementar middleware RBAC backend** — al menos para `POST/PUT/DELETE` en endpoints críticos.
8. **Deploy dry-run en VPS sandbox** ejecutando `bootstrap-vps.sh` + `deploy.sh`.
9. **Verificar backup/restore** con dataset real.
10. **Borrar o documentar `agent/frontend/`** como deprecated.

### C. Antes de producción

11. Tests automatizados Playwright × 5 roles × happy paths.
12. Rate limit + CSP estricto + secrets en Vault/SOPS.
13. SSO Azure AD / Google Workspace (mapeo claims → roleCode).
14. SIEM o export periódico de audit logs.
15. Dashboards Grafana operacionales (latency, error rate, KPIs negocio).

---

## 24. Comandos útiles

### Levantar local (stack unificado)

```bash
cd ~/Desktop/supply-chain-ams-stack
docker compose up -d
docker compose ps
docker compose logs -f backend platform worker
```

### Rebuild

```bash
# Platform
docker compose up -d --build --force-recreate platform

# Agent backend
docker compose up -d --build --force-recreate backend

# Worker
docker compose up -d --build --force-recreate worker
```

### Typecheck

```bash
cd ~/Desktop/supply-chain-ams-platform && npx tsc --noEmit
cd ~/Desktop/supply-chain-ams-agent/backend && npx tsc --noEmit
```

### Smoke tests (platform)

```bash
cd ~/Desktop/supply-chain-ams-platform
npx tsx scripts/smoke-test-contextual.ts
npx tsx scripts/smoke-test-customer-response.ts
npx tsx scripts/smoke-test-n2-intelligence.ts
npx tsx scripts/debug-auth.ts
```

### Verificar endpoints

```bash
curl http://localhost:6601/health
curl http://localhost:6601/health/deep
curl http://localhost:6700                           # Platform
curl http://localhost:6601/api/ams/incidents | jq
```

### Limpiar datos demo (en el browser, DevTools console)

```js
// Solo el demo state
localStorage.removeItem("supply-chain-ams-demo-mode")

// Compactar quality duplicados (mejor: usar botón en TCC)
window.dispatchEvent(new CustomEvent("ams-quality-cleanup-request"))

// Nuclear (PIERDE TODO el RBAC y configs locales)
Object.keys(localStorage).filter(k => k.startsWith("supply-chain-ams"))
  .forEach(k => localStorage.removeItem(k))
location.reload()
```

### Revisar logs

```bash
docker compose logs --tail=200 -f backend
docker compose logs --tail=200 -f platform
docker compose logs --tail=200 -f worker
docker compose logs --tail=200 -f db
```

### Revisar Docker

```bash
docker compose ps
docker stats
docker compose exec db psql -U ams_user -d ams_agent -c "\dt"
docker compose exec redis redis-cli ping
```

### Hacer backup (en VPS)

```bash
cd /opt/ams/supply-chain-ams-stack
bash scripts/backup-db.sh                            # default /var/backups/ams
bash scripts/backup-db.sh /tmp                       # destino custom
```

### Crear tag y branch release

```bash
cd ~/Desktop/supply-chain-ams-platform
git tag -a v0.X.Y -m "v0.X.Y - descripción"
git push origin v0.X.Y

git checkout -b release/v0.X.Y
git push -u origin release/v0.X.Y
```

---

## 25. Checklist de readiness para demo

> Estado al **2026-06-02 21:00 UTC-4**. ⚠ = no verificado en runtime hoy.

| Item | Status hoy |
|------|------------|
| build platform (`tsc --noEmit`) | ✅ exit 0 |
| build agent (`tsc --noEmit`) | ✅ reportado por sub-agent |
| docker compose up (stack unificado) | ⚠ no ejecutado en esta sesión |
| login funcionando | ⚠ no verificado |
| RBAC: sidebar filtra por permiso | ✅ código verificado, runtime ⚠ |
| RBAC: 11 pages envueltas en RequirePermission | ✅ |
| RBAC: 38 pages sin wrapper (acceso vía URL queda visible) | ⚠ |
| menú sin permiso oculto | ✅ fix v0.8.0 |
| /tickets layout estable | ✅ fix v0.8.1 |
| TCC con 16 secciones renderiza | ✅ código verificado |
| Estimador clásico funcionando | ✅ |
| Motor contextual v2 funcionando | ✅ smoke script existe |
| Customer Response: generar respuesta | ✅ engine + UI + integración TCC |
| Quality Evaluator: cap 20 filas en TCC | ✅ fix v0.8.1 |
| Quality Evaluator página dedicada cap | ⚠ no auditado |
| Cierre de ticket captura actualHours | ✅ |
| Audit trail UI renderiza | ✅ |
| RBAC audit log UI (5to tab admin) | ✅ |
| Demo guiada ejecutable | ✅ ModalPortal verificado |
| Datos demo controlados (sin duplicados) | ⚠ depende de no correr demo varias veces sin reset |
| Sin errores en consola browser | ⚠ no verificado en runtime |
| Backend `/health` responde | ⚠ no verificado runtime |
| Gemini real funciona con API key | ⚠ no verificado runtime |
| Jira mock o real | parcial — mock por default |
| 13 contenedores levantan OK | ⚠ no verificado runtime |
| Caddy HTTPS Let's Encrypt | ⚠ NUNCA probado en VPS real |
| Backup/restore | ⚠ NUNCA probado |

**Veredicto:** **listo para demo CONTROLADA en local con guion ensayado** después de validar runtime (1-2h de smoke). **NO listo** para deploy productivo sin ejecutar primero un dry-run en VPS sandbox y resolver al menos los P0 (tests + RBAC backend + deploy probado).

---

**Fin del CURRENT_STATE.** Generado automáticamente a partir de
inspección de los 3 repos. Si algo cambia significativamente,
regenerar con: `regenerá docs/CURRENT_STATE.md`.
