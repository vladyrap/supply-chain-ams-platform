// =============================================================================
// Clean Core Governance — Motor de scoring
// =============================================================================
// Calcula el índice Clean Core 0-100 a partir de los hallazgos:
//   - Cada dimensión arranca en 100 y se penaliza por hallazgo abierto según
//     severidad. Los resueltos no penalizan; los riesgos aceptados penalizan
//     a la mitad (desviación documentada y gobernada, no eliminada).
//   - El índice global es el promedio ponderado por el peso de cada dimensión.
//   - projectedIndex = índice si se remediaran todos los hallazgos abiertos.
// =============================================================================

import type {
  CleanCoreFinding, CleanCoreDimensionDef, CleanCoreResult, DimensionResult,
  CleanCoreBand, FindingSeverity, FindingStatus,
} from "./types";
import { CLEAN_CORE_DIMENSIONS, CLEAN_CORE_BANDS } from "./dataset";

// Penalización base por severidad (puntos que resta un hallazgo abierto).
const SEVERITY_PENALTY: Record<FindingSeverity, number> = {
  critical: 22,
  high: 13,
  medium: 7,
  low: 3,
};

// Factor de penalización por status. Resuelto = 0; abierto/en progreso = full;
// riesgo aceptado = mitad (queda como deuda gobernada).
const STATUS_FACTOR: Record<FindingStatus, number> = {
  open: 1,
  in_progress: 1,
  resolved: 0,
  accepted_risk: 0.5,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function bandForIndex(index: number): CleanCoreBand {
  // CLEAN_CORE_BANDS está ordenado de mayor a menor min.
  return CLEAN_CORE_BANDS.find((b) => index >= b.min) ?? CLEAN_CORE_BANDS[CLEAN_CORE_BANDS.length - 1];
}

/** Penalización efectiva de un hallazgo dado su status y severidad. */
function penaltyOf(f: CleanCoreFinding): number {
  return SEVERITY_PENALTY[f.severity] * STATUS_FACTOR[f.status];
}

/** ¿Cuenta el hallazgo como "abierto" (trabajo pendiente)? */
function isOpen(status: FindingStatus): boolean {
  return status === "open" || status === "in_progress";
}

function scoreDimension(def: CleanCoreDimensionDef, findings: CleanCoreFinding[]): DimensionResult {
  const mine = findings.filter((f) => f.dimension === def.id);
  const penalty = mine.reduce((acc, f) => acc + penaltyOf(f), 0);
  const score = Math.round(clamp(100 - penalty, 0, 100));
  const band = bandForIndex(score);

  const open = mine.filter((f) => isOpen(f.status));
  const criticalOpen = open.filter((f) => f.severity === "critical").length;
  const effortHours = open.reduce((acc, f) => acc + f.effortHours, 0);

  // Recomendación destacada: el hallazgo abierto de mayor severidad → mayor esfuerzo.
  const sevRank: Record<FindingSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const top = [...open].sort((a, b) =>
    sevRank[b.severity] - sevRank[a.severity] || b.effortHours - a.effortHours)[0];

  return {
    def,
    score,
    band,
    weightedContribution: score * def.weight,
    findings: mine,
    openCount: open.length,
    criticalOpen,
    effortHours,
    topRecommendation: top ? top.recommendation : null,
  };
}

export function computeCleanCore(findings: CleanCoreFinding[]): CleanCoreResult {
  const dimensions = CLEAN_CORE_DIMENSIONS.map((def) => scoreDimension(def, findings));

  // Índice global = Σ score_i * weight_i (los weights suman 1).
  const rawIndex = dimensions.reduce((acc, d) => acc + d.weightedContribution, 0);
  const index = Math.round(clamp(rawIndex, 0, 100));
  const band = bandForIndex(index);

  // Índice proyectado: como si todos los hallazgos abiertos pasaran a resueltos.
  const projected = findings.map((f) => (isOpen(f.status) ? { ...f, status: "resolved" as FindingStatus } : f));
  const projectedDims = CLEAN_CORE_DIMENSIONS.map((def) => scoreDimension(def, projected));
  const projectedIndex = Math.round(clamp(
    projectedDims.reduce((acc, d) => acc + d.weightedContribution, 0), 0, 100));

  // Totales
  const open = findings.filter((f) => isOpen(f.status));
  const resolved = findings.filter((f) => f.status === "resolved").length;
  const acceptedRisk = findings.filter((f) => f.status === "accepted_risk").length;
  const critical = open.filter((f) => f.severity === "critical").length;
  const high = open.filter((f) => f.severity === "high").length;
  const effortHours = open.reduce((acc, f) => acc + f.effortHours, 0);

  const withVerdict = findings.length;
  const cloudReady = findings.filter((f) => f.cloudReady).length;
  const cloudReadyRatio = withVerdict > 0 ? cloudReady / withVerdict : 0;

  return {
    index,
    band,
    projectedIndex,
    dimensions: dimensions.sort((a, b) => a.score - b.score), // peor primero → foco
    totals: {
      findings: findings.length,
      open: open.length,
      resolved,
      acceptedRisk,
      critical,
      high,
      effortHours,
      cloudReadyRatio,
    },
  };
}

// ── Helpers de presentación ──────────────────────────────────────────────────

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

export const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: "var(--error, #da1e28)",
  high: "#ff832b",
  medium: "var(--warn, #f1c21b)",
  low: "var(--accent, #0f62fe)",
};

export const STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  resolved: "Resuelto",
  accepted_risk: "Riesgo aceptado",
};

export const STATUS_COLORS: Record<FindingStatus, string> = {
  open: "var(--error, #da1e28)",
  in_progress: "#ff832b",
  resolved: "var(--ok, #24a148)",
  accepted_risk: "var(--text-dim, #6f6f6f)",
};

/** Serializa hallazgos a CSV para exportar. */
export function findingsToCsv(findings: CleanCoreFinding[]): string {
  const header = [
    "id", "dimension", "severity", "status", "sapModule", "object",
    "objectType", "cloudReady", "effortHours", "title", "recommendation", "reference",
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = findings.map((f) => [
    f.id, f.dimension, f.severity, f.status, f.sapModule, f.object,
    f.objectType, f.cloudReady ? "yes" : "no", f.effortHours, f.title,
    f.recommendation, f.reference ?? "",
  ].map(escape).join(","));
  return [header.join(","), ...rows].join("\n");
}
