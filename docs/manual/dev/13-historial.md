# 🗂 Historial de Incidentes · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/history/page.tsx` | Page con filtros + detalle inline |
| `src/services/agent.api.ts` | `listIncidents(filters)` + `getIncident(id)` |
| `src/components/agent/MarkdownView.tsx` | Renderer para `response` |
| `src/components/ui/Badge.tsx` | Badges de módulo/confidence/ambiente |
| `src/components/knowledge/KnowledgeQuickActions.tsx` | Publicar a knowledge desde detalle |
| `src/components/escalation/EscalationQuickAction.tsx` | Escalar N2 desde detalle |
| `src/components/estimation/TicketEstimateBadge.tsx` | Badge en listado |
| `src/components/estimation/TicketEstimateDetail.tsx` | Detalle estimación |
| `src/utils/ticket-factory.ts` | `buildEstimateInputFromIncident`, `recalculateTicketEstimate`, `applyManualAdjustment` |
| Backend `services/incident.service.ts` | Query con filtros |
| Backend `routes/agent.ts` | `GET /api/incidents`, `GET /api/incidents/:id` |
| Backend `routes/incidents.ts` | `PATCH /api/incidents/:id/estimate` (update) |

## API frontend

```ts
listIncidents({
  module?: SapModule;
  environment?: Environment;
  client?: string;
  search?: string;
  hasAttachments?: boolean;
  limit?: number;
}): Promise<{ ok: true; incidents: IncidentSummary[] } | { ok: false; error }>

getIncident(id: string): Promise<{ ok: true; incident: IncidentDetail } | { ok: false; error }>
```

## Tipos

```ts
interface IncidentSummary {
  id: string;
  message: string;
  sap_module: SapModule | null;
  environment: Environment | null;
  client_name: string | null;
  confidence: "alta" | "media" | "baja" | null;
  attachments: { name: string; mimeType: string }[];   // solo metadata
  estimatedResolution?: TicketEstimatedResolution | null;
  created_at: string;
}

interface IncidentDetail extends IncidentSummary {
  response: string | null;
  model: string | null;
  attachments: AttachmentDetail[];      // incluye dataBase64 si consent
  agentMetadata?: AgentMetadata;
  sources?: KnowledgeSource[];
}
```

## Backend query

```ts
// services/incident.service.ts
async function listIncidents({ module, environment, client, search, hasAttachments, limit }) {
  let q = "SELECT id, message, sap_module, environment, client_name, confidence, attachments_meta, estimated_resolution, created_at FROM incidents WHERE 1=1";
  const params = [];
  if (module && module !== "ALL") { q += " AND sap_module = $N"; params.push(module); }
  if (environment) { q += " AND environment = $N"; params.push(environment); }
  if (client) { q += " AND client_name ILIKE $N"; params.push(`%${client}%`); }
  if (search) { q += " AND message ILIKE $N"; params.push(`%${search}%`); }
  if (hasAttachments != null) {
    q += hasAttachments
      ? " AND jsonb_array_length(attachments_meta) > 0"
      : " AND (attachments_meta IS NULL OR jsonb_array_length(attachments_meta) = 0)";
  }
  q += " ORDER BY created_at DESC LIMIT $N";
  params.push(limit ?? 100);
  return pool.query(q, params);
}
```

## Schema

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  response TEXT,
  sap_module TEXT,
  environment TEXT,
  client_name TEXT,
  confidence TEXT,
  model TEXT,
  attachments_meta JSONB DEFAULT '[]',     -- {name, mimeType, size}[]
  attachments_data JSONB DEFAULT '[]',     -- {dataBase64}[] solo si consent
  estimated_resolution JSONB,              -- TicketEstimatedResolution
  agent_metadata JSONB,                    -- {version, kbVersion, prompt, latencyMs, tokensIn, tokensOut}
  sources JSONB DEFAULT '[]',              -- KnowledgeSource[] usados para responder
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_created ON incidents (created_at DESC);
CREATE INDEX idx_incidents_module_env ON incidents (sap_module, environment);
CREATE INDEX idx_incidents_search ON incidents USING gin (to_tsvector('spanish', message));
```

## Update estimación

```
PATCH /api/incidents/:id/estimate
Body: { estimatedResolution: TicketEstimatedResolution }
```

Usado por `TicketEstimateDetail` cuando el usuario recalcula o ajusta.

## Backfill on-read

Si un incidente histórico no tiene `estimated_resolution`, el detalle lo calcula en cliente con `buildEstimateInputFromIncident(incident)` + `autoEstimateTicketResolution()` y ofrece "Guardar" para persistirlo.

## Gotchas

- Filtro `search` usa ILIKE — para >1M filas migrar a tsvector + GIN index real.
- `attachments_data` puede crecer rápido — políticas de retención pendientes (TTL 90d).
- `IncidentDetail` solo manda `dataBase64` si `attachment.consent === true`.
- El listado NO filtra por usuario, solo por filtros visibles. RBAC se controla a nivel page (CLIENT_USER ve solo sus propios — falta enforcement backend).

## Roadmap

- Paginación cursor + infinite scroll.
- Export CSV/Excel del filtro actual.
- Búsqueda full-text con scoring.
- Enforcement backend: CLIENT_USER no ve incidentes de otros tenants.
- TTL automático para `attachments_data`.
- Heatmap timeline (incidentes por hora del día / día de semana).
