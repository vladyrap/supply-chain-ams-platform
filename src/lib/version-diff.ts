// =============================================================================
// version-diff.ts — Diff field-aware entre snapshots de análisis (F2)
// =============================================================================
// Compara dos versiones del `intelligence` de un caso extrayendo un resumen
// normalizado de campos conocidos (readiness, ETA, contexto, causa raíz,
// riesgos…) y clasificando cada campo como added / removed / changed /
// unchanged. Lectura defensiva: el `analysis` puede driftear entre versiones de
// motor, por eso se accede con optional-chaining y casts controlados.
// =============================================================================

import type { TicketIntelligence } from "@/types/ticket-intelligence";

export interface SnapshotField {
  key: string;
  label: string;
  value: string | null;
}

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface FieldDiff {
  key: string;
  label: string;
  a: string | null; // versión más antigua
  b: string | null; // versión más nueva
  status: DiffStatus;
}

/** Normaliza cualquier valor a un string presentable, o null si vacío. */
function s(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "sí" : "no";
  return String(v);
}

/** Extrae los campos comparables de un snapshot de intelligence. */
export function summarizeSnapshot(intel: TicketIntelligence | null | undefined): SnapshotField[] {
  const a = ((intel?.analysis ?? {}) as Record<string, unknown>);
  const spec = (intel as unknown as Record<string, unknown> | undefined)?.specialistAnalysis as
    | Record<string, unknown> | undefined;
  const primary = (spec?.primaryAnalysis ?? {}) as Record<string, unknown>;
  const ctx = (a.detectedContext ?? {}) as Record<string, unknown>;
  const est = (a.estimatedResolution ?? null) as Record<string, unknown> | null;
  const nba = (a.nextBestAction ?? null) as Record<string, unknown> | null;
  const km = (a.knowledgeMatches ?? null) as Record<string, unknown> | null;
  const qr = a.qualityRisks;
  const md = a.missingData;

  return [
    { key: "status", label: "Estado del análisis", value: s(intel?.status) },
    { key: "readiness", label: "Readiness", value: s(a.readinessScore) },
    { key: "confidence", label: "Confianza global", value: s(a.confidenceGlobal) },
    {
      key: "eta", label: "ETA (horas)",
      value: est && typeof est.minHours === "number" ? `${est.minHours}–${est.maxHours}h` : null,
    },
    { key: "module", label: "Módulo", value: s(ctx.module) },
    { key: "transaction", label: "Transacción", value: s(ctx.transaction) },
    { key: "errorCode", label: "Código de error", value: s(ctx.errorCode) },
    { key: "issueType", label: "Tipo de incidencia", value: s(ctx.issueType) },
    { key: "nextBestAction", label: "Próxima mejor acción", value: s(nba?.label ?? nba?.action) },
    { key: "specialist", label: "Especialista primario", value: s(primary.specialist) },
    {
      key: "qualityRisks", label: "Riesgos de calidad",
      value: Array.isArray(qr) ? String(qr.length) : null,
    },
    {
      key: "missingData", label: "Datos faltantes",
      value: Array.isArray(md) ? (md.length ? (md as unknown[]).map(String).join(", ") : "0") : null,
    },
    { key: "knowledgeMatches", label: "Coincidencias KB", value: s(km?.count) },
    { key: "engineVersion", label: "Versión de motor", value: s(a.engineVersion) },
  ];
}

/**
 * Diff entre dos snapshots. `a` es la versión más antigua, `b` la más nueva.
 * Un campo es "added" si aparece en b (no estaba en a), "removed" si desaparece,
 * "changed" si cambió de valor, "unchanged" si es igual.
 */
export function diffSnapshots(
  a: TicketIntelligence | null | undefined,
  b: TicketIntelligence | null | undefined,
): FieldDiff[] {
  const fa = summarizeSnapshot(a);
  const fb = summarizeSnapshot(b);
  const mapB = new Map(fb.map((f) => [f.key, f]));
  return fa.map((f) => {
    const other = mapB.get(f.key);
    const av = f.value;
    const bv = other?.value ?? null;
    let status: DiffStatus;
    if (av === bv) status = "unchanged";
    else if (av === null && bv !== null) status = "added";
    else if (av !== null && bv === null) status = "removed";
    else status = "changed";
    return { key: f.key, label: f.label, a: av, b: bv, status };
  });
}

/** Cuenta cambios reales (excluye unchanged) para el badge de resumen. */
export function countChanges(diffs: FieldDiff[]): number {
  return diffs.filter((d) => d.status !== "unchanged").length;
}
