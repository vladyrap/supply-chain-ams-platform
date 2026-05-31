import type { AuthUser, Role } from "@/types";

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

interface OkUser { success: true; user: AuthUser }
interface Err    { success: false; error: string }

async function call<T>(path: string, init: RequestInit = {}): Promise<T | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as T | { success: false; error: string } | null;
    if (!data) return { success: false, error: `HTTP ${res.status}` };
    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function signup(email: string, password: string, name?: string, role?: Role) {
  return call<OkUser | Err>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name, role }),
  });
}

export async function login(email: string, password: string) {
  return call<OkUser | Err>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
    body: JSON.stringify({ role }),
  });
}
