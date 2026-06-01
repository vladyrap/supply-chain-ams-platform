# 💧 Data Flow · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/flow/page.tsx` | Page con canvas |
| `src/components/charts/FlowCanvas.tsx` | Canvas con partículas animadas |
| `src/services/flow.api.ts` | Snapshot de flow stats |

## Datos

```
GET /api/flow/snapshot → {
  nodes: { id, label, throughput24h }[],
  edges: { source, target, volume24h, type }[],
}
```

## Render

Canvas 2D o Three.js. Partículas viajan por edges con velocidad proporcional a volume.

```ts
function animate(ctx) {
  edges.forEach(e => {
    e.particles.forEach(p => {
      p.t += dt * e.speed;
      const { x, y } = lerp(e.source.pos, e.target.pos, p.t);
      ctx.fillRect(x, y, 3, 3);
      if (p.t >= 1) p.t = 0;
    });
  });
}
```

## Gotchas

- Canvas redibujo cada frame — usar requestAnimationFrame.
- Particle count > 500 → fps drop. Limit.
- Snapshot endpoint cached 30s — no realtime real.

## Roadmap

- Realtime via WebSocket.
- Heatmap overlay (zonas con más actividad).
- Click partícula para ver evento individual.
- Time slider (replay últimas 24h aceleradas).
