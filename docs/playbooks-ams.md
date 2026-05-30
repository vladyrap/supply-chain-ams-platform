# Playbooks AMS

## Objetivo
Biblioteca de **procedimientos operativos AMS** estandarizados, ejecutables como checklist en vivo con evidencia, notas y trazabilidad.

## Playbooks demo incluidos
1. Incidente crítico P1 en productivo
2. Error en entrada de mercancía MM (MIGO)
3. Pedido de venta sin pricing SD
4. MRP no genera propuestas PP
5. IDoc detenido en integración
6. Cierre de mes con impacto logístico
7. Hypercare post go-live
8. Escalamiento a Nivel 2
9. Generación de RCA
10. Comunicación formal al cliente

## Modelo `AmsPlaybook`
```ts
{
  id, title, description,
  sapModule, process, severity: "P1" | "P2" | "P3" | "P4",
  triggerWhen, steps: PlaybookStep[],
  requiredData[], responsibleRole,
  slaTargetMinutes, escalationRules,
  evidenceRequired[], communicationTemplate,
  relatedKnowledgeItems[], relatedScopeItems[],
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "NEEDS_REVIEW",
  version, owner, createdAt, updatedAt, tags[]
}
```

## Flujo de ejecución
1. Usuario abre **/playbooks** → ve cards filtrables.
2. Click → modal con detalle.
3. **▶ Usar** → crea una `PlaybookExecution` IN_PROGRESS.
4. Checklist interactivo con notas por paso.
5. **✓ Completar** → solo si todos los pasos están tildados.
6. Historial queda guardado en `kb_training_playbook_executions` (localStorage en Fase 1).

## Roles
| Rol | Permisos |
|---|---|
| ADMIN | full |
| SERVICE_LEAD | view + create + edit + export + approve |
| AMS_CONSULTANT | view + create + edit + export |
| CLIENT_USER | view (gateado por nivel PREMIUM+) |
| GENERAL_USER | sin acceso |

## Storage local
- `supply-chain-ams-playbooks` — catálogo
- `supply-chain-ams-playbook-executions` — ejecuciones

## Roadmap backend
- Fase 2: persistir en Postgres con tabla `ams_playbooks`
- Fase 3: vincular ejecución a `incident_id` real para trazabilidad
- Fase 4: alertas por SLA del playbook excedido
