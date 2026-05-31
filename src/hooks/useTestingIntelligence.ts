"use client";

// Hook único que gobierna Testing Intelligence.
// MODO OFFLINE-FIRST:
// - Estado en memoria + cache en localStorage.
// - Si hay backend disponible (testing.api), hidrata desde Postgres al montar
//   y sincroniza cada mutación. Si el backend no responde, sigue trabajando local.
// - Para evidencias con binario (video):
//     * Si hay backend → upload real con multipart, el preview usa la URL del backend.
//     * Si no hay backend → ObjectURL en memoria (legacy, no persiste tras refresh).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TESTING_STORAGE,
  type TestingScenario, type EvidenceItem, type TestDefect,
  type GeneratedUserManual, type TestingSettings,
  type TestingStatus, type TestingResult, type DefectStatus,
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
import * as api from "@/services/testing.api";

const log = {
  debug: (...a: unknown[]) => { if (process.env.NODE_ENV !== "production") console.debug("[testing]", ...a); },
};
function fireSync<T>(p: Promise<T>): void {
  p.catch((err) => log.debug("testing backend sync failed (using local cache):", (err as Error)?.message || err));
}

function loadList<T>(key: string, seed: () => T[]): T[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { const s = seed(); localStorage.setItem(key, JSON.stringify(s)); return s; }
    return JSON.parse(raw) as T[];
  } catch { return seed(); }
}
function loadObj<T>(key: string, seed: () => T): T {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { const s = seed(); localStorage.setItem(key, JSON.stringify(s)); return s; }
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

function sanitizeEvidenceForStorage(list: EvidenceItem[]): EvidenceItem[] {
  // Quitamos localPreviewUrl tipo blob: (no persistente). Mantenemos URLs http(s) del backend.
  return list.map((e) => {
    if (!e.localPreviewUrl) return e;
    if (e.localPreviewUrl.startsWith("blob:")) {
      const clone = { ...e };
      delete clone.localPreviewUrl;
      return clone;
    }
    return e;
  });
}
function persistEvidences(list: EvidenceItem[]) {
  saveAndEmit(TESTING_STORAGE.evidences, sanitizeEvidenceForStorage(list));
}

// Convierte una evidencia del backend a la forma del frontend, agregando
// el localPreviewUrl si tiene archivo (apunta al endpoint del backend).
function hydrateEvidenceFromServer(e: EvidenceItem): EvidenceItem {
  // El backend devuelve storagePath, no localPreviewUrl. Si tiene storagePath,
  // generamos URL al endpoint que sirve el binario.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasFile = !!(e as any).storagePath;
  if (hasFile && !e.localPreviewUrl) {
    return { ...e, localPreviewUrl: api.evidenceFileUrl(e.id) };
  }
  return e;
}

export function useTestingIntelligence() {
  const [scenarios, setScenarios] = useState<TestingScenario[]>(() => loadList(TESTING_STORAGE.scenarios, buildSeedScenarios));
  const [evidences, setEvidences] = useState<EvidenceItem[]>(() => loadList(TESTING_STORAGE.evidences, buildSeedEvidences));
  const [defects, setDefects]     = useState<TestDefect[]>(() => loadList(TESTING_STORAGE.defects, buildSeedDefects));
  const [manuals, setManuals]     = useState<GeneratedUserManual[]>(() => loadList(TESTING_STORAGE.manuals, buildSeedManuals));
  const [settings, setSettings]   = useState<TestingSettings>(() => loadObj(TESTING_STORAGE.settings, buildSeedTestingSettings));
  const [backendOnline, setBackendOnline] = useState(false);

  // Hidratar desde backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await api.getSnapshot();
        if (cancelled) return;
        const hydratedEvidences = snap.evidences.map(hydrateEvidenceFromServer);
        setScenarios(snap.scenarios);
        setEvidences(hydratedEvidences);
        setDefects(snap.defects);
        setManuals(snap.manuals);
        setSettings(snap.settings);
        saveAndEmit(TESTING_STORAGE.scenarios, snap.scenarios);
        persistEvidences(hydratedEvidences);
        saveAndEmit(TESTING_STORAGE.defects, snap.defects);
        saveAndEmit(TESTING_STORAGE.manuals, snap.manuals);
        saveAndEmit(TESTING_STORAGE.settings, snap.settings);
        setBackendOnline(true);
      } catch (err) {
        log.debug("testing backend offline, using localStorage cache:", (err as Error)?.message);
        setBackendOnline(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
  // Scenarios CRUD
  // ============================================================
  const upsertScenario = useCallback((sc: TestingScenario) => {
    const updated = { ...sc, updatedAt: new Date().toISOString() };
    setScenarios((prev) => {
      const idx = prev.findIndex((s) => s.id === sc.id);
      const next = idx >= 0 ? prev.map((s, i) => (i === idx ? updated : s)) : [...prev, updated];
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    fireSync(api.upsertScenario(updated));
  }, []);

  const createScenario = useCallback((partial: Partial<TestingScenario> & Pick<TestingScenario, "title" | "sapModule" | "process" | "testType" | "environment" | "owner">): TestingScenario => {
    const now = new Date().toISOString();
    const sc: TestingScenario = {
      id: `ts_${Date.now()}`,
      title: partial.title, description: partial.description || "",
      sapModule: partial.sapModule, process: partial.process,
      subProcess: partial.subProcess, scopeItemIds: partial.scopeItemIds || [],
      testType: partial.testType, environment: partial.environment,
      status: partial.status || "DRAFT", result: partial.result || "PENDING",
      owner: partial.owner, prerequisites: partial.prerequisites || "",
      testData: partial.testData || "", steps: partial.steps || [],
      expectedResult: partial.expectedResult || "",
      actualResult: partial.actualResult,
      evidenceIds: partial.evidenceIds || [], defectIds: partial.defectIds || [],
      cloudAlmReady: partial.cloudAlmReady ?? false,
      tags: partial.tags || [],
      createdAt: now, updatedAt: now,
    };
    setScenarios((prev) => {
      const next = [sc, ...prev];
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    fireSync(api.upsertScenario(sc));
    return sc;
  }, []);

  const updateScenario = upsertScenario;

  const deleteScenario = useCallback((id: string) => {
    setScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    fireSync(api.deleteScenario(id));
  }, []);

  const markScenarioStatus = useCallback((id: string, status: TestingStatus, result?: TestingResult, actualResult?: string) => {
    let updated: TestingScenario | null = null;
    setScenarios((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id) return s;
        updated = { ...s, status, ...(result ? { result } : {}), ...(actualResult ? { actualResult } : {}), updatedAt: new Date().toISOString() };
        return updated;
      });
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    if (updated) fireSync(api.upsertScenario(updated));
  }, []);

  const markScenarioPassed = useCallback((id: string, actualResult?: string) => {
    markScenarioStatus(id, "PASSED", "PASS", actualResult);
  }, [markScenarioStatus]);

  const markScenarioFailed = useCallback((id: string, actualResult: string) => {
    markScenarioStatus(id, "FAILED", "FAIL", actualResult);
  }, [markScenarioStatus]);

  // ============================================================
  // Evidence CRUD (no binarios — para NOTE/LINK/LOG y screen recordings con ObjectURL local)
  // ============================================================
  const attachEvidence = useCallback((scenarioId: string, evidence: Omit<EvidenceItem, "id" | "scenarioId" | "createdAt" | "createdBy"> & { createdBy?: string }) => {
    const now = new Date().toISOString();
    const ev: EvidenceItem = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      scenarioId,
      type: evidence.type, title: evidence.title, description: evidence.description,
      fileName: evidence.fileName, fileType: evidence.fileType,
      fileSize: evidence.fileSize, durationSeconds: evidence.durationSeconds,
      localPreviewUrl: evidence.localPreviewUrl, externalUrl: evidence.externalUrl,
      noteText: evidence.noteText,
      createdAt: now, createdBy: evidence.createdBy || "demo@user",
      tags: evidence.tags || [],
    };
    setEvidences((prev) => {
      const next = [ev, ...prev];
      persistEvidences(next);
      return next;
    });
    setScenarios((prev) => {
      const next = prev.map((s) => s.id === scenarioId
        ? { ...s, evidenceIds: [...s.evidenceIds, ev.id], updatedAt: now }
        : s);
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    // Sync con backend sólo si NO es ObjectURL local (los blob: no se pueden serializar al servidor)
    const isLocalBlobOnly = ev.localPreviewUrl?.startsWith("blob:") && !ev.noteText && !ev.externalUrl;
    if (!isLocalBlobOnly) {
      fireSync(api.createEvidenceJson(ev));
    }
    return ev;
  }, []);

  /**
   * Sube un archivo binario (video/imagen) al backend.
   * Si el backend no está disponible, hace fallback al modo local con ObjectURL.
   */
  const uploadEvidenceFile = useCallback(async (scenarioId: string, file: File | Blob, opts: {
    type?: "SCREEN_RECORDING" | "UPLOADED_VIDEO" | "SCREENSHOT" | "FILE";
    title: string;
    description?: string;
    durationSeconds?: number;
    tags?: string[];
    createdBy?: string;
    filename?: string;
  }): Promise<EvidenceItem> => {
    const createdBy = opts.createdBy || "demo@user";
    try {
      // Intento upload real
      const ev = await api.uploadEvidence({
        scenarioId, file,
        type: opts.type || (file instanceof File && file.type.startsWith("video/") ? "UPLOADED_VIDEO" : "FILE"),
        title: opts.title,
        description: opts.description,
        durationSeconds: opts.durationSeconds,
        tags: opts.tags,
        createdBy,
        filename: opts.filename,
      });
      const hydrated = hydrateEvidenceFromServer(ev);
      const now = new Date().toISOString();
      setEvidences((prev) => {
        const next = [hydrated, ...prev];
        persistEvidences(next);
        return next;
      });
      setScenarios((prev) => {
        const next = prev.map((s) => s.id === scenarioId
          ? { ...s, evidenceIds: [...s.evidenceIds, hydrated.id], updatedAt: now }
          : s);
        saveAndEmit(TESTING_STORAGE.scenarios, next);
        return next;
      });
      return hydrated;
    } catch (err) {
      log.debug("upload backend failed, falling back to local ObjectURL:", (err as Error)?.message);
      // Fallback: armamos evidencia local con ObjectURL
      const objectUrl = URL.createObjectURL(file);
      return attachEvidence(scenarioId, {
        type: opts.type || "UPLOADED_VIDEO",
        title: opts.title,
        description: opts.description,
        fileName: opts.filename || (file instanceof File ? file.name : "evidence.bin"),
        fileType: file instanceof Blob ? file.type : undefined,
        fileSize: file instanceof Blob ? file.size : undefined,
        durationSeconds: opts.durationSeconds,
        localPreviewUrl: objectUrl,
        createdBy,
        tags: opts.tags || [],
      });
    }
  }, [attachEvidence]);

  const updateEvidence = useCallback((ev: EvidenceItem) => {
    setEvidences((prev) => {
      const next = prev.map((e) => e.id === ev.id ? ev : e);
      persistEvidences(next);
      return next;
    });
    // No hay endpoint update, hacemos un upsert
    fireSync(api.createEvidenceJson(ev));
  }, []);

  const removeEvidence = useCallback((id: string) => {
    setEvidences((prev) => {
      const target = prev.find((e) => e.id === id);
      if (target?.localPreviewUrl?.startsWith("blob:")) {
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
    fireSync(api.deleteEvidence(id));
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
    fireSync(api.upsertDefect(d));
    return d;
  }, []);

  const updateDefect = useCallback((d: TestDefect) => {
    const updated = { ...d, updatedAt: new Date().toISOString() };
    setDefects((prev) => {
      const next = prev.map((x) => x.id === d.id ? updated : x);
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
    fireSync(api.upsertDefect(updated));
  }, []);

  const updateDefectStatus = useCallback((id: string, status: DefectStatus) => {
    let updated: TestDefect | null = null;
    setDefects((prev) => {
      const next = prev.map((d) => {
        if (d.id !== id) return d;
        updated = { ...d, status, updatedAt: new Date().toISOString() };
        return updated;
      });
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
    if (updated) fireSync(api.upsertDefect(updated));
  }, []);

  const convertDefectToIncident = useCallback((id: string, incidentId: string) => {
    let updated: TestDefect | null = null;
    setDefects((prev) => {
      const next = prev.map((d) => {
        if (d.id !== id) return d;
        updated = { ...d, convertedToIncidentId: incidentId, status: "RESOLVED" as DefectStatus, updatedAt: new Date().toISOString() };
        return updated;
      });
      saveAndEmit(TESTING_STORAGE.defects, next);
      return next;
    });
    if (updated) fireSync(api.upsertDefect(updated));
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
    let updated: TestingScenario | null = null;
    setScenarios((prev) => {
      const next = prev.map((s) => {
        if (s.id !== scenarioId) return s;
        updated = { ...s, generatedScript: md, status: s.status === "DRAFT" || s.status === "READY" ? "SCRIPT_GENERATED" as TestingStatus : s.status, updatedAt: new Date().toISOString() };
        return updated;
      });
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    if (updated) fireSync(api.upsertScenario(updated));
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
      const filtered = prev.filter((m) => m.scenarioId !== scenarioId);
      const next = [manual, ...filtered];
      saveAndEmit(TESTING_STORAGE.manuals, next);
      return next;
    });
    let updatedScenario: TestingScenario | null = null;
    setScenarios((prev) => {
      const next = prev.map((s) => {
        if (s.id !== scenarioId) return s;
        updatedScenario = { ...s, generatedManual: content, updatedAt: now };
        return updatedScenario;
      });
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    fireSync(api.upsertManual(manual));
    if (updatedScenario) fireSync(api.upsertScenario(updatedScenario));
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
    let updated: TestingScenario | null = null;
    setScenarios((prev) => {
      const next = prev.map((s) => {
        if (s.id !== scenarioId) return s;
        updated = { ...s, cloudAlmReady: true, status: s.status === "PASSED" ? "EXPORTED" as TestingStatus : s.status, updatedAt: new Date().toISOString() };
        return updated;
      });
      saveAndEmit(TESTING_STORAGE.scenarios, next);
      return next;
    });
    if (updated) fireSync(api.upsertScenario(updated));
    return payload;
  }, [scenarios, evidences, defects]);

  // ============================================================
  // Settings + reset
  // ============================================================
  const updateSettings = useCallback((patch: Partial<TestingSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAndEmit(TESTING_STORAGE.settings, next);
      return next;
    });
    fireSync(api.updateSettings(patch));
  }, []);

  const resetDemoTestingData = useCallback(async () => {
    try {
      const snap = await api.resetDemo();
      const hydrated = snap.evidences.map(hydrateEvidenceFromServer);
      setScenarios(snap.scenarios);
      setEvidences(hydrated);
      setDefects(snap.defects);
      setManuals(snap.manuals);
      setSettings(snap.settings);
      saveAndEmit(TESTING_STORAGE.scenarios, snap.scenarios);
      persistEvidences(hydrated);
      saveAndEmit(TESTING_STORAGE.defects, snap.defects);
      saveAndEmit(TESTING_STORAGE.manuals, snap.manuals);
      saveAndEmit(TESTING_STORAGE.settings, snap.settings);
      setBackendOnline(true);
    } catch {
      const sc = buildSeedScenarios(); const ev = buildSeedEvidences();
      const df = buildSeedDefects(); const mn = buildSeedManuals();
      const st = buildSeedTestingSettings();
      saveAndEmit(TESTING_STORAGE.scenarios, sc);
      persistEvidences(ev);
      saveAndEmit(TESTING_STORAGE.defects, df);
      saveAndEmit(TESTING_STORAGE.manuals, mn);
      saveAndEmit(TESTING_STORAGE.settings, st);
      setScenarios(sc); setEvidences(ev); setDefects(df); setManuals(mn); setSettings(st);
    }
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
    scenarios, evidences, defects, manuals, settings, metrics, backendOnline,
    // scenarios
    createScenario, updateScenario, upsertScenario, deleteScenario,
    markScenarioStatus, markScenarioPassed, markScenarioFailed,
    // evidence
    attachEvidence, uploadEvidenceFile, updateEvidence, removeEvidence,
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
