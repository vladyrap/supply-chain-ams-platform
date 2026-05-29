"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TRAINING_STORAGE,
  type KnowledgeItem, type KnowledgeStatus, type KnowledgeType,
  type TrainingQA, type TrainingVersion, type TrainingVersionStatus,
  type KnowledgeGap, type GapStatus,
  type TrainingSettings, type Priority, type ValidationStage,
} from "@/types/training";
import {
  buildDefaultKnowledgeItems, buildDefaultQA, buildDefaultVersions,
  buildDefaultGaps, buildDefaultSettings,
} from "@/lib/training/demoData";
import { recomputeScore, generateQAFromItem } from "@/lib/training/scoring";
import {
  fetchTrainingSnapshot,
  apiCreateItem, apiUpdateItem, apiDeleteItem,
  apiCreateQA, apiUpdateQA, apiDeleteQA,
  apiCreateVersion, apiSetVersionStatus,
  apiCreateGap, apiUpdateGap, apiDeleteGap,
  apiUpdateSettings,
} from "@/services/training.api";

const TRAINING_EVT = "ams-training-changed";

// La fuente de datos: "backend" si el endpoint /api/training/snapshot
// respondió alguna vez en esta sesión, sino "local" (localStorage).
type Source = "backend" | "local" | "loading";

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

// ----- persistencia -----
function loadState() {
  if (typeof window === "undefined") {
    return {
      knowledge: buildDefaultKnowledgeItems(),
      qa:        buildDefaultQA(),
      versions:  buildDefaultVersions(),
      gaps:      buildDefaultGaps(),
      settings:  buildDefaultSettings(),
    };
  }
  return {
    knowledge: safe<KnowledgeItem[]>(localStorage.getItem(TRAINING_STORAGE.knowledge)) ?? buildDefaultKnowledgeItems(),
    qa:        safe<TrainingQA[]>(localStorage.getItem(TRAINING_STORAGE.qa)) ?? buildDefaultQA(),
    versions:  safe<TrainingVersion[]>(localStorage.getItem(TRAINING_STORAGE.versions)) ?? buildDefaultVersions(),
    gaps:      safe<KnowledgeGap[]>(localStorage.getItem(TRAINING_STORAGE.gaps)) ?? buildDefaultGaps(),
    settings:  safe<TrainingSettings>(localStorage.getItem(TRAINING_STORAGE.settings)) ?? buildDefaultSettings(),
  };
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRAINING_EVT));
}

function persist<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  emit();
}

// ----- shape público -----
export interface CreateKnowledgeInput {
  title: string;
  content: string;
  summary?: string;
  module: string;
  process: string;
  type: KnowledgeType;
  source?: string;
  tags?: string[];
  priority?: Priority;
  status?: KnowledgeStatus;
  author?: string;
}

export interface UseAgentTraining {
  // fuente de datos activa
  source: Source;
  // estado
  knowledge: KnowledgeItem[];
  qa: TrainingQA[];
  versions: TrainingVersion[];
  gaps: KnowledgeGap[];
  settings: TrainingSettings;

  // métricas derivadas
  metrics: {
    total: number;
    drafts: number;
    pending: number;
    validated: number;
    published: number;
    archived: number;
    rejected: number;
    qualityScore: number;          // promedio score de publicados+validados
    coverageByModule: { module: string; count: number; published: number; coverage: number }[];
    estimatedTimeSavedHours: number;
    publishedVersionLabel: string | null;
  };

  // CRUD knowledge
  createKnowledgeItem: (input: CreateKnowledgeInput) => KnowledgeItem;
  updateKnowledgeItem: (id: string, patch: Partial<KnowledgeItem>) => void;
  deleteKnowledgeItem: (id: string) => void;
  duplicateKnowledgeItem: (id: string) => KnowledgeItem | null;

  // validación / estado
  validateKnowledgeItem: (id: string, stage: "functional" | "technical", by: string) => void;
  approveKnowledgeItem: (id: string, by: string) => void;
  publishKnowledgeItem: (id: string) => { ok: true } | { ok: false; reason: string };
  archiveKnowledgeItem: (id: string) => void;
  rejectKnowledgeItem: (id: string, reason: string) => void;

  // Q&A
  generateQAForItem: (itemId: string, count: number) => TrainingQA[];
  updateQA: (id: string, patch: Partial<TrainingQA>) => void;
  deleteQA: (id: string) => void;
  approveQA: (id: string) => void;

  // versiones
  createVersion: (description: string, by: string) => TrainingVersion;
  publishVersion: (id: string) => void;
  rollbackVersion: (id: string) => void;

  // gaps
  createGap: (input: Omit<KnowledgeGap, "id" | "createdAt" | "resolvedAt" | "status"> & { status?: GapStatus }) => KnowledgeGap;
  updateGap: (id: string, patch: Partial<KnowledgeGap>) => void;
  resolveGap: (id: string) => void;
  dismissGap: (id: string) => void;

  // settings
  updateSettings: (patch: Partial<TrainingSettings>) => void;

  // demo
  resetDemoTrainingData: () => void;
}

// ============================================================================
// HOOK
// ============================================================================
export function useAgentTraining(): UseAgentTraining {
  const [source,    setSource   ] = useState<Source>("loading");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(() => loadState().knowledge);
  const [qa,        setQA       ] = useState<TrainingQA[]>(() => loadState().qa);
  const [versions,  setVersions ] = useState<TrainingVersion[]>(() => loadState().versions);
  const [gaps,      setGaps     ] = useState<KnowledgeGap[]>(() => loadState().gaps);
  const [settings,  setSettings ] = useState<TrainingSettings>(() => loadState().settings);

  // bootstrap: intentar backend, sino localStorage
  useEffect(() => {
    let cancelled = false;
    fetchTrainingSnapshot().then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setKnowledge(r.snapshot.knowledge);
        setQA(r.snapshot.qa);
        setVersions(r.snapshot.versions);
        setGaps(r.snapshot.gaps);
        setSettings(r.snapshot.settings);
        setSource("backend");
      } else {
        // backend no responde → quedamos con localStorage
        setSource("local");
      }
    });
    return () => { cancelled = true; };
  }, []);

  // sincronizar entre tabs / componentes (solo modo local)
  useEffect(() => {
    function reload() {
      if (source !== "local") return;
      const s = loadState();
      setKnowledge(s.knowledge);
      setQA(s.qa);
      setVersions(s.versions);
      setGaps(s.gaps);
      setSettings(s.settings);
    }
    function onStorage(e: StorageEvent) {
      if (e.key && Object.values(TRAINING_STORAGE).includes(e.key as never)) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(TRAINING_EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TRAINING_EVT, reload);
    };
  }, [source]);

  // ----- métricas derivadas -----
  const metrics = useMemo<UseAgentTraining["metrics"]>(() => {
    const total = knowledge.length;
    const drafts = knowledge.filter((k) => k.status === "DRAFT").length;
    const pending = knowledge.filter((k) => k.status === "PENDING_REVIEW").length;
    const validated = knowledge.filter((k) => k.status === "VALIDATED").length;
    const published = knowledge.filter((k) => k.status === "PUBLISHED").length;
    const archived = knowledge.filter((k) => k.status === "ARCHIVED").length;
    const rejected = knowledge.filter((k) => k.status === "REJECTED").length;
    const qualityPool = knowledge.filter((k) => k.status === "PUBLISHED" || k.status === "VALIDATED");
    const qualityScore = qualityPool.length
      ? Math.round(qualityPool.reduce((a, k) => a + k.score, 0) / qualityPool.length)
      : 0;

    const moduleMap = new Map<string, { count: number; published: number }>();
    knowledge.forEach((k) => {
      const cur = moduleMap.get(k.module) ?? { count: 0, published: 0 };
      cur.count++;
      if (k.status === "PUBLISHED") cur.published++;
      moduleMap.set(k.module, cur);
    });
    const coverageByModule = Array.from(moduleMap.entries())
      .map(([module, v]) => ({
        module,
        count: v.count,
        published: v.published,
        coverage: v.count > 0 ? Math.round((v.published / v.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // estimación de tiempo ahorrado: 12 minutos por ítem publicado.
    const estimatedTimeSavedHours = Math.round((published * 12) / 60);

    const lastPublished = [...versions]
      .filter((v) => v.status === "PUBLISHED")
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];
    const publishedVersionLabel = lastPublished?.version ?? null;

    return { total, drafts, pending, validated, published, archived, rejected,
      qualityScore, coverageByModule, estimatedTimeSavedHours, publishedVersionLabel };
  }, [knowledge, versions]);

  // ----- CRUD knowledge -----
  const persistKnowledge = useCallback((next: KnowledgeItem[]) => {
    setKnowledge(next);
    persist(TRAINING_STORAGE.knowledge, next);
  }, []);

  const createKnowledgeItem: UseAgentTraining["createKnowledgeItem"] = useCallback((input) => {
    const t = now();
    const item: KnowledgeItem = {
      id: uid("kn"),
      title: input.title.trim().slice(0, 200),
      content: input.content,
      summary: (input.summary || input.content).slice(0, 280),
      module: input.module,
      process: input.process,
      type: input.type,
      source: input.source || "manual",
      tags: input.tags?.filter(Boolean).slice(0, 8) ?? [],
      priority: input.priority ?? "medium",
      status: input.status ?? "DRAFT",
      score: 0,
      version: "draft",
      author: input.author || "Consultor AMS",
      createdAt: t,
      updatedAt: t,
      validatedBy: null,
      publishedAt: null,
      validationStage: "PENDING_FUNCTIONAL",
      functionalValidatedBy: null,
      technicalValidatedBy: null,
      rejectionReason: null,
    };
    item.score = recomputeScore(item);
    // optimista local
    const next = [item, ...knowledge];
    persistKnowledge(next);
    // si hay backend, sincronizar (reemplaza la fila optimista por la real)
    if (source === "backend") {
      apiCreateItem({
        title: item.title, content: item.content, summary: item.summary,
        module: item.module, process: item.process, type: item.type,
        source: item.source, tags: item.tags, priority: item.priority,
        status: item.status, author: item.author,
      }).then((r) => {
        if (r.ok) {
          setKnowledge((cur) => cur.map((k) => k.id === item.id ? r.item : k));
        }
      });
    }
    return item;
  }, [knowledge, persistKnowledge, source]);

  const updateKnowledgeItem: UseAgentTraining["updateKnowledgeItem"] = useCallback((id, patch) => {
    const next = knowledge.map((k) => {
      if (k.id !== id) return k;
      const merged = { ...k, ...patch, updatedAt: now() };
      merged.score = recomputeScore(merged);
      return merged;
    });
    persistKnowledge(next);
    if (source === "backend") {
      // solo enviar al backend si el id es uuid real (no kn_xxx local)
      if (/^[0-9a-f]{8}-/.test(id)) {
        apiUpdateItem(id, patch as never).then((r) => {
          if (r.ok) setKnowledge((cur) => cur.map((k) => k.id === id ? r.item : k));
        });
      }
    }
  }, [knowledge, persistKnowledge, source]);

  const deleteKnowledgeItem: UseAgentTraining["deleteKnowledgeItem"] = useCallback((id) => {
    persistKnowledge(knowledge.filter((k) => k.id !== id));
    const nextQA = qa.filter((q) => q.knowledgeItemId !== id);
    setQA(nextQA);
    persist(TRAINING_STORAGE.qa, nextQA);
    if (source === "backend" && /^[0-9a-f]{8}-/.test(id)) {
      apiDeleteItem(id);
    }
  }, [knowledge, qa, persistKnowledge, source]);

  const duplicateKnowledgeItem: UseAgentTraining["duplicateKnowledgeItem"] = useCallback((id) => {
    const orig = knowledge.find((k) => k.id === id);
    if (!orig) return null;
    const t = now();
    const copy: KnowledgeItem = {
      ...orig,
      id: uid("kn"),
      title: `${orig.title} (copia)`,
      status: "DRAFT",
      validationStage: "PENDING_FUNCTIONAL",
      functionalValidatedBy: null,
      technicalValidatedBy: null,
      validatedBy: null,
      publishedAt: null,
      createdAt: t,
      updatedAt: t,
      version: "draft",
    };
    copy.score = recomputeScore(copy);
    persistKnowledge([copy, ...knowledge]);
    return copy;
  }, [knowledge, persistKnowledge]);

  // ----- validación -----
  const validateKnowledgeItem: UseAgentTraining["validateKnowledgeItem"] = useCallback((id, stage, by) => {
    const next = knowledge.map((k) => {
      if (k.id !== id) return k;
      const m = { ...k, updatedAt: now() };
      if (stage === "functional") {
        m.functionalValidatedBy = by;
        m.validationStage = m.technicalValidatedBy ? "FULLY_VALIDATED" : "PENDING_TECHNICAL";
      } else {
        m.technicalValidatedBy = by;
        m.validationStage = m.functionalValidatedBy ? "FULLY_VALIDATED" : "PENDING_FUNCTIONAL";
      }
      if (m.validationStage === "FULLY_VALIDATED") {
        m.status = "VALIDATED";
        m.validatedBy = by;
      } else {
        m.status = "PENDING_REVIEW";
      }
      m.score = recomputeScore(m);
      return m;
    });
    persistKnowledge(next);
  }, [knowledge, persistKnowledge]);

  const approveKnowledgeItem: UseAgentTraining["approveKnowledgeItem"] = useCallback((id, by) => {
    // shortcut: fuerza validación completa sin requerir doble.
    const next = knowledge.map((k) => {
      if (k.id !== id) return k;
      const m: KnowledgeItem = { ...k,
        status: "VALIDATED",
        validationStage: "FULLY_VALIDATED",
        validatedBy: by,
        functionalValidatedBy: k.functionalValidatedBy ?? by,
        technicalValidatedBy: k.technicalValidatedBy ?? by,
        updatedAt: now(),
      };
      m.score = recomputeScore(m);
      return m;
    });
    persistKnowledge(next);
  }, [knowledge, persistKnowledge]);

  const publishKnowledgeItem: UseAgentTraining["publishKnowledgeItem"] = useCallback((id) => {
    const item = knowledge.find((k) => k.id === id);
    if (!item) return { ok: false, reason: "Ítem no encontrado" };
    if (item.score < settings.minScoreToPublish) {
      return { ok: false, reason: `Score (${item.score}) por debajo del umbral configurado (${settings.minScoreToPublish}).` };
    }
    if (settings.requireFunctionalValidation && !item.functionalValidatedBy) {
      return { ok: false, reason: "Falta validación funcional." };
    }
    if (settings.requireTechnicalValidation && !item.technicalValidatedBy) {
      return { ok: false, reason: "Falta validación técnica." };
    }
    if (item.status === "REJECTED") {
      return { ok: false, reason: "El ítem está rechazado y no puede publicarse." };
    }
    const next = knowledge.map((k) => k.id === id
      ? { ...k, status: "PUBLISHED" as KnowledgeStatus, publishedAt: now(), updatedAt: now() }
      : k);
    persistKnowledge(next);
    return { ok: true };
  }, [knowledge, settings, persistKnowledge]);

  const archiveKnowledgeItem: UseAgentTraining["archiveKnowledgeItem"] = useCallback((id) => {
    persistKnowledge(knowledge.map((k) => k.id === id ? { ...k, status: "ARCHIVED", updatedAt: now() } : k));
  }, [knowledge, persistKnowledge]);

  const rejectKnowledgeItem: UseAgentTraining["rejectKnowledgeItem"] = useCallback((id, reason) => {
    persistKnowledge(knowledge.map((k) => k.id === id ? {
      ...k, status: "REJECTED", rejectionReason: reason, updatedAt: now(),
    } : k));
  }, [knowledge, persistKnowledge]);

  // ----- Q&A -----
  const persistQA = useCallback((next: TrainingQA[]) => {
    setQA(next);
    persist(TRAINING_STORAGE.qa, next);
  }, []);

  const generateQAForItem: UseAgentTraining["generateQAForItem"] = useCallback((itemId, count) => {
    const item = knowledge.find((k) => k.id === itemId);
    if (!item) return [];
    const pairs = generateQAFromItem(item, count);
    const t = now();
    const created: TrainingQA[] = pairs.map((p) => ({
      id: uid("qa"),
      knowledgeItemId: itemId,
      question: p.question,
      expectedAnswer: p.expectedAnswer,
      approved: false,
      createdAt: t,
    }));
    persistQA([...created, ...qa]);
    return created;
  }, [knowledge, qa, persistQA]);

  const updateQA: UseAgentTraining["updateQA"] = useCallback((id, patch) => {
    persistQA(qa.map((q) => q.id === id ? { ...q, ...patch } : q));
  }, [qa, persistQA]);

  const deleteQA: UseAgentTraining["deleteQA"] = useCallback((id) => {
    persistQA(qa.filter((q) => q.id !== id));
  }, [qa, persistQA]);

  const approveQA: UseAgentTraining["approveQA"] = useCallback((id) => {
    persistQA(qa.map((q) => q.id === id ? { ...q, approved: true } : q));
  }, [qa, persistQA]);

  // ----- versiones -----
  const persistVersions = useCallback((next: TrainingVersion[]) => {
    setVersions(next);
    persist(TRAINING_STORAGE.versions, next);
  }, []);

  const createVersion: UseAgentTraining["createVersion"] = useCallback((description, by) => {
    const lastNum = versions
      .map((v) => v.version.replace(/^v/i, ""))
      .map((s) => s.split("."))
      .map(([maj, min]) => ({ maj: Number(maj || 0), min: Number(min || 0) }))
      .sort((a, b) => (b.maj - a.maj) || (b.min - a.min))[0];
    const next = lastNum ? `v${lastNum.maj}.${lastNum.min + 1}` : "v0.1";
    const t = now();
    const ver: TrainingVersion = {
      id: uid("ver"),
      version: next,
      description: description || `Versión ${next} del agente`,
      status: "DRAFT",
      itemCount: knowledge.length,
      validatedCount: knowledge.filter((k) => k.status === "VALIDATED" || k.status === "PUBLISHED").length,
      publishedCount: knowledge.filter((k) => k.status === "PUBLISHED").length,
      createdBy: by,
      createdAt: t,
      publishedAt: null,
      changelog: [`Snapshot inicial con ${knowledge.length} ítems`],
    };
    persistVersions([ver, ...versions]);
    return ver;
  }, [versions, knowledge, persistVersions]);

  const publishVersion: UseAgentTraining["publishVersion"] = useCallback((id) => {
    const next = versions.map<TrainingVersion>((v) => {
      if (v.id === id) return { ...v, status: "PUBLISHED", publishedAt: now() };
      // versiones previas pasan a ARCHIVED
      if (v.status === "PUBLISHED") return { ...v, status: "ARCHIVED" };
      return v;
    });
    persistVersions(next);
  }, [versions, persistVersions]);

  const rollbackVersion: UseAgentTraining["rollbackVersion"] = useCallback((id) => {
    persistVersions(versions.map<TrainingVersion>((v) => v.id === id ? { ...v, status: "ROLLED_BACK" } : v));
  }, [versions, persistVersions]);

  // ----- gaps -----
  const persistGaps = useCallback((next: KnowledgeGap[]) => {
    setGaps(next);
    persist(TRAINING_STORAGE.gaps, next);
  }, []);

  const createGap: UseAgentTraining["createGap"] = useCallback((input) => {
    const gap: KnowledgeGap = {
      id: uid("gap"),
      title: input.title,
      description: input.description,
      module: input.module,
      process: input.process,
      priority: input.priority,
      suggestedAction: input.suggestedAction,
      status: input.status ?? "OPEN",
      createdAt: now(),
      resolvedAt: null,
    };
    persistGaps([gap, ...gaps]);
    if (source === "backend") {
      apiCreateGap({
        title: gap.title, description: gap.description,
        module: gap.module, process: gap.process,
        priority: gap.priority, suggestedAction: gap.suggestedAction,
        status: gap.status,
      }).then((r) => {
        if (r.ok) setGaps((cur) => cur.map((g) => g.id === gap.id ? r.gap : g));
      });
    }
    return gap;
  }, [gaps, persistGaps, source]);

  const updateGap: UseAgentTraining["updateGap"] = useCallback((id, patch) => {
    persistGaps(gaps.map((g) => g.id === id ? { ...g, ...patch } : g));
  }, [gaps, persistGaps]);

  const resolveGap: UseAgentTraining["resolveGap"] = useCallback((id) => {
    persistGaps(gaps.map((g) => g.id === id ? { ...g, status: "RESOLVED", resolvedAt: now() } : g));
  }, [gaps, persistGaps]);

  const dismissGap: UseAgentTraining["dismissGap"] = useCallback((id) => {
    persistGaps(gaps.map((g) => g.id === id ? { ...g, status: "DISMISSED" } : g));
  }, [gaps, persistGaps]);

  // ----- settings -----
  const updateSettings: UseAgentTraining["updateSettings"] = useCallback((patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    persist(TRAINING_STORAGE.settings, next);
    if (source === "backend") {
      apiUpdateSettings(patch).then((r) => {
        if (r.ok) setSettings(r.settings);
      });
    }
  }, [settings, source]);

  // ----- demo reset -----
  const resetDemoTrainingData: UseAgentTraining["resetDemoTrainingData"] = useCallback(() => {
    if (typeof window !== "undefined") {
      Object.values(TRAINING_STORAGE).forEach((k) => localStorage.removeItem(k));
    }
    const k = buildDefaultKnowledgeItems(); persist(TRAINING_STORAGE.knowledge, k); setKnowledge(k);
    const q = buildDefaultQA();             persist(TRAINING_STORAGE.qa, q);        setQA(q);
    const v = buildDefaultVersions();       persist(TRAINING_STORAGE.versions, v);  setVersions(v);
    const g = buildDefaultGaps();           persist(TRAINING_STORAGE.gaps, g);      setGaps(g);
    const s = buildDefaultSettings();       persist(TRAINING_STORAGE.settings, s);  setSettings(s);
  }, []);

  return {
    source,
    knowledge, qa, versions, gaps, settings, metrics,
    createKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem, duplicateKnowledgeItem,
    validateKnowledgeItem, approveKnowledgeItem, publishKnowledgeItem,
    archiveKnowledgeItem, rejectKnowledgeItem,
    generateQAForItem, updateQA, deleteQA, approveQA,
    createVersion, publishVersion, rollbackVersion,
    createGap, updateGap, resolveGap, dismissGap,
    updateSettings, resetDemoTrainingData,
  };
}

// Re-export ValidationStage for sub-components convenience
export type { ValidationStage };
