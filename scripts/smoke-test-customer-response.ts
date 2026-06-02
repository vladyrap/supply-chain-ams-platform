// Smoke test del Customer Response Intelligence engine.
// Cubre los 13 responseType + verificación del quality gate.
//
// Uso:
//   npx tsx scripts/smoke-test-customer-response.ts

import {
  generateCustomerResponse,
  buildResponseContextFromTicket,
} from "../src/intelligence/customer-response-engine";
import type {
  CustomerResponseContext, CustomerResponseType,
} from "../src/types/customer-response";

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", magenta: "\x1b[35m",
};

let passed = 0;
let failed = 0;

function header(s: string) {
  console.log("\n" + c.bold + c.cyan + "═══ " + s + " ═══" + c.reset);
}
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ${c.green}✓${c.reset} ${label}` + (detail ? c.dim + " · " + detail + c.reset : ""));
    passed++;
  } else {
    console.log(`  ${c.red}✗ ${label}${c.reset}` + (detail ? c.red + " — " + detail + c.reset : ""));
    failed++;
  }
}
function dumpKey(r: ReturnType<typeof generateCustomerResponse>) {
  console.log(
    `  ${c.dim}type:${c.reset} ${c.bold}${r.responseType}${c.reset} ` +
    `· tone=${r.tone} · audience=${r.audience} · conf=${r.confidence}`
  );
  console.log(
    `  ${c.dim}quality:${c.reset} ${c.bold}${r.qualityGate.score}/100${c.reset} ` +
    `(${r.qualityGate.level}) · canSend=${r.canSendToClient} ` +
    `· issues=${r.qualityGate.issues.length}`
  );
  console.log(
    `  ${c.dim}body:${c.reset} ${r.body.length} chars · next_steps=${r.nextSteps.length} ` +
    `· missing=${r.missingDataRequests.length}`
  );
}

// ============================================================
// CASOS — los 13 responseTypes + escenarios edge
// ============================================================

function ctxBase(overrides: Partial<CustomerResponseContext> = {}): CustomerResponseContext {
  return {
    ticketKey: "AMS-201",
    ticketTitle: "MIGO error M7 022 al recibir mercancía",
    ticketDescription: "Al hacer MIGO contra OC 4500003421 para material MAT-1001 en centro 1000 aparece error M7 022.",
    ticketStatus: "Open",
    ticketPriority: "Medium",
    sapModule: "MM",
    sapTransaction: "MIGO",
    sapProcess: "Procure to Pay",
    environment: "PRD",
    isProductive: true,
    confidence: "MEDIUM",
    hasErrorEvidence: true,
    hasReproduction: true,
    ...overrides,
  };
}

function testAcknowledgement() {
  header("1. ACKNOWLEDGEMENT");
  const r = generateCustomerResponse(ctxBase(), { responseType: "ACKNOWLEDGEMENT" });
  dumpKey(r);
  check("Subject incluye ticket key", r.subject.includes("AMS-201"));
  check("Body menciona MM o MIGO", /MM|MIGO/.test(r.body));
  check("Tiene saludo + cierre", /Hola|Estimado|Atenci/.test(r.body) && /Saludos|atentos/.test(r.body));
  check("canSendToClient = true (MEDIUM no crítico)", r.canSendToClient);
}

function testRequestMoreInfo() {
  header("2. REQUEST_MORE_INFO");
  const r = generateCustomerResponse(
    ctxBase({ missingData: ["Número de OC", "Material afectado", "Centro y almacén", "Mensaje SAP completo"] }),
    { responseType: "REQUEST_MORE_INFO" },
  );
  dumpKey(r);
  check("Incluye lista de missing data", r.missingDataRequests.length >= 3);
  check("Body menciona 'confirmar' o 'necesitamos'", /confirmar|necesitamos|requiere/i.test(r.body));
  check("Next steps incluye 'esperar'", r.nextSteps.some((s) => /esperar|confirmaci/i.test(s)));
}

function testPreliminaryDiagnosis() {
  header("3. PRELIMINARY_DIAGNOSIS");
  const r = generateCustomerResponse(
    ctxBase({
      confidence: "LOW",
      missingData: ["Número de OC", "Material afectado"],
    }),
    { responseType: "PRELIMINARY_DIAGNOSIS" },
  );
  dumpKey(r);
  check("Lenguaje condicional (LOW conf)", /podr[ií]a|sugiere|hip[oó]tesis|preliminar/i.test(r.body));
  check("NO afirma causa raíz con LOW", !/la causa ra[ií]z es\b/i.test(r.body));
  check("Quality gate canSend=true (no critical PRD)", r.qualityGate.canSend);
}

function testStatusUpdate() {
  header("4. STATUS_UPDATE");
  const r = generateCustomerResponse(ctxBase(), { responseType: "STATUS_UPDATE" });
  dumpKey(r);
  check("Tiene análisis", /an[aá]lisis|hip[oó]tesis/i.test(r.body));
  check("Body > 200 chars", r.body.length > 200);
}

function testWorkaround() {
  header("5. WORKAROUND");
  const r = generateCustomerResponse(
    ctxBase({ resolutionSummary: "Crear OC manual con tipo NB en lugar de ZB hasta resolver el customizing." }),
    { responseType: "WORKAROUND", includeWorkaround: true },
  );
  dumpKey(r);
  check("Body menciona 'temporal'", /temporal/i.test(r.body));
  check("Body incluye solución sugerida", /OC manual/.test(r.body));
}

function testEscalationNotice() {
  header("6. ESCALATION_NOTICE");
  const r = generateCustomerResponse(
    ctxBase({ hasEscalationN2: true, escalationKey: "ESC-2026-042" }),
    { responseType: "ESCALATION_NOTICE" },
  );
  dumpKey(r);
  check("Body menciona escalación/N2", /especialista|N2|deriv/i.test(r.body));
  check("Body menciona ESC key", r.body.includes("ESC-2026-042"));
}

function testResolutionProposal() {
  header("7. RESOLUTION_PROPOSAL");
  const r = generateCustomerResponse(
    ctxBase({
      resolutionSummary: "Activar el customizing OMB1 para stock especial K en movement type 101.",
    }),
    { responseType: "RESOLUTION_PROPOSAL" },
  );
  dumpKey(r);
  check("Body incluye acción propuesta", /OMB1/.test(r.body));
}

function testRcaPreliminary() {
  header("8. RCA_PRELIMINARY");
  const r = generateCustomerResponse(
    ctxBase({
      rootCauseSummary: "Falta de parámetro de stock especial K en OMB1 para movement type 101.",
      rootCauseValidated: false,
    }),
    { responseType: "RCA_PRELIMINARY" },
  );
  dumpKey(r);
  check("Body marca como 'sujeto a validación'", /sujeto a validaci[oó]n|preliminar/i.test(r.body));
  check("Tiene risk warnings (RCA prelim)", r.riskWarnings.length > 0);
}

function testRcaFinal() {
  header("9. RCA_FINAL");
  const r = generateCustomerResponse(
    ctxBase({
      rootCauseSummary: "Falta de parámetro de stock especial K en OMB1 para movement type 101.",
      rootCauseValidated: true,
      resolutionSummary: "OMB1 customizing transportado a PRD.",
      validationSummary: "Key user reprodujo MIGO contra OC 4500003421 — exitoso.",
      preventionRecommendation: "Revisar OMB1 al activar nuevos movement types personalizados.",
    }),
    { responseType: "RCA_FINAL" },
  );
  dumpKey(r);
  check("Body incluye causa validada", /causa ra[ií]z validada/i.test(r.body));
  check("Body incluye validación", /Validaci[oó]n:/i.test(r.body));
  check("Body incluye prevención", /Recomendaci[oó]n preventiva/i.test(r.body));
}

function testClosure() {
  header("10. CLOSURE");
  const r = generateCustomerResponse(
    ctxBase({
      rootCauseSummary: "Falta parámetro OMB1.",
      rootCauseValidated: true,
      resolutionSummary: "Customizing aplicado.",
      validationSummary: "Reproducción exitosa con key user.",
      preventionRecommendation: "Documentar el caso en KB.",
      ticketStatus: "Done",
    }),
    { responseType: "CLOSURE" },
  );
  dumpKey(r);
  check("Subject incluye 'Cierre'", /Cierre/i.test(r.subject));
  check("Incluye resumen + validación + prevención",
    /Acci[oó]n realizada/i.test(r.body) && /Validaci[oó]n/i.test(r.body) && /preventiva/i.test(r.body));
}

function testDelayNotice() {
  header("11. DELAY_NOTICE");
  const r = generateCustomerResponse(
    ctxBase({ delayReason: "Disponibilidad limitada del consultor ABAP esta semana.", newEstimatedDate: "lunes próximo" }),
    { responseType: "DELAY_NOTICE" },
  );
  dumpKey(r);
  check("Body menciona demora o nueva fecha", /demora|reanud|lunes/i.test(r.body));
}

function testDuplicate() {
  header("12. DUPLICATE_CASE");
  const r = generateCustomerResponse(
    ctxBase({ duplicateOfTicketKey: "AMS-185" }),
    { responseType: "DUPLICATE_CASE" },
  );
  dumpKey(r);
  check("Body tiene contenido", r.body.length > 80);
}

function testOutOfScope() {
  header("13. OUT_OF_SCOPE");
  const r = generateCustomerResponse(
    ctxBase({ scopeRationale: "El módulo CRM no está cubierto por el contrato AMS actual." }),
    { responseType: "OUT_OF_SCOPE" },
  );
  dumpKey(r);
  check("Body > 80 chars", r.body.length > 80);
}

// ============================================================
// Quality Gate — pruebas de bloqueo
// ============================================================

function testQualityBlocksRootCauseLowConf() {
  header("QG · Bloquea causa raíz con LOW conf");
  // Forzar texto que afirme causa con conf=LOW
  // Trick: el engine NO genera "la causa raíz es X" si conf=LOW.
  // Aún así verificamos que el quality gate detectaría ese texto.
  const r = generateCustomerResponse(
    ctxBase({
      confidence: "LOW",
      rootCauseSummary: "La causa raíz es el customizing mal configurado.",
      rootCauseValidated: true, // forzamos RCA_FINAL para que use rootCauseSummary literal
    }),
    { responseType: "RCA_FINAL" },
  );
  dumpKey(r);
  // Con RCA_FINAL + rootCauseValidated=true → "Causa raíz validada" (no es affirmación bajo LOW pero igual hay texto)
  // El gate debería detectar "la causa raíz es" en el rootCauseSummary literal.
  check("Detecta afirmación de causa raíz",
    r.qualityGate.issues.some((i) => i.ruleId === "claim_root_cause_low_confidence"));
  check("canSend=false (bloqueada)", !r.canSendToClient);
  check("Tiene safeVersion generada", r.qualityGate.safeVersion !== null);
}

function testQualityBlocksCriticalPrdNoHumanReview() {
  header("QG · Bloquea crítico PRD sin revisión humana");
  const r = generateCustomerResponse(
    ctxBase({ ticketPriority: "Highest", isProductive: true }),
    { responseType: "STATUS_UPDATE", humanReviewed: false },
  );
  dumpKey(r);
  check("Issue critical_prd_no_human_review",
    r.qualityGate.issues.some((i) => i.ruleId === "critical_prd_no_human_review"));
  check("canSend=false", !r.canSendToClient);
  check("requiresHumanReview=true", r.qualityGate.requiresHumanReview);
}

function testQualityPassesWithHumanReview() {
  header("QG · Pasa crítico PRD con revisión humana");
  const r = generateCustomerResponse(
    ctxBase({ ticketPriority: "Highest", isProductive: true }),
    { responseType: "STATUS_UPDATE", humanReviewed: true },
  );
  dumpKey(r);
  check("Sin issue critical_prd",
    !r.qualityGate.issues.some((i) => i.ruleId === "critical_prd_no_human_review"));
  check("canSend=true (humanReviewed)", r.canSendToClient);
}

function testToneAdaptation() {
  header("Tonos: MANAGER → EXECUTIVE");
  const r = generateCustomerResponse(
    ctxBase({ ticketPriority: "Medium" }),
    { responseType: "STATUS_UPDATE", audience: "MANAGER" },
  );
  dumpKey(r);
  check("Tono detectado EXECUTIVE", r.tone === "EXECUTIVE");
  check("Audiencia MANAGER", r.audience === "MANAGER");
}

function testEtaConditional() {
  header("ETA condicional cuando confidence != HIGH");
  const r = generateCustomerResponse(
    ctxBase({
      confidence: "MEDIUM",
      estimation: {
        id: "e1", ticketId: "AMS-201",
        totalMinHours: 4, totalMaxHours: 12,
        totalMinBusinessDays: 0.5, totalMaxBusinessDays: 1.5,
        confidence: "MEDIUM", confidenceScore: 65,
        complexity: "MEDIUM", phaseBreakdown: [],
        assumptions: [], risks: [], dependencies: [], missingData: [],
        suggestedSlaMinutes: 240,
        generatedAt: "2026-06-02T10:00:00Z",
        lastRecalculatedAt: "2026-06-02T10:00:00Z",
        generatedBy: "SYSTEM_ESTIMATOR",
        manuallyAdjusted: false, appliedRules: [],
      },
      hasEta: true,
    }),
    { responseType: "PRELIMINARY_DIAGNOSIS", includeEta: true },
  );
  dumpKey(r);
  check("ETA presente",
    !!r.etaStatement && r.etaStatement.length > 0);
  check("ETA usa lenguaje condicional",
    /sujeto a|preliminar|estimado/i.test(r.etaStatement ?? ""));
  check("Body incluye horas 4 y 12",
    /4\s*y\s*12|4\s*horas?\s*y\s*12|Entre 4 y 12/i.test(r.body));
}

function testSignature() {
  header("Firma del tenant configurada");
  const r = generateCustomerResponse(
    ctxBase(),
    { responseType: "ACKNOWLEDGEMENT", signature: "Equipo AMS · MyF SAP Consultores" },
  );
  check("Body incluye firma del tenant", r.body.includes("MyF SAP Consultores"));
}

function testBuildContextFromTicket() {
  header("buildResponseContextFromTicket helper");
  const ctx = buildResponseContextFromTicket(
    {
      key: "AMS-300",
      title: "VL02N falla con error WM",
      description: "...",
      sapModule: "SD",
      environment: "PRD",
      priority: "High",
    },
    {
      hasPlaybook: true,
      playbookTitle: "PGI WM troubleshooting",
      hasErrorEvidence: true,
      confidence: "MEDIUM",
    },
  );
  check("ticketKey OK", ctx.ticketKey === "AMS-300");
  check("hasPlaybook=true", ctx.hasPlaybook === true);
  check("isProductive=true (env=PRD)", ctx.isProductive === true);
  check("confidence OK", ctx.confidence === "MEDIUM");
}

// ============================================================
// Main
// ============================================================

console.log(c.bold + "\n🧪 SMOKE TEST · Customer Response Intelligence v0.1\n" + c.reset);

testAcknowledgement();
testRequestMoreInfo();
testPreliminaryDiagnosis();
testStatusUpdate();
testWorkaround();
testEscalationNotice();
testResolutionProposal();
testRcaPreliminary();
testRcaFinal();
testClosure();
testDelayNotice();
testDuplicate();
testOutOfScope();

testQualityBlocksRootCauseLowConf();
testQualityBlocksCriticalPrdNoHumanReview();
testQualityPassesWithHumanReview();

testToneAdaptation();
testEtaConditional();
testSignature();
testBuildContextFromTicket();

console.log("\n" + c.bold + "═══ RESUMEN ═══" + c.reset);
console.log(`${c.green}✓ ${passed} passed${c.reset}`);
if (failed > 0) {
  console.log(`${c.red}✗ ${failed} failed${c.reset}`);
  process.exit(1);
}
console.log(c.green + c.bold + "\n🎉 TODOS LOS TESTS PASARON\n" + c.reset);
