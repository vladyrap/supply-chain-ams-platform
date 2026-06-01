# 🎓 Entrenamiento IA · Manual técnico

## Archivos clave

| Path | Rol |
|---|---|
| `src/app/(platform)/knowledge/training/page.tsx` | Page con RBAC |
| `src/components/training/AgentTrainingCenter.tsx` | Center principal con tabs |
| `src/components/training/KnowledgeBaseTable.tsx` | CRUD de KI |
| `src/components/training/QnaGenerator.tsx` | Generador Q&A con IA |
| `src/components/training/VersionsTimeline.tsx` | Snapshots de versión |
| `src/components/training/KnowledgeGaps.tsx` | Auto-detected gaps |
| `src/components/training/Simulator.tsx` | Test prompts contra versión current |
| `src/hooks/useAgentTraining.ts` | Hook con estado + métricas |
| `src/services/training.api.ts` | Cliente HTTP |
| `src/types/training.ts` | KnowledgeItem, TrainingQA, TrainingVersion, KnowledgeGap, Priority |

## Tipos clave

```ts
interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  module: string;
  process: string;
  type: "DIAGNOSTIC" | "SOLUTION" | "WORKAROUND" | "CONFIGURATION" | "PROCEDURE";
  source: string;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  status: "DRAFT" | "IN_REVIEW" | "VALIDATED" | "PUBLISHED" | "ARCHIVED" | "REJECTED";
  score: number;
  version: string;
  author: string;
  validatedBy: string | null;
  validationStage: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TrainingQA {
  id: string;
  knowledgeItemId: string;
  question: string;
  expectedAnswer: string;
  approved: boolean;
  createdAt: string;
}

interface TrainingVersion {
  id: string;
  version: string;                  // "v0.3"
  description: string;
  status: "DRAFT" | "READY" | "PUBLISHED" | "ROLLED_BACK" | "ARCHIVED";
  itemCount: number;
  validatedCount: number;
  publishedCount: number;
  changelog: string[];
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface KnowledgeGap {
  id: string;
  title: string;
  description: string;
  module: string;
  process: string;
  priority: Priority;
  suggestedAction: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";
}
```

## Tablas DB

```sql
agent_knowledge (id, title, content, summary, module, process, type, source,
                 tags jsonb, priority, status, score, version, author,
                 validated_by, validation_stage, published_at, created_at, updated_at)

agent_qa (id, knowledge_item_id, question, expected_answer, approved,
          created_at, tags jsonb)

training_versions (id, version, description, status, item_count, validated_count,
                   published_count, changelog jsonb, created_by, created_at,
                   published_at)

knowledge_gaps (id, title, description, module, process, priority,
                suggested_action, status, created_at, updated_at)
```

## Endpoints

```
GET    /api/training/knowledge          → listar KI con filtros
POST   /api/training/knowledge           → crear KI
PATCH  /api/training/knowledge/:id       → editar
DELETE /api/training/knowledge/:id       → archivar
POST   /api/training/knowledge/:id/validate → validar (rol N2+)
POST   /api/training/knowledge/:id/publish  → publicar

GET    /api/training/qa                  → listar Q&A
POST   /api/training/qa                  → crear
POST   /api/training/qa/generate         → generar con Gemini desde KI
PATCH  /api/training/qa/:id/approve      → aprobar

GET    /api/training/versions            → listar versiones
POST   /api/training/versions            → crear nueva
POST   /api/training/versions/:id/publish → publicar (rollback de la anterior)
POST   /api/training/versions/:id/rollback

GET    /api/training/gaps                → listar gaps abiertos
PATCH  /api/training/gaps/:id/status     → cambiar status

POST   /api/training/simulator           → simular query contra versión current
POST   /api/training/polish              → "Pulir agente ahora" — ajusta scores con feedback
GET    /api/training/metrics             → KPIs para dashboard
```

## Few-shot pipeline

Cuando el agente responde a una consulta:
1. Embedding de la query
2. Búsqueda en `agent_qa.approved=true` por similitud (top 3)
3. Embedding también busca en `agent_knowledge.status=PUBLISHED` (top 3)
4. Inyectados al systemPrompt como `[FEW-SHOT Q&A]` y `[CONTEXTO KB]`

`backend/src/services/claude.service.ts::prepareRequest()` lo orquesta.

## Generador Q&A

`backend/src/services/training/qa-generator.service.ts`:

```ts
async function generateQaForKnowledge(knowledgeItemId: string, count: number = 3) {
  const ki = await getKnowledgeItem(knowledgeItemId);
  const prompt = buildQaGenerationPrompt(ki);
  const response = await gemini.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json", responseSchema: QA_SCHEMA },
  });
  const qa: { question: string; expectedAnswer: string }[] = JSON.parse(response.text);
  for (const item of qa.slice(0, count)) {
    await createQa({ knowledgeItemId, ...item, approved: false });
  }
}
```

## Polish · feedback loop

`backend/src/services/training/polish.service.ts::polishAgent()`:

1. Trae feedback de últimas 100 respuestas
2. Por cada `agent_response_provenance`, identifica qué KI/Q&A se usaron
3. Si 👍: incrementa score 0-100 del KI
4. Si 👎: decrementa
5. Si Quality Evaluator marcó hallucinationRisk=HIGH: decrementa fuerte

## Gotchas

- Versión PUBLISHED es una sola. Cuando se publica una nueva, la anterior pasa a ARCHIVED automáticamente.
- Rollback solo cambia qué está published — los KIs no se eliminan.
- Q&A generator consume Gemini rápido (3 QAs por KI). Cuidado con quota.
- `score` se ajusta async con feedback — no es síncrono con el feedback humano.

## Roadmap

- Análisis A/B entre 2 versiones simultáneas.
- Embedding-based gap detection (hoy es por reglas).
- Auto-publish con quality gates configurables.
- Fine-tuning real con los Q&A aprobados (hoy son solo few-shot).
