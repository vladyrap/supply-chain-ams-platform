# 🎙 Reuniones AMS · Manual de venta

> **Subís un audio. Bajás una minuta. Sin tomar notas. Sin perder acuerdos.**

## El pitch en 30 segundos

> "Tu equipo no toma notas en steerings. Sube el audio y el sistema entrega: **resumen ejecutivo + acuerdos con owner y deadline + riesgos + próximas acciones + decisiones + prioridad inferida**. Todo en markdown listo para mail. **El audio se borra a los 30 días, la minuta queda.**"

## Demo de 60 segundos

1. Abrir `/meetings`.
2. Drag & drop un .m4a de 5 minutos.
3. Mostrar pipeline: queued → transcribing → extracting → done (en vivo, 60 seg).
4. Abrir el detalle: scroll por resumen, agreements con owner, risks, next actions.
5. Click "📥 Exportar markdown" → archivo descargado, mostrar el contenido.

## Killer features

| Feature | Valor |
|---|---|
| **Transcripción automática** | Whisper local o SaaS, configurable |
| **Extracción estructurada** | Acuerdos / Riesgos / Acciones / Decisiones / Prioridad |
| **Owner + deadline** | Automático si se mencionó |
| **Export markdown** | Pegable en Confluence, mail, ticket |
| **TTL audio 30d** | Cumplimiento privacy, sin retener voz |
| **5 idiomas** | ES, EN, PT (otros experimental) |
| **Pipeline asíncrono** | No bloqueás UI, BullMQ + workers |
| **Re-procesar** | Si falla, 1 click reintenta |

## ROI

### Caso steering quincenal con cliente
- **Sin sistema**: alguien anota, alguien olvida, el sponsor reclama que algo "no se acordó"
- **Con sistema**: minuta auto-generada con acuerdos verificables
- **Ahorro reclamos**: 2-3 reclamos/trimestre evitados (cada uno = USD 5k-15k credit note)

### Caso reuniones operativas semanales
- 4 reuniones/semana × 1h = 4h/semana del PM tomando notas
- **Con sistema**: PM atiende, audio sube en background, minuta lista
- **Ahorro PM**: 16h/mes recuperadas

### Caso onboarding consultor
- Junior se pierde detalles técnicos en steerings
- **Con sistema**: lee transcripción + resumen, repasa partes específicas
- **Ramp-up**: -30% tiempo a comprensión de contexto histórico

### Caso compliance contractual
- "El cliente acordó X en la reunión Y"
- **Sin sistema**: solo memoria humana
- **Con sistema**: transcripción + acuerdo con timestamp, evidencia legal
- **Mitigación litigios**: invaluable

## Objeciones

### "Mi audio va a un LLM externo y leakea"
> "Por default usamos Whisper LOCAL (en el container backend). NO sale del tenant. Si querés Whisper API (OpenAI/Groq) por costo o velocidad → consent explícito por config. El extractor LLM también es configurable: local Llama o API."

### "¿Y si la reunión es de 3 horas?"
> "Hoy límite 25 MB por archivo (~30-60 min audio). Para reuniones largas → subís en partes o convertís a baja calidad (16kHz mono basta para Whisper)."

### "¿Detecta quién dijo qué?"
> "Hoy no hay diarization (speaker separation). En roadmap. Para reuniones de 2-3 personas, la transcripción es razonable. Para 8+ personas, Whisper no diferencia speakers — recibís el texto plano corrido."

### "Ya usamos Otter.ai / Fireflies"
> "Bien. Esto NO compite — complementa. Otter es genérico. Esto entiende contexto AMS: prioridad alta = SLA, acuerdo = compromiso con owner SAP, etc. Y vive en TU infra."

## Frases que funcionan

- *"Subís audio. Bajás minuta. No tomás notas más en steerings."*
- *"Cada acuerdo con owner y deadline. Cero 'ah pero yo no dije eso'."*
- *"Audio se borra a los 30d. La minuta queda."*
- *"Whisper local. No sale del tenant. Compliance happy."*
