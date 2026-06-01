# 🏅 Quality Evaluator · Manual cliente

> **Ruta:** `/quality-evaluator` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Evaluación humana de cada respuesta del agente. Tu equipo califica con 5 estrellas:
- **Precisión** (1-5★): la info es correcta
- **Utilidad** (1-5★): le sirvió al usuario
- **Claridad** (1-5★): se entiende
- **Completitud** (1-5★): cubre lo necesario

Más rankings cualitativos:
- **Riesgo de alucinación**: LOW / MEDIUM / HIGH
- **Fit técnico**: Demasiado simple / Adecuado / Demasiado técnico
- **¿Necesita revisión humana?** (sí/no)
- **¿Puede ser knowledge?** (sí/no — alimenta el wizard de conversión)
- **¿Útil para cliente final?**
- **¿Requiere escalación?**

Plus campo libre de comentarios.

## Cómo evaluar

### Desde el módulo
1. Abrir `/quality-evaluator`
2. Tab "Pendientes" muestra incidentes sin evaluación todavía
3. Click "Evaluar"
4. Form de evaluación con todas las dimensiones
5. Click "🏅 Guardar evaluación"

### Desde un ticket (recomendado)
1. Abrir ticket en `/tickets` que ya tenga respuesta del agente
2. Sección "Quality Evaluator" → click "🏅 Evaluar respuesta"
3. Mismo form, contexto del ticket pre-cargado
4. Si ya hay evaluación, muestra score promedio (ej. `🏅 4.5/5`) y permite reabrir

## Dashboard de calidad

Tab "Dashboard" muestra:
- Total evaluaciones
- % alta calidad (≥4)
- % riesgo alucinación alto
- Top consultores por evaluación
- Tendencia mensual
- Por módulo SAP

## Para qué sirve

- **Mejora continua del agente**: feedback humano alimenta el polish loop
- **Identificación de patrones**: qué módulos tienen baja calidad
- **Conversión a knowledge**: respuestas marcadas "puede ser knowledge" pasan al wizard
- **Compliance**: trazabilidad de cuán confiable es el agente

## Permisos

| Rol | Puede |
|---|---|
| ADMIN / SERVICE_LEAD | Todo + ver dashboard global |
| AMS_CONSULTANT | Evaluar respuestas |
| CLIENT_USER / GENERAL_USER | Sin acceso |

## Qué se guarda

- `evaluations` en localStorage (clave `supply-chain-ams-evaluations`)
- Cada evaluación tiene incidentId, evaluator, scores, riesgo, comentarios

## Limitaciones

- LocalStorage hoy (no DB backend). Migración planeada.
- Sin notificación al consultor cuando su respuesta recibe evaluación baja.
- Sin gamification (badges, leaderboard) — en roadmap.
