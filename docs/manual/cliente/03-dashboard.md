# 📊 Dashboard · Manual cliente

> **Ruta:** `/dashboard` · **Para quién:** todos los roles (vista global del servicio)

## ¿Qué hace?

Portada operativa del sistema. Muestra de un vistazo:
- Incidentes hoy, en 7 días, total
- Tickets Mesa de Soporte activos
- Escalaciones N2 (pendientes aprobación, activas)
- KB aprobados, brechas críticas
- Reuniones procesadas
- Score promedio del agente, % riesgo alucinación
- **Valor económico generado** (USD evitado + horas ahorradas)
- **Agent Readiness** por módulo SAP
- **Top 5 tickets con mayor ETA**

![Dashboard overview](../screens/dashboard-overview.png)

## Secciones del dashboard

### 1. Hero card
Greeting personalizado (Hola Pablo · ADMIN), cliente actual, ambiente, 4 stats:
- Incidentes totales
- Resueltos hoy
- Escalaciones activas
- % respuesta IA

### 2. KPIs principales (8 cards)
- Incidentes (agente) · totales + últimos 7 días
- Hoy
- Mesa: conversaciones abiertas
- % resueltos por IA
- Tickets N2 activos
- SLA vencido
- Reuniones procesadas
- KB aprobados

### 3. AMS · Gobierno y madurez del agente
- Conocimientos desde incidentes
- Playbooks activos
- Documentos generados
- Score promedio del agente
- % riesgo alucinación
- Brechas abiertas
- Versiones publicadas
- Módulos con cobertura

### 4. AMS · Escalamiento Nivel 2
- Casos escalados
- Pendientes aprobación
- Activos en N2
- Tiempo a asignación
- Responsable más cargado
- Canal más usado

### 5. AMS · Autoestimación de Resolución
- Tickets estimados / cargados
- Esfuerzo total (techo) en horas
- Promedio por ticket
- % confianza baja

### 6. AMS · Valor generado por la plataforma 💎
Card destacada con:
- **USD evitado** (rango min-max)
- Horas ahorradas
- Breakdown por categoría (tickets asistidos, RCAs, minutas, casos prueba, etc.)

### 7. Agent Readiness Center
Grid de cards una por módulo SAP (MM, SD, PP, EWM, QM, etc.) con score 0-100 que mide cuán listo está el agente para operar ese módulo.

### 8. Top 5 tickets con mayor ETA
Tabla con los tickets que más esfuerzo demandan, ordenados por horas máximas.

### 9. Gráficos
- Donut por módulo SAP
- Donut por confianza
- Heatmap de actividad por día/hora
- StackedLine de incidentes vs resueltos

## Cómo refrescar

Botón **↻ Refrescar** arriba a la derecha. Trae la última data del backend
(stats + valor + readiness se recalculan).

## Permisos

| Rol | Qué ve |
|---|---|
| ADMIN / SERVICE_LEAD / AMS_CONSULTANT | Todo |
| CLIENT_USER | Solo los KPIs que le aplican (sus tickets, sus incidentes) |
| GENERAL_USER | Solo dashboard básico (incidentes que creó) |

## Para qué sirve esta pantalla

- **Standup diario**: 5 minutos viendo el dashboard tu equipo sabe cómo está el día.
- **Reporte ejecutivo**: la sección Valor Generado es lo que mandás al sponsor del cliente cada semana.
- **Health check**: si "Brechas abiertas" sube y "Score agente" baja → priorizar entrenamiento.
- **Capacity planning**: "Esfuerzo total techo" muestra cuántas horas tiene tu equipo en el pipeline.

## Limitaciones

- KPIs se calculan en cada GET (no hay caché): si hay >10k incidentes puede tardar.
- "Valor económico" usa reglas demo (configurables vía env `NEXT_PUBLIC_AMS_HOURLY_COST_USD`).
- Agent Readiness se recalcula cada vez que abrís el dashboard.
