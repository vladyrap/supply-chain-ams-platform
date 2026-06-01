# 🛠 Administración · Manual de venta

> **Tu admin lo controla todo. Sin scripts, sin SSH, sin desarrollo.**

## El pitch en 30 segundos

> "El admin entra a UNA pantalla y maneja: users + roles + invites + mantenimiento + backups + templates + evaluador IA. **CRUD con matrix de permisos por pantalla × acción. Roles custom. Backups con restore. Re-index embeddings. Regenerar data demo.** Cero dependencia del equipo dev."

## Demo de 90 segundos

1. Abrir `/admin` → tab Users.
2. Click "+ Nuevo user" → email + role AMS_CONSULTANT + invite → email se manda.
3. Tab Roles → click "ADMIN" → ver matrix completa (40 screens × 6 acciones).
4. Click "Duplicar" → crear "QA_LEAD" role custom, toggle solo screens de testing.
5. Tab Mantenimiento → click "Re-index embeddings" → log de progreso en vivo.
6. Tab Backups → click "Crear backup ahora" → 30 seg → dump descargable.
7. Sub-página `/admin/eval` → ver últimos runs del evaluador IA.

## Killer features

| Feature | Valor |
|---|---|
| **RBAC fino (pantalla × acción)** | Granular sin ser kafkiano |
| **5 roles system + custom infinitos** | Cubre cualquier estructura |
| **Invites con link único** | UX de SaaS moderno |
| **Mantenimiento en UI** | Re-index, cleanup, vacuum sin SSH |
| **Backups + restore** | DR plan sin dev |
| **Email templates editables** | Branded sin redeploy |
| **Evaluador IA built-in** | Quality del agente automatizada |
| **Force logout** | Security control inmediato |

## ROI

### Caso onboarding cliente nuevo
- 15 users + 2 roles custom + 5 invites
- **Sin sistema**: SQL scripts + emails manuales, 1 día
- **Con sistema**: 20 min
- **Ahorro setup**: 6-7 horas por cliente

### Caso compliance audit RBAC
- Auditor: "muestren matrix de permisos por rol"
- **Sin sistema**: armás Excel mirando código
- **Con sistema**: screenshot del role editor + export
- **Ahorro auditoría**: 4-8 horas

### Caso role change masivo
- "El equipo QA ahora puede aprobar tests"
- **Sin sistema**: dev edita código, deploy, rollback si rompe
- **Con sistema**: admin clic en matrix, on, done
- **Ciclo cambio**: 1 día → 30 segundos

### Caso backup pre-deploy
- Vas a hacer deploy riesgoso
- **Sin sistema**: pedís a infra que tome snapshot
- **Con sistema**: admin click, backup en 1 min, listo si rollback
- **Confidencia deploy**: +100%

### Caso evaluador IA continuo
- Quality del agente derive over time
- **Sin sistema**: te enterás cuando cliente reclama
- **Con sistema**: eval automático semanal + alert si score baja
- **Detección regresión**: -90% time

## Objeciones

### "Cualquier admin puede borrar todo"
> "Default 1 ADMIN, force-logout disponible, audit log captura todo. Para enterprise, roadmap incluye separation of duties (ADMIN no puede borrar otros ADMINs sin segundo ADMIN approval) y MFA obligatorio."

### "¿Y backup en cloud?"
> "Backup local hoy + S3 opcional vía config. Restore probado en staging recomendado antes de PRD. Para DR enterprise, roadmap: backup geo-replicated."

### "Email templates ediables = riesgo de spam/typos"
> "Cada save queda en audit log con before/after. Preview obligatorio. Test send a admin email. Editor solo admin (no consultor)."

## Frases que funcionan

- *"Tu admin controla TODO. Sin SSH, sin SQL, sin esperar dev."*
- *"RBAC fino: 40 pantallas × 6 acciones = 240 toggles. Cualquier rol custom posible."*
- *"Backup + restore en 1 min. Rollback de deploys ya no es terror."*
- *"Evaluador IA midiendo el agente cada semana. Quality que no se desvía."*
