/**
 * Genera 3 PDFs (cliente, dev, sales) fusionando los markdown de cada audiencia.
 *
 * Salida:
 *   docs/manual/pdf/manual-cliente.pdf
 *   docs/manual/pdf/manual-dev.pdf
 *   docs/manual/pdf/manual-sales.pdf
 *
 * Cómo:
 * 1. Leer todos los .md de docs/manual/{audience}/ ordenados por nombre.
 * 2. Renderizar a HTML con `marked` + highlight.js.
 * 3. Insertar screenshots automáticos según slug detectado en el nombre del archivo.
 * 4. Cargar el HTML en Chromium (Playwright) e imprimir a PDF A4.
 */

import { chromium } from "playwright";
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { marked } from "marked";
import hljs from "highlight.js";

// ============================================================
// Config
// ============================================================
const MANUAL_DIR = join(__dirname, "..");
const PDF_DIR = join(MANUAL_DIR, "pdf");
const SCREENS_DIR = join(MANUAL_DIR, "screens");
if (!existsSync(PDF_DIR)) mkdirSync(PDF_DIR, { recursive: true });

const AUDIENCES = [
  { id: "cliente", title: "Manual de Cliente · AMS Platform", subtitle: "Cómo usar cada módulo · 37 módulos · 3 audiencias", color: "#22d3ee" },
  { id: "dev",     title: "Manual Técnico · AMS Platform",    subtitle: "Arquitectura, schemas, endpoints, gotchas",       color: "#a855f7" },
  { id: "sales",   title: "Manual de Ventas · AMS Platform",  subtitle: "Pitch, ROI, objeciones, frases que cierran",      color: "#10b981" },
] as const;

// ============================================================
// Markdown renderer with highlight.js
// ============================================================
marked.setOptions({
  gfm: true,
  breaks: false,
});

const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = (code, lang) => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const out = hljs.highlight(code, { language: lang }).value;
      return `<pre><code class="hljs language-${lang}">${out}</code></pre>`;
    } catch {/* fallthrough */}
  }
  return originalCode(code, lang);
};
marked.use({ renderer });

// ============================================================
// Build HTML for one audience
// ============================================================
function buildAudienceHtml(audId: "cliente" | "dev" | "sales", title: string, subtitle: string, color: string): string {
  const dir = join(MANUAL_DIR, audId);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "INDICE.md" && !f.startsWith("_"))
    .sort();

  const css = readFileSync(join(__dirname, "manual.css"), "utf8");

  let body = "";
  // Portada
  body += `
    <section class="cover">
      <div class="cover-stripe" style="background:${color}"></div>
      <div class="cover-inner">
        <div class="cover-eyebrow">AMS PLATFORM · DOCUMENTACIÓN</div>
        <h1 class="cover-title">${title}</h1>
        <p class="cover-subtitle">${subtitle}</p>
        <div class="cover-meta">
          <span>Versión 2026-06-01</span>
          <span>·</span>
          <span>${files.length} módulos</span>
        </div>
      </div>
    </section>
    <section class="toc"><h2>Índice</h2><ol>
  `;

  // Build TOC entries
  const tocEntries: { id: string; label: string }[] = [];
  for (const f of files) {
    const md = readFileSync(join(dir, f), "utf8");
    const firstH1 = md.match(/^#\s+(.+)$/m);
    const label = firstH1 ? firstH1[1].trim() : f.replace(/\.md$/, "");
    const id = "m-" + f.replace(/\.md$/, "");
    tocEntries.push({ id, label });
    body += `<li><a href="#${id}">${escapeHtml(label)}</a></li>`;
  }
  body += "</ol></section>";

  // Add INDICE.md as appendix if exists
  const indiceMd = existsSync(join(dir, "INDICE.md")) ? readFileSync(join(dir, "INDICE.md"), "utf8") : null;

  // Body
  for (const f of files) {
    const fileSlug = f.replace(/\.md$/, "");
    const id = "m-" + fileSlug;
    let md = readFileSync(join(dir, f), "utf8");

    // Inject screenshot at top if exists
    const screenshotPath = join(SCREENS_DIR, `${fileSlug}.png`);
    if (existsSync(screenshotPath)) {
      // marked rendering an <img> with file:// URI lets Chromium load local files
      const fileUri = "file:///" + screenshotPath.replace(/\\/g, "/");
      md = md.replace(/^(#\s+.+\n)/m, `$1\n![${fileSlug}](${fileUri})\n\n`);
    }

    const html = marked.parse(md) as string;
    body += `<section class="module" id="${id}"><div class="module-eyebrow">Módulo</div>${html}</section>`;
  }

  if (indiceMd) {
    body += `<section class="module appendix"><div class="module-eyebrow">Apéndice</div>${marked.parse(indiceMd) as string}</section>`;
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`→ Generando PDFs en ${PDF_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  for (const a of AUDIENCES) {
    console.log(`→ ${a.id}`);
    const html = buildAudienceHtml(a.id as any, a.title, a.subtitle, a.color);
    // Persist HTML temporal (útil para debug)
    const tmpHtml = join(PDF_DIR, `_tmp-${a.id}.html`);
    writeFileSync(tmpHtml, html, "utf8");
    const fileUri = "file:///" + tmpHtml.replace(/\\/g, "/");

    await page.goto(fileUri, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const pdfPath = join(PDF_DIR, `manual-${a.id}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:9px;color:#888;width:100%;text-align:center;padding:0 14mm;">${escapeHtml(a.title)}</div>`,
      footerTemplate: `<div style="font-size:9px;color:#888;width:100%;display:flex;justify-content:space-between;padding:0 14mm;"><span>AMS Platform · 2026-06-01</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    console.log(`  ✓ ${pdfPath}`);
  }

  await browser.close();
  console.log(`\n→ Listo. PDFs en ${PDF_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
