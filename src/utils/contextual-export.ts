// =============================================================================
// Contextual Estimation Export
// =============================================================================
// Helpers para exportar un ContextualEstimationResult a markdown y JSON.
// Útil para mandar al cliente, archivar en docs/, o pegar en una propuesta.
// =============================================================================

import type { ContextualEstimationResult } from "@/types/estimation";

/** Renderiza el resultado completo a Markdown. */
export function exportContextualMarkdown(r: ContextualEstimationResult): string {
  const lines: string[] = [];
  const ctx = r.detectedContext;

  lines.push(`# Estimación AMS Contextual · ${r.inputSummary.title || "Caso"}`);
  lines.push("");
  lines.push(`> Generado: ${r.createdAt} · Engine v${r.engineVersion} · Confianza ${r.confidence} (${r.confidenceScore}/100)`);
  lines.push("");

  // ETA principal
  lines.push("## ETA");
  lines.push("");
  lines.push(`- **Banda**: ${r.totalRange.minHours}h – ${r.totalRange.maxHours}h`);
  lines.push(`- **Esperado**: ${r.totalRange.expectedHours}h (${r.totalRange.expectedBusinessDays} días hábiles)`);
  lines.push(`- **Rango días**: ${r.totalRange.minBusinessDays} – ${r.totalRange.maxBusinessDays} días hábiles`);
  if (r.calibrationMode) {
    lines.push(`- **Modo motor**: ${r.calibrationMode}`);
  }
  lines.push("");

  // Contexto detectado
  lines.push("## Contexto detectado");
  lines.push("");
  lines.push(`- **Módulo**: ${ctx.module} · **Proceso**: ${ctx.process}${ctx.subProcess ? ` · **Sub-proceso**: ${ctx.subProcess}` : ""}`);
  lines.push(`- **Tipo de problema**: ${ctx.issueType.replace(/_/g, " ")}`);
  lines.push(`- **Severidad**: ${ctx.severity} · **Ambiente**: ${ctx.environment}${ctx.isProductive ? " (productivo)" : ""}`);
  if (ctx.transactions.length) lines.push(`- **Transacciones**: ${ctx.transactions.join(", ")}`);
  if (ctx.errorCodes.length) lines.push(`- **Códigos de error**: ${ctx.errorCodes.join(", ")}`);
  const objs = Object.entries(ctx.sapObjects).filter(([, v]) => !!v);
  if (objs.length) lines.push(`- **Objetos SAP**: ${objs.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  lines.push(`- **Calidad de la información**: ${ctx.textQualityScore}/100`);
  lines.push("");

  // Escenarios
  lines.push("## Escenarios probabilísticos");
  lines.push("");
  for (const [label, sc] of [
    ["Optimista", r.optimisticScenario] as const,
    ["Esperado", r.expectedScenario] as const,
    ["Pesimista", r.pessimisticScenario] as const,
  ]) {
    lines.push(`### ${label} · ${sc.hours}h (${sc.businessDays}d)`);
    lines.push(sc.explanation);
    if (sc.assumptions.length) {
      lines.push("");
      lines.push("**Supuestos:**");
      for (const a of sc.assumptions) lines.push(`- ${a}`);
    }
    lines.push("");
  }

  // Factores contextuales
  if (r.contextualAdjustments.length > 0) {
    lines.push("## Factores que afectaron la estimación");
    lines.push("");
    lines.push("| Factor | Impacto | Categoría | Razón |");
    lines.push("|---|---|---|---|");
    for (const a of r.contextualAdjustments) {
      const arrow = a.direction === "increase" ? "↑" : a.direction === "decrease" ? "↓" : "→";
      lines.push(`| ${a.factor} | ${arrow} ×${a.impact.toFixed(2)} | ${a.category} | ${a.reason} |`);
    }
    lines.push("");
  }

  // Casos históricos
  if (r.similarCases.length > 0) {
    lines.push("## Casos históricos similares");
    lines.push("");
    for (const sc of r.similarCases) {
      lines.push(`### ${sc.title} (${(sc.similarityScore * 100).toFixed(0)}% similar)`);
      lines.push(`- **Resolución actual**: ${sc.actualResolutionHours}h`);
      lines.push(`- **Complejidad**: ${sc.complexity}`);
      lines.push(`- **Causa raíz**: ${sc.rootCause}`);
      lines.push(`- **Solución**: ${sc.solutionSummary}`);
      lines.push(`- **Señales coincidentes**: ${sc.matchedSignals.join(" · ")}`);
      lines.push("");
    }
  }

  // Playbook
  if (r.playbookMatch) {
    lines.push("## Playbook aplicable");
    lines.push("");
    lines.push(`- **${r.playbookMatch.playbookTitle}**`);
    lines.push(`- ${r.playbookMatch.steps} pasos · ~${r.playbookMatch.estimatedMinutes}min`);
    lines.push(`- Match score: ${(r.playbookMatch.matchScore * 100).toFixed(0)}%`);
    lines.push("");
  }

  // Fases
  lines.push("## Fases de ejecución");
  lines.push("");
  lines.push("| # | Fase | Min | Esperado | Max | Owner | Razón |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const p of r.phaseBreakdown) {
    lines.push(`| ${p.order} | ${p.name}${!p.required ? " *(opcional)*" : ""} | ${p.minHours}h | ${p.expectedHours}h | ${p.maxHours}h | ${p.ownerProfile} | ${p.reason} |`);
  }
  lines.push("");

  // Supuestos + riesgos
  if (r.assumptions.length > 0) {
    lines.push("## Supuestos");
    for (const a of r.assumptions) lines.push(`- ${a}`);
    lines.push("");
  }
  if (r.risks.length > 0) {
    lines.push("## Riesgos");
    for (const ri of r.risks) lines.push(`- ${ri}`);
    lines.push("");
  }

  // Missing data
  if (r.missingData.length > 0) {
    lines.push("## Información requerida para precisar la estimación");
    for (const m of r.missingData) lines.push(`- ${m}`);
    lines.push("");
  }

  // Recomendaciones
  if (r.recommendations.length > 0) {
    lines.push("## Recomendaciones");
    for (const re of r.recommendations) {
      lines.push(`- **${re.title}** *(impacto ${re.expectedImpact}/5)* — ${re.description}`);
    }
    lines.push("");
  }

  // Respuesta cliente
  lines.push("---");
  lines.push("");
  lines.push("## Respuesta sugerida al cliente");
  lines.push("");
  lines.push(r.clientResponseDraft);
  lines.push("");

  // Debug
  lines.push("---");
  lines.push("");
  lines.push(`<details><summary>Notas internas (debug)</summary>`);
  lines.push("");
  lines.push("```");
  lines.push(r.internalNotes);
  lines.push("```");
  lines.push("");
  lines.push("</details>");

  return lines.join("\n");
}

/** Descarga el markdown como archivo .md en el browser. */
export function downloadContextualMarkdown(r: ContextualEstimationResult, filename?: string): void {
  const md = exportContextualMarkdown(r);
  const safeName = (r.inputSummary.title || "estimacion")
    .replace(/[^a-zA-Z0-9_\-]+/g, "_")
    .slice(0, 60);
  const finalName = filename || `estimacion-contextual-${safeName}.md`;
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Descarga el resultado completo como JSON. */
export function downloadContextualJson(r: ContextualEstimationResult, filename?: string): void {
  const safeName = (r.inputSummary.title || "estimacion")
    .replace(/[^a-zA-Z0-9_\-]+/g, "_")
    .slice(0, 60);
  const finalName = filename || `estimacion-contextual-${safeName}.json`;
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Genera la respuesta cliente extendida (para botón "Generar respuesta cliente"). */
export function buildEnrichedClientResponse(r: ContextualEstimationResult): string {
  const ctx = r.detectedContext;
  const lines: string[] = [];
  lines.push(`Estimado/a,`);
  lines.push(``);
  lines.push(`Tras analizar "${r.inputSummary.title || "el caso reportado"}" identificamos lo siguiente:`);
  lines.push(``);
  lines.push(`**📋 Diagnóstico inicial**`);
  lines.push(`- Módulo SAP afectado: ${ctx.module}${ctx.subProcess ? ` (${ctx.subProcess})` : ""}`);
  lines.push(`- Tipo de problema: ${ctx.issueType.replace(/_/g, " ")}`);
  if (ctx.transactions.length) lines.push(`- Transacciones involucradas: ${ctx.transactions.join(", ")}`);
  if (ctx.errorCodes.length) lines.push(`- Códigos de error detectados: ${ctx.errorCodes.join(", ")}`);
  lines.push(``);
  lines.push(`**⏱ Estimación de resolución**`);
  lines.push(`- Esperado: **${r.totalRange.expectedHours}h** (~${r.totalRange.expectedBusinessDays} días hábiles)`);
  lines.push(`- Banda probable: ${r.totalRange.minHours}h – ${r.totalRange.maxHours}h`);
  lines.push(`- Confianza: ${r.confidence.toLowerCase()}`);
  if (r.similarCases.length > 0) {
    const median = r.similarCases.reduce((s, c) => s + c.actualResolutionHours, 0) / r.similarCases.length;
    lines.push(`- Referencia histórica: ${r.similarCases.length} casos similares resueltos (mediana ${median.toFixed(1)}h)`);
  }
  lines.push(``);
  if (r.missingData.length > 0) {
    lines.push(`**🔍 Para precisar la estimación necesitaríamos:**`);
    for (const m of r.missingData.slice(0, 5)) lines.push(`- ${m}`);
    lines.push(``);
  }
  if (r.playbookMatch) {
    lines.push(`**✅ Procedimiento aplicable**`);
    lines.push(`Aplicaremos el playbook "${r.playbookMatch.playbookTitle}" (${r.playbookMatch.steps} pasos estándar).`);
    lines.push(``);
  }
  lines.push(`Quedamos atentos a tu confirmación para iniciar.`);
  lines.push(``);
  lines.push(`Saludos,`);
  lines.push(`Equipo AMS`);
  return lines.join("\n");
}
