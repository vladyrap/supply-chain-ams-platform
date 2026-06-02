// Verificación visual del Contextual Estimation UI.
// Abre /time-estimator → tab "Modo contextual" → llena form → analiza → toma screenshots.
//
// Uso:
//   cd docs/manual/scripts
//   npx tsx verify-contextual-ui.ts
//
// Salidas en docs/manual/screens/contextual-*.png

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:6700";
const SCREENS_DIR = join(__dirname, "..", "screens");
if (!existsSync(SCREENS_DIR)) mkdirSync(SCREENS_DIR, { recursive: true });

async function main() {
  console.log("→ Verifying Contextual Estimation UI");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.25,
  });
  const page = await ctx.newPage();

  try {
    // ── Step 1: navigate ────────────────────────────────────
    console.log("  1. navigating to /time-estimator");
    await page.goto(`${BASE}/time-estimator`, { timeout: 20000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Si rebotó a login, intentar pasar
    if (page.url().includes("/login")) {
      console.log("  ⚠ rebotó a /login (RBAC). Capturando lo que se vea sin auth.");
      await page.screenshot({ path: join(SCREENS_DIR, "contextual-01-login-redirect.png") });
      // Intentar bypass: setear localStorage rol admin
      await page.evaluate(() => {
        // Algunos defaults RBAC
        try {
          const adminUser = { id: "u_admin_local", name: "Admin Local", email: "admin@local", role: "admin", active: true };
          localStorage.setItem("ams-current-user", JSON.stringify(adminUser));
        } catch {}
      });
    }

    // Re-navegar
    await page.goto(`${BASE}/time-estimator`, { timeout: 20000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-02-initial.png"), fullPage: false });
    console.log("  ✓ contextual-02-initial.png");

    // ── Step 2: Click tab "Modo contextual" ─────────────────
    console.log("  2. clicking tab Modo contextual");
    const contextualBtn = page.locator('button:has-text("Modo contextual")').first();
    if (await contextualBtn.count() === 0) {
      console.log("  ✗ Tab 'Modo contextual' no encontrada");
      await page.screenshot({ path: join(SCREENS_DIR, "contextual-03-tab-missing.png") });
      throw new Error("tab missing");
    }
    await contextualBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-03-tab-open.png"), fullPage: false });
    console.log("  ✓ contextual-03-tab-open.png");

    // ── Step 3: Llenar form con caso MIGO ───────────────────
    console.log("  3. filling form with MIGO M7 022 case");
    const titleInput = page.locator('input[placeholder*="MIGO"]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill("MIGO arroja error M7 022 al recibir mercancía");
    } else {
      // Fallback: primer input
      const firstInput = page.locator('input[type="text"], input:not([type])').first();
      await firstInput.fill("MIGO arroja error M7 022 al recibir mercancía");
    }

    const descTextarea = page.locator('textarea').first();
    if (await descTextarea.count() > 0) {
      await descTextarea.fill(
        "Al hacer MIGO contra OC 4500003421 para material MAT-1001 en centro 1000, " +
        "aparece error M7 022 'Determinación de stock especial no posible'. Ambiente PRD."
      );
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-04-form-filled.png"), fullPage: false });
    console.log("  ✓ contextual-04-form-filled.png");

    // ── Step 4: Click "Analizar contexto" ───────────────────
    console.log("  4. clicking Analizar contexto");
    const analyzeBtn = page.locator('button:has-text("Analizar contexto")').first();
    if (await analyzeBtn.count() === 0) {
      console.log("  ✗ Botón 'Analizar contexto' no encontrado");
      await page.screenshot({ path: join(SCREENS_DIR, "contextual-error-no-button.png") });
      throw new Error("button missing");
    }
    await analyzeBtn.click();
    await page.waitForTimeout(2500);

    // ── Step 5: Screenshot del resultado ────────────────────
    console.log("  5. capturing result");
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-05-result-top.png"), fullPage: false });
    console.log("  ✓ contextual-05-result-top.png");

    // Scroll para ver más
    await page.evaluate(() => window.scrollBy({ top: 700, behavior: "instant" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-06-result-scenarios.png"), fullPage: false });
    console.log("  ✓ contextual-06-result-scenarios.png");

    await page.evaluate(() => window.scrollBy({ top: 700, behavior: "instant" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-07-result-factors.png"), fullPage: false });
    console.log("  ✓ contextual-07-result-factors.png");

    await page.evaluate(() => window.scrollBy({ top: 700, behavior: "instant" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-08-result-phases.png"), fullPage: false });
    console.log("  ✓ contextual-08-result-phases.png");

    // Full page
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-09-full-page.png"), fullPage: true });
    console.log("  ✓ contextual-09-full-page.png (fullPage)");

    // ── Step 6: Verificaciones programáticas ────────────────
    console.log("\n→ Verifying rendered content");
    const bodyText = await page.evaluate(() => document.body.innerText);

    const checks: { label: string; pred: boolean }[] = [
      { label: "Módulo MM visible",       pred: /\bMM\b/.test(bodyText) },
      { label: "Transacción MIGO visible", pred: /MIGO/.test(bodyText) },
      { label: "Error M7 022 visible",     pred: /M7\s*022/.test(bodyText) },
      { label: "Material MAT-1001 visible", pred: /MAT-1001/.test(bodyText) },
      { label: "Centro 1000 visible",      pred: /\b1000\b/.test(bodyText) },
      { label: "OC 4500003421 visible",   pred: /4500003421/.test(bodyText) },
      { label: "PRD visible",             pred: /\bPRD\b/.test(bodyText) },
      { label: "ETA en horas visible",     pred: /\d+\.?\d*\s*h\s*[–-]/.test(bodyText) },
      { label: "3 escenarios (Optimista/Esperado/Pesimista)", pred: /OPTIMISTA/i.test(bodyText) && /ESPERADO/i.test(bodyText) && /PESIMISTA/i.test(bodyText) },
      { label: "Casos históricos visible", pred: /CASOS HIST/i.test(bodyText) },
      { label: "Factores contextuales",    pred: /FACTORES/i.test(bodyText) || /CONTEXTUALES/i.test(bodyText) },
      { label: "Confianza visible",        pred: /CONFIANZA/i.test(bodyText) },
      { label: "Response cliente visible", pred: /RESPUESTA SUGERIDA/i.test(bodyText) || /Estimado\/a/.test(bodyText) },
      { label: "Recomendaciones visible",  pred: /RECOMENDACIONES/i.test(bodyText) },
    ];

    let pass = 0, fail = 0;
    for (const c of checks) {
      if (c.pred) { console.log(`  ✓ ${c.label}`); pass++; }
      else        { console.log(`  ✗ ${c.label}`); fail++; }
    }
    console.log(`\n→ Resumen: ${pass}/${checks.length} passed${fail > 0 ? `, ${fail} failed` : ""}`);
    if (fail > 0) process.exitCode = 1;
  } catch (err) {
    console.error("✗ Error:", err);
    await page.screenshot({ path: join(SCREENS_DIR, "contextual-error.png") });
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
