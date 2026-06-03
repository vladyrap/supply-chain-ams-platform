"use client";

// =============================================================================
// usePermissions — Hook centralizado de RBAC
// =============================================================================
// Fuente única de verdad para "¿puede este user X hacer la acción A sobre la
// pantalla S?". Lee del AuthContext + localStorage RBAC override + buildDefaults
// y resuelve effective user.
//
// Re-rendea automáticamente al cambiar permisos vía storage event + custom
// event "ams-rbac-changed" (que se dispara al toggle en AccessAdminPanel).
//
// Uso típico:
//   const { can, canAny, canAll, visibleModules, effectiveUser, roleCode } = usePermissions();
//   if (can("admin", "view")) { ... }
//
// Fail-closed: si el user es null o la pantalla no tiene mapping → false.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  RBAC_STORAGE, type PlatformRole, type PlatformUser, type PlatformScreen,
  type PermissionAction,
} from "@/types/rbac";
import {
  hasPermission as rbacHasPermission,
  buildDefaultRoles, buildDefaultUsers,
  legacyRoleToCode, migrateRolesAddingMissingScreens,
} from "@/utils/rbac";
import type { ModuleDef } from "@/types";
import { MODULES } from "@/lib/modules";

const RBAC_CHANGED_EVENT = "ams-rbac-changed";

interface RbacState {
  roles: PlatformRole[];
  users: PlatformUser[];
  currentUserId: string | null;
}

function readRbacState(): RbacState {
  if (typeof window === "undefined") {
    return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  }
  let roles: PlatformRole[] = buildDefaultRoles();
  let users: PlatformUser[] = buildDefaultUsers();
  try { const r = localStorage.getItem(RBAC_STORAGE.roles); if (r) roles = JSON.parse(r); } catch {}
  try { const u = localStorage.getItem(RBAC_STORAGE.users); if (u) users = JSON.parse(u); } catch {}
  roles = migrateRolesAddingMissingScreens(roles);
  const currentUserId = localStorage.getItem(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

export interface UsePermissions {
  /** User efectivo (override RBAC > authUser legacy). null si no hay sesión. */
  effectiveUser: PlatformUser | null;
  /** Role code RBAC del user efectivo (ej. ADMIN, CLIENT_USER). */
  roleCode: string | null;
  /** Roles disponibles en el sistema (incluye custom). */
  roles: PlatformRole[];

  /** ¿Puede ejecutar la acción sobre la pantalla? Fail-closed. */
  can: (screen: PlatformScreen, action?: PermissionAction) => boolean;
  /** ¿Puede al menos UNA de las combinaciones (OR)? */
  canAny: (combos: Array<{ screen: PlatformScreen; action?: PermissionAction }>) => boolean;
  /** ¿Puede TODAS las combinaciones (AND)? */
  canAll: (combos: Array<{ screen: PlatformScreen; action?: PermissionAction }>) => boolean;

  /** ¿Puede ver un módulo del catálogo MODULES? Consulta permissionKey. */
  canSeeModule: (m: ModuleDef) => boolean;

  /** Módulos del catálogo filtrados por permisos del user actual. */
  visibleModules: ModuleDef[];

  /** ¿Está cargando el state? */
  loading: boolean;
}

/**
 * Hook principal de RBAC.
 * Re-rendea al cambiar localStorage RBAC (storage event) o evento custom.
 */
export function usePermissions(): UsePermissions {
  const { user: authUser, loading: authLoading } = useAuth();
  const [rbac, setRbac] = useState<RbacState>(() => readRbacState());

  // Re-leer cuando hay cambios en localStorage o evento custom
  useEffect(() => {
    function reload() { setRbac(readRbacState()); }
    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (e.key === RBAC_STORAGE.roles
        || e.key === RBAC_STORAGE.users
        || e.key === RBAC_STORAGE.currentUser) {
        reload();
      }
    }
    if (typeof window === "undefined") return;
    window.addEventListener("storage", onStorage);
    window.addEventListener(RBAC_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RBAC_CHANGED_EVENT, reload);
    };
  }, []);

  // Effective user: override RBAC > authUser legacy
  const effectiveUser = useMemo<PlatformUser | null>(() => {
    if (rbac.currentUserId) {
      const overridden = rbac.users.find((u) => u.id === rbac.currentUserId);
      if (overridden) return overridden;
    }
    if (!authUser) return null;
    return {
      id: `auth_${authUser.id}`,
      name: authUser.name || authUser.email,
      email: authUser.email,
      roleCode: legacyRoleToCode(authUser.role),
      serviceLevel: "ENTERPRISE",
      status: authUser.active ? "ACTIVE" : "INACTIVE",
      createdAt: authUser.created_at,
    };
  }, [authUser, rbac.currentUserId, rbac.users]);

  const roleCode = effectiveUser?.roleCode ?? null;

  // can(screen, action="view")
  const can = useCallback(
    (screen: PlatformScreen, action: PermissionAction = "view") => {
      return rbacHasPermission(effectiveUser, screen, action, rbac.roles);
    },
    [effectiveUser, rbac.roles],
  );

  const canAny = useCallback(
    (combos: Array<{ screen: PlatformScreen; action?: PermissionAction }>) =>
      combos.some(({ screen, action }) => can(screen, action ?? "view")),
    [can],
  );

  const canAll = useCallback(
    (combos: Array<{ screen: PlatformScreen; action?: PermissionAction }>) =>
      combos.every(({ screen, action }) => can(screen, action ?? "view")),
    [can],
  );

  const canSeeModule = useCallback(
    (m: ModuleDef) => {
      // Public modules NO requieren permiso (welcome).
      if (m.public) return true;
      // Sin permissionKey → fail-closed.
      if (!m.permissionKey) return false;
      return can(m.permissionKey, "view");
    },
    [can],
  );

  const visibleModules = useMemo(
    () => MODULES.filter(canSeeModule),
    [canSeeModule],
  );

  return {
    effectiveUser, roleCode, roles: rbac.roles,
    can, canAny, canAll, canSeeModule, visibleModules,
    loading: authLoading,
  };
}

/**
 * Dispara el evento de cambio de RBAC. Llamar después de mutar localStorage
 * para que todos los componentes que usan usePermissions re-rendeen.
 */
export function notifyRbacChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RBAC_CHANGED_EVENT));
}
