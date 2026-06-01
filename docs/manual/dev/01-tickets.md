# 🎫 Tickets · Manual técnico

> **Ruta:** `/tickets` (frontend) + `/api/tickets/*` (backend)
> **Para devs:** arquitectura, hooks, endpoints, modelos, patrones de extensión.

## Resumen arquitectónico

```
┌─────────────────────────────────────────────────────────────┐
│  app/(platform)/tickets/page.tsx                            │
│  ┌─────────────────────────────┐ ┌─────────────────────┐    │
│  │ Lista (inline)              │ │ TicketCommandCenter │    │
│  │ - useState selectedKey      │ │ - 14 secciones      │    │
│  │ - listTickets() poll        │ │ - 6 QuickActions    │    │
│  │ - badge ETA por fila        │ │ - NBA + Readiness   │    │
│  └─────────────────────────────┘ └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         │                                    │ usa hooks de TODOS los módulos
         ▼                                    ▼
  services/tickets.api.ts          useDocumentFactory, useEscalation,
         │                          useTestingIntelligence, useQualityEvaluator,
         │ HTTP                     usePlaybooks, useAgentTraining, useTicketAudit
         ▼
  backend/src/routes/ticket.routes.ts
         │
         ▼
  backend/src/controllers/ticket.controller.ts
         │
         ▼
  backend/src/services/ticket.service.ts (Postgres + autoEstimateTicketResolution)
         │
         ▼
  tabla tickets_demo (jsonb estimated_resolution + visual_evidence_notes)
```

## Archivos clave

### Frontend

| Path | Responsabilidad |
|---|---|
| `src/app/(platform)/tickets/page.tsx` | Render principal · lista + toolbar |
| `src/components/tickets/TicketCommandCenter.tsx` | Panel detalle · 14 secciones colapsables |
| `src/components/tickets/TicketNextBestAction.tsx` | Card NBA destacada al tope |
| `src/components/tickets/TicketReadinessScore.tsx` | Card Readiness 0-100 |
| `src/components/tickets/TicketQuickActions.tsx` | (Deprecated · reemplazado por TicketNextBestAction) |
| `src/components/tickets/CreateTicketModal.tsx` | Modal de creación |
| `src/components/tickets/VisualEvidenceUploader.tsx` | Adjunta + analiza imágenes |
| `src/components/tickets/VisualAnalysisResultCard.tsx` | Resultado del análisis visual |
| `src/components/estimation/TicketEstimateDetail.tsx` | Sección estimación |
| `src/components/estimation/EstimateExplainabilityCard.tsx` | Sección explicabilidad ETA |
| `src/components/audit/TicketAuditTimeline.tsx` | Sección audit del ticket |
| `src/components/demo/GuidedAmsDemo.tsx` | Modal demo guiada end-to-end |
| `src/services/tickets.api.ts` | Cliente HTTP |
| `src/utils/ams-decision-engine.ts` | Motor NBA — 15 acciones, 13 reglas |
| `src/utils/ticket-readiness-engine.ts` | Cálculo de score 0-100 |
| `src/utils/estimate-explainability-engine.ts` | Parser de `appliedRules` |
| `src/utils/ticket-factory.ts` | createTicketWithAutoEstimate, recalculate, manualAdjust |
| `src/utils/ticket-to-incident-adapter.ts` | Ticket → IncidentSummary para QuickActions |

### Backend

| Path | Responsabilidad |
|---|---|
| `backend/src/routes/ticket.routes.ts` | Registra 5 endpoints |
| `backend/src/controllers/ticket.controller.ts` | 5 handlers |
| `backend/src/services/ticket.service.ts` | DB schema migration + CRUD + recalc + mirror Jira + seed mocks |
| `backend/src/utils/estimation.ts` | Port liviano del engine (frontend tiene el mismo) |
| `backend/src/services/ticket-estimate.service.ts` | Persistencia de estimaciones para `incidents` |

## Modelo de datos

### Frontend type `Ticket`

```ts
// src/services/tickets.api.ts
export interface Ticket {
  source: "jira" | "mock" | "user";
  key: string;                           // AMS-101, AMS-201, etc.
  title: string;
  description: string;
  status: string;                        // Open / In Progress / Done / etc.
  priority: string;                      // Highest / High / Medium / Low
  reporter: string | null;
  assignee: string | null;
  sapModule?: string | null;
  environment?: string | null;
  created: string;
  updated: string;
  url?: string;                          // link a Jira si aplica
  estimatedResolution?: TicketEstimatedResolution | null;
  visualEvidenceNotes?: VisualEvidenceNote[] | null;
}
```

### Backend tabla `tickets_demo`

```sql
CREATE TABLE IF NOT EXISTS tickets_demo (
  key                   TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'Open',
  priority              TEXT NOT NULL DEFAULT 'Medium',
  reporter              TEXT,
  assignee              TEXT,
  sap_module            TEXT,
  environment           TEXT,
  estimated_resolution  JSONB,
  visual_evidence_notes JSONB,            -- ADD COLUMN IF NOT EXISTS (migración aditiva)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_demo_created ON tickets_demo (created_at DESC);
```

Migración corre al primer `getTickets()` via `ensureTicketsDemoSchema()`.

## Endpoints REST

| Método | Path | Handler | Body | Devuelve |
|---|---|---|---|---|
| GET | `/api/tickets` | `getTickets` | — | `{ success, source, count, tickets[] }` |
| GET | `/api/tickets/provider` | `getProviderStatus` | — | `{ success, jiraConfigured, jiraReachable, source }` |
| POST | `/api/tickets` | `postCreateTicket` | `CreateTicketInput` | `{ success, ticket }` (con estimación) |
| GET | `/api/tickets/:key` | `getTicket` | — | `{ success, ticket }` |
| POST | `/api/tickets/:key/classify` | `postClassifyTicket` | — | `{ success, ticket, classification: { response, model, confidence } }` |
| POST | `/api/tickets/:key/recalculate` | `postRecalculateEstimate` | `{ force?, actor? }` | `{ success, ticket }` |
| PATCH | `/api/tickets/:key/estimate` | `patchManualEstimate` | `{ totalMinHours?, totalMaxHours?, confidence?, complexity?, actor, reason }` | `{ success, ticket }` |

## Flujo de creación end-to-end

```
Usuario → CreateTicketModal.submit()
  ↓
services/tickets.api.ts → createTicket(input)
  ↓ POST /api/tickets
controllers/ticket.controller.ts → postCreateTicket
  ↓
services/ticket.service.ts → createUserTicket(input)
  ↓
  ├─ await ensureTicketsDemoSchema()         // crea tabla + migra columnas
  ├─ key = await nextTicketKey()              // AMS-{counter+1}
  ├─ notes = input.visualEvidenceNotes
  ├─ estimate = buildEstimateForTicket(key, ticketShape, {
  │     ..., visualEvidenceNotes: notes
  │   })
  │     ↓
  │   autoEstimateTicketResolution({
  │     ticketId: key, kind: "incident",
  │     visualAnalysisHints: aggregateVisualHints(notes),  // ← detecta module/process del análisis visual
  │     ...
  │   }) → TicketEstimatedResolution
  └─ INSERT INTO tickets_demo (... estimated_resolution, visual_evidence_notes ...)
  ↓
Response: { success: true, ticket: { ..., estimatedResolution } }
  ↓
Modal cierra, página refresca, ticket aparece en lista con badge ETA
```

## Decision Engine (NBA)

`src/utils/ams-decision-engine.ts::analyzeTicketDecision(ticket, estimate, context)`

```ts
type AmsRecommendedAction =
  | "REQUEST_MORE_INFO" | "SUGGEST_SOLUTION" | "USE_PLAYBOOK"
  | "ESCALATE_N2" | "CREATE_JIRA" | "CREATE_SERVICENOW"
  | "GENERATE_RCA" | "CREATE_TEST_CASE" | "CONVERT_TO_KNOWLEDGE"
  | "CREATE_KNOWLEDGE_GAP" | "CLOSE_WITH_DOCUMENTATION"
  | "WAIT_FOR_USER_CONFIRMATION"
  // v2:
  | "REUSE_PREVIOUS_RESOLUTION" | "SPLIT_INTO_SUBTASKS" | "FOLLOW_UP_WITH_USER";

interface AmsDecisionResult {
  recommendedAction: AmsRecommendedAction;
  shouldAskForMoreData: boolean;
  shouldEscalateN2: boolean;
  // ... 8 flags más
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  nextBestActions: { action, label, reason, weight }[];   // top 6 ordenadas
}
```

### Las 13 reglas

| # | Condición | Acción · peso |
|---|---|---|
| 1 | agentConf=LOW | ESCALATE_N2 · 60 |
| 2 | crítico+PRD | ESCALATE_N2 · 95 + CREATE_JIRA · 80 |
| 3 | missing data ≥2 o sin evidencia | REQUEST_MORE_INFO · 85 |
| 4 | hasPlaybook | USE_PLAYBOOK · 75 |
| 5 | agentConf=HIGH + hasKnowledgeMatch | SUGGEST_SOLUTION · 90 |
| 6 | !hasKnowledgeMatch | CREATE_KNOWLEDGE_GAP · 40 |
| 7 | hasScopeItem && !hasExistingTestCase | CREATE_TEST_CASE · 45 |
| 8 | isResolved | CONVERT_TO_KNOWLEDGE · 80 + CLOSE_WITH_DOC · 60 |
| 9 | isResolved && hasComplexSolution && !hasExistingRca | GENERATE_RCA · 70 |
| 10 | similarPastTicketsCount ≥2 | REUSE_PREVIOUS_RESOLUTION · 55/85 |
| 11 | isPrd && highest && agentConf=LOW && missing≥2 | ESCALATE_N2 · **100** |
| 12 | estimate.totalMaxHours ≥40 | SPLIT_INTO_SUBTASKS · 50 |
| 13 | !isResolved && daysSinceLastUpdate ≥2 | FOLLOW_UP_WITH_USER · 45/70 |

## Readiness Engine

`src/utils/ticket-readiness-engine.ts::calculateTicketReadiness(ticket)`

10 criterios, 100 puntos. Cada criterio tiene `fixHint` + `scrollTargetId`.

Mappers de detección desde texto del ticket o del análisis visual:

```ts
const SAP_TRANSACTION_RX = /\b(MIGO|ME2[123]N?|MIRO|VA0[123]|...)\b/i;
const SAP_DOC_RX = /\b(45\d{8}|\d{10})\b|...;
const ERROR_RX = /\b[a-z]{1,3}\s*\d{2,3}\b|error|fail|...;
```

Lectura cross-source: si el texto no menciona la transacción pero el análisis
visual sí, `hasTransaction` es `true`.

## Explainability Engine

`src/utils/estimate-explainability-engine.ts::buildEstimateExplanation(ticket)`

Parser de `estimate.appliedRules` con formato:

```
"mult_base=1.40 (complex=HIGH sev=HIGH urg=NORMAL env=PRD)"  → base context
"bump:desarrollo +16/+80h"                                    → ↑
"bump:UAT +4/+24h"                                            → ↑
"pct:playbook_-15% x0.85"                                     → ↓
"pct:agente_baja_+30% x1.30"                                  → ↑
"rule:critical_prd_extra_phases"                              → context
```

Output:

```ts
interface EstimateExplanation {
  totalRangeLabel: string;
  confidence: string;
  complexity: string;
  phaseBreakdown: TicketEstimatePhase[];
  increaseFactors: EstimateFactor[];    // ← parsed
  decreaseFactors: EstimateFactor[];    // ← parsed
  assumptions: string[];
  risks: string[];
  missingData: string[];
  calculationSource: string;
  lastCalculatedAt: string;
  manuallyAdjusted: boolean;
  adjustedBy?: string;
  adjustmentReason?: string;
}
```

## Patrones de extensión

### Agregar un campo opcional al ticket

```ts
// 1. Frontend type
// src/services/tickets.api.ts
export interface Ticket {
  // ...
  myNewField?: string | null;
}

// 2. Backend type + tabla + mapper
// backend/src/services/ticket.service.ts
export interface Ticket {
  myNewField?: string | null;
}

// En ensureTicketsDemoSchema:
await query(`ALTER TABLE tickets_demo ADD COLUMN IF NOT EXISTS my_new_field TEXT;`);

// En rowToTicket:
function rowToTicket(r: TicketRow): Ticket {
  return { ..., myNewField: r.my_new_field };
}

// 3. (Opcional) CreateTicketInput si se setea al crear
```

### Agregar una regla nueva al Decision Engine

```ts
// src/utils/ams-decision-engine.ts
export function analyzeTicketDecision(...) {
  // ...

  // Regla v3-14 — Tu nueva condición
  if (miCondicion) {
    actions.push({
      action: "MI_ACCION_NUEVA",     // primero agregar a AmsRecommendedAction
      label: LABELS.MI_ACCION_NUEVA,
      weight: 65,
      reason: "Por qué sugiero esto",
    });
    reasons.push("Razón visible en el panel");
  }
}
```

### Agregar un Audit Event nuevo

```ts
// 1. src/types/audit.ts
export type TicketAuditEventType =
  | "EXISTING_EVENT"
  | "MY_NEW_EVENT";

export const EVENT_LABELS = {
  // ...
  MY_NEW_EVENT: "Mi evento nuevo",
};
export const EVENT_ICONS = { ..., MY_NEW_EVENT: "🎉" };
export const EVENT_COLORS = { ..., MY_NEW_EVENT: "#a855f7" };

// 2. Llamar desde donde corresponda:
audit.record({
  ticketId: ticket.key,
  eventType: "MY_NEW_EVENT",
  title: "Algo pasó",
  actor, source: "ui",
});
```

## Cómo correr local

```bash
# 1. Backend
cd supply-chain-ams-agent/backend
npm install
npm run dev   # :6601

# 2. Frontend
cd supply-chain-ams-platform
npm install
npm run dev   # :6700

# 3. Postgres + Redis vía Docker
cd supply-chain-ams-stack
docker compose up -d db redis

# 4. Abrir
open http://localhost:6700/tickets
```

## Testing

Hoy sin unit tests automáticos del módulo. Smoke manual:

```bash
# Crear ticket
curl -X POST http://localhost:6601/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Description with enough characters","priority":"High","sapModule":"MM","environment":"PRD"}'

# Listar
curl http://localhost:6601/api/tickets | jq '.tickets | length'

# Recalcular
curl -X POST http://localhost:6601/api/tickets/AMS-201/recalculate \
  -H "Content-Type: application/json" -d '{"actor":"test"}'

# Ajuste manual
curl -X PATCH http://localhost:6601/api/tickets/AMS-201/estimate \
  -H "Content-Type: application/json" \
  -d '{"totalMinHours":10,"totalMaxHours":20,"actor":"test","reason":"test"}'
```

## Gotchas conocidos

- **Containing block roto** por `.card { transform + backdrop-filter }`: solucionado con `ModalPortal` / `TcModalShell`. NO usar `position: fixed` inline en modales nuevos.
- **`Content-Type` con body vacío**: el helper `call()` de `services/tickets.api.ts` solo agrega `Content-Type: application/json` cuando hay body. Si copiás el helper, mantené ese guard.
- **Adapter `Ticket → IncidentSummary`**: `EscalationQuickAction`, `KnowledgeQuickActions`, `QualityQuickAction` esperan `IncidentSummary` (shape del agente). Usar `ticketToIncidentLike(ticket)` antes de pasarles el ticket.
- **`useEffect([ticket.id])`**: el `Ticket` no tiene `id`, usa `key`. Cuidado al copy/paste.

## Roadmap pendiente

- Tabla `ticket_audit_events` en Postgres (hoy localStorage).
- Endpoint `/api/integrations/jira/from-ticket/:key` para crear Jira real desde el botón.
- Decision Engine v3 con segunda opinión LLM.
- Tests unitarios e2e con Playwright.
