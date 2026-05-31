# Autoestimación de Resolución de Tickets

Cada vez que se crea un ticket o incidente en el sistema AMS, se genera
**automáticamente** una estimación del esfuerzo de resolución, con desglose por
fases, rango de horas, confianza y datos faltantes. La estimación se persiste
en el ticket y se muestra en toda la plataforma.

## 1 · Qué es

- **Por rango (mín–máx)**, nunca un número exacto. No promete fechas.
- **Determinística**: motor basado en tablas y reglas, sin LLM. Mismo input → mismo output.
- **Embebida en cada ticket** (`estimatedResolution`), no es un módulo aparte.
- **Recalculable**: cuando cambian factores (módulo, severidad, ambiente, complejidad), se recalcula.
- **Ajustable manualmente** por usuarios autorizados, con razón obligatoria y auditoría.

Convive con el módulo `/time-estimator` (que sigue para cotizaciones manuales de proyectos no-ticket).

## 2 · Cuándo se ejecuta

| Origen | Cuándo |
|---|---|
| Chat del Agente AMS | Backend en `saveIncident()` después del INSERT |
| Incidente manual | Mismo flujo del agente |
| Backfill lazy | Primer GET de un incidente sin estimación (frontend o backend) |
| Recalcular UI | Click en botón "↻ Recalcular" desde el detalle |
| Escalación a N2 | Se copia la estimación actual al `escalation_records.payload` |
| Jira/ServiceNow demo | Se anexa al `description` cuando `createJiraIssue`/`createServiceNowIncident` recibe `estimate` |

## 3 · Reglas base del motor

### Horas base por tipo de ticket

| Tipo | Mín | Máx |
|---|---:|---:|
| Incidente (10 fases AMS) | suma de fases | suma de fases |
| Incidente crítico PRD | +5 fases extras (contención, escal, RCA, hypercare) | idem |
| Change Request | 13 fases (análisis → hypercare) | idem |

### Multiplicadores

```
mult_total = COMPLEXITY × SEVERITY × URGENCY × ENV

COMPLEXITY: VERY_LOW 0.6 · LOW 0.8 · MEDIUM 1.0 · HIGH 1.4 · VERY_HIGH 1.9 · UNKNOWN 1.2
SEVERITY:   LOW 0.95 · MEDIUM 1.0 · HIGH 1.10 · CRITICAL 1.25
URGENCY:    NORMAL 1.0 · URGENT 1.15 · IMMEDIATE 1.30
ENV:        DEV 0.9 · QA 1.0 · UAT 1.05 · PRD 1.20 · SANDBOX 0.85 · TRAINING 0.85
```

### Bumps absolutos (suma horas)

- **Requiere desarrollo ABAP/BTP** → +16 / +80h
- **Requiere integración cross-system** → +8 / +40h
- **Requiere UAT con key user** → +4 / +24h
- **Requiere transporte controlado** → +2 / +8h

### Discounts/bumps proporcionales

- **Playbook AMS aplicable** → ×0.85 (−15 %)
- **Incidente recurrente con histórico** → ×0.75 (−25 %)
- **Baja confianza del agente** → ×1.30 (+30 %)
- **Sin mensaje de error / evidencia** → ×1.20 (+20 %)

## 4 · Fases AMS estándar (incidente)

1. Recepción y clasificación
2. Análisis funcional inicial
3. Análisis técnico (opcional, si requiere desarrollo)
4. Reproducción del error
5. Identificación de causa probable
6. Resolución o workaround
7. Validación en ambiente correspondiente
8. Comunicación al cliente
9. Documentación del caso
10. Cierre o escalamiento

Para **incidentes críticos en productivo** se agregan:
11. Contención inicial
12. Escalamiento Nivel 2
13. RCA preliminar
14. RCA final
15. Hypercare o monitoreo

Para **change requests** se usa otro catálogo de 13 fases (análisis → diseño funcional → diseño técnico → configuración → desarrollo → integración → PU → QA → UAT → documentación → transporte → puesta en marcha → hypercare).

## 5 · Confianza

Score 0–100, mapeado a `HIGH (≥75) · MEDIUM · LOW (≤45)`. Penaliza:
- Datos faltantes (−10 c/u)
- Complejidad HIGH/VERY_HIGH (−8)
- Urgencia IMMEDIATE (−5)
- Desarrollo (−8) / Integración (−12)
- Confianza baja del agente (−12)

Bonifica:
- Playbook (+8) / KB match (+6) / Recurrente (+8)
- Confianza alta del agente (+6)

## 6 · Visibilidad en el sistema

| Pantalla | Qué muestra |
|---|---|
| `/history` | Badge "⏱ X–Y h" en cada fila + panel completo en el detalle |
| `/escalation-n2` (detalle modal) | Resumen ETA + diff N1↔N2 si N2 ajustó complejidad |
| `/dashboard` | Sección "Autoestimación" con 4 KPIs + Top 5 tickets con mayor ETA |
| `/document-factory` | Nueva plantilla `ESTIMATE_RESOLUTION` para generar PDF/markdown formal |
| Jira (demo o real) | Bloque "## Estimación AMS" anexado al `description` + label `estimate-generated` |
| ServiceNow (demo o real) | Bloque "## Estimación AMS" anexado al `description` + custom field `expected_resolution_range` |

## 7 · Recalcular

Botón "↻ Recalcular" en el detalle del ticket. Disponible para roles:
- ADMIN · SERVICE_LEAD · AMS_CONSULTANT

Recalcula con el mismo engine pasando el estado actualizado del ticket.
**Preserva ajustes manuales** salvo que se pase `force=true` (solo ADMIN puede forzar).

Estado guardado:
- `lastRecalculatedAt` (ISO timestamp)
- `appliedRules` (lista de reglas aplicadas, útil para explicar el resultado)

## 8 · Ajuste manual

Modal "✎ Ajustar manualmente" en el detalle. Disponible para:
- ADMIN · SERVICE_LEAD (aprobador)

Permite cambiar:
- Horas mín / máx
- Confianza (LOW/MEDIUM/HIGH)
- Complejidad (VERY_LOW…VERY_HIGH/UNKNOWN)
- Razón **obligatoria** del cambio

Marca el record con:
- `manuallyAdjusted = true`
- `adjustedBy` = usuario actual
- `adjustmentReason` = texto provisto

Una vez ajustado, los recálculos automáticos no lo pisan.

## 9 · Integración con Jira / ServiceNow

Se llama así:

```ts
await createJiraIssue(payload, {
  confirmReal: true,
  estimate: ticket.estimatedResolution,
});
```

El backend:
1. Anexa el bloque "## Estimación AMS (auto-generada)" al `description`.
2. Agrega label `estimate-generated` (Jira) o setea `expected_resolution_range` (ServiceNow).
3. Es **idempotente** — si el marker ya existe en el description, se reemplaza para evitar duplicar al reenviar.

## 10 · Limitaciones actuales

- Sin datos históricos reales — todo es heurística calibrada a mano.
- No considera disponibilidad real del equipo (asume 9×5 estándar).
- No considera dependencias inter-tickets (un ticket puede bloquear a otro).
- No genera fechas absolutas (intencional — solo rangos).
- El port backend del engine duplica ~80 líneas del frontend. Si se cambian
  reglas, **actualizar ambos lados** (`backend/src/utils/estimation.ts` y
  `frontend/src/lib/estimation/engine.ts`).

## 11 · Futuro con datos históricos reales

Cuando haya >100 tickets resueltos con tiempo real de cierre, se puede:
1. Entrenar regresión lineal sobre `(complexity, severity, module, environment) → tiempo real`.
2. Usar la predicción como **calibrador** de los multiplicadores del motor.
3. Mostrar "predicción IA vs estimación motor" en la UI para fomentar feedback humano.
4. Detectar outliers (tickets que tomaron mucho más de lo estimado) y abrir ajuste de reglas.

Fase 2 también: API REST dedicada para batch backfill admin (`POST /api/admin/backfill-estimates`).
