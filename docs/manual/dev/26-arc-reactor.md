# ⚛ Arc Reactor · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/components/fx/ArcReactor.tsx` | Componente |
| `src/styles/effects.css` | Keyframes animación |

## API

```tsx
<ArcReactor
  centerLabel="UPTIME"
  centerValue="99.97%"
  rings={3}
  glowColor="#22d3ee"
  size={240}
  pulseSpeedMs={2000}
/>
```

## CSS

```css
@keyframes arc-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes arc-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.arc-ring { animation: arc-rotate 10s linear infinite; }
.arc-ring--reverse { animation: arc-rotate 8s linear infinite reverse; }
.arc-glow { animation: arc-pulse 2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .arc-ring, .arc-glow { animation: none; }
}
```

## Gotchas

- Respect `prefers-reduced-motion`.
- Performance: usar `transform` + `opacity` (GPU accelerated).
- No usar `width/height` animado (CPU expensivo).

## Roadmap

- Variantes de estilo (cyber / organic / minimal).
- Color dinámico según valor central (rojo si bajo).
- Sound design opcional (low hum).
