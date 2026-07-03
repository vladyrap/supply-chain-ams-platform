// =============================================================================
// n1-package-ui-normalizer.ts — Adapta N1Package para la UI defensivamente
// =============================================================================
// Filtra items rotos (label vacío, undefined), normaliza shapes inconsistentes
// que vengan de packages persistidos de builds previos, y devuelve un contrato
// estable que el componente UI puede consumir sin defensivas.
//
// La lógica de negocio del N1Package NO se cambia — esto es solo para UI.
// =============================================================================

import type { N1Package, ChecklistN1Item, N1EscalationCriterion } from "@/types/guided-ticket-intake";

/** Nivel de readiness derivado del score, para colorear UI. */
export type ReadinessLevel = "LOW" | "MEDIUM" | "HIGH" | "READY";

export interface NormalizedN1Package {
  readinessScore: number;
  readinessLevel: ReadinessLevel;
  readinessLabel: string;            // "Bajo" | "Medio" | "Alto" | "Listo"
  readinessColor: string;            // hex color por nivel
  classificationLabel: string;       // "MM · Recepción · MIGO" o "Sin clasificar"
  etaLabel: string;                  // "3.4–16h · media" o "ETA pendiente"
  receivedDataItems: string[];       // ✓
  missingDataItems: string[];        // ⚠
  checklistItems: NormalizedChecklistItem[];
  escalationItems: { criterion: N1EscalationCriterion; label: string }[];
  suggestedPlaybook: { title: string; reason: string } | null;
  canResolveAtN1: boolean;
  hasContent: boolean;               // false si el package es completamente vacío
}

export interface NormalizedChecklistItem {
  id: string;
  order: number;
  label: string;
  description?: string;
  requiresN2: boolean;               // !resolvableN1
  escalateReason?: string;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const READINESS_LABELS: Record<ReadinessLevel, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  READY: "Listo",
};

const READINESS_COLORS: Record<ReadinessLevel, string> = {
  LOW: "#fa4d56",
  MEDIUM: "#f59e0b",
  HIGH: "#4589ff",
  READY: "#10b981",
};

/** Deriva nivel desde score (defensivo si el package no trae readinessStatus). */
function deriveLevel(score: number, fallback?: ReadinessLevel): ReadinessLevel {
  if (fallback && ["LOW", "MEDIUM", "HIGH", "READY"].includes(fallback)) return fallback;
  if (score >= 85) return "READY";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/** Filtra y normaliza items del checklist. */
function normalizeChecklist(items: ChecklistN1Item[] | undefined | null): NormalizedChecklistItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((c) => c && typeof c === "object")
    .map((c, idx) => {
      const rawLabel = typeof c.label === "string" ? c.label.trim() : "";
      // Si el label viene vacío pero hay description, usamos description como label
      const fallbackLabel = c.description?.trim() || "";
      const label = rawLabel || fallbackLabel;
      return {
        id: c.id || `n1-item-${idx}`,
        order: typeof c.order === "number" && Number.isFinite(c.order) ? c.order : idx + 1,
        label,
        description: rawLabel && fallbackLabel ? fallbackLabel : undefined,
        requiresN2: c.resolvableN1 === false,
        escalateReason: typeof c.escalateReason === "string" ? c.escalateReason : undefined,
        completed: !!c.completed,
      };
    })
    // Filtramos items que quedaron sin label real después del fallback
    .filter((c) => c.label.length > 0)
    .sort((a, b) => a.order - b.order);
}

/** Filtra strings vacíos / null / duplicados de arrays de texto. */
function cleanStringList(arr: unknown[] | undefined | null, cap = 12): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

/** Construye label de clasificación SAP. */
function buildClassificationLabel(c: N1Package["sapClassification"] | undefined): string {
  if (!c) return "Sin clasificar";
  const parts = [c.module, c.process, c.transaction].filter((s) => s && s.trim());
  return parts.length > 0 ? parts.join(" · ") : "Sin clasificar";
}

/** Construye label de ETA. */
function buildEtaLabel(eh: N1Package["estimatedHours"] | undefined): string {
  if (!eh || typeof eh.min !== "number" || typeof eh.max !== "number") return "ETA pendiente";
  const conf = (eh.confidence || "").toLowerCase();
  return `${eh.min}–${eh.max}h${conf ? ` · ${conf}` : ""}`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Normaliza un N1Package potencialmente sucio/incompleto a una estructura
 * que la UI puede renderear sin null checks ni defensivas adicionales.
 */
export function normalizeN1PackageForUI(
  pkg: N1Package | null | undefined,
): NormalizedN1Package | null {
  if (!pkg || typeof pkg !== "object") return null;

  const score = typeof pkg.readinessScore === "number" ? Math.max(0, Math.min(100, pkg.readinessScore)) : 0;
  const level = deriveLevel(score, pkg.readinessStatus);

  const receivedDataItems = cleanStringList(pkg.completedInfo);
  const missingDataItems = [
    ...cleanStringList(pkg.missingInfo),
    ...cleanStringList(pkg.missingData),
  ].filter((v, i, arr) => arr.indexOf(v) === i); // dedup cross-arrays

  const checklistItems = normalizeChecklist(pkg.n1Checklist);
  const escalationItems = Array.isArray(pkg.escalationCriteria)
    ? pkg.escalationCriteria
        .filter((c): c is N1EscalationCriterion => typeof c === "string" && c.length > 0)
        .map((criterion) => ({ criterion, label: criterion.replace(/_/g, " ") }))
    : [];

  const playbook = pkg.suggestedPlaybook && pkg.suggestedPlaybook.title?.trim()
    ? { title: pkg.suggestedPlaybook.title.trim(), reason: (pkg.suggestedPlaybook.reason || "").trim() }
    : null;

  const canResolveAtN1 = checklistItems.length > 0 && checklistItems.some((c) => !c.requiresN2);

  const hasContent =
    receivedDataItems.length > 0 ||
    missingDataItems.length > 0 ||
    checklistItems.length > 0 ||
    escalationItems.length > 0 ||
    !!playbook;

  return {
    readinessScore: score,
    readinessLevel: level,
    readinessLabel: READINESS_LABELS[level],
    readinessColor: READINESS_COLORS[level],
    classificationLabel: buildClassificationLabel(pkg.sapClassification),
    etaLabel: buildEtaLabel(pkg.estimatedHours),
    receivedDataItems,
    missingDataItems,
    checklistItems,
    escalationItems,
    suggestedPlaybook: playbook,
    canResolveAtN1,
    hasContent,
  };
}
