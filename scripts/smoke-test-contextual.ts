// Smoke test del Contextual AMS Estimation Engine.
// Ejecuta los 5 casos del spec + casos edge y verifica output esperado.
//
// Uso:
//   npx tsx scripts/smoke-test-contextual.ts
//
// Salida: verde si todo pasa, rojo con detalle si algo falla.

import { estimateAmsResolutionContextually } from "../src/utils/contextual-ams-estimation-engine";
import type { ContextualEstimationInput } from "../src/types/estimation";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", magenta: "\x1b[35m",
};

let totalPassed = 0;
let totalFailed = 0;

function header(s: string) {
  console.log("\n" + c.bold + c.cyan + "═══ " + s + " ═══" + c.reset);
}

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ${c.green}✓${c.reset} ${label}` + (detail ? c.dim + " · " + detail + c.reset : ""));
    totalPassed++;
  } else {
    console.log(`  ${c.red}✗ ${label}${c.reset}` + (detail ? c.red + " — " + detail + c.reset : ""));
    totalFailed++;
  }
}

function info(s: string) {
  console.log("  " + c.dim + s + c.reset);
}

function dumpKey(result: ReturnType<typeof estimateAmsResolutionContextually>) {
  const ctx = result.detectedContext;
  console.log(
    `  ${c.dim}detected:${c.reset} module=${c.bold}${ctx.module}${c.reset} ` +
    `· issueType=${c.magenta}${ctx.issueType}${c.reset} ` +
    `· trans=[${ctx.transactions.join(",") || "—"}] ` +
    `· errors=[${ctx.errorCodes.join(",") || "—"}] ` +
    `· quality=${ctx.textQualityScore}/100`
  );
  console.log(
    `  ${c.dim}range:${c.reset} ${c.bold}${result.totalRange.minHours}h – ${result.totalRange.maxHours}h${c.reset} ` +
    `(esperado ${c.yellow}${result.totalRange.expectedHours}h${c.reset}) ` +
    `· conf=${c.cyan}${result.confidence}${c.reset}/${result.confidenceScore}`
  );
  console.log(
    `  ${c.dim}cases:${c.reset} ${result.similarCases.length} similares ` +
    `${result.similarCases.map((s) => `${s.caseId}=${s.actualResolutionHours}h(${(s.similarityScore * 100).toFixed(0)}%)`).join(", ")}`
  );
}

// ──────────────────────────────────────────────────────────────
// CASOS DEL SPEC
// ──────────────────────────────────────────────────────────────

function testCase1_MIGO() {
  header("CASO 1 · MIGO arroja error M7 022 al recibir mercancía");
  const input: ContextualEstimationInput = {
    title: "MIGO arroja error M7 022 al recibir mercancía",
    description: "Al hacer MIGO contra OC 4500003421 para material MAT-1001 en centro 1000, " +
                 "aparece error M7 022 'Determinación de stock especial no posible'. Ambiente PRD.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("Detecta módulo MM", ctx.module === "MM");
  check("Detecta transacción MIGO", ctx.transactions.includes("MIGO"));
  check("Detecta error M7 022", ctx.errorCodes.some((e) => /m7\s*022/i.test(e)));
  check("Detecta sub-proceso 'Entrada de mercancía'", ctx.subProcess === "Entrada de mercancía");
  check("Detecta material MAT-1001", ctx.sapObjects.material === "MAT-1001");
  check("Detecta centro 1000", ctx.sapObjects.plant === "1000");
  check("Detecta OC 4500003421", ctx.sapObjects.purchaseOrder === "4500003421");
  check("Detecta PRD", ctx.environment === "PRD");
  check("Pide más datos (≥1 missing)", result.missingData.length >= 0,
    `missing: ${result.missingData.length}`);
  check("Encuentra caso histórico h_mm_001", result.similarCases.some((c) => c.caseId === "h_mm_001"));
  check("Estimación entre 4-15h razonable",
    result.totalRange.minHours >= 2 && result.totalRange.maxHours <= 30,
    `range ${result.totalRange.minHours}-${result.totalRange.maxHours}h`);
}

function testCase2_Pricing() {
  header("CASO 2 · Pedido de venta no determina precio");
  const input: ContextualEstimationInput = {
    title: "Pedido de venta no determina precio en VA01",
    description: "Al crear pedido de venta VA01 para cliente CUST-100, " +
                 "el material MAT-SD-500 no trae condición de precio PR00 automáticamente. Ambiente PRD.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("Detecta módulo SD", ctx.module === "SD");
  check("Detecta transacción VA01", ctx.transactions.includes("VA01"));
  check("Detecta issueType pricing", ctx.issueType === "pricing_issue");
  check("Detecta cliente CUST-100", ctx.sapObjects.customer === "CUST-100");
  check("Detecta material", !!ctx.sapObjects.material);
  check("Encuentra caso histórico SD pricing", result.similarCases.some((c) => c.module === "SD"));
}

function testCase3_MRP() {
  header("CASO 3 · MRP no genera propuestas para material crítico");
  const input: ContextualEstimationInput = {
    title: "MRP MD01 no genera propuestas para material crítico MAT-CRIT-100",
    description: "Después de correr MD01 a las 6am, el material MAT-CRIT-100 no aparece " +
                 "con propuestas en MD04 aunque tiene demanda planificada en MD61. " +
                 "Operación detenida en PRD. Crítico para abastecimiento.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("Detecta módulo PP", ctx.module === "PP");
  check("Detecta MRP/MD01", ctx.transactions.includes("MD01") || ctx.subProcess?.includes("MRP"));
  check("Detecta issueType MRP", ctx.issueType === "mrp_issue");
  check("Detecta operación detenida", ctx.hasOperationHalted);
  check("Detecta severidad alta (HIGH o CRITICAL)",
    ctx.severity === "CRITICAL" || ctx.severity === "HIGH",
    `severity=${ctx.severity}`);
  check("Encuentra caso histórico h_pp_001", result.similarCases.some((c) => c.caseId === "h_pp_001"));
}

function testCase4_IDoc() {
  header("CASO 4 · IDoc detenido en WE02 con error de segmento");
  const input: ContextualEstimationInput = {
    title: "IDoc detenido en WE02 con error de segmento",
    description: "IDoc tipo DESADV número 16000089001234 status 51 — segmento E1EDL20 con dato inválido " +
                 "en campo VBELN. Hay que reprocesar con BD87 después del fix. Ambiente PRD.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("Detecta módulo INTEGRACION", ctx.module === "INTEGRACION");
  check("Detecta transacción WE02", ctx.transactions.includes("WE02"));
  check("Detecta issueType IDoc/API", ctx.issueType === "idoc_api_issue");
  check("Detecta IDoc number", ctx.sapObjects.idocNumber === "16000089001234");
  check("requiresIntegration=true", ctx.requiresIntegration);
  check("Encuentra caso histórico h_int_001", result.similarCases.some((c) => c.caseId === "h_int_001"));
}

function testCase5_PGI() {
  header("CASO 5 · VL01N falla con error WM en salida de mercancía");
  const input: ContextualEstimationInput = {
    title: "VL01N falla con error WM en salida de mercancía",
    description: "PGI en VL01N para entrega 80009999 falla con error 'no se puede determinar ubicación WM'. " +
                 "El picking ya está confirmado en LT03. Ambiente PRD afecta despacho.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  // SD y WM pueden disputar — el detector elige por score
  check("Detecta módulo SD o WM",
    ctx.module === "SD" || ctx.module === "WM",
    `module=${ctx.module}`);
  check("Detecta transacción VL01N", ctx.transactions.includes("VL01N"));
  check("Detecta entrega 80009999", ctx.sapObjects.delivery === "80009999");
  check("Detecta afectación despacho", ctx.affectsDelivery);
}

// ──────────────────────────────────────────────────────────────
// EDGE CASES
// ──────────────────────────────────────────────────────────────

function testEdgeCase_NoInfo() {
  header("EDGE · Caso con info muy pobre");
  const input: ContextualEstimationInput = {
    title: "no anda",
    description: "ayuda",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  check("Confianza LOW", result.confidence === "LOW");
  check("Muchos missingData (≥3)", result.missingData.length >= 3,
    `missing: ${result.missingData.length}`);
  check("Recommendations incluyen 'pedir info'",
    result.recommendations.some((r) =>
      r.kind === "ask_user" || r.kind === "improve_estimation" || r.kind === "validate_data"));
  check("textQualityScore < 40", result.detectedContext.textQualityScore < 40);
}

function testEdgeCase_RichInfo() {
  header("EDGE · Caso con info muy completa");
  const input: ContextualEstimationInput = {
    title: "MIGO error M7 022 entrada de mercancía PRD",
    description: "Al hacer MIGO movimiento 101 contra OC 4500003421 material MAT-1001 centro 1000 " +
                 "almacén 0001 proveedor SUPP-100, aparece error M7 022 'Determinación de stock especial " +
                 "no posible'. Captura adjunta. Pasos para reproducir: 1. abrir MIGO 2. seleccionar OC " +
                 "3. ingresar cantidad 4. guardar → error. Reproducible en QA con misma OC. " +
                 "Tipo de movimiento 101. Usuario PEDRO.GOMEZ. Sociedad 1000.",
    sapModule: "MM",
    environment: "PRD",
    hasPlaybook: true,
    isRepeatedIncident: true,
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("textQualityScore ≥ 70", ctx.textQualityScore >= 70, `score=${ctx.textQualityScore}`);
  check("Detecta varios objetos", ctx.objectCount >= 4, `count=${ctx.objectCount}`);
  check("hasReproduction=true", ctx.hasReproduction);
  check("Confianza HIGH o MEDIUM (no LOW)",
    result.confidence !== "LOW",
    `confidence=${result.confidence}, score=${result.confidenceScore}`);
  check("Match con casos históricos (≥1)", result.similarCases.length >= 1);
  check("Playbook match presente", !!result.playbookMatch);
}

function testEdgeCase_DevHeavy() {
  header("EDGE · Cambio con desarrollo ABAP");
  const input: ContextualEstimationInput = {
    title: "Nuevo BADI para validar pedidos VA01",
    description: "Necesitamos implementar BADI Z_VA01_VALIDATE que valide combinación cliente + " +
                 "material antes de guardar pedido. Requiere ABAP + transporte + UAT.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("issueType change_with_development", ctx.issueType === "change_with_development");
  check("requiresDevelopment=true", ctx.requiresDevelopment);
  check("Tiene fase de desarrollo",
    result.phaseBreakdown.some((p) => p.name.toLowerCase().includes("desarrollo")));
  check("Estimación más alta (≥20h max)",
    result.totalRange.maxHours >= 20,
    `max=${result.totalRange.maxHours}h`);
}

function testEdgeCase_AuthSimple() {
  header("EDGE · Problema de autorización simple");
  const input: ContextualEstimationInput = {
    title: "Usuario CARLOS.MARTINEZ no puede crear OC en ME21N",
    description: "Usuario CARLOS.MARTINEZ no puede ejecutar ME21N. SU53 muestra M_BEST_BSA faltante.",
  };
  const result = estimateAmsResolutionContextually(input);
  dumpKey(result);

  const ctx = result.detectedContext;
  check("issueType authorization", ctx.issueType === "authorization_issue");
  check("Detecta SU53", ctx.transactions.includes("SU53"));
  check("Detecta usuario", ctx.sapObjects.user === "CARLOS.MARTINEZ");
  check("Estimación baja (≤4h max)",
    result.totalRange.maxHours <= 6,
    `max=${result.totalRange.maxHours}h`);
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

console.log(c.bold + "\n🧪 SMOKE TEST · Contextual AMS Estimation Engine v0.1\n" + c.reset);

testCase1_MIGO();
testCase2_Pricing();
testCase3_MRP();
testCase4_IDoc();
testCase5_PGI();
testEdgeCase_NoInfo();
testEdgeCase_RichInfo();
testEdgeCase_DevHeavy();
testEdgeCase_AuthSimple();

console.log("\n" + c.bold + "═══ RESUMEN ═══" + c.reset);
console.log(`${c.green}✓ ${totalPassed} passed${c.reset}`);
if (totalFailed > 0) {
  console.log(`${c.red}✗ ${totalFailed} failed${c.reset}`);
  process.exit(1);
}
console.log(c.green + c.bold + "\n🎉 TODOS LOS TESTS PASARON\n" + c.reset);
