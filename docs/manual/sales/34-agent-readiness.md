# 📈 Agent Readiness · Manual de venta

> **¿Tu agente está listo para producción? Score 0-100 dice sí o no.**

## El pitch en 30 segundos

> "Antes de soltar tu agente IA al cliente real, **medilo**. 8 criterios objetivos: KB coverage, playbook coverage, feedback 👍/👎, confianza media, latencia p95, costo por ticket, % escalación, % QA aprobado. **Score 0-100**. Si está en rojo, el sistema te dice EXACTAMENTE qué hacer para mejorar."

## Demo de 60 segundos

1. Abrir `/agent-readiness`.
2. Tile grande: 78/100 → "Casi listo" (amarillo).
3. Breakdown: 6/8 verdes, 2 amarillos (Playbook coverage 45% y QA approval 78%).
4. Click "Playbook coverage" → ver matriz por módulo, MM al 30%.
5. Click recomendación "Crear 3 playbooks MM Procure to Pay" → te lleva a /playbooks con prefill.
6. Switch a tab "Tendencia" → ver score subiendo de 65 a 78 en últimos 60d.

## Killer features

| Feature | Valor |
|---|---|
| **Score global 0-100** | Decisión binaria: ¿soltamos a producción? |
| **8 criterios objetivos** | No es opinion, es métrica |
| **Recomendaciones priorizadas** | "Hacé X y subís 5 puntos" |
| **Matriz por módulo** | Sabés QUÉ módulo necesita trabajo |
| **Tendencia histórica** | Mejora visible mes a mes |
| **Snapshots diarios** | Trend confiable |

## ROI

### Caso go-live nuevo cliente
- **Sin sistema**: soltás el agente en PRD, cliente reporta 10 issues primera semana, reputación dañada
- **Con sistema**: medís → 62 (no listo) → mejorás 2 semanas → score 84 → soltás
- **Mitigación churn cliente**: invaluable

### Caso justificación inversión en KB
- Lead pide presupuesto para 2 técnicos curadores
- **Sin sistema**: argumento abstracto
- **Con sistema**: "hoy estamos 78, con 50 KBs más subimos a 87, costo ROI X meses"
- **Approval probability**: +40%

### Caso review trimestral
- Sponsor: "¿está mejorando el agente?"
- **Sin sistema**: respuesta cualitativa
- **Con sistema**: tendencia 65 → 78 en Q4 → "+13 puntos por sprint de training"
- **Trust**: +30% en sponsor satisfaction

### Caso expansión a nuevo módulo
- "¿activamos el agente en EWM?"
- **Sin sistema**: prueba/error
- **Con sistema**: vista matriz, EWM con KB coverage 20% → "no aún, primero curá KB"
- **Evita prematurely launching**: -50% in falsos starts

## Objeciones

### "¿Por qué un score y no las métricas crudas?"
> "Porque el sponsor NO mira 8 métricas. Mira 1 número. El score las combina con pesos sensatos (KB+playbook+escalation pesan más que latencia). Si querés las crudas, expandís el breakdown."

### "¿Quién pone los thresholds?"
> "Defaults sensatos (KB coverage >70%, latency <3s, etc.). Hoy editables en código, roadmap UI por tenant. Si tu cliente tiene SLA distinto, podemos ajustar."

### "El agente puede ser 95 y aún equivocarse"
> "Cierto. Es un score AGREGADO, no garantía. Pero te dice 'es razonable producirlo' vs 'no'. La diferencia entre 40 y 85 es enorme. La diferencia entre 85 y 95 es marginal."

## Frases que funcionan

- *"¿Producir o no producir? Score arriba de 80, sí. Abajo, no."*
- *"8 criterios objetivos. Cero opinion. Cero pelea con cliente."*
- *"Recomendación específica: 'creá 3 playbooks MM' → +5 puntos."*
- *"Tendencia que muestra que invertir en training paga."*
