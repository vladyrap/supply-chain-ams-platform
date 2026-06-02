// Smoke test del N2 Escalation Intelligence engine.

import { analyzeN2Escalation } from "../src/intelligence/n2-escalation-intelligence-engine";
import { N2_SPECIALISTS_MOCK } from "../src/data/n2-specialists-mock";

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

let passed = 0; let failed = 0;
function header(s: string) { console.log("\n" + c.bold + c.cyan + "═══ " + s + " ═══" + c.reset); }
function check(label: string, ok: boolean, detail?: string) {
  if (ok) { console.log(`  ${c.green}✓${c.reset} ${label}${detail ? c.dim + " · " + detail + c.reset : ""}`); passed++; }
  else { console.log(`  ${c.red}✗ ${label}${c.reset}${detail ? c.red + " — " + detail + c.reset : ""}`); failed++; }
}
function dump(a: ReturnType<typeof analyzeN2Escalation>) {
  console.log(`  ${c.dim}verdict:${c.reset} ${c.bold}${a.verdict}${c.reset} · urg=${a.urgencyScore} · conf=${a.confidenceScore}`);
  console.log(`  ${c.dim}primary:${c.reset} ${a.specialistRecommendations[0]?.responsibleName ?? "—"} (score ${a.specialistRecommendations[0]?.matchScore ?? 0})`);
  console.log(`  ${c.dim}sla:${c.reset} ${a.slaRecommendation.tier} · push=${a.pushEscalate.length} stay=${a.pushStay.length}`);
}

function testCriticalPrd() {
  header("1. CRITICAL PRD MIGO error M7 022");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-201",
    ticketTitle: "MIGO error M7 022 al recibir mercancía",
    ticketDescription: "Error M7 022 en MIGO contra OC 4500003421. Sistema productivo afectado, urgente.",
    ticketPriority: "Highest",
    sapModule: "MM",
    environment: "PRD",
    isProductive: true,
    estimationConfidence: "MEDIUM",
    estimationMinHours: 4, estimationMaxHours: 12,
    affectsBilling: true,
    customerSegment: "ENTERPRISE",
  });
  dump(r);
  check("Verdict ESCALATE_NOW", r.verdict === "ESCALATE_NOW");
  check("Urgencia >= 70", r.urgencyScore >= 70);
  check("SLA P1", r.slaRecommendation.tier.startsWith("P1"));
  check("Top 1 cubre MM", r.specialistRecommendations[0]?.sapModules.includes("MM") ?? false);
  check("Risks identificados", r.risksIfNotEscalated.length > 0);
}

function testN1Capable() {
  header("2. Caso simple con playbook — N1 capable");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-510",
    ticketTitle: "Reset password user CARLOS",
    ticketDescription: "Usuario CARLOS necesita reset de password SAP.",
    ticketPriority: "Low",
    sapModule: "BASIS",
    environment: "PRD",
    isProductive: true,
    hasPlaybook: true, hasKnowledgeMatch: true,
    estimationConfidence: "HIGH",
    estimationMinHours: 0.25, estimationMaxHours: 1,
  });
  dump(r);
  check("Verdict RESOLVE_AT_N1", r.verdict === "RESOLVE_AT_N1");
  check("Sin specialists o pocos", r.specialistRecommendations.length <= 3);
}

function testIntegrationCase() {
  header("3. Integration case (CPI iflow)");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-300",
    ticketTitle: "API REST iflow CPI devuelve HTTP 500",
    ticketDescription: "Endpoint REST del iflow CPI retorna error 500. Mapping nullable issue probable.",
    ticketPriority: "High",
    sapModule: "INTEGRACION",
    environment: "PRD",
    isProductive: true,
    estimationConfidence: "LOW",
    estimationMinHours: 6, estimationMaxHours: 18,
  });
  dump(r);
  check("Verdict push escalate", r.verdict === "ESCALATE_NOW" || r.verdict === "ESCALATE_SOON");
  check("Top 1 cubre INTEGRACION", r.specialistRecommendations[0]?.sapModules.includes("INTEGRACION") ?? false);
  check("Carlos Méndez primary", r.specialistRecommendations[0]?.responsibleName === "Carlos Méndez");
}

function testAbapDevCase() {
  header("4. ABAP development case");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-330",
    ticketTitle: "BADI custom Z_VA01_VALIDATE retorna dump",
    ticketDescription: "BADI Z_VA01_VALIDATE arroja short dump ST22 al guardar pedido. Requiere debug ABAP.",
    ticketPriority: "Medium",
    sapModule: "SD",
    environment: "QA",
    estimationConfidence: "MEDIUM",
    estimationMinHours: 8, estimationMaxHours: 24,
  });
  dump(r);
  check("Detecta señal expertise (dev)",
    r.pushEscalate.some((s) => s.category === "expertise_required"));
  check("Top 1 con ABAP en skills",
    r.specialistRecommendations[0]?.skills.some((s) => s.toLowerCase().includes("abap")) ?? false);
}

function testSpecialistOOOExcluded() {
  header("5. Specialist en VACATION queda último");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-700",
    ticketTitle: "QM lote inspección QA32 no libera",
    ticketDescription: "Lote de inspección QA32 no libera material MAT-QM-50.",
    ticketPriority: "Medium",
    sapModule: "QM",
    environment: "PRD",
    isProductive: true,
  });
  dump(r);
  const diego = r.specialistRecommendations.find((s) => s.responsibleId === "n2_008");
  check("Diego (VACATION) NO es primary",
    !diego?.isPrimary);
  if (diego) check("Diego availability=VACATION", diego.availability === "VACATION");
}

function testWorkloadSaturatedPenalized() {
  header("6. Specialist saturado penalizado");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-260",
    ticketTitle: "WM EWM warehouse task no se cierra",
    ticketDescription: "Task de EWM queda open después de confirmación.",
    ticketPriority: "Medium",
    sapModule: "EWM",
    environment: "PRD",
    isProductive: true,
  });
  dump(r);
  const patricia = r.specialistRecommendations.find((s) => s.responsibleId === "n2_007");
  if (patricia) {
    check("Patricia tiene workload 100%", patricia.currentWorkloadPct >= 100);
    check("Patricia matchReasons menciona saturación",
      patricia.matchReasons.some((r) => /saturado|workload alto/i.test(r)));
  }
}

function testN1Exhausted() {
  header("7. N1 invirtió >=4h en 2 intentos → escalar");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-901",
    ticketTitle: "Pedido SD VA01 con error pricing",
    ticketDescription: "Pedido cliente CUST-300 no determina precio K007.",
    ticketPriority: "High",
    sapModule: "SD",
    environment: "PRD",
    isProductive: true,
    n1AttemptsCount: 3, n1HoursInvested: 5,
  });
  dump(r);
  check("Push n1_exhausted detectada",
    r.pushEscalate.some((s) => s.id === "sig_n1_exhausted"));
  check("Verdict ESCALATE_NOW o SOON",
    r.verdict === "ESCALATE_NOW" || r.verdict === "ESCALATE_SOON");
}

function testInsufficientData() {
  header("8. Datos insuficientes");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-999",
    ticketTitle: "",
  });
  dump(r);
  check("Verdict INSUFFICIENT_DATA", r.verdict === "INSUFFICIENT_DATA");
  check("missingData no vacío", r.missingData.length > 0);
}

function testSlaPenaltyOverTime() {
  header("9. Ticket abierto 4 días → SLA at risk");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-800",
    ticketTitle: "Caso MM open hace 4 días",
    ticketDescription: "Caso open hace 4 días sin avance.",
    ticketPriority: "High",
    sapModule: "MM",
    environment: "PRD",
    isProductive: true,
    daysOpen: 4,
  });
  dump(r);
  check("Push SLA breach detectado",
    r.pushEscalate.some((s) => s.id === "sig_sla_breach_imminent"));
}

function testComplianceCase() {
  header("10. Compliance case → escalate now");
  const r = analyzeN2Escalation({
    ticketKey: "AMS-COMP",
    ticketTitle: "FI compliance issue en cierre fiscal",
    ticketDescription: "Issue con cumplimiento contable durante cierre fiscal. Riesgo audit externo.",
    ticketPriority: "Highest",
    sapModule: "FI",
    environment: "PRD",
    isProductive: true,
    affectsCompliance: true,
  });
  dump(r);
  check("Push compliance detectado",
    r.pushEscalate.some((s) => s.id === "sig_compliance" || s.id === "sig_compliance_prd"));
  check("SLA P1", r.slaRecommendation.tier.startsWith("P1"));
}

function testDataset() {
  header("Dataset N2 specialists");
  check("8 specialists en mock", N2_SPECIALISTS_MOCK.length === 8);
  check("Todos activos true",
    N2_SPECIALISTS_MOCK.every((s) => s.active === true));
  check("María Soto cubre MM",
    N2_SPECIALISTS_MOCK.find((s) => s.id === "n2_001")?.sapModules.includes("MM") ?? false);
}

console.log(c.bold + "\n🧪 SMOKE TEST · N2 Escalation Intelligence v0.1\n" + c.reset);
testCriticalPrd();
testN1Capable();
testIntegrationCase();
testAbapDevCase();
testSpecialistOOOExcluded();
testWorkloadSaturatedPenalized();
testN1Exhausted();
testInsufficientData();
testSlaPenaltyOverTime();
testComplianceCase();
testDataset();

console.log("\n" + c.bold + "═══ RESUMEN ═══" + c.reset);
console.log(`${c.green}✓ ${passed} passed${c.reset}`);
if (failed > 0) {
  console.log(`${c.red}✗ ${failed} failed${c.reset}`);
  process.exit(1);
}
console.log(c.green + c.bold + "\n🎉 TODOS LOS TESTS PASARON\n" + c.reset);
