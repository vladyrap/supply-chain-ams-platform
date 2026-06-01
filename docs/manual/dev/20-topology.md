# 🌐 Topology · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/topology/page.tsx` | Page con render canvas |
| `src/components/charts/TopologyCanvas.tsx` | React Flow o D3 force layout |
| `src/components/charts/NodeDetailPanel.tsx` | Lateral con detalle |
| `src/services/topology.api.ts` | Cliente HTTP |

## Tipos

```ts
interface TopologyNode {
  id: string;
  label: string;
  type: "s4" | "ecc" | "btp" | "ariba" | "ibp" | "ewm" | "pi_po" | "servicenow" | "external";
  status: "ok" | "degraded" | "down" | "unknown";
  version?: string;
  owner?: string;
  slaPct?: number;
  position?: { x, y };
}

interface TopologyEdge {
  id: string;
  source: string;       // node.id
  target: string;
  protocol: "IDoc" | "OData" | "REST" | "BAPI" | "FILE" | "MQ";
  direction: "in" | "out" | "bidi";
  lastOkAt?: string;
  errors24h?: number;
}
```

## Endpoints

```
GET   /api/topology/nodes
GET   /api/topology/edges
PATCH /api/topology/nodes/:id        → update layout position
POST  /api/topology/heartbeat/:id    → external systems ping
```

## Layout libraries

- `react-flow` para drag interactivo
- `d3-force` para autolayout inicial

## Gotchas

- Position guardada por user (local prefs) o global por tenant.
- Heartbeat opcional — si no llega en X horas → status `unknown`.
- Edges con `errors24h > 10` → marcar como degraded automáticamente.

## Roadmap

- Auto-discovery vía SAP CALM API.
- Animated traffic flow (puntos moviéndose por edges según volumen).
- Time travel ("cómo estaba la topología en fecha Y").
- Embed mode para mostrar al cliente.
