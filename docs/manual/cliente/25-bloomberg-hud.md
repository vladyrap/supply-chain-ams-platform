# 📈 Bloomberg HUD · Manual cliente

> **Ruta:** `/hud` · **Para quién:** SERVICE_LEAD o trader-style operator

## ¿Qué hace?

Vista estilo terminal Bloomberg para operadores AMS profesionales:

- 6-8 paneles densos
- Tickers superiores con KPIs scrolling
- Tablas compactas (no espaciadas)
- Atajos de teclado (J/K navegar, /buscar, R refrescar)
- Tema dark profesional
- Sonidos sutiles en eventos clave

Para operadores que viven 8h frente a la pantalla.

## Cuándo abrirlo

- Service Lead en producción continua
- Operador de turno
- Monitoreo SLA intenso

## Cómo usar

### Atajos

- `J/K`: down/up en tablas
- `/`: buscar global
- `R`: refresh
- `1-9`: switch panel focus
- `Esc`: deselect

### Paneles

1. **Tickets P1** (lista con countdown SLA)
2. **Escalaciones** (status + asignado)
3. **Knowledge stats** (top queries del día)
4. **Voice calls** activas
5. **Mesa de soporte** queue
6. **Stream eventos** (verbose)

## Permisos

SERVICE_LEAD o ADMIN.

## Qué se guarda

Solo prefs de layout (cuál panel donde).

## Limitaciones

- Para usuarios power, no para casuales (curva aprendizaje)
- Sin help inline (tooltips minimales por design)
- Requiere monitor 27"+ idealmente
