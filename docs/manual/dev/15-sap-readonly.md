# 🏭 SAP Read-Only · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/sap-readonly/page.tsx` | Page con 4 tabs |
| `src/services/sap.api.ts` | Cliente HTTP frontend |
| Backend `services/sap/proxy.service.ts` | Proxy a S/4 con cache |
| Backend `services/sap/odata-client.ts` | Cliente OData v2/v4 |
| Backend `services/sap/cds-views.ts` | Mapping a vistas CDS |
| Backend `routes/sap.ts` | API endpoints |

## Tipos

```ts
interface SapStatus {
  mode: "real" | "demo";
  baseUrlConfigured: boolean;
  reachable: boolean;
  defaultTop: number;
  lastCheckedAt: string;
}

interface PurchaseOrderHeader {
  poNumber: string;
  vendor: string; vendorName: string;
  docDate: string;
  currency: string; totalAmount: number;
  status: "open" | "partially_delivered" | "delivered" | "blocked";
  items?: PurchaseOrderItem[];
}

interface SalesOrderHeader { soNumber, customer, customerName, ... }
interface MaterialMasterRow { matnr, descr, mtype, baseUnit, matGroup, plants[] }
interface StockMovement { mblnr, postingDate, matnr, plant, sloc, moveType, qty, uom }
```

## Endpoints

```
GET /api/sap/status                 → {mode, baseUrlConfigured, reachable, defaultTop}
GET /api/sap/pos?top&material&plant&from&to
GET /api/sap/sos?top&customer&from&to
GET /api/sap/materials?top&plant&type
GET /api/sap/movements?top&matnr&plant&moveType&from&to

GET /api/sap/po/:poNumber           → header + items
GET /api/sap/so/:soNumber           → header + items
GET /api/sap/material/:matnr        → full master with plant data
```

## ENV

```env
SAP_BASE_URL=https://my-s4-tenant.s4hana.cloud.sap
SAP_AUTH=basic                                   # basic | oauth2_client_credentials | none
SAP_USER=AMS_RO_USER
SAP_PASS=...
# o
SAP_OAUTH_TOKEN_URL=https://...
SAP_OAUTH_CLIENT_ID=...
SAP_OAUTH_CLIENT_SECRET=...

SAP_DEFAULT_TOP=50
SAP_QUERY_CACHE_TTL_SEC=30
SAP_DEMO_MODE=false                              # true → devuelve mocks
```

## Vistas CDS mapeadas

| Endpoint | CDS View |
|---|---|
| `/sap/pos` | `ZAMS_PURCHASE_ORDER_HEADER` |
| `/sap/po/:id` | `ZAMS_PURCHASE_ORDER_FULL` |
| `/sap/sos` | `ZAMS_SALES_ORDER_HEADER` |
| `/sap/so/:id` | `ZAMS_SALES_ORDER_FULL` |
| `/sap/materials` | `ZAMS_MATERIAL_MASTER` |
| `/sap/movements` | `ZAMS_STOCK_MOVEMENT` |

## Cache

```sql
CREATE TABLE sap_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sap_cache_hash ON sap_query_cache (query_hash);
CREATE INDEX idx_sap_cache_expires ON sap_query_cache (expires_at);
```

Limpieza vía cron cada 5 min: `DELETE WHERE expires_at < NOW()`.

## Audit

Cada query logueada en `sap_query_audit (user_id, endpoint, params jsonb, response_rows, latency_ms, created_at)`.

## Demo mode

Si `SAP_DEMO_MODE=true` o `!SAP_BASE_URL`:
- Devuelve fixtures de `backend/src/services/sap/fixtures/*.json`
- `status.mode = "demo"`, `reachable = false`

## Seguridad

- Usuario SAP de servicio con rol `Z_AMS_DISPLAY_ONLY` (DISPLAY auth en autorizaciones S_TCODE, S_TABU_DIS, M_BEST_*, M_MATE_*).
- Backend whitelista solo paths conocidos — usuario no puede injectar paths arbitrarios.
- Audit de cada query.
- Rate limit 60 req/min por user.

## Gotchas

- OData v2 vs v4: detect by `$metadata` shape — auto-fallback.
- CDS Views requieren autorización en S/4 (transport con activación).
- Si SAP responde 401 → invalidar token cache + reintentar 1 vez.
- `Top` en OData se mapea a `$top` (v2/v4).
- Filtros por fecha: ISO 8601 → mapeo a `datetime'YYYY-MM-DDTHH:MM:SS'` (v2).

## Roadmap

- Más entidades: HU, batches, BOMs, routings, work centers.
- Búsqueda full-text en material description.
- Export Excel directo.
- Drill-down cruzado (de PO a material → a stock).
- Read-only mode también para SAP B1 / Business One.
- BAPI wrapper para queries más complejas que CDS no cubre.
