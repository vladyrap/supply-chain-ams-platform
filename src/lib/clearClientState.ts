"use client";

// =============================================================================
// clearClientState.ts — Teardown total del estado de cliente (aislamiento user)
// =============================================================================
// Borra TODO el estado de ROCCO en el navegador al hacer logout o al cambiar de
// usuario, para evitar cross-user leaks: localStorage + sessionStorage (todas
// las keys con prefijo ROCCO, tenant-scoped y globales) + reset del override de
// tenant en memoria. Se usa junto con un hard reload (window.location) que
// además tira todos los singletons module-level (jiraInMemoryCache, core cache,
// autoTriggeredThisSession, etc.) y el árbol de React.
// =============================================================================

import { setTenantOverride } from "@/services/_http";

// Prefijos de TODAS las keys de ROCCO en storage. El origin (ams.roccoai.cl)
// está aislado, así que sólo hay keys de ROCCO — pero limpiamos por prefijo
// para no tocar nada externo (p.ej. claves internas del framework).
const ROCCO_KEY_PREFIXES = ["tnt:", "supply-chain-ams", "ams-"];

function clearStore(store: Storage): void {
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && ROCCO_KEY_PREFIXES.some((p) => k.startsWith(p))) toDelete.push(k);
    }
    for (const k of toDelete) store.removeItem(k);
  } catch {
    /* storage deshabilitado / quota — ignore */
  }
}

/**
 * Limpia todo el estado de cliente de ROCCO. Idempotente y SSR-safe.
 * Llamar en logout y al detectar cambio de usuario.
 */
export function clearRoccoClientState(): void {
  if (typeof window === "undefined") return;
  clearStore(window.localStorage);
  clearStore(window.sessionStorage);
  try { setTenantOverride(null); } catch { /* ignore */ }
}
