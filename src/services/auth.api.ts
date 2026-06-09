import type { AuthUser, Role } from "@/types";
import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

interface OkUser { success: true; user: AuthUser }
interface Err    { success: false; error: string }

async function call<T>(path: string, opts: ApiFetchOptions = {}): Promise<T | { success: false; error: string }> {
  try {
    const data = await apiFetch<T>(path, opts);
    if (data === null || data === undefined) return { success: false, error: "no data" } as { success: false; error: string };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function signup(email: string, password: string, name?: string, role?: Role) {
  return call<OkUser | Err>("/api/auth/signup", {
    method: "POST",
    body: { email, password, name, role },
  });
}

export async function login(email: string, password: string) {
  return call<OkUser | Err>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function logout() {
  return call<{ success: true } | Err>("/api/auth/logout", { method: "POST" });
}

export async function logoutAll() {
  return call<{ success: true; revoked: number } | Err>("/api/auth/logout-all", { method: "POST" });
}

export async function me() {
  return call<OkUser | Err>("/api/auth/me");
}

// Rota el refresh token (cookie ams_refresh) y emite una nueva sesión.
// Backend: POST /api/auth/refresh. Devuelve 401 si la cookie es inválida o expiró.
export async function refreshSession() {
  return call<{ success: true; expiresAt: string } | Err>("/api/auth/refresh", { method: "POST" });
}

export interface SessionInfo {
  id: string;
  created_at: string;
  last_used_at: string | null;
  user_agent: string | null;
  ip_address: string | null;
  current: boolean;
}
export async function listSessions() {
  return call<{ success: true; sessions: SessionInfo[] } | Err>("/api/auth/sessions");
}

export interface UsersList { success: true; count: number; users: AuthUser[] }
export async function listUsers() {
  return call<UsersList | Err>("/api/auth/users");
}

export async function updateUserRole(userId: string, role: Role) {
  return call<OkUser | Err>(`/api/auth/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });
}
