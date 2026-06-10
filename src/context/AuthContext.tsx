"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { me as fetchMe, logout as apiLogout, refreshSession } from "@/services/auth.api";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Rutas públicas (no requieren sesión)
// v1.2.5-prod: incluir /forgot-password y /reset-password para que el flow
// de recuperación funcione sin estar autenticado.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    let res = await fetchMe();
    // Si la sesión de acceso expiró pero existe refresh token, rotarlo y reintentar /me una vez.
    if (!("success" in res && res.success)) {
      const rot = await refreshSession();
      if ("success" in rot && rot.success) {
        res = await fetchMe();
      }
    }
    if ("success" in res && res.success) setUser(res.user);
    else setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh silencioso del access cookie cada 20 min mientras hay sesión activa.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      refreshSession().catch(() => null);
    }, 20 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [user]);

  // Redirigir si no hay sesión y no es ruta pública
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
    if (!user && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    }
    if (user && isPublic) {
      router.replace("/dashboard");
    }
  }, [user, loading, pathname, router]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
