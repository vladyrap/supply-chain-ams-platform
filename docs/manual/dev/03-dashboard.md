# 📊 Dashboard · Manual técnico

## Arquitectura

`src/app/(platform)/dashboard/page.tsx` orquesta:

```
Hooks frontend (localStorage):
  ├─ usePlaybooks
  ├─ useDocumentFactory
  ├─ useQualityEvaluator
  ├─ useAgentTraining
  ├─ useEscalation
  └─ useTestingIntelligence

API backend:
  ├─ fetchAdvanced() → /api/dashboard/advanced  (KPIs principales)
  ├─ listIncidents({ limit: 200 })            (para sección autoestimación)
  └─ implícito via hooks (training metrics)

Engines:
  ├─ calculateBusinessValue()  → USD evitado + horas
  └─ AgentReadinessCenter      → score por módulo SAP
```

## Archivos clave

| Path | Rol |
|---|---|
| `src/app/(platform)/dashboard/page.tsx` | Página principal |
| `src/components/dashboard/HeroCard.tsx` | Hero con saludo + stats |
| `src/components/dashboard/BusinessValueFullCenter.tsx` | Vista completa /business-value |
| `src/components/readiness/AgentReadinessCenter.tsx` | Grid de cards readiness |
| `src/components/ui/KPI.tsx` | KPI card reutilizable |
| `src/components/charts/Donut.tsx`, `Gauge.tsx`, `Heatmap.tsx`, `StackedLine.tsx` | Gráficos SVG sin deps |
| `src/services/dashboard.api.ts` | Cliente HTTP |
| `src/utils/business-value-engine.ts` | calculateBusinessValue() |

## Endpoint `/api/dashboard/advanced`

```ts
interface DashboardAdvanced {
  totals: {
    incidents: number;
    incidentsToday: number;
    incidentsLast7d: number;
    supportConversationsOpen: number;
    supportTicketsActive: number;
    supportTicketsSlaBreaches: number;
    aiResolvedRate: number;       // %
    meetingsDone: number;
    kbApproved: number;
  };
  byModule: Array<{ module: string; count: number }>;
  byConfidence: Array<{ level: string; count: number }>;
  heatmap: number[][];            // [day][hour]
  stackedLine: Array<{ date: string; incidents: number; resolved: number }>;
}
```

Implementado en `backend/src/services/dashboard.service.ts` con queries
agregadas sobre `incidents`, `support_*`, `meetings`, `agent_knowledge`.

## Business Value engine

`src/utils/business-value-engine.ts::calculateBusinessValue(input)`:

```ts
interface BusinessValueInput {
  ticketsAssistedByIa: number;
  rcasGenerated: number;
  meetingMinutesGenerated: number;
  testCasesGenerated: number;
  knowledgeConversions: number;
  avoidedEscalations: number;
  documentsGenerated: number;
  hourlyCostUsd?: number;          // default 60 o env NEXT_PUBLIC_AMS_HOURLY_COST_USD
}
```

Reglas (horas ahorradas por unidad, configuradas en código):

```ts
const RULES = [
  { key: "ticketsAssistedByIa",     minEach: 0.5, maxEach: 2 },
  { key: "rcasGenerated",            minEach: 2,   maxEach: 4 },
  { key: "meetingMinutesGenerated",  minEach: 0.5, maxEach: 1 },
  { key: "testCasesGenerated",       minEach: 1,   maxEach: 3 },
  { key: "knowledgeConversions",     minEach: 0.5, maxEach: 1.5 },
  { key: "avoidedEscalations",       minEach: 2,   maxEach: 6 },
  { key: "documentsGenerated",       minEach: 0.5, maxEach: 2 },
];
```

Output:

```ts
{
  hourlyCostUsd: 60,
  hoursSaved: { min, max },
  costAvoidedUsd: { min, max },
  breakdown: [{ category, count, minHoursEach, maxHoursEach, minHoursTotal, maxHoursTotal }],
  totals: { minHours, maxHours, minCost, maxCost }
}
```

## Agent Readiness engine

`src/utils/agent-readiness-engine.ts::calculateAgentReadiness(input)`:

Score 0-100 por módulo SAP basado en 5 categorías:
- Knowledge publicado (0-35)
- Q&A aprobadas (0-20)
- Casos de prueba (0-15)
- Scope items cubiertos (0-15)
- Sin gaps críticos (0-15)

Estados: LOW <40, MEDIUM 40-64, HIGH 65-84, READY ≥85.

## Variables de entorno

```bash
NEXT_PUBLIC_AMS_HOURLY_COST_USD=60   # override cost
```

## Customización

**Agregar un KPI nuevo:**
1. `backend/src/services/dashboard.service.ts` → agregar query agregada
2. `src/services/dashboard.api.ts` → extender `DashboardAdvanced` type
3. `src/app/(platform)/dashboard/page.tsx` → render KPI con `<KPI label="..." value={...} />`

**Agregar regla de business value:**
1. Editar `RULES` array en `business-value-engine.ts`
2. Editar `BusinessValueInput` type

**Cambiar pesos de Agent Readiness:**
1. `src/utils/agent-readiness-engine.ts::calculateModuleReadiness()`
2. Cambiar los multiplicadores en cada componente

## Gotchas

- `fetchAdvanced()` no tiene caché → si hay miles de incidentes puede tardar 2-3s. Considerar caché Redis.
- `BusinessValueInput.avoidedEscalations` se calcula como `withEstCount - es.metrics.total` — heurística simple.
- Cuando un módulo no tiene scope items definidos en `sap_scope_items`, su componente `scope` del readiness = 0.
