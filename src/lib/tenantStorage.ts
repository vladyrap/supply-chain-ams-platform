// =============================================================================
// tenantStorage.ts — Helper de localStorage scoped por tenant (G8, v1.2.0)
// =============================================================================
// Aísla datos del cliente (tenant) en localStorage para evitar cross-tenant
// leaks cuando un mismo browser cambia de tenant (super_admin override,
// tests, multi-account, etc).
//
// PATRÓN:
//   const { tenant } = useTenant();
//   const storage = useMemo(
//     () => tenantStorage(tenant?.id || "default"),
//     [tenant?.id],
//   );
//   storage.get(KEY); storage.set(KEY, value); storage.remove(KEY);
//
// Key shape: `tnt:${tenantId}:${originalKey}`
//
// NO SCOPED (preferencias del browser/UI, no del tenant):
//   - theme, accent, aurora intensity (PlatformContext)
//   - sidebar prefs, notif last-read
//   - sentry, language
// =============================================================================

const PREFIX_ROOT = "tnt:";

export interface TenantScopedStorage {
  /** Devuelve null en SSR o si la key no existe. */
  get(key: string): string | null;
  /** No-op en SSR. */
  set(key: string, value: string): void;
  /** No-op en SSR. */
  remove(key: string): void;
  /** Borra TODAS las keys del tenant. Útil para logout / switch. */
  clear(): void;
  /** Devuelve el prefix completo (útil para debug). */
  prefix(): string;
}

/** Factory: devuelve un wrapper de localStorage scoped a `tenantId`. */
export function tenantStorage(tenantId: string): TenantScopedStorage {
  const safeTenantId = (tenantId || "default").trim() || "default";
  const prefix = `${PREFIX_ROOT}${safeTenantId}:`;
  return {
    get(key: string): string | null {
      if (typeof window === "undefined") return null;
      try { return window.localStorage.getItem(prefix + key); } catch { return null; }
    },
    set(key: string, value: string): void {
      if (typeof window === "undefined") return;
      try { window.localStorage.setItem(prefix + key, value); } catch { /* quota / disabled */ }
    },
    remove(key: string): void {
      if (typeof window === "undefined") return;
      try { window.localStorage.removeItem(prefix + key); } catch { /* ignore */ }
    },
    clear(): void {
      if (typeof window === "undefined") return;
      try {
        const toDelete: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) toDelete.push(k);
        }
        for (const k of toDelete) window.localStorage.removeItem(k);
      } catch { /* ignore */ }
    },
    prefix(): string { return prefix; },
  };
}

/**
 * Helper para detectar si una storage key cualquiera corresponde al prefix
 * scoped de un tenant. Útil para el listener `storage` cuando queremos
 * reaccionar sólo a cambios del tenant actual.
 */
export function isTenantScopedKey(rawKey: string | null, tenantId: string, originalKey: string): boolean {
  if (!rawKey) return false;
  const safeTenantId = (tenantId || "default").trim() || "default";
  return rawKey === `${PREFIX_ROOT}${safeTenantId}:${originalKey}`;
}
