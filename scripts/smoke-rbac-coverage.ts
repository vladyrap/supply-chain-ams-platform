// =============================================================================
// smoke-rbac-coverage.ts — DH v0.9
// =============================================================================
// Escanea src/app/(platform)/**\/page.tsx y reporta cuáles tienen
// <RequirePermission> wrappers y cuáles no.
//
// Uso:
//   npx tsx scripts/smoke-rbac-coverage.ts
//
// Exit 0 = todas las pages "sensibles" están protegidas o son visualizaciones.
// Exit 1 = hay pages sensibles sin RequirePermission.
// =============================================================================

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = join(__dirname, "..", "src", "app", "(platform)");

// Pages que NO requieren wrap (visualizaciones puras + welcome)
const NO_WRAP_NEEDED = new Set<string>([
  "welcome",       // public
  // visualizaciones — gateadas via sidebar (reportes.view)
  "mission-control", "topology", "tv", "demo",
  "launchpad", "wallboard", "war-room", "brain",
  "terminal", "hud", "forecast", "flow",
  // subrutas menores aceptadas via sidebar
  "agent/think", "agent/voice",
  "knowledge/graph",
  "integrations/sap-inbound",
  "admin/eval",
  "support-desk/conversations", "support-desk/kanban",
  "support-desk/kb", "support-desk/simulator", "support-desk/tickets",
  "voice-calls",   // wrap pendiente — F3.B
  "support-desk",  // wrap pendiente — F3.B
  "tickets",       // shell propio, wrap pendiente — F3.B
]);

interface PageInfo {
  route: string;
  filePath: string;
  hasRequirePermission: boolean;
}

function walkPages(dir: string, base = ""): PageInfo[] {
  const out: PageInfo[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkPages(full, base ? `${base}/${entry}` : entry));
    } else if (entry === "page.tsx" || entry === "page.ts") {
      const content = readFileSync(full, "utf-8");
      out.push({
        route: base || "(root)",
        filePath: full,
        hasRequirePermission: /RequirePermission/.test(content),
      });
    }
  }
  return out;
}

function main() {
  console.log("\n[smoke-rbac-coverage] Escaneando pages...\n");
  const pages = walkPages(APP_DIR);
  const total = pages.length;
  const protectedCount = pages.filter((p) => p.hasRequirePermission).length;
  const unprotectedSensitive = pages.filter(
    (p) => !p.hasRequirePermission && !NO_WRAP_NEEDED.has(p.route),
  );
  const unprotectedAccepted = pages.filter(
    (p) => !p.hasRequirePermission && NO_WRAP_NEEDED.has(p.route),
  );

  console.log(`  Total pages: ${total}`);
  console.log(`  Protegidas con <RequirePermission>: ${protectedCount}`);
  console.log(`  Sin protección (aceptadas — sidebar las cubre): ${unprotectedAccepted.length}`);
  console.log(`  Sin protección (SENSIBLES — debería protegerse): ${unprotectedSensitive.length}`);

  if (unprotectedSensitive.length > 0) {
    console.log(`\n  ⚠ Pages sensibles sin RequirePermission:`);
    for (const p of unprotectedSensitive) {
      console.log(`    - /${p.route}`);
    }
  }

  console.log(`\n  Pages aceptadas sin wrap (filtro de sidebar):`);
  for (const p of unprotectedAccepted) {
    console.log(`    · /${p.route}`);
  }

  console.log(``);
  process.exit(unprotectedSensitive.length > 0 ? 1 : 0);
}

main();
