# 🎙 Reuniones AMS · Manual cliente

> **Ruta:** `/meetings` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Subís audio de una reunión (Teams export, grabación móvil, .m4a, .wav) y el sistema:
1. **Transcribe** (Whisper o equivalente)
2. **Extrae** automáticamente:
   - Resumen ejecutivo
   - Acuerdos y compromisos (con dueño y fecha)
   - Riesgos detectados
   - Acciones próximas
   - Decisiones tomadas
   - Prioridad detectada (alta/media/baja)
3. Te lo entrega como **markdown estructurado** descargable

## Cuándo abrirlo

- Después de un steering committee con cliente
- Tras una sesión de kick-off de proyecto
- Para no perder acuerdos en reuniones operativas semanales
- Para auditar lo dicho en una reunión disputada
- Para generar minuta automática y enviarla por mail

## Cómo usar

### Subir audio

1. Click "+ Subir reunión"
2. Drag & drop el archivo o seleccionar:
   - Formatos: MP3, WAV, WebM, OGG, M4A, MP4
   - Máximo: 25 MB
3. Título (opcional, sino usa nombre del archivo)
4. Idioma (default: es)
5. Click "Procesar"

### Pipeline

| Estado | Significado |
|---|---|
| en cola | esperando worker |
| transcribiendo | Whisper procesando |
| extrayendo | LLM extrayendo estructuras |
| listo | resultado disponible |
| error | falló, ver log |

Tiempo típico: 30s-2min según duración del audio.

### Listado

Cada reunión muestra:
- Título
- Tamaño + duración
- Status badge
- Timestamp upload
- Badge prioridad detectada

Click → detalle.

### Detalle

- **Transcripción completa** (texto plano)
- **Resumen ejecutivo** (2-3 párrafos)
- **Acuerdos y compromisos**:
  - Tema
  - Responsable (si se mencionó)
  - Fecha límite (si se mencionó)
- **Riesgos**: bullets
- **Próximas acciones**: bullets con verbo de acción
- **Decisiones**: bullets de resoluciones
- **Prioridad inferida**: alta/media/baja

### Exportar

Click "📥 Exportar markdown" → descarga `.md` con todo (transcripción + resumen + acuerdos + acciones).

Útil para:
- Mandar minuta por mail
- Pegar en Confluence/Notion
- Adjuntar al ticket de un proyecto

### Eliminar

Click "🗑 Eliminar" → borra audio + transcripción + extracción.

⚠️ **No reversible.** El audio se borra del server.

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Subir, ver, eliminar |
| AMS_CONSULTANT | Subir, ver propias |
| CLIENT_USER | Subir, ver propias |
| GENERAL_USER | Sin acceso |

## Qué se guarda

Backend:
- Audio original en object storage (S3/MinIO) con TTL 30 días
- Transcripción + extracción en `meetings` table
- Metadata: tamaño, duración, idioma, user

## Privacidad

- El audio NUNCA sale del backend AMS hacia LLMs externos sin consent
- Si se usa Whisper SaaS: configurable en .env (default: Whisper local en agente AMS)
- TTL automático del audio (30d) — la transcripción queda
- Cliente puede pedir borrado total inmediato

## Limitaciones

- Máximo 25 MB por archivo
- Idiomas: ES, EN, PT (otros experimental)
- Audio multi-speaker no se separa por ahora (no hay diarization)
- Acuerdos extraídos pueden tener falsos positivos (revisar antes de mandar)
- Sin integración directa con Teams/Zoom todavía (subís el export manual)
