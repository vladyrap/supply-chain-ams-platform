# 📞 Canal Telefónico · Manual cliente

> **Ruta:** `/voice-calls` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Tu cliente llama por teléfono → la llamada es atendida por el **agente AMS por voz** (TTS+STT con OpenAI Realtime o equivalente). El sistema graba, transcribe, resume, detecta si requiere humano y deriva a Mesa de Soporte.

Trae:
- **Listado de llamadas** con status (completed, in-progress, ringing, failed, no-answer, canceled)
- **Detalle por llamada** con audio + transcripción + resumen + derivación
- **KPIs en vivo**: total llamadas hoy, % resueltas por IA, % derivadas a humano, duración promedio
- **Polling automático** cada 8 seg para refrescar

## Cuándo abrirlo

- Validar cómo el agente atendió una llamada específica
- Auditar % derivación humana del mes
- Escuchar audio para training del agente
- Cuando un cliente reclama "no me atendieron" → ver si llamó

## Cómo usar

### Listado

Columnas:
- Timestamp + relative (hace 2h)
- From (número origen)
- To (DID destino)
- Status badge
- Duration
- Resolución IA: ícono 🤖 si se resolvió, 👨 si derivada
- Click → detalle full

Filtros:
- Hoy / 7d / 30d
- Status
- Solo derivadas a humano
- Buscar por número

### Detalle de llamada

- Audio player (si grabación habilitada)
- Transcripción turn-by-turn (user / agent)
- Resumen ejecutivo del agente
- Decisión: resolvió / derivó / cliente colgó
- Si derivada → link al ticket de Mesa de Soporte creado
- Latencia media de respuesta IA

### KPIs (tiles superiores)

- **Llamadas hoy**
- **Resueltas IA** (%)
- **Derivadas humano** (%)
- **Duración promedio** (m:ss)
- **Llamadas en curso ahora**

## Configuración

Backend lee:
- Provider (Twilio / Vonage / 3CX / Asterisk)
- DID asignado
- Voz del agente (Aria / Echo / etc.)
- Sistema de derivación (Mesa Soporte, conferencia con humano, transferencia E.164)

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo + descargar audio |
| SERVICE_LEAD | Ver + escuchar + transferir |
| AMS_CONSULTANT | Ver listado + transcripciones |
| CLIENT_USER | Sin acceso |
| GENERAL_USER | Sin acceso |

## Qué se guarda

Backend:
- `voice_calls` (sid, from, to, status, duration_sec, recording_url, transcript, ai_response, resolved_by_ai, ticket_id_derived, created_at)
- Audio en object storage (TTL configurable, default 90d)

## Privacidad

- Grabación SOLO si el aviso "esta llamada puede ser grabada" se reproduce al inicio
- Voz del cliente puede ser anonimizada en transcripción si se configura
- Audio borrable bajo demanda (GDPR derecho al olvido)

## Limitaciones

- Hoy proveedor de telefonía: Twilio (otros via roadmap)
- Sin live transfer multi-hop (la transferencia es one-shot)
- Sin IVR multi-nivel (un solo "menú" lógico)
- Audio en idioma único por config (ES default)
