"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AMS_MODULES_STORAGE,
  type AmsPlaybook, type PlaybookExecution, type PlaybookStatus,
} from "@/types/ams-modules";
import { buildDefaultPlaybooks } from "@/lib/playbooks/seedData";

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
    return item;
  }, [playbooks, savePlaybooks]);

  const updatePlaybook: UsePlaybooks["updatePlaybook"] = useCallback((id, patch) => {
    savePlaybooks(playbooks.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p));
  }, [playbooks, savePlaybooks]);

  const deletePlaybook: UsePlaybooks["deletePlaybook"] = useCallback((id) => {
    savePlaybooks(playbooks.filter((p) => p.id !== id));
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
    return exec;
  }, [executions, saveExecutions]);

  const toggleStep: UsePlaybooks["toggleStep"] = useCallback((executionId, stepId) => {
    saveExecutions(executions.map((e) => {
      if (e.id !== executionId) return e;
      const has = e.completedSteps.includes(stepId);
      return {
        ...e,
        completedSteps: has
          ? e.completedSteps.filter((s) => s !== stepId)
          : [...e.completedSteps, stepId],
      };
    }));
  }, [executions, saveExecutions]);

  const setStepNote: UsePlaybooks["setStepNote"] = useCallback((executionId, stepId, note) => {
    saveExecutions(executions.map((e) => {
      if (e.id !== executionId) return e;
      return { ...e, notes: { ...e.notes, [stepId]: note } };
    }));
  }, [executions, saveExecutions]);

  const completeExecution: UsePlaybooks["completeExecution"] = useCallback((executionId) => {
    saveExecutions(executions.map((e) => e.id === executionId ? { ...e, status: "COMPLETED", finishedAt: now() } : e));
  }, [executions, saveExecutions]);

  const abandonExecution: UsePlaybooks["abandonExecution"] = useCallback((executionId) => {
    saveExecutions(executions.map((e) => e.id === executionId ? { ...e, status: "ABANDONED", finishedAt: now() } : e));
  }, [executions, saveExecutions]);

  const resetPlaybooksDemo: UsePlaybooks["resetPlaybooksDemo"] = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AMS_MODULES_STORAGE.playbooks);
      localStorage.removeItem(AMS_MODULES_STORAGE.playbookRuns);
    }
    const fresh = buildDefaultPlaybooks();
    persist(AMS_MODULES_STORAGE.playbooks, fresh);
    persist(AMS_MODULES_STORAGE.playbookRuns, []);
    setPlaybooks(fresh);
    setExecutions([]);
  }, []);

  return {
    playbooks, executions,
    createPlaybook, updatePlaybook, deletePlaybook, duplicatePlaybook,
    startExecution, toggleStep, setStepNote, completeExecution, abandonExecution,
    resetPlaybooksDemo,
  };
}
