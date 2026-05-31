# Ticket Command Center

El **Ticket Command Center** es el panel principal del detalle de un ticket
en `/tickets`. Convierte cada ticket en el centro de mando desde el cual se
puede ver y ejecutar todo el ciclo AMS sin saltar entre pantallas.

## Objetivo

Que **cada ticket sea el centro del sistema** y exponga, en un solo lugar,
todas las capacidades de la plataforma aplicadas a ese caso particular:

- Autoestimación de tiempo
- Clasificación + diagnóstico con Agente AMS
- Conocimiento, Scope Items y Playbooks relacionados
- Decision Engine con next-best-actions
- Acciones rápidas (escalar, generar RCA, crear caso prueba, convertir a KB, etc.)
- Audit Trail con timeline
- Metadata de trazabilidad (versión del agente, versión KB, fuentes RAG)

## Componentes

| Archivo | Rol |
|---|---|
| `src/components/tickets/TicketCommandCenter.tsx` | Panel principal con 14 secciones colapsables |
| `src/components/tickets/TicketQuickActions.tsx` | Grid de acciones rápidas del Decision Engine |
| `src/components/tickets/CreateTicketModal.tsx` | Modal para crear ticket nuevo |
| `src/components/estimation/TicketEstimateDetail.tsx` | Reusado para la sección de estimación |
| `src/components/audit/TicketAuditTimeline.tsx` | Timeline de eventos del ticket |

## Las 14 secciones

1. **Resumen** — título + descripción del ticket.
2. **Estimación de resolución** — banda horas/días + fases + recalcular + ajuste manual.
3-4. **Clasificación AMS + Diagnóstico** — botón Clasificar con Agente AMS, respuesta con metadata.
5. **Conocimiento relacionado** — matches en KB por módulo.
6. **Scope Items SAP relacionados** — sugeridos por `/api/scope-items/suggest`.
7. **Playbook recomendado** — del store local de Playbooks.
8. **Escalamiento N2** — escalaciones asociadas a este ticket.
9. **Jira / ServiceNow** — link al issue real o registro demo en audit.
10. **Documentos generados** — del Document Factory con `sourceId === ticket.key`.
11. **Testing y evidencias** — escenarios de Testing Intelligence.
12. **Quality Evaluator** — evaluaciones humanas sobre la respuesta del agente.
13. **Convertir en conocimiento** — capitalización en KB curada.
14. **Auditoría · Timeline** — todos los eventos del ticket.

## Flujo típico

```
Ticket creado
  └─ TICKET_CREATED + AUTO_ESTIMATE_GENERATED (audit)
     └─ Decision Engine: REQUEST_MORE_INFO (faltan datos)
        └─ Cliente completa
           └─ Re-evaluar: SUGGEST_SOLUTION (confianza alta)
              └─ Clasificar con Agente AMS
                 └─ TICKET_CLASSIFIED + AGENT_RESPONSE_GENERATED
                    └─ Sugiere Playbook + Scope Item
                       └─ Resolver + CONVERT_TO_KNOWLEDGE
                          └─ Audit completo
```

## Integraciones

| Hook | Uso |
|---|---|
| `useTicketAudit` | Registra cada evento |
| `useDocumentFactory` | Documentos generados |
| `useEscalation` | Escalaciones asociadas |
| `useTestingIntelligence` | Casos de prueba |
| `usePlaybooks` | Playbooks aplicables |
| `useQualityEvaluator` | Evaluaciones humanas |
| `useAgentTraining` | Knowledge items |
| `useScopeItems` (backend) | Scope items SAP del catálogo |

## Limitaciones demo

- Acciones que requieren UX completa (Jira real, ServiceNow real) están en modo
  audit-only: registran el intento y redirigen al módulo correspondiente.
- El "Decision Engine" es determinístico (sin LLM) — basado en reglas calibradas.
- Quality Evaluator no asocia automáticamente al ticket si el `incidentId`
  guardado no incluye el ticket.key (match parcial).

## Roadmap

- Tabla `ticket_audit_events` en backend (hoy localStorage).
- WebSocket para que cambios de un usuario se reflejen en otros en vivo.
- Inline RCA generator: completar el form de Document Factory sin abandonar el ticket.
- Decision Engine v2 con LLM como segunda opinión sobre las reglas.
