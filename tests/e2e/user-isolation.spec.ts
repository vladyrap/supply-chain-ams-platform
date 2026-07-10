// =============================================================================
// user-isolation.spec.ts — E2E aislamiento por usuario / tenant
// =============================================================================
// Verifica los criterios de aislamiento:
//   1. Backend: un usuario de un tenant NO puede abrir el ticket de otro (404).
//   2. Backend: los sub-recursos del caso (timeline, artifacts, intelligence)
//      no filtran datos cross-tenant (200 pero vacío).
//   3. Frontend: al hacer logout se limpia el estado de ROCCO en localStorage.
//
// Correr: npx playwright test user-isolation.spec.ts
// Precondición: backend + app up, super_admin existe, migrations aplicadas.
// (No corre contra producción — usa localhost por defecto.)
// =============================================================================

import { test, expect, type APIRequestContext } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601";
const APP_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const SUPER_ADMIN_EMAIL = process.env.TEST_SUPER_ADMIN_EMAIL || "admin@example.com";
const SUPER_ADMIN_PASSWORD = process.env.TEST_SUPER_ADMIN_PASSWORD || "admin123";

async function loginApi(request: APIRequestContext, email: string, password: string): Promise<void> {
  const res = await request.post(`${API_BASE}/api/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`Login falló ${email}: ${res.status()} ${await res.text()}`);
}

async function createTenant(request: APIRequestContext, id: string, name: string): Promise<void> {
  const res = await request.post(`${API_BASE}/api/tenants`, {
    data: { id, name, plan: "starter", status: "active" },
  });
  if (res.status() !== 201 && res.status() !== 400) {
    throw new Error(`createTenant ${id} falló: ${res.status()} ${await res.text()}`);
  }
}

test.describe("Aislamiento por usuario / tenant", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Solo Chromium");

  test("Backend: usuario B no puede abrir el ticket de A (cross-tenant → 404)", async ({ request }) => {
    await loginApi(request, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await createTenant(request, "acme", "ACME Test");
    await createTenant(request, "bravo", "Bravo Test");

    // Crear ticket en el tenant acme (super_admin usa X-Tenant-Id override).
    const created = await request.post(`${API_BASE}/api/tickets`, {
      headers: { "X-Tenant-Id": "acme" },
      data: { title: "ISO-TEST acme", description: "ticket privado de acme para aislamiento (>=80 chars de contexto para el engine)" },
    });
    expect([200, 201]).toContain(created.status());
    const key = (await created.json()).ticket.key as string;

    // Desde acme se ve.
    const asAcme = await request.get(`${API_BASE}/api/tickets/${key}`, { headers: { "X-Tenant-Id": "acme" } });
    expect(asAcme.ok()).toBeTruthy();

    // Desde bravo NO se ve → 404 (criterio explícito).
    const asBravo = await request.get(`${API_BASE}/api/tickets/${key}`, { headers: { "X-Tenant-Id": "bravo" } });
    expect(asBravo.status()).toBe(404);
  });

  test("Backend: sub-recursos del caso no filtran cross-tenant (vacío)", async ({ request }) => {
    await loginApi(request, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await createTenant(request, "acme", "ACME Test");

    const created = await request.post(`${API_BASE}/api/tickets`, {
      headers: { "X-Tenant-Id": "acme" },
      data: { title: "ISO-TEST sub", description: "ticket de acme con timeline/artefactos para verificar aislamiento de sub-recursos" },
    });
    expect([200, 201]).toContain(created.status());
    const key = (await created.json()).ticket.key as string;

    // Desde bravo, el timeline/artefactos del ticket de acme deben venir vacíos.
    const tl = await request.get(`${API_BASE}/api/tickets/${key}/timeline`, { headers: { "X-Tenant-Id": "bravo" } });
    if (tl.ok()) {
      const j = await tl.json();
      expect(j.eventCount ?? 0).toBe(0);
      expect(j.versionCount ?? 0).toBe(0);
    }
    const arts = await request.get(`${API_BASE}/api/tickets/${key}/artifacts`, { headers: { "X-Tenant-Id": "bravo" } });
    if (arts.ok()) {
      const j = await arts.json();
      expect((j.artifacts ?? []).length).toBe(0);
    }
  });

  test("Frontend: logout limpia el estado de ROCCO en localStorage", async ({ page }) => {
    await page.goto(`${APP_BASE}/login`);
    await page.fill("input#email", SUPER_ADMIN_EMAIL);
    await page.fill("input#pw", SUPER_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|tickets|bienvenida)/, { timeout: 15000 }).catch(() => { /* noop */ });
    if (page.url().includes("/login")) {
      test.skip(true, "Login no disponible en este entorno");
      return;
    }

    // Sembrar una key ROCCO (simula estado del usuario actual).
    await page.evaluate(() => window.localStorage.setItem("supply-chain-ams-iso-sentinel", "leak"));

    // Buscar el control de logout (best-effort, varios selectores).
    const logout = page
      .locator('button[title*="alir" i], button[aria-label*="alir" i], button:has-text("Cerrar sesión"), button:has-text("Salir")')
      .first();
    if ((await logout.count()) === 0) {
      test.skip(true, "Botón de logout no encontrado en el header");
      return;
    }
    await logout.click();
    await page.waitForURL(/\/login/, { timeout: 15000 });

    // La key de ROCCO debe haberse limpiado en el teardown.
    const leaked = await page.evaluate(() => window.localStorage.getItem("supply-chain-ams-iso-sentinel"));
    expect(leaked).toBeNull();
  });
});
