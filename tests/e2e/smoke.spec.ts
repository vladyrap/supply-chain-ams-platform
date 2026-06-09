import { test, expect } from "@playwright/test";

// =============================================================================
// Smoke E2E tests — AMS Platform v0.14.17
// =============================================================================
// Verifican que las páginas críticas cargan sin crash + endpoints clave funcionan.
// NO requieren auth (los protegidos solo verifican que NO crashean al redirigir).
// =============================================================================

test.describe("Smoke E2E", () => {
  test("home page responde y redirige", async ({ page, request }) => {
    const res = await request.get("/", { maxRedirects: 0 });
    // Esperamos 307 (redirect a /login) o 200 si está logueado
    expect([200, 307, 308]).toContain(res.status());
  });

  test("login page carga sin crash", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/.*\/login/);
    // Debería tener algún input de email o un formulario visible
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(50);
  });

  test("dashboard responde (puede redirigir si no auth)", async ({ request }) => {
    const res = await request.get("/dashboard", { maxRedirects: 0 });
    expect([200, 307, 308]).toContain(res.status());
  });

  test("/admin/costs responde (puede redirigir si no auth)", async ({ request }) => {
    const res = await request.get("/admin/costs", { maxRedirects: 0 });
    expect([200, 307, 308]).toContain(res.status());
  });

  test("/admin/roi responde (puede redirigir si no auth)", async ({ request }) => {
    const res = await request.get("/admin/roi", { maxRedirects: 0 });
    expect([200, 307, 308]).toContain(res.status());
  });

  test("backend /api/status devuelve up", async ({ request }) => {
    const res = await request.get(`${process.env.E2E_BACKEND_URL || "http://localhost:6601"}/api/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("up");
    expect(body.checks.database.status).toBe("up");
    expect(body.checks.backend.status).toBe("up");
  });

  test("backend /api/admin/usage/summary devuelve data", async ({ request }) => {
    const res = await request.get(`${process.env.E2E_BACKEND_URL || "http://localhost:6601"}/api/admin/usage/summary`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totals).toBeDefined();
    expect(body.health).toBeDefined();
    expect(body.recommendations).toBeDefined();
  });

  test("backend rechaza request con Origin no permitido (CSRF protection)", async ({ request }) => {
    const res = await request.post(`${process.env.E2E_BACKEND_URL || "http://localhost:6601"}/api/audit/events`, {
      headers: {
        Origin: "http://attacker.example.com",
        "Content-Type": "application/json",
      },
      data: { event: "test" },
    });
    // Debería ser 403 (CSRF blocked) o 401 (auth required) - cualquiera de los dos OK
    expect([401, 403]).toContain(res.status());
  });

  test("rate limit headers presentes", async ({ request }) => {
    const res = await request.get(`${process.env.E2E_BACKEND_URL || "http://localhost:6601"}/api/admin/usage/summary`);
    const headers = res.headers();
    expect(headers["x-ratelimit-limit"]).toBeDefined();
    expect(headers["x-ratelimit-remaining"]).toBeDefined();
  });

  test("helmet security headers presentes", async ({ request }) => {
    const res = await request.get(`${process.env.E2E_BACKEND_URL || "http://localhost:6601"}/health`);
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeDefined();
  });
});
