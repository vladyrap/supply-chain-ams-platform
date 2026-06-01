# 📈 Bloomberg HUD · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/hud/page.tsx` | Page denso |
| `src/components/command/BloombergHud.tsx` | Layout grid |
| `src/components/command/HudPanel.tsx` | Panel reusable |
| `src/components/command/HudTicker.tsx` | Ticker superior |
| `src/hooks/useKeyboardShortcuts.ts` | Hotkeys |

## Layout

```tsx
<div className="hud-grid">
  <Ticker />
  <Panel id="p1" title="P1 ACTIVE" />
  <Panel id="escalations" title="ESC QUEUE" />
  <Panel id="kb" title="KB STATS" />
  <Panel id="voice" title="VOICE" />
  <Panel id="mesa" title="MESA" />
  <Panel id="events" title="EVENTS" />
</div>
```

## Hotkeys

```ts
useKeyboardShortcuts({
  'j': () => navigateDown(),
  'k': () => navigateUp(),
  '/': () => focusSearch(),
  'r': () => refresh(),
  '1': () => focusPanel(0),
  // ...
});
```

## CSS

```css
.hud-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.hud-panel { background: #0a0a0a; color: #00ff88; font-family: monospace; padding: 8px; font-size: 11px; }
.hud-panel table { width: 100%; border-collapse: collapse; }
.hud-panel td { padding: 1px 4px; border-bottom: 1px solid #1a1a1a; }
```

## Gotchas

- Hotkeys conflictan con browser shortcuts (/ usado por search en Chrome). Configurar `preventDefault`.
- Densidad alta requiere font-size 10-11px — accessibility warning.
- Sonidos requieren user interaction primero (browser policy).

## Roadmap

- Configurable layouts (4-up, 6-up, 9-up).
- Drag panels to rearrange.
- Persistent search history.
- Voice command mode.
