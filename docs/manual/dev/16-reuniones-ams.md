# 🎙 Reuniones AMS · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/meetings/page.tsx` | Page con upload + listado + detalle |
| `src/services/meetings.api.ts` | Cliente HTTP |
| `src/lib/export.ts` | `exportMeetingMarkdown(meeting)` |
| Backend `services/meeting.service.ts` | CRUD + pipeline |
| Backend `workers/meeting-transcribe.ts` | BullMQ worker Whisper |
| Backend `workers/meeting-extract.ts` | BullMQ worker LLM extraction |
| Backend `routes/meetings.ts` | API endpoints |

## Tipos

```ts
interface Meeting {
  id: string;
  title: string;
  language: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  durationSec: number | null;
  status: "queued" | "transcribing" | "extracting" | "done" | "error";
  uploadedBy: string;
  uploadedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;

  // Resultado
  transcript?: string;
  summary?: string;                // markdown
  agreements?: AgreementItem[];
  risks?: string[];
  nextActions?: string[];
  decisions?: string[];
  priority?: "alta" | "media" | "baja";
}

interface AgreementItem {
  topic: string;
  owner?: string;
  deadline?: string;     // ISO o texto libre
  status?: "open" | "done" | "blocked";
}
```

## Endpoints

```
POST   /api/meetings              → upload (multipart o base64)
GET    /api/meetings              → listar (filtros: user, client, status)
GET    /api/meetings/:id          → detalle full
DELETE /api/meetings/:id          → borrar audio + data
POST   /api/meetings/:id/retry    → re-procesar si error
```

## Upload formats

Multipart preferido. Base64 también soportado para clientes que no pueden subir blobs:
```json
POST /api/meetings
{
  "title": "Steering ACME 2026-06",
  "language": "es",
  "filename": "rec.m4a",
  "mimeType": "audio/mp4",
  "dataBase64": "..."
}
```

Validaciones:
- `mimeType` en whitelist ALLOWED_MIME
- `sizeBytes <= MAX_BYTES` (25 MB)
- Audio almacenado en `storage://meetings/{userId}/{meetingId}.{ext}`

## Pipeline

```
1. POST /meetings
   → meeting.service.create({ status: 'queued' })
   → upload audio a storage
   → BullMQ enqueue("meetings.transcribe", { meetingId })

2. Worker meetings.transcribe
   → status='transcribing'
   → download audio
   → whisper.transcribe(audio, { language })
   → save meeting.transcript
   → BullMQ enqueue("meetings.extract", { meetingId })

3. Worker meetings.extract
   → status='extracting'
   → llm.extract(transcript) → { summary, agreements, risks, nextActions, decisions, priority }
   → save fields
   → status='done', finishedAt=NOW()

4. Error en cualquier paso → status='error', errorMessage=...
```

## Whisper backend

`backend/src/services/transcription/whisper-local.ts` o `whisper-api.ts` (configurable):

```ts
async function transcribe(audioPath, opts: { language }): Promise<{
  text: string;
  durationSec: number;
  segments?: { start, end, text }[];
}>
```

ENV:
```env
WHISPER_PROVIDER=local                  # local | openai | groq
WHISPER_MODEL=whisper-large-v3          # solo local
WHISPER_API_KEY=...                     # solo openai/groq
```

## Extraction prompt

```text
Sos un asistente especializado en extraer estructura de minutas AMS SAP.

Input: transcripción de reunión.

Output JSON con:
{
  "summary": "<2-3 párrafos en markdown>",
  "agreements": [{ "topic": "...", "owner": "...", "deadline": "..." }],
  "risks": ["..."],
  "nextActions": ["verbo + objeto..."],
  "decisions": ["..."],
  "priority": "alta" | "media" | "baja"
}

Reglas:
- Owner solo si se mencionó nombre explícito.
- Deadline solo si se mencionó fecha o "antes de Y".
- Priority "alta" si hay incidentes productivos / SLA mencionados.
- Si no hay agreements, [].
```

## Schema

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  language TEXT DEFAULT 'es',
  filename TEXT, mime_type TEXT,
  size_bytes BIGINT, duration_sec INT,
  status TEXT NOT NULL DEFAULT 'queued',
  uploaded_by TEXT, client_id TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  error_message TEXT,

  transcript TEXT,
  summary TEXT,
  agreements JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  next_actions JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  priority TEXT
);

CREATE INDEX idx_meetings_user_uploaded ON meetings (uploaded_by, uploaded_at DESC);
```

## TTL audio

Cron job diario:
```sql
SELECT id, filename FROM meetings
WHERE uploaded_at < NOW() - INTERVAL '30 days'
  AND status = 'done';
-- delete files from storage, mark meetings.audio_deleted = true
```

Transcripción + extracción QUEDA. Solo el audio se borra.

## Export markdown

```ts
// src/lib/export.ts
function exportMeetingMarkdown(m: Meeting): string {
  return `# ${m.title}
*${m.uploadedAt} · ${fmtSec(m.durationSec)} · ${m.language}*

## Resumen
${m.summary}

## Acuerdos
${m.agreements.map(a => `- **${a.topic}** ${a.owner ? `(@${a.owner})` : ''} ${a.deadline ? `→ ${a.deadline}` : ''}`).join('\n')}

## Riesgos
${m.risks.map(r => `- ${r}`).join('\n')}

## Próximas acciones
${m.nextActions.map(a => `- ${a}`).join('\n')}

## Decisiones
${m.decisions.map(d => `- ${d}`).join('\n')}

## Transcripción completa
${m.transcript}
`;
}
```

## Gotchas

- Whisper local requiere `ffmpeg` instalado en el container backend.
- Archivos m4a a veces tienen mimeType `audio/mp4` — la whitelist contempla ambos.
- LLM extract puede alucinar owners si la conversación menciona nombres ambiguos. Frontend marca como "sugerido" hasta que el usuario confirme.
- BullMQ requiere Redis 7 corriendo.
- Si `WHISPER_PROVIDER=openai` → audio sale a OpenAI. Consent del cliente obligatorio.

## Roadmap

- Diarization (speaker A / B / C separados).
- Integración nativa Teams/Zoom (sin export manual).
- Search full-text en transcripciones.
- Asociar reunión a ticket o cliente.
- Mention extraction (@usuario) automático.
- TTL configurable por tenant.
