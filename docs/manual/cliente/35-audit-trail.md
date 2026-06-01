# 🔐 Audit Trail · Manual cliente

> **Ruta:** `/audit` · **Para quién:** ADMIN

## ¿Qué hace?

Registro inmutable de **todo lo que pasó** en el sistema. Quién hizo qué, cuándo, sobre qué entidad, con qué resultado.

Cubre:
- Login / logout
- Cambios en RBAC (alta/baja/edición de users y roles)
- Creación/edición/borrado de entidades (tickets, knowledge, playbooks, escalaciones)
- Cambios de configuración
- Adopción de prompt versions
- Ejecuciones de demo
- Llamadas a integraciones con destinos externos
- Aprobaciones / rechazos

## Cuándo abrirlo

- Auditoría externa (ISO 20000 / SOC 2 / GDPR)
- Investigar incidente de seguridad ("¿quién borró el ticket X?")
- Compliance interno
- Forensics ante reclamo cliente

## Cómo usar

### Filtros

- **Usuario** (búsqueda)
- **Acción** (login / create / update / delete / approve / reject / etc.)
- **Entidad** (ticket / knowledge / role / user / prompt / integration_delivery / etc.)
- **Fecha**: desde / hasta
- **Resultado**: success / failure
- **Texto libre** (matchea contra metadata)

### Listado

Cada row:
- Timestamp UTC + relative
- Usuario (nombre + email)
- IP (si capturado)
- Acción
- Entidad
- Entity ID + link al detalle si la entidad existe
- Resultado badge

Click → modal con detalle:
- Payload before
- Payload after
- Diff (si es update)
- Metadata extra (browser, request id)

### Export

Click "📥 Exportar CSV" del filtro actual → para auditor.

### Retención

Default: 13 meses (rolling year + buffer).

Inmutable: filas NO se pueden editar ni borrar desde UI. Solo cron de retention elimina las más viejas.

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| Otros | Sin acceso |

## Qué se guarda

```sql
audit_log (
  id, ts, user_id, user_email, user_role,
  ip, user_agent,
  action, entity, entity_id,
  result, error_message,
  payload_before jsonb, payload_after jsonb,
  metadata jsonb,
  request_id
)
```

## Limitaciones

- No registra READs (solo writes y eventos clave) — registrar reads inflaria 10x sin valor
- IP capturada si reverse proxy lo manda como X-Forwarded-For
- Sin alertas automáticas en patrones sospechosos (roadmap SIEM integration)
- Retention configurable solo en backend ENV por ahora
