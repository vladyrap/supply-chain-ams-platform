"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ESTIMATION_STORAGE,
  type TimeEstimate, type EstimateInput, type EstimateStatus,
} from "@/types/estimation";
import { estimate } from "@/lib/estimation/engine";

const EVT = "ams-estimates-changed";

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

export interface UseTimeEstimator {
  estimates: TimeEstimate[];
  generate: (input: EstimateInput) => TimeEstimate;
  updateEstimate: (id: string, patch: Partial<TimeEstimate>) => void;
  deleteEstimate: (id: string) => void;
  exportMarkdown: (id: string) => void;
  copyClientResponse: (id: string) => Promise<boolean>;
  setStatus: (id: string, status: EstimateStatus) => void;
}

export function useTimeEstimator(): UseTimeEstimator {
  const [estimates, setEstimates] = useState<TimeEstimate[]>(() => {
    if (typeof window === "undefined") return [];
    return safe<TimeEstimate[]>(localStorage.getItem(ESTIMATION_STORAGE.estimates)) ?? [];
  });

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      const fresh = safe<TimeEstimate[]>(localStorage.getItem(ESTIMATION_STORAGE.estimates)) ?? [];
      setEstimates(fresh);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === ESTIMATION_STORAGE.estimates) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  const save = useCallback((next: TimeEstimate[]) => {
    setEstimates(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(ESTIMATION_STORAGE.estimates, JSON.stringify(next));
      emit();
    }
  }, []);

  const generate: UseTimeEstimator["generate"] = useCallback((input) => {
    const result = estimate(input);
    const item: TimeEstimate = {
      id: uid("est"),
      title: input.title.trim(),
      description: input.description ?? "",
      sourceType: input.sourceType ?? "manual",
      sourceId: input.sourceId ?? null,
      sapModule: input.sapModule ?? "",
      process: input.process ?? "",
      subProcess: input.subProcess,
      scopeItemIds: input.scopeItemIds ?? [],
      estimateType: input.estimateType,
      complexity: input.complexity ?? "UNKNOWN",
      severity: input.severity ?? "MEDIUM",
      urgency: input.urgency ?? "NORMAL",
      environment: input.environment ?? "NO_INFORMADO",
      serviceLevel: input.serviceLevel ?? "STANDARD",

      requiresDevelopment: !!input.requiresDevelopment,
      requiresIntegration: !!input.requiresIntegration,
      requiresTransport: !!input.requiresTransport,
      requiresUAT: !!input.requiresUAT,
      requiresApproval: !!input.requiresApproval,
      hasDocumentation: !!input.hasDocumentation,
      hasPlaybook: !!input.hasPlaybook,
      hasPublishedKnowledge: !!input.hasPublishedKnowledge,
      isProductive: !!input.isProductive,
      isRepeatedIncident: !!input.isRepeatedIncident,

      estimatedMinHours: result.estimatedMinHours,
      estimatedMaxHours: result.estimatedMaxHours,
      estimatedMinDays: result.estimatedMinDays,
      estimatedMaxDays: result.estimatedMaxDays,
      estimatedWeeks: result.estimatedWeeks,
      confidence: result.confidence,
      confidenceScore: result.confidenceScore,

      assumptions: result.assumptions,
      risks: result.risks,
      dependencies: result.dependencies,
      missingData: result.missingData,
      requiredProfiles: result.requiredProfiles,
      phaseBreakdown: result.phaseBreakdown,
      suggestedPlan: result.suggestedPlan,
      clientResponse: result.clientResponse,
      internalNotes: input.internalNotes ?? "",

      status: "GENERATED",
      createdBy: input.createdBy ?? "Consultor AMS",
      targetDate: input.targetDate,
      createdAt: now(),
      updatedAt: now(),
      tags: input.tags ?? [],
    };
    save([item, ...estimates]);
    return item;
  }, [estimates, save]);

  const updateEstimate: UseTimeEstimator["updateEstimate"] = useCallback((id, patch) => {
    save(estimates.map((e) => e.id === id ? { ...e, ...patch, updatedAt: now() } : e));
  }, [estimates, save]);

  const deleteEstimate: UseTimeEstimator["deleteEstimate"] = useCallback((id) => {
    save(estimates.filter((e) => e.id !== id));
  }, [estimates, save]);

  const setStatus: UseTimeEstimator["setStatus"] = useCallback((id, status) => {
    save(estimates.map((e) => e.id === id ? { ...e, status, updatedAt: now() } : e));
  }, [estimates, save]);

  const exportMarkdown: UseTimeEstimator["exportMarkdown"] = useCallback((id) => {
    const e = estimates.find((x) => x.id === id);
    if (!e) return;
    const md = renderFullMarkdown(e);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimacion_${e.title.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    save(estimates.map((x) => x.id === id ? { ...x, status: "EXPORTED", updatedAt: now() } : x));
  }, [estimates, save]);

  const copyClientResponse: UseTimeEstimator["copyClientResponse"] = useCallback(async (id) => {
    const e = estimates.find((x) => x.id === id);
    if (!e) return false;
    try {
      await navigator.clipboard.writeText(e.clientResponse);
      return true;
    } catch {
      return false;
    }
  }, [estimates]);

  return { estimates, generate, updateEstimate, deleteEstimate, setStatus, exportMarkdown, copyClientResponse };
}

function renderFullMarkdown(e: TimeEstimate): string {
  const lines: string[] = [];
  lines.push(`# Estimación · ${e.title}`);
  lines.push("");
  lines.push(`- **Tipo:** ${e.estimateType}`);
  lines.push(`- **Módulo:** ${e.sapModule || "—"}`);
  lines.push(`- **Proceso:** ${e.process || "—"}`);
  lines.push(`- **Complejidad / Severidad / Urgencia:** ${e.complexity} · ${e.severity} · ${e.urgency}`);
  lines.push(`- **Ambiente:** ${e.environment} · **Service level:** ${e.serviceLevel}`);
  lines.push(`- **Banda estimada:** **${e.estimatedMinHours}h – ${e.estimatedMaxHours}h** (${e.estimatedMinDays}–${e.estimatedMaxDays} días, ~${e.estimatedWeeks} sem.)`);
  lines.push(`- **Confianza:** ${e.confidence} (${e.confidenceScore}/100)`);
  if (e.targetDate) lines.push(`- **Fecha objetivo:** ${e.targetDate}`);
  lines.push("");
  if (e.description) {
    lines.push("## Descripción");
    lines.push(e.description);
    lines.push("");
  }
  lines.push(e.suggestedPlan);
  lines.push("");
  if (e.assumptions.length) {
    lines.push("## Supuestos");
    for (const a of e.assumptions) lines.push(`- ${a}`);
    lines.push("");
  }
  if (e.risks.length) {
    lines.push("## Riesgos");
    for (const r of e.risks) lines.push(`- ${r}`);
    lines.push("");
  }
  if (e.dependencies.length) {
    lines.push("## Dependencias");
    for (const d of e.dependencies) lines.push(`- ${d}`);
    lines.push("");
  }
  if (e.missingData.length) {
    lines.push("## Información requerida para precisar la estimación");
    for (const m of e.missingData) lines.push(`- ${m}`);
    lines.push("");
  }
  if (e.requiredProfiles.length) {
    lines.push("## Perfiles requeridos");
    for (const p of e.requiredProfiles) lines.push(`- ${p}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("## Respuesta sugerida al cliente");
  lines.push(e.clientResponse);
  if (e.internalNotes) {
    lines.push("");
    lines.push("## Notas internas");
    lines.push(e.internalNotes);
  }
  return lines.join("\n");
}
