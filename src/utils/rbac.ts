// Lógica RBAC pura. Sin estado React, sin localStorage (eso vive en useAccessAdmin).
// Esta capa decide si un usuario X puede hacer la acción Y sobre la pantalla Z.

import type {
  PlatformRole, PlatformUser, PlatformScreen, PermissionAction,
  RolePermission, RolePermissionMap,
} from "@/types/rbac";
import { ALL_SCREENS } from "@/types/rbac";
import type { Role } from "@/types";

// ============================================================
// Helpers de construcción de permisos
// ============================================================

function noPerm(): RolePermission {
  return { view: false, create: false, edit: false, delete: false, export: false, configure: false, approve: false };
}
function viewOnly(): RolePermission {
  return { ...noPerm(), view: true };
}
function viewExport(): RolePermission {
  return { ...noPerm(), view: true, export: true };
}
function viewCreate(): RolePermission {
  return { ...noPerm(), view: true, create: true };
}
function viewCreateEdit(): RolePermission {
  return { ...noPerm(), view: true, create: true, edit: true };
}
function viewExportApprove(): RolePermission {
  return { ...noPerm(), view: true, export: true, approve: true };
}
function fullPerm(): RolePermission {
  return { view: true, create: true, edit: true, delete: true, export: true, configure: true, approve: true };
}

function buildMap(spec: Partial<RolePermissionMap>): RolePermissionMap {
  const out = {} as RolePermissionMap;
  for (const s of ALL_SCREENS) out[s] = spec[s] ?? noPerm();
  return out;
}

// ============================================================
// Seeds: roles default
// ============================================================

const NOW = "2026-01-01T00:00:00.000Z";

export function buildDefaultRoles(): PlatformRole[] {
  return [
    {
      id: "role_admin",
      name: "Administrador",
      code: "ADMIN",
      description: "Acceso total a la plataforma. Puede gestionar usuarios, roles y configuración.",
      isSystem: true,
      createdAt: NOW, updatedAt: NOW,
      permissions: buildMap({
        dashboard:        fullPerm(),
        agente_ams:       fullPerm(),
        incidentes:       fullPerm(),
        modulos_sap:      fullPerm(),
        servicios:        fullPerm(),
        reportes:         fullPerm(),
        auditoria:        fullPerm(),
        administracion:   fullPerm(),
        configuracion:    fullPerm(),
        canal_telefonico: fullPerm(),
        conocimiento_rag: fullPerm(),
        integraciones:    fullPerm(),
        usuarios:         fullPerm(),
        roles:            fullPerm(),
      }),
    },
    {
      id: "role_service_lead",
      name: "Líder de Servicio",
      code: "SERVICE_LEAD",
      description: "Aprueba, exporta y supervisa operación. Sin gestión de usuarios.",
      isSystem: true,
      createdAt: NOW, updatedAt: NOW,
      permissions: buildMap({
        dashboard:        viewExportApprove(),
        agente_ams:       viewCreateEdit(),
        incidentes:       { ...viewCreateEdit(), export: true, approve: true },
        modulos_sap:      viewExport(),
        servicios:        { ...viewCreateEdit(), approve: true },
        reportes:         viewExportApprove(),
        auditoria:        viewExport(),
        administracion:   viewOnly(),
        configuracion:    { ...viewOnly(), configure: true },
        canal_telefonico: viewExport(),
        conocimiento_rag: viewCreateEdit(),
        integraciones:    { ...viewCreateEdit(), approve: true },
        usuarios:         viewOnly(),
        roles:            viewOnly(),
      }),
    },
    {
      id: "role_ams_consultant",
      name: "Consultor AMS",
      code: "AMS_CONSULTANT",
      description: "Atiende consultas e incidentes. No administra roles ni elimina datos críticos.",
      isSystem: true,
      createdAt: NOW, updatedAt: NOW,
      permissions: buildMap({
        dashboard:        viewExport(),
        agente_ams:       viewCreateEdit(),
        incidentes:       viewCreateEdit(),
        modulos_sap:      viewOnly(),
        servicios:        viewCreateEdit(),
        reportes:         viewExport(),
        auditoria:        noPerm(),
        administracion:   noPerm(),
        configuracion:    viewOnly(),
        canal_telefonico: viewOnly(),
        conocimiento_rag: viewCreateEdit(),
        integraciones:    viewOnly(),
        usuarios:         noPerm(),
        roles:            noPerm(),
      }),
    },
    {
      id: "role_client_user",
      name: "Usuario Cliente",
      code: "CLIENT_USER",
      description: "Cliente final del servicio. Ve sus propios incidentes y consulta al agente.",
      isSystem: true,
      createdAt: NOW, updatedAt: NOW,
      permissions: buildMap({
        dashboard:        viewOnly(),
        agente_ams:       viewCreate(),
        incidentes:       viewCreate(),
        modulos_sap:      viewOnly(),
        servicios:        viewOnly(),
        reportes:         noPerm(),
        auditoria:        noPerm(),
        administracion:   noPerm(),
        configuracion:    viewOnly(),
        canal_telefonico: noPerm(),
        conocimiento_rag: viewOnly(),
        integraciones:    noPerm(),
        usuarios:         noPerm(),
        roles:            noPerm(),
      }),
    },
    {
      id: "role_general_user",
      name: "Usuario General",
      code: "GENERAL_USER",
      description: "Acceso básico. Consulta al agente y módulos generales.",
      isSystem: true,
      createdAt: NOW, updatedAt: NOW,
      permissions: buildMap({
        dashboard:        viewOnly(),
        agente_ams:       viewCreate(),
        incidentes:       noPerm(),
        modulos_sap:      viewOnly(),
        servicios:        noPerm(),
        reportes:         noPerm(),
        auditoria:        noPerm(),
        administracion:   noPerm(),
        configuracion:    viewOnly(),
        canal_telefonico: noPerm(),
        conocimiento_rag: viewOnly(),
        integraciones:    noPerm(),
        usuarios:         noPerm(),
        roles:            noPerm(),
      }),
    },
  ];
}

// ============================================================
// Seeds: usuarios default
// ============================================================

export function buildDefaultUsers(): PlatformUser[] {
  return [
    { id: "u_admin",      name: "Admin Sistema",    email: "admin@demo.cl",     roleCode: "ADMIN",          serviceLevel: "ENTERPRISE", status: "ACTIVE", createdAt: NOW },
    { id: "u_consultor",  name: "Consultor AMS",    email: "consultor@demo.cl", roleCode: "AMS_CONSULTANT", serviceLevel: "PREMIUM",    status: "ACTIVE", createdAt: NOW },
    { id: "u_lider",      name: "Líder Servicio",   email: "lider@demo.cl",     roleCode: "SERVICE_LEAD",   serviceLevel: "ENTERPRISE", status: "ACTIVE", createdAt: NOW },
    { id: "u_cliente",    name: "Cliente Demo",     email: "cliente@demo.cl",   roleCode: "CLIENT_USER",    serviceLevel: "STANDARD",   status: "ACTIVE", createdAt: NOW },
    { id: "u_general",    name: "Usuario General",  email: "usuario@demo.cl",   roleCode: "GENERAL_USER",   serviceLevel: "BASIC",      status: "ACTIVE", createdAt: NOW },
  ];
}

// ============================================================
// Lookups y reglas
// ============================================================

export function getRoleByCode(code: string, roles: PlatformRole[]): PlatformRole | undefined {
  if (!code) return undefined;
  return roles.find((r) => r.code === code);
}

export function getUserPermissions(user: PlatformUser | null | undefined, roles: PlatformRole[]): RolePermissionMap | null {
  if (!user) return null;
  const role = getRoleByCode(user.roleCode, roles);
  return role ? role.permissions : null;
}

/**
 * hasPermission(user, screen, action) → boolean.
 * Si user es null o no encuentra rol, retorna false (cierre por defecto).
 * Status INACTIVE invalida todos los permisos.
 */
export function hasPermission(
  user: PlatformUser | null | undefined,
  screen: PlatformScreen,
  action: PermissionAction,
  roles: PlatformRole[],
): boolean {
  if (!user || user.status === "INACTIVE") return false;
  const perms = getUserPermissions(user, roles);
  if (!perms) return false;
  return !!perms[screen]?.[action];
}

export function getVisibleScreens(user: PlatformUser | null | undefined, roles: PlatformRole[]): PlatformScreen[] {
  const perms = getUserPermissions(user, roles);
  if (!perms) return [];
  return ALL_SCREENS.filter((s) => perms[s]?.view);
}

export function getBlockedScreens(user: PlatformUser | null | undefined, roles: PlatformRole[]): PlatformScreen[] {
  const perms = getUserPermissions(user, roles);
  if (!perms) return [...ALL_SCREENS];
  return ALL_SCREENS.filter((s) => !perms[s]?.view);
}

export function canAccessAdmin(user: PlatformUser | null | undefined, roles: PlatformRole[]): boolean {
  return hasPermission(user, "administracion", "view", roles);
}

export function canModifyScreen(user: PlatformUser | null | undefined, screen: PlatformScreen, roles: PlatformRole[]): boolean {
  return hasPermission(user, screen, "edit", roles);
}

// ============================================================
// Mapping legacy Role → roleCode RBAC
// ============================================================

export function legacyRoleToCode(role: Role | string | null | undefined): string {
  switch ((role || "").toLowerCase()) {
    case "admin":     return "ADMIN";
    case "aprobador": return "SERVICE_LEAD";
    case "consultor": return "AMS_CONSULTANT";
    case "viewer":    return "GENERAL_USER";
    default:          return "GENERAL_USER";
  }
}

export function codeToLegacyRole(code: string): Role {
  switch (code) {
    case "ADMIN":          return "admin";
    case "SERVICE_LEAD":   return "aprobador";
    case "AMS_CONSULTANT": return "consultor";
    case "CLIENT_USER":    return "viewer";
    case "GENERAL_USER":   return "viewer";
    default:               return "viewer";
  }
}

// ============================================================
// Helpers de validación / formato
// ============================================================

export function normalizeRoleCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

export function suggestDuplicatedCode(original: string, existingCodes: string[]): string {
  let candidate = `${original}_COPY`;
  let n = 1;
  while (existingCodes.includes(candidate)) {
    n++;
    candidate = `${original}_COPY_${n}`;
  }
  return candidate;
}

export function validateRoleCode(code: string, existingCodes: string[], currentCode?: string): string | null {
  const c = normalizeRoleCode(code);
  if (!c) return "El código no puede estar vacío.";
  if (c.length < 3) return "El código debe tener al menos 3 caracteres.";
  if (existingCodes.includes(c) && c !== currentCode) return `Ya existe un rol con código "${c}".`;
  return null;
}
