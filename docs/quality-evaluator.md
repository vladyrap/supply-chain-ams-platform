# Quality Evaluator

## Objetivo
**Evaluación humana estructurada** de cada respuesta del agente AMS. Ciclo de mejora continua: detectar alucinaciones, marcar respuestas convertibles en conocimiento y medir madurez por módulo.

## Criterios evaluados
- **Precisión** (1-5) · ¿la información es correcta?
- **Utilidad** (1-5) · ¿le sirvió al usuario?
- **Claridad** (1-5) · ¿se entiende bien?
- **Completitud** (1-5) · ¿cubre todo lo necesario?
- **Riesgo de alucinación** · LOW / MEDIUM / HIGH
- **Nivel técnico** · TOO_SIMPLE / ADEQUATE / TOO_TECHNICAL

## Flags adicionales
- 👤 Necesita revisión humana
- 🎓 Puede convertirse en conocimiento
- ✅ Fue útil para el cliente
- 📤 Requiere escalamiento

## Pantallas
- **📊 Dashboard**: scores promedio + barras + top módulos con baja calidad
- **⏳ Por evaluar**: lista de incidentes con respuesta del agente sin evaluación
- **📜 Todas**: histórico de evaluaciones + exportar CSV

## Modelo
```ts
AgentEvaluation {
  id, incidentId, responseText,
  evaluator, role,
  accuracyScore, usefulnessScore, clarityScore, completenessScore, // 1-5
  hallucinationRisk, technicalLevelFit,
  needsHumanReview, canBecomeKnowledge, wasUsefulForClient, requiresEscalation,
  comments, createdAt
}
```

## Integración cruzada
- Desde la evaluación se puede convertir directo en conocimiento (botón "🎓 → conocimiento")
- Marcar `canBecomeKnowledge` flagea el incidente para conversión
- Datos alimentan el KPI "Score promedio del agente" del dashboard

## Roles
| Rol | Permisos |
|---|---|
| ADMIN | full |
| SERVICE_LEAD | view + create + edit + export + approve |
| AMS_CONSULTANT | view + create + edit |
| CLIENT_USER | sin acceso |
| GENERAL_USER | sin acceso |

## Storage
- `supply-chain-ams-agent-evaluations`

## Métricas calculadas
- `avgAccuracy / avgUsefulness / avgClarity / avgCompleteness`
- `pctHighRisk` · % evals con riesgo de alucinación HIGH
- `pctNeedsReview` · % evals que requieren revisión
- `pctCanBecomeKnowledge` · % evals convertibles → fuente para training
- `topModulesLowQuality` · top 5 módulos SAP con score promedio bajo

## Roadmap
- Fase 2: persistir en Postgres + correlación con `qa_eval_runs` del backend training
- Fase 3: si una evaluación marca riesgo HIGH → notificar a líder automáticamente
- Fase 4: comparar evaluaciones humanas vs juicios de Gemini para calibrar el modelo juez
