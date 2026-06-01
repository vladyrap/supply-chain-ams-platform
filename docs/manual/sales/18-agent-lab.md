# 🧪 Agent Lab · Manual de venta

> **Tu agente IA aprende cada día. Sin redeploys. Sin data scientists.**

## El pitch en 30 segundos

> "El agente no es estático. Tu equipo marca 👍/👎, vos curás casos brillantes a KB, ajustás el prompt en un playground con A/B inmediato, y replays cada conversación turn-by-turn para entender exactamente dónde se desvió. **Es MLOps para agente AMS sin contratar 3 PhDs.**"

## Demo de 90 segundos

1. Abrir `/agent-lab`.
2. Tab Feedback → mostrar 50 marcas 👍/👎 del equipo en últimos 7d.
3. Click en uno 👎 → abre Replay → mostrar turn-by-turn con sources RAG por mensaje.
4. Identificar el turn donde el agente alucinó → "ah, no usó el doc correcto".
5. Tab Casos para curar → mostrar 8 tickets con alta confianza + 👍.
6. Click "Convertir a KB" → Wizard genera draft → editás → publicás.
7. Tab Playground → editás el prompt para que SIEMPRE cite el módulo SAP → corres con 10 queries → ver diff v1 vs v2.
8. Click "Adoptar" → ahora producción usa v2.

## Killer features

| Feature | Valor |
|---|---|
| **Feedback inline 👍/👎** | Captura en chat, mesa, voz |
| **Replay con trace completo** | Prompts, sources, latency, tokens por turn |
| **Casos para curar** | El sistema detecta KB potencial |
| **Wizard KB** | Draft auto-generado editable |
| **Prompt Playground** | A/B en sandbox antes de adoptar |
| **Versionado de prompts** | Quien adoptó, cuándo, métricas |
| **Sin redeploy** | Cambios LIVE en segundos |
| **Sin data scientist** | UI clara, no notebooks |

## ROI

### Caso mejora continua
- **Sin sistema**: agente IA se contrata, se va degradando porque no se ajusta, 6 meses después es peor que al inicio
- **Con sistema**: ciclo semanal de feedback → curar → ajustar prompt → +5% precisión mensual
- **Mejora compuesta**: agente que mejora vs agente que decae

### Caso debug crítico
- Consultor: "el agente le dijo al cliente que cierre PRD"
- **Sin sistema**: terror, no podés reproducir, no sabés qué prompt usó
- **Con sistema**: replay turn por turn, ves exactamente qué prompt + qué sources + qué temperatura → fix inmediato
- **Mitigación riesgo**: invaluable

### Caso KB scaling
- 200 incidentes/mes resueltos por el agente, solo 5 se publican como KB por flojera
- **Sin sistema**: KB queda chico, agente sigue tropezando con lo mismo
- **Con sistema**: cada semana el lead cura 10 casos brillantes a KB en 30 min
- **KB growth**: 10x vs sin sistema

### Caso prompt engineering
- "Quiero que el agente SIEMPRE pida módulo SAP antes de responder"
- **Sin sistema**: pides al dev que edite código, redeploy, esperás
- **Con sistema**: 5 min en Playground, validás con queries reales, adoptás
- **Ciclo iteración**: 5 min vs 2 días

## Objeciones

### "Esto es para data scientist"
> "NO. Diseñado para Service Lead / Senior consultor. La curación es 'leer y aprobar', el playground es 'editar texto y comparar respuestas'. Cero código, cero notebooks."

### "Y el A/B testing real en producción?"
> "Hoy no — adopción es full instant. Roadmap incluye canary (5% tráfico) con auto-rollback si métricas se degradan. Mientras tanto, hacelo en horario bajo y monitoreá."

### "¿Cuántos feedback necesito para mejorar?"
> "50-100 marcas 👍/👎 te dan señal estadísticamente útil. Con 200 podés identificar patrones por módulo. El sistema ya te muestra stats por source/módulo desde el día 1."

## Frases que funcionan

- *"Tu agente aprende cada semana. Mientras la competencia tiene un agente fosilizado."*
- *"Cada respuesta mala se debugea en 30 seg con Replay. No te jugás a adivinar."*
- *"Editás el prompt y ves la mejora ANTES de adoptarlo. Cero downside."*
- *"MLOps de agente IA sin contratar 3 PhDs."*
