// Cliente del backend RBAC.
import type { PlatformRole, PlatformUser } from "@/types/rbac";

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export interface RbacSnapshot { roles: PlatformRole[]; users: PlatformUser[] }

export async function getSnapshot(): Promise<RbacSnapshot> {
  const d = await http<{ success: true } & RbacSnapshot>("/api/rbac/snapshot");
  return { roles: d.roles || [], users: d.users || [] };
}
export async function upsertRole(r: PlatformRole): Promise<PlatformRole> {
  const x = await http<{ success: true; role: PlatformRole }>("/api/rbac/roles", { method: "POST", body: JSON.stringify(r) });
  return x.role;
}
export async function deleteRole(id: string): Promise<void> {
  await http(`/api/rbac/roles/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export async function upsertUser(u: PlatformUser): Promise<PlatformUser> {
  const x = await http<{ success: true; user: PlatformUser }>("/api/rbac/users", { method: "POST", body: JSON.stringify(u) });
  return x.user;
}
export async function deleteUser(id: string): Promise<void> {
  await http(`/api/rbac/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export async function resetDemo(): Promise<RbacSnapshot> {
  const d = await http<{ success: true } & RbacSnapshot>("/api/rbac/reset-demo", { method: "POST" });
  return { roles: d.roles || [], users: d.users || [] };
}
