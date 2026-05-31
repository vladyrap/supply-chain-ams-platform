# Global Intelligence Search

Búsqueda unificada accesible con `Ctrl+K` desde cualquier pantalla.
Reutiliza el `CommandPalette` existente (`src/components/command/CommandPalette.tsx`),
extendido con builders adicionales.

## Fuentes indexadas

| Fuente | Builder | Origen |
|---|---|---|
| 🤖 Incidentes (agente) | `buildIncidentSearch` | `/api/ams/incidents?search=q` |
| 🎫 Ticket Mesa | `buildSupportTicketSearch` | `supportApi.listTickets()` |
| 📘 KB curada | `buildSupportKbSearch` | `supportApi.listKb()` |
| 🔎 Semántica unificada | `buildSemanticSearch` | `/api/search/semantic` (RAG) |
| 🎫 Tickets AMS | `buildAmsTicketSearch` | `/api/tickets` (tickets_demo + Jira) |
| 🎯 Scope Items SAP | `buildScopeItemSearch` | `/api/scope-items` |

## Comportamiento

- Se dispara con `Ctrl+K` (registrado en `CommandPaletteContext`).
- A partir de 2 caracteres, los 6 builders corren en paralelo (`Promise.all`).
- Los resultados se mergean con los **comandos estáticos** (navegación, acciones rápidas) y se ordenan por `matchScore`.
- Hint debajo del título muestra metadata útil (módulo, prioridad, score semántico, banda estimada).

## Ejemplo

Buscando `M7 022`:

- 🤖 Incidente "MIGO M7 022 al recibir mercancía" (módulo MM)
- 🎫 AMS-101 — MIGO arroja error M7 022 (Ticket AMS · High)
- 🎯 1A0 — Standard Procure-to-Pay (Scope Item · MM)
- 📘 KB · M7 022 troubleshooting

## Limitaciones

- Los builders de `tickets` y `scope-items` traen el listado completo por request y filtran en memoria (no hacen search server-side). Para >500 elementos por categoría conviene paginar.
- Sin debounce en este momento — el filtrado se dispara en cada keystroke después de los 2 caracteres.

## Roadmap

- Endpoint `/api/global-search?q=...&sources=...` que haga el fan-out backend.
- Inclusión de Playbooks y KnowledgeItems del store frontend cuando viva en DB.
- Atajos por categoría (ej. `t: M7 022` solo busca tickets).
