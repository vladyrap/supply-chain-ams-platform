# 🚀 Launchpad · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/launchpad/page.tsx` | Page con grid |
| `src/components/command/LaunchpadGrid.tsx` | Grid responsive |
| `src/components/command/LaunchpadTile.tsx` | Tile con KPI |

## Estructura

```tsx
const TILES = [
  { id: 'tickets', href: '/tickets', icon: '🎫', label: 'Tickets', category: 'Operación', kpi: { source: 'tickets.active' } },
  { id: 'agent', href: '/agent', icon: '🤖', label: 'Agente IA', category: 'Operación' },
  // ...
];

const CATEGORIES = ['Operación', 'AMS avanzado', 'Visualizaciones', 'Sistema'];
```

## KPI loading

Cada tile con `kpi.source` consulta endpoint:
```
GET /api/launchpad/kpis?sources=tickets.active,knowledge.published,...
→ { 'tickets.active': 23, 'knowledge.published': 142, ... }
```

Bulk para evitar N+1 requests.

## Drag-reorder

`react-dnd` o `@dnd-kit`. Persist order in `user_preferences.launchpadLayout`.

## Gotchas

- Tiles ocultos según RBAC — usar `hasPermission(user, screen, 'view')` antes de render.
- KPI bulk endpoint cached 30s.
- Layout custom + screens nuevas → migration adds tiles al final.

## Roadmap

- Custom tiles (URL externa con favicon).
- Tile groups (folder-like).
- Quick actions inline (sin entrar al módulo).
- Search across content (no solo tile names).
