# 💰 Valor Económico · Manual cliente

> **Ruta:** `/business-value` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Calculadora y dashboard de **valor económico del AMS para el cliente**. Traduce métricas operativas a **USD ahorrado / generado**:

- Horas humano ahorradas por resolución IA × tarifa = USD
- Tickets evitados por knowledge usado = USD
- SLA cumplido vs penalización contractual = USD
- Onboarding consultor reducido = USD
- Auditoría compliance evitada = USD

## Cuándo abrirlo

- Justificar inversión AMS al CFO del cliente
- Presentar ROI en review trimestral
- Comparativa antes/después de implementar el sistema
- Negociar tarifa basada en valor real

## Cómo usar

### Inputs configurables

- **Tarifa hora consultor**: USD 50 / 75 / 100 / custom
- **Tarifa hora junior**: USD 25 / 35 / 50 / custom
- **Penalización SLA breach**: USD por breach (default 500)
- **Costo auditoría observada**: USD (default 15.000)
- **Período**: 7d / 30d / 90d / 365d

### Outputs

Por categoría:

**Ahorro directo (humano):**
- Horas IA resolvió × tarifa = USD X
- Tickets evitados por KB × 1h × tarifa = USD Y

**Ahorro indirecto:**
- SLA cumplido × penalización evitada = USD Z
- Auditorías sin observaciones × costo evitado = USD W
- Onboarding junior con playbooks vs sin (semanas reducidas × tarifa) = USD V

**Total mes**: USD X + Y + Z + W + V
**Costo del sistema**: USD del período (tokens + infra)
**ROI**: (Ahorro - Costo) / Costo × 100

### Visualización

- Tile grande con ROI %
- BarList por categoría (qué pesa más en el ahorro)
- Trend línea con ROI mensual histórico

### Export

Click "📥 Generar reporte ejecutivo" → markdown con números + narrativa lista para mandar al CFO.

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo + editar tarifas |
| SERVICE_LEAD | Ver |
| AMS_CONSULTANT | No |
| CLIENT_USER | Ver el suyo |
| GENERAL_USER | No |

## Qué se guarda

Backend:
- `business_value_settings` (tarifas + costos configurables por tenant)
- Cómputo on-the-fly desde tablas operativas

## Limitaciones

- Asume tarifas configuradas correctamente (basura entra → basura sale)
- Ahorros indirectos (compliance, onboarding) son estimaciones — admin puede ajustar coeficiente
- Sin multi-currency aún (USD único)
- Sin comparativa cliente vs cliente (sería interesante para benchmarking)
