// Plantillas internas para los 14 tipos de documentos del Document Factory.
//
// Cada plantilla expone:
//   - fields: campos del formulario que el usuario completa
//   - generate(data): devuelve el Markdown final

import type { DocumentType } from "@/types/ams-modules";

export interface TemplateField {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "date" | "list";
  required?: boolean;
  rows?: number;
  defaultValue?: string;
}

export interface DocumentTemplate {
  type: DocumentType;
  description: string;
  fields: TemplateField[];
  generate: (data: Record<string, string>) => string;
}

function bulletList(raw: string): string {
  return (raw || "").split("\n").filter(Boolean).map((l) => `- ${l.trim()}`).join("\n");
}
function numbered(raw: string): string {
  return (raw || "").split("\n").filter(Boolean).map((l, i) => `${i + 1}. ${l.trim()}`).join("\n");
}
function today(): string { return new Date().toISOString().slice(0, 10); }

export const TEMPLATES: Record<DocumentType, DocumentTemplate> = {
  RCA: {
    type: "RCA",
    description: "Root Cause Analysis — análisis estructurado de causa raíz.",
    fields: [
      { id: "incidentCode", label: "Código del incidente", type: "text", required: true, placeholder: "MESA-1024" },
      { id: "executiveSummary", label: "Resumen ejecutivo (2 líneas)", type: "textarea", rows: 2, required: true },
      { id: "impact", label: "Impacto al negocio", type: "textarea", rows: 2, required: true,
        placeholder: "Áreas, # usuarios, # transacciones, $ estimado" },
      { id: "timeline", label: "Línea de tiempo (una hora por línea)", type: "textarea", rows: 5, required: true },
      { id: "rootCause", label: "Causa raíz (5 porqués)", type: "textarea", rows: 5, required: true },
      { id: "corrective", label: "Acciones correctivas inmediatas", type: "textarea", rows: 3, required: true },
      { id: "preventive", label: "Acciones preventivas", type: "textarea", rows: 3, required: true },
      { id: "responsible", label: "Responsable / firma", type: "text", required: true },
      { id: "nextSteps", label: "Próximos pasos / commitments", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# RCA · ${d.incidentCode}

## 1. Resumen ejecutivo
${d.executiveSummary}

## 2. Impacto al negocio
${d.impact}

## 3. Línea de tiempo
${numbered(d.timeline)}

## 4. Causa raíz (5 porqués)
${d.rootCause}

## 5. Acciones correctivas inmediatas
${bulletList(d.corrective)}

## 6. Acciones preventivas
${bulletList(d.preventive)}

## 7. Próximos pasos
${bulletList(d.nextSteps || "")}

---
**Responsable:** ${d.responsible}
**Fecha:** ${today()}
`,
  },

  MEETING_MINUTES: {
    type: "MEETING_MINUTES",
    description: "Minuta de reunión AMS — registro estructurado.",
    fields: [
      { id: "title", label: "Título de la reunión", type: "text", required: true },
      { id: "date", label: "Fecha", type: "date", required: true, defaultValue: today() },
      { id: "participants", label: "Participantes (uno por línea)", type: "textarea", rows: 4, required: true },
      { id: "topics", label: "Temas tratados", type: "textarea", rows: 5, required: true },
      { id: "agreements", label: "Acuerdos", type: "textarea", rows: 4, required: true },
      { id: "pending", label: "Pendientes (uno por línea, formato: Acción — Responsable — Fecha)", type: "textarea", rows: 4 },
      { id: "risks", label: "Riesgos identificados", type: "textarea", rows: 3 },
      { id: "nextMeeting", label: "Próxima reunión", type: "text" },
    ],
    generate: (d) => `# Minuta · ${d.title}

**Fecha:** ${d.date}

## Participantes
${bulletList(d.participants)}

## Temas tratados
${numbered(d.topics)}

## Acuerdos
${bulletList(d.agreements)}

## Pendientes
${bulletList(d.pending || "")}

## Riesgos
${bulletList(d.risks || "")}

## Próxima reunión
${d.nextMeeting || "(por agendar)"}
`,
  },

  CLIENT_RESPONSE: {
    type: "CLIENT_RESPONSE",
    description: "Respuesta formal al cliente — profesional, clara.",
    fields: [
      { id: "clientName", label: "Nombre del cliente", type: "text", required: true },
      { id: "caseTitle", label: "Tema / caso", type: "text", required: true },
      { id: "summary", label: "Resumen del caso", type: "textarea", rows: 3, required: true },
      { id: "diagnostic", label: "Diagnóstico inicial", type: "textarea", rows: 4, required: true },
      { id: "neededData", label: "Datos que necesitamos del cliente", type: "textarea", rows: 3 },
      { id: "nextSteps", label: "Próximos pasos", type: "textarea", rows: 3, required: true },
      { id: "responsible", label: "Tu nombre", type: "text", required: true },
    ],
    generate: (d) => `Estimado/a ${d.clientName},

Le escribimos en relación a su caso **${d.caseTitle}**.

**Resumen:**
${d.summary}

**Diagnóstico inicial:**
${d.diagnostic}

${d.neededData ? `**Datos que necesitamos:**\n${bulletList(d.neededData)}\n` : ""}
**Próximos pasos:**
${bulletList(d.nextSteps)}

Quedamos atentos a su confirmación.

Saludos cordiales,
${d.responsible}
Equipo AMS Supply Chain
`,
  },

  FUNCTIONAL_SPEC: {
    type: "FUNCTIONAL_SPEC",
    description: "Especificación funcional — documento técnico AMS.",
    fields: [
      { id: "title", label: "Título", type: "text", required: true },
      { id: "objective", label: "Objetivo", type: "textarea", rows: 2, required: true },
      { id: "scope", label: "Alcance", type: "textarea", rows: 3, required: true },
      { id: "currentProcess", label: "Proceso actual", type: "textarea", rows: 4 },
      { id: "proposedProcess", label: "Proceso propuesto", type: "textarea", rows: 5, required: true },
      { id: "businessRules", label: "Reglas de negocio", type: "textarea", rows: 4, required: true },
      { id: "fields", label: "Campos relevantes", type: "textarea", rows: 3 },
      { id: "validations", label: "Validaciones", type: "textarea", rows: 3 },
      { id: "testCases", label: "Casos de prueba sugeridos", type: "textarea", rows: 3 },
      { id: "risks", label: "Riesgos", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# Especificación funcional · ${d.title}

## Objetivo
${d.objective}

## Alcance
${d.scope}

## Proceso actual
${d.currentProcess || "(N/A)"}

## Proceso propuesto
${d.proposedProcess}

## Reglas de negocio
${bulletList(d.businessRules)}

## Campos
${bulletList(d.fields || "")}

## Validaciones
${bulletList(d.validations || "")}

## Casos de prueba
${bulletList(d.testCases || "")}

## Riesgos
${bulletList(d.risks || "")}
`,
  },

  TECHNICAL_SPEC: {
    type: "TECHNICAL_SPEC",
    description: "Especificación técnica para desarrollo ABAP/integración.",
    fields: [
      { id: "title", label: "Título", type: "text", required: true },
      { id: "system", label: "Sistema / módulo", type: "text", required: true, placeholder: "S/4 + BTP" },
      { id: "architecture", label: "Arquitectura propuesta", type: "textarea", rows: 4, required: true },
      { id: "tablesObjects", label: "Tablas / objetos involucrados", type: "textarea", rows: 3 },
      { id: "logic", label: "Lógica principal (pseudocódigo)", type: "textarea", rows: 6, required: true },
      { id: "authorizations", label: "Autorizaciones requeridas", type: "textarea", rows: 2 },
      { id: "deployment", label: "Plan de despliegue", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# Especificación técnica · ${d.title}

**Sistema:** ${d.system}

## Arquitectura
${d.architecture}

## Tablas / objetos
${bulletList(d.tablesObjects || "")}

## Lógica principal
\`\`\`
${d.logic}
\`\`\`

## Autorizaciones
${bulletList(d.authorizations || "")}

## Despliegue
${d.deployment || "(definir con líder técnico)"}
`,
  },

  TEST_CASE: {
    type: "TEST_CASE",
    description: "Caso de prueba — formato estándar AMS.",
    fields: [
      { id: "title", label: "Título", type: "text", required: true },
      { id: "objective", label: "Objetivo", type: "textarea", rows: 2, required: true },
      { id: "prerequisites", label: "Prerrequisitos", type: "textarea", rows: 3, required: true },
      { id: "testData", label: "Datos de prueba", type: "textarea", rows: 3, required: true },
      { id: "steps", label: "Pasos (uno por línea)", type: "textarea", rows: 6, required: true },
      { id: "expected", label: "Resultado esperado", type: "textarea", rows: 3, required: true },
      { id: "evidence", label: "Evidencia requerida", type: "text" },
    ],
    generate: (d) => `# Caso de prueba · ${d.title}

## Objetivo
${d.objective}

## Prerrequisitos
${bulletList(d.prerequisites)}

## Datos de prueba
${bulletList(d.testData)}

## Pasos
${numbered(d.steps)}

## Resultado esperado
${d.expected}

## Evidencia
${d.evidence || "Captura de pantalla + log de la transacción"}
`,
  },

  USER_MANUAL: {
    type: "USER_MANUAL",
    description: "Manual breve para el usuario final.",
    fields: [
      { id: "title", label: "Título", type: "text", required: true },
      { id: "audience", label: "Audiencia", type: "text", required: true },
      { id: "purpose", label: "Para qué sirve", type: "textarea", rows: 3, required: true },
      { id: "howTo", label: "Cómo usarla (pasos)", type: "textarea", rows: 8, required: true },
      { id: "tips", label: "Tips y mejores prácticas", type: "textarea", rows: 3 },
      { id: "support", label: "A quién contactar para soporte", type: "text" },
    ],
    generate: (d) => `# ${d.title}

**Audiencia:** ${d.audience}

## Para qué sirve
${d.purpose}

## Cómo usarla
${numbered(d.howTo)}

## Tips
${bulletList(d.tips || "")}

## Soporte
${d.support || "Mesa AMS"}
`,
  },

  CUTOVER_PLAN: {
    type: "CUTOVER_PLAN",
    description: "Plan de cutover — go-live coordinado.",
    fields: [
      { id: "project", label: "Proyecto", type: "text", required: true },
      { id: "goLiveDate", label: "Fecha de go-live", type: "date", required: true },
      { id: "preGoLive", label: "Tareas pre go-live", type: "textarea", rows: 6, required: true },
      { id: "goLiveDay", label: "Día del go-live (D)", type: "textarea", rows: 6, required: true },
      { id: "postGoLive", label: "Tareas post go-live", type: "textarea", rows: 5, required: true },
      { id: "rollback", label: "Plan de rollback", type: "textarea", rows: 3, required: true },
      { id: "stakeholders", label: "Stakeholders involucrados", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# Plan de Cutover · ${d.project}

**Go-live:** ${d.goLiveDate}

## Pre go-live (D-7 a D-1)
${numbered(d.preGoLive)}

## Día del go-live (D)
${numbered(d.goLiveDay)}

## Post go-live (D+1 a D+30)
${numbered(d.postGoLive)}

## Rollback
${d.rollback}

## Stakeholders
${bulletList(d.stakeholders || "")}
`,
  },

  HYPERCARE_PLAN: {
    type: "HYPERCARE_PLAN",
    description: "Plan de hypercare post go-live.",
    fields: [
      { id: "project", label: "Proyecto", type: "text", required: true },
      { id: "duration", label: "Duración (semanas)", type: "text", defaultValue: "4" },
      { id: "team", label: "Equipo hypercare", type: "textarea", rows: 3, required: true },
      { id: "sla", label: "SLA reducido", type: "text", placeholder: "P1: 1h, P2: 2h…" },
      { id: "ceremonies", label: "Ceremonias (daily, weekly)", type: "textarea", rows: 3, required: true },
      { id: "exitCriteria", label: "Criterios de salida", type: "textarea", rows: 4, required: true },
    ],
    generate: (d) => `# Plan de Hypercare · ${d.project}

**Duración:** ${d.duration} semanas

## Equipo dedicado
${bulletList(d.team)}

## SLA
${d.sla}

## Ceremonias
${bulletList(d.ceremonies)}

## Criterios de salida del hypercare
${bulletList(d.exitCriteria)}
`,
  },

  EXECUTIVE_REPORT: {
    type: "EXECUTIVE_REPORT",
    description: "Informe ejecutivo AMS — periódico.",
    fields: [
      { id: "period", label: "Período", type: "text", required: true, placeholder: "Junio 2026" },
      { id: "highlights", label: "Highlights del período", type: "textarea", rows: 4, required: true },
      { id: "metrics", label: "Métricas clave (una por línea)", type: "textarea", rows: 5, required: true },
      { id: "incidents", label: "Incidentes destacados", type: "textarea", rows: 4 },
      { id: "improvements", label: "Mejoras implementadas", type: "textarea", rows: 3 },
      { id: "nextPeriod", label: "Foco próximo período", type: "textarea", rows: 3, required: true },
    ],
    generate: (d) => `# Informe ejecutivo AMS · ${d.period}

## Highlights
${bulletList(d.highlights)}

## Métricas clave
${bulletList(d.metrics)}

## Incidentes destacados
${bulletList(d.incidents || "")}

## Mejoras
${bulletList(d.improvements || "")}

## Foco próximo período
${bulletList(d.nextPeriod)}
`,
  },

  GO_LIVE_CHECKLIST: {
    type: "GO_LIVE_CHECKLIST",
    description: "Checklist de go-live.",
    fields: [
      { id: "system", label: "Sistema", type: "text", required: true },
      { id: "date", label: "Fecha de go-live", type: "date", required: true },
      { id: "items", label: "Items del checklist (uno por línea)", type: "textarea", rows: 12, required: true,
        defaultValue: "Backup del sistema completado\nUsuarios capacitados\nDatos maestros migrados y validados\nIntegraciones conectadas\nMonitoreo activo\nRollback verificado\nComunicación enviada a stakeholders" },
    ],
    generate: (d) => `# Checklist de Go-live · ${d.system}

**Fecha:** ${d.date}

${(d.items || "").split("\n").filter(Boolean).map((i) => `- [ ] ${i.trim()}`).join("\n")}
`,
  },

  REMEDIATION_PLAN: {
    type: "REMEDIATION_PLAN",
    description: "Plan de remediación post-incidente.",
    fields: [
      { id: "incidentCode", label: "Código del incidente", type: "text", required: true },
      { id: "rootCause", label: "Causa raíz identificada", type: "textarea", rows: 3, required: true },
      { id: "actions", label: "Acciones de remediación (una por línea)", type: "textarea", rows: 6, required: true },
      { id: "owner", label: "Responsable", type: "text", required: true },
      { id: "deadline", label: "Fecha objetivo", type: "date", required: true },
      { id: "kpis", label: "KPIs a verificar", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# Plan de remediación · ${d.incidentCode}

## Causa raíz
${d.rootCause}

## Acciones
${numbered(d.actions)}

## Responsable
${d.owner}

## Fecha objetivo
${d.deadline}

## KPIs a verificar
${bulletList(d.kpis || "")}
`,
  },

  GAPS_REPORT: {
    type: "GAPS_REPORT",
    description: "Informe de brechas del agente AMS.",
    fields: [
      { id: "period", label: "Período", type: "text", required: true },
      { id: "totalGaps", label: "Total de brechas detectadas", type: "text", required: true },
      { id: "topGaps", label: "Top brechas (una por línea)", type: "textarea", rows: 6, required: true },
      { id: "resolved", label: "Brechas resueltas", type: "textarea", rows: 4 },
      { id: "nextSteps", label: "Próximos pasos", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# Informe de brechas del agente · ${d.period}

**Total detectadas:** ${d.totalGaps}

## Top brechas
${numbered(d.topGaps)}

## Resueltas
${bulletList(d.resolved || "")}

## Próximos pasos
${bulletList(d.nextSteps || "")}
`,
  },

  AGENT_CHANGELOG: {
    type: "AGENT_CHANGELOG",
    description: "Changelog de una versión del agente.",
    fields: [
      { id: "version", label: "Versión", type: "text", required: true, placeholder: "v1.5" },
      { id: "date", label: "Fecha", type: "date", required: true, defaultValue: today() },
      { id: "added", label: "Agregado", type: "textarea", rows: 4 },
      { id: "improved", label: "Mejorado", type: "textarea", rows: 4 },
      { id: "fixed", label: "Corregido", type: "textarea", rows: 4 },
      { id: "knownIssues", label: "Issues conocidos", type: "textarea", rows: 3 },
    ],
    generate: (d) => `# Changelog ${d.version}
**Fecha:** ${d.date}

## ✨ Agregado
${bulletList(d.added || "")}

## ⬆ Mejorado
${bulletList(d.improved || "")}

## 🐛 Corregido
${bulletList(d.fixed || "")}

## ⚠ Issues conocidos
${bulletList(d.knownIssues || "")}
`,
  },

  ESTIMATE_RESOLUTION: {
    type: "ESTIMATE_RESOLUTION",
    description: "Estimación de resolución para un ticket/incidente — para enviar al cliente con respaldo del rango propuesto.",
    fields: [
      { id: "ticketCode",    label: "Código del ticket",          type: "text", required: true, placeholder: "INC-1234 / MESA-007" },
      { id: "ticketTitle",   label: "Título / resumen",           type: "text", required: true, placeholder: "Error MIGO M7 022 al recibir mercancía" },
      { id: "sapModule",     label: "Módulo SAP",                 type: "text", placeholder: "MM / SD / PP …" },
      { id: "environment",   label: "Ambiente afectado",          type: "text", placeholder: "PRD / QA / DEV" },
      { id: "severity",      label: "Severidad",                  type: "text", placeholder: "CRITICAL / HIGH / MEDIUM / LOW" },
      { id: "rangeHours",    label: "Rango horas (ej. 4-12)",     type: "text", required: true, placeholder: "4-12" },
      { id: "businessDays",  label: "Días hábiles (ej. 0.5-1.5)", type: "text", required: true, placeholder: "0.5-1.5" },
      { id: "confidence",    label: "Confianza",                  type: "text", required: true, placeholder: "Alta / Media / Baja" },
      { id: "complexity",    label: "Complejidad",                type: "text", placeholder: "Baja / Media / Alta" },
      { id: "phases",        label: "Fases (una por línea)",      type: "textarea", rows: 6, required: true,
        placeholder: "Recepción y clasificación · 0.25-0.5h\nDiagnóstico funcional · 1-3h\nResolución · 1-4h\nValidación · 0.5-1.5h\n…" },
      { id: "assumptions",   label: "Supuestos (uno por línea)",  type: "textarea", rows: 3, required: true,
        placeholder: "Horario hábil 9×5\nKey user disponible para validar\n…" },
      { id: "risks",         label: "Riesgos (uno por línea)",    type: "textarea", rows: 3,
        placeholder: "Posible necesidad de SAP Note\nVentana de transporte restringida\n…" },
      { id: "dependencies",  label: "Dependencias",               type: "textarea", rows: 2,
        placeholder: "Aprobación CAB\nVentana de pase\n…" },
      { id: "missingData",   label: "Datos requeridos",           type: "textarea", rows: 2,
        placeholder: "Material afectado\nLog dump completo\n…" },
      { id: "nextSteps",     label: "Próximos pasos",             type: "textarea", rows: 3,
        placeholder: "Confirmar prioridad con el solicitante\nReservar ventana de validación\n…" },
      { id: "clientReply",   label: "Respuesta sugerida al cliente", type: "textarea", rows: 4,
        defaultValue: "Estimado/a,\n\nAdjuntamos la estimación para el ticket indicado. Quedamos atentos a su confirmación para avanzar.\n\nSaludos,\nEquipo AMS" },
    ],
    generate: (d) => `# Estimación de resolución · ${d.ticketCode}

**Ticket:** ${d.ticketTitle}
**Módulo:** ${d.sapModule || "—"} · **Ambiente:** ${d.environment || "—"} · **Severidad:** ${d.severity || "—"}

---

## Esfuerzo estimado
- **Rango horas:** ${d.rangeHours}
- **Días hábiles:** ${d.businessDays}
- **Confianza:** ${d.confidence}
- **Complejidad:** ${d.complexity || "—"}

> Estimación por rangos. No constituye un tiempo exacto comprometido — el real depende de los factores listados abajo.

## Fases
${numbered(d.phases)}

## Supuestos
${bulletList(d.assumptions)}

## Riesgos
${bulletList(d.risks || "")}

## Dependencias
${bulletList(d.dependencies || "")}

## Datos requeridos para precisar
${bulletList(d.missingData || "")}

## Próximos pasos
${bulletList(d.nextSteps || "")}

---

## Respuesta sugerida al cliente
${d.clientReply}

---
**Generado:** ${today()}
`,
  },
};
