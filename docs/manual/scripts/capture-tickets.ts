/**
 * Capturas del módulo Tickets para el manual AMS.
 *
 * Salida en ../screens/tickets-*.png.
 *
 * Cubre:
 *  - Lista de tickets con badges de estimación
 *  - Command Center vacío (sin ticket seleccionado)
 *  - Command Center completo con NBA + Readiness al tope
 *  - Zoom a NBA card
 *  - Zoom a Readiness Score
 *  - Sección Estimación + Explicabilidad ETA expandida
 *  - Modal "Crear ticket" sin imagen
 *  - Modal "Crear ticket" con imagen adjunta + análisis visual
 *  - Modal "Demo guiada AMS" inicial
 *  - Modal "Demo guiada AMS" en progreso
 *  - Sección Auditoría · Timeline
 */

import { chromium, type Page } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// ============================================================
// Config desde env
// ============================================================
const BASE = process.env.MANUAL_BASE_URL || "http://localhost:6700";
const EMAIL = process.env.MANUAL_USER_EMAIL || "admin@demo.cl";
const PASS = process.env.MANUAL_USER_PASSWORD || "change-me-12chars-min";
const HEADLESS = (process.env.MANUAL_HEADLESS ?? "true") !== "false";
const VW = Number(process.env.MANUAL_VIEWPORT_W || 1920);
const VH = Number(process.env.MANUAL_VIEWPORT_H || 1080);
const SCREENS_DIR = join(__dirname, "..", "screens");

if (!existsSync(SCREENS_DIR)) mkdirSync(SCREENS_DIR, { recursive: true });

function out(name: string): string {
  return join(SCREENS_DIR, `${name}.png`);
}

// ============================================================
// Helpers
// ============================================================
async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  // Intentar login (si no hay, sigue)
  const emailField = page.locator('input[type="email"], input[name="email"]');
  if (await emailField.count() > 0) {
    await emailField.first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASS);
    const btn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Iniciar")').first();
    if (await btn.count() > 0) await btn.click();
    // Esperar redirect a /welcome o /dashboard
    await page.waitForURL(/welcome|dashboard|tickets/, { timeout: 5000 }).catch(() => null);
  }
}

async function gotoTickets(page: Page) {
  await page.goto(`${BASE}/tickets`);
  await page.waitForSelector("text=Tickets", { timeout: 10000 });
  // Dar tiempo a que carguen los tickets
  await page.waitForTimeout(1200);
}

async function snap(page: Page, name: string, opts: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}) {
  const path = out(name);
  await page.screenshot({ path, fullPage: opts.fullPage ?? false, clip: opts.clip });
  console.log(`✓ ${name}.png`);
}

async function snapElement(page: Page, selector: string, name: string) {
  const el = page.locator(selector).first();
  if (await el.count() === 0) {
    console.log(`⚠ skip ${name} — selector "${selector}" no encontrado`);
    return;
  }
  const path = out(name);
  await el.screenshot({ path });
  console.log(`✓ ${name}.png (elemento)`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`→ Manual capture · Tickets · ${BASE}`);
  console.log(`  viewport ${VW}×${VH}, headless=${HEADLESS}, screens → ${SCREENS_DIR}\n`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 1.5,  // captura nítida
  });
  const page = await ctx.newPage();

  try {
    // 1. Login (si hace falta)
    await login(page);

    // 2. /tickets — lista
    await gotoTickets(page);
    await snap(page, "tickets-list", { fullPage: false });

    // 3. Command Center vacío
    await snap(page, "tickets-command-center-empty");

    // 4. Click en el primer ticket de la lista
    const firstTicket = page.locator('button:has-text("AMS-")').first();
    if (await firstTicket.count() > 0) {
      await firstTicket.click();
      await page.waitForTimeout(1500); // que carguen las secciones
      await snap(page, "tickets-command-center-full", { fullPage: true });

      // 5. Zoom a NBA card
      await snapElement(page, 'text=NEXT BEST ACTION', "tickets-nba-card");

      // 6. Zoom a Readiness Score
      await snapElement(page, 'text=TICKET READINESS', "tickets-readiness-card");

      // 7. Sección Estimación + Explicabilidad
      await page.locator('text=ESTIMACIÓN DE RESOLUCIÓN').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await snap(page, "tickets-estimation-section");

      // 8. Sección Audit Trail
      await page.locator('text=AUDITORÍA · TIMELINE').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await snap(page, "tickets-audit-section");
    } else {
      console.log("⚠ no se encontraron tickets en la lista — el resto de capturas requiere tickets existentes");
    }

    // 9. Modal Crear ticket
    await page.locator('button:has-text("Crear ticket")').first().click();
    await page.waitForTimeout(600);
    await snap(page, "tickets-create-modal");

    // Cerrar
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // 10. Modal Demo guiada
    await page.locator('button:has-text("Ejecutar demo completa")').click();
    await page.waitForTimeout(800);
    await snap(page, "tickets-guided-demo");

    // Cerrar
    await page.keyboard.press("Escape");

    console.log("\n✓ Capturas Tickets completadas.");
  } catch (err) {
    console.error("✗ Error:", err);
    await snap(page, "_error-state");
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
