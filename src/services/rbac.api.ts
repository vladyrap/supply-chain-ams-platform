// Cliente del backend RBAC.
import type { PlatformRole, PlatformUser } from "@/types/rbac";
import { apiFetch, type ApiFetchOptions } from "./_http";

async function http<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, opts);
}

export interface RbacSnapshot { roles: PlatformRole[]; users: PlatformUser[] }

export async function getSnapshot(): Promise<RbacSnapshot> {
  const d = await http<{ success: true } & RbacSnapshot>("/api/rbac/snapshot");
  return { roles: d.roles || [], users: d.users || [] };
}
export async function upsertRole(r: PlatformRole): Promise<PlatformRole> {
  const x = await http<{ success: true; role: PlatformRole }>("/api/rbac/roles", { method: "POST", body: r });
  return x.role;
}
export async function deleteRole(id: string): Promise<void> {
  await http(`/api/rbac/roles/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export async function upsertUser(u: PlatformUser): Promise<PlatformUser> {
  const x = await http<{ success: true; user: PlatformUser }>("/api/rbac/users", { method: "POST", body: u });
  return x.user;
}
export async function deleteUser(id: string): Promise<void> {
  await http(`/api/rbac/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export async function resetDemo(): Promise<RbacSnapshot> {
  const d = await http<{ success: true } & RbacSnapshot>("/api/rbac/reset-demo", { method: "POST" });
  return { roles: d.roles || [], users: d.users || [] };
}

// v1.2.8-prod · inviteUser vive en admin-users.api.ts (crea cuenta + email).
