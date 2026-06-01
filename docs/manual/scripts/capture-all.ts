/**
 * Captures globales del manual AMS — recorre los 37 módulos y guarda 1 hero screenshot
 * por cada uno en ../screens/{slug}.png.
 *
 * Pensado para correr con la plataforma en localhost:6700 y backend en 6601.
 *
 * Si una pantalla no carga (RBAC, error 404), se guarda lo que esté visible y se
 * loggea WARN — no aborta la corrida.
 *
 * Para overrides ver variables de entorno en README.md.
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ============================================================
// Config
// ============================================================
const BASE = (process.env.MANUAL_BASE_URL || "http://localhost:6700").replace(/\/+$/, "");
const EMAIL = process.env.MANUAL_USER_EMAIL || "admin@demo.cl";
const PASS = process.env.MANUAL_USER_PASSWORD || "change-me-12chars-min";
const HEADLESS = (process.env.MANUAL_HEADLESS ?? "true") !== "false";
const VW = Number(process.env.MANUAL_VIEWPORT_W || 1920);
const VH = Number(process.env.MANUAL_VIEWPORT_H || 1080);
const SCREENS_DIR = join(__dirname, "..", "screens");
const NAV_TIMEOUT = 15000;
const SETTLE_MS = 1800;

if (!existsSync(SCREENS_DIR)) mkdirSync(SCREENS_DIR, { recursive: true });

// ============================================================
// Map módulo → path + slug + viewport opcional
// ============================================================
interface ModuleCapture {
  slug: string;            // nombre del png (sin extensión)
  path: string;            // path relativo
  label: string;           // para logs
  viewport?: { w: number; h: number };
  waitSelector?: string;   // selector que indica "cargó"
  fullPage?: boolean;
  postWaitMs?: number;
}

const MODULES: ModuleCapture[] = [
  // Orden = orden del INDICE.md
  { slug: "01-tickets",              path: "/tickets",              label: "Tickets", fullPage: true },
  { slug: "02-agente-ams",           path: "/agent",                label: "Agente AMS" },
  { slug: "03-dashboard",            path: "/dashboard",            label: "Dashboard", fullPage: true },
  { slug: "04-mesa-de-soporte",      path: "/support-desk",         label: "Mesa de Soporte" },
  { slug: "05-conocimiento",         path: "/knowledge",            label: "Conocimiento", fullPage: true },
  { slug: "06-entrenamiento-ia",     path: "/training",             label: "Entrenamiento IA" },
  { slug: "07-playbooks-ams",        path: "/playbooks",            label: "Playbooks", fullPage: true },
  { slug: "08-document-factory",     path: "/document-factory",     label: "Document Factory" },
  { slug: "09-quality-evaluator",    path: "/quality-evaluator",    label: "Quality Evaluator" },
  { slug: "10-escalamiento-n2",      path: "/escalation-n2",        label: "Escalación N2", fullPage: true },
  { slug: "11-testing-intelligence", path: "/testing-intelligence", label: "Testing Intelligence" },
  { slug: "12-estimador-tiempos",    path: "/time-estimator",       label: "Estimador de Tiempos" },
  { slug: "13-historial",            path: "/history",              label: "Historial" },
  { slug: "14-integraciones",        path: "/integrations",         label: "Integraciones" },
  { slug: "15-sap-readonly",         path: "/sap-readonly",         label: "SAP Read-Only" },
  { slug: "16-reuniones-ams",        path: "/meetings",             label: "Reuniones AMS" },
  { slug: "17-canal-telefonico",     path: "/voice-calls",          label: "Canal Telefónico" },
  { slug: "18-agent-lab",            path: "/agent-lab",            label: "Agent Lab" },
  { slug: "19-mission-control",      path: "/mission-control",      label: "Mission Control" },
  { slug: "20-topology",             path: "/topology",             label: "Topology" },
  { slug: "21-tv-mode",              path: "/tv",                   label: "TV Mode" },
  { slug: "22-demo-en-vivo",         path: "/demo",                 label: "Demo en vivo" },
  { slug: "23-war-room",             path: "/war-room",             label: "War Room" },
  { slug: "24-agent-brain",          path: "/brain",                label: "Agent Brain", postWaitMs: 3500 },
  { slug: "25-bloomberg-hud",        path: "/hud",                  label: "Bloomberg HUD" },
  { slug: "26-arc-reactor",          path: "/dashboard",            label: "Arc Reactor (embebido en dashboard)" },
  { slug: "27-launchpad",            path: "/launchpad",            label: "Launchpad", fullPage: true },
  { slug: "28-wallboard-4k",         path: "/wallboard",            label: "Wallboard 4K", viewport: { w: 3840, h: 2160 } },
  { slug: "29-forecast-ia",          path: "/forecast",             label: "Forecast IA" },
  { slug: "30-data-flow",            path: "/flow",                 label: "Data Flow", postWaitMs: 3000 },
  { slug: "31-bienvenida",           path: "/welcome",              label: "Bienvenida" },
  { slug: "32-ejecutivo",            path: "/executive",            label: "Vista Ejecutiva", fullPage: true },
  { slug: "33-valor-economico",      path: "/business-value",       label: "Valor Económico", fullPage: true },
  { slug: "34-agent-readiness",      path: "/agent-readiness",      label: "Agent Readiness", fullPage: true },
  { slug: "35-audit-trail",          path: "/audit",                label: "Audit Trail" },
  { slug: "36-configuracion",        path: "/settings",             label: "Configuración" },
  { slug: "37-administracion",       path: "/admin",                label: "Administración", fullPage: true },
];

// ============================================================
// Helpers
// ============================================================
function out(name: string): string {
  return join(SCREENS_DIR, `${name}.png`);
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(`${BASE}/login`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  } catch {
    return false;
  }
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  if ((await emailField.count()) === 0) {
    // no hay form de login — probablemente ya autenticado o magic redirect
    return true;
  }
  await emailField.fill(EMAIL);
  const passField = page.locator('input[type="password"]').first();
  if ((await passField.count()) > 0) await passField.fill(PASS);
  const btn = page
    .locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Iniciar")')
    .first();
  if ((await btn.count()) > 0) await btn.click();
  await page.waitForURL(/welcome|dashboard|tickets|launchpad/, { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(800);
  return true;
}

async function captureModule(ctx: BrowserContext, m: ModuleCapture): Promise<"ok" | "warn" | "fail"> {
  const usingCustomViewport = !!m.viewport;
  // Para viewports custom (ej. wallboard 4K) abrimos nueva pestaña, sino reusamos
  const page = usingCustomViewport
    ? await ctx.newPage()
    : (await ctx.pages())[0] || (await ctx.newPage());
  if (usingCustomViewport) {
    await page.setViewportSize({ width: m.viewport!.w, height: m.viewport!.h });
  }

  const url = `${BASE}${m.path}`;
  try {
    await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  } catch (e) {
    console.log(`  ✗ ${m.label} — no cargó (${(e as Error).message.slice(0, 70)})`);
    if (usingCustomViewport) await page.close();
    return "fail";
  }
  await page.waitForTimeout(m.postWaitMs ?? SETTLE_MS);

  // Si nos rebotó a /login, no estamos auth
  if (page.url().includes("/login")) {
    console.log(`  ⚠ ${m.label} — rebotado a /login, capturo lo que se vea`);
  }

  try {
    await page.screenshot({ path: out(m.slug), fullPage: !!m.fullPage });
    console.log(`  ✓ ${m.slug}.png  (${m.label})`);
    if (usingCustomViewport) await page.close();
    return "ok";
  } catch (e) {
    console.log(`  ⚠ ${m.label} — screenshot falló (${(e as Error).message.slice(0, 70)})`);
    if (usingCustomViewport) await page.close();
    return "warn";
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`→ Manual capture · TODOS los módulos · ${BASE}`);
  console.log(`  viewport ${VW}×${VH}, headless=${HEADLESS}`);
  console.log(`  screens → ${SCREENS_DIR}\n`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 1.25,
  });
  const page = await ctx.newPage();

  let okCount = 0;
  let warnCount = 0;
  let failCount = 0;

  try {
    console.log("→ Login…");
    await login(page);

    console.log(`\n→ Capturando ${MODULES.length} módulos:\n`);
    for (const m of MODULES) {
      const r = await captureModule(ctx, m);
      if (r === "ok") okCount++;
      else if (r === "warn") warnCount++;
      else failCount++;
    }

    console.log(`\n→ Resumen: ${okCount} OK · ${warnCount} WARN · ${failCount} FAIL`);
  } catch (err) {
    console.error("✗ Error fatal:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
