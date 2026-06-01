# 🔐 Audit Trail · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/audit/page.tsx` | Page con filtros + tabla + modal detalle |
| `src/components/audit/AuditTable.tsx` | Tabla virtualizada |
| `src/components/audit/AuditDetailModal.tsx` | Modal diff + metadata |
| `src/services/audit.api.ts` | Cliente HTTP |
| Backend `services/audit/audit.service.ts` | logEvent + query |
| Backend `routes/audit.ts` | API |
| Backend `middleware/audit-context.ts` | Captura request_id + user + ip |

## Tipo

```ts
interface AuditEvent {
  id: string;
  ts: string;
  userId: string; userEmail: string; userRole: string;
  ip?: string; userAgent?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  result: "success" | "failure";
  errorMessage?: string;
  payloadBefore?: any;
  payloadAfter?: any;
  metadata?: Record<string, any>;
  requestId?: string;
}

type AuditAction =
  | "login" | "logout" | "login_failed"
  | "create" | "update" | "delete"
  | "approve" | "reject"
  | "adopt_prompt" | "rollback_prompt"
  | "demo_run"
  | "integration_dispatch"
  | "permission_change"
  | "config_change"
  | "export";

type AuditEntity =
  | "ticket" | "knowledge" | "playbook" | "escalation"
  | "user" | "role" | "rbac_assignment"
  | "prompt_version" | "integration_destination" | "integration_delivery"
  | "settings" | "demo_session"
  | "session"
  | "qa_run" | "estimation";
```

## logEvent helper

```ts
// services/audit/audit.service.ts
export async function logEvent(opts: {
  action, entity, entityId?, result?,
  userId, userEmail, userRole,
  ip?, userAgent?, requestId?,
  payloadBefore?, payloadAfter?, metadata?, errorMessage?
}) {
  await pool.query(`
    INSERT INTO audit_log (ts, user_id, user_email, user_role, ip, user_agent,
      action, entity, entity_id, result, error_message,
      payload_before, payload_after, metadata, request_id)
    VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [...]);
}
```

Llamado desde:
- `auth.service.ts` (login/logout)
- `ticket.service.ts` (create/update/delete)
- `knowledge.service.ts`
- `escalation.service.ts`
- `playbook.service.ts`
- `rbac.service.ts` (permission_change)
- `agent-lab/prompt-versions.service.ts` (adopt_prompt)
- `integrations.service.ts` (integration_dispatch on delivery)
- `demo/demo-runner.service.ts` (demo_run)

## Middleware request context

```ts
// middleware/audit-context.ts
app.addHook('preHandler', async (req, reply) => {
  req.auditContext = {
    requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    userAgent: req.headers['user-agent'],
    user: req.user,   // populated by auth middleware
  };
});
```

Services usan `req.auditContext` para pasar a `logEvent`.

## Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT, user_email TEXT, user_role TEXT,
  ip TEXT, user_agent TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  result TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  payload_before JSONB,
  payload_after JSONB,
  metadata JSONB,
  request_id TEXT
);

CREATE INDEX idx_audit_ts ON audit_log (ts DESC);
CREATE INDEX idx_audit_user ON audit_log (user_id, ts DESC);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id, ts DESC);
CREATE INDEX idx_audit_action ON audit_log (action, ts DESC);
```

Particionado por mes recomendado para tenants grandes.

## Inmutabilidad

- API NO expone PATCH ni DELETE sobre `audit_log`.
- Retention cron es el único proceso que borra (rows older than 13 meses).
- Pre-deploy: revisar que migrations nuevas no agreguen UPDATE sobre `audit_log`.

## Diff computation

```ts
// frontend AuditDetailModal
import { diff } from 'deep-diff';

function computeDiff(before, after) {
  const changes = diff(before, after) || [];
  return changes.map(c => ({
    path: c.path?.join('.'),
    kind: c.kind,  // 'E' edit, 'N' new, 'D' delete, 'A' array
    lhs: c.lhs, rhs: c.rhs,
  }));
}
```

## Export CSV

```
GET /api/audit/export?...filters
→ text/csv stream con todos los rows del filtro
```

## Retention cron

```sql
DELETE FROM audit_log WHERE ts < NOW() - INTERVAL '13 months';
```

Corre diario 3am.

## Gotchas

- `payload_before` y `payload_after` pueden contener PII — considerar redaction de campos sensibles antes de loggear.
- `payload_*` jsonb crece rápido — para queries muy frecuentes, considerar archiving a cold storage.
- `request_id` permite correlación con app logs.
- Si tabla crece >100M rows, performance de filtros degrada — particionar por mes y planear queries en partición específica.

## Roadmap

- SIEM integration (forward to Splunk/Datadog).
- Alertas automáticas en patrones (10 login_failed mismo IP en 1 min).
- Field-level redaction config.
- Time-travel: "ver el estado de la entity X en fecha Y" (reconstruct from audit).
- Export firmado (cryptographic signature para auditoría legal).
