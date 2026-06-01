# 🎖 War Room · Manual cliente

> **Ruta:** `/war-room` · **Para quién:** ADMIN o SERVICE_LEAD durante incidente crítico

## ¿Qué hace?

Pantalla dedicada a manejo de incidente P1/SEV1 en curso. Diseñada para uso bajo presión:

- **Timer** desde inicio del incidente (countdown SLA)
- **Comms log** turn-by-turn de comunicaciones cliente + equipo
- **Action items** rápidos con owner + status
- **Participantes** activos del war room
- **Decisiones tomadas** registradas
- **Post-mortem template** auto-generado al cerrar

## Cuándo abrirlo

- Cliente reporta P1 productivo
- SEV1 declarado por equipo
- Crisis multi-sistema
- Recuperación post-down

## Cómo usar

### Iniciar war room

1. Click "🚨 Iniciar War Room"
2. Asociar a ticket P1
3. Convocar participantes (email auto)
4. Iniciar timer

### Durante

- Comms log: cada update queda con timestamp
- Action items: crear, asignar, marcar done
- Decision log: "decidimos rollback a las 14:32"
- Botón "Pausa" si se controla

### Cerrar

1. Click "✅ Cerrar War Room"
2. Auto-generar post-mortem markdown con timeline + decisiones + action items
3. Editar
4. Compartir con stakeholders

## Permisos

ADMIN o SERVICE_LEAD inicia. Participantes invitados editan.

## Qué se guarda

`war_rooms` (id, ticket_id, started_at, ended_at, comms_log jsonb, action_items jsonb, decisions jsonb, post_mortem_md).

## Limitaciones

- Sin video call integrado (usá Teams/Zoom paralelo)
- Sin sync realtime entre participantes (polling 5s)
- Templates de post-mortem fijos por ahora
