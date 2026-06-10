// =============================================================================
// ticket-pdf.ts — Generador de PDF "Ticket de Requerimiento AMS"
// =============================================================================
// v1.2.7-prod · Estilo dashboard oscuro (matchea la UI: negro + cyan + violeta).
// Genera 1 PDF por ticket con TODA la información disponible:
//   - Header con marca AMS + key + status
//   - Datos generales (reporter, assignee, fechas, módulo SAP, ambiente)
//   - Descripción completa
//   - Auto Intelligence Enrichment (analysis, ETA, readiness, next best action)
//   - AMS Orchestrator (especialista primary + secondaries, confidence, routing)
//   - Especialistas — análisis de cada uno
//   - Customer Response history
//   - N1 Package (si existe)
//   - Visual Evidence Notes (si hay imágenes adjuntas analizadas)
//   - Audit trail (eventos del ticket)
//   - Footer con timestamp + URL original
// =============================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Ticket } from "@/services/tickets.api";
import type { TicketAuditEvent } from "@/types/audit";

// ----- Paleta dashboard oscuro -----
const COLOR = {
  bg: [10, 14, 22] as [number, number, number],         // fondo negro azulado
  card: [22, 28, 42] as [number, number, number],       // tarjetas
  border: [55, 70, 100] as [number, number, number],    // bordes sutiles
  text: [230, 235, 245] as [number, number, number],    // texto principal blanco-azulado
  muted: [148, 163, 184] as [number, number, number],   // texto secundario
  cyan: [34, 211, 238] as [number, number, number],     // títulos / acentos
  violet: [167, 139, 250] as [number, number, number],  // sub-acentos
  green: [134, 239, 172] as [number, number, number],   // ok / readiness alta
  amber: [251, 191, 36] as [number, number, number],    // warning / readiness media
  red: [248, 113, 113] as [number, number, number],     // critical / readiness baja
};

const PAGE_W = 210; // mm A4
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface RenderCtx {
  doc: jsPDF;
  y: number;
}

// ===== Helpers =====

function paintBackground(doc: jsPDF) {
  doc.setFillColor(...COLOR.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function ensureSpace(ctx: RenderCtx, needed: number) {
  if (ctx.y + needed > PAGE_H - 18) {
    addFooter(ctx.doc);
    ctx.doc.addPage();
    paintBackground(ctx.doc);
    ctx.y = MARGIN;
  }
}

function addFooter(doc: jsPDF) {
  const page = doc.getCurrentPageInfo().pageNumber;
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.muted);
  doc.text(`AMS Platform · página ${page}`, MARGIN, PAGE_H - 8);
  doc.text(
    `Generado ${new Date().toLocaleString("es-CL")}`,
    PAGE_W - MARGIN,
    PAGE_H - 8,
    { align: "right" },
  );
}

function sectionTitle(ctx: RenderCtx, text: string, color: [number, number, number] = COLOR.cyan) {
  ensureSpace(ctx, 12);
  // barra decorativa
  ctx.doc.setFillColor(...color);
  ctx.doc.rect(MARGIN, ctx.y, 3, 6, "F");
  ctx.doc.setTextColor(...color);
  ctx.doc.setFontSize(13);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.text(text.toUpperCase(), MARGIN + 6, ctx.y + 5);
  ctx.y += 9;
}

function paragraph(ctx: RenderCtx, text: string, opts: { size?: number; color?: [number, number, number] } = {}) {
  const size = opts.size ?? 10;
  const color = opts.color ?? COLOR.text;
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(...color);
  const lines = ctx.doc.splitTextToSize(text || "—", CONTENT_W) as string[];
  ensureSpace(ctx, lines.length * (size * 0.5));
  for (const line of lines) {
    ensureSpace(ctx, size * 0.5 + 1);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += size * 0.5 + 1;
  }
  ctx.y += 2;
}

function keyValTable(ctx: RenderCtx, rows: [string, string][]) {
  if (rows.length === 0) return;
  ensureSpace(ctx, 8 + rows.length * 6);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [],
    body: rows.map(([k, v]) => [k, v ?? "—"]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 3 },
      textColor: COLOR.text,
      lineColor: COLOR.border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLOR.muted, cellWidth: 50 },
      1: { textColor: COLOR.text },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.row.index % 2 === 0) {
        ctx.doc.setFillColor(...COLOR.card);
        ctx.doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
        ctx.doc.setTextColor(...(data.column.index === 0 ? COLOR.muted : COLOR.text));
        ctx.doc.text(String(data.cell.text.join("\n")), data.cell.x + 3, data.cell.y + 3.5);
      }
    },
  });
  // @ts-expect-error — jspdf-autotable internal API
  ctx.y = (ctx.doc.lastAutoTable?.finalY ?? ctx.y) + 4;
}

function statusBadge(status: string): [number, number, number] {
  const s = (status || "").toLowerCase();
  if (/(resolved|closed|done|cerrad)/.test(s)) return COLOR.green;
  if (/(progress|in_progress|en curso|abierto|open)/.test(s)) return COLOR.cyan;
  if (/(escalat|wait|pendien|hold)/.test(s)) return COLOR.amber;
  return COLOR.muted;
}

function priorityBadge(prio: string): [number, number, number] {
  const p = (prio || "").toLowerCase();
  if (/(critical|highest|critic)/.test(p)) return COLOR.red;
  if (/(high|alta|alto)/.test(p)) return COLOR.amber;
  if (/(medium|media|med)/.test(p)) return COLOR.cyan;
  return COLOR.green;
}

function readinessColor(score: number | undefined | null): [number, number, number] {
  const n = Number(score ?? 0);
  if (n >= 80) return COLOR.green;
  if (n >= 50) return COLOR.amber;
  return COLOR.red;
}

function drawHeader(ctx: RenderCtx, ticket: Ticket) {
  // Banner top
  ctx.doc.setFillColor(...COLOR.card);
  ctx.doc.rect(0, 0, PAGE_W, 30, "F");
  // Línea de marca cyan
  ctx.doc.setFillColor(...COLOR.cyan);
  ctx.doc.rect(0, 30, PAGE_W, 0.6, "F");

  // Logo / marca
  ctx.doc.setTextColor(...COLOR.cyan);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(16);
  ctx.doc.text("AMS PLATFORM", MARGIN, 12);
  ctx.doc.setTextColor(...COLOR.muted);
  ctx.doc.setFontSize(8);
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.text("Ticket de Requerimiento · Supply Chain AMS / SAP", MARGIN, 18);

  // Ticket key + status arriba derecha
  ctx.doc.setFontSize(20);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setTextColor(...COLOR.text);
  ctx.doc.text(ticket.key, PAGE_W - MARGIN, 12, { align: "right" });

  // Badge status + priority
  const stColor = statusBadge(ticket.status);
  const prColor = priorityBadge(ticket.priority);
  const stText = (ticket.status || "—").toUpperCase();
  const prText = (ticket.priority || "—").toUpperCase();
  ctx.doc.setFontSize(8);
  ctx.doc.setFont("helvetica", "bold");
  const stW = ctx.doc.getTextWidth(stText) + 4;
  const prW = ctx.doc.getTextWidth(prText) + 4;
  ctx.doc.setFillColor(...stColor);
  ctx.doc.roundedRect(PAGE_W - MARGIN - stW, 16, stW, 5, 1, 1, "F");
  ctx.doc.setTextColor(...COLOR.bg);
  ctx.doc.text(stText, PAGE_W - MARGIN - stW / 2, 19.5, { align: "center" });
  ctx.doc.setFillColor(...prColor);
  ctx.doc.roundedRect(PAGE_W - MARGIN - stW - prW - 2, 16, prW, 5, 1, 1, "F");
  ctx.doc.text(prText, PAGE_W - MARGIN - stW - 2 - prW / 2, 19.5, { align: "center" });

  // Título del ticket
  ctx.doc.setFontSize(12);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setTextColor(...COLOR.text);
  const titleLines = ctx.doc.splitTextToSize(ticket.title || "Sin título", PAGE_W - MARGIN * 2 - 60) as string[];
  ctx.doc.text(titleLines.slice(0, 2).join(" "), MARGIN, 26);

  ctx.y = 38;
}

// ===== Renderers de cada sección =====

function renderGeneral(ctx: RenderCtx, ticket: Ticket) {
  sectionTitle(ctx, "Datos generales");
  keyValTable(ctx, [
    ["Reporter", ticket.reporter || "—"],
    ["Assignee", ticket.assignee || "—"],
    ["Fuente", ticket.source || "—"],
    ["Módulo SAP", ticket.sapModule || "—"],
    ["Ambiente", ticket.environment || "—"],
    ["Creado", ticket.created ? new Date(ticket.created).toLocaleString("es-CL") : "—"],
    ["Última actualización", ticket.updated ? new Date(ticket.updated).toLocaleString("es-CL") : "—"],
    ["URL origen", ticket.url || "—"],
  ]);
}

function renderDescription(ctx: RenderCtx, ticket: Ticket) {
  sectionTitle(ctx, "Descripción del requerimiento");
  paragraph(ctx, ticket.description || "Sin descripción.");
}

function renderEstimation(ctx: RenderCtx, ticket: Ticket) {
  const est = ticket.estimatedResolution;
  if (!est) return;
  const e = est as unknown as Record<string, unknown>;
  const minH = e.minHours ?? e.totalMinHours ?? e.minH ?? "?";
  const maxH = e.maxHours ?? e.totalMaxHours ?? e.maxH ?? "?";
  const conf = typeof e.confidence === "number"
    ? `${Math.round(e.confidence * 100)}%`
    : String(e.confidence ?? "—");
  sectionTitle(ctx, "Estimación ETA", COLOR.violet);
  keyValTable(ctx, [
    ["Horas (min — max)", `${minH} h — ${maxH} h`],
    ["Confianza", conf],
    ["Complejidad", String(e.complexity ?? "—")],
    ["Método", String(e.method ?? "—")],
  ]);
  if (e.rationale) {
    paragraph(ctx, String(e.rationale), { size: 9, color: COLOR.muted });
  }
}

function renderIntelligence(ctx: RenderCtx, ticket: Ticket) {
  const intel = ticket.intelligence;
  if (!intel) return;
  sectionTitle(ctx, "Auto Intelligence Enrichment (AIE)", COLOR.violet);
  keyValTable(ctx, [
    ["Status", String(intel.status ?? "—")],
    ["Enriquecido en", intel.enrichedAt ? new Date(intel.enrichedAt).toLocaleString("es-CL") : "—"],
    ["Por", String(intel.enrichedBy ?? "—")],
    ["Input hash", String(intel.inputHash ?? "—").slice(0, 16) + "…"],
  ]);

  const a = intel.analysis;
  if (a) {
    const aAny = a as unknown as Record<string, unknown>;
    sectionTitle(ctx, "Análisis del agente", COLOR.cyan);
    const readiness = (aAny.readinessScore ?? aAny.readiness ?? aAny.score) as number | undefined;
    const rColor = readinessColor(readiness);
    const confGlobal = aAny.confidenceGlobal as number | undefined;
    const confStr = typeof confGlobal === "number" ? `${Math.round(confGlobal * 100)}%` : String(confGlobal ?? "—");
    keyValTable(ctx, [
      ["Readiness score", `${readiness ?? "?"} / 100`],
      ["Confianza global", confStr],
      ["Categoría", String(aAny.category ?? aAny.classification ?? "—")],
      ["Sub-categoría", String(aAny.subCategory ?? aAny.subcategory ?? "—")],
      ["Severidad", String(aAny.severity ?? "—")],
      ["Urgencia", String(aAny.urgency ?? "—")],
      ["Impacto", String(aAny.impact ?? "—")],
    ]);

    const summary = (aAny.summary ?? aAny.executiveSummary ?? aAny.description) as string | undefined;
    if (summary) {
      sectionTitle(ctx, "Resumen ejecutivo");
      paragraph(ctx, String(summary));
    }

    const rootCause = (aAny.rootCauseHypothesis ?? aAny.rootCause ?? aAny.causeHypothesis) as string | undefined;
    if (rootCause) {
      sectionTitle(ctx, "Hipótesis de causa raíz", COLOR.amber);
      paragraph(ctx, String(rootCause));
    }

    const recActions = aAny.recommendedActions as unknown[] | undefined;
    if (Array.isArray(recActions) && recActions.length > 0) {
      sectionTitle(ctx, "Acciones recomendadas", COLOR.cyan);
      recActions.forEach((act, i) => {
        const text = typeof act === "string"
          ? act
          : (((act as Record<string, unknown>)?.action as string) ?? JSON.stringify(act));
        paragraph(ctx, `${i + 1}. ${text}`);
      });
    }

    const nba = aAny.nextBestAction as Record<string, unknown> | undefined;
    if (nba) {
      sectionTitle(ctx, "Next Best Action", COLOR.green);
      const reasoning = Array.isArray(nba.reasoning)
        ? (nba.reasoning as string[]).join(" · ")
        : String(nba.reasoning ?? nba.reason ?? "—");
      keyValTable(ctx, [
        ["Acción", String(nba.action ?? nba.label ?? "—")],
        ["Etiqueta", String(nba.label ?? "—")],
        ["Razonamiento", reasoning],
        ["Owner sugerido", String(nba.owner ?? "—")],
        ["Confianza", String(nba.confidence ?? "—")],
      ]);
    }

    const requiredEv = aAny.requiredEvidence as unknown[] | undefined;
    if (Array.isArray(requiredEv) && requiredEv.length > 0) {
      sectionTitle(ctx, "Evidencia requerida (checklist N1)");
      requiredEv.forEach((e) => {
        const item = typeof e === "string"
          ? e
          : (((e as Record<string, unknown>)?.item as string) ?? JSON.stringify(e));
        paragraph(ctx, `☐  ${item}`, { size: 9 });
      });
    }

    // Marca visual readiness
    ensureSpace(ctx, 12);
    ctx.doc.setFillColor(...rColor);
    ctx.doc.rect(MARGIN, ctx.y, 5, 5, "F");
    ctx.doc.setTextColor(...COLOR.text);
    ctx.doc.setFontSize(9);
    ctx.doc.text(`Readiness para resolver: ${readiness ?? "?"} / 100`, MARGIN + 8, ctx.y + 4);
    ctx.y += 9;
  }
}

function renderSpecialists(ctx: RenderCtx, ticket: Ticket) {
  const sa = ticket.intelligence?.specialistAnalysis;
  if (!sa) return;
  const saAny = sa as unknown as Record<string, unknown>;
  const primary = saAny.primaryAnalysis as Record<string, unknown> | undefined;
  const routing = saAny.routing as Record<string, unknown> | undefined;
  const secondaries = (saAny.secondaryAnalyses as unknown[]) ?? [];

  const routingReasons = Array.isArray(routing?.reasons)
    ? (routing!.reasons as string[]).join(" · ")
    : String(routing?.reasons ?? routing?.reason ?? "—");

  sectionTitle(ctx, "Orquestador AMS · Especialistas", COLOR.violet);
  keyValTable(ctx, [
    ["Primary specialist", String(primary?.specialist ?? "—")],
    ["Confianza global", `${saAny.confidenceScore ?? "?"}%`],
    ["Nivel de confianza", String(saAny.confidenceLevel ?? "—")],
    ["Routing primary", String(routing?.primarySpecialist ?? "—")],
    ["Routing confianza", `${routing?.confidenceScore ?? "?"}%`],
    ["Routing razones", routingReasons],
    ["Requiere review humano", saAny.requiresHumanReview ? "Sí" : "No"],
    ["Analysis ID", String(saAny.analysisId ?? "—")],
  ]);

  // Primary analysis (acceso defensivo)
  if (primary) {
    sectionTitle(ctx, `Análisis · ${primary.specialist ?? "primary"}`, COLOR.cyan);
    const summary = (primary.summary ?? primary.analysis ?? primary.assessment) as string | undefined;
    if (summary) paragraph(ctx, String(summary));
    const findings = (primary.findings ?? primary.observations ?? primary.signals) as unknown;
    if (findings) {
      const arr = Array.isArray(findings) ? findings : [findings];
      arr.forEach((f) =>
        paragraph(ctx, `• ${typeof f === "string" ? f : JSON.stringify(f)}`, { size: 9 }),
      );
    }
  }

  // Secondaries
  if (secondaries.length > 0) {
    sectionTitle(ctx, "Análisis de especialistas secundarios", COLOR.muted);
    secondaries.forEach((s) => {
      const so = s as Record<string, unknown>;
      paragraph(ctx, `▸ ${so.specialist ?? "?"}`, { size: 10, color: COLOR.cyan });
      const sum = (so.summary ?? so.analysis ?? so.assessment) as string | undefined;
      if (sum) paragraph(ctx, String(sum), { size: 9 });
    });
  }

  if (saAny.nextBestAction) {
    sectionTitle(ctx, "NBA del orquestador", COLOR.green);
    paragraph(ctx, String(saAny.nextBestAction));
  }
}

function renderVisualEvidence(ctx: RenderCtx, ticket: Ticket) {
  const notes = ticket.visualEvidenceNotes;
  if (!notes || notes.length === 0) return;
  sectionTitle(ctx, "Análisis visual de evidencia adjunta", COLOR.amber);
  notes.forEach((n, i) => {
    const na = n as unknown as Record<string, unknown>;
    paragraph(ctx, `Imagen ${i + 1}: ${na.fileName ?? "sin nombre"}`, { size: 10, color: COLOR.cyan });
    const summary = (na.summary ?? na.description ?? na.note) as string | undefined;
    if (summary) paragraph(ctx, String(summary));
    if (na.extractedText) {
      paragraph(ctx, "Texto extraído:", { size: 9, color: COLOR.muted });
      paragraph(ctx, String(na.extractedText), { size: 9 });
    }
    if (na.detectedErrorCode) {
      paragraph(ctx, `Código de error: ${String(na.detectedErrorCode)}`, { size: 9, color: COLOR.red });
    }
    const errors = (na.detectedErrors ?? na.errors) as unknown[] | undefined;
    if (Array.isArray(errors) && errors.length > 0) {
      paragraph(ctx, "Errores detectados:", { size: 9, color: COLOR.red });
      errors.forEach((e) =>
        paragraph(ctx, `• ${typeof e === "string" ? e : JSON.stringify(e)}`, { size: 9 }),
      );
    }
  });
}

function renderAuditTrail(ctx: RenderCtx, events: TicketAuditEvent[]) {
  if (!events || events.length === 0) return;
  sectionTitle(ctx, `Audit trail (${events.length} eventos)`, COLOR.muted);
  const rows = events.slice(0, 50).map((e) => [
    new Date(e.createdAt).toLocaleString("es-CL"),
    e.eventType,
    e.title,
    e.actor || "—",
  ]);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Fecha", "Tipo", "Título", "Actor"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: COLOR.card,
      textColor: COLOR.cyan,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: COLOR.bg,
      textColor: COLOR.text,
      fontSize: 7.5,
      cellPadding: 1.5,
    },
    alternateRowStyles: { fillColor: COLOR.card },
    columnStyles: {
      0: { cellWidth: 34, textColor: COLOR.muted },
      1: { cellWidth: 42, textColor: COLOR.violet, fontStyle: "bold" },
      2: { cellWidth: 78 },
      3: { cellWidth: 28, textColor: COLOR.muted },
    },
  });
  // @ts-expect-error — jspdf-autotable internal API
  ctx.y = (ctx.doc.lastAutoTable?.finalY ?? ctx.y) + 4;

  if (events.length > 50) {
    paragraph(ctx, `… ${events.length - 50} eventos adicionales no listados`, { size: 8, color: COLOR.muted });
  }
}

// ===== Punto de entrada principal =====

export interface GeneratePdfOptions {
  /** Eventos de audit ya filtrados por ticketId (lo provee el caller). */
  auditEvents?: TicketAuditEvent[];
}

/**
 * Genera el PDF completo de un ticket. Retorna jsPDF (no descarga ni guarda).
 * El caller decide qué hacer (descargar, agregar a ZIP, etc).
 */
export function generateTicketPDF(ticket: Ticket, opts: GeneratePdfOptions = {}): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  paintBackground(doc);

  const ctx: RenderCtx = { doc, y: MARGIN };
  drawHeader(ctx, ticket);

  renderGeneral(ctx, ticket);
  renderDescription(ctx, ticket);
  renderEstimation(ctx, ticket);
  renderIntelligence(ctx, ticket);
  renderSpecialists(ctx, ticket);
  renderVisualEvidence(ctx, ticket);
  renderAuditTrail(ctx, opts.auditEvents ?? []);

  addFooter(doc);
  return doc;
}

/** Slug seguro para nombre de archivo. */
export function pdfFileNameFor(ticket: Ticket): string {
  const safeKey = (ticket.key || "ticket").replace(/[^a-zA-Z0-9-_]/g, "_");
  const safeTitle = (ticket.title || "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .slice(0, 50)
    .replace(/\s+/g, "_");
  const stamp = new Date().toISOString().slice(0, 10);
  return `${safeKey}${safeTitle ? "-" + safeTitle : ""}_${stamp}.pdf`;
}
