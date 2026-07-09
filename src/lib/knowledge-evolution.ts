// =============================================================================
// knowledge-evolution.ts — "¿Qué aprendimos?" entre versiones (F3)
// =============================================================================
// A partir del diff field-aware (F2) construye la narrativa de evolución del
// conocimiento del caso: qué aprendimos, qué descartamos, y en qué dirección
// se movió el riesgo. Determinístico (sin IA) — sirve de base o fallback.
// =============================================================================

import type { TicketIntelligence } from "@/types/ticket-intelligence";
import { diffSnapshots } from "./version-diff";

export interface KnowledgeEvolution {
  hasChanges: boolean;
  learned: string[];    // aprendizajes (valores nuevos o cambiados)
  discarded: string[];  // información descartada
  riskDown: string[];   // señales de riesgo a la baja
  riskUp: string[];     // señales de riesgo al alza
  changesCount: number;
  summaryLine: string;
}

/** Cuenta elementos en un valor tipo lista "a, b, c" (o 0/null). */
function listCount(v: string | null): number {
  if (!v || v === "0") return 0;
  return v.split(",").filter((s) => s.trim()).length;
}

export function computeKnowledgeEvolution(
  older: TicketIntelligence | null | undefined,
  newer: TicketIntelligence | null | undefined,
): KnowledgeEvolution {
  const diffs = diffSnapshots(older, newer);
  const learned: string[] = [];
  const discarded: string[] = [];
  const riskUp: string[] = [];
  const riskDown: string[] = [];

  for (const d of diffs) {
    if (d.status === "unchanged") continue;

    if (d.status === "added") learned.push(`${d.label}: ${d.b}`);
    else if (d.status === "removed") discarded.push(`${d.label}: ${d.a}`);
    else if (d.status === "changed") learned.push(`${d.label}: ${d.a} → ${d.b}`);

    const na = Number(d.a);
    const nb = Number(d.b);

    if (d.key === "readiness" && Number.isFinite(na) && Number.isFinite(nb)) {
      if (nb > na) riskDown.push(`Readiness subió ${na} → ${nb}`);
      else if (nb < na) riskUp.push(`Readiness bajó ${na} → ${nb}`);
    }
    if (d.key === "qualityRisks" && Number.isFinite(na) && Number.isFinite(nb)) {
      if (nb > na) riskUp.push(`Más riesgos de calidad (${na} → ${nb})`);
      else if (nb < na) riskDown.push(`Menos riesgos de calidad (${na} → ${nb})`);
    }
    if (d.key === "missingData") {
      const ca = listCount(d.a);
      const cb = listCount(d.b);
      if (cb < ca) riskDown.push("Se completaron datos faltantes");
      else if (cb > ca) riskUp.push("Aparecieron nuevos datos faltantes");
    }
    if ((d.key === "errorCode" || d.key === "issueType") && (d.status === "added" || d.status === "changed")) {
      riskDown.push("Diagnóstico más preciso");
    }
  }

  const changesCount = diffs.filter((d) => d.status !== "unchanged").length;
  const summaryLine = changesCount === 0
    ? "Sin cambios entre las dos últimas versiones."
    : `${changesCount} ${changesCount === 1 ? "cambio" : "cambios"} · ${learned.length} aprendizajes · ${discarded.length} descartes`;

  return { hasChanges: changesCount > 0, learned, discarded, riskUp, riskDown, changesCount, summaryLine };
}

/** Título + cuerpo para persistir como MemoryRecord kind=learning. */
export function buildLearningRecord(
  ticketKey: string,
  ev: KnowledgeEvolution,
  versionLabel: string,
): { title: string; body: string } {
  const title = `Aprendizaje ${ticketKey} · ${versionLabel}`;
  const blocks: string[] = [];
  if (ev.learned.length) blocks.push(`Aprendimos:\n- ${ev.learned.join("\n- ")}`);
  if (ev.discarded.length) blocks.push(`Descartamos:\n- ${ev.discarded.join("\n- ")}`);
  if (ev.riskDown.length) blocks.push(`Riesgo a la baja:\n- ${ev.riskDown.join("\n- ")}`);
  if (ev.riskUp.length) blocks.push(`Riesgo al alza:\n- ${ev.riskUp.join("\n- ")}`);
  return { title, body: blocks.join("\n\n") };
}
