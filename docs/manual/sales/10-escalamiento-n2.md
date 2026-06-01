# 🚨 Escalamiento N2 · Manual de venta

> **El especialista correcto. En el tiempo correcto. Con el contexto correcto.**

## El pitch en 30 segundos

> "Cuando N1 no puede, el sistema escala al especialista N2 correcto: el que tiene los skills, el que tiene capacidad, el que cubre ese módulo. Le llega el ticket **con todo el contexto** — la conversación previa, lo que el agente intentó, la estimación, los datos relevantes. **Cero handoff perdido. SLA medible.**"

## Demo de 90 segundos

1. Abrir ticket crítico en `/tickets`.
2. Sección Escalamiento → click "🚨 Escalar N2".
3. Mostrar el modal:
   - Sistema sugiere asignado (María Soto · MM · 60% workload)
   - Sistema sugiere SLA (4h para crítico PRD)
   - Sistema sugiere canal (Jira)
4. Confirmar → se crea `ESC-2026-042`.
5. Ir a `/escalation-n2` → tab "Historial" → mostrar el record con full context.
6. Si N2 ajusta complejidad: mostrar diff N1↔N2 lado a lado.

## Killer features

| Feature | Valor |
|---|---|
| **Asignación inteligente** | Mejor responsable por skill + módulo + workload |
| **SLA tracking + breach alert** | Visible en dashboard y mission control |
| **Contexto completo al N2** | Conversación + estimación + análisis visual + intentos previos |
| **Diff N1↔N2 cuando ajustan** | Trazabilidad del cambio de criterio |
| **3 canales: Jira / SN / Manual** | Funciona con tu ITSM actual o sin él |
| **Audit trail por evento** | Cada cambio queda registrado |
| **Reglas de auto-escalación** | "Crítico PRD + baja confianza = escalar" sin intervención humana |

## ROI

### Caso típico
- **Sin sistema**: ticket escalado por email → N2 recibe sin contexto → pide aclaraciones → ping-pong de 2-3 días
- **Con sistema**: ticket escalado con todo en 1 click → N2 abre y tiene el caso completo → resuelve en 4-6h
- **Ahorro**: 1.5-2 días de ciclo por escalación

### Caso compliance SLA
- Cliente promete SLA 4h para crítico PRD
- Sin tracking: el sponsor del cliente reclama "¿cuándo respondieron?"
- Con tracking: dashboard muestra cumplimiento SLA en tiempo real
- **Penalización SLA**: -80% por mejor visibilidad

### Caso scaling
- 5 consultores N2, 50 casos/mes
- Sin asignación inteligente: María hace 30, Pedro hace 5 (porque María "sabe MM")
- Con asignación inteligente: el sistema balancea por workload + skill
- **Utilización del equipo N2**: +25% sin contratar

## Objeciones

### "Ya tenemos Jira"
> "Perfecto. El sistema crea el issue en TU Jira con todo el contexto AMS anexado (estimación, conversación, análisis del agente). No reemplaza Jira — lo enriquece."

### "¿Y si el sistema asigna mal?"
> "El consultor puede reasignar manualmente desde el modal. La sugerencia es eso — sugerencia. RBAC controla quién puede aprobar/reasignar."

### "¿Soporta multi-nivel (N2 → N3)?"
> "Hoy 1 nivel de escalación. N2 → N3 está en roadmap Q4 2026."

## Frases que funcionan

- *"Tu N2 recibe el caso completo, no un email vacío que dice 'el cliente dice que no anda'."*
- *"Asignación por skill + workload + módulo. María no se quema, Pedro no se aburre."*
- *"SLA tracking en tiempo real. Tu sponsor ve el cumplimiento sin pedirlo."*
