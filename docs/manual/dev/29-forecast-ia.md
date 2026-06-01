# 🔮 Forecast IA · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/forecast/page.tsx` | Page con chart + insights |
| `src/components/charts/ForecastChart.tsx` | Recharts line con confidence band |
| `src/services/forecast.api.ts` | Cliente HTTP |
| Backend `services/forecast/forecast.service.ts` | Engine |

## Engine

```ts
interface ForecastRequest {
  metric: "incidents" | "tickets_p1" | "escalations" | "cost_usd";
  module?: string;
  historyDays: 90 | 180 | 365;
  horizonDays: 7 | 14 | 30;
}

interface ForecastResponse {
  history: { date, value }[];
  forecast: { date, predicted, low, high }[];
  insights: string[];
  recommendations: string[];
  anomalies: { date, value, zScore }[];
}
```

Algoritmo:
1. Read history
2. Seasonal decomposition (weekly + monthly seasonality)
3. Linear regression trend
4. Forecast = trend + seasonal
5. Confidence band = ±2 std dev
6. Anomalies = abs(z_score) > 2.5
7. Insights = nlg desde forecast values

## Endpoints

```
POST /api/forecast/compute → ForecastResponse
GET  /api/forecast/snapshots
POST /api/forecast/snapshot   → save current forecast
```

## Cómputo

```ts
function forecast(history, horizon) {
  const trend = linearRegression(history);
  const seasonality = computeWeeklySeasonality(history);
  return Array.from({ length: horizon }, (_, i) => {
    const date = addDays(today, i + 1);
    const dow = date.getDay();
    const trendVal = trend.slope * (history.length + i) + trend.intercept;
    const seasonal = seasonality[dow];
    const predicted = trendVal * seasonal;
    const std = stdDev(history.map(h => h.value));
    return { date, predicted, low: predicted - 2*std, high: predicted + 2*std };
  });
}
```

## Gotchas

- Para tenants nuevos (<30d) → forecast no confiable, UI muestra warning.
- Métricas con outliers (P1 raro) → smoothing previo recomendado.
- Recompute pesado — cache 1h.

## Roadmap

- Prophet/LSTM models for better accuracy.
- External factors input (go-live dates, holidays).
- Causal inference ("si contrato 1 consultor, qué pasa con métricas").
- Slack/email alerts on forecast spikes.
