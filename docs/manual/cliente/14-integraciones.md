# 🔌 Integraciones · Manual cliente

> **Ruta:** `/integrations` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Capa de outbound integration. Disparás eventos desde el AMS (incidente nuevo, escalación, knowledge publicada, etc.) hacia sistemas externos: **Webhook genérico, Slack, Email, o SAP (5 adapters)**.

Con tabs:
- **Destinations** → CRUD de destinos
- **Deliveries** → log de envíos (sent / failed / pending) con payload y respuesta
- **Events** → catálogo de eventos disparables

## Cuándo abrirlo

- Conectar el AMS con SAP Cloud ALM ITSM
- Mandar alertas críticas a un canal Slack del cliente
- Notificar por email a un sponsor cuando hay incidente P1
- Disparar un workflow BTP cuando se aprueba una escalación
- Auditar qué se mandó, cuándo, con qué payload, qué respondió

## Cómo usar

### Crear destination

1. Tab "Destinations" → click "+ Nuevo destino"
2. Completar:
   - **Nombre** (libre)
   - **Tipo**: webhook / slack / email / sap
   - **Filtro de eventos**: `*` (todos) o `incident.created,incident.escalated` (lista)
   - **Activo** sí/no
3. Según tipo:
   - **Webhook**: URL, secret (para firmar HMAC), headers JSON extra
   - **Slack**: URL del incoming webhook + canal opcional
   - **Email**: To, From, prefijo de asunto
   - **SAP**:
     - Adapter: Cloud ALM / S/4 OData / BTP Workflow / PI-PO IDoc / Solution Manager
     - Base URL + path
     - Auth: basic / bearer / OAuth2 client credentials / none
     - Si OAuth2: token URL + clientId + clientSecret
     - Cliente SAP (mandante)
     - Fetch CSRF (si OData requiere x-csrf-token)
     - Body template Markdown (opcional, override del default)
4. Guardar

### Eventos disponibles

| Evento | Cuándo se dispara |
|---|---|
| `incident.created` | Nuevo incidente entrante |
| `incident.escalated` | Incidente escalado a N2 |
| `incident.resolved` | Incidente cerrado |
| `ticket.created` | Ticket nuevo creado en /tickets |
| `ticket.estimated` | Autoestimación completada |
| `knowledge.published` | Item de knowledge publicado |
| `escalation.assigned` | Escalación asignada a N2 |
| `quality.evaluated` | Quality run completado |
| `playbook.completed` | Playbook ejecutado a fin |
| `meeting.summary_ready` | Resumen de reunión generado |

### Deliveries (auditoría)

Tab "Deliveries" muestra cada envío:
- Destination
- Event
- Status (sent / failed / pending)
- HTTP status code
- Request body preview
- Response body preview
- Latency ms
- Timestamp
- Botón "Reintentar"

Filtros por status y por destination.

### Probar destino

1. En la card del destination → click "🧪 Test"
2. Manda un payload de prueba (`event: "test.ping"`)
3. Verás el resultado inmediato + queda en deliveries

### Adapters SAP (detalle)

| Adapter | Uso típico |
|---|---|
| **Cloud ALM Incident** | POST a `/services/api/itsm/v1/incidents` con auth OAuth2 |
| **S/4 OData genérico** | POST a entity OData con CSRF si aplica |
| **BTP Workflow** | Dispara workflow del Workflow Management Service (XSUAA OAuth2) |
| **PI/PO IDoc HTTP** | XML al receiver HTTP de PI/PO (template AmsEvent.xml) |
| **Solution Manager** | SOAP POST al Service Desk WS (CreateNotification) |

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Crear, editar, probar, ver deliveries |
| AMS_CONSULTANT | Ver destinations + deliveries |
| CLIENT_USER | Sin acceso |
| GENERAL_USER | Sin acceso |

## Qué se guarda

Backend Postgres:
- `integration_destinations` (id, name, type, config jsonb, event_filter, active, created_at)
- `integration_deliveries` (id, destination_id, event, status, http_status, request_body, response_body, latency_ms, retry_count, created_at)

Secretos (passwords, bearer tokens) cifrados con la `INTEGRATIONS_SECRET_KEY` del backend.

## Limitaciones

- Hoy outbound only (no recibimos webhooks de SAP/Jira aún)
- Reintentos manuales (sin retry con backoff exponencial automático aún)
- Sin rate limiting por destino
- Templates de payload custom solo en SAP IDoc/Solman; webhook/slack/email usan payload fijo
