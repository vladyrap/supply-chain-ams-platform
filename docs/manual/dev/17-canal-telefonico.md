# 📞 Canal Telefónico · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/voice-calls/page.tsx` | Listado + KPIs + polling 8s |
| `src/app/(platform)/voice-calls/[sid]/page.tsx` | Detalle por sid |
| `src/services/voice.api.ts` | Cliente HTTP |
| `src/components/voice/VoiceControls.tsx` | Mute, hangup, transfer |
| `src/components/voice/SpeechPlayer.tsx` | Player de audio (HTMLAudioElement) |
| Backend `services/voice/twilio-handler.ts` | Webhook Twilio → conduce conversación |
| Backend `services/voice/realtime-bridge.ts` | Bridge a OpenAI Realtime / similar |
| Backend `routes/voice.ts` | API + webhooks |

## Tipos

```ts
interface VoiceCall {
  sid: string;                  // Twilio CallSid
  from: string;                 // +56912345678
  to: string;                   // DID
  status: "queued" | "ringing" | "in-progress" | "completed" | "busy" | "failed" | "no-answer" | "canceled";
  durationSec: number | null;
  startedAt: string;
  endedAt: string | null;
  recordingUrl?: string;
  transcript?: VoiceTurn[];
  aiResponse?: string;          // resumen final
  resolvedByAi: boolean;
  derivedToTicket?: string;     // ticket.key si se creó
  derivedReason?: string;
  language: string;
  agentVoice?: string;
}

interface VoiceTurn {
  ts: number; speaker: "user" | "agent";
  text: string;
  audioUrl?: string;
  latencyMs?: number;
}
```

## API

```
GET   /api/voice/calls?range&status&humanOnly&limit
GET   /api/voice/calls/:sid
POST  /api/voice/calls/:sid/transfer  → transfer al ext humano
POST  /api/voice/calls/:sid/hangup
POST  /api/voice/calls/:sid/derive    → crea ticket Mesa Soporte con context

POST  /api/voice/webhooks/twilio       → entry point Twilio Voice
POST  /api/voice/webhooks/twilio/recording  → callback recording ready
```

## Twilio flow

```
1. Cliente llama → Twilio POST /webhooks/twilio { CallSid, From, To }
2. Backend responde TwiML <Connect><Stream> con WebSocket URL al backend
3. WebSocket bidirectional:
   - Twilio Media Stream → backend (audio cliente)
   - backend → Twilio (audio agente TTS)
4. Backend bridge → OpenAI Realtime API (audio in/out + tool calls)
5. Tool calls disparables:
   - "create_support_ticket" → crea ticket Mesa con resumen
   - "transfer_to_human" → Twilio <Dial> a ext humano
   - "lookup_knowledge" → query RAG
6. On call end → Twilio POST con recording URL
7. Backend descarga recording + transcribe + guarda turn-by-turn
```

## Schema

```sql
CREATE TABLE voice_calls (
  sid TEXT PRIMARY KEY,
  from_number TEXT, to_number TEXT,
  status TEXT,
  started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
  duration_sec INT,
  recording_url TEXT,
  transcript JSONB,
  ai_response TEXT,
  resolved_by_ai BOOLEAN DEFAULT false,
  derived_to_ticket TEXT,
  derived_reason TEXT,
  language TEXT DEFAULT 'es',
  agent_voice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_calls_started ON voice_calls (started_at DESC);
CREATE INDEX idx_voice_calls_status ON voice_calls (status);
```

## ENV

```env
VOICE_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_DID=+56...
TWILIO_WEBHOOK_BASE=https://ams.miempresa.com

OPENAI_REALTIME_API_KEY=...
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_REALTIME_VOICE=alloy

VOICE_ANNOUNCE_RECORDING=true
VOICE_LANGUAGE_DEFAULT=es
VOICE_AUDIO_TTL_DAYS=90
```

## Polling frontend

```ts
useEffect(() => {
  const i = setInterval(() => loadCalls(), POLL_MS);  // 8000
  return () => clearInterval(i);
}, []);
```

Para calls in-progress se podría usar SSE en lugar de poll (roadmap).

## Audio storage

Recording en S3/MinIO:
```
s3://ams-voice/{tenant}/{YYYY}/{MM}/{sid}.mp3
```

Pre-signed URL con TTL 1h para frontend player. Cron diario borra files > `VOICE_AUDIO_TTL_DAYS`.

## Gotchas

- Twilio Media Stream usa μ-law 8kHz por default — Resamplear a 24kHz para OpenAI Realtime.
- WebSocket bridge debe correr en mismo proceso o instancia con sticky sessions.
- Transfer Twilio one-shot — no podés re-transferir desde una transferencia (limitación SIP).
- OpenAI Realtime cobra por minuto de audio en ambos sentidos (in + out).
- Si bridge se cae mid-call → Twilio reproduce mensaje "se cortó la comunicación" y termina.

## Roadmap

- Multi-provider: Vonage, Plivo, Asterisk (FreePBX), 3CX.
- SSE para live updates de calls in-progress.
- Sentiment analysis en tiempo real con coaching tip al agente humano.
- IVR multi-nivel ("marque 1 para soporte, 2 para ventas").
- Conferencia warm transfer (cliente + humano + IA todos juntos por 30s antes de soltar IA).
- Multi-language detection automática.
