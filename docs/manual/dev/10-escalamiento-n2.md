# 🚨 Escalamiento N2 · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/escalation-n2/page.tsx` | Page con RBAC |
| `src/components/escalation/EscalationCenter.tsx` | Center con tabs |
| `src/components/escalation/EscalationInbox.tsx` | Bandeja de candidatos |
| `src/components/escalation/EscalationHistory.tsx` | Historial |
| `src/components/escalation/EscalationMetrics.tsx` | KPIs |
| `src/components/escalation/EscalationRules.tsx` + `EscalationRuleFormModal.tsx` | CRUD reglas |
| `src/components/escalation/N2Responsibles.tsx` + `N2ResponsibleFormModal.tsx` | CRUD responsables |
| `src/components/escalation/EscalationSettings.tsx` | Settings |
| `src/components/escalation/ItsmConnectors.tsx` | Connectors Jira/SN/SMTP |
| `src/components/escalation/EscalationModal.tsx` | Modal escalar (con TcModalShell) |
| `src/components/escalation/EscalationDetailModal.tsx` | Modal detalle (con TcModalShell) |
| `src/components/escalation/EscalationQuickAction.tsx` | Wrapper para Ticket Command Center |
| `src/components/escalation/AssigneeSuggestionCard.tsx` | Sugerencia asignado |
| `src/components/escalation/ItsmTicketPreview.tsx` | Preview payload Jira/SN |
| `src/components/escalation/EscalationStatusBadge.tsx` | Badge status |
| `src/components/escalation/EscalationEstimateDiff.tsx` | Diff N1 vs N2 cuando ajustan |
| `src/hooks/useEscalation.ts` | Hook estado + sync backend |
| `src/utils/escalation-engine.ts` | suggestEscalation, buildJiraPayload, buildServiceNowPayload |
| `src/services/escalation.api.ts` | Cliente HTTP |
| `src/types/escalation.ts` | Tipos completos |
| `backend/src/services/escalation.service.ts` | DB + lógica server (5 tablas) |

## Tablas DB (5)

```sql
escalation_records (id, incident_id, escalation_number "ESC-YYYY-NNN",
                    from_level, to_level, reason, summary, client_summary,
                    assigned_to, assigned_to_name, assigned_team,
                    channel, rule_id, external_ticket_id, external_ticket_url,
                    status, sla_target, sla_minutes,
                    created_by, approved_by, approved_at, requires_approval,
                    mode, payload jsonb, events jsonb,
                    created_at, updated_at)

escalation_rules (id, name, description, conditions jsonb,
                  assignment_strategy, sla_minutes, channel,
                  is_active, priority, created_at, updated_at)

n2_responsibles (id, name, email, skills jsonb, sap_modules jsonb,
                 max_active_cases, availability_status, created_at, updated_at)

itsm_connectors (id INT, payload jsonb)  -- singleton id=1 con config

escalation_settings (id INT, payload jsonb)  -- singleton id=1 con settings
```

## Endpoints

```
GET    /api/escalation/snapshot     → { rules, responsibles, records, connectors, settings, metrics }
POST   /api/escalation/records       → crear record
PATCH  /api/escalation/records/:id   → actualizar (status, payload, events)
DELETE /api/escalation/records/:id

POST   /api/escalation/rules         → crear rule
PATCH  /api/escalation/rules/:id
DELETE /api/escalation/rules/:id

POST   /api/escalation/responsibles
PATCH  /api/escalation/responsibles/:id
DELETE /api/escalation/responsibles/:id

PATCH  /api/escalation/connectors    → update config
PATCH  /api/escalation/settings      → update settings

POST   /api/escalation/reset-demo    → wipe + seed defaults
```

## EscalationRecord shape

```ts
interface EscalationRecord {
  id: string;
  incidentId: string;             // ticket.key
  escalationNumber: string;       // ESC-2026-001
  fromLevel: 1 | 2;
  toLevel: 2 | 3;
  reason: string;
  summary: string;
  clientSummary?: string;
  assignedTo?: string;            // N2Responsible.id
  assignedToName?: string;
  assignedTeam?: string;
  channel: "JIRA" | "SERVICENOW" | "MANUAL";
  ruleId?: string;
  externalTicketId?: string;
  externalTicketUrl?: string;
  status: EscalationStatus;
  slaTarget: string;
  slaMinutes: number;
  createdBy: string;
  approvedBy?: string;
  requiresApproval: boolean;
  mode: "DEMO" | "REAL";
  payload?: ItsmTicketPayload;
  events: EscalationEvent[];
  estimatedResolution?: TicketEstimatedResolution | null;     // copia del incidente
  estimatedResolutionOriginal?: TicketEstimatedResolution | null;  // baseline para diff
  createdAt: string;
  updatedAt: string;
}
```

## EscalationQuickAction

```tsx
<EscalationQuickAction
  incident={incidentLike}           // Ticket → IncidentSummary adapter
  actingUserId="auth_xxx"
  canApprove={role === "admin" || role === "aprobador"}
  variant="full"
/>
```

Lógica:
1. Memo: `existing = records.find(r => r.incidentId === incident.id)`
2. Si existe → muestra `EscalationStatusBadge` + número + abre `EscalationDetailModal`
3. Si NO existe → botón "🚨 Escalar N2" + `EscalationModal` al click

## Suggest engine

```ts
// src/utils/escalation-engine.ts
suggestEscalation(incident): {
  matchedRule: EscalationRule | null;
  suggestedAssignee: N2Responsible | null;
  severity: Severity;
  reason: string;
}
```

Evalúa `rules.conditions` (formato JSON con operadores) contra el incidente.

## Payload builders

```ts
// Para Jira:
buildJiraPayload(record, incident): {
  project: { key },
  issuetype: { name: "Incident" },
  summary: ...,
  description: ...,                    // markdown con todo el contexto
  priority: { name: ... },
  labels: ["ams", "escalation", ...]
}

// Para ServiceNow:
buildServiceNowPayload(record, incident): {
  short_description, description, priority,
  assignment_group, category, subcategory
}
```

## Diff N1 vs N2

`EscalationEstimateDiff.tsx` compara `record.estimatedResolutionOriginal` vs `record.estimatedResolution`:

- Si son iguales → solo muestra current.
- Si difieren → muestra tabla con flechas (↑↓→↹) y deltas.

Cuando N2 recalcula desde el detalle, queda registrado el diff.

## Backend mode (demo vs real)

```ts
// backend/src/services/jira.service.ts
async function createJiraIssue(payload, opts: { confirmReal?: boolean; estimate?: TicketEstimatedResolution }) {
  // Si !env.enabled → demoResult()
  // Si !opts.confirmReal → demoResult({ reason: "human_confirmation_required" })
  // Si opts.estimate → appendEstimateToDescription(payload.description, estimate)
  // POST real a Jira Cloud
}
```

Mismo patrón en `servicenow.service.ts`.

## Gotchas

- `escalation_number` se genera con counter por año (ESC-2026-001).
- `payload jsonb` puede contener cualquier shape — para el frontend hay `ItsmTicketPayload` discriminated union.
- El diff N1↔N2 funciona solo si N2 recalcula desde el detalle (genera `estimatedResolution` nuevo manteniendo `estimatedResolutionOriginal`).
- Demo mode siempre devuelve `success: true` + ticketId fake.

## Roadmap

- Notificaciones push al responsable (hoy solo email opcional).
- Asignación ML basada en histórico de quién resolvió bien casos parecidos.
- Webhooks bidireccionales (escuchá Jira webhook para actualizar status).
- Two-level escalation (N2 → N3 cuando aplique).
