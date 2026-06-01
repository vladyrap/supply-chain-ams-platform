# 🎖 War Room · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/war-room/page.tsx` | Page con tabs (active rooms / history) |
| `src/components/command/WarRoomDashboard.tsx` | Dashboard activo |
| `src/components/command/CommsLog.tsx` | Log turn-by-turn |
| `src/components/command/ActionItemsBoard.tsx` | Kanban de actions |
| `src/services/war-room.api.ts` | Cliente HTTP |

## Tipos

```ts
interface WarRoom {
  id: string;
  ticketId?: string;
  title: string;
  startedAt: string; endedAt?: string;
  participants: { userId, name, joinedAt }[];
  commsLog: { ts, author, message, type }[];
  actionItems: { id, title, owner, status, createdAt, dueAt? }[];
  decisions: { ts, decision, by }[];
  postMortemMd?: string;
}
```

## Endpoints

```
GET   /api/war-rooms                       → active + recent
POST  /api/war-rooms                       → create
PATCH /api/war-rooms/:id                   → update
POST  /api/war-rooms/:id/close             → generate post-mortem
POST  /api/war-rooms/:id/comms             → append message
POST  /api/war-rooms/:id/actions           → add action item
POST  /api/war-rooms/:id/decisions
```

## Post-mortem template

```md
# Post-mortem · {title}

## Resumen
- **Inicio**: {startedAt}
- **Cierre**: {endedAt}
- **Duración**: {duration}
- **Ticket asociado**: {ticketId}

## Timeline
{commsLog formateado por timestamp}

## Decisiones
{decisions list}

## Action items
{actionItems con owner y status}

## Lecciones aprendidas
_(completar)_

## Acciones de prevención
_(completar)_
```

## Gotchas

- Polling 5s — para realtime puro, WebSocket.
- Multiple admins editando log al mismo tiempo → last-write-wins (mejorar con CRDT).
- Post-mortem markdown debe ser archivado (storage permanente) — no perder en cleanup demo.

## Roadmap

- WebSocket realtime sync.
- Video call embed (Daily.co, Whereby).
- Auto-record screen del war room.
- Template post-mortem custom por tenant.
- Slack channel auto-creado.
