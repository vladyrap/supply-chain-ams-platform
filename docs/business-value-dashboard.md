# Dashboard de Valor Económico

Sección dedicada en `/dashboard` que convierte la actividad operativa
(tickets asistidos, RCAs, minutas, casos de prueba, conversiones a KB,
escalamientos evitados, documentos) en **horas ahorradas y USD evitados**.

## Componente

Embebido en `src/app/(platform)/dashboard/page.tsx` bajo la sección
"AMS · VALOR GENERADO POR LA PLATAFORMA".

## Engine

`src/utils/business-value-engine.ts` — `calculateBusinessValue(input)`.

## Reglas demo

| Actividad | Horas ahorradas (mín-máx) |
|---|---|
| Tickets asistidos por IA | 0.5 – 2 h |
| RCAs generados | 2 – 4 h |
| Minutas de reunión | 0.5 – 1 h |
| Casos de prueba | 1 – 3 h |
| Tickets convertidos a KB | 0.5 – 1.5 h |
| Escalamientos evitados | 2 – 6 h |
| Documentos generados (factory) | 0.5 – 2 h |

**Costo hora consultor:** `NEXT_PUBLIC_AMS_HOURLY_COST_USD` (default 60).

## Output

```ts
{
  hourlyCostUsd: 60,
  hoursSaved: { min: 32, max: 86 },
  costAvoidedUsd: { min: 1920, max: 5160 },
  breakdown: [
    { category: "Tickets asistidos por IA", count: 47, minHoursTotal: 23.5, maxHoursTotal: 94 },
    // ...
  ],
}
```

## Limitaciones

- Reglas calibradas a ojo. No vienen de un baseline histórico medido.
- Cuenta por totales globales — no segmenta por cliente.

## Roadmap

- Configurable por cliente (override de minEach/maxEach).
- Comparar contra baseline pre-plataforma (ej. "antes el cliente Y resolvía MIGO en 14h promedio, ahora 6h").
- Export del card como PDF para enviar a executive sponsors.
- Métricas adicionales: tiempo promedio hasta N2, tiempo hasta cierre, etc.
