"use client";

// Hook único que gobierna Testing Intelligence.
// Persiste en localStorage. Sync entre tabs con CustomEvent "ams-testing-changed".
// NOTA: nunca persiste binarios pesados (videos). Sólo metadata + ObjectURL en memoria.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TESTING_STORAGE,
  type TestingScenario, type EvidenceItem, type TestDefect,
  type GeneratedUserManual, type TestingSettings,
  type TestingStatus, type TestingResult, type EvidenceType, type DefectStatus,
} from "@/types/testing";
import {
  buildSeedScenarios, buildSeedEvidences, buildSeedDefects,
  buildSeedManuals, buildSeedTestingSettings,
} from "@/lib/testing/seedData";
import {
  generateTestScriptMarkdown, generateUserManualMarkdown,
  buildCloudAlmPayload,
  computeCoverageByScopeItem, computeCoverageByModule,
  computeCountByStatus, computeCountByType,
} from "@/utils/testing-engine";

function loadList<T>(key: string, seed: () => T[]): T[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const s = seed();
      localStorage.setItem(key, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as T[];
  } catch { return seed(); }
}
function loadObj<T>(key: string, seed: () => T): T {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const s = seed();
      localStorage.setItem(key, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as T;
  } catch { return seed(); }
}
function saveAndEmit(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("ams-testing-changed", { detail: { key } }));
  } catch { /* ignore */ }
}

// Saneamos cualquier evidencia con localPreviewUrl al persistir
// (los ObjectURL no son válidos entre sesiones).
function sanitizeEvidenceForStorage(list: EvidenceItem[]): EvidenceItem[] {
  return list.map((e) => {
    if (!e.localPreviewUrl) return e;
    // Mantenemos en memoria pero no persistimos la URL temporal.
    const clone = { ...e };
    delete clone.localPreviewUrl;
    return clone;
  });
}

// Persistencia separada para evidencias: localStorage NO recibe localPreviewUrl
// pero el estado en React sí lo mantiene durante la sesión.
function persistEvidences(list: EvidenceItem[]) {
  saveAndEmit(TESTING_STORAGE.evidences, sanitizeEvidenceForStorage(list));
}

export function useTestingIntelligence() {
  const [scenarios, setScenarios]   = useState<TestingScenario[]>(() => loadList(TESTING_STORAGE.scenarios, buildSeedScenarios));
  const [evidences, setEvidences]   = useState<EvidenceItem[]>(() => loadList(TESTING_STORAGE.evidences, buildSeedEvidences));
  const [defects, setDefects]       = useState<TestDefect[]>(() => loadList(TESTING_STORAGE.defects, buildSeedDefects));
  const [manuals, setManuals]       = useState<GeneratedUserManual[]>(() => loadList(TESTING_STORAGE.manuals, buildSeedManuals));
  const [settings, setSettings]     = useState<TestingSettings>(() => loadObj(TESTING_STORAGE.settings, buildSeedTestingSettings));

  // Sync entre tabs
  useEffect(() => {
    const refresh = () => {
      setScenarios(loadList(TESTING_STORAGE.scenarios, buildSeedScenarios));
      setEvidences(loadList(TESTING_STORAGE.evidences, buildSeedEvidences));
      setDefects(loadList(TESTING_STORAGE.defects, buildSeedDefects));
      setManuals(loadList(TESTING_STORAGE.manuals, buildSeedManuals));
      setSettings(loadObj(TESTING_STORAGE.settings, buildSeedTestingSettings));
    };
    window.addEventListener("ams-testing-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ams-testing-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // ============================================================
  // CRUD Scenarios
  // ============================================================
  const upsertScenario = useCallback((sc: TestingScenario) => {
    setScenarios((prev) => {
      const idx = prev.findIndex((s) => s.id === sc.id);
      const updated = { ...sc, updatedAt: new Date().toISOString() };
      const next = idx >= 0 ? prev.map((s, i) => (i === idx ? updated : s)) : [...prev, updated];
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
  }, []);

  const createScenario = useCallback((partial: Partial<TestingScenario> & Pick<TestingScenario, "title" | "sapModule" | "process" | "testType" | "environment" | "owner">): TestingScenario => {
    const now = new Date().toISOString();
    const sc: TestingScenario = {
      id: `ts_${Date.now()}`,
      title: partial.title,
      description: partial.description || "",
      sapModule: partial.sapModule,
      process: partial.process,
      subProcess: partial.subProcess,
      scopeItemIds: partial.scopeItemIds || [],
      testType: partial.testType,
      environment: partial.environment,
      status: partial.status || "DRAFT",
      result: partial.result || "PENDING",
      owner: partial.owner,
      prerequisites: partial.prerequisites || "",
      testData: partial.testData || "",
      steps: partial.steps || [],
      expectedResult: partial.expectedResult || "",
      actualResult: partial.actualResult,
      evidenceIds: partial.evidenceIds || [],
      defectIds: partial.defectIds || [],
      cloudAlmReady: partial.cloudAlmReady ?? false,
      tags: partial.tags || [],
      createdAt: now, updatedAt: now,
    };
    setScenarios((prev) => {
      const next = [sc, ...prev];
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    return sc;
  }, []);

  const updateScenario = upsertScenario;

  const deleteScenario = useCallback((id: string) => {
    setScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
  }, []);

  const markScenarioStatus = useCallback((id: string, status: TestingStatus, result?: TestingResult, actualResult?: string) => {
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === id
        ? { ...s, status, ...(result ? { result } : {}), ...(actualResult ? { actualResult } : {}), updatedAt: new Date().toISOString() }
        : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
  }, []);

  const markScenarioPassed = useCallback((id: string, actualResult?: string) => {
    markScenarioStatus(id, "PASSED", "PASS", actualResult);
  }, [markScenarioStatus]);

  const markScenarioFailed = useCallback((id: string, actualResult: string) => {
    markScenarioStatus(id, "FAILED", "FAIL", actualResult);
  }, [markScenarioStatus]);

  // ============================================================
  // Evidence CRUD (no persiste localPreviewUrl)
  // ============================================================
  const attachEvidence = useCallback((scenarioId: string, evidence: Omit<EvidenceItem, "id" | "scenarioId" | "createdAt" | "createdBy"> & { createdBy?: string }) => {
    const now = new Date().toISOString();
    const ev: EvidenceItem = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      scenarioId,
      type: evidence.type,
      title: evidence.title,
      description: evidence.description,
      fileName: evidence.fileName,
      fileType: evidence.fileType,
      fileSize: evidence.fileSize,
      durationSeconds: evidence.durationSeconds,
      localPreviewUrl: evidence.localPreviewUrl,
      externalUrl: evidence.externalUrl,
      noteText: evidence.noteText,
      createdAt: now,
      createdBy: evidence.createdBy || "demo@user",
      tags: evidence.tags || [],
    };
    setEvidences((prev) => {
      const next = [ev, ...prev];
      persistEvidences(next);
      return next;
    });
    // Append al scenario
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === scenarioId
        ? { ...s, evidenceIds: [...s.evidenceIds, ev.id], updatedAt: now }
        : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    return ev;
  }, []);

  const updateEvidence = useCallback((ev: EvidenceItem) => {
    setEvidences((prev) => {
      const next = prev.map((e) => e.id === ev.id ? ev : e);
      persistEvidences(next);
      return next;
    });
  }, []);

  const removeEvidence = useCallback((id: string) => {
    setEvidences((prev) => {
      const target = prev.find((e) => e.id === id);
      if (target?.localPreviewUrl) {
        try { URL.revokeObjectURL(target.localPreviewUrl); } catch { /* ignore */ }
      }
      const next = prev.filter((e) => e.id !== id);
      persistEvidences(next);
      return next;
    });
    setScenarios((prev) => {
      const next = prev.map((s) => ({ ...s, evidenceIds: s.evidenceIds.filter((eid) => eid !== id) }));
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
  }, []);

  // ============================================================
  // Defects CRUD
  // ============================================================
  const createDefect = useCallback((partial: Omit<TestDefect, "id" | "createdAt" | "updatedAt">): TestDefect => {
    const now = new Date().toISOString();
    const d: TestDefect = {
      ...partial,
      id: `td_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now, updatedAt: now,
    };
    setDefects((prev) => {
      const next = [d, ...prev];
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === d.scenarioId
        ? { ...s, defectIds: [...s.defectIds, d.id], updatedAt: now }
        : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    return d;
  }, []);

  const updateDefect = useCallback((d: TestDefect) => {
    setDefects((prev) => {
      const next = prev.map((x) => x.id === d.id ? { ...d, updatedAt: new Date().toISOString() } : x);
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
  }, []);

  const updateDefectStatus = useCallback((id: string, status: DefectStatus) => {
    setDefects((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, status, updatedAt: new Date().toISOString() } : d);
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
  }, []);

  const convertDefectToIncident = useCallback((id: string, incidentId: string) => {
    setDefects((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, convertedToIncidentId: incidentId, status: "RESOLVED" as DefectStatus, updatedAt: new Date().toISOString() } : d);
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
  }, []);

  // ============================================================
  // Generación: script + manual
  // ============================================================
  const generateScript = useCallback((scenarioId: string): string => {
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc) return "";
    const scEvidences = evidences.filter((e) => sc.evidenceIds.includes(e.id));
    const scDefects = defects.filter((d) => sc.defectIds.includes(d.id));
    const md = generateTestScriptMarkdown(sc, scEvidences, scDefects);
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === scenarioId
        ? { ...s, generatedScript: md, status: s.status === "DRAFT" || s.status === "READY" ? "SCRIPT_GENERATED" as TestingStatus : s.status, updatedAt: new Date().toISOString() }
        : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    return md;
  }, [scenarios, evidences, defects]);

  const generateManual = useCallback((scenarioId: string, overrides: Partial<GeneratedUserManual> = {}): GeneratedUserManual | null => {
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc) return null;
    const now = new Date().toISOString();
    const content = generateUserManualMarkdown(sc, overrides);
    const manual: GeneratedUserManual = {
      id: `man_${Date.now()}`,
      scenarioId,
      title: overrides.title || `Manual de usuario · ${sc.title}`,
      objective: overrides.objective || sc.description || "",
      audience: overrides.audience || "Usuarios finales SAP",
      prerequisites: overrides.prerequisites || sc.prerequisites,
      steps: sc.steps.sort((a, b) => a.order - b.order).map((s) => ({ order: s.order, description: `${s.action}${s.data ? ` (${s.data})` : ""}` })),
      expectedResult: overrides.expectedResult || sc.expectedResult,
      commonErrors: overrides.commonErrors || [],
      faqs: overrides.faqs || [],
      evidenceIds: sc.evidenceIds,
      supportContact: overrides.supportContact || "Mesa AMS · soporte.ams@demo.cl · interno 4000",
      language: overrides.language || settings.manualLanguage,
      contentMarkdown: content,
      createdAt: now, updatedAt: now,
    };
    setManuals((prev) => {
      // si ya hay manual para este escenario, lo reemplaza
      const filtered = prev.filter((m) => m.scenarioId !== scenarioId);
      const next = [manual, ...filtered];
      saveAndEmit(TESTING_STORAGE.manuals, next);
      return next;
    });
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === scenarioId ? { ...s, generatedManual: content, updatedAt: now } : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    return manual;
  }, [scenarios, settings.manualLanguage]);

  // ============================================================
  // Cloud ALM export
  // ============================================================
  const prepareCloudAlmExport = useCallback((scenarioId: string) => {
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc) return null;
    const scEvidences = evidences.filter((e) => sc.evidenceIds.includes(e.id));
    const scDefects = defects.filter((d) => sc.defectIds.includes(d.id));
    const payload = buildCloudAlmPayload(sc, scEvidences, scDefects);
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === scenarioId
        ? { ...s, cloudAlmReady: true, status: s.status === "PASSED" ? "EXPORTED" as TestingStatus : s.status, updatedAt: new Date().toISOString() }
        : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    return payload;
  }, [scenarios, evidences, defects]);

  // ============================================================
  // Settings
  // ============================================================
  const updateSettings = useCallback((patch: Partial<TestingSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAndEmit(TESTING_STORAGE.settings, next);
      return next;
    });
  }, []);

  const resetDemoTestingData = useCallback(() => {
    const sc = buildSeedScenarios();
    const ev = buildSeedEvidences();
    const df = buildSeedDefects();
    const mn = buildSeedManuals();
    const st = buildSeedTestingSettings();
    saveAndEmit(TESTING_STORAGE.scenarios, sc);
    persistEvidences(ev);
    saveAndEmit(TESTING_STORAGE.defects, df);
    saveAndEmit(TESTING_STORAGE.manuals, mn);
    saveAndEmit(TESTING_STORAGE.settings, st);
    setScenarios(sc); setEvidences(ev); setDefects(df); setManuals(mn); setSettings(st);
  }, []);

  // ============================================================
  // Métricas
  // ============================================================
  const metrics = useMemo(() => {
    const total = scenarios.length;
    const scriptsGenerated = scenarios.filter((s) => !!s.generatedScript).length;
    const evidencesCount = evidences.length;
    const passed = scenarios.filter((s) => s.status === "PASSED" || s.status === "APPROVED" || s.status === "EXPORTED").length;
    const failed = scenarios.filter((s) => s.status === "FAILED").length;
    const defectsOpen = defects.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS" || d.status === "RETEST").length;
    const cloudAlmReady = scenarios.filter((s) => s.cloudAlmReady).length;
    const coverageByScopeItem = computeCoverageByScopeItem(scenarios);
    const coverageByModule = computeCoverageByModule(scenarios);
    const byStatus = computeCountByStatus(scenarios);
    const byType = computeCountByType(scenarios);
    const lastRecording = (() => {
      const recs = evidences.filter((e) => e.type === "SCREEN_RECORDING" || e.type === "UPLOADED_VIDEO");
      const sorted = recs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return sorted[0]?.createdAt || null;
    })();

    return {
      total, scriptsGenerated, evidencesCount, passed, failed, defectsOpen,
      cloudAlmReady, coverageByScopeItem, coverageByModule, byStatus, byType,
      lastRecording,
    };
  }, [scenarios, evidences, defects]);

  return {
    // estado
    scenarios, evidences, defects, manuals, settings, metrics,
    // scenarios
    createScenario, updateScenario, upsertScenario, deleteScenario,
    markScenarioStatus, markScenarioPassed, markScenarioFailed,
    // evidence
    attachEvidence, updateEvidence, removeEvidence,
    // defects
    createDefect, updateDefect, updateDefectStatus, convertDefectToIncident,
    // generación
    generateScript, generateManual,
    // export
    prepareCloudAlmExport,
    // settings + reset
    updateSettings, resetDemoTestingData,
  };
}
export type UseTestingIntelligence = ReturnType<typeof useTestingIntelligence>;
