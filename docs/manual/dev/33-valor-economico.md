# 💰 Valor Económico · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/business-value/page.tsx` | Page con tiles + BarList + tarifa editor |
| `src/services/business-value.api.ts` | Cliente HTTP |
| `src/utils/business-value-engine.ts` | Cómputo client-side (preview) |
| Backend `services/business-value/value.service.ts` | Cómputo authoritative |
| Backend `routes/business-value.ts` | API |

## Tipos

```ts
interface BusinessValueSettings {
  hourlyRateSenior: number;     // USD
  hourlyRateJunior: number;
  slaBreachPenalty: number;
  auditObservationCost: number;
  onboardingWeeksSaved: number;
}

interface BusinessValueReport {
  range: { from, to, days };
  inputs: BusinessValueSettings;

  direct: {
    aiResolvedHours: number;
    aiResolvedSavingsUsd: number;
    kbAvoidedTickets: number;
    kbAvoidedSavingsUsd: number;
  };
  indirect: {
    slaBreachesAvoided: number;
    slaSavingsUsd: number;
    auditsObservationsAvoided: number;
    auditSavingsUsd: number;
    onboardingSavingsUsd: number;
  };
  totalSavingsUsd: number;
  systemCostUsd: number;
  roiPct: number;       // (savings - cost) / cost * 100

  breakdown: { label: string; value: number }[];
  trend: { date: string; roiPct: number }[];
}
```

## Cálculos

```ts
// Direct
aiResolvedHours = SUM(tickets.resolved_by_ai * estimated_resolution.maxHours)
aiResolvedSavings = aiResolvedHours * hourlyRateSenior

kbAvoidedTickets = COUNT(knowledge_items.usedInResponses) * AVG(deflection_rate)
kbAvoidedSavings = kbAvoidedTickets * 1 hour * hourlyRateSenior

// Indirect
slaBreachesAvoided = COUNT(tickets.sla_met) - baseline_breach_count
slaSavings = slaBreachesAvoided * slaBreachPenalty

auditsObservationsAvoided = COUNT(audits where observations=0) * coefficient
auditSavings = auditsObservationsAvoided * auditObservationCost

onboardingSavings = onboardingWeeksSaved * 40h * hourlyRateJunior * num_new_consultants_period

totalSavings = direct + indirect
systemCost = sum(token_usage_logs.cost_usd in period) + infra_cost_estimate
roi = (totalSavings - systemCost) / systemCost * 100
```

## Endpoints

```
GET   /api/business-value/report?days
GET   /api/business-value/settings
PATCH /api/business-value/settings
POST  /api/business-value/export-executive-md → markdown report
```

## Schema

```sql
CREATE TABLE business_value_settings (
  tenant_id TEXT PRIMARY KEY,
  hourly_rate_senior NUMERIC DEFAULT 75,
  hourly_rate_junior NUMERIC DEFAULT 35,
  sla_breach_penalty NUMERIC DEFAULT 500,
  audit_observation_cost NUMERIC DEFAULT 15000,
  onboarding_weeks_saved NUMERIC DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);
```

## Export markdown

```md
# Valor económico AMS · {tenant} · {periodo}

## Resumen
- **Total ahorrado**: USD {savings}
- **Costo del sistema**: USD {cost}
- **ROI**: {roi}%

## Ahorro directo
- IA resolvió {hours}h × USD {rate}/h = USD {direct1}
- KB evitó {tickets} tickets × USD {rate}/h = USD {direct2}

## Ahorro indirecto
...
```

## Gotchas

- Algunos cálculos requieren baseline (ej. "breach rate antes del sistema") — config opcional, sino se asume 30% baseline conservador.
- `kbAvoidedTickets` es estimación basada en knowledge usage — discutir con cliente antes de presentar.
- ROI muy alto (>500%) es señal de input incorrecto (tarifa demasiado alta o costo muy bajo). UI lo flag.

## Roadmap

- Multi-currency.
- Benchmarking entre tenants (anonymous).
- Forecasting próximo trimestre.
- Integración con QuickBooks/Xero para auto-validar costos.
- "What-if" simulator: "si tarifa fuera USD 100, mi ROI sería X%".
