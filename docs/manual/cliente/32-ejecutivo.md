# 📊 Vista Ejecutiva · Manual cliente

> **Ruta:** `/executive` · **Para quién:** ADMIN o SERVICE_LEAD o sponsor cliente

## ¿Qué hace?

Dashboard ejecutivo de la operación AMS. Pensado para sponsor o gerente que necesita ver:
- KPIs principales del período (7d / 30d / 90d / 365d)
- Tendencia de interacciones
- Top temas
- Top clientes
- Resolución por IA vs humano
- Uso de tokens + costo USD
- Variación vs período anterior

NO sustituye al `/dashboard` operativo. Esta es la pantalla "elevator" para nivel C.

## Cuándo abrirlo

- Lunes a la mañana → review semanal con sponsor
- Cierre de mes → preparar reporte para CFO/CIO
- Revisión trimestral con cliente
- Cuando preguntan "¿cuánto nos cuesta esto?"
- Comparativa de períodos para justificar inversión

## Cómo usar

### Range selector
- 7d / 30d / 90d / 365d
- Cambia todos los tiles

### Tiles (KPIs)

- **Interacciones** (total + delta vs período anterior)
- **Resolución IA** (% + delta)
- **Derivaciones a humano** (% + delta)
- **TTFR** (Time to First Response, en min)
- **TTR** (Time to Resolution)
- **NPS interno** (si configurado)
- **Tokens consumidos** (in + out)
- **Costo USD del período**

### Trend chart

Mini-line por día (interacciones).

### Top temas (BarList)
Módulo SAP / proceso / scope item más demandado del período.

### Top clientes (BarList)
Quién consume más interacciones.

### Usage breakdown

- Tokens in vs out
- Costo por proveedor (Gemini / OpenAI / Anthropic si multi)
- Costo por modelo
- Costo por feature (chat / voice / embeddings / extraction)

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Ver |
| AMS_CONSULTANT | No |
| CLIENT_USER | Ver solo sus propios datos |
| GENERAL_USER | No |

## Qué se guarda

Backend lo computa on-the-fly desde:
- `incidents`, `tickets_demo`, `conversations`
- `token_usage_logs` (cada call LLM con tokens + cost)

## Limitaciones

- Sin export PDF directo (screenshot del dashboard)
- KPIs computados al refresh — para tenants grandes considerar caché 5min
- NPS solo si está activado en `/settings`
- Comparativa con período anterior asume el mismo length del range actual
