# 💧 Data Flow · Manual cliente

> **Ruta:** `/flow` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Visualización en tiempo real del **flujo de datos** entre componentes del sistema:

- Eventos entrando (mensajes, voz, email)
- Pasando por agente IA
- Generando tickets, knowledge, escalaciones
- Saliendo a integraciones (SAP, Slack, Webhook)

Animado con partículas que viajan por edges.

## Cuándo abrirlo

- Demo a cliente: "así fluye tu información"
- Detectar cuellos de botella visualmente
- Pantalla decorativa en demo

## Cómo usar

- Auto-play continuo
- Hover edge → ver volumen 24h
- Hover nodo → ver throughput
- Pause/play botón

## Permisos

ADMIN o SERVICE_LEAD.

## Qué se guarda

Nada. Visualiza data live.

## Limitaciones

- WebGL para máxima fluidez
- Performance baja en mobile
- Sin export de "snapshot" del flujo
