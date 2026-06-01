# 🌐 Topology · Manual cliente

> **Ruta:** `/topology` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Mapa interactivo de la **topología SAP del cliente**: sistemas, integraciones, flujos de datos, dependencias.

Nodos: S/4HANA, ECC, BTP, Ariba, IBP, EWM, PI/PO, ServiceNow, terceros.
Edges: integraciones con dirección + protocolo (IDoc, OData, REST, BAPI).

Color por status: 🟢 OK, 🟡 degradado, 🔴 down, ⚪ desconocido.

## Cuándo abrirlo

- Onboarding cliente → mapear su estack
- Incidente sistémico → ver qué se cae junto
- Diseño de change → impact analysis visual
- Demo a auditor → "así está conectado"

## Cómo usar

- Drag nodos para reorganizar
- Click nodo → panel lateral con detalle (versión, owner, SLA)
- Click edge → detalle de la integración (último éxito, errores 24h)
- Zoom + pan
- Filtros: mostrar solo críticos, ocultar inactivos

## Permisos

ADMIN o SERVICE_LEAD.

## Qué se guarda

`topology_nodes` y `topology_edges` (definidos al onboarding, mantenidos por admin).
Status auto desde monitoring + heartbeats.

## Limitaciones

- Layout autopositioning básico — para >30 nodos puede saturar
- Sin auto-discovery de integraciones (todavía)
- Edges son declaración manual, no detección de tráfico real
