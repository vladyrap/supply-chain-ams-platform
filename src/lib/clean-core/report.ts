// =============================================================================
// Clean Core — reportes (Markdown) + drafts de ticket de remediación
// =============================================================================

import type { CleanCoreFinding, CleanCoreResult, FindingSeverity } from "./types";
import type { AbapAnalysis } from "./abap-analyzer";
import { SEVERITY_LABELS, STATUS_LABELS } from "./engine";
import { CLEAN_CORE_DIMENSIONS } from "./dataset";
import type { CreateTicketInput } from "@/services/tickets.api";

function dimLabel(id: string): string {
  return CLEAN_CORE_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
}

const SEV_PRIORITY: Record<FindingSeverity, string> = {
  critical: "Highest", high: "High", medium: "Medium", low: "Low",
};
const SEV_COMPLEXITY: Record<FindingSeverity, CreateTicketInput["complexity"]> = {
  critical: "HIGH", high: "HIGH", medium: "MEDIUM", low: "LOW",
};
const DEV_DIMENSIONS = new Set(["custom_code", "extensibility", "integration"]);

// ── Extracción del código refactorizado (versión HANA) ──────────────────────
// La respuesta de ROCCO viene en Markdown con el código en un bloque ```abap.
// Devolvemos ese bloque (preferentemente el etiquetado abap; si no, el más
// largo). Si no hay bloques, devolvemos el texto completo como fallback.

export function extractAbapCode(markdown: string): string {
  const blocks = [...markdown.matchAll(/```([a-zA-Z0-9_]*)\r?\n?([\s\S]*?)```/g)];
  if (blocks.length === 0) return markdown.trim();
  const abap = blocks.find((b) => /abap/i.test(b[1]));
  const chosen = abap ?? [...blocks].sort((a, b) => b[2].length - a[2].length)[0];
  return chosen[2].replace(/^\r?\n/, "").replace(/\s+$/, "");
}

// ── Descarga de archivo en el browser ────────────────────────────────────────

export function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8;") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Reporte Markdown del assessment ──────────────────────────────────────────

export function cleanCoreReportMarkdown(result: CleanCoreResult, findings: CleanCoreFinding[]): string {
  const L: string[] = [];
  L.push(`# Clean Core Governance — Assessment`);
  L.push("");
  L.push(`- **Índice Clean Core:** ${result.index}/100 (${result.band.label})`);
  L.push(`- **Potencial si se remedia todo lo abierto:** ${result.projectedIndex}/100`);
  L.push(`- **Hallazgos abiertos:** ${result.totals.open} (críticos: ${result.totals.critical}, altos: ${result.totals.high})`);
  L.push(`- **Esfuerzo de remediación pendiente:** ${result.totals.effortHours} h (≈ ${Math.ceil(result.totals.effortHours / 8)} días-persona)`);
  L.push(`- **Objetos cloud-ready:** ${Math.round(result.totals.cloudReadyRatio * 100)}%`);
  L.push("");
  L.push(`## Dimensiones`);
  for (const d of result.dimensions) {
    L.push(`- **${d.def.label}** — ${d.score}/100 · ${d.openCount} abierto(s)${d.criticalOpen ? ` · ${d.criticalOpen} crítico(s)` : ""}`);
  }
  L.push("");
  L.push(`## Hallazgos`);
  for (const f of findings) {
    L.push("");
    L.push(`### [${SEVERITY_LABELS[f.severity]}] ${f.title}`);
    L.push(`- Dimensión: ${dimLabel(f.dimension)} · Módulo: ${f.sapModule} · Estado: ${STATUS_LABELS[f.status]}`);
    L.push(`- Objeto: \`${f.object}\` (${f.objectType})${f.cloudReady ? "" : " · ⚠ no cloud-ready"}`);
    L.push(`- Problema: ${f.problem}`);
    L.push(`- Remediación: ${f.recommendation}`);
    L.push(`- Esfuerzo estimado: ${f.effortHours} h${f.reference ? ` · Ref: ${f.reference}` : ""}`);
  }
  return L.join("\n");
}

// ── Ticket de remediación desde un hallazgo del assessment ───────────────────

export function findingToTicketInput(f: CleanCoreFinding): CreateTicketInput {
  const desc = [
    `**Hallazgo Clean Core (${dimLabel(f.dimension)})**`,
    "",
    `**Objeto:** \`${f.object}\` — ${f.objectType}`,
    `**Módulo SAP:** ${f.sapModule}`,
    `**Severidad:** ${SEVERITY_LABELS[f.severity]}${f.cloudReady ? "" : " · no cloud-ready"}`,
    "",
    `**Problema**`,
    f.problem,
    "",
    `**Remediación recomendada**`,
    f.recommendation,
    f.reference ? `\n**Referencia:** ${f.reference}` : "",
    "",
    `**Criterios de aceptación**`,
    `- El objeto queda alineado a Clean Core (extensión/ API released).`,
    `- ATC (variante cloud readiness) sin findings prioridad 1-2 sobre el objeto.`,
    `- Regresión funcional del proceso ${f.sapModule} firmada.`,
    "",
    `**Esfuerzo estimado:** ${f.effortHours} h`,
    `_Generado desde Clean Core Governance._`,
  ].join("\n");

  return {
    title: `[Clean Core] ${f.title}`,
    description: desc,
    priority: SEV_PRIORITY[f.severity],
    sapModule: f.sapModule,
    complexity: SEV_COMPLEXITY[f.severity],
    requiresDevelopment: DEV_DIMENSIONS.has(f.dimension),
    requiresIntegration: f.dimension === "integration",
    requiresTransport: f.dimension !== "process" && f.dimension !== "data",
    requiresUAT: f.severity === "critical" || f.severity === "high",
  };
}

// ── Reporte Markdown del análisis ABAP ───────────────────────────────────────

export function abapReportMarkdown(a: AbapAnalysis): string {
  const L: string[] = [];
  L.push(`# Refactor Z → Clean Core (HANA) — Análisis`);
  L.push("");
  L.push(`- **Readiness HANA/Clean Core:** ${a.score}/100 (${a.band.label})`);
  L.push(`- **ABAP Cloud:** ${a.cloudReady ? "sin bloqueos" : "con bloqueos"}`);
  L.push(`- **Hallazgos:** ${a.findings.length} (críticos: ${a.counts.critical}, altos: ${a.counts.high}) · ${a.loc} LOC`);
  L.push("");
  L.push(`## Plan de remediación`);
  for (const s of a.summary) L.push(`- ${s}`);
  L.push("");
  L.push(`## Hallazgos`);
  for (const f of a.findings) {
    L.push("");
    L.push(`### [${SEVERITY_LABELS[f.severity]}] ${f.title} (línea ${f.line})`);
    L.push(`- Categoría: ${f.category}`);
    L.push(`- Código: \`${f.snippet}\``);
    L.push(`- Problema: ${f.problem}`);
    L.push(`- Remediación: ${f.recommendation}`);
    if (f.before) L.push(`- Antes:\n\`\`\`abap\n${f.before}\n\`\`\``);
    if (f.after) L.push(`- Después:\n\`\`\`abap\n${f.after}\n\`\`\``);
    if (f.reference) L.push(`- Ref: ${f.reference}`);
  }
  return L.join("\n");
}

export function abapFindingsCsv(a: AbapAnalysis): string {
  const header = ["line", "severity", "category", "title", "snippet", "recommendation", "reference"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = a.findings.map((f) =>
    [f.line, f.severity, f.category, f.title, f.snippet, f.recommendation, f.reference ?? ""].map(esc).join(","));
  return [header.join(","), ...rows].join("\n");
}

// ── Ticket de remediación desde el análisis ABAP completo ────────────────────

export function abapAnalysisToTicketInput(a: AbapAnalysis, objectName?: string): CreateTicketInput {
  const worst: FindingSeverity =
    a.counts.critical ? "critical" : a.counts.high ? "high" : a.counts.medium ? "medium" : "low";
  const name = objectName?.trim() || "objeto ABAP Z";
  const desc = [
    `**Remediación Clean Core / HANA de ${name}**`,
    "",
    `Readiness actual: ${a.score}/100 (${a.band.label}) · ABAP Cloud: ${a.cloudReady ? "sin bloqueos" : "con bloqueos"}`,
    `Hallazgos: ${a.findings.length} (críticos: ${a.counts.critical}, altos: ${a.counts.high})`,
    "",
    `**Plan de remediación**`,
    ...a.summary.map((s) => `- ${s}`),
    "",
    `**Criterios de aceptación**`,
    `- El objeto consume sólo CDS/APIs released y no escribe directo en tablas estándar.`,
    `- Sin sintaxis obsoleta (ABAP Cloud-ready cuando aplique).`,
    `- ATC (variante cloud readiness) sin findings prioridad 1-2.`,
    `- Regresión funcional firmada.`,
    "",
    `_Generado desde Clean Core → Refactor Z (HANA)._`,
  ].join("\n");

  return {
    title: `[Clean Core] Remediar ${name} (${a.findings.length} hallazgos)`,
    description: desc,
    priority: SEV_PRIORITY[worst],
    sapModule: "ABAP",
    complexity: SEV_COMPLEXITY[worst],
    requiresDevelopment: true,
    requiresTransport: true,
    requiresUAT: worst === "critical" || worst === "high",
  };
}
