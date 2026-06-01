# 🏅 Quality Evaluator · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/quality-evaluator/page.tsx` | Page con RBAC |
| `src/components/quality/QualityEvaluatorCenter.tsx` | Center principal |
| `src/components/quality/QualityDashboard.tsx` | Métricas + gráficos |
| `src/components/quality/EvaluationForm.tsx` | Modal form con TcModalShell |
| `src/components/quality/QualityQuickAction.tsx` | Wrapper para Command Center |
| `src/hooks/useQualityEvaluator.ts` | Hook + localStorage |
| `src/types/ams-modules.ts` | `AgentEvaluation`, `HallucinationRiskLevel`, `TechnicalLevelFit` |

## Tipo

```ts
interface AgentEvaluation {
  id: string;
  incidentId: string | null;
  responseText: string;
  evaluator: string;
  role: string;
  accuracyScore: number;         // 1-5
  usefulnessScore: number;
  clarityScore: number;
  completenessScore: number;
  hallucinationRisk: "LOW" | "MEDIUM" | "HIGH";
  technicalLevelFit: "TOO_SIMPLE" | "ADEQUATE" | "TOO_TECHNICAL";
  needsHumanReview: boolean;
  canBecomeKnowledge: boolean;
  wasUsefulForClient: boolean;
  requiresEscalation: boolean;
  comments: string;
  createdAt: string;
}
```

## API del hook

```ts
const quality = useQualityEvaluator();

quality.evaluations             // AgentEvaluation[]
quality.metrics                 // { count, avgAccuracy, avgUsefulness, ..., pctHighRisk }

quality.createEvaluation(input)  → AgentEvaluation
quality.updateEvaluation(id, patch)
quality.deleteEvaluation(id)
quality.exportCsv()             → string CSV
```

## Storage

LocalStorage: `supply-chain-ams-evaluations`.

Sin sync backend hoy (planeado tabla `agent_evaluations`).

## QualityQuickAction

```tsx
<QualityQuickAction incident={incidentLike} variant="full" />
```

Lógica:
1. Si existe evaluación para `incident.id` → muestra badge con score promedio (`🏅 4.5/5`).
2. Si NO hay respuesta del agente (`!incident.response`) → botón disabled con tooltip "clasificá primero".
3. Si hay respuesta y no evaluación → botón habilitado, abre `EvaluationForm`.
4. Al guardar → registra audit `QUALITY_EVALUATED`.

## Polish feedback loop

Las evaluaciones alimentan `backend/src/services/training/polish.service.ts`:

```ts
// Cada vez que se ejecuta polish:
// 1. Trae últimas 100 evaluaciones
// 2. Cruza con agent_response_provenance para saber qué KI/Q&A se usaron
// 3. Si accuracyScore <= 2 || hallucinationRisk === "HIGH" → decrementa score del KI/Q&A
// 4. Si accuracyScore >= 4 → incrementa
```

## Métricas

`quality.metrics` se calcula on-the-fly:

```ts
{
  count: evaluations.length,
  avgAccuracy: mean(e.accuracyScore),
  avgUsefulness: mean(e.usefulnessScore),
  avgClarity: mean(e.clarityScore),
  avgCompleteness: mean(e.completenessScore),
  pctHighRisk: count(hallucinationRisk === "HIGH") / count * 100,
  pctCanBecomeKnowledge: count(canBecomeKnowledge === true) / count * 100,
  // ...
}
```

## Roadmap

- Backend persistence (tabla `agent_evaluations`).
- Notificación al consultor cuando su respuesta tiene eval baja.
- Gamification: leaderboard, badges.
- A/B testing entre versiones del agente con quality como métrica.
