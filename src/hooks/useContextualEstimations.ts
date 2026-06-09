"use client";

// Hook + persistencia para estimaciones contextuales (motor v2).
//
// Almacena un array de ContextualEstimationResult. Permite guardar, listar,
// eliminar y exportar — análogo a useTimeEstimator pero para los outputs del
// Contextual AMS Engine.
//
// Key: supply-chain-ams-contextual-estimations (scoped por tenant en v1.2.0).
// Sync entre tabs vía storage event + custom event "ams-contextual-changed".
// G8 (v1.2.0): localStorage scoped por tenant via tenantStorage().

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContextualEstimationResult } from "@/types/estimation";
import { useTenant } from "@/context/TenantContext";
import { tenantStorage, isTenantScopedKey } from "@/lib/tenantStorage";

const STORAGE_KEY = "supply-chain-ams-contextual-estimations";
const EVT = "ams-contextual-changed";

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export interface UseContextualEstimations {
  estimations: ContextualEstimationResult[];
  save: (e: ContextualEstimationResult) => void;
  remove: (id: string) => void;
  clear: () => void;
  getById: (id: string) => ContextualEstimationResult | undefined;
}

export function useContextualEstimations(): UseContextualEstimations {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || "default";
  const storage = useMemo(() => tenantStorage(tenantId), [tenantId]);

  const [estimations, setEstimations] = useState<ContextualEstimationResult[]>([]);

  useEffect(() => {
    setEstimations(safe<ContextualEstimationResult[]>(storage.get(STORAGE_KEY)) ?? []);
  }, [storage]);

  useEffect(() => {
    function reload() {
      setEstimations(safe<ContextualEstimationResult[]>(storage.get(STORAGE_KEY)) ?? []);
    }
    function onStorage(e: StorageEvent) {
      if (isTenantScopedKey(e.key, tenantId, STORAGE_KEY)) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, [storage, tenantId]);

  const persist = useCallback((next: ContextualEstimationResult[]) => {
    setEstimations(next);
    storage.set(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, [storage]);

  const save: UseContextualEstimations["save"] = useCallback((e) => {
    // Si ya existe con el mismo id, sobreescribir; si no, agregar al principio.
    setEstimations((cur) => {
      const idx = cur.findIndex((x) => x.estimateId === e.estimateId);
      let next: ContextualEstimationResult[];
      if (idx >= 0) {
        next = [...cur];
        next[idx] = e;
      } else {
        next = [e, ...cur];
      }
      // Persistir
      storage.set(STORAGE_KEY, JSON.stringify(next));
      emit();
      return next;
    });
  }, [storage]);

  const remove: UseContextualEstimations["remove"] = useCallback((id) => {
    persist(estimations.filter((e) => e.estimateId !== id));
  }, [estimations, persist]);

  const clear: UseContextualEstimations["clear"] = useCallback(() => {
    persist([]);
  }, [persist]);

  const getById: UseContextualEstimations["getById"] = useCallback((id) => {
    return estimations.find((e) => e.estimateId === id);
  }, [estimations]);

  return { estimations, save, remove, clear, getById };
}
