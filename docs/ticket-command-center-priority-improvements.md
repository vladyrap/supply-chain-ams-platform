# Ticket Command Center · 5 mejoras prioritarias

5 capacidades integradas en la pantalla **`/tickets`** sin crear módulos
nuevos. Todo orquestador sobre los hooks/componentes que ya existían.

## 1. Ticket Command Center completo

**Componente:** `src/components/tickets/TicketCommandCenter.tsx`

Al seleccionar un ticket, el panel derecho muestra el ciclo completo:
header → Next Best Action + Readiness Score → 14 secciones colapsables
(resumen, estimación + explicabilidad, clasificación, análisis visual,
conocimiento, scope items, playbook, escalación, Jira/SN, documentos,
testing, quality, conversión a KB, auditoría).

Cada sección **orquesta** el módulo correspondiente vía QuickActions
embebidos — NO duplica lógica:
- `EscalationQuickAction` (existente)
- `KnowledgeQuickActions` (existente)
- `DocumentFactoryQuickAction`
- `TestingQuickAction`
- `QualityQuickAction`
- `PlaybookQuickAction`

## 2. Next Best Action

**Componente:** `src/components/tickets/TicketNextBestAction.tsx`
**Engine:** `src/utils/ams-decision-engine.ts::analyzeTicketDecision()`

Card destacada al tope del Command Center que pinta el **top action** del
Decision Engine (con 13 reglas v2). Botones secundarios muestran las
acciones #2-#4. Cada click dispara `executeQuickAction()` que invoca el
QuickAction correspondiente.

Si Ticket Readiness < 50% y la acción no es `REQUEST_MORE_INFO`, muestra
hint sugiriendo mejorar info primero.

## 3. Explicabilidad de ETA

**Engine:** `src/utils/estimate-explainability-engine.ts::buildEstimateExplanation()`
**Componente:** `src/components/estimation/EstimateExplainabilityCard.tsx`

Lee el `appliedRules` que el estimador YA guarda en cada
`TicketEstimatedResolution` y lo decodifica en dos columnas:

- ↑ **Factores que aumentan ETA**: bumps `+Xh`, multiplicadores >1, missing data, ambiente PRD, prioridad High.
- ↓ **Factores que reducen ETA**: discounts pct (playbook, recurrente), análisis visual aportado, ambiente DEV/QA.

Cada factor lleva categoría (requirements / context / confidence / knowledge / data) e impacto display (`+16/+80h`, `×0.85`).

Se monta **junto** a `TicketEstimateDetail` — no lo reemplaza.

## 4. Ticket Readiness Score

**Engine:** `src/utils/ticket-readiness-engine.ts::calculateTicketReadiness()`
**Componente:** `src/components/tickets/TicketReadinessScore.tsx`

Score 0-100 sobre 10 criterios:

| # | Criterio | Pts |
|---|---|---:|
| 1 | Título ≥ 10 chars | 10 |
| 2 | Descripción ≥ 80 chars | 15 |
| 3 | Prioridad explícita (≠Medium) | 5 |
| 4 | Ambiente definido | 10 |
| 5 | Módulo SAP definido | 10 |
| 6 | Proceso/subproceso identificado | 10 |
| 7 | Transacción SAP detectada en texto o imagen | 10 |
| 8 | Mensaje de error informado | 10 |
| 9 | Documento SAP (OC, pedido, IDoc, etc.) | 10 |
| 10 | Evidencia visual o comentario | 10 |

**Estados:** LOW <40 · MEDIUM 40-69 · HIGH 70-89 · READY ≥90.

Cada criterio faltante tiene `fixHint` y `scrollTargetId`. Click en el
ítem hace scroll suave a la sección del Command Center que arregla ese
criterio (`section-summary`, `section-header`, `section-classification`,
`section-visual`).

El Decision Engine **lee este score** para condicionar recomendaciones
(no escalar si readiness <50 salvo crítico).

## 5. Demo guiada end-to-end ejecutable

**Componente:** `src/components/demo/GuidedAmsDemo.tsx`
**Disparador:** botón "🎬 Ejecutar demo completa" en el toolbar de `/tickets`.

Modal con 13 pasos REALES (no navegacionales):

1. Crear ticket demo MIGO/MM con tag `[DEMO_GUIADA]`
2. Mostrar autoestimación recibida del backend
3. Calcular Readiness Score
4. Clasificar con **Agente Gemini real** (POST `/api/tickets/:key/classify`)
5. Identificar Next Best Action
6. Recomendar playbook + iniciar ejecución
7. Simular escalación N2 (audit only)
8. Crear Jira demo (audit only)
9. Generar RCA real con `useDocumentFactory.generate()` — queda asociado al ticket
10. Crear caso de prueba real con `useTestingIntelligence.createScenario()` — queda asociado
11. Marcar para Knowledge (audit, wizard real opcional)
12. Crear evaluación real con `useQualityEvaluator.createEvaluation()`
13. Mostrar valor económico calculado con `calculateBusinessValue()`

Cada paso registra audit event `DEMO_STEP_COMPLETED`. Al final
`DEMO_COMPLETED` con el resumen de valor.

**Modos de ejecución:**
- `▶ siguiente paso` — paso a paso (cliente puede explicar cada uno)
- `⏵⏵ ejecutar todo` — automático con delay 800ms entre pasos
- `↺ reiniciar` — vuelve al inicio sin tocar lo creado

**Datos demo persistidos** llevan `[DEMO_GUIADA]` en el título y se
pueden filtrar/eliminar en /tickets, /document-factory, etc.

## Cómo se integran con módulos existentes

| Capacidad | Reusa de |
|---|---|
| NBA buttons | `EscalationQuickAction`, `DocumentFactoryQuickAction`, `TestingQuickAction`, `QualityQuickAction`, `KnowledgeQuickActions`, `PlaybookQuickAction` |
| Readiness scroll | Section IDs en `TicketCommandCenter` |
| Explainability | Lee `estimatedResolution.appliedRules` que el engine YA guarda |
| Demo crea | `createTicket()`, `classifyTicket()`, `useDocumentFactory`, `useTestingIntelligence`, `useQualityEvaluator`, `usePlaybooks`, `useTicketAudit`, `useEscalation` |
| Audit | `useTicketAudit.record()` con tipos `DEMO_STARTED/STEP_COMPLETED/COMPLETED` agregados al enum existente |
| Valor económico | `calculateBusinessValue()` existente |

## Qué NO se duplica

- ❌ No hay segundo Decision Engine
- ❌ No hay segundo estimador
- ❌ No hay segunda pantalla de Tickets
- ❌ No hay nueva tabla DB
- ❌ No hay backend nuevo
- ❌ No hay endpoint nuevo
- ❌ No hay localStorage keys nuevas (los `DEMO_*` van al mismo `supply-chain-ams-ticket-audit-events`)

## Limitaciones demo conocidas

- Escalación N2 en la demo guiada es solo audit event — no abre el modal de escalación real (sería interactivo y rompería el flujo automático). El usuario puede escalar manualmente luego desde el Command Center.
- Knowledge en la demo guiada es audit event — el wizard `IncidentToKnowledgeWizard` requiere interacción humana para curar el contenido.
- Jira "demo" no llega a Jira real (a propósito — no hay credenciales productivas).
- El análisis visual no se ejecuta en la demo guiada (no hay imagen real). El feature funciona normalmente desde el modal Crear Ticket.

## Roadmap backend real

Cuando se conecten servicios productivos:
- Decision Engine v3 con segunda opinión LLM (compare reglas vs predicción y muestra divergencias).
- Audit Trail en tabla `ticket_audit_events` (hoy localStorage). El hook ya está abstraído.
- Endpoint `/api/integrations/jira/from-ticket/:key` para crear Jira real con `confirmReal:true`.
- Readiness Score predictivo: en lugar de criterios fijos, usar regresión sobre histórico (tickets que llegaron a 100% score → tiempo real de resolución).
