# 🧠 Agent Brain · Manual cliente

> **Ruta:** `/brain` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Visualización 3D del "cerebro" del agente IA. Animación de neuronas activas con cada query, mostrando:

- Categorías de conocimiento que tiene
- Top topics queryados
- Confianza promedio por categoría
- Densidad de KB por módulo SAP

Es pantalla de demo/conceptual, no operativa. Wow factor.

## Cuándo abrirlo

- Demo a cliente nuevo
- Onboarding visual al agente
- Pantalla en booth de feria
- Background mientras explicas el sistema

## Cómo usar

- Click → ver detalle del cluster
- Hover neurona → tooltip con módulo + confianza
- Auto-rotación 3D
- Botón "pausa" si querés foco

## Permisos

ADMIN o SERVICE_LEAD.

## Qué se guarda

Nada. Solo visualización de data agregada.

## Limitaciones

- Requires WebGL (no funciona en navegadores muy viejos)
- Performance puede degradar en mobile
- Solo en ES por ahora
