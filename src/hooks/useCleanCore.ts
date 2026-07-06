"use client";

// =============================================================================
// useCleanCore — estado del assessment Clean Core
// =============================================================================
// Parte del catálogo semilla (CLEAN_CORE_FINDINGS) y aplica overrides de status
// que el usuario setea desde la UI. Los overrides se persisten en localStorage
// (sólo el status por id) para no duplicar el catálogo base.
//
// SSR-safe: el primer render (server + client) usa los status semilla; los
// overrides se aplican tras el mount para evitar hydration mismatch.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { CLEAN_CORE_FINDINGS } from "@/lib/clean-core/dataset";
import { computeCleanCore } from "@/lib/clean-core/engine";
import type { CleanCoreFinding, FindingStatus, CleanCoreResult } from "@/lib/clean-core/types";

const LS_KEY = "supply-chain-ams-clean-core-overrides";

type Overrides = Record<string, FindingStatus>;

function readOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function writeOverrides(o: Overrides) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch { /* */ }
}

export interface UseCleanCore {
  findings: CleanCoreFinding[];
  result: CleanCoreResult;
  /** Cambia el status de un hallazgo y persiste. */
  setStatus: (id: string, status: FindingStatus) => void;
  /** Descarta todos los overrides y vuelve al assessment semilla. */
  reset: () => void;
  /** True una vez aplicados los overrides de localStorage (post-mount). */
  hydrated: boolean;
}

export function useCleanCore(): UseCleanCore {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [hydrated, setHydrated] = useState(false);

  // Aplicar overrides persistidos tras el mount (evita hydration mismatch).
  useEffect(() => {
    setOverrides(readOverrides());
    setHydrated(true);
  }, []);

  const findings = useMemo<CleanCoreFinding[]>(
    () => CLEAN_CORE_FINDINGS.map((f) =>
      overrides[f.id] && overrides[f.id] !== f.status ? { ...f, status: overrides[f.id] } : f),
    [overrides],
  );

  const result = useMemo(() => computeCleanCore(findings), [findings]);

  const setStatus = useCallback((id: string, status: FindingStatus) => {
    setOverrides((prev) => {
      const seed = CLEAN_CORE_FINDINGS.find((f) => f.id === id);
      const next = { ...prev };
      // Si coincide con el status semilla, quitamos el override (limpieza).
      if (seed && seed.status === status) delete next[id];
      else next[id] = status;
      writeOverrides(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setOverrides({});
    if (typeof window !== "undefined") {
      try { localStorage.removeItem(LS_KEY); } catch { /* */ }
    }
  }, []);

  return { findings, result, setStatus, reset, hydrated };
}
