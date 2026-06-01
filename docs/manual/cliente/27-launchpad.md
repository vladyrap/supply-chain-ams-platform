# 🚀 Launchpad · Manual cliente

> **Ruta:** `/launchpad` · **Para quién:** Cualquier rol

## ¿Qué hace?

Grid visual estilo SAP Fiori Launchpad con tiles grandes hacia cada módulo. Pensado como home alternativo o accesible desde sidebar.

Cada tile:
- Icono grande
- Nombre del módulo
- KPI mini (si aplica, ej. "23 tickets P1")
- Color por categoría
- Click → entra al módulo

## Cuándo abrirlo

- Vista alternativa a sidebar
- Usuarios familiarizados con SAP Fiori
- Pantalla touch (tablet AMS móvil)

## Cómo usar

- Click tile → módulo
- Pueden reorganizarse (drag) según preferencia
- Search box arriba para filtrar tiles
- Categorías colapsables

## Permisos

Cualquier rol — solo muestra tiles a los que tiene acceso.

## Qué se guarda

Layout custom por user en `user_preferences.launchpadLayout`.

## Limitaciones

- Touch support básico
- Drag-and-drop no en mobile aún
- Sin tiles custom (URLs externas) hoy
