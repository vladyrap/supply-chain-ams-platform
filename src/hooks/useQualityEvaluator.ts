"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AMS_MODULES_STORAGE,
  type AgentEvaluation, type HallucinationRiskLevel, type TechnicalLevelFit,
} from "@/types/ams-modules";
import { qualityApi } from "@/services/ams-modules.api";

const EVT = "ams-evaluations-changed";
const log = {
  debug: (...a: unknown[]) => { if (process.env.NODE_ENV !== "production") console.debug("[quality]", ...a); },
};
function fireSync<T>(p: Promise<T>): void {
  p.catch((err) => log.debug("quality sync failed:", (err as Error)?.message || err));
}

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

export interface QualityMetrics {
  count: number;
  avgAccuracy: number;
  avgUsefulness: number;
  avgClarity: number;
  avgCompleteness: number;
  pctHighRisk: number;
  pctNeedsReview: number;
  pctCanBecomeKnowledge: number;
  pctRequiresEscalation: number;
  topModulesLowQuality: { module: string; avgScore: number; count: number }[];
}

export interface UseQualityEvaluator {
  evaluations: AgentEvaluation[];
  metrics: QualityMetrics;
  createEvaluation: (input: Omit<AgentEvaluation, "id" | "createdAt">) => AgentEvaluation;
  updateEvaluation: (id: string, patch: Partial<AgentEvaluation>) => void;
  deleteEvaluation: (id: string) => void;
  exportCsv: () => string;
}

function aggregate(evals: AgentEvaluation[], incidents: { id: string; sap_module: string | null }[] = []): QualityMetrics {
  if (evals.length === 0) {
    return {
      count: 0, avgAccuracy: 0, avgUsefulness: 0, avgClarity: 0, avgCompleteness: 0,
      pctHighRisk: 0, pctNeedsReview: 0, pctCanBecomeKnowledge: 0, pctRequiresEscalation: 0,
      topModulesLowQuality: [],
    };
  }
  const n = evals.length;
  const sum = evals.reduce(
    (a, e) => ({
      acc: a.acc + e.accuracyScore,
      use: a.use + e.usefulnessScore,
      cla: a.cla + e.clarityScore,
      com: a.com + e.completenessScore,
      hi: a.hi + (e.hallucinationRisk === "HIGH" ? 1 : 0),
      rev: a.rev + (e.needsHumanReview ? 1 : 0),
      knw: a.knw + (e.canBecomeKnowledge ? 1 : 0),
      esc: a.esc + (e.requiresEscalation ? 1 : 0),
    }),
    { acc: 0, use: 0, cla: 0, com: 0, hi: 0, rev: 0, knw: 0, esc: 0 }
  );

  const modAgg = new Map<string, { score: number; n: number }>();
  for (const e of evals) {
    const inc = incidents.find((i) => i.id === e.incidentId);
    const mod = inc?.sap_module ?? "AMS";
    const overall = (e.accuracyScore + e.usefulnessScore + e.clarityScore + e.completenessScore) / 4;
    const cur = modAgg.get(mod) ?? { score: 0, n: 0 };
    cur.score += overall; cur.n += 1;
    modAgg.set(mod, cur);
  }
  const top = Array.from(modAgg.entries())
    .map(([module, v]) => ({ module, avgScore: Math.round((v.score / v.n) * 10) / 10, count: v.n }))
    .filter((m) => m.count >= 1)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  return {
    count: n,
    avgAccuracy: Math.round(sum.acc / n * 10) / 10,
    avgUsefulness: Math.round(sum.use / n * 10) / 10,
    avgClarity: Math.round(sum.cla / n * 10) / 10,
    avgCompleteness: Math.round(sum.com / n * 10) / 10,
    pctHighRisk: Math.round((sum.hi / n) * 100),
    pctNeedsReview: Math.round((sum.rev / n) * 100),
    pctCanBecomeKnowledge: Math.round((sum.knw / n) * 100),
    pctRequiresEscalation: Math.round((sum.esc / n) * 100),
    topModulesLowQuality: top,
  };
}

export function useQualityEvaluator(): UseQualityEvaluator {
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>(() => {
    if (typeof window === "undefined") return [];
    return safe<AgentEvaluation[]>(localStorage.getItem(AMS_MODULES_STORAGE.evaluations)) ?? [];
  });

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      setEvaluations(safe<AgentEvaluation[]>(localStorage.getItem(AMS_MODULES_STORAGE.evaluations)) ?? []);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AMS_MODULES_STORAGE.evaluations) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  // Hidratar desde backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await qualityApi.getSnapshot();
        if (cancelled) return;
        setEvaluations(snap.evaluations);
        if (typeof window !== "undefined") {
          localStorage.setItem(AMS_MODULES_STORAGE.evaluations, JSON.stringify(snap.evaluations));
        }
      } catch (err) {
        log.debug("backend offline:", (err as Error)?.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback((next: AgentEvaluation[]) => {
    setEvaluations(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(AMS_MODULES_STORAGE.evaluations, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EVT));
    }
  }, []);

  const createEvaluation: UseQualityEvaluator["createEvaluation"] = useCallback((input) => {
    const ev: AgentEvaluation = { ...input, id: uid("ev"), createdAt: now() };
    save([ev, ...evaluations]);
    fireSync(qualityApi.upsertEvaluation(ev));
    return ev;
  }, [evaluations, save]);

  const updateEvaluation: UseQualityEvaluator["updateEvaluation"] = useCallback((id, patch) => {
    const next = evaluations.map((e) => e.id === id ? { ...e, ...patch } : e);
    save(next);
    const updated = next.find((e) => e.id === id);
    if (updated) fireSync(qualityApi.upsertEvaluation(updated));
  }, [evaluations, save]);

  const deleteEvaluation: UseQualityEvaluator["deleteEvaluation"] = useCallback((id) => {
    save(evaluations.filter((e) => e.id !== id));
    fireSync(qualityApi.deleteEvaluation(id));
  }, [evaluations, save]);

  const metrics = useMemo(() => aggregate(evaluations), [evaluations]);

  const exportCsv: UseQualityEvaluator["exportCsv"] = useCallback(() => {
    const header = "id,incidentId,accuracyScore,usefulnessScore,clarityScore,completenessScore,hallucinationRisk,technicalLevelFit,needsHumanReview,canBecomeKnowledge,wasUsefulForClient,requiresEscalation,evaluator,role,createdAt";
    const rows = evaluations.map((e) =>
      [e.id, e.incidentId ?? "", e.accuracyScore, e.usefulnessScore, e.clarityScore, e.completenessScore,
        e.hallucinationRisk, e.technicalLevelFit, e.needsHumanReview, e.canBecomeKnowledge,
        e.wasUsefulForClient, e.requiresEscalation, JSON.stringify(e.evaluator), JSON.stringify(e.role), e.createdAt
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }, [evaluations]);

  return { evaluations, metrics, createEvaluation, updateEvaluation, deleteEvaluation, exportCsv };
}

export type { HallucinationRiskLevel, TechnicalLevelFit };
