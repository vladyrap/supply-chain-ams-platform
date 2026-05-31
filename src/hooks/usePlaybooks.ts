"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AMS_MODULES_STORAGE,
  type AmsPlaybook, type PlaybookExecution, type PlaybookStatus,
} from "@/types/ams-modules";
import { buildDefaultPlaybooks } from "@/lib/playbooks/seedData";
import { playbooksApi } from "@/services/ams-modules.api";

const log = {
  debug: (...a: unknown[]) => { if (process.env.NODE_ENV !== "production") console.debug("[playbooks]", ...a); },
};
function fireSync<T>(p: Promise<T>): void {
  p.catch((err) => log.debug("playbooks sync failed:", (err as Error)?.message || err));
}

const EVT = "ams-playbooks-changed";

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}
function persist<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  emit();
}

function loadState() {
  if (typeof window === "undefined") {
    return { playbooks: buildDefaultPlaybooks(), executions: [] as PlaybookExecution[] };
  }
  return {
    playbooks:  safe<AmsPlaybook[]>(localStorage.getItem(AMS_MODULES_STORAGE.playbooks)) ?? buildDefaultPlaybooks(),
    executions: safe<PlaybookExecution[]>(localStorage.getItem(AMS_MODULES_STORAGE.playbookRuns)) ?? [],
  };
}

export interface UsePlaybooks {
  playbooks: AmsPlaybook[];
  executions: PlaybookExecution[];

  createPlaybook: (input: Omit<AmsPlaybook, "id" | "createdAt" | "updatedAt">) => AmsPlaybook;
  updatePlaybook: (id: string, patch: Partial<AmsPlaybook>) => void;
  deletePlaybook: (id: string) => void;
  duplicatePlaybook: (id: string) => AmsPlaybook | null;

  startExecution: (playbookId: string, incidentId?: string, startedBy?: string) => PlaybookExecution;
  toggleStep: (executionId: string, stepId: string) => void;
  setStepNote: (executionId: string, stepId: string, note: string) => void;
  completeExecution: (executionId: string) => void;
  abandonExecution: (executionId: string) => void;

  resetPlaybooksDemo: () => void;
}

export function usePlaybooks(): UsePlaybooks {
  const [playbooks, setPlaybooks] = useState<AmsPlaybook[]>(() => loadState().playbooks);
  const [executions, setExecutions] = useState<PlaybookExecution[]>(() => loadState().executions);

  useEffect(() => {
    function reload() {
      const s = loadState();
      setPlaybooks(s.playbooks);
      setExecutions(s.executions);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AMS_MODULES_STORAGE.playbooks || e.key === AMS_MODULES_STORAGE.playbookRuns) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  // Hidratar desde backend (offline-first). Si backend no responde, seguimos local.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await playbooksApi.getSnapshot();
        if (cancelled) return;
        setPlaybooks(snap.playbooks);
        setExecutions(snap.executions);
        persist(AMS_MODULES_STORAGE.playbooks, snap.playbooks);
        persist(AMS_MODULES_STORAGE.playbookRuns, snap.executions);
      } catch (err) {
        log.debug("backend offline, using localStorage:", (err as Error)?.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const savePlaybooks = useCallback((next: AmsPlaybook[]) => {
    setPlaybooks(next);
    persist(AMS_MODULES_STORAGE.playbooks, next);
  }, []);
  const saveExecutions = useCallback((next: PlaybookExecution[]) => {
    setExecutions(next);
    persist(AMS_MODULES_STORAGE.playbookRuns, next);
  }, []);

  const createPlaybook: UsePlaybooks["createPlaybook"] = useCallback((input) => {
    const item: AmsPlaybook = {
      ...input,
      id: uid("pb"),
      createdAt: now(),
      updatedAt: now(),
    };
    savePlaybooks([item, ...playbooks]);
    fireSync(playbooksApi.upsertPlaybook(item));
    return item;
  }, [playbooks, savePlaybooks]);

  const updatePlaybook: UsePlaybooks["updatePlaybook"] = useCallback((id, patch) => {
    const next = playbooks.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p);
    savePlaybooks(next);
    const updated = next.find((p) => p.id === id);
    if (updated) fireSync(playbooksApi.upsertPlaybook(updated));
  }, [playbooks, savePlaybooks]);

  const deletePlaybook: UsePlaybooks["deletePlaybook"] = useCallback((id) => {
    savePlaybooks(playbooks.filter((p) => p.id !== id));
    fireSync(playbooksApi.deletePlaybook(id));
  }, [playbooks, savePlaybooks]);

  const duplicatePlaybook: UsePlaybooks["duplicatePlaybook"] = useCallback((id) => {
    const orig = playbooks.find((p) => p.id === id);
    if (!orig) return null;
    const copy: AmsPlaybook = {
      ...orig,
      id: uid("pb"),
      title: `${orig.title} (copia)`,
      status: "DRAFT" as PlaybookStatus,
      createdAt: now(), updatedAt: now(),
    };
    savePlaybooks([copy, ...playbooks]);
    fireSync(playbooksApi.upsertPlaybook(copy));
    return copy;
  }, [playbooks, savePlaybooks]);

  const startExecution: UsePlaybooks["startExecution"] = useCallback((playbookId, incidentId, startedBy) => {
    const exec: PlaybookExecution = {
      id: uid("exec"),
      playbookId,
      startedAt: now(),
      finishedAt: null,
      startedBy: startedBy ?? "Consultor AMS",
      incidentId: incidentId ?? null,
      completedSteps: [],
      notes: {},
      status: "IN_PROGRESS",
    };
    saveExecutions([exec, ...executions]);
    fireSync(playbooksApi.upsertExecution(exec));
    return exec;
  }, [executions, saveExecutions]);

  const toggleStep: UsePlaybooks["toggleStep"] = useCallback((executionId, stepId) => {
    const next = executions.map((e) => {
      if (e.id !== executionId) return e;
      const has = e.completedSteps.includes(stepId);
      return {
        ...e,
        completedSteps: has
          ? e.completedSteps.filter((s) => s !== stepId)
          : [...e.completedSteps, stepId],
      };
    });
    saveExecutions(next);
    const updated = next.find((e) => e.id === executionId);
    if (updated) fireSync(playbooksApi.upsertExecution(updated));
  }, [executions, saveExecutions]);

  const setStepNote: UsePlaybooks["setStepNote"] = useCallback((executionId, stepId, note) => {
    const next = executions.map((e) => {
      if (e.id !== executionId) return e;
      return { ...e, notes: { ...e.notes, [stepId]: note } };
    });
    saveExecutions(next);
    const updated = next.find((e) => e.id === executionId);
    if (updated) fireSync(playbooksApi.upsertExecution(updated));
  }, [executions, saveExecutions]);

  const completeExecution: UsePlaybooks["completeExecution"] = useCallback((executionId) => {
    const next = executions.map((e) => e.id === executionId ? { ...e, status: "COMPLETED" as const, finishedAt: now() } : e);
    saveExecutions(next);
    const updated = next.find((e) => e.id === executionId);
    if (updated) fireSync(playbooksApi.upsertExecution(updated));
  }, [executions, saveExecutions]);

  const abandonExecution: UsePlaybooks["abandonExecution"] = useCallback((executionId) => {
    const next = executions.map((e) => e.id === executionId ? { ...e, status: "ABANDONED" as const, finishedAt: now() } : e);
    saveExecutions(next);
    const updated = next.find((e) => e.id === executionId);
    if (updated) fireSync(playbooksApi.upsertExecution(updated));
  }, [executions, saveExecutions]);

  const resetPlaybooksDemo: UsePlaybooks["resetPlaybooksDemo"] = useCallback(() => {
    (async () => {
      try {
        const snap = await playbooksApi.resetDemo();
        setPlaybooks(snap.playbooks); setExecutions(snap.executions);
        persist(AMS_MODULES_STORAGE.playbooks, snap.playbooks);
        persist(AMS_MODULES_STORAGE.playbookRuns, snap.executions);
        return;
      } catch { /* fallback local */ }
      if (typeof window !== "undefined") {
        localStorage.removeItem(AMS_MODULES_STORAGE.playbooks);
        localStorage.removeItem(AMS_MODULES_STORAGE.playbookRuns);
      }
      const fresh = buildDefaultPlaybooks();
      persist(AMS_MODULES_STORAGE.playbooks, fresh);
      persist(AMS_MODULES_STORAGE.playbookRuns, []);
      setPlaybooks(fresh);
      setExecutions([]);
    })();
  }, []);

  return {
    playbooks, executions,
    createPlaybook, updatePlaybook, deletePlaybook, duplicatePlaybook,
    startExecution, toggleStep, setStepNote, completeExecution, abandonExecution,
    resetPlaybooksDemo,
  };
}
