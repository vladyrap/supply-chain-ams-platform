# Control de Acceso (RBAC) — supply-chain-ams-platform

> Sistema RBAC frontend con enforcement a **3 niveles** (sidebar + ruta +
> acción) y semántica **fail-closed**. Convive con la auth real del backend.
>
> v0.8.0 — Diciembre 2026.

---

## TL;DR

- **Fuente única de verdad**: cada `ModuleDef` declara `permissionKey: PlatformScreen`.
- **Hook único**: `usePermissions()` resuelve user efectivo + expone `can`, `canAny`, `canAll`, `canSeeModule`, `visibleModules`.
- **Sin permiso definido + ruta sensible = oculto/bloqueado** (fail-closed).
- **3 capas de defensa**: Sidebar oculta · RequirePermission bloquea ruta · botones se ocultan via `can(...)`.
- **Audit log**: cada mutación de roles y cada intento bloqueado se registra
  en `src/lib/rbac-audit.ts`.

---

## Arquitectura

```
┌────────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│  AuthContext       │  │  RBAC localStorage│  │  buildDefaults()    │
│  (cookie backend)  │  │  (override+roles) │  │  (5 roles iniciales)│
└─────────┬──────────┘  └─────────┬─────────┘  └──────────┬──────────┘
          │                       │                       │
          └───────────┬───────────┴───────────────────────┘
                      ▼
              ┌─────────────────┐
              │ usePermissions()│   ← hook único, re-rendea al cambiar perms
              └────────┬────────┘
                       │
       ┌───────────────┼─────────────────┬─────────────────┐
       ▼               ▼                 ▼                 ▼
   Sidebar       RequirePermission   CommandPalette   Botones internos
  (oculta UI)    (bloquea ruta)      (filtra search)  ( can("...","edit") )
```

---

## Modelo

### Pantallas (`PlatformScreen`)

26 pantallas RBAC que cubren los 37 módulos del catálogo. Ver
`src/types/rbac.ts → ALL_SCREENS` para la lista completa. Ejemplos:

| ID                     | Etiqueta                  | Módulos asociados (ModuleDef.permissionKey)                 |
|------------------------|---------------------------|-------------------------------------------------------------|
| `dashboard`            | Dashboard                 | welcome, dashboard                                          |
| `agente_ams`           | Agente AMS                | agent, agent-lab                                            |
| `incidentes`           | Incidentes                | history                                                     |
| `modulos_sap`          | Módulos SAP               | sap-readonly                                                |
| `servicios`            | Servicios                 | support-desk, meetings                                      |
| `reportes`             | Reportes                  | mission-control, topology, tv, demo, executive, launchpad…  |
| `ticket_command_center`| Ticket Command Center     | tickets                                                     |
| `administracion`       | Administración            | admin                                                       |
| `configuracion`        | Configuración             | settings                                                    |
| `canal_telefonico`     | Canal Telefónico          | voice-calls                                                 |
| `conocimiento_rag`     | Conocimiento RAG          | knowledge                                                   |
| `entrenamiento_ia`     | Entrenamiento IA          | knowledge/training                                          |
| `integraciones`        | Integraciones             | integrations                                                |
| `playbooks_ams`        | Playbooks AMS             | playbooks                                                   |
| `document_factory`     | Document Factory          | document-factory                                            |
| `quality_evaluator`    | Quality Evaluator         | quality-evaluator                                           |
| `escalamiento_n2`      | Escalamiento N2           | escalation-n2                                               |
| `testing_intelligence` | Testing Intelligence      | testing-intelligence                                        |
| `time_estimator`       | Estimador de Tiempos      | time-estimator                                              |
| `audit_trail`          | Audit Trail               | audit                                                       |
| `agent_readiness`      | Agent Readiness           | agent-readiness                                             |
| `business_value_dashboard` | Valor Económico       | business-value                                              |

### Acciones (`PermissionAction`)

`view` · `create` · `edit` · `delete` · `export` · `configure` · `approve`

### Roles iniciales

| Code             | Nombre           | Resumen                                                       |
|------------------|------------------|---------------------------------------------------------------|
| `ADMIN`          | Administrador    | Acceso total. Gestión de usuarios y roles                     |
| `SERVICE_LEAD`   | Líder Servicio   | Aprueba, exporta, supervisa. Sin gestión de users             |
| `AMS_CONSULTANT` | Consultor AMS    | Atiende consultas. Sin administrar roles                      |
| `CLIENT_USER`    | Usuario Cliente  | Cliente final. Ve sus propios incidentes                      |
| `GENERAL_USER`   | Usuario General  | Acceso básico. Solo agente + dashboard                        |

Todos los anteriores tienen `isSystem: true`. Los nuevos creados por el admin
quedan con `isSystem: false` y pueden eliminarse.

### Usuarios demo iniciales

| Email            | Rol              | Nivel       |
|------------------|------------------|-------------|
| admin@demo.cl    | ADMIN            | ENTERPRISE  |
| consultor@demo.cl| AMS_CONSULTANT   | PREMIUM     |
| lider@demo.cl    | SERVICE_LEAD     | ENTERPRISE  |
| cliente@demo.cl  | CLIENT_USER      | STANDARD    |
| usuario@demo.cl  | GENERAL_USER     | BASIC       |

---

## API pública

### `usePermissions()` — hook único

```ts
import { usePermissions } from "@/hooks/usePermissions";

const {
  effectiveUser,        // PlatformUser | null
  roleCode,             // string | null  (ej. "ADMIN")
  roles,                // PlatformRole[]
  can,                  // (screen, action="view") => boolean
  canAny,               // (combos[]) => boolean (OR)
  canAll,               // (combos[]) => boolean (AND)
  canSeeModule,         // (m: ModuleDef) => boolean
  visibleModules,       // ModuleDef[]   (catálogo MODULES filtrado)
  loading,              // boolean
} = usePermissions();
```

Resuelve `effectiveUser` con la siguiente cascada:

1. Si hay un user simulado (`localStorage["…current-user"]`), usar ese.
2. Si no, mapear `authUser` (cookie backend) → `PlatformUser` vía
   `legacyRoleToCode(authUser.role)`.
3. Si no hay nadie → `null` (fail-closed, todo bloqueado).

Re-rendea automáticamente cuando:

- otro tab cambia `localStorage` (storage event)
- el componente `AccessAdminPanel` toggle un permiso y dispara
  `CustomEvent("ams-rbac-changed")`

### `<RequirePermission>` — guard de página

```tsx
import RequirePermission from "@/components/admin/RequirePermission";

export default function MyPage() {
  return (
    <RequirePermission
      screen="quality_evaluator"
      action="view"
      reason="Quality Evaluator requiere rol con permiso de visualización."
    >
      <QualityEvaluatorCenter />
    </RequirePermission>
  );
}
```

- Si el user **no** tiene permiso → renderiza `<AccessLockedCard />` y registra
  un evento `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT` (una sola vez por path+user).
- `inline={true}` muestra un banner compacto en lugar del card full.
- `fallback={…}` permite override custom del bloqueo.

### `ModuleDef.permissionKey` — fuente única de verdad

```ts
// src/lib/modules.ts
{
  id: "playbooks", label: "Playbooks AMS", icon: "📕", href: "/playbooks",
  description: "Biblioteca de procedimientos operativos AMS",
  status: "available", phase: 7,
  rolesAllowed: ["viewer", "consultor", "aprobador", "admin"], // legacy fallback
  permissionKey: "playbooks_ams",   // ← screen RBAC
  group: "ams_avanzado",
}
```

Reglas:

- Si `permissionKey` está definido → `canSeeModule(m) = can(permissionKey, "view")`.
- Si `permissionKey` está **ausente** Y `public` no es `true` → **oculto**
  (fail-closed). Para volverlo visible hay que definir explícitamente la screen.
- Si `public: true` → siempre visible (sólo `welcome`).

### Botones / acciones internas

```tsx
const { can } = usePermissions();

return (
  <>
    {can("escalamiento_n2", "approve") && (
      <button onClick={onApprove}>Aprobar escalación</button>
    )}
    {can("escalamiento_n2", "configure") && (
      <button onClick={onOpenSettings}>Configurar reglas</button>
    )}
  </>
);
```

---

## Persistencia (localStorage)

| Clave                                    | Contenido                       |
|------------------------------------------|---------------------------------|
| `supply-chain-ams-platform-roles`        | `PlatformRole[]`                |
| `supply-chain-ams-platform-users`        | `PlatformUser[]`                |
| `supply-chain-ams-platform-current-user` | id de usuario simulado o vacío  |
| `supply-chain-ams-rbac-audit-events`     | log de eventos RBAC (cap 500)   |

El componente `AdminAccessPanel` permite **Restaurar configuración demo**:
borra las tres primeras claves y vuelve a poblar con `buildDefaultRoles()` +
`buildDefaultUsers()`.

Los cambios emiten un `CustomEvent("ams-rbac-changed")` para sincronización
en el mismo tab.

---

## Audit log RBAC

Cada mutación se registra en `src/lib/rbac-audit.ts` y es visible desde el tab
**"Log de auditoría"** de `AdminAccessPanel`.

| Evento                                | Disparador                                          |
|---------------------------------------|-----------------------------------------------------|
| `ROLE_PERMISSIONS_UPDATED`            | `togglePermission()` o `setRolePermissions()`       |
| `ROLE_CREATED`                        | `createRole()`                                      |
| `ROLE_DELETED`                        | `deleteRole()`                                      |
| `USER_ROLE_CHANGED`                   | `updateUser()` cuando cambia `roleCode`             |
| `UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT`   | `<RequirePermission>` bloqueando una página         |
| `RBAC_OVERRIDE_ACTIVATED`             | `setCurrentUser(id)` (admin empieza a simular)      |
| `RBAC_OVERRIDE_CLEARED`               | `setCurrentUser(null)` (admin deja de simular)      |

Cada evento incluye `actor` (siempre el user real autenticado, nunca el
simulado), `actorRoleCode`, `subject`, `screen`, `action`, `route` y
`metadata` con el diff antes/después.

El log puede exportarse a JSON o limpiarse desde el panel.

---

## Integración con la auth real

El backend manda un user con `role: "viewer" | "consultor" | "aprobador" | "admin"`.
`legacyRoleToCode()` mapea ese rol legacy a `roleCode` RBAC:

```
viewer    → GENERAL_USER
consultor → AMS_CONSULTANT
aprobador → SERVICE_LEAD
admin     → ADMIN
```

Si el admin activa **"Simular como X"** desde el panel, todo `usePermissions()`
devuelve ese user demo *sólo para filtrar la UI*. Los fetches al backend siguen
identificándose con la cookie real.

---

## Reglas de UI (resumen)

| Caso                                              | Comportamiento                                         |
|---------------------------------------------------|--------------------------------------------------------|
| User sin `view` sobre screen X                    | Módulo oculto en sidebar (grupo vacío también oculto)  |
| Módulo sin `permissionKey` y no `public`          | Siempre oculto (fail-closed)                           |
| User accede por URL directa a screen X            | `<RequirePermission>` muestra `<AccessLockedCard>`     |
| User sin `view` busca módulo en Command Palette   | No aparece en resultados                               |
| User sin `view` ve cards de quick-access          | Cards filtradas (Welcome / Dashboard)                  |
| User sin `edit`                                   | Botones de edición ocultos via `can("x","edit")`       |
| User sin `delete`                                 | Botones de eliminación ocultos                         |
| User sin `configure`                              | Opciones de configuración ocultas                      |
| User sin `approve`                                | Botones de aprobación ocultos                          |
| `status: "INACTIVE"`                              | Bloquea TODOS los permisos                             |

---

## Smoke test rápido (5 roles)

Desde `/admin → Vista previa`, simular cada rol y validar:

1. **ADMIN** → ve los 4 grupos completos + tab "Administración".
2. **SERVICE_LEAD** → ve operación + visualizaciones + AMS avanzado;
   NO ve "Administración".
3. **AMS_CONSULTANT** → ve operación + AMS avanzado limitado;
   NO ve visualizaciones exclusivas de aprobador (ej. Wallboard, War Room);
   NO ve "Administración" ni "Valor Económico".
4. **CLIENT_USER** → ve sólo Bienvenida, Agente AMS, Historial,
   Conocimiento, Playbooks limitados. NO ve Mission Control ni Demo.
5. **GENERAL_USER** → ve Bienvenida + Dashboard + Agente AMS solamente.

Para cada uno, intentar acceder por URL directa (ej. `/admin`, `/escalation-n2`):
debe aparecer `<AccessLockedCard>` y registrarse un
`UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT` visible en el tab "Log de auditoría".

---

## Roadmap hacia backend real

Cuando movamos esto a producción:

1. **Tablas Postgres** `rbac_roles`, `rbac_role_permissions`, `rbac_users` +
   `rbac_audit_log` para los 7 event types.
2. **API REST** `/api/rbac/roles`, `/api/rbac/users`, `/api/rbac/me/permissions`
   en `supply-chain-ams-agent`.
3. **Middleware Fastify** que valide cookie de sesión + carga los permisos del
   role en `req.permissions`.
4. **Endpoints sensibles** decorados con `requirePermission(screen, action)`.
5. **Migrar localStorage → API**: reemplazar `useAccessAdmin` por hook que haga
   fetch a `/api/rbac/*` manteniendo la misma interfaz pública.
6. **SSO opcional**: Azure AD / Google Workspace mapeando claims de IdP → roleCode.

Como el modelo vive en `types/rbac.ts` + `utils/rbac.ts` *sin acoplarse a
localStorage*, la migración cambia sólo la fuente de datos del hook
`useAccessAdmin` — los componentes de UI no necesitan cambios.

---

## Archivos clave

| Path                                                    | Responsabilidad                            |
|---------------------------------------------------------|--------------------------------------------|
| `src/types/rbac.ts`                                     | Tipos + ALL_SCREENS + RBAC_STORAGE         |
| `src/utils/rbac.ts`                                     | `hasPermission`, defaults, migración       |
| `src/hooks/usePermissions.ts`                           | Hook único (can/canAny/canAll/canSeeModule)|
| `src/hooks/useAccessAdmin.ts`                           | CRUD roles + users + audit                 |
| `src/lib/modules.ts`                                    | Catálogo MODULES + groups + helpers        |
| `src/lib/rbac-audit.ts`                                 | Log de eventos RBAC                        |
| `src/components/admin/RequirePermission.tsx`            | Guard de ruta                              |
| `src/components/admin/AccessLockedCard.tsx`             | Card de bloqueo                            |
| `src/components/admin/AdminAccessPanel.tsx`             | Tabs admin (users/roles/matrix/preview/audit) |
| `src/components/admin/RbacAuditLogPanel.tsx`            | Visor del log RBAC                         |
| `src/components/layout/Sidebar.tsx`                     | Sidebar fail-closed con grupos dinámicos   |
| `src/components/layout/CommandPalette.tsx`              | Búsqueda global con filtro por perms       |
