# 🧠 Agent Brain · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/brain/page.tsx` | Page con Three.js / R3F |
| `src/components/charts/BrainCanvas.tsx` | Canvas WebGL |
| `src/components/charts/NeuronCluster.tsx` | Cluster por módulo |
| `src/services/brain.api.ts` | Aggregated stats |

## Datos

```ts
GET /api/brain/snapshot → {
  modules: [
    { code: 'MM', kbCount, confidenceAvg, queriesLast24h, topics: [...] },
    ...
  ],
  totalNeurons: number,
  activations: { ts, module, count }[]
}
```

## Render

- `react-three-fiber` + `drei` helpers
- Cada módulo = cluster esférico, radio según kbCount
- Neuronas = small spheres
- Edges = trazas de query (animadas con `useFrame`)
- Color por confianza (HSL: 0 red → 120 green)

## Gotchas

- WebGL context lost en mobile → fallback a static SVG.
- >1000 neuronas → frame rate drop. Limit + lod.
- React Three Fiber requiere `next/dynamic` ssr:false.

## Roadmap

- Real-time activations vía WebSocket.
- Click neurona → drill-down a knowledge item.
- Modos: organic / cyber / neural.
- VR/AR mode (futurístico).
