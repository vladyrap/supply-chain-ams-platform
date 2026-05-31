# AMS Decision Engine

Motor determinístico que, dado un ticket y su contexto, decide qué acción
recomendar al consultor AMS y qué "next-best-actions" priorizar.

## Objetivo

Que el sistema **no sea solo un visor**: el ticket debe tener una recomendación
visible permanentemente sobre qué hacer ahora ("Pedir más info", "Escalar N2",
"Generar RCA", etc.).

## Archivo

`src/utils/ams-decision-engine.ts`

## Función principal

```ts
analyzeTicketDecision(ticket, estimate, context): AmsDecisionResult
```

## Acciones recomendadas

12 tipos:

- `REQUEST_MORE_INFO` · pedir más datos
- `SUGGEST_SOLUTION` · sugerir solución
- `USE_PLAYBOOK` · seguir playbook
- `ESCALATE_N2` · escalar a N2
- `CREATE_JIRA` / `CREATE_SERVICENOW` · trazar en ITSM
- `GENERATE_RCA` · root cause analysis
- `CREATE_TEST_CASE` · caso de prueba para regresión
- `CONVERT_TO_KNOWLEDGE` · capitalizar como KB
- `CREATE_KNOWLEDGE_GAP` · abrir brecha de KB
- `CLOSE_WITH_DOCUMENTATION` · cerrar con doc adjunto
- `WAIT_FOR_USER_CONFIRMATION` · esperar al cliente

## Reglas implementadas (resumidas)

| # | Condición | Acción · Peso |
|---|---|---|
| 1 | confianza alta + knowledge | SUGGEST_SOLUTION · 90 |
| 2 | faltan datos (≥2 missing data o sin evidencia) | REQUEST_MORE_INFO · 85 |
| 3 | crítico + PRD | ESCALATE_N2 · 95 + CREATE_JIRA · 80 |
| 4 | sin knowledge | CREATE_KNOWLEDGE_GAP · 40 |
| 5 | resuelto | CONVERT_TO_KNOWLEDGE · 80 + CLOSE_WITH_DOC · 60 |
| 6 | resuelto + complejo (≥12h máx) | GENERATE_RCA · 70 |
| 7 | scope item aplicable | CREATE_TEST_CASE · 45 |
| 8 | playbook existe | USE_PLAYBOOK · 75 |
| 9 | baja confianza agente | ESCALATE_N2 · 60 |

El `recommendedAction` final es el de mayor peso, salvo override por
faltan-datos-críticos.

## Output

```ts
{
  recommendedAction: AmsRecommendedAction,
  shouldAskForMoreData: boolean,
  shouldEscalateN2: boolean,
  // ... 8 flags más
  confidence: "LOW" | "MEDIUM" | "HIGH",
  reasons: string[],
  nextBestActions: Array<{ action, label, reason, weight }>
}
```

## Contexto requerido

```ts
{
  hasKnowledgeMatch: boolean,
  hasPlaybook: boolean,
  hasScopeItem: boolean,
  scopeItems: SapScopeItem[],
  hasErrorEvidence: boolean,
  isResolved: boolean,
  isProductive: boolean,
  hasComplexSolution: boolean,
  agentConfidence?: "LOW" | "MEDIUM" | "HIGH" | "alta" | "media" | "baja" | null,
}
```

## Limitaciones

- Sin LLM — todo es regla. Es predecible pero no aprende.
- No mira histórico de tickets parecidos.
- No considera carga del equipo N2.
- Asume que `scopeItems` vienen pre-filtrados por el caller.

## Roadmap

- Sumar señal del histórico: "Tickets parecidos se resolvieron sin escalar el 80% de las veces".
- LLM-as-second-opinion: el motor decide, el LLM revisa y opina (sin pisar).
- Aprender de feedback humano: si un consultor ignora la recomendación, ajustar peso.
