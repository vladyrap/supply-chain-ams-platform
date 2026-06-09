"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RBAC_STORAGE, type PlatformRole, type PlatformUser, type PlatformScreen,
  type PermissionAction, type RolePermission, type ServiceLevel, ALL_SCREENS,
} from "@/types/rbac";
import {
  buildDefaultRoles, buildDefaultUsers, getRoleByCode,
  normalizeRoleCode, suggestDuplicatedCode, validateRoleCode,
  migrateRolesAddingMissingScreens, legacyRoleToCode,
} from "@/utils/rbac";
import * as rbacApi from "@/services/rbac.api";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { tenantStorage, type TenantScopedStorage } from "@/lib/tenantStorage";
import { appendRbacAuditEvent } from "@/lib/rbac-audit";

const log = {
  debug: (...a: unknown[]) => { if (process.env.NODE_ENV !== "production") console.debug("[rbac]", ...a); },
};
function fireSync<T>(p: Promise<T>): void {
  p.catch((err) => log.debug("rbac sync failed:", (err as Error)?.message || err));
}

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// G8 (v1.2.0): localStorage scoped por tenant via tenantStorage().
function loadFromLocalStorage(storage: TenantScopedStorage): { roles: PlatformRole[]; users: PlatformUser[]; currentUserId: string | null } {
  if (typeof window === "undefined") {
    return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  }
  const rawRoles = safeJsonParse<PlatformRole[]>(storage.get(RBAC_STORAGE.roles)) ?? buildDefaultRoles();
  // Migración lazy: si el localStorage trae roles viejos sin las nuevas
  // screens (p.ej. "entrenamiento_ia"), las rellenamos con noPerm() para
  // que el lookup nunca devuelva undefined y no rompa Sidebar/AccessPreview.
  const roles = migrateRolesAddingMissingScreens(rawRoles);
  const users = safeJsonParse<PlatformUser[]>(storage.get(RBAC_STORAGE.users)) ?? buildDefaultUsers();
  const currentUserId = storage.get(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

function notifyRbacChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ams-rbac-changed"));
}
function persistRoles(storage: TenantScopedStorage, roles: PlatformRole[]) {
  storage.set(RBAC_STORAGE.roles, JSON.stringify(roles));
  notifyRbacChange();
}
function persistUsers(storage: TenantScopedStorage, users: PlatformUser[]) {
  storage.set(RBAC_STORAGE.users, JSON.stringify(users));
  notifyRbacChange();
}
function persistCurrent(storage: TenantScopedStorage, id: string | null) {
  if (id) storage.set(RBAC_STORAGE.currentUser, id);
  else    storage.remove(RBAC_STORAGE.currentUser);
  notifyRbacChange();
}

// ============================================================
// Hook principal
// ============================================================

export interface UseAccessAdmin {
  // estado
  roles: PlatformRole[];
  users: PlatformUser[];
  currentUser: PlatformUser | null;
  currentUserId: string | null;
  loading: boolean;

  // roles
  createRole(input: Partial<PlatformRole> & { name: string; code: string }): { ok: true; role: PlatformRole } | { ok: false; error: string };
  updateRole(id: string, patch: Partial<PlatformRole>): { ok: true; role: PlatformRole } | { ok: false; error: string };
  deleteRole(id: string): { ok: true } | { ok: false; error: string };
  duplicateRole(id: string): { ok: true; role: PlatformRole } | { ok: false; error: string };
  togglePermission(roleId: string, screen: PlatformScreen, action: PermissionAction): void;
  setRolePermissions(roleId: string, screen: PlatformScreen, perm: RolePermission): void;

  // users
  createUser(input: { name: string; email: string; roleCode: string; serviceLevel: ServiceLevel }): { ok: true; user: PlatformUser } | { ok: false; error: string };
  updateUser(id: string, patch: Partial<PlatformUser>): { ok: true; user: PlatformUser } | { ok: false; error: string };
  deleteUser(id: string): { ok: true } | { ok: false; error: string };
  toggleUserStatus(id: string): void;
  setCurrentUser(id: string | null): void;

  // reset
  resetDemoData(): void;

  // helpers expuestos
  countUsersByRoleCode(code: string): number;
}

export function useAccessAdmin(): UseAccessAdmin {
  const { user: authUser } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id || "default";
  // Ref para que los useCallback con deps estables sigan apuntando al storage actual.
  const storageRef = useRef<TenantScopedStorage>(tenantStorage(tenantId));
  useEffect(() => { storageRef.current = tenantStorage(tenantId); }, [tenantId]);

  const [roles, setRoles]               = useState<PlatformRole[]>([]);
  const [users, setUsers]               = useState<PlatformUser[]>([]);
  const [currentUserId, setCurrentUId]  = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);

  // Resuelve quién está realizando la mutación RBAC (siempre el user real
  // autenticado, NUNCA el simulado, para que la auditoría refleje al
  // operador humano detrás del cambio).
  const actorIdentity = useMemo(() => {
    if (!authUser) return { actor: "system", actorRoleCode: undefined };
    return {
      actor: authUser.email || authUser.name || authUser.id,
      actorRoleCode: legacyRoleToCode(authUser.role),
    };
  }, [authUser]);

  // Load on mount (offline-first: localStorage primero, después hidratar desde backend)
  useEffect(() => {
    const data = loadFromLocalStorage(storageRef.current);
    setRoles(data.roles);
    setUsers(data.users);
    setCurrentUId(data.currentUserId);
    setLoading(false);
    // Hidratación backend en background
    (async () => {
      try {
        const snap = await rbacApi.getSnapshot();
        setRoles(snap.roles);
        setUsers(snap.users);
        persistRoles(storageRef.current, snap.roles);
        persistUsers(storageRef.current, snap.users);
      } catch (err) {
        log.debug("rbac backend offline:", (err as Error)?.message);
      }
    })();
  }, []);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) ?? null, [users, currentUserId]);

  // -------- roles --------
  const createRole: UseAccessAdmin["createRole"] = useCallback((input) => {
    const code = normalizeRoleCode(input.code);
    const err = validateRoleCode(code, roles.map((r) => r.code));
    if (err) return { ok: false, error: err };
    const fresh: PlatformRole = {
      id: uid("role"),
      name: (input.name || code).trim(),
      code,
      description: input.description || "",
      isSystem: false,
      permissions: input.permissions ?? (buildDefaultRoles().find((r) => r.code === "GENERAL_USER")?.permissions ?? ({} as never)),
      createdAt: now(), updatedAt: now(),
    };
    setRoles((rs) => {
      const next = [...rs, fresh];
      persistRoles(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.upsertRole(fresh));
    appendRbacAuditEvent({
      eventType: "ROLE_CREATED",
      actor: actorIdentity.actor,
      actorRoleCode: actorIdentity.actorRoleCode,
      subject: fresh.code,
      metadata: { roleId: fresh.id, roleName: fresh.name },
    });
    return { ok: true, role: fresh };
  }, [roles, actorIdentity]);

  const updateRole: UseAccessAdmin["updateRole"] = useCallback((id, patch) => {
    const target = roles.find((r) => r.id === id);
    if (!target) return { ok: false, error: "Rol no encontrado." };
    let nextCode = target.code;
    if (patch.code !== undefined) {
      const c = normalizeRoleCode(patch.code);
      const err = validateRoleCode(c, roles.map((r) => r.code), target.code);
      if (err) return { ok: false, error: err };
      nextCode = c;
    }
    const updated: PlatformRole = {
      ...target,
      ...patch,
      code: nextCode,
      isSystem: target.isSystem, // no se puede modificar
      updatedAt: now(),
    };
    setRoles((rs) => {
      const next = rs.map((r) => (r.id === id ? updated : r));
      persistRoles(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.upsertRole(updated));
    // Si cambió el code, propagar a los users que tenían el viejo
    if (nextCode !== target.code) {
      setUsers((us) => {
        const next = us.map((u) => {
          if (u.roleCode !== target.code) return u;
          const updatedUser = { ...u, roleCode: nextCode };
          fireSync(rbacApi.upsertUser(updatedUser));
          return updatedUser;
        });
        persistUsers(storageRef.current, next);
        return next;
      });
    }
    return { ok: true, role: updated };
  }, [roles]);

  const deleteRole: UseAccessAdmin["deleteRole"] = useCallback((id) => {
    const target = roles.find((r) => r.id === id);
    if (!target) return { ok: false, error: "Rol no encontrado." };
    if (target.isSystem) return { ok: false, error: "No se puede eliminar un rol de sistema." };
    const usersWithThisRole = users.filter((u) => u.roleCode === target.code);
    if (usersWithThisRole.length > 0) {
      return { ok: false, error: `Hay ${usersWithThisRole.length} usuario(s) con este rol. Reasignalos antes de eliminar.` };
    }
    setRoles((rs) => {
      const next = rs.filter((r) => r.id !== id);
      persistRoles(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.deleteRole(id));
    appendRbacAuditEvent({
      eventType: "ROLE_DELETED",
      actor: actorIdentity.actor,
      actorRoleCode: actorIdentity.actorRoleCode,
      subject: target.code,
      metadata: { roleId: target.id, roleName: target.name },
    });
    return { ok: true };
  }, [roles, users, actorIdentity]);

  const duplicateRole: UseAccessAdmin["duplicateRole"] = useCallback((id) => {
    const target = roles.find((r) => r.id === id);
    if (!target) return { ok: false, error: "Rol no encontrado." };
    const newCode = suggestDuplicatedCode(target.code, roles.map((r) => r.code));
    const dup: PlatformRole = {
      ...target,
      id: uid("role"),
      code: newCode,
      name: `${target.name} (copia)`,
      isSystem: false,
      createdAt: now(), updatedAt: now(),
      permissions: JSON.parse(JSON.stringify(target.permissions)),
    };
    setRoles((rs) => {
      const next = [...rs, dup];
      persistRoles(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.upsertRole(dup));
    return { ok: true, role: dup };
  }, [roles]);

  const togglePermission: UseAccessAdmin["togglePermission"] = useCallback((roleId, screen, action) => {
    setRoles((rs) => {
      let updated: PlatformRole | null = null;
      let previousValue: boolean | undefined = undefined;
      const next = rs.map((r) => {
        if (r.id !== roleId) return r;
        const screenPerm = r.permissions[screen];
        previousValue = screenPerm[action];
        updated = {
          ...r,
          updatedAt: now(),
          permissions: {
            ...r.permissions,
            [screen]: { ...screenPerm, [action]: !screenPerm[action] },
          },
        };
        return updated;
      });
      persistRoles(storageRef.current, next);
      if (updated) {
        fireSync(rbacApi.upsertRole(updated));
        const u = updated as PlatformRole;
        appendRbacAuditEvent({
          eventType: "ROLE_PERMISSIONS_UPDATED",
          actor: actorIdentity.actor,
          actorRoleCode: actorIdentity.actorRoleCode,
          subject: u.code,
          screen,
          action,
          metadata: {
            roleId: u.id,
            roleName: u.name,
            from: previousValue,
            to: !previousValue,
            change: "toggle",
          },
        });
      }
      return next;
    });
  }, [actorIdentity]);

  const setRolePermissions: UseAccessAdmin["setRolePermissions"] = useCallback((roleId, screen, perm) => {
    setRoles((rs) => {
      let updated: PlatformRole | null = null;
      let previousPerm: RolePermission | undefined = undefined;
      const next = rs.map((r) => {
        if (r.id !== roleId) return r;
        previousPerm = r.permissions[screen];
        updated = { ...r, updatedAt: now(), permissions: { ...r.permissions, [screen]: { ...perm } } };
        return updated;
      });
      persistRoles(storageRef.current, next);
      if (updated) {
        fireSync(rbacApi.upsertRole(updated));
        const u = updated as PlatformRole;
        appendRbacAuditEvent({
          eventType: "ROLE_PERMISSIONS_UPDATED",
          actor: actorIdentity.actor,
          actorRoleCode: actorIdentity.actorRoleCode,
          subject: u.code,
          screen,
          metadata: {
            roleId: u.id,
            roleName: u.name,
            from: previousPerm,
            to: perm,
            change: "bulk_set",
          },
        });
      }
      return next;
    });
  }, [actorIdentity]);

  // -------- users --------
  const createUser: UseAccessAdmin["createUser"] = useCallback((input) => {
    if (!input.name?.trim())  return { ok: false, error: "Nombre requerido." };
    if (!input.email?.trim()) return { ok: false, error: "Email requerido." };
    if (!input.roleCode)      return { ok: false, error: "Rol requerido." };
    if (!input.serviceLevel)  return { ok: false, error: "Nivel de servicio requerido." };
    if (!getRoleByCode(input.roleCode, roles)) return { ok: false, error: "Rol inexistente." };
    if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      return { ok: false, error: "Ya existe un usuario con ese email." };
    }
    const fresh: PlatformUser = {
      id: uid("u"),
      name: input.name.trim(),
      email: input.email.trim(),
      roleCode: input.roleCode,
      serviceLevel: input.serviceLevel,
      status: "ACTIVE",
      createdAt: now(),
    };
    setUsers((us) => {
      const next = [...us, fresh];
      persistUsers(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.upsertUser(fresh));
    return { ok: true, user: fresh };
  }, [roles, users]);

  const updateUser: UseAccessAdmin["updateUser"] = useCallback((id, patch) => {
    const target = users.find((u) => u.id === id);
    if (!target) return { ok: false, error: "Usuario no encontrado." };
    if (patch.email && users.some((u) => u.id !== id && u.email.toLowerCase() === patch.email!.toLowerCase())) {
      return { ok: false, error: "Otro usuario ya usa ese email." };
    }
    if (patch.roleCode && !getRoleByCode(patch.roleCode, roles)) {
      return { ok: false, error: "Rol inexistente." };
    }
    const updated: PlatformUser = { ...target, ...patch };
    setUsers((us) => {
      const next = us.map((u) => (u.id === id ? updated : u));
      persistUsers(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.upsertUser(updated));
    // Audit USER_ROLE_CHANGED si cambió el roleCode
    if (patch.roleCode && patch.roleCode !== target.roleCode) {
      appendRbacAuditEvent({
        eventType: "USER_ROLE_CHANGED",
        actor: actorIdentity.actor,
        actorRoleCode: actorIdentity.actorRoleCode,
        subject: updated.email || updated.id,
        metadata: {
          userId: updated.id,
          from: target.roleCode,
          to: updated.roleCode,
        },
      });
    }
    return { ok: true, user: updated };
  }, [users, roles, actorIdentity]);

  const deleteUser: UseAccessAdmin["deleteUser"] = useCallback((id) => {
    if (!users.find((u) => u.id === id)) return { ok: false, error: "Usuario no encontrado." };
    setUsers((us) => {
      const next = us.filter((u) => u.id !== id);
      persistUsers(storageRef.current, next);
      return next;
    });
    fireSync(rbacApi.deleteUser(id));
    if (currentUserId === id) {
      setCurrentUId(null);
      persistCurrent(storageRef.current, null);
    }
    return { ok: true };
  }, [users, currentUserId]);

  const toggleUserStatus: UseAccessAdmin["toggleUserStatus"] = useCallback((id) => {
    setUsers((us) => {
      let updated: PlatformUser | null = null;
      const next = us.map((u) => {
        if (u.id !== id) return u;
        updated = { ...u, status: u.status === "ACTIVE" ? "INACTIVE" as const : "ACTIVE" as const };
        return updated;
      });
      persistUsers(storageRef.current, next);
      if (updated) fireSync(rbacApi.upsertUser(updated));
      return next;
    });
  }, []);

  const setCurrentUser: UseAccessAdmin["setCurrentUser"] = useCallback((id) => {
    setCurrentUId(id);
    persistCurrent(storageRef.current, id);
    if (id) {
      const target = users.find((u) => u.id === id);
      appendRbacAuditEvent({
        eventType: "RBAC_OVERRIDE_ACTIVATED",
        actor: actorIdentity.actor,
        actorRoleCode: actorIdentity.actorRoleCode,
        subject: target?.email || id,
        metadata: {
          simulatedUserId: id,
          simulatedRoleCode: target?.roleCode,
          simulatedName: target?.name,
        },
      });
    } else {
      appendRbacAuditEvent({
        eventType: "RBAC_OVERRIDE_CLEARED",
        actor: actorIdentity.actor,
        actorRoleCode: actorIdentity.actorRoleCode,
      });
    }
  }, [users, actorIdentity]);

  // -------- reset --------
  const resetDemoData: UseAccessAdmin["resetDemoData"] = useCallback(() => {
    (async () => {
      try {
        const snap = await rbacApi.resetDemo();
        setRoles(snap.roles);
        setUsers(snap.users);
        setCurrentUId(null);
        persistRoles(storageRef.current, snap.roles);
        persistUsers(storageRef.current, snap.users);
        persistCurrent(storageRef.current, null);
        return;
      } catch { /* fallback local */ }
      // Borrar keys scoped del tenant actual (no afecta otros tenants).
      storageRef.current.remove(RBAC_STORAGE.roles);
      storageRef.current.remove(RBAC_STORAGE.users);
      storageRef.current.remove(RBAC_STORAGE.currentUser);
      const freshRoles = buildDefaultRoles();
      const freshUsers = buildDefaultUsers();
      persistRoles(storageRef.current, freshRoles);
      persistUsers(storageRef.current, freshUsers);
      persistCurrent(storageRef.current, null);
      setRoles(freshRoles);
      setUsers(freshUsers);
      setCurrentUId(null);
    })();
  }, []);

  const countUsersByRoleCode = useCallback((code: string) => users.filter((u) => u.roleCode === code).length, [users]);

  return {
    roles, users, currentUser, currentUserId, loading,
    createRole, updateRole, deleteRole, duplicateRole, togglePermission, setRolePermissions,
    createUser, updateUser, deleteUser, toggleUserStatus, setCurrentUser,
    resetDemoData, countUsersByRoleCode,
  };
}

// Re-export para conveniencia de los consumidores
export { ALL_SCREENS };
