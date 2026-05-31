"use client";

// Agent Readiness Center · panel para embebir en Dashboard.
// Calcula score 0-100 por módulo a partir de:
// - useScopeItems (catálogo SAP + cobertura)
// - useAgentTraining (knowledge publicado + Q&A + gaps)
// - useTestingIntelligence (casos de prueba)

import { useMemo } from "react";
import { useScopeItems } from "@/hooks/useScopeItems";
import { useAgentTraining } from "@/hooks/useAgentTraining";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import { calculateAgentReadiness, type ReadinessAggregateInput } from "@/utils/agent-readiness-engine";
import type { SapModule } from "@/services/scope-items.api";
import ReadinessModuleCard from "./ReadinessModuleCard";

const KNOWN_MODULES: SapModule[] = ["MM", "SD", "PP", "EWM", "QM", "WM", "ARIBA", "IBP", "BTP", "INTEGRACION"];

export default function AgentReadinessCenter() {
  const scope = useScopeItems();
  const training = useAgentTraining();
  const testing = useTestingIntelligence();

  const results = useMemo(() => {
    const perModule: ReadinessAggregateInput["perModule"] = {};
    // Mapeo TrainingQA → módulo: lo derivamos via knowledgeItemId → knowledge.module
    const knowledgeById = new Map(training.knowledge.map((k) => [k.id, k]));
    for (const m of KNOWN_MODULES) {
      const publishedKnowledge = training.knowledge.filter((k) =>
        (k.module || "").toUpperCase() === m && k.status === "PUBLISHED");
      const qaApproved = training.qa.filter((q) => {
        if (!q.approved) return false;
        const k = knowledgeById.get(q.knowledgeItemId);
        return (k?.module || "").toUpperCase() === m;
      });
      perModule[m] = {
        knowledgePublished: publishedKnowledge.length,
        qaApproved: qaApproved.length,
        testCases: testing.scenarios.filter((t) =>
          (t.sapModule || "").toUpperCase() === m).length,
        criticalGaps: training.gaps.filter((g) =>
          (g.module || "").toUpperCase() === m
          && (g.priority === "high" || g.priority === "critical")
          && (g.status === "OPEN" || g.status === "IN_PROGRESS")).length,
      };
    }
    return calculateAgentReadiness({
      scopeItems: scope.items,
      perModule,
    });
  }, [scope.items, training.knowledge, training.qa, training.gaps, training.metrics, testing.scenarios]);

  if (scope.loading && results.length === 0) {
    return (
      <div className="card" style={{ color: "var(--text-dim)", fontSize: 12, padding: 18 }}>
        <span className="spinner" /> calculando readiness…
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
        ▸ AGENT READINESS CENTER · {results.length} módulos
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {results.map((r) => <ReadinessModuleCard key={r.module} result={r} />)}
      </div>
    </div>
  );
}
