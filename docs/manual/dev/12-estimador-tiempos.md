# ⏱ Estimador de Tiempos · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/time-estimator/page.tsx` | Page con RBAC |
| `src/components/estimation/TimeEstimatorCenter.tsx` | Center principal |
| `src/components/estimation/TicketEstimateBadge.tsx` | Badge compacto |
| `src/components/estimation/TicketEstimateSummary.tsx` | Resumen card |
| `src/components/estimation/TicketEstimateDetail.tsx` | Detalle full con timeline + diff + ajuste manual |
| `src/components/estimation/TicketEstimateTimeline.tsx` | Timeline de fases |
| `src/components/estimation/EstimateExplainabilityCard.tsx` | Factores ↑/↓ |
| `src/components/estimation/RecalculateEstimateButton.tsx` | Recalcular |
| `src/components/estimation/ManualEstimateAdjustmentModal.tsx` | Ajuste manual con razón |
| `src/hooks/useTimeEstimator.ts` | Hook estado + localStorage |
| `src/utils/time-estimator-engine.ts` | Engine determinístico |
| `src/utils/ticket-factory.ts` | buildEstimateInputFromIncident, recalculateTicketEstimate, applyManualAdjustment |
| `src/utils/auto-estimate-engine.ts` | autoEstimateTicketResolution (al crear ticket) |
| `src/utils/estimate-explainability-engine.ts` | Parser de appliedRules → ↑/↓ |
| `src/types/estimation.ts` | TimeEstimate, EstimatePhase, etc. |
| `backend/src/services/ticket.service.ts` | Persiste estimatedResolution con el ticket |

## Tipos núcleo

```ts
interface TimeEstimate {
  id: string;
  title: string; description: string;
  sourceType: EstimateSourceType;  // manual/incident/scope_item/playbook/agent_chat/testing_scenario
  sourceId: string | null;
  sapModule: string; process: string; subProcess?: string;
  scopeItemIds: string[];
  estimateType: EstimateType;
  complexity: ComplexityLevel;     // VERY_LOW..VERY_HIGH/UNKNOWN
  severity: SeverityLevel; urgency: UrgencyLevel;
  environment: EnvironmentLevel;
  serviceLevel: string;

  // Booleanos que pegan en el cálculo
  requiresDevelopment: boolean;
  requiresIntegration: boolean;
  requiresTransport: boolean;
  requiresUAT: boolean;
  requiresApproval: boolean;
  hasDocumentation: boolean;
  hasPlaybook: boolean;
  hasPublishedKnowledge: boolean;
  isProductive: boolean;
  isRepeatedIncident: boolean;

  // Resultado
  estimatedMinHours: number; estimatedMaxHours: number;
  estimatedMinDays: number; estimatedMaxDays: number;  // 8h/día
  estimatedWeeks: number;
  confidence: ConfidenceLevel; confidenceScore: number;  // 0..100

  // Cualitativos
  assumptions: string[]; risks: string[]; dependencies: string[];
  missingData: string[]; requiredProfiles: RequiredProfile[];
  phaseBreakdown: EstimatePhase[];
  suggestedPlan: string;             // Markdown
  clientResponse: string;
  internalNotes: string;

  status: EstimateStatus;
  createdBy: string; createdAt: string; updatedAt: string;
  appliedRules?: AppliedRule[];      // para explicabilidad
}

interface EstimatePhase {
  id: string; name: string; description: string;
  minHours: number; maxHours: number;
  ownerProfile: RequiredProfile;
  dependencies: string[];
  deliverables: string[];
  risks: string[];
}

interface AppliedRule {
  ruleId: string;
  description: string;       // "Severidad CRITICAL +2.5x"
  multiplier?: number;
  hoursDelta?: number;
  confidenceDelta?: number;
}
```

## Engine

```ts
// src/utils/time-estimator-engine.ts
estimateTime(input: TimeEstimateInput): TimeEstimate
```

Algoritmo (resumen):
1. **Base hours** según `estimateType` (Incident=2-8, Change=8-40, Development=40-160, etc.)
2. **Multiplicadores**:
   - Complexity (VERY_LOW=0.5x .. VERY_HIGH=3x)
   - Severity (CRITICAL +20%)
   - Urgency (IMMEDIATE +30%)
   - Environment (PRD +15% por riesgo)
3. **Adders**:
   - requiresDevelopment +20-40h
   - requiresIntegration +16-32h
   - requiresUAT +8h
   - requiresTransport +2h
4. **Reducers**:
   - hasPlaybook -30%
   - hasPublishedKnowledge -20%
   - isRepeatedIncident -40%
5. **Confidence**:
   - +30 si hay scope items
   - +20 si hay playbook
   - -25 si complexity=UNKNOWN
   - -15 si severity desconocida
   - clamp [0..100]
6. **Profiles requeridos** según booleanos
7. **Fases** ensambladas según estimateType + booleanos

Cada ajuste queda registrado en `appliedRules`.

## Hook API

```ts
const est = useTimeEstimator();

est.estimates;                                  // TimeEstimate[]

est.createFromInput(input);                     // genera nueva con engine
est.createFromIncident(incident);
est.createFromScopeItem(scopeItemId);

est.updateEstimate(id, patch);
est.deleteEstimate(id);

est.review(id, by);                             // → REVIEWED
est.approve(id, by);                            // → APPROVED
est.reject(id, by, reason);                    // → REJECTED
est.export(id);                                 // → EXPORTED
```

## ticket-factory utils

```ts
buildEstimateInputFromIncident(incident): TimeEstimateInput
recalculateTicketEstimate(ticket, input): { estimatedResolution }
applyManualAdjustment(estimate, patch, by, reason): TimeEstimate
```

`applyManualAdjustment` registra un evento en `events: [{ type: 'manual_adjustment', by, reason, patch, ts }]`.

## Auto-estimate al crear ticket

```ts
// src/utils/auto-estimate-engine.ts
autoEstimateTicketResolution(ticket): TimeEstimate
```

Llamado en `backend/src/services/ticket.service.ts::createTicket()`. Resultado guardado en `tickets_demo.estimated_resolution jsonb`.

## Storage

```
supply-chain-ams-time-estimates → TimeEstimate[]
```

Estimaciones de tickets viven en `tickets_demo.estimated_resolution jsonb` en backend.

## Explicabilidad

`EstimateExplainabilityCard` lee `estimate.appliedRules` y los separa en:
- **↑ Subieron horas**: multipliers > 1 + positive hoursDelta
- **↓ Bajaron horas**: multipliers < 1 + negative hoursDelta
- **Confianza**: confidenceDelta agrupados

Permite al consultor justificar al cliente CADA hora estimada.

## Gotchas

- `complexity: UNKNOWN` penaliza confianza fuerte. Conviene pedir al usuario que la setee.
- `serviceLevel` no mueve horas pero sí texto del clientResponse.
- Las fases se generan templated — se pueden editar libremente luego.
- `appliedRules` no se serializa si la estimación se crea pre-versión que lo introdujo. Compat: legacy estimates simplemente no muestran explicabilidad.

## Roadmap

- ML basado en histórico (qué tan acertadas fueron estimaciones pasadas)
- Multi-currency para costeo + tarifa por perfil
- Export a Excel/PDF del breakdown
- Comparativa: "esta estimación vs casos similares pasados"
- Backend tabla `time_estimates` para sync multi-device
