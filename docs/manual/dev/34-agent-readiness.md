# 📈 Agent Readiness · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/agent-readiness/page.tsx` | Page con tile + breakdown + drill-down |
| `src/components/readiness/AgentReadinessCenter.tsx` | Center |
| `src/components/readiness/ReadinessTile.tsx` | Tile big con score 0-100 |
| `src/components/readiness/ReadinessBreakdown.tsx` | Tabla criterios |
| `src/components/readiness/ReadinessMatrix.tsx` | Heatmap módulos × criterios |
| `src/services/readiness.api.ts` | Cliente HTTP |
| `src/utils/agent-readiness-engine.ts` | Engine local (preview rápido) |
| Backend `services/readiness/readiness.service.ts` | Cómputo authoritative |
| Backend `routes/readiness.ts` | API |

## Tipos

```ts
interface ReadinessReport {
  computedAt: string;
  globalScore: number;       // 0-100
  level: "production_ready" | "almost_ready" | "needs_training" | "not_ready";
  criteria: ReadinessCriterion[];
  byModule: Record<string, { score: number; criteria: ReadinessCriterion[] }>;
  recommendations: Recommendation[];
}

interface ReadinessCriterion {
  id: "kb_coverage" | "playbook_coverage" | "feedback_ratio" | "confidence_avg"
     | "latency_p95" | "cost_per_resolved" | "escalation_rate" | "qa_approval";
  label: string;
  value: number;
  unit: "score" | "pct" | "seconds" | "usd";
  threshold: { min?: number; max?: number };
  status: "ok" | "warn" | "fail";
  weight: number;     // 0-1, para global score
}

interface Recommendation {
  criterionId: string;
  module?: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
  estimatedImpact?: number;     // puntos que sumaría al global
}
```

## Engine

```ts
function computeReadiness(): ReadinessReport {
  const criteria = [
    computeKbCoverage(),         // weight 0.15
    computePlaybookCoverage(),   // weight 0.15
    computeFeedbackRatio(),      // weight 0.15
    computeConfidenceAvg(),      // weight 0.10
    computeLatencyP95(),         // weight 0.10
    computeCostPerResolved(),    // weight 0.10
    computeEscalationRate(),     // weight 0.15
    computeQaApproval(),         // weight 0.10
  ];

  const globalScore = criteria.reduce((s, c) => {
    const cScore = c.status === 'ok' ? 100 : c.status === 'warn' ? 60 : 20;
    return s + cScore * c.weight;
  }, 0);

  return { globalScore, level: levelFromScore(globalScore), criteria, byModule, recommendations };
}
```

## Cómputo de cada criterion

```ts
function computeKbCoverage() {
  const requiredModules = ['MM', 'SD', 'PP', 'WM', 'EWM', 'QM'];
  const covered = requiredModules.filter(m =>
    knowledgeItems.filter(k => k.sapModule === m && k.status === 'PUBLISHED').length >= 3
  );
  const pct = covered.length / requiredModules.length * 100;
  return { id: 'kb_coverage', value: pct, threshold: { min: 70 },
           status: pct >= 70 ? 'ok' : pct >= 50 ? 'warn' : 'fail', weight: 0.15 };
}

function computeFeedbackRatio() {
  const total = aiFeedback.length;
  const ups = aiFeedback.filter(f => f.kind === 'thumbs_up').length;
  const ratio = total > 0 ? ups / total * 100 : 0;
  return { id: 'feedback_ratio', value: ratio, threshold: { min: 80 },
           status: ratio >= 80 ? 'ok' : ratio >= 65 ? 'warn' : 'fail', weight: 0.15 };
}

// ... etc
```

## Endpoints

```
GET  /api/readiness/report
GET  /api/readiness/snapshots?days=90    → trend
POST /api/readiness/snapshot              → snapshot manual (cron diario)
```

## Schema snapshots

```sql
CREATE TABLE agent_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  global_score NUMERIC,
  criteria JSONB,
  by_module JSONB
);

CREATE INDEX idx_readiness_snapshots_at ON agent_readiness_snapshots (computed_at DESC);
```

Cron diario inserta un snapshot 0:00.

## Recommendations engine

```ts
function buildRecommendations(criteria, byModule): Recommendation[] {
  const recs = [];
  for (const c of criteria.filter(c => c.status !== 'ok')) {
    if (c.id === 'kb_coverage') {
      for (const [mod, modData] of Object.entries(byModule)) {
        if (modData.criteria.find(cc => cc.id === 'kb_coverage')?.status !== 'ok') {
          recs.push({
            criterionId: 'kb_coverage', module: mod,
            message: `KB Coverage bajo en ${mod}. Publicá 3-5 artículos sobre casos típicos.`,
            ctaHref: `/knowledge?module=${mod}&new=1`, ctaLabel: 'Crear KB',
            estimatedImpact: 3,
          });
        }
      }
    }
    // ... etc por criterion
  }
  return recs.sort((a, b) => (b.estimatedImpact ?? 0) - (a.estimatedImpact ?? 0));
}
```

## Gotchas

- Cómputo full puede demorar segundos en tenants grandes. Cache 5 min recommendado.
- Snapshots diarios pueden inflar tabla — TTL 13 meses (rolling year + 1 month).
- Si no hay datos suficientes (tenant nuevo) → `globalScore = 0` y level `not_ready`. UI muestra mensaje "necesitás al menos 50 incidentes para medir".
- Pesos de criteria son hardcoded — ajustables solo en código por ahora.

## Roadmap

- UI editor de thresholds + weights por tenant.
- Webhook alertas cuando globalScore baja >10 puntos en 7d.
- Recomendaciones IA (LLM analiza el report y sugiere acciones priorizadas).
- A/B de configuraciones de agente y impacto en readiness.
- Export PDF del report.
