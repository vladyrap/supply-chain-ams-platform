"use client";

// G8 (v1.2.0): localStorage scoped por tenant via tenantStorage().

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CurationCandidate, CurationStatus } from "@/types/knowledge-curation";
import { CURATION_STORAGE } from "@/types/knowledge-curation";
import { useTenant } from "@/context/TenantContext";
import { tenantStorage, isTenantScopedKey } from "@/lib/tenantStorage";

const STORAGE_KEY = CURATION_STORAGE.candidates;
const EVT = "ams-curation-changed";

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export interface UseKnowledgeCuration {
  candidates: CurationCandidate[];
  byTicket: (ticketKey: string) => CurationCandidate[];
  byStatus: (status: CurationStatus) => CurationCandidate[];
  save: (c: CurationCandidate) => void;
  updateStatus: (id: string, status: CurationStatus, reviewer?: string, reason?: string) => void;
  remove: (id: string) => void;
}

export function useKnowledgeCuration(): UseKnowledgeCuration {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || "default";
  const storage = useMemo(() => tenantStorage(tenantId), [tenantId]);

  const [candidates, setCandidates] = useState<CurationCandidate[]>([]);

  useEffect(() => {
    setCandidates(safe<CurationCandidate[]>(storage.get(STORAGE_KEY)) ?? []);
  }, [storage]);

  useEffect(() => {
    function reload() {
      setCandidates(safe<CurationCandidate[]>(storage.get(STORAGE_KEY)) ?? []);
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

  const persist = useCallback((next: CurationCandidate[]) => {
    setCandidates(next);
    storage.set(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, [storage]);

  return {
    candidates,
    byTicket: useCallback(
      (key) => candidates.filter((c) => c.ticketKey === key)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      [candidates],
    ),
    byStatus: useCallback(
      (status) => candidates.filter((c) => c.status === status)
        .sort((a, b) => b.brilliantScore - a.brilliantScore),
      [candidates],
    ),
    save: useCallback((c) => {
      setCandidates((cur) => {
        const idx = cur.findIndex((x) => x.candidateId === c.candidateId);
        let next: CurationCandidate[];
        if (idx >= 0) {
          next = [...cur];
          next[idx] = c;
        } else {
          next = [c, ...cur].slice(0, 200);
        }
        storage.set(STORAGE_KEY, JSON.stringify(next));
        emit();
        return next;
      });
    }, [storage]),
    updateStatus: useCallback((id, status, reviewer, reason) => {
      setCandidates((cur) => {
        const next = cur.map((c) =>
          c.candidateId === id ? {
            ...c, status,
            reviewedBy: reviewer ?? c.reviewedBy,
            reviewedAt: new Date().toISOString(),
            rejectionReason: status === "REJECTED" ? reason : undefined,
          } : c
        );
        storage.set(STORAGE_KEY, JSON.stringify(next));
        emit();
        return next;
      });
    }, [storage]),
    remove: useCallback((id) => {
      persist(candidates.filter((c) => c.candidateId !== id));
    }, [candidates, persist]),
  };
}
