# 📕 Playbooks AMS · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/playbooks/page.tsx` | Page con RBAC |
| `src/components/playbooks/PlaybooksCenter.tsx` | Center principal |
| `src/components/playbooks/PlaybookCard.tsx` | Card en lista |
| `src/components/playbooks/PlaybookDetailModal.tsx` | Modal con detalle + ejecución |
| `src/components/playbooks/PlaybookFormModal.tsx` | Modal crear/editar |
| `src/components/playbooks/PlaybookExecutionChecklist.tsx` | Checklist interactivo |
| `src/components/playbooks/PlaybookQuickAction.tsx` | Wrapper reusable desde Command Center |
| `src/hooks/usePlaybooks.ts` | Hook estado + localStorage |
| `src/lib/playbooks/seedData.ts` | Seeds de 8-10 playbooks demo |
| `src/types/ams-modules.ts` | `AmsPlaybook`, `PlaybookExecution`, `PlaybookStep` |

## Tipos

```ts
interface AmsPlaybook {
  id: string;
  title: string;
  description: string;
  sapModule: string;
  process: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  triggerWhen: string;
  steps: PlaybookStep[];
  requiredData: string[];
  responsibleRole: string;
  slaTargetMinutes: number;
  escalationRules: string;
  evidenceRequired: string[];
  communicationTemplate: string;
  relatedKnowledgeItems: string[];
  relatedScopeItems: string[];
  status: "DRAFT" | "ACTIVE" | "DEPRECATED" | "ARCHIVED";
  version: string;
  owner: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  responsibleRole?: string;
  evidenceHint?: string;
  estimatedMinutes?: number;
}

interface PlaybookExecution {
  id: string;
  playbookId: string;
  startedAt: string;
  finishedAt: string | null;
  startedBy: string;
  incidentId: string | null;        // ticket.key si se asoció a un ticket
  completedSteps: string[];          // step ids
  notes: Record<string, string>;     // stepId → nota
  status: "active" | "completed" | "abandoned";
}
```

## API del hook

```ts
const pb = usePlaybooks();

pb.playbooks                                       // AmsPlaybook[]
pb.executions                                      // PlaybookExecution[]

pb.createPlaybook(input)
pb.updatePlaybook(id, patch)
pb.deletePlaybook(id)

pb.startExecution(playbookId, incidentId?, startedBy?)  → PlaybookExecution
pb.toggleStep(executionId, stepId)
pb.setStepNote(executionId, stepId, note)
pb.completeExecution(executionId)
pb.abandonExecution(executionId)
```

## Storage

LocalStorage:
- `supply-chain-ams-playbooks` → array de AmsPlaybook
- `supply-chain-ams-playbook-runs` → array de PlaybookExecution

Sincronización backend pendiente (tabla `playbooks` + `playbook_executions`).

## Wrapper PlaybookQuickAction

```tsx
<PlaybookQuickAction
  ticketKey="AMS-201"
  ticketTitle="MIGO error M7 022"
  sapModule="MM"
  actor="Pablo Admin"
/>
```

Lógica de matching automático:
1. Filtrar playbooks con `status === "ACTIVE"`
2. Filtrar por `sapModule === ticket.sapModule`
3. Score por palabras coincidentes entre `title.lower().split(/\W+/)` y `ticketTitle.lower()`
4. Tomar el de mayor score

Si ya hay execution activa para ese ticket → mostrar checklist directo en lugar del selector.

## Extender

**Agregar playbook seed:**
```ts
// src/lib/playbooks/seedData.ts
export function buildDefaultPlaybooks(): AmsPlaybook[] {
  return [
    // ...
    {
      id: "pb_my_new",
      title: "Mi nuevo playbook",
      // ...
      steps: [
        { id: "s1", title: "Paso 1", description: "...", estimatedMinutes: 10 },
        // ...
      ],
      status: "ACTIVE",
    },
  ];
}
```

**Migrar a backend:**
```sql
CREATE TABLE playbooks (
  id UUID PRIMARY KEY, title TEXT, ..., steps JSONB, status TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);
CREATE TABLE playbook_executions (
  id UUID PRIMARY KEY, playbook_id UUID REFERENCES playbooks,
  incident_id TEXT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  completed_steps JSONB, notes JSONB, status TEXT
);
```

Después modificar `usePlaybooks` para sync con `/api/playbooks/*` y `/api/playbook-executions/*`.

## Gotchas

- LocalStorage tiene cap de ~5 MB. Si tenés 100+ playbooks con muchos steps, podés tocar techo. Migrá a backend.
- `incidentId` en execution es `ticket.key` (AMS-XXX), no UUID.
- `completedSteps` es array de IDs — el orden no importa, solo presencia.

## Roadmap

- Backend persistence.
- Asignación multi-rol por paso.
- SLA alerts cuando una execution está cerca del límite.
- Templates de playbooks por industria (Manufactura, Retail, etc.).
