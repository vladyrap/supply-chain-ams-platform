# 🔌 Integraciones · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/integrations/page.tsx` | Page con tabs Destinations/Deliveries/Events |
| `src/app/(platform)/integrations/sap-inbound/page.tsx` | (futuro) Inbound desde SAP |
| `src/services/integrations.api.ts` | Cliente HTTP |
| Backend `services/integrations.service.ts` | CRUD + dispatch engine |
| Backend `services/integrations/sap-adapters/*.ts` | Adapters por tipo |
| Backend `routes/integrations.ts` | API endpoints |
| Backend `workers/integration-dispatcher.ts` | BullMQ worker que procesa deliveries |

## Tipos

```ts
type DestinationType = "webhook" | "slack" | "email" | "sap";
type SapAdapter = "cloud_alm" | "s4_odata" | "btp_workflow" | "idoc_http" | "solman";

interface IntegrationDestination {
  id: string;
  name: string;
  type: DestinationType;
  eventFilter: string;        // "*" | "incident.created,incident.escalated"
  active: boolean;
  config: DestinationConfig;  // union según type
  createdAt: string; updatedAt: string;
}

type DestinationConfig =
  | { type: "webhook"; url: string; secret?: string; headers?: Record<string,string> }
  | { type: "slack"; url: string; channel?: string }
  | { type: "email"; to: string; from: string; subjectPrefix?: string }
  | { type: "sap"; adapter: SapAdapter; baseUrl: string; path: string;
      auth: { kind: "basic"|"bearer"|"oauth2_client_credentials"|"none"; ... };
      client?: string; fetchCsrf?: boolean; bodyTemplate?: string };

interface IntegrationDelivery {
  id: string;
  destinationId: string;
  event: string;
  status: "sent" | "failed" | "pending";
  httpStatus?: number;
  requestBody: any;
  responseBody?: any;
  latencyMs?: number;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
}
```

## Endpoints

```
GET    /api/integrations/destinations
POST   /api/integrations/destinations
PATCH  /api/integrations/destinations/:id
DELETE /api/integrations/destinations/:id
POST   /api/integrations/destinations/:id/test

GET    /api/integrations/deliveries?status&destinationId&limit
POST   /api/integrations/deliveries/:id/retry

GET    /api/integrations/events    → catálogo
```

## Schema

```sql
CREATE TABLE integration_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('webhook','slack','email','sap')),
  event_filter TEXT NOT NULL DEFAULT '*',
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL,             -- cifrado con KMS si tiene secretos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integration_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES integration_destinations,
  event TEXT NOT NULL,
  status TEXT NOT NULL,
  http_status INT,
  request_body JSONB,
  response_body JSONB,
  latency_ms INT,
  retry_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_dest_status ON integration_deliveries (destination_id, status, created_at DESC);
```

## Dispatch flow

```
EventEmitter
  emit("incident.created", payload)
    → integrationDispatcher.enqueue(event, payload)
      → BullMQ "integrations.dispatch" queue
        → worker:
          1. List active destinations where eventFilter matches event
          2. For each:
             a. Build per-adapter payload
             b. POST con auth headers
             c. Capture status + response + latency
             d. Insert into integration_deliveries
             e. On failure → mark "failed" (sin retry auto hoy)
```

## Adapters SAP

### cloud_alm
```ts
POST {baseUrl}/services/api/itsm/v1/incidents
Headers: Authorization: Bearer <oauth_token>, Content-Type: application/json
Body: {
  Description, ShortText, IncidentCategoryName,
  CreatedByUser, AssignedToUser, RequiredStartDateTime,
  Components: [{ ComponentName: payload.sapModule }]
}
```

### s4_odata
```ts
1. Si fetchCsrf: GET {baseUrl}{path} con header x-csrf-token: fetch → captura token
2. POST {baseUrl}{path} con auth + x-csrf-token + body JSON OData
```

### btp_workflow
```ts
1. OAuth2 client_credentials → {tokenUrl} con client_id/secret de XSUAA
2. POST {baseUrl}/workflow-service/rest/v1/workflow-instances
   Body: { definitionId, context: payload }
```

### idoc_http
```ts
POST {baseUrl}{path} con XML (default AmsEvent.xml o template custom)
```

### solman
```ts
POST {baseUrl}{path} con SOAP envelope
SOAPAction: urn:sap-com:soap:functions:mc-style#ServiceDesk_CreateNotification
```

## HMAC firma webhook

```
X-AMS-Signature: sha256=<hex(hmac_sha256(secret, body))>
X-AMS-Event: incident.created
X-AMS-Timestamp: 2026-06-01T12:00:00Z
```

## Gotchas

- Secrets en `config jsonb` deben cifrarse con `INTEGRATIONS_SECRET_KEY` (AES-256-GCM). NO commitear plaintext.
- CSRF token en OData expira — refetch en cada POST.
- BTP Workflow OAuth2 token TTL ~12h, cachear in-process.
- Filtro `eventFilter` se hace en SQL no en código — `WHERE event_filter = '*' OR event_filter LIKE '%event%'`.
- BullMQ requiere Redis 7 corriendo (puerto 6603).

## Roadmap

- Inbound webhooks (SAP, Jira, ServiceNow disparan eventos hacia el AMS).
- Retry exponencial automático con DLQ.
- Rate limiting por destination.
- Templates por evento + por tipo de destination.
- Connectors marketplace (Teams, Discord, ITSM populares).
