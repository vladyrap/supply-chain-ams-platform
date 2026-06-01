# 📺 TV Mode · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/tv/page.tsx` | Page con rotador de slides |
| `src/components/command/TvSlideshow.tsx` | Carrusel auto |
| `src/components/command/TvSlideKpi.tsx` | Slide KPI |
| `src/components/command/TvSlideHeatmap.tsx` | Slide heatmap |
| `src/components/command/TvSlideRanking.tsx` | Slide ranking |

## Rotation logic

```ts
const SLIDES = [
  { id: 'kpi', component: KpiSlide, durationMs: 15000 },
  { id: 'p1', component: P1Slide, durationMs: 12000 },
  { id: 'ranking', component: RankingSlide, durationMs: 15000 },
  { id: 'heatmap', component: HeatmapSlide, durationMs: 18000 },
  { id: 'events', component: EventsSlide, durationMs: 20000 },
  { id: 'motivational', component: MotivationalSlide, durationMs: 10000 },
];

const [idx, setIdx] = useState(0);
useEffect(() => {
  if (paused) return;
  const t = setTimeout(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDES[idx].durationMs);
  return () => clearTimeout(t);
}, [idx, paused]);
```

## Gotchas

- Auto fullscreen no funciona sin user interaction — botón "Activar fullscreen" siempre disponible.
- Cada slide debe ser self-contained (no shared state que rompa al cambiar).
- Refresh data cada N slides (typical: cada vuelta completa).

## Roadmap

- Configuración de slides + duración por tenant.
- Slides custom (markdown + variables).
- Múltiples TVs sincronizadas (WebSocket).
- Trigger slides especiales en eventos (P1 crítico → cambio inmediato a slide P1).
