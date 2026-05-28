"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RBAC_STORAGE, type PlatformRole, type PlatformUser, type PlatformScreen,
  type PermissionAction, type RolePermission, type ServiceLevel, ALL_SCREENS,
} from "@/types/rbac";
import {
  buildDefaultRoles, buildDefaultUsers, getRoleByCode,
  normalizeRoleCode, suggestDuplicatedCode, validateRoleCode,
} from "@/utils/rbac";

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function loadFromLocalStorage(): { roles: PlatformRole[]; users: PlatformUser[]; currentUserId: string | null } {
  if (typeof window === "undefined") {
    return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  }
  const roles = safeJsonParse<PlatformRole[]>(localStorage.getItem(RBAC_STORAGE.roles)) ?? buildDefaultRoles();
  const users = safeJsonParse<PlatformUser[]>(localStorage.getItem(RBAC_STORAGE.users)) ?? buildDefaultUsers();
  const currentUserId = localStorage.getItem(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

function notifyRbacChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ams-rbac-changed"));
}
function persistRoles(roles: PlatformRole[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RBAC_STORAGE.roles, JSON.stringify(roles));
  notifyRbacChange();
}
function persistUsers(users: PlatformUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RBAC_STORAGE.users, JSON.stringify(users));
  notifyRbacChange();
}
function persistCurrent(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(RBAC_STORAGE.currentUser, id);
  else    localStorage.removeItem(RBAC_STORAGE.currentUser);
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
  const [roles, setRoles]               = useState<PlatformRole[]>([]);
  const [users, setUsers]               = useState<PlatformUser[]>([]);
  const [currentUserId, setCurrentUId]  = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);

  // Load on mount
  useEffect(() => {
    const data = loadFromLocalStorage();
    setRoles(data.roles);
    setUsers(data.users);
    setCurrentUId(data.currentUserId);
    setLoading(false);
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
      persistRoles(next);
      return next;
    });
    return { ok: true, role: fresh };
  }, [roles]);

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
      persistRoles(next);
      return next;
    });
    // Si cambió el code, propagar a los users que tenían el viejo
    if (nextCode !== target.code) {
      setUsers((us) => {
        const next = us.map((u) => (u.roleCode === target.code ? { ...u, roleCode: nextCode } : u));
        persistUsers(next);
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
      persistRoles(next);
      return next;
    });
    return { ok: true };
  }, [roles, users]);

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
      persistRoles(next);
      return next;
    });
    return { ok: true, role: dup };
  }, [roles]);

  const togglePermission: UseAccessAdmin["togglePermission"] = useCallback((roleId, screen, action) => {
    setRoles((rs) => {
      const next = rs.map((r) => {
        if (r.id !== roleId) return r;
        const screenPerm = r.permissions[screen];
        return {
          ...r,
          updatedAt: now(),
          permissions: {
            ...r.permissions,
            [screen]: { ...screenPerm, [action]: !screenPerm[action] },
          },
        };
      });
      persistRoles(next);
      return next;
    });
  }, []);

  const setRolePermissions: UseAccessAdmin["setRolePermissions"] = useCallback((roleId, screen, perm) => {
    setRoles((rs) => {
      const next = rs.map((r) => r.id === roleId
        ? { ...r, updatedAt: now(), permissions: { ...r.permissions, [screen]: { ...perm } } }
        : r);
      persistRoles(next);
      return next;
    });
  }, []);

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
      persistUsers(next);
      return next;
    });
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
      persistUsers(next);
      return next;
    });
    return { ok: true, user: updated };
  }, [users, roles]);

  const deleteUser: UseAccessAdmin["deleteUser"] = useCallback((id) => {
    if (!users.find((u) => u.id === id)) return { ok: false, error: "Usuario no encontrado." };
    setUsers((us) => {
      const next = us.filter((u) => u.id !== id);
      persistUsers(next);
      return next;
    });
    if (currentUserId === id) {
      setCurrentUId(null);
      persistCurrent(null);
    }
    return { ok: true };
  }, [users, currentUserId]);

  const toggleUserStatus: UseAccessAdmin["toggleUserStatus"] = useCallback((id) => {
    setUsers((us) => {
      const next = us.map((u) => u.id === id ? { ...u, status: u.status === "ACTIVE" ? "INACTIVE" as const : "ACTIVE" as const } : u);
      persistUsers(next);
      return next;
    });
  }, []);

  const setCurrentUser: UseAccessAdmin["setCurrentUser"] = useCallback((id) => {
    setCurrentUId(id);
    persistCurrent(id);
  }, []);

  // -------- reset --------
  const resetDemoData: UseAccessAdmin["resetDemoData"] = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(RBAC_STORAGE.roles);
      localStorage.removeItem(RBAC_STORAGE.users);
      localStorage.removeItem(RBAC_STORAGE.currentUser);
    }
    const freshRoles = buildDefaultRoles();
    const freshUsers = buildDefaultUsers();
    persistRoles(freshRoles);
    persistUsers(freshUsers);
    persistCurrent(null);
    setRoles(freshRoles);
    setUsers(freshUsers);
    setCurrentUId(null);
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
