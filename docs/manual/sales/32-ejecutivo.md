# 📊 Vista Ejecutiva · Manual de venta

> **La pantalla que mira tu sponsor. Y le hace decir 'sigan'.**

## El pitch en 30 segundos

> "El CIO/CFO de tu cliente NO quiere ver tickets. Quiere ver: '¿cuánta gente ahorré? ¿cuánto cuesta esto? ¿está mejorando?'. Esta pantalla responde las 3 con tiles de KPIs + tendencia + top temas + tokens + costo USD del período. **7d / 30d / 90d / 365d. Renovación de contrato gana.**"

## Demo de 60 segundos

1. Abrir `/executive` en pantalla compartida con sponsor.
2. Default 30d → mostrar tiles: 1.247 interacciones (+18% vs 30d previos), 68% resueltas IA, TTR 4.2h, USD 187 en tokens.
3. Mostrar trend chart: línea ascendente.
4. Top temas: MM (32%), SD (24%), PP (18%).
5. Top clientes: ACME (40%), TechCorp (25%).
6. Switch a 90d → ver tendencia trimestral.
7. Sponsor: "ok, sigan así".

## Killer features

| Feature | Valor |
|---|---|
| **KPIs con delta** | "+18% vs período previo" es lo que importa |
| **4 ranges (7d/30d/90d/365d)** | Cubre weekly review hasta yearly |
| **Resolución IA vs humano** | Justifica la inversión en agente |
| **Costo USD real** | Tokens × precio = transparencia total |
| **Top temas + clientes** | Insights de dónde se invierte esfuerzo |
| **TTFR + TTR** | SLA visibles, no abstractos |
| **Sin clic adicional** | Una pantalla, todo |

## ROI

### Caso renovación contrato
- **Sin sistema**: armás Excel con datos sueltos, 1 día de trabajo
- **Con sistema**: abrís pantalla, screenshot, mandás al sponsor
- **Ahorro**: 8 horas por sponsor por trimestre

### Caso pitch financial
- CFO pregunta "¿cuánto me cuesta el agente?"
- **Sin sistema**: estimación a ojo
- **Con sistema**: tile "USD 187 este mes, USD 12.4 por ticket resuelto por IA"
- **Credibilidad**: invaluable

### Caso comparativa períodos
- "¿estamos mejor que el trimestre pasado?"
- **Sin sistema**: armás comparativa manual
- **Con sistema**: range 30d + delta vs 30d previo, instantáneo
- **Decisión informada**: rápida

### Caso budget alert
- Vamos consumiendo más tokens este mes
- **Sin sistema**: te enterás cuando te cobran caro
- **Con sistema**: monitoreás semanalmente, ajustás modelos si conviene
- **Optimización costo**: -20-30% anual típico

## Objeciones

### "Ya tenemos Tableau / Power BI"
> "Perfecto. Esta pantalla NO compite. Es la vista 'rápida' built-in para conversaciones de pasillo. Para análisis profundo, exportá datos a tu BI (roadmap: export CSV/Power BI direct connector)."

### "¿Y la privacidad de los KPIs?"
> "Por rol. ADMIN ve todo, SERVICE_LEAD ve todo, CLIENT_USER ve SOLO sus propios datos. El sponsor del cliente ve solo lo suyo. Aislado por tenant."

### "¿Cómo se computa el costo?"
> "Cada llamada LLM se logea con `tokens_in × precio_in + tokens_out × precio_out`. Precios actualizados manualmente en cost-table. Si el proveedor cambia precios, históricos quedan con el precio del momento (correcto contablemente)."

## Frases que funcionan

- *"La pantalla que mira tu sponsor. Y le hace decir 'sigan'."*
- *"Tokens × precio = transparencia. No estimación, dato real."*
- *"4 tiles que renuevan tu contrato."*
- *"De 30d a 365d con un click. Decisión inversión informada."*
