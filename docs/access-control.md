# Control de Acceso (RBAC) — supply-chain-ams-platform

> Sistema RBAC frontend-only persistido en `localStorage`. Convive con la auth
> real del backend sin reemplazarla — el admin real (Vladimir) sigue entrando
> por `/login` y validándose con el backend; este módulo permite *administrar
> y simular* roles + permisos + usuarios demo sin tocar la DB.

---

## Modelo

### Pantallas (`PlatformScreen`)

14 pantallas abstractas que agrupan los 24 módulos del catálogo:

| ID                | Etiqueta            | Módulos asociados                                                                                                |
|-------------------|---------------------|------------------------------------------------------------------------------------------------------------------|
| `dashboard`       | Dashboard           | dashboard                                                                                                        |
| `agente_ams`      | Agente AMS          | agent, agent-think, agent-voice                                                                                  |
| `incidentes`      | Incidentes          | history                                                                                                          |
| `modulos_sap`     | Módulos SAP         | sap-readonly                                                                                                     |
| `servicios`       | Servicios           | support-desk, tickets, meetings                                                                                  |
| `reportes`        | Reportes            | executive, forecast, mission-control, topology, war-room, brain, terminal, hud, launchpad, wallboard, flow, tv, demo |
| `auditoria`       | Auditoría           | admin/eval                                                                                                       |
| `administracion`  | Administración      | admin                                                                                                            |
| `configuracion`   | Configuración       | settings                                                                                                         |
| `canal_telefonico`| Canal Telefónico    | voice-calls                                                                                                      |
| `conocimiento_rag`| Conocimiento RAG    | knowledge, knowledge/graph                                                                                       |
| `integraciones`   | Integraciones       | integrations                                                                                                     |
| `usuarios`        | Usuarios            | sub-feature dentro de admin                                                                                      |
| `roles`           | Roles               | sub-feature dentro de admin                                                                                      |

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

### Niveles de servicio (`ServiceLevel`)

`BASIC` · `STANDARD` · `PREMIUM` · `ENTERPRISE`

---

## Ejemplo de estructura JSON

```json
{
  "id": "role_admin",
  "name": "Administrador",
  "code": "ADMIN",
  "description": "Acceso completo a la plataforma",
  "isSystem": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "permissions": {
    "dashboard": {
      "view": true, "create": true, "edit": true, "delete": true,
      "export": true, "configure": true, "approve": true
    },
    "agente_ams": { "view": true, "create": true, ... },
    ...
  }
}
```

---

## Persistencia (localStorage)

| Clave                                       | Contenido                       |
|---------------------------------------------|---------------------------------|
| `supply-chain-ams-platform-roles`           | `PlatformRole[]`                |
| `supply-chain-ams-platform-users`           | `PlatformUser[]`                |
| `supply-chain-ams-platform-current-user`    | id de usuario simulado o vacío  |

El componente `AdminAccessPanel` permite **Restaurar configuración demo**: borra
las tres claves y vuelve a poblar con `buildDefaultRoles()` + `buildDefaultUsers()`.

Los cambios en localStorage emiten un `CustomEvent("ams-rbac-changed")` para
que el `Sidebar` se sincronice en el mismo tab sin recargar.

---

## Integración con la auth real

El backend sigue mandando un user con `role: "viewer" | "consultor" | "aprobador" | "admin"`.
El Sidebar mapea ese role legacy a `roleCode` RBAC con `legacyRoleToCode()`:

```
viewer    → GENERAL_USER
consultor → AMS_CONSULTANT
aprobador → SERVICE_LEAD
admin     → ADMIN
```

Si el admin activa **"Simular como X"** desde el panel, el Sidebar usa esa
identidad demo *solo para filtrar la UI* — los fetches al backend siguen
identificándote con tu cookie real.

---

## Reglas de UI con permisos

| Caso                                    | Comportamiento                                  |
|-----------------------------------------|-------------------------------------------------|
| User sin `view` sobre screen X          | Módulo oculto en sidebar                        |
| User accede por URL directa a screen X  | Mostrar `<AccessLockedCard>` (TODO en pages)    |
| User sin `edit`                         | Ocultar botones de edición                      |
| User sin `delete`                       | Ocultar botones de eliminación                  |
| User sin `configure`                    | Ocultar opciones de configuración               |
| User sin `approve`                      | Ocultar botones de aprobación                   |
| `status: "INACTIVE"`                    | Bloquea TODOS los permisos (cierre por defecto) |

---

## Limitaciones actuales

- **No hay backend para RBAC.** Todo vive en el browser; si limpias localStorage perdés los cambios.
- **No hay control real de acceso.** Un user determinado podría usar DevTools para hackear `hasPermission`. El backend sigue siendo la fuente de verdad para datos sensibles.
- **No hay auditoría de cambios.** Quién modificó qué rol no queda registrado.
- **Sin SSO / SAML / OAuth.** Solo cookie sesión del backend + RBAC local.
- **`canModifyScreen` y `<AccessLockedCard>` están definidos pero su enforcement en cada vista es opcional.** Se aplican en `/admin` solamente por ahora.

---

## Roadmap hacia backend real

Cuando movamos esto a producción:

1. **Tablas Postgres** `rbac_roles`, `rbac_role_permissions`, `rbac_users` (o reusar `users` existente con un `role_code` FK).
2. **API REST** `/api/rbac/roles`, `/api/rbac/users`, `/api/rbac/me/permissions` en `supply-chain-ams-agent`.
3. **Middleware Fastify** que valide cookie de sesión + carga los permisos del role en `req.permissions`.
4. **Endpoints sensibles** decorados con `requirePermission(screen, action)`.
5. **Migrar localStorage → API**: en el frontend, reemplazar `useAccessAdmin` por un hook que haga fetch a `/api/rbac/*` manteniendo la misma interfaz pública.
6. **Auditoría** `rbac_audit_log` con who, what, when para cada cambio.
7. **SSO opcional**: Azure AD / Google Workspace mapeando claims de IdP → roleCode.

Como el modelo RBAC vive en `types/rbac.ts` + `utils/rbac.ts` *sin acoplarse a localStorage*, la migración a backend cambia solo la fuente de datos del hook `useAccessAdmin` — los componentes de UI no necesitan cambios.
