# ROCCO Enterprise Design Language (REDL) v1.0

**Priority: CRITICAL · Status: PERMANENT · Applies to: entire product.**

Toda UI de ROCCO deriva de este sistema. No se crean interfaces por criterio propio.
Romper el Design System se considera un defecto. Este documento tiene prioridad sobre
cualquier default de framework.

Referencias de nivel: IBM, Microsoft Azure, SAP Fiori Horizon, GitHub Enterprise,
Palantir, Datadog, ServiceNow. Nunca: Bootstrap/AdminLTE/Material demo/startup landing.

## Paleta oficial (tema oscuro navy)

| Token | Hex | Uso |
|---|---|---|
| Primary Background | `#0B1F3A` | app, sidebar, nav, paneles grandes, workspace |
| Secondary Surface | `#132B4F` | cards, dialogs, modals, popups, widgets, tablas |
| Primary Action | `#0F62FE` | botones primarios, menú seleccionado, links, iconos, nav activa |
| Hover | `#4589FF` | hover, focus, charts, elementos interactivos |
| Accent | `#78A9FF` | highlights, métricas, charts, indicadores, acciones secundarias |
| Light Surface | `#EAF4FF` | SOLO info boxes / highlights / light cards / ilustraciones |
| Success | `#24A148` | |
| Warning | `#F1C21B` | |
| Error | `#DA1E28` | |
| Text Primary | `#FFFFFF` | |
| Text Secondary | `#C6D6F2` | |
| Borders | `#274C77` | |

**Prohibido:** nuevos azules, colores random, gradientes, neón, glassmorphism, rojos/verdes
brillantes, colores Bootstrap/Tailwind default. Todo deriva de la paleta.

## Implementación (CSS vars en `globals.css :root`)
`--bg #0B1F3A · --bg-panel #0B1F3A · --bg-card #132B4F · --bg-elev-2 #1B3A66 ·
--border #274C77 · --text #FFFFFF · --text-soft #C6D6F2 · --text-dim #8FA6CC ·
--accent #0F62FE · --accent-2 #4589FF · --accent-3 #78A9FF · --light-surface #EAF4FF ·
--ok #24A148 · --warn #F1C21B · --error #DA1E28`. Accent default en `PlatformContext` (chip "cyan" = IBM Blue).

## Tipografía
IBM Plex Sans (alt: Inter). Pesos 400/500/600/700. Nunca fuentes decorativas ni mezclar.

## Spacing / Radius
8px system (8/16/24/32/40/48/64). Radios: cards 12 · buttons 12 · inputs 10 · dialogs 16.

## Componentes
- **Buttons** primary 44px, `#0F62FE`, hover `#4589FF`, texto blanco, sombra muy sutil, radio 12. Secondary: transparente, borde `#78A9FF`. Danger: `#DA1E28`.
- **Inputs** 44px, borde `#274C77`, focus blue glow, placeholder `#C6D6F2`, fondo `#132B4F`.
- **Cards** padding grande, borde suave, sombra mínima, títulos grandes, mucho whitespace.
- **Sidebar** estilo Azure/GitHub Enterprise, iconos a la izquierda, sin gradientes.
- **Tables** header oscuro, filas alternadas, hover, contenedor redondeado, sticky header, badges, paginación, búsqueda, filtros.
- **Modals/Popups** grandes, centrados, header oscuro, padding grande, primario a la derecha, secundario a la izquierda. Nunca dialogs default del browser.
- **Notifications** arriba a la derecha, minimal, animación suave.
- **Charts** estilo Datadog: minimal, sin 3D/sombras, solo colores oficiales.
- **Icons** Lucide o Heroicons, outline. **Nunca emoji ni iconos cartoon.**
- **Loading** skeleton loaders elegantes. Nunca spinners/GIF.
- **Animations** muy sutiles, 200ms, ease-in-out.

## Estado de implementación (roadmap)
- [x] **Fase 1 — Fundación:** design tokens navy REDL, inputs base 44px, auth oscuro, acento IBM Blue. (commit foundation)
- [ ] Fase 2 — Componentes base: botones/cards/sidebar/tablas/modals al 100% REDL, quitar gradientes/glassmorphism, sombras mínimas.
- [ ] Fase 3 — Iconos: reemplazar TODOS los emoji por Lucide/Heroicons outline.
- [ ] Fase 4 — Loading: skeleton loaders. Charts estilo Datadog. Notifications.
- [ ] Fase 5 — Barrido final página por página + validación de consistencia.
