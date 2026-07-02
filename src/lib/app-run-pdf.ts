// =============================================================================
// app-run-pdf.ts — v1.3 Agent Hub · Export de ejecución de App Agéntica a PDF
// =============================================================================
// Mismo estilo dashboard oscuro que ticket-pdf.ts (negro + cyan + violeta).
// Contenido: header con app, input, cada paso con su output, resultado final.
// =============================================================================

import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import type { AgenticApp, AppRun } from "@/services/custom-agents.api";

const BG: [number, number, number] = [10, 14, 22];
const CARD: [number, number, number] = [22, 28, 42];
const TEXT: [number, number, number] = [230, 235, 245];
const MUTED: [number, number, number] = [148, 163, 184];
const CYAN: [number, number, number] = [34, 211, 238];
const VIOLET: [number, number, number] = [167, 139, 250];
const GREEN: [number, number, number] = [134, 239, 172];
const RED: [number, number, number] = [248, 113, 113];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface Ctx { doc: jsPDF; y: number }

function paintBg(doc: jsPDF) {
  doc.setFillColor(...BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y + needed > PAGE_H - 16) {
    ctx.doc.addPage();
    paintBg(ctx.doc);
    ctx.y = MARGIN;
  }
}

function title(ctx: Ctx, text: string, color: [number, number, number] = CYAN) {
  ensure(ctx, 12);
  ctx.doc.setFillColor(...color);
  ctx.doc.rect(MARGIN, ctx.y, 3, 6, "F");
  ctx.doc.setTextColor(...color);
  ctx.doc.setFontSize(12);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.text(text.toUpperCase(), MARGIN + 6, ctx.y + 5);
  ctx.y += 10;
}

function para(ctx: Ctx, text: string, size = 9.5, color: [number, number, number] = TEXT) {
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(...color);
  const lines = ctx.doc.splitTextToSize(text || "—", CONTENT_W) as string[];
  for (const line of lines) {
    ensure(ctx, size * 0.5 + 1);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += size * 0.5 + 1;
  }
  ctx.y += 2;
}

export function exportRunToPdf(app: AgenticApp, run: AppRun): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  paintBg(doc);
  const ctx: Ctx = { doc, y: 0 };

  // Header banner
  doc.setFillColor(...CARD);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setFillColor(...VIOLET);
  doc.rect(0, 28, PAGE_W, 0.6, "F");
  doc.setTextColor(...VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("AMS AGENT HUB", MARGIN, 11);
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Ejecución de App Agéntica", MARGIN, 17);
  doc.setTextColor(...TEXT);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`${app.icon} ${app.name}`.slice(0, 60), MARGIN, 24);

  const statusColor = run.status === "done" ? GREEN : run.status === "failed" ? RED : CYAN;
  doc.setFontSize(9);
  doc.setTextColor(...statusColor);
  doc.text(
    run.status === "done" ? "COMPLETADO" : run.status === "failed" ? "FALLÓ" : "EN CURSO",
    PAGE_W - MARGIN, 24, { align: "right" },
  );

  ctx.y = 36;

  // Metadata
  para(ctx, `Ejecutado: ${new Date(run.createdAt).toLocaleString("es-CL")}` +
    (run.completedAt ? ` · Completado: ${new Date(run.completedAt).toLocaleString("es-CL")}` : ""),
    8.5, MUTED);

  // Input
  title(ctx, "Input del pipeline");
  para(ctx, run.input);

  // Pasos
  for (const s of run.stepsOutput) {
    const c = s.status === "done" ? GREEN : s.status === "failed" ? RED : MUTED;
    title(ctx, `Paso ${s.stepIndex + 1} · ${s.stepName} (${s.status === "done" ? `${(s.durationMs / 1000).toFixed(1)}s` : s.status})`, c);
    if (s.output) para(ctx, s.output, 9);
  }

  // Error
  if (run.error) {
    title(ctx, "Error", RED);
    para(ctx, run.error, 9, RED);
  }

  // Resultado final
  if (run.status === "done" && run.finalOutput) {
    title(ctx, "Resultado final", GREEN);
    para(ctx, run.finalOutput, 10);
  }

  // Footer en cada página
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`AMS Platform · ${app.name} · página ${i}/${pages}`, MARGIN, PAGE_H - 8);
    doc.text(new Date().toLocaleString("es-CL"), PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const safe = app.name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "_");
  saveAs(doc.output("blob"), `run-${safe}_${stamp}.pdf`);
}
