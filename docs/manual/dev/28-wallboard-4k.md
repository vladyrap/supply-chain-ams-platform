# 🖥 Wallboard 4K · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/wallboard/page.tsx` | Page 4K layout |
| `src/components/command/Wallboard4k.tsx` | Grid optimizado |
| `src/components/command/BigKpi.tsx` | KPI XL |

## Layout

```css
.wallboard-4k {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(4, 1fr);
  width: 100vw; height: 100vh;
  background: #000;
  color: #fff;
  font-size: 24px;
  padding: 32px;
  gap: 16px;
}
.big-kpi-value { font-size: 96px; font-weight: 900; }
```

## Refresh

```ts
useEffect(() => {
  const i = setInterval(refresh, 15000);
  return () => clearInterval(i);
}, []);
```

## Gotchas

- Resolución <4K → CSS responsive ajusta pero pierde efecto.
- Cache snapshot del backend 10s para evitar martillazo.
- Modo dark forzado (background #000).

## Roadmap

- Templates 4K configurables por tenant.
- Multi-monitor sync.
- Sponsorship logos rotativos en footer.
