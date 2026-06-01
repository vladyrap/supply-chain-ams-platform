# 📞 Canal Telefónico · Manual de venta

> **Tu agente AMS atiende llamadas 24/7. En voz. En español. Y crea tickets.**

## El pitch en 30 segundos

> "Tu cliente marca un DID, el agente AMS atiende en VOZ, conversa en español natural, resuelve si puede (responde con KB) o **crea un ticket en Mesa de Soporte con resumen ejecutivo y transfiere al humano**. Cada llamada queda con audio, transcripción turn-by-turn y resolución. **24/7 sin agente humano disponible.**"

## Demo de 90 segundos

1. Marcar al DID del demo.
2. Atender el agente: "Hola, soy el agente AMS, ¿en qué te puedo ayudar?"
3. Decir: "Tengo problema con MIGO error M7 022".
4. Agente responde con knowledge (parámetro determinación stock).
5. Decir: "necesito hablar con un consultor".
6. Agente: "Te derivo. Estoy creando un ticket con todo el contexto. Un consultor te contactará en 4h por el SLA."
7. Abrir `/voice-calls` → ver la llamada recién terminada con transcript + resumen + ticket linkeado.

## Killer features

| Feature | Valor |
|---|---|
| **Voz real-time** | OpenAI Realtime API, no batch slow |
| **Conversación natural ES** | TTS Aria/Alloy, no robótica |
| **RAG en vivo** | Consulta KB durante la llamada |
| **Tool calls** | "create_support_ticket", "transfer_to_human", "lookup_knowledge" |
| **Recording + transcript** | Auditoría completa |
| **Derivación inteligente** | Crea ticket con contexto, no transfer ciega |
| **24/7** | Sin agente humano disponible |
| **Multi-DID** | Distintos números por cliente/línea |

## ROI

### Caso fuera de horario
- Cliente llama a las 22h, equipo AMS opera 9-18h
- **Sin sistema**: contestadora "vuelva a llamar mañana", cliente furioso
- **Con sistema**: agente atiende, escucha, crea ticket P1 con audio + transcripción, dispara alerta on-call
- **Mejora NPS**: +15-25 puntos por accesibilidad real

### Caso L1 voz
- 200 llamadas/mes, 60% son consultas estándar resolvibles con KB
- **Sin sistema**: necesitás 2 humanos full-time atendiendo
- **Con sistema**: 60% × 200 = 120 llamadas resueltas por IA, 80 derivadas → 1 humano basta
- **Ahorro**: USD 30k-60k/año en headcount L1

### Caso compliance call recording
- Regulación financiera/seguros requiere grabar y archivar todas las llamadas
- **Sin sistema**: setup manual con sistema legacy de telefonía, USD 10k-30k integración
- **Con sistema**: built-in, audio + transcript en S3 con TTL configurable
- **Ahorro setup**: USD 15k-25k inversión inicial

### Caso onboarding
- Sponsor pregunta "¿qué pasa si llaman fuera de horario?"
- **Sin sistema**: respuesta evasiva
- **Con sistema**: demo en vivo, marcás el DID, atiende → conversion +30%

## Objeciones

### "Mi cliente odia a las máquinas"
> "La voz del agente es indistinguible de humano (OpenAI Realtime + Aria/Alloy). El agente se PRESENTA como agente IA (transparencia) y deriva a humano apenas el cliente lo pide. Es asistencia, no engaño. Y atender la 1ª llamada del cliente >> que suene la contestadora."

### "¿Y la privacidad?"
> "Se aviza 'esta llamada puede ser grabada' al inicio. Audio en TU storage (no OpenAI). Transcripción tu KMS. Borrado bajo demanda GDPR-compliant."

### "Twilio cobra caro"
> "Sí. Costo típico: USD 0.013/min Twilio + USD 0.10/min OpenAI Realtime = ~USD 7/hora de llamada. Una llamada de 3 min cuesta USD 0.35. Un humano por hora cuesta USD 30. Math obvia."

### "¿Funciona con mi PBX (3CX, Asterisk)?"
> "Hoy probado con Twilio. Roadmap incluye Vonage, Plivo, 3CX SIP, Asterisk. Si tu PBX expone SIP/WebRTC, viable."

## Frases que funcionan

- *"Tu cliente marca, atiende un agente, queda con ticket. Las 3 AM también."*
- *"60% de las llamadas se resuelven sin humano. La otras llegan al humano con todo el contexto."*
- *"USD 0.35 una llamada de 3 min. Vs USD 30 un humano por hora."*
- *"Audio + transcript de cada llamada. Compliance financiera built-in."*
