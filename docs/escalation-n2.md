# Escalamiento Nivel 2

> **Centro de Escalamiento Nivel 2 (Escalamiento N2)**
> Deriva incidentes críticos o complejos al especialista correcto, con trazabilidad, SLA y preparación para Jira o ServiceNow.

## 1. Objetivo

Industrializar la operación AMS Supply Chain SAP: cuando un incidente excede lo que N1 (agente IA + consultor junior) puede resolver, este módulo decide **cuándo escalar**, **a quién**, **por qué canal** y deja **trazabilidad completa**.

Cubre cinco capacidades:

1. Decisión de escalamiento basada en **reglas configurables**.
2. Asignación a una **persona Nivel 2** combinando módulo SAP, cliente, disponibilidad y carga.
3. Generación de **resumen técnico** para N2 y **resumen ejecutivo** para el cliente.
4. **Payloads listos** para Jira y ServiceNow (modo demo por defecto, real con credenciales backend).
5. **Auditoría e historial** con eventos y SLA.

## 2. Flujo de escalamiento

```
incidente (N1)
  │
  ├─ evaluateEscalationRules() — reglas ordenadas por priority
  │
  ├─ regla matchea?  ────  no ── candidato discrecional / no listado
  │       │  sí
  │
  ├─ suggestAssignee() — FIXED_PERSON | BY_MODULE | BY_CLIENT |
  │                     BY_AVAILABILITY | BY_WORKLOAD | ROUND_ROBIN | MANUAL
  │
  ├─ generateEscalationSummary() — resumen técnico para N2
  ├─ generateClientSummary()      — mensaje al cliente (si está habilitado)
  │
  ├─ EscalationModal — operador confirma datos + payload preview
  │
  ├─ createEscalation() → EscalationRecord{ status: REVIEW_REQUIRED | READY_TO_ESCALATE }
  │
  ├─ requiresApproval ?
  │   └─ sí → APPROVAL_REQUESTED → approveEscalation() / rejectEscalation()
  │
  └─ canal:
       ├─ JIRA      → createJiraTicketDemo()       (simula AMS-1234)
       ├─ SERVICENOW → createServiceNowTicketDemo() (simula INC0012345)
       └─ MANUAL    → no toca ningún sistema externo
```

## 3. Matriz de responsables (demo)

| Responsable | Rol | Módulos | Procesos | Disponibilidad |
|-------------|-----|---------|----------|----------------|
| María Fernández  | N2_FUNCTIONAL_CONSULTANT  | MM, ARIBA | Procure to Pay | AVAILABLE |
| Carlos Rivas     | N2_FUNCTIONAL_CONSULTANT  | SD       | Order to Cash | BUSY |
| Daniela Soto     | N2_FUNCTIONAL_CONSULTANT  | PP, QM   | Plan to Produce, QM | AVAILABLE |
| Andrés Molina    | N2_INTEGRATION_SPECIALIST | BTP, INTEGRACION | Integrations | ON_CALL |
| Felipe Torres    | N2_SERVICE_LEAD           | Todos    | Todos | AVAILABLE |

## 4. Reglas demo

| Prioridad | Nombre | Cuándo dispara | Asignación | Canal | SLA |
|-----------|--------|---------------|------------|-------|-----|
| 1 | P1 productivo → Líder N2 | severity = P1 ∧ env = PRD | FIXED → Felipe | JIRA | 30min |
| 2 | MM sin solución → MM specialist | sapModule = MM ∧ noSolutionFound | BY_MODULE | JIRA | 240min |
| 2 | Integración con error técnico | sapModule = INTEGRACION ∧ kw IDoc/API/OData/RFC/CPI | FIXED → Andrés | ServiceNow | 120min |
| 3 | Baja confianza del agente | confidence < 50% | BY_AVAILABILITY | MANUAL | 480min |
| 4 | Incidentes repetidos | repeatedIncident | BY_WORKLOAD | JIRA | 360min |

## 5. Asignación automática

Estrategias soportadas (`AssignmentStrategy`):

- **FIXED_PERSON** — usa `targetUserId`. Si la persona no está activa, fallback a BY_MODULE.
- **BY_MODULE** — filtra responsables cuyo `sapModules` contiene el módulo del incidente; ordena por carga si está habilitado.
- **BY_CLIENT** — filtra por `clients`.
- **BY_AVAILABILITY** — ordena AVAILABLE > ON_CALL > BUSY (descarta OFFLINE / VACATION).
- **BY_WORKLOAD** — ordena por carga relativa (`currentActiveCases / maxActiveCases`).
- **ROUND_ROBIN** — implementado como menor carga relativa entre los de `targetRole`.
- **MANUAL** — no sugiere nadie; el operador asigna.

Se descartan automáticamente responsables `active: false`, `OFFLINE` o `VACATION`.

## 6. Integración Jira (modo demo)

Payload generado por `buildJiraPayload`:

```json
{
  "project":   { "key": "AMS" },
  "issuetype": { "name": "Incident" },
  "summary":   "[P1] MM · MIGO bloqueado, recepciones detenidas",
  "description": "<resumen técnico completo>",
  "priority":  { "name": "Highest" },
  "assignee":  { "accountId": "557058:demo-felipe" },
  "labels":    ["ams", "sap", "nivel2"],
  "components": [{ "name": "SAP MM" }]
}
```

En modo `DEMO` se genera `externalTicketId = AMS-{NNNN}` y URL `https://jira.demo.local/browse/AMS-NNNN`. No se hace ninguna llamada HTTP.

## 7. Integración ServiceNow (modo demo)

Payload generado por `buildServiceNowPayload`:

```json
{
  "short_description": "[P1] MM · MIGO bloqueado",
  "description":       "<resumen técnico completo>",
  "priority":          "1",
  "assignment_group":  "SAP AMS N2",
  "assigned_to":       "user.felipe.demo",
  "category":          "SAP",
  "subcategory":       "Supply Chain"
}
```

En modo `DEMO` se genera `externalTicketId = INC{7-dígitos}` y URL `https://servicenow.demo.local/...`.

## 8. Modo demo

- Por defecto, **todos los conectores arrancan en modo `DEMO`**.
- Los tickets simulados quedan en `EscalationRecord.payload` y `externalTicketUrl`.
- Toda la pantalla muestra el banner amarillo *"modo demo activo · los tickets no se envían a sistemas reales sin confirmación humana y credenciales backend."*

Para cambiar a modo `REAL`:

1. Ir a **Conectores ITSM** → cambiar `mode: REAL`.
2. Marcar `authConfigured` y `apiTokenConfigured` (sólo flags, **no se piden tokens en el frontend**).
3. Las credenciales reales se configuran en el backend con variables de entorno:

```bash
# Jira
JIRA_ENABLED=true
JIRA_MODE=REAL
JIRA_BASE_URL=https://company.atlassian.net
JIRA_PROJECT_KEY=AMS
JIRA_ISSUE_TYPE=Incident
JIRA_USER_EMAIL=ops@company.com
JIRA_API_TOKEN=•••              # ← solo backend

# ServiceNow
SERVICENOW_ENABLED=true
SERVICENOW_MODE=REAL
SERVICENOW_INSTANCE_URL=https://company.service-now.com
SERVICENOW_USERNAME=ams_api
SERVICENOW_TOKEN=•••            # ← solo backend
```

4. El frontend, al detectar `mode = REAL` sin credenciales marcadas, **bloquea** la creación y muestra un aviso.

## 9. Seguridad

- ❌ **Tokens nunca tocan el frontend.** Sólo flags `authConfigured: boolean`.
- ❌ **Tokens nunca se guardan en localStorage.** El UI sólo guarda configuración no-secreta.
- ❌ **Sin confirmación humana, no se envía ticket real**. El modal pide doble confirmación.
- ❌ **No se asigna a personas inactivas.** `active: false` o `OFFLINE` / `VACATION` se filtran.
- ❌ **No se auto-escala** salvo que `allowAutoEscalationInDemo = true` y la regla tenga `requiresApproval = false`.
- ✅ **Auditoría completa**: cada `EscalationRecord` mantiene `events[]` con timestamps y autor.
- ✅ **Payload visible antes de confirmar** — el operador ve exactamente qué se enviaría.
- ✅ **Modo demo siempre identificado** — banner púrpura visible.

## 10. Roadmap backend real

```
POST /api/escalation              ← crea EscalationRecord
POST /api/escalation/:id/approve  ← aprueba (rol SERVICE_LEAD+)
POST /api/escalation/:id/reject
POST /api/escalation/:id/send-jira
POST /api/escalation/:id/send-servicenow
PATCH /api/escalation/:id/status
GET  /api/escalation
GET  /api/escalation/rules
POST /api/escalation/rules
GET  /api/escalation/responsibles
POST /api/escalation/responsibles
```

Tablas Postgres sugeridas:

- `escalation_rules`
- `n2_responsibles`
- `escalation_records`
- `escalation_events` (historial)
- `itsm_connector_config` (sin tokens)

Tokens en `secret manager` o variables de entorno del backend.

## 11. Roadmap SAP Cloud ALM

Estado actual: `FUTURE`. Conector preparado pero no implementado.

- API: SAP Cloud ALM Tasks / Notes / Inbox API (REST).
- Auth: OAuth2 client credentials contra el tenant cliente.
- Mapping:
  - `Incident.priority` → SAP ALM `Priority`.
  - `Incident.sapModule` → SAP ALM `Process / Component`.
  - `Reason` + `Summary` → `Description`.
- Requiere licencia SAP Cloud ALM activa en el cliente.

## 12. Auditoría y aprobación

Cada `EscalationRecord` tiene:

```ts
events: Array<{
  type:
    | "ESCALATION_CREATED" | "APPROVAL_REQUESTED" | "APPROVED" | "REJECTED"
    | "SENT_TO_JIRA" | "SENT_TO_SERVICENOW"
    | "ASSIGNED_TO_N2" | "UPDATED" | "RESOLVED" | "RETURNED_TO_N1";
  at: string;    // ISO timestamp
  by: string;    // userId
  note?: string;
}>
```

El campo `approvedBy` y `approvedAt` se setean cuando un usuario con permiso `approve` ejecuta `approveEscalation()`.

El flujo bloquea automáticamente:

- Envío a Jira/ServiceNow si `status = REVIEW_REQUIRED`.
- Cambio de estado a `RESOLVED_BY_N2` sin que un humano haya marcado el evento.
- Modificación de reglas/responsables/conectores sin permiso `edit` / `configure`.

## RBAC

Pantalla: `escalamiento_n2`. Permisos por rol:

| Rol | view | create | edit | delete | export | configure | approve |
|-----|:----:|:------:|:----:|:------:|:------:|:---------:|:-------:|
| ADMIN          | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SERVICE_LEAD   | ✅ | ✅ | ✅ |  | ✅ | ✅ | ✅ |
| AMS_CONSULTANT | ✅ | ✅ | ✅ |  | ✅ |  |  |
| CLIENT_USER    | ✅ |  |  |  |  |  |  |
| GENERAL_USER   |  |  |  |  |  |  |  |

CLIENT_USER ve sólo sus casos (filtrado en UI por nombre de cliente).

## Storage keys

- `supply-chain-ams-escalation-rules`
- `supply-chain-ams-n2-responsibles`
- `supply-chain-ams-escalation-records`
- `supply-chain-ams-itsm-connectors`
- `supply-chain-ams-escalation-settings`

## Limitaciones de Fase 1

- Frontend-only. Backend mockeable a futuro.
- No hay envío real de tickets. Modo `REAL` queda bloqueado hasta backend con credenciales.
- No hay notificación por email / Teams (canales marcados `EMAIL_FUTURE`, `TEAMS_FUTURE`).
- SAP Cloud ALM en `FUTURE`.
- Detección de "incidente repetido" es heurística simple (mismo cliente + módulo); en backend se hará por embeddings.
