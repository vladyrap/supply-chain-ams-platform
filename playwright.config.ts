import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para AMS Platform.
 * Tests smoke E2E sin auth todavía (login flow requiere fixture aparte).
 * Asume platform corriendo en http://localhost:6700 y backend en http://localhost:6601.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : "html",

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:6700",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
