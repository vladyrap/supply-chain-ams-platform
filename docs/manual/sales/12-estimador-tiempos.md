# ⏱ Estimador de Tiempos · Manual de venta

> **De "te aviso" a "son 32 horas, acá el detalle" en 30 segundos.**

## El pitch en 30 segundos

> "Cada requerimiento SAP estimado en 30 segundos con desglose por fase, perfil requerido, supuestos, riesgos y texto sugerido para el cliente. **Determinístico — no LLM, no caja negra**. Cada hora que cobrás la podés justificar línea por línea."

## Demo de 60 segundos

1. Abrir `/time-estimator`.
2. Click "+ Nueva estimación" → cargar caso típico (Change request MM, complejidad MEDIUM, requiere ABAP + transport, hay playbook).
3. Click "Estimar".
4. Mostrar resultado: 24-48h, 3-6 días hábiles, confianza 75%, 3 perfiles (Funcional + ABAP + AMS Lead), 4 fases con breakdown.
5. Tab "Explicabilidad" → mostrar factores que SUBIERON horas (↑) y que BAJARON (↓ playbook -30%).
6. Tab "Respuesta cliente" → copiar el texto markdown listo para mandar.

## Killer features

| Feature | Valor |
|---|---|
| **Determinístico, auditable** | Cada hora se explica con regla aplicada |
| **Explicabilidad ↑/↓** | Factores que subieron/bajaron, con magnitud |
| **Breakdown por fase** | Cliente ve qué pagás en cada hora |
| **Perfiles requeridos** | Sabés qué consultor asignar antes de cotizar |
| **Texto sugerido al cliente** | Markdown listo, no escribís de cero |
| **14 tipos de estimación** | Incidente / Change / Desarrollo / Integración / Hypercare / Go-live / ... |
| **Booleanos que importan** | "hay playbook" baja 30%, "incidente repetido" baja 40% |
| **Confianza con score** | 0-100 con razones por las que es baja |

## ROI

### Caso cotización
- **Sin sistema**: cotización demora 2 días — alguien arma Excel, otros revisan
- **Con sistema**: cotización en 30 segundos con desglose auditable
- **Ahorro**: 1.5 días por requerimiento × 30 reqs/mes = 45 días año de un consultor

### Caso "el cliente regatea"
- **Sin sistema**: cliente discute las horas, te bajan precio 20% por no poder justificar
- **Con sistema**: mostrás los factores ↑↓ y el cliente ve por qué son 32h y no 16h
- **Recuperación**: +15% en márgenes promedio

### Caso planificación
- **Sin sistema**: scheduler arma sprint a ojo, se rompen plazos en 30%
- **Con sistema**: cada caso tiene min/max días + perfiles, scheduler arma sprints reales
- **Mejora cumplimiento**: +25% on-time delivery

### Caso onboarding consultor
- **Sin sistema**: junior estima muy bajo, senior corrige, ciclo aprendizaje 6 meses
- **Con sistema**: junior usa el motor, ve los factores, aprende mientras estima
- **Ramp-up**: -50% tiempo a productividad para estimar

## Objeciones

### "¿Por qué no IA?"
> "Porque el cliente te pregunta 'por qué 32 horas?' y necesitás responder con reglas, no con 'el modelo lo dijo'. Hoy el motor es determinístico y auditable. ML viene en roadmap para sugerir ajustes basados en histórico — pero como sugerencia, no como caja negra."

### "Ya tenemos un Excel"
> "Excel no se versiona, no se audita, no genera texto al cliente, no recalcula al cambiar contexto, y dos consultores estiman distinto el mismo caso. El motor es uno solo: consistencia."

### "¿Sirve para waterfall y para AMS?"
> "Sí. `estimateType` tiene 14 opciones: Incident / Change / Configuration / Development / Integration / Testing / GoLive / Hypercare / AMS Support / Project Implementation / Scope Item Activation / Documentation / Training / etc."

## Frases que funcionan

- *"Cada hora que cobrás la podés explicar con una regla."*
- *"Tu junior estima como tu senior porque usan el mismo motor."*
- *"30 segundos para cotizar lo que antes te llevaba 2 días."*
- *"Cliente ve los ↑ y los ↓. Cero caja negra."*
