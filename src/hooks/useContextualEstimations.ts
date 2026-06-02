"use client";

// Hook + persistencia para estimaciones contextuales (motor v2).
//
// Almacena un array de ContextualEstimationResult en localStorage. Permite
// guardar, listar, eliminar y exportar — análogo a useTimeEstimator pero
// para los outputs del Contextual AMS Engine.
//
// Key: supply-chain-ams-contextual-estimations.
// Sync entre tabs vía storage event + custom event "ams-contextual-changed".

import { useCallback, useEffect, useState } from "react";
import type { ContextualEstimationResult } from "@/types/estimation";

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
  const [estimations, setEstimations] = useState<ContextualEstimationResult[]>(() => {
    if (typeof window === "undefined") return [];
    return safe<ContextualEstimationResult[]>(localStorage.getItem(STORAGE_KEY)) ?? [];
  });

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      const fresh = safe<ContextualEstimationResult[]>(localStorage.getItem(STORAGE_KEY)) ?? [];
      setEstimations(fresh);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  const persist = useCallback((next: ContextualEstimationResult[]) => {
    setEstimations(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      emit();
    }
  }, []);

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
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        emit();
      }
      return next;
    });
  }, []);

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
