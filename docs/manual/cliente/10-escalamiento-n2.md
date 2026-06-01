# 🚨 Escalamiento N2 · Manual cliente

> **Ruta:** `/escalation-n2` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Centro de escalamiento Nivel 2. Cuando un caso supera la capacidad de N1 (operativo o agente IA), se escala al especialista correcto con todo el contexto.

Cuenta con:
- **Bandeja**: tickets candidatos a escalar (P2+, alertas SLA, baja confianza)
- **Reglas** auto-detect (regla "Incidentes repetidos", "Baja confianza agente", "Crítico PRD")
- **Responsables N2** con skills, módulos cubiertos, max active cases, disponibilidad
- **Asignación inteligente**: mejor responsable según rule + workload + skill match
- **SLA tracking** con due_at + breach alert
- **Conectores ITSM**: Jira / ServiceNow / Manual (email/Slack)
- **Métricas**: % escalado, tiempo a asignación, top responsable, canal más usado
- **Historial** con full audit trail

## Cómo escalar un ticket

### Desde el módulo
1. Tab "Bandeja" muestra candidatos
2. Click "Escalar" en uno
3. Modal con:
   - Motivo (texto libre)
   - Canal (Jira / ServiceNow / Manual)
   - Asignado (sugerido por sistema)
   - SLA target
4. Click "Confirmar"
5. Se crea `EscalationRecord` con código `ESC-2026-001`
6. Si canal es Jira/SN demo → registra audit event (sin envío real hoy)
7. Si Manual → genera email/template
8. El ticket original muestra badge "ESCALATED"

### Desde un ticket (recomendado)
1. Abrir ticket en `/tickets`
2. Sección "Escalamiento N2" → click "🚨 Escalar N2"
3. Mismo modal pero pre-cargado con contexto del ticket + estimación
4. Cuando se crea, la estimación del ticket se copia al `escalation_record.payload`
5. Si N2 ajusta complejidad → ves diff N1↔N2 en el detalle

## Status de escalación

| Status | Significado |
|---|---|
| PENDING_APPROVAL | Requiere aprobación previa |
| ESCALATED | Creada, esperando asignación |
| ASSIGNED_TO_N2 | Asignada a un responsable |
| IN_PROGRESS_N2 | N2 trabajando |
| RESOLVED_BY_N2 | Resuelta |
| RETURNED_TO_N1 | Devuelta por falta de info |
| CANCELLED | Cancelada |

## Reglas de escalación auto-detect

Tab "Reglas": el sistema sugiere escalar si:
- Prioridad Highest + ambiente PRD
- Confianza del agente baja repetida
- SLA cerca del breach
- Patrón "Incidentes repetidos en mismo módulo"
- Falta de evidencia + impacto crítico

Cada regla tiene `assignment_strategy` (round-robin / least-loaded / skill-match).

## Responsables N2

Tab "Responsables": CRUD de especialistas con:
- Nombre, email
- Skills (lista)
- Módulos SAP cubiertos
- Max active cases
- Availability status (Available / Busy / OOO)

El sistema asigna automáticamente al mejor responsable según rule + workload + skills.

## Conectores ITSM

Tab "Conectores": configurar:
- **Jira**: baseUrl + email + API token + projectKey
- **ServiceNow**: instanceUrl + username + token + table
- **Manual**: SMTP para email (NO requiere credenciales externas)

Si están configurados → al escalar se crea el issue real.
Si no → modo demo (audit only).

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo incluyendo aprobar/cancelar |
| SERVICE_LEAD | Crear, asignar, aprobar |
| AMS_CONSULTANT | Crear, ver |
| CLIENT_USER | Ver sus propios casos escalados |
| GENERAL_USER | Sin acceso |

## Qué se guarda

- `escalation_records` (incident_id, escalation_number, status, payload jsonb con estimación, events jsonb con audit)
- `escalation_rules`
- `n2_responsibles`
- `itsm_connectors`
- `escalation_settings`

## Limitaciones

- Conectores ITSM en modo demo si no hay credenciales reales en .env.
- Asignación es por reglas (no ML predictivo).
- Sin notificación push al responsable (solo email si SMTP configurado).
