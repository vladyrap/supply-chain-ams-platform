# 🎯 Mission Control · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/mission-control/page.tsx` | Page con grid widgets |
| `src/components/command/MissionWidgets.tsx` | Widgets (KPI, heatmap, alert) |
| `src/components/command/AlertStrip.tsx` | Tira de alertas top |
| `src/components/command/EventStream.tsx` | Stream live de eventos |
| `src/services/mission.api.ts` | `fetchMissionSnapshot()` |

## Snapshot endpoint

```
GET /api/mission-control/snapshot → {
  kpis: { activeTickets, p1Open, slaBreachImminent, ... },
  heatmap: { module: count }[],
  escalationsQueue: EscalationRecord[],
  alerts: Alert[],
  recentEvents: Event[],
  trend: { hour, interactions }[]
}
```

Polling client-side cada 5-10s.

## Gotchas

- Snapshot consolidado de múltiples tablas — query optimization crítica.
- Cache 5s Redis para evitar martillar DB.
- WebSocket roadmap para reemplazar polling.
- Heatmap necesita escala compartida — useMemo para Math.max.

## Roadmap

- WebSocket realtime.
- Widget drag-and-drop.
- Custom layouts por user.
- Embeds compartibles (URL pública read-only).
