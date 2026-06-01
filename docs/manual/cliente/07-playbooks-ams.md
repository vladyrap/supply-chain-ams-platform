# 📕 Playbooks AMS · Manual cliente

> **Ruta:** `/playbooks` · **Para quién:** todos los roles (viewer+)

## ¿Qué hace?

Biblioteca de **procedimientos operativos AMS** versionados y ejecutables.
Cada playbook es una receta de pasos para resolver un caso recurrente.

Ejemplos típicos:
- Incidente P1 productivo (contención + escalación + comunicación)
- Hypercare go-live (monitoreo intensivo 48-72h)
- RCA estructurado (5 porqués + plan de acción)
- Cutover SAP (lista pre/durante/post)
- Onboarding cliente nuevo

## Estructura de un playbook

| Campo | Para qué |
|---|---|
| Título | Nombre del playbook |
| Descripción | Cuándo aplicarlo |
| Módulo SAP | MM/SD/PP/EWM/etc. (si aplica) |
| Proceso | Procure to Pay, Order to Cash, etc. |
| Severidad | LOW/MEDIUM/HIGH/CRITICAL |
| Trigger when | Condición de activación |
| Steps | Pasos ordenados con descripción + responsable |
| Required data | Qué necesitás antes de empezar |
| Responsible role | AMS_CONSULTANT, SERVICE_LEAD, etc. |
| SLA target (min) | Tiempo máximo total |
| Escalation rules | Cuándo escalar si no resuelve |
| Evidence required | Qué adjuntar al cerrar |
| Communication template | Texto base para comunicar al cliente |
| Related KIs / Scope Items | Conocimiento aplicable |

## Cómo ejecutar un playbook

### Desde la biblioteca `/playbooks`
1. Encontrar el playbook aplicable
2. Click "▶ Ejecutar"
3. Se crea una **execution** con timestamp
4. Marcás cada paso como done a medida que lo hacés
5. Podés agregar notas por paso
6. Click "Completar" cuando terminás (o "Abandonar" si no aplica)

### Desde el ticket (Command Center)
1. En `/tickets`, seleccionar el ticket
2. Sección "PLAYBOOK AMS" → click "📕 Aplicar playbook sugerido"
3. El sistema detecta automáticamente el playbook que coincide con el módulo + título
4. Inicia execution asociada al ticket
5. El checklist se abre como modal
6. Audit trail registra cada paso

## Status de execution

| Status | Significado |
|---|---|
| Active | En curso |
| Completed | Todos los pasos done + cerrada |
| Abandoned | Cerrada sin completar |

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Crear, editar, eliminar, activar playbooks |
| SERVICE_LEAD | Crear, editar, ejecutar |
| AMS_CONSULTANT | Ejecutar, agregar notas |
| CLIENT_USER / GENERAL_USER | Solo ver (si el rol lo permite) |

## Qué se guarda

- `playbooks` (localStorage clave `supply-chain-ams-playbooks`)
- `playbook-runs` (executions con steps marcados, notas, timestamps)

## Limitaciones

- LocalStorage hoy (no DB backend). Migración planeada a Postgres.
- Sin asignación multi-rol por paso (cada playbook tiene un responsable único).
- Sin notificación automática cuando expira el SLA del playbook.
