# 🛠 Administración · Manual cliente

> **Ruta:** `/admin` · **Para quién:** ADMIN

## ¿Qué hace?

Panel central de administración. Cubre:

- **Users**: CRUD, activar/desactivar, asignar role, ver último login, force logout
- **Roles**: CRUD roles custom, definir permisos por (pantalla × acción)
- **Asignaciones**: asignar role a user, gestionar service level (BASIC/STANDARD/PREMIUM/ENTERPRISE)
- **Invitaciones**: enviar invites por email con link único
- **Mantenimiento**: re-indexar embeddings, limpiar cache, regenerar seeds demo, vacuum DB
- **Backups**: descargar dump DB, restore (con confirmación)
- **Plantillas**: editar templates de emails (welcome, invitation, alert)
- **Sub-página /admin/eval**: Evaluador IA (ver carpeta `eval/`)

## Cuándo abrirlo

- Onboarding cliente nuevo → crear users + asignar roles
- Cambio organizacional → reasignar permisos
- Compliance audit → exportar lista de users + roles
- Mantenimiento mensual → re-index + cleanup
- Backup pre-deploy

## Cómo usar

### Tab Users

Tabla con:
- Nombre, email, role, service level
- Status (ACTIVE / INACTIVE / PENDING_INVITE)
- Last login
- Acciones: editar, desactivar, force logout, reset password

Crear user:
1. Click "+ Nuevo user"
2. Email + nombre + role + service level
3. Modo "invite" → manda email con link; o "manual" → genera password temporal

### Tab Roles

- Lista de roles (system + custom)
- Cada role:
  - Nombre + descripción
  - Matrix permisos: pantalla (rows) × acción (cols: view/edit/configure/approve/delete)
  - Toggle por celda
- "Duplicar role" para crear variantes

System roles (no editables, solo lectura):
- ADMIN, SERVICE_LEAD, AMS_CONSULTANT, CLIENT_USER, GENERAL_USER

### Tab Invitaciones

- Pendientes: emails invitados aún no aceptados
- Reenviar / cancelar
- Generar nuevo invite con link copiable

### Tab Mantenimiento

- **Re-index embeddings**: recalcula vectores de todos los knowledge items
- **Limpiar cache**: borra cache Redis (queries, deliveries pending, etc.)
- **Regenerar seeds demo**: borra todo data demo y reinserta seeds
- **Vacuum DB**: ANALYZE + VACUUM Postgres
- Cada acción muestra warning + confirma + log de progreso

### Tab Backups

- Lista de backups recientes (snapshots automáticos diarios + manuales)
- "Descargar dump" → SQL gzipped
- "Restore" → upload SQL + confirma (PELIGROSO, sobreescribe DB)

### Tab Plantillas

- Templates Markdown con variables `{{user_name}}, {{invite_link}}, {{client_name}}`
- Editor con preview
- Test send a tu email

### Sub-página Evaluador IA

`/admin/eval` → batería de evaluaciones automatizadas del agente:
- Set de preguntas curadas
- Run vs prompt actual
- Score por categoría (precisión / coherencia / cita fuentes / tono)
- Tendencia comparativa entre prompt versions

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| Otros | Sin acceso |

## Qué se guarda

Backend:
- `users`, `roles`, `rbac_assignments`, `user_invites`
- `system_backups` (metadata + path al dump)
- `email_templates`
- `ai_eval_runs` + `ai_eval_results`

## Limitaciones

- Backups limitados por tamaño DB (>5 GB → cold backup en lugar de pg_dump)
- Re-index puede demorar minutos en KB grande
- Plantillas en Markdown, no WYSIWYG
- Sub-páginas (eval) en evolución activa
