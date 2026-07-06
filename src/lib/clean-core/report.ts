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

// Detecta si una línea es un encabezado (## Título, **Título** o Título:) y
// devuelve su texto normalizado. Robusto a los formatos que usan los LLMs.
function headingOf(line: string): string | null {
  const t = line.trim();
  if (/^#{1,6}\s/.test(t)) return t.replace(/^#{1,6}\s+/, "").replace(/\*\*/g, "").replace(/:\s*$/, "").trim();
  const bold = t.match(/^\*\*(.+?)\*\*\s*:?\s*$/);
  if (bold) return bold[1].replace(/:\s*$/, "").trim();
  return null;
}

// Extrae una sección Markdown por su encabezado (hasta el próximo encabezado).
export function extractSection(markdown: string, headingRegex: RegExp): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let capturing = false;
  for (const ln of lines) {
    const h = headingOf(ln);
    if (h !== null) {
      if (capturing) break;
      if (headingRegex.test(h)) { capturing = true; continue; }
    } else if (capturing) {
      out.push(ln);
    }
  }
  return out.join("\n").trim();
}

// Construye el .abap exportado: cabecera con las notas de migración como
// comentario ABAP (* …) + el código refactorizado (Clean Core / HANA).
export function buildHanaExport(markdown: string): string {
  const code = extractAbapCode(markdown);
  const notes = extractSection(markdown, /notas de migraci/i);
  if (!notes) return code;
  const noteLines = notes.split(/\r?\n/)
    .map((l) => l.replace(/^[-*]\s*/, "").replace(/\*\*/g, "").trim())
    .filter((l) => l.length > 0)
    .map((l) => "*   " + l);
  const header = [
    "*" + "-".repeat(72),
    "* Refactor Clean Core / HANA — generado por ROCCO (Clean Core Governance)",
    "* Revisar y validar con ATC (variante cloud readiness) antes de transportar.",
    "*",
    "* Notas de migración:",
    ...noteLines,
    "*" + "-".repeat(72),
    "",
  ].join("\n");
  return header + code;
}

// ── Diff de líneas (LCS) → filas alineadas para vista lado-a-lado ─────────────
export type DiffRow = { left: string | null; right: string | null; type: "same" | "add" | "del" };

export function lineDiff(aText: string, bText: string): DiffRow[] {
  const a = aText.replace(/\s+$/, "").split(/\r?\n/);
  const b = bText.replace(/\s+$/, "").split(/\r?\n/);
  const n = a.length, m = b.length;
  const rows: DiffRow[] = [];
  // Guardia de tamaño: LCS es O(n*m). Para archivos enormes, alineación simple.
  if (n * m > 4_000_000) {
    const max = Math.max(n, m);
    for (let k = 0; k < max; k++) {
      const l = k < n ? a[k] : null;
      const r = k < m ? b[k] : null;
      rows.push({ left: l, right: r, type: l === r ? "same" : (l === null ? "add" : r === null ? "del" : "same") });
    }
    return rows;
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { rows.push({ left: a[i], right: b[j], type: "same" }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ left: a[i], right: null, type: "del" }); i++; }
    else { rows.push({ left: null, right: b[j], type: "add" }); j++; }
  }
  while (i < n) rows.push({ left: a[i++], right: null, type: "del" });
  while (j < m) rows.push({ left: null, right: b[j++], type: "add" });
  return rows;
}

// ── Diff GRANULAR: a nivel de carácter dentro de cada línea modificada ────────
// El detalle más fino posible: qué caracteres exactos (incluidos espacios)
// cambiaron. Dos etapas: (1) alineación de líneas por LCS; (2) para cada par de
// líneas modificadas, LCS a nivel de carácter → segmentos same/add/del.

export type InlineSeg = { text: string; type: "same" | "add" | "del" };
export type GranularRow = {
  type: "same" | "add" | "del" | "mod";
  left: string | null;
  right: string | null;
  leftSegs: InlineSeg[] | null;   // sólo en type === "mod"
  rightSegs: InlineSeg[] | null;
  changedChars: number;           // cuántos chars difieren (add+del) en la fila
};

function pushSeg(list: InlineSeg[], type: InlineSeg["type"], ch: string) {
  const last = list[list.length - 1];
  if (last && last.type === type) last.text += ch;
  else list.push({ text: ch, type });
}

// LCS a nivel de carácter → segmentos para la izquierda (same+del) y la
// derecha (same+add).
export function charDiff(a: string, b: string): { left: InlineSeg[]; right: InlineSeg[]; changed: number } {
  const n = a.length, m = b.length;
  if (n === 0 && m === 0) return { left: [], right: [], changed: 0 };
  // Guardia: líneas enormes → tratar toda la línea como del/add (sin O(n*m)).
  if (n * m > 400_000) {
    return { left: a ? [{ text: a, type: "del" }] : [], right: b ? [{ text: b, type: "add" }] : [], changed: n + m };
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const left: InlineSeg[] = [];
  const right: InlineSeg[] = [];
  let i = 0, j = 0, changed = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pushSeg(left, "same", a[i]); pushSeg(right, "same", b[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { pushSeg(left, "del", a[i]); i++; changed++; }
    else { pushSeg(right, "add", b[j]); j++; changed++; }
  }
  while (i < n) { pushSeg(left, "del", a[i++]); changed++; }
  while (j < m) { pushSeg(right, "add", b[j++]); changed++; }
  return { left, right, changed };
}

export function lineDiffGranular(aText: string, bText: string): GranularRow[] {
  const base = lineDiff(aText, bText);
  const out: GranularRow[] = [];
  let k = 0;
  while (k < base.length) {
    if (base[k].type === "same") {
      out.push({ type: "same", left: base[k].left, right: base[k].right, leftSegs: null, rightSegs: null, changedChars: 0 });
      k++;
      continue;
    }
    // Región de cambio: filas contiguas no-"same". Se separan en lados y se
    // emparejan por índice; los sobrantes quedan como del/add puros.
    const lefts: string[] = [];
    const rights: string[] = [];
    let p = k;
    while (p < base.length && base[p].type !== "same") {
      if (base[p].left !== null) lefts.push(base[p].left as string);
      if (base[p].right !== null) rights.push(base[p].right as string);
      p++;
    }
    const pairs = Math.min(lefts.length, rights.length);
    for (let x = 0; x < pairs; x++) {
      const cd = charDiff(lefts[x], rights[x]);
      out.push({ type: "mod", left: lefts[x], right: rights[x], leftSegs: cd.left, rightSegs: cd.right, changedChars: cd.changed });
    }
    for (let x = pairs; x < lefts.length; x++) out.push({ type: "del", left: lefts[x], right: null, leftSegs: null, rightSegs: null, changedChars: lefts[x].length });
    for (let x = pairs; x < rights.length; x++) out.push({ type: "add", left: null, right: rights[x], leftSegs: null, rightSegs: null, changedChars: rights[x].length });
    k = p;
  }
  return out;
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
