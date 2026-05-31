"use client";

// Hook con cache simple para el catálogo de scope items SAP.
// Una sola carga al mount; los demás componentes comparten la misma lista
// a través de localStorage como respaldo offline.

import { useCallback, useEffect, useState } from "react";
import { listScopeItems, type SapScopeItem, type SapModule } from "@/services/scope-items.api";

const LS_KEY = "supply-chain-ams-scope-items-cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache(): { items: SapScopeItem[]; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(items: SapScopeItem[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify({ items, ts: Date.now() })); } catch { /* */ }
}

export interface UseScopeItems {
  items: SapScopeItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  byModule: (m: SapModule) => SapScopeItem[];
  byCode: (code: string) => SapScopeItem | undefined;
}

export function useScopeItems(): UseScopeItems {
  const [items, setItems] = useState<SapScopeItem[]>(() => readCache()?.items ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    const r = await listScopeItems();
    if ("success" in r && r.success) {
      setItems(r.items);
      writeCache(r.items);
    } else {
      setError("error" in r ? r.error : "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const cache = readCache();
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS && cache.items.length > 0) {
      // Cache fresh — no refrescamos
      return;
    }
    refresh();
  }, [refresh]);

  const byModule = useCallback((m: SapModule) => items.filter((it) => it.module === m), [items]);
  const byCode = useCallback((code: string) => items.find((it) => it.code === code), [items]);

  return { items, loading, error, refresh, byModule, byCode };
}
