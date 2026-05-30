// Generadores determinísticos para Testing Intelligence.
// No usa LLM en Fase 1. Output: Markdown + payload Cloud ALM.

import type {
  TestingScenario, TestStep, EvidenceItem, TestDefect,
  GeneratedUserManual, CloudAlmExportPayload,
} from "@/types/testing";
import {
  TESTING_TYPE_LABELS, TESTING_STATUS_LABELS, EVIDENCE_TYPE_LABELS,
} from "@/types/testing";

// ============================================================
// Helpers
// ============================================================

function fmt(d: string): string {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function bullet(items: (string | undefined)[]): string {
  return items.filter(Boolean).map((s) => `- ${s}`).join("\n");
}

// ============================================================
// Test Script Markdown
// ============================================================

export function generateTestScriptMarkdown(
  scenario: TestingScenario,
  evidences: EvidenceItem[] = [],
  defects: TestDefect[] = [],
): string {
  const lines: string[] = [];

  lines.push(`# Test Script · ${scenario.title}`);
  lines.push("");
  lines.push(`> Generado automáticamente por Testing Intelligence SAP el ${fmt(new Date().toISOString())}`);
  lines.push("");

  // 1. Información general
  lines.push("## 1. Información general");
  lines.push("");
  lines.push("| Campo | Valor |");
  lines.push("|---|---|");
  lines.push(`| Caso | ${scenario.title} |`);
  lines.push(`| ID | \`${scenario.id}\` |`);
  lines.push(`| Módulo SAP | **${scenario.sapModule}** |`);
  lines.push(`| Proceso | ${scenario.process}${scenario.subProcess ? ` · ${scenario.subProcess}` : ""} |`);
  lines.push(`| Scope Items | ${scenario.scopeItemIds.join(", ") || "—"} |`);
  lines.push(`| Tipo de prueba | ${TESTING_TYPE_LABELS[scenario.testType]} |`);
  lines.push(`| Ambiente | ${scenario.environment} |`);
  lines.push(`| Responsable | ${scenario.owner} |`);
  lines.push(`| Estado | ${TESTING_STATUS_LABELS[scenario.status]} |`);
  lines.push(`| Resultado | ${scenario.result ?? "PENDIENTE"} |`);
  lines.push("");

  // 2. Objetivo
  lines.push("## 2. Objetivo");
  lines.push("");
  lines.push(scenario.description || "_(sin descripción)_");
  lines.push("");

  // 3. Prerrequisitos
  lines.push("## 3. Prerrequisitos");
  lines.push("");
  lines.push(scenario.prerequisites || "_(ninguno definido)_");
  lines.push("");

  // 4. Datos de prueba
  lines.push("## 4. Datos de prueba");
  lines.push("");
  lines.push("```");
  lines.push(scenario.testData || "(sin datos de prueba definidos)");
  lines.push("```");
  lines.push("");

  // 5. Pasos
  lines.push("## 5. Pasos de ejecución");
  lines.push("");
  lines.push("| N° | Acción | Datos | Resultado esperado | Evidencia |");
  lines.push("|---:|---|---|---|---|");
  for (const s of scenario.steps.sort((a, b) => a.order - b.order)) {
    const ev = s.evidenceRequired ? "✓" : "—";
    lines.push(`| ${s.order} | ${escMd(s.action)} | ${escMd(s.data || "—")} | ${escMd(s.expectedResult)} | ${ev} |`);
  }
  lines.push("");

  // 6. Criterios de aceptación
  lines.push("## 6. Criterios de aceptación");
  lines.push("");
  lines.push(scenario.expectedResult || "_(sin definir)_");
  lines.push("");

  // 7. Resultado final
  lines.push("## 7. Resultado final");
  lines.push("");
  if (scenario.actualResult) {
    lines.push(`**Estado:** ${TESTING_STATUS_LABELS[scenario.status]} · ${scenario.result ?? "PENDIENTE"}`);
    lines.push("");
    lines.push(scenario.actualResult);
  } else {
    lines.push("_(pendiente de ejecución)_");
  }
  lines.push("");

  // 8. Evidencias
  lines.push("## 8. Evidencias asociadas");
  lines.push("");
  if (evidences.length === 0) {
    lines.push("_(sin evidencias cargadas)_");
  } else {
    for (const ev of evidences) {
      const meta = [
        EVIDENCE_TYPE_LABELS[ev.type],
        ev.fileName,
        ev.fileSize ? `${Math.round(ev.fileSize / 1024)} KB` : null,
        ev.durationSeconds ? `${ev.durationSeconds}s` : null,
      ].filter(Boolean).join(" · ");
      lines.push(`- **${ev.title}** — ${meta}${ev.noteText ? `\n  > ${ev.noteText.split("\n").join("\n  > ")}` : ""}`);
    }
  }
  lines.push("");

  // 9. Defectos
  lines.push("## 9. Defectos asociados");
  lines.push("");
  if (defects.length === 0) {
    lines.push("_(sin defectos)_");
  } else {
    lines.push("| ID | Título | Severidad | Estado | Asignado |");
    lines.push("|---|---|---|---|---|");
    for (const d of defects) {
      lines.push(`| \`${d.id}\` | ${escMd(d.title)} | ${d.severity} | ${d.status} | ${d.assignedTo || "—"} |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

function escMd(s: string): string {
  return (s || "").replace(/\|/g, "\\|").replace(/\n+/g, " · ");
}

// ============================================================
// Manual de usuario
// ============================================================

export function generateUserManualMarkdown(
  scenario: TestingScenario,
  manual: Partial<GeneratedUserManual> = {},
): string {
  const title = manual.title || `Manual de usuario · ${scenario.title}`;
  const objective = manual.objective || scenario.description || `Guiar al usuario en la ejecución del proceso ${scenario.process} (${scenario.sapModule}).`;
  const audience = manual.audience || "Usuarios finales de SAP del equipo funcional asignado.";
  const prereqs = manual.prerequisites || scenario.prerequisites || "Sin prerrequisitos definidos.";
  const expected = manual.expectedResult || scenario.expectedResult || "Resultado correcto del proceso.";
  const commonErrors = manual.commonErrors && manual.commonErrors.length > 0
    ? manual.commonErrors
    : ["Mensaje de error en pantalla — revisar autorizaciones del usuario.", "Datos no se guardan — verificar conexión con el servidor.", "Documento no se contabiliza — validar prerrequisitos."];
  const faqs = manual.faqs && manual.faqs.length > 0
    ? manual.faqs
    : [
      { q: "¿Qué hago si veo error rojo?", a: "Capturar pantalla y abrir un ticket en la Mesa AMS indicando paso, datos y t-code." },
      { q: "¿Puedo repetir el proceso?", a: "Sí, salvo que la operación sea irreversible (verificar antes de contabilizar)." },
      { q: "¿Cómo verifico que quedó correcto?", a: "Revisar el documento resultante en la transacción de consulta correspondiente." },
    ];
  const supportContact = manual.supportContact || "Mesa AMS · soporte.ams@demo.cl · interno 4000";

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`> Generado el ${fmt(new Date().toISOString())} desde el test script "${scenario.title}".`);
  lines.push("");

  lines.push("## Objetivo del proceso");
  lines.push("");
  lines.push(objective);
  lines.push("");

  lines.push("## Público objetivo");
  lines.push("");
  lines.push(audience);
  lines.push("");

  lines.push("## Prerrequisitos");
  lines.push("");
  lines.push(prereqs);
  lines.push("");

  lines.push("## Paso a paso");
  lines.push("");
  const steps = scenario.steps.sort((a, b) => a.order - b.order);
  for (const s of steps) {
    lines.push(`### Paso ${s.order} · ${s.action}`);
    if (s.data) lines.push(`**Datos:** \`${s.data}\``);
    lines.push("");
    lines.push(`**Resultado esperado:** ${s.expectedResult}`);
    lines.push("");
  }

  lines.push("## Resultado esperado del proceso");
  lines.push("");
  lines.push(expected);
  lines.push("");

  lines.push("## Errores comunes");
  lines.push("");
  lines.push(bullet(commonErrors));
  lines.push("");

  lines.push("## Preguntas frecuentes");
  lines.push("");
  for (const faq of faqs) {
    lines.push(`**P:** ${faq.q}`);
    lines.push(`**R:** ${faq.a}`);
    lines.push("");
  }

  lines.push("## Contacto de soporte");
  lines.push("");
  lines.push(supportContact);
  lines.push("");

  return lines.join("\n");
}

// ============================================================
// Cloud ALM payload
// ============================================================

export function buildCloudAlmPayload(
  scenario: TestingScenario,
  evidences: EvidenceItem[] = [],
  defects: TestDefect[] = [],
): CloudAlmExportPayload {
  return {
    testCaseName: scenario.title,
    description: scenario.description,
    scopeItemId: scenario.scopeItemIds[0] || "",
    scopeItems: [...scenario.scopeItemIds],
    process: scenario.process,
    testType: scenario.testType,
    environment: scenario.environment,
    prerequisites: scenario.prerequisites,
    testSteps: scenario.steps
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        order: s.order,
        action: s.action,
        data: s.data,
        expectedResult: s.expectedResult,
        actualResult: s.actualResult,
      })),
    expectedResults: scenario.expectedResult,
    evidenceReferences: evidences.map((e) => ({ id: e.id, type: e.type, title: e.title })),
    defects: defects.map((d) => ({ id: d.id, title: d.title, severity: d.severity, status: d.status })),
    status: scenario.status,
    owner: scenario.owner,
    exportedAt: new Date().toISOString(),
  };
}

// ============================================================
// Cobertura por Scope Item / módulo
// ============================================================

export function computeCoverageByScopeItem(scenarios: TestingScenario[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sc of scenarios) {
    for (const id of sc.scopeItemIds) {
      map[id] = (map[id] || 0) + 1;
    }
  }
  return map;
}

export function computeCoverageByModule(scenarios: TestingScenario[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sc of scenarios) {
    map[sc.sapModule] = (map[sc.sapModule] || 0) + 1;
  }
  return map;
}

export function computeCountByStatus(scenarios: TestingScenario[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sc of scenarios) {
    map[sc.status] = (map[sc.status] || 0) + 1;
  }
  return map;
}

export function computeCountByType(scenarios: TestingScenario[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sc of scenarios) {
    map[sc.testType] = (map[sc.testType] || 0) + 1;
  }
  return map;
}

// ============================================================
// File size helper
// ============================================================

export function humanFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
