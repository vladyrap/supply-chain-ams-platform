# 🛠 Administración · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/admin/page.tsx` | Page central con tabs |
| `src/app/(platform)/admin/eval/page.tsx` | Evaluador IA |
| `src/components/admin/UsersTable.tsx` | CRUD users |
| `src/components/admin/RoleEditor.tsx` | Matrix permissions |
| `src/components/admin/InvitesPanel.tsx` | Invites |
| `src/components/admin/MaintenancePanel.tsx` | Re-index, cleanup, vacuum |
| `src/components/admin/BackupsPanel.tsx` | List + restore |
| `src/components/admin/EmailTemplatesEditor.tsx` | Markdown editor + preview |
| `src/components/admin/AccessLockedCard.tsx` | Card mostrado cuando no tiene permiso |
| `src/services/admin.api.ts` | Cliente HTTP |
| `src/hooks/useAccessAdmin.ts` | Hook gating admin features |
| `src/utils/rbac.ts` | `hasPermission`, `migrateRolesAddingMissingScreens`, defaults |
| `src/types/rbac.ts` | `PlatformRole`, `PlatformUser`, `RoleCode`, `ScreenCode` |
| Backend `services/rbac/*.ts` | CRUD users, roles, assignments |
| Backend `services/admin/maintenance.service.ts` | Re-index, cleanup |
| Backend `services/admin/backups.service.ts` | pg_dump wrapper |
| Backend `routes/admin.ts` | API endpoints |

## Tipos RBAC

```ts
type RoleCode = "ADMIN" | "SERVICE_LEAD" | "AMS_CONSULTANT" | "CLIENT_USER" | "GENERAL_USER" | string;

type ScreenCode =
  | "tickets" | "knowledge" | "playbooks" | "dashboard"
  | "agent" | "support_desk" | "history" | "meetings"
  | "escalation_n2" | "quality_evaluator" | "document_factory"
  | "testing_intelligence" | "time_estimator"
  | "integrations" | "sap_readonly" | "voice_calls" | "agent_lab"
  | "mission_control" | "topology" | "tv" | "demo" | "war_room"
  | "brain" | "hud" | "launchpad" | "wallboard" | "forecast" | "flow"
  | "welcome" | "executive" | "business_value" | "agent_readiness"
  | "audit" | "settings" | "admin";

type ActionCode = "view" | "edit" | "configure" | "approve" | "delete" | "export";

interface PlatformRole {
  code: RoleCode;
  name: string;
  description: string;
  is_system: boolean;
  permissions: Partial<Record<ScreenCode, Partial<Record<ActionCode, boolean>>>>;
}

interface PlatformUser {
  id: string;
  name: string; email: string;
  roleCode: RoleCode;
  serviceLevel: "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE";
  status: "ACTIVE" | "INACTIVE" | "PENDING_INVITE";
  createdAt: string;
  lastLoginAt?: string;
}

interface UserInvite {
  id: string;
  email: string;
  roleCode: RoleCode;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  token: string;        // single-use link
}
```

## Endpoints

```
// Users
GET    /api/admin/users
POST   /api/admin/users                    → create + maybe invite
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id                → soft delete (status=INACTIVE)
POST   /api/admin/users/:id/force-logout

// Roles
GET    /api/admin/roles
POST   /api/admin/roles                    → custom only
PATCH  /api/admin/roles/:code              → blocked si is_system
DELETE /api/admin/roles/:code              → idem

// Invites
GET    /api/admin/invites
POST   /api/admin/invites                  → create + send email
DELETE /api/admin/invites/:id
POST   /api/admin/invites/:id/resend

// Maintenance
POST   /api/admin/maintenance/reindex-embeddings
POST   /api/admin/maintenance/clear-cache
POST   /api/admin/maintenance/regenerate-demo-seeds
POST   /api/admin/maintenance/vacuum-db

// Backups
GET    /api/admin/backups
POST   /api/admin/backups                  → create on-demand
GET    /api/admin/backups/:id/download
POST   /api/admin/backups/:id/restore      → PELIGROSO, requires confirm

// Templates
GET    /api/admin/email-templates
PATCH  /api/admin/email-templates/:key
POST   /api/admin/email-templates/:key/test  → send to current admin email
```

## Default roles seed

```ts
// src/utils/rbac.ts
export function buildDefaultRoles(): PlatformRole[] {
  return [
    { code: "ADMIN", name: "Administrador", is_system: true,
      permissions: ALL_SCREENS_FULL },
    { code: "SERVICE_LEAD", name: "Service Lead", is_system: true,
      permissions: { /* todas view+edit, configure en algunos */ } },
    { code: "AMS_CONSULTANT", name: "Consultor AMS", is_system: true,
      permissions: { /* view+edit en operativos */ } },
    { code: "CLIENT_USER", name: "Usuario cliente", is_system: true,
      permissions: { /* view limitado */ } },
    { code: "GENERAL_USER", name: "Usuario general", is_system: true,
      permissions: {} },
  ];
}
```

## migrateRolesAddingMissingScreens

```ts
// Cuando se agregan screens nuevas, los roles existentes (especialmente custom)
// no tienen entries para esas. Esta migration corre on-read:
function migrateRolesAddingMissingScreens(roles: PlatformRole[]): PlatformRole[] {
  return roles.map(r => {
    if (r.is_system) {
      // Re-pisar con seed (admin tiene full, etc.)
      const fresh = buildDefaultRoles().find(d => d.code === r.code);
      return fresh ? { ...r, permissions: fresh.permissions } : r;
    } else {
      // Custom: agregar screens nuevas con noPerm()
      const missing = ALL_SCREENS.filter(s => !(s in r.permissions));
      return { ...r, permissions: { ...r.permissions, ...Object.fromEntries(missing.map(s => [s, noPerm()])) } };
    }
  });
}
```

## hasPermission

```ts
function hasPermission(user: PlatformUser, screen: ScreenCode, action: ActionCode, roles: PlatformRole[]): boolean {
  const role = roles.find(r => r.code === user.roleCode);
  if (!role) return false;
  return role.permissions[screen]?.[action] === true;
}
```

## Schema

```sql
CREATE TABLE platform_users (
  id TEXT PRIMARY KEY,
  name TEXT, email TEXT UNIQUE NOT NULL,
  role_code TEXT NOT NULL,
  service_level TEXT DEFAULT 'STANDARD',
  status TEXT DEFAULT 'ACTIVE',
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE platform_roles (
  code TEXT PRIMARY KEY,
  name TEXT, description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role_code TEXT NOT NULL,
  invited_by TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  token TEXT NOT NULL UNIQUE
);

CREATE TABLE system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,        -- 'auto_daily' | 'manual'
  size_bytes BIGINT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE TABLE email_templates (
  key TEXT PRIMARY KEY,
  subject TEXT, body_md TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);
```

## Maintenance jobs

```ts
async function reindexEmbeddings() {
  const items = await db.query("SELECT id, content FROM knowledge_items WHERE status='PUBLISHED'");
  for (const it of items) {
    const emb = await embedder.embed(it.content);
    await db.query("UPDATE knowledge_items SET embedding = $1 WHERE id = $2", [emb, it.id]);
  }
}

async function regenerateDemoSeeds() {
  await db.query("DELETE FROM tickets_demo WHERE source='demo_seed'");
  await db.query("DELETE FROM knowledge_items WHERE source='demo_seed'");
  // ... otros tipos
  await seedDemoTickets();
  await seedDemoKnowledge();
  // ...
}

async function vacuumDb() {
  await db.query("VACUUM ANALYZE");
}
```

## Evaluador IA (admin/eval)

```ts
interface AiEvalRun {
  id: string;
  promptVersionId: string;
  questions: { id, text, expectedKeywords?, expectedSources? }[];
  results: { questionId, response, score, breakdown }[];
  totalScore: number;
  startedAt: string; finishedAt: string;
}
```

Run automático con score por:
- Precisión (LLM-judge vs expected keywords)
- Coherencia (perplexity)
- Cita fuentes (% respuestas con source)
- Tono (sentiment + formality)

## Gotchas

- `is_system: true` roles NO se pueden editar — defensa contra deletear ADMIN por accidente.
- `force-logout` requiere session store en Redis (no JWT stateless puro).
- Backups vía `pg_dump` requiere `pg_dump` instalado en el container backend.
- `restore` debe correr en mantenimiento (downtime) — UI muestra warning grande.
- `migrateRolesAddingMissingScreens` se ejecuta en CADA `useEffect` del page — performance OK porque es O(roles × screens).

## Roadmap

- SAML / SSO integration (Azure AD, Okta, Google Workspace).
- 2FA TOTP obligatorio configurable por role.
- Role inheritance (rol Y hereda de rol X y agrega).
- Backup incremental (vs full pg_dump).
- Health monitoring del eval (alert si score baja).
- Bulk import users desde CSV.
