# 📞 Mesa de Soporte · Manual cliente

> **Ruta:** `/support-desk` · **Para quién:** AMS_CONSULTANT, SERVICE_LEAD, ADMIN

## ¿Qué hace?

Sistema de soporte AMS con **IA de Nivel 1** que atiende automáticamente las
consultas del cliente, y **escalación inteligente a Nivel 2** cuando el caso
requiere especialista humano.

Cuenta con:
- **Triage IA**: clasifica cada caso por urgencia, módulo SAP, complejidad
- **Resolver IA**: busca en KB curada + RAG documental y propone solución
- **Escalación automática**: si el resolver no puede, escala a N2 con todo el contexto
- **KB curada**: artículos problema→solución aprobados por consultores N2 (distinta del RAG documental)
- **Tickets MESA-XXXX**: códigos correlativos por cliente

## Estructura

| Sub-pantalla | Para qué |
|---|---|
| Mesa principal | Lista de conversaciones activas + chat |
| Mis tickets | Tickets propios (MESA-XXXX) con status |
| KB curada | Artículos validados por casos resueltos |
| Métricas | KPIs de la mesa (% IA, escalaciones, SLA) |

## Cómo funciona un caso

1. **Cliente abre consulta**: vía web, email, llamada (Twilio Voice si está conectado).
2. **Triage IA**: clasifica módulo, urgencia, severidad. Decide si tiene confianza para resolver.
3. **Resolver IA**:
   - Primero busca en **KB curada** (artículos pre-validados).
   - Si no hay match, busca en **RAG documental** (PDFs).
   - Genera respuesta con marcador `::DECISION::` con flags: `resolved`, `needs_more_info`, `should_escalate`.
4. **Si resolved**: cierra el ticket con la solución. Cliente la valida con 👍/👎.
5. **Si needs_more_info**: pide datos adicionales al cliente.
6. **Si should_escalate**: crea ticket N2 automáticamente con todo el contexto.

## Tickets MESA-XXXX

- Códigos correlativos por cliente: `MESA-0001`, `MESA-0002`, ...
- Tabla separada de los tickets del módulo `/tickets` (estos van a `tickets_demo`).
- Status: NEW · OPEN · IN_PROGRESS · RESOLVED · CLOSED · ESCALATED

## KB curada vs RAG documental

| KB curada | RAG documental |
|---|---|
| Artículos problema→solución | PDFs/Word/Excel originales |
| Aprobados por N2 | Indexados automáticamente |
| Estructurados (campos formales) | Texto libre |
| Tabla `kb_articles` | Tabla `agent_knowledge_documents` con pgvector |
| El resolver consulta PRIMERO | El resolver consulta DESPUÉS si no hay KB match |

## Permisos

| Rol | Puede |
|---|---|
| ADMIN / SERVICE_LEAD | Configurar Mesa, ver métricas globales, aprobar KB |
| AMS_CONSULTANT | Atender casos, crear KB, escalar a N2 |
| CLIENT_USER | Abrir consultas, ver sus tickets propios |
| GENERAL_USER | Sin acceso |

## Qué se guarda

- `support_conversations`: hilos de conversación
- `support_messages`: cada mensaje del cliente y del agente
- `support_tickets`: tickets MESA-XXXX con código + sla_minutes + sla_due_at
- `kb_articles`: KB curada validada por N2

## Limitaciones

- Sin integración real con Twilio para llamadas entrantes (modo demo).
- El triage IA hoy es Gemini Flash Lite (free tier, ~1500 RPD).
- Sin SLA dinámico por contrato cliente (todos usan el mismo default).
