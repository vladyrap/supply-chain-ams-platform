"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { me as fetchMe, logout as apiLogout, refreshSession } from "@/services/auth.api";
import { clearRoccoClientState } from "@/lib/clearClientState";
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

  // Aislamiento por usuario: id del último usuario cargado en ESTA página.
  const lastUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    let res = await fetchMe();
    // Si la sesión de acceso expiró pero existe refresh token, rotarlo y reintentar /me una vez.
    if (!("success" in res && res.success)) {
      const rot = await refreshSession();
      if ("success" in rot && rot.success) {
        res = await fetchMe();
      }
    }
    if ("success" in res && res.success) {
      const newId = res.user.id;
      // Si se cargó un usuario DISTINTO en la misma instancia de página (ej.
      // re-login sin logout tras expirar la sesión), limpiar todo y recargar
      // para tirar singletons module-level y estado del usuario anterior.
      if (lastUserIdRef.current && lastUserIdRef.current !== newId) {
        clearRoccoClientState();
        window.location.reload();
        return;
      }
      lastUserIdRef.current = newId;
      setUser(res.user);
    } else {
      lastUserIdRef.current = null;
      setUser(null);
    }
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
    try { await apiLogout(); } catch { /* limpiar el cliente igual */ }
    // Teardown TOTAL: storage + override + hard reload (tira todos los
    // singletons module-level + estado React del usuario anterior).
    clearRoccoClientState();
    lastUserIdRef.current = null;
    window.location.assign("/login");
  }, []);

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
