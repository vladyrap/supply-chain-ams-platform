# 🔮 Forecast IA · Manual cliente

> **Ruta:** `/forecast` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Predicción IA del volumen futuro de incidentes/tickets/escalaciones por módulo SAP. Modelos:

- Histórico estacional (mismo día/semana del año pasado)
- Tendencia reciente (regression line)
- Detección anomalías (z-score)
- Predicción próximos 7/14/30 días

## Cuándo abrirlo

- Planificación capacidad equipo
- Detectar tendencia ascendente preocupante
- Justificar contratación
- Comunicar al cliente "vamos a tener demanda alta en X"

## Cómo usar

### Inputs

- Período histórico: 90d / 180d / 365d
- Horizonte forecast: 7d / 14d / 30d
- Módulo SAP (filtro)
- Métrica: incidentes / tickets P1 / escalaciones / costo USD

### Outputs

- Chart line con histórico + forecast (zona sombreada de confianza)
- Tabla con valor predicho por día
- Insights:
  - "Próximo lunes esperás 47 incidentes (+12% vs promedio)"
  - "Anomalía detectada: martes 8 con outlier de 89 incidentes"
- Recomendaciones: "considerar 1 consultor extra martes/jueves"

## Permisos

ADMIN o SERVICE_LEAD.

## Qué se guarda

Forecasts compute on-the-fly. Snapshots opcionales en `forecasts_snapshots`.

## Limitaciones

- Requiere mín 90d de histórico para forecast confiable
- No considera factores externos (go-live, cierre de mes)
- Confidence interval ancho si datos escasos
- Modelos simples (no LSTM/Prophet aún)
