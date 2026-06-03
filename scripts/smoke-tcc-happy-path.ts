// =============================================================================
// smoke-tcc-happy-path.ts — DH v0.9
// =============================================================================
// Verifica que los engines determinísticos del frontend funcionan sin browser
// usando datos demo. Cubre el happy path del Ticket Command Center.
//
// Uso:
//   npx tsx scripts/smoke-tcc-happy-path.ts
//
// NO requiere backend ni navegador. Solo lógica de engines.
// =============================================================================

import assert from "node:assert/strict";

// Mocks mínimos de tipos del frontend (sin imports cross-tsconfig)
interface MinimalTicket {
  key: string;
  title: string;
  description: string;
  sapModule: string | null;
  environment: string | null;
  priority: string;
  status: string;
}

const SAMPLE_TICKETS: MinimalTicket[] = [
  {
    key: "SMOKE-001",
    title: "MIGO falla con error M7 022",
    description: "Al hacer MIGO contra OC 4500003421 para material MAT-1001 en centro 1000 aparece 'Determinación de stock especial no posible'.",
    sapModule: "MM",
    environment: "PRD",
    priority: "high",
    status: "Open",
  },
  {
    key: "SMOKE-002",
    title: "MRP no genera Solpeds para componente clave",
    description: "Material PROD-001 con stock < punto pedido pero MRP run no genera SolPed.",
    sapModule: "PP",
    environment: "PRD",
    priority: "highest",
    status: "Open",
  },
];

let passed = 0, failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}\n    ${(err as Error).message}`); failed++; }
}

async function main() {
  console.log(`\n[smoke-tcc-happy-path] Probando engines determinísticos...\n`);

  // 1. SAP context detector
  await test("sap-context-detector detecta MIGO", async () => {
    const mod = await import("../src/utils/sap-context-detector");
    const ctx = mod.detectSapContext(SAMPLE_TICKETS[0].description);
    assert.ok(ctx, "no devolvió contexto");
    // Debería detectar al menos el módulo MM
    assert.ok(ctx.module === "MM" || ctx.transaction === "MIGO" || ctx.errorCode,
      `contexto débil: ${JSON.stringify(ctx)}`);
  });

  // 2. AMS decision engine
  await test("ams-decision-engine devuelve acción recomendada", async () => {
    const mod = await import("../src/utils/ams-decision-engine");
    const decision = mod.analyzeTicketDecision(
      SAMPLE_TICKETS[0] as never,
      null,
      {
        hasKnowledgeMatch: false,
        hasPlaybook: false,
        hasScopeItem: false,
        scopeItems: [],
        hasErrorEvidence: true,
        isResolved: false,
        isProductive: true,
        hasComplexSolution: false,
        agentConfidence: null,
        hasExistingTestCase: false,
        hasExistingRca: false,
        similarPastTicketsCount: 0,
        hasReusableResolution: false,
        daysSinceLastUpdate: 0,
      },
    );
    assert.ok(decision.recommendedAction, "no se devolvió action");
    assert.ok(decision.confidence, "no se devolvió confidence");
  });

  // 3. Ticket readiness engine
  await test("ticket-readiness-engine calcula score 0-100", async () => {
    const mod = await import("../src/utils/ticket-readiness-engine");
    const r = mod.calculateTicketReadiness(SAMPLE_TICKETS[0] as never);
    assert.ok(typeof r.score === "number", "score no es number");
    assert.ok(r.score >= 0 && r.score <= 100, `score fuera de rango: ${r.score}`);
    assert.ok(Array.isArray(r.criteria), "criteria no es array");
  });

  // 4. Contextual estimation engine
  await test("contextual-ams-estimation-engine produce ETA", async () => {
    const mod = await import("../src/utils/contextual-ams-estimation-engine");
    const result = mod.estimateAmsResolutionContextually({
      ticketKey: SAMPLE_TICKETS[0].key,
      title: SAMPLE_TICKETS[0].title,
      description: SAMPLE_TICKETS[0].description,
      sapModule: SAMPLE_TICKETS[0].sapModule ?? undefined,
      environment: SAMPLE_TICKETS[0].environment as "PRD",
      severity: "HIGH",
      isProductive: true,
      hasPlaybook: false,
      hasPublishedKnowledge: false,
      scopeItemIds: [],
      createdBy: "smoke",
    });
    assert.ok(result.totalRange.minHours > 0, "minHours <= 0");
    assert.ok(result.totalRange.maxHours >= result.totalRange.minHours, "max < min");
    assert.ok(result.detectedContext, "no detectedContext");
  });

  // 5. Customer response engine
  await test("customer-response-engine genera respuesta", async () => {
    const mod = await import("../src/intelligence/customer-response-engine");
    const result = mod.generateCustomerResponse({
      ticketKey: SAMPLE_TICKETS[0].key,
      sapModule: SAMPLE_TICKETS[0].sapModule,
      ticketTitle: SAMPLE_TICKETS[0].title,
      ticketDescription: SAMPLE_TICKETS[0].description,
      isProductive: true,
      severity: "HIGH",
    } as never);
    assert.ok(result.body && result.body.length > 50, "body muy corto");
    assert.ok(result.subject, "no subject");
    assert.ok(result.qualityGate, "no quality gate");
  });

  // 6. N2 escalation intelligence
  await test("n2-escalation-intelligence-engine analiza ticket", async () => {
    const mod = await import("../src/intelligence/n2-escalation-intelligence-engine");
    const analysis = mod.analyzeN2Escalation({
      ticketKey: SAMPLE_TICKETS[0].key,
      ticketTitle: SAMPLE_TICKETS[0].title,
      ticketDescription: SAMPLE_TICKETS[0].description,
      ticketPriority: SAMPLE_TICKETS[0].priority,
      sapModule: SAMPLE_TICKETS[0].sapModule,
      environment: SAMPLE_TICKETS[0].environment,
      isProductive: true,
    });
    assert.ok(analysis.verdict, "no verdict");
    assert.ok(typeof analysis.urgencyScore === "number", "urgencyScore no es number");
  });

  // 7. Knowledge curation engine
  await test("knowledge-curation-engine — caso bajo score no genera candidato", async () => {
    const mod = await import("../src/intelligence/knowledge-curation-engine");
    const result = mod.analyzeCurationCandidate({
      ticketKey: "SMOKE-LOW",
      ticketTitle: "Caso sin nada",
      hasClosureResponse: false,
      closureQualityScore: 20,
      hasRootCauseValidated: false,
    });
    // Caso muy pobre → debería retornar null (no propone)
    assert.ok(result === null || result.brilliantScore < 60,
      `esperaba null o score bajo, got ${JSON.stringify(result)}`);
  });

  // 8. Quality evaluator helpers
  await test("quality-evaluator-helpers dedupea correctamente", async () => {
    const mod = await import("../src/utils/quality-evaluator-helpers");
    const dups = [
      { id: "1", incidentId: "T1", accuracyScore: 5, usefulnessScore: 5, clarityScore: 4, completenessScore: 5, hallucinationRisk: "LOW", technicalLevelFit: "ADEQUATE", evaluator: "u1" } as never,
      { id: "1", incidentId: "T1", accuracyScore: 5, usefulnessScore: 5, clarityScore: 4, completenessScore: 5, hallucinationRisk: "LOW", technicalLevelFit: "ADEQUATE", evaluator: "u1" } as never,
      { id: "2", incidentId: "T1", accuracyScore: 5, usefulnessScore: 5, clarityScore: 4, completenessScore: 5, hallucinationRisk: "LOW", technicalLevelFit: "ADEQUATE", evaluator: "u1" } as never,
    ];
    const { unique, removed } = mod.dedupeQualityEvaluations(dups);
    assert.equal(unique.length, 1, `esperaba 1 unique, got ${unique.length}`);
    assert.equal(removed, 2, `esperaba 2 removed, got ${removed}`);
  });

  console.log(`\n[smoke-tcc-happy-path] ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[smoke-tcc-happy-path] unexpected:", err);
  process.exit(2);
});
