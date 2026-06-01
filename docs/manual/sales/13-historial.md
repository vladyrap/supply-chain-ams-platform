# 🗂 Historial de Incidentes · Manual de venta

> **La memoria del servicio. Filtrable, auditable, accionable.**

## El pitch en 30 segundos

> "Cada incidente que pasó por el agente queda registrado: mensaje, respuesta, módulo, cliente, confianza, estimación, fuentes RAG, latencia. Filtrás por módulo + cliente + ambiente, encontrás el incidente del año pasado en 5 seg, lo escalás o publicás knowledge en 1 click. **Audit trail completo. Compliance ISO 20000 + SOC 2.**"

## Demo de 60 segundos

1. Abrir `/history`.
2. Filtrar por módulo MM + ambiente PRD + cliente "ACME".
3. Mostrar listado (10-20 incidentes con badge confianza).
4. Click en uno con baja confianza → mostrar detalle.
5. Mostrar la estimación auto-generada + factores ↑↓.
6. Click "🚨 Escalar N2" → escalación con contexto.
7. Volver, click "📚 Publicar a Knowledge" → publicación lista con prefill.

## Killer features

| Feature | Valor |
|---|---|
| **Filtros multi-dimensión** | Módulo + ambiente + cliente + search + adjuntos |
| **Detalle full con quick actions** | Escalar, publicar, recalcular sin salir |
| **Autoestimación visible** | Cada incidente con horas estimadas y factores |
| **Audit del agente** | Modelo usado, confianza, KB version, latencia |
| **Adjuntos opcionales** | Imágenes guardadas solo con consent del usuario |
| **Detección de repeats** | El sistema sabe si es el N-ésimo similar |

## ROI

### Caso review mensual con sponsor
- **Sin sistema**: armás Excel a mano con todos los incidentes, 4 horas de trabajo
- **Con sistema**: filtrás cliente + mes, screenshot al sponsor
- **Ahorro**: 4 horas por sponsor por mes × 8 sponsors = 32 horas/mes

### Caso compliance audit
- Auditor pide: "muéstrenme los incidentes críticos de Q1, con respuesta del agente y evidencia de escalación"
- **Sin sistema**: minería en mails y tickets sueltos, 2 días
- **Con sistema**: 3 filtros, export, listo
- **Ahorro auditoría**: USD 8.000 por auditoría no observada

### Caso onboarding de cliente nuevo
- "Mostrame qué tan rápido respondés"
- **Sin sistema**: PowerPoint con métricas estáticas
- **Con sistema**: pantalla en vivo filtrando por cliente similar, mostrás casos reales
- **Conversion**: +20% en pitches con demo histórica real

### Caso "el cliente reclama que no respondimos rápido"
- Cliente: "el caso del 15/03 lo dejaron 3 días"
- **Sin sistema**: revisás mails, no encontrás, asumís culpa
- **Con sistema**: filtrás fecha + cliente → el sistema muestra timestamp exacto + respuesta del agente + escalación
- **Recuperación de confianza**: cero credit notes injustificadas

## Objeciones

### "Ya tenemos Jira con todos los tickets"
> "Jira no tiene confianza del agente, no tiene fuentes RAG, no tiene autoestimación con explicabilidad. Esto es la capa AMS sobre Jira — complementa, no reemplaza. Y el incidente Jira tiene su link cruzado acá."

### "¿Y la privacidad del cliente?"
> "Adjuntos se guardan SOLO con consent explícito. El mensaje queda redactable. Los atributos PII configurables por tenant. Roadmap: TTL automático a 90 días, derecho al olvido GDPR."

### "¿Sirve para reportar al cliente?"
> "Sí. Filtrás por cliente + período → tenés volumen, módulos top, confianza media, escalaciones. El export CSV viene en próxima release; hoy se hace screenshot del filtro."

## Frases que funcionan

- *"La memoria del servicio. Lo que vivió tu equipo en 2 años, accesible en 5 segundos."*
- *"Cada incidente con su confianza, su fuente, su estimación. Auditoría sin sudar."*
- *"Del histórico al next action: escalás o publicás knowledge sin salir del detalle."*
