# 🎯 Mission Control · Manual cliente

> **Ruta:** `/mission-control` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Centro de mando estilo NASA. Vista 360° del AMS en una sola pantalla con widgets:

- **KPIs en vivo**: tickets activos, P1 abiertos, SLA breach inminentes
- **Mapa de calor** por módulo SAP
- **Cola de escalaciones** con countdown SLA
- **Stream de eventos** en tiempo real
- **Mini-charts**: trend hora, top consultor, top cliente
- **Alertas**: rojas/ámbar con CTA

## Cuándo abrirlo

- Mañana al iniciar shift → "¿qué pasa hoy?"
- Durante crisis P1 → coordinación
- Pantalla compartida con cliente VIP
- Antes de standup → contexto

## Cómo usar

- Carga con polling auto cada 5-10 seg
- Click en widget → drill-down a módulo respectivo
- Alertas rojas se muestran top con CTA
- Botón "Pantalla completa" para presentar

## Permisos

ADMIN o SERVICE_LEAD. Otros ven AccessLockedCard.

## Qué se guarda

Nada nuevo — agrega data en vivo de tablas existentes (tickets, escalations, incidents).

## Limitaciones

- Polling cada 5s — para realtime puro, WebSocket en roadmap
- Layout fijo (no drag-and-drop de widgets aún)
- Requiere monitor grande para máximo efecto (32"+ recomendado)
