# Agent Readiness Center

Panel embebido en `/dashboard` que muestra cuán "listo" está el agente para
operar **por módulo SAP**, con score 0-100 y breakdown por categoría.

## Componentes

| Archivo | Rol |
|---|---|
| `src/utils/agent-readiness-engine.ts` | Cálculo del score |
| `src/components/readiness/AgentReadinessCenter.tsx` | Grid de módulos |
| `src/components/readiness/ReadinessModuleCard.tsx` | Card por módulo |
| `src/components/readiness/ReadinessScore.tsx` | Anillo SVG con score |

## Fórmula

```
score (0-100) = knowledge (0-35) + qa (0-20) + tests (0-15) + scope (0-15) + lowGaps (0-15)
```

Donde:
- **knowledge:** publicado, techo 8 artículos
- **qa:** pares Q&A aprobados, techo 20
- **tests:** casos de prueba, techo 10
- **scope:** ratio scope items con KB/Q&A sobre total
- **lowGaps:** 15 si 0 gaps críticos, 0 si 5+ gaps

## Estados

| Score | Estado | Color |
|---|---|---|
| ≥ 85 | READY | verde |
| 65 – 84 | HIGH | cyan |
| 40 – 64 | MEDIUM | amarillo |
| < 40 | LOW | rojo |

## Hints contextuales

Cada card muestra una recomendación principal:
- "Publicar más artículos de KB para este módulo."
- "Validar más Q&A aprobadas."
- "Generar más casos de prueba."
- "Cubrir más Scope Items con conocimiento."
- "Cerrar brechas críticas abiertas."

## Fuentes de datos

| Campo | Hook |
|---|---|
| Knowledge publicado por módulo | `useAgentTraining().knowledge` |
| Q&A aprobado (vinculado al knowledge) | `useAgentTraining().qa` (filtro por `knowledgeItemId` → `module`) |
| Casos de prueba | `useTestingIntelligence().scenarios` |
| Scope items + cobertura | `useScopeItems()` (backend `/api/scope-items`) |
| Brechas críticas | `useAgentTraining().gaps` (priority HIGH/CRITICAL, OPEN/IN_PROGRESS) |

## Limitaciones

- Si un módulo no tiene scope items en el catálogo, su componente `scope` es 0.
- Los pesos son fijos — no se pueden recalibrar sin tocar el código.

## Roadmap

- Comparar versión actual con versión previa del agente y mostrar delta.
- Alertas cuando un módulo pasa de READY a HIGH (regresión).
- Plan de mejora auto-generado: "para subir MM de MEDIUM a HIGH publica X knowledge, valida Y Q&A".
