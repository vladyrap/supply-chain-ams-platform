# ⚛ Arc Reactor · Manual cliente

> **Ruta:** Inline en algunos dashboards · **Para quién:** Visual decorativo

## ¿Qué hace?

Componente visual estilo "arc reactor" de Iron Man. Círculos concéntricos animados con métrica central (uptime, score readiness, etc.) en el centro.

Es **componente decorativo**, no página dedicada. Aparece en:
- Dashboard hero
- Welcome hero
- Mission Control hero

Animación: glow, pulse, rotación lenta de anillos.

## Cuándo se ve

- Como widget decorativo en pantallas hero
- En presentaciones para reforzar el "tech feel"

## Permisos

Cualquier rol que vea la pantalla donde está embebido.

## Qué se guarda

Nada. Es presentational pure.

## Limitaciones

- Requires CSS animations (cualquier navegador moderno OK)
- Reduce-motion respect (accesibilidad)
