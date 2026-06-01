# 🧪 Agent Lab · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/agent-lab/page.tsx` | Page con 5 tabs |
| `src/components/agent-lab/FeedbackButtons.tsx` | 👍/👎 inline en mensajes |
| `src/services/agent-lab.api.ts` | Cliente HTTP completo |
| Backend `services/agent-lab/feedback.service.ts` | CRUD feedback |
| Backend `services/agent-lab/trace.service.ts` | Capture + read traces |
| Backend `services/agent-lab/kb-wizard.service.ts` | Generate drafts |
| Backend `services/agent-lab/playground.service.ts` | Run + diff |
| Backend `services/agent-lab/prompt-versions.service.ts` | Versionado prompts |
| Backend `routes/agent-lab.ts` | API endpoints |

## Tipos

```ts
type FeedbackSource = "support" | "agent_chat" | "voice" | "other";
type FeedbackKind = "thumbs_up" | "thumbs_down";

interface AiFeedback {
  id: string;
  source: FeedbackSource;
  kind: FeedbackKind;
  conversationId: string;
  messageId: string;
  markedBy: string; markedAt: string;
  comment?: string;
  // expanded
  question?: string; answer?: string;
  confidence?: "alta"|"media"|"baja";
  sapModule?: string;
  model?: string;
}

interface FeedbackStats {
  total: number;
  bySource: Record<FeedbackSource, { up: number; down: number }>;
  byModule: Record<string, { up: number; down: number }>;
}

interface ConversationTrace {
  conversationId: string;
  turns: TraceTurn[];
}

interface TraceTurn {
  ts: number;
  role: "user" | "agent";
  content: string;
  prompt?: string;        // prompt completo enviado al LLM
  sources?: KnowledgeSource[];
  model?: string;
  tokensIn?: number; tokensOut?: number;
  latencyMs?: number;
}

interface ConvertibleTicket {
  ticketId: string;
  title: string;
  sapModule: string;
  confidence: string;
  score: number;          // heurística de "interés"
  hasPositiveFeedback: boolean;
}

interface KbDraft {
  id: string;
  sourceTicketId: string;
  content: string;       // markdown
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
  createdBy: string; createdAt: string;
}

interface PromptVersion {
  id: string;
  promptText: string;
  versionLabel: string;
  adoptedAt?: string;
  adoptedBy?: string;
  metrics?: { sampleQueries: number; avgScoreDelta?: number };
}

interface PlaygroundRunResult {
  query: string;
  v1Response: string; v2Response: string;
  v1Sources: KnowledgeSource[]; v2Sources: KnowledgeSource[];
  v1LatencyMs: number; v2LatencyMs: number;
  v1TokensOut: number; v2TokensOut: number;
}
```

## API

```
// Feedback
GET   /api/agent-lab/feedback?source&kind&module&from&to&limit
GET   /api/agent-lab/feedback/stats
POST  /api/agent-lab/feedback                  → {source, kind, conversationId, messageId, comment?}

// Replay
GET   /api/agent-lab/conversations/:id/trace   → ConversationTrace

// Wizard
GET   /api/agent-lab/convertible-tickets       → ConvertibleTicket[]
POST  /api/agent-lab/drafts/generate           → {sourceTicketId} → KbDraft
PATCH /api/agent-lab/drafts/:id                → {content, status}
POST  /api/agent-lab/drafts/:id/commit         → creates knowledge item

// Playground
POST  /api/agent-lab/playground/run            → {queries[], promptOverride?} → PlaygroundRunResult[]
POST  /api/agent-lab/prompts/adopt             → {promptText, label} → PromptVersion
GET   /api/agent-lab/prompts/active            → PromptVersion
GET   /api/agent-lab/prompts/history           → PromptVersion[]
```

## Schema

```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  conversation_id TEXT, message_id TEXT,
  marked_by TEXT, marked_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT,
  ticket_id TEXT, sap_module TEXT,
  metadata JSONB
);

CREATE TABLE conversation_traces (
  conversation_id TEXT PRIMARY KEY,
  turns JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kb_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ticket_id TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  created_by TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  version_label TEXT,
  adopted_at TIMESTAMPTZ, adopted_by TEXT,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Trace capture

Every agent call wraps:
```ts
await traceCaptureTurn({
  conversationId, role: "agent", content: response,
  prompt: builtPrompt, sources: ragSources,
  model, tokensIn, tokensOut, latencyMs,
});
```

`traces.turns` se appendea jsonb. TTL 30 días (limpieza cron).

## Wizard KB generation

```ts
async function generateDraft(ticketId): Promise<KbDraft> {
  const ticket = await getTicket(ticketId);
  const prompt = `Convertí este caso AMS resuelto en un artículo KB con secciones:
  # Título
  ## Problema
  ## Causa raíz
  ## Solución paso a paso
  ## Validación
  ## Referencias SAP

  Input: ${JSON.stringify({ title, message, response, sapModule, process })}`;

  const draft = await llm.generate(prompt);
  return saveDraft({ sourceTicketId: ticketId, content: draft, status: 'DRAFT' });
}
```

## Playground run

```ts
async function runPlayground(queries, promptOverride): Promise<PlaygroundRunResult[]> {
  const activePrompt = await getActivePrompt();
  const results = [];
  for (const q of queries) {
    const [v1, v2] = await Promise.all([
      runWithPrompt(q, activePrompt.promptText),
      runWithPrompt(q, promptOverride),
    ]);
    results.push({ query: q, ...zip(v1, v2) });
  }
  return results;
}
```

## Adoptar prompt

```ts
adoptPrompt(promptText, label) {
  // mark current as superseded
  UPDATE prompt_versions SET adopted_at = NULL WHERE adopted_at IS NOT NULL;
  // insert new active
  INSERT INTO prompt_versions(prompt_text, version_label, adopted_at, adopted_by)
    VALUES ($1, $2, NOW(), $user);
}
```

## Gotchas

- Trace storage crece rápido. TTL 30d default — config por tenant.
- Playground corre real LLM calls — cuesta tokens. Limit per session.
- Adoptar prompt es instantáneo en producción — sin A/B. Para safety, hacer canary primero.
- `convertibleTickets` ranking heurística simple: high_confidence + thumbs_up + módulo no muy representado en KB.

## Roadmap

- A/B testing automático: 5% tráfico al prompt nuevo, métricas comparativas, auto-rollback.
- Curación asistida con clustering ("estos 8 feedback parecen el mismo problema").
- Inline annotations en transcripts ("esta parte fue rara").
- Export trace a Langfuse/Helicone para análisis profundo.
- Auto-detect prompt drift (cambios pequeños que degradan en métricas).
