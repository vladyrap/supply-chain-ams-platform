# 📊 Vista Ejecutiva · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/executive/page.tsx` | Page con range + KPIs + trend + BarLists |
| `src/services/dashboard.api.ts` | `fetchExecutive(days)`, `fetchUsage(days)` |
| `src/components/ui/KPI.tsx` | Tile con label + value + delta |
| `src/components/ui/BarList.tsx` | Lista horizontal con barras |
| Backend `services/dashboard/executive.service.ts` | Compute KPIs + trend |
| Backend `services/usage/usage.service.ts` | Compute token usage + cost |
| Backend `routes/dashboard.ts` | API endpoints |

## Tipos

```ts
interface DashboardExecutive {
  range: { from: string; to: string; days: number };
  kpis: {
    interactions: number;
    interactionsDelta: number;        // % vs prev period
    resolvedByAi: number;
    resolvedByAiPct: number;
    derivedToHuman: number;
    derivedToHumanPct: number;
    ttfrMinutes: number;
    ttrMinutes: number;
    nps?: number;
  };
  trend: { date: string; interactions: number }[];
  topTopics: { label: string; value: number }[];
  topClients: { label: string; value: number }[];
}

interface UsageSummary {
  range: { from, to, days };
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byProvider: Record<string, { tokensIn, tokensOut, costUsd }>;
  byModel: Record<string, { tokensIn, tokensOut, costUsd }>;
  byFeature: Record<string, { tokensIn, tokensOut, costUsd }>;  // chat/voice/embedding/extraction
}
```

## Endpoints

```
GET /api/dashboard/executive?days=30
GET /api/dashboard/usage?days=30
```

## Queries

```sql
-- interactions
SELECT COUNT(*) FROM incidents WHERE created_at >= $from AND created_at < $to;

-- ttfr / ttr
SELECT
  AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) AS ttfr,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) AS ttr
FROM tickets_demo
WHERE created_at >= $from AND created_at < $to;

-- top topics
SELECT sap_module AS label, COUNT(*) AS value
FROM incidents
WHERE created_at >= $from
GROUP BY sap_module
ORDER BY value DESC
LIMIT 10;

-- usage
SELECT provider, model, feature,
  SUM(tokens_in) AS tokens_in, SUM(tokens_out) AS tokens_out,
  SUM(cost_usd) AS cost_usd
FROM token_usage_logs
WHERE created_at >= $from
GROUP BY provider, model, feature;
```

## Schema usage

```sql
CREATE TABLE token_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT, client_id TEXT,
  provider TEXT, model TEXT,
  feature TEXT,                  -- 'chat' | 'voice' | 'embedding' | 'extraction'
  tokens_in INT, tokens_out INT,
  cost_usd NUMERIC(10, 6),
  conversation_id TEXT, ticket_id TEXT,
  metadata JSONB
);

CREATE INDEX idx_usage_ts ON token_usage_logs (ts DESC);
CREATE INDEX idx_usage_provider_model ON token_usage_logs (provider, model);
```

## Cost computation

```ts
// services/usage/cost-table.ts
const COSTS: Record<string, { in: number; out: number }> = {
  "gemini-2.5-flash": { in: 0.0000003, out: 0.0000012 },     // per token
  "gemini-2.5-pro":   { in: 0.0000035, out: 0.0000105 },
  "gpt-4o":           { in: 0.0000025, out: 0.0000100 },
  "claude-3-5-sonnet":{ in: 0.0000030, out: 0.0000150 },
  // ...
};

function computeCost(model, tokensIn, tokensOut) {
  const c = COSTS[model];
  if (!c) return 0;
  return tokensIn * c.in + tokensOut * c.out;
}
```

## Delta computation

```ts
const currentRange = sumFor($from, $to);
const prevRange = sumFor($from - range, $from);
const delta = ((currentRange - prevRange) / prevRange) * 100;
```

Si prev=0 → delta="+∞" (UI lo muestra como "—").

## Gotchas

- Para tenants grandes (>1M interacciones/mes) cachear KPIs 5 min con Redis.
- `token_usage_logs` crece rápido — particionar por mes + retention 18 meses.
- `cost_usd` se computa AL LOGGEAR — si cambian precios del proveedor, históricos NO se actualizan (correcto).
- NPS opcional — campo `nps_score` en `support_conversations` se llena solo si feature activado.

## Roadmap

- Export PDF/Excel del dashboard.
- Comparativa custom (range A vs range B).
- Forecasting de tokens/costo próximo mes.
- Budget alerts (avisar cuando uso > X% del presupuesto).
- Multi-currency display (USD/EUR/CLP).
- Costo por cliente con margen vs precio contractual.
