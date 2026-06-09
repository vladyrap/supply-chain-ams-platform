"use client";

// =============================================================================
// TenantContext — Tenant awareness en el frontend (v1.2.0)
// =============================================================================
// Provider que:
//   1. Detecta el tenant del usuario actual via GET /api/tenants/me
//   2. Expone tenant + reload + setOverride (super_admin)
//   3. Permite a Sidebar/email templates leer branding
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMyTenant, type Tenant } from "../services/tenants.api";
import { setTenantOverride } from "../services/_http";

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Set super_admin tenant override (envía X-Tenant-Id). null = clear. */
  setOverride: (tenantId: string | null) => void;
  /** Tenant override actual si aplicado. */
  override: string | null;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  error: null,
  reload: async () => {},
  setOverride: () => {},
  override: null,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [override, setOverrideState] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await getMyTenant();
      setTenant(t);
    } catch (err) {
      const msg = (err as Error).message;
      // Si el user no está autenticado, el endpoint da 401 — esperado.
      if (!msg.includes("401")) {
        setError(msg);
      }
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setOverride = useCallback((tenantId: string | null) => {
    setOverrideState(tenantId);
    setTenantOverride(tenantId);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, reload, setOverride, override }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}

/** Helper: ¿el user actual es super_admin del tenant 'default'? */
export function useIsSuperAdmin(): boolean {
  const { tenant } = useTenant();
  return tenant?.id === "default";
}
