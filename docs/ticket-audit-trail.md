# Ticket Audit Trail

Cada ticket lleva un timeline de eventos con timestamp, actor, rol y metadata.
Visible en la sección "AUDITORÍA · TIMELINE" del Ticket Command Center.

## Componentes

- `src/types/audit.ts` — `TicketAuditEvent` + 19 `TicketAuditEventType`
- `src/hooks/useTicketAudit.ts` — `record(input)`, `byTicket(id)`, `clearForTicket(id)`
- `src/components/audit/TicketAuditTimeline.tsx` — timeline vertical
- `src/components/audit/AuditEventCard.tsx` — card por evento

## Tipos de evento

| Tipo | Cuándo se dispara |
|---|---|
| `TICKET_CREATED` | Ticket creado (auto + manual) |
| `AUTO_ESTIMATE_GENERATED` | Backend genera estimación |
| `ESTIMATE_RECALCULATED` | Click ↻ Recalcular |
| `MANUAL_ADJUSTMENT` | Click ✎ Ajustar manualmente |
| `TICKET_CLASSIFIED` | Click 🤖 Clasificar con Agente AMS |
| `AGENT_RESPONSE_GENERATED` | Respuesta del agente recibida |
| `KNOWLEDGE_MATCHED` | KB match (incluye brecha abierta) |
| `SCOPE_ITEM_MATCHED` | Scope item sugerido |
| `PLAYBOOK_RECOMMENDED` | Playbook aplicable detectado |
| `N2_ESCALATION_SUGGESTED` / `_CREATED` | Decision Engine sugiere / se crea |
| `JIRA_DEMO_CREATED` / `SERVICENOW_DEMO_CREATED` | Acciones rápidas demo |
| `DOCUMENT_GENERATED` | RCA / Plan / Respuesta generados |
| `TEST_CASE_CREATED` | Caso de prueba |
| `QUALITY_EVALUATED` | Evaluación humana |
| `CONVERTED_TO_KNOWLEDGE` | Convertido a KB |
| `STATUS_CHANGED` | Cambio de status |
| `COMMENT_ADDED` | Comentario / request more info |

## Persistencia

LocalStorage: `supply-chain-ams-ticket-audit-events`. Cap a 1000 eventos.

## Limitaciones

- No persiste en backend. Si se vacía localStorage o se cambia de browser, se pierde.
- Sin filtros server-side: el componente filtra `byTicket(id)` en memoria.

## Roadmap

- Tabla backend `ticket_audit_events` con índice por ticket_id.
- Export del timeline a Markdown / PDF (Document Factory).
- Webhooks: cada evento puede dispararse hacia integraciones (Slack, email).
