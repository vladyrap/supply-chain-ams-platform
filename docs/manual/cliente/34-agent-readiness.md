# 📈 Agent Readiness · Manual cliente

> **Ruta:** `/agent-readiness` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Dashboard que mide qué tan listo está tu agente IA para producción. Score 0-100 con 8-10 criterios:

- **Knowledge coverage**: ¿hay KB en módulos críticos?
- **Playbook coverage**: ¿hay playbooks para casos top?
- **Feedback ratio**: ¿% 👍 vs 👎 saludable?
- **Confidence average**: ¿el agente responde con confianza alta?
- **Latency p95**: ¿responde rápido?
- **Cost per resolved**: ¿el costo por ticket resuelto está bajo control?
- **Escalation rate**: ¿% de derivaciones a humano razonable?
- **QA approval rate**: ¿% de respuestas aprobadas por QA?

Cada criterio con sub-score + razones + acciones recomendadas.

## Cuándo abrirlo

- Antes de un go-live con cliente nuevo
- Review mensual de salud del agente
- Cuando decisís activar agente en otro módulo SAP
- Para justificar inversión en mejoras de KB/training

## Cómo usar

### Tile principal

Score global 0-100:
- 🟢 80-100: Production ready
- 🟡 60-79: Casi listo, mejoras menores
- 🟠 40-59: Necesita training
- 🔴 0-39: No usar en producción aún

### Breakdown por criterio

| Criterio | Score | Threshold | Status |
|---|---|---|---|
| KB Coverage | 72/100 | >70 | ✅ |
| Playbook Coverage | 45/100 | >60 | ⚠️ |
| Feedback Ratio | 88% 👍 | >80% | ✅ |
| Confidence Avg | 0.75 | >0.70 | ✅ |
| Latency p95 | 2.3s | <3s | ✅ |
| Cost/resolved | USD 0.18 | <USD 0.25 | ✅ |
| Escalation rate | 32% | <40% | ✅ |
| QA approval | 91% | >85% | ✅ |

### Acciones recomendadas

Por cada criterio en amarillo/rojo, el sistema sugiere:
- "Playbook Coverage bajo en SD → crear playbooks O2C devolución"
- "KB Coverage bajo en MM → publicar 5 artículos más sobre MIGO"

Click → te lleva al módulo respectivo con prefill.

### Drill-down por módulo

- Vista matriz módulos × criterios
- Cells coloreadas según score
- Click en cell → ver detalle

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Ver |
| AMS_CONSULTANT | No |
| CLIENT_USER | No |
| GENERAL_USER | No |

## Qué se guarda

Backend:
- Cómputo on-the-fly desde múltiples tablas
- Histórico de readiness scores en `agent_readiness_snapshots` (snapshot diario para trend)

## Limitaciones

- Thresholds default, ajustables solo en código por ahora (roadmap UI editor)
- Sin alertas automáticas cuando score baja (roadmap webhook)
- Cobertura por módulo asume catálogo Scope Items completo
