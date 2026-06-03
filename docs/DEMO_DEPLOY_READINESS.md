# DEMO_DEPLOY_READINESS — Supply Chain AMS

> Guía operacional para levantar y verificar la plataforma **antes** de
> mostrarla a un cliente. Cubre dev local + dry-run de producción.
>
> Versión: **DH v0.9** · Generado 2026-06-02.

---

## 1. Cómo levantar local (stack unificado)

```bash
cd ~/Desktop/supply-chain-ams-stack
docker compose up -d
docker compose ps        # debes ver 13 contenedores
```

UI en `http://localhost:6700`, backend en `http://localhost:6601`.

**Esperar 30-60 segundos** después del `up -d` para que:
- Postgres ejecute `init.sql` (10 tablas)
- Backend corra `ensureSchema()` para `audit_events` (DH v0.9)
- Bootstrap admin si `AMS_BOOTSTRAP_ADMIN_EMAIL/PASSWORD` están seteadas

## 2. Cómo rebuild platform

```bash
cd ~/Desktop/supply-chain-ams-stack
docker compose up -d --build --force-recreate platform
```

Si cambiaste deps:
```bash
cd ~/Desktop/supply-chain-ams-platform
rm -rf node_modules .next
npm install
```

## 3. Cómo rebuild agent

```bash
cd ~/Desktop/supply-chain-ams-stack
docker compose up -d --build --force-recreate backend worker
```

Si cambiaste schema SQL (`database/init.sql` o `migrations/*.sql`):
```bash
# Para aplicar migración a DB existente (DH v0.9):
docker compose exec db psql -U ams_user -d ams_agent \
  -f /docker-entrypoint-initdb.d/02-audit-events.sql

# O destruir DB y recrear (PIERDE DATOS):
docker compose down -v
docker compose up -d
```

## 4. Cómo correr tests

### Typecheck (siempre primero)

```bash
cd ~/Desktop/supply-chain-ams-platform && npx tsc --noEmit
cd ~/Desktop/supply-chain-ams-agent/backend && npx tsc --noEmit
```

Ambos deben salir con `exit 0` sin output.

### Smoke tests platform

```bash
cd ~/Desktop/supply-chain-ams-platform
npm install              # primera vez (instala tsx)
npm run test:smoke       # corre coverage + happy path engines
```

Esto valida:
- `smoke-rbac-coverage.ts`: reporta pages con/sin `<RequirePermission>`
- `smoke-tcc-happy-path.ts`: 8 engines determinísticos funcionando

### Smoke tests backend (requiere stack arriba)

```bash
cd ~/Desktop/supply-chain-ams-agent/backend
npm install

# Sin auth:
BASE_URL=http://localhost:6601 npm run test:smoke:health

# Con auth admin (recomendado):
BASE_URL=http://localhost:6601 \
  ADMIN_EMAIL=admin@demo.cl \
  ADMIN_PASSWORD=cambiame \
  npm run test:smoke
```

Esto corre los 4 smokes: health, rbac, audit, tickets.

## 5. Cómo verificar health

```bash
curl http://localhost:6601/health           # debe responder 200 {"ok":true}
curl http://localhost:6601/health/deep      # incluye DB, Redis
curl -I http://localhost:6700               # frontend Next.js
docker compose ps                            # todos los servicios "healthy"
```

## 6. Cómo probar endpoint estimate/full

```bash
# 1. Loguearse y guardar cookie
curl -c /tmp/cookies.txt -X POST http://localhost:6601/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.cl","password":"cambiame"}'

# 2. Llamar al endpoint protegido con la cookie
curl -b /tmp/cookies.txt -X POST \
  http://localhost:6601/api/tickets/SMOKE-TEST/estimate/full \
  -H "Content-Type: application/json" \
  -d '{
    "estimate": {
      "totalMinHours": 4,
      "totalMaxHours": 8,
      "confidence": "MEDIUM",
      "phaseBreakdown": [],
      "missingData": []
    },
    "actor": "smoke",
    "reason": "Manual smoke test"
  }'
```

Esperado: `200` con `{success: true, ticket: ...}` si el ticket existe, o
`404` si no. **Sin cookie debe responder `401`. Con cookie de user sin
permiso `time_estimator.edit` debe responder `403`.**

## 7. Cómo revisar logs

```bash
# Por servicio
docker compose logs --tail=200 -f backend
docker compose logs --tail=200 -f platform
docker compose logs --tail=200 -f worker
docker compose logs --tail=200 -f db

# Filtrar por nivel
docker compose logs backend 2>&1 | grep -E "ERROR|WARN"

# Sentry (si está configurado)
# Ver dashboard en https://sentry.io
```

## 8. Cómo limpiar datos demo

### Frontend (localStorage)
En DevTools console del browser:
```js
// Solo el demo mode
localStorage.removeItem("supply-chain-ams-demo-mode")

// Quality duplicados (mejor desde el botón "Compactar" del TCC)
// Ver tab Admin → Vista previa para reset RBAC

// Nuclear — limpia TODO el RBAC y configs locales
Object.keys(localStorage)
  .filter(k => k.startsWith("supply-chain-ams"))
  .forEach(k => localStorage.removeItem(k))
location.reload()
```

### Backend (Postgres)
```bash
# Reset audit_events solo
docker compose exec db psql -U ams_user -d ams_agent \
  -c "TRUNCATE audit_events;"

# Reset quality / playbooks / documents (usa endpoints reset-demo)
curl -b /tmp/cookies.txt -X POST http://localhost:6601/api/quality/reset-demo
curl -b /tmp/cookies.txt -X POST http://localhost:6601/api/playbooks/reset-demo
curl -b /tmp/cookies.txt -X POST http://localhost:6601/api/documents/reset-demo

# Reset RBAC seed (no recomendado en demo en vivo)
curl -b /tmp/cookies.txt -X POST http://localhost:6601/api/rbac/reset-demo
```

## 9. Cómo crear tag release

```bash
cd ~/Desktop/supply-chain-ams-platform
git status -s          # sin cambios pendientes
git tag -a v0.9.0 -m "v0.9.0 - DEMO HARDENING (RBAC backend + audit + intelligence core + tests)"

cd ~/Desktop/supply-chain-ams-agent
git tag -a v0.8.0 -m "v0.8.0 - DH backend (auth middleware + audit_events + rbac enforcement)"

cd ~/Desktop/supply-chain-ams-stack
git tag -a v0.6.0 -m "v0.6.0 - Stack updates pre-deploy real"

# Push tags (cuando esté listo)
git push --tags
```

## 10. Checklist antes de mostrar a cliente

> Versión condensada — checklist completo en `docs/DEMO_READINESS_CHECKLIST.md`.

- [ ] `docker compose ps` muestra 13 contenedores `healthy`
- [ ] `curl http://localhost:6601/health` → 200
- [ ] `curl http://localhost:6700` → 200 (frontend carga)
- [ ] Login `admin@demo.cl` funciona en `/login`
- [ ] Sidebar muestra los 4 grupos (Operación, Visualizaciones, AMS avanzado, Sistema)
- [ ] `/tickets` no se mueve al seleccionar tickets
- [ ] Quality Evaluator en TCC muestra 3 evaluaciones (no 1000)
- [ ] Crear ticket nuevo → autoestimación responde
- [ ] Clasificar ticket con agente → Gemini responde (si key configurada)
- [ ] Generar respuesta cliente → quality gate evalúa con score
- [ ] Cerrar ticket con horas reales → audit event aparece en `/audit`
- [ ] Demo guiada (modal portal) funciona end-to-end
- [ ] Simular role CLIENT_USER desde `/admin → Vista previa` — sidebar oculta módulos sensibles
- [ ] Logs sin ERROR fatal en `docker compose logs backend`
- [ ] Sin errores rojos en consola del browser

## 11. Riesgos de publicar

| Riesgo | Mitigación |
|---|---|
| Demo en VPS público sin auth fuerte | Caddy con `AMS_BASIC_AUTH` env var para gate inicial |
| Gemini API key expuesta en logs | `LOG_LEVEL=info`, nunca `debug` en prod. Sentry filtra automáticamente |
| Backup nunca probado | Antes de demo cliente: `bash scripts/backup-db.sh` + `restore-db.sh` con dataset real |
| Tests sin cobertura runtime | Correr `npm run test:smoke` en VPS pre-demo |
| Frontend lento por bundle grande | Verificar carga de visualizaciones con DevTools Network |
| Audit_events crece sin retención | Documentado en F2 — agregar cron de purga si volumen > 100k filas/mes |

## 12. Variables obligatorias

Antes de levantar prod, completar en `~/Desktop/supply-chain-ams-stack/.env`:

```env
# Dominios
AMS_DOMAIN=ams.tuempresa.com
AMS_API_DOMAIN=api.ams.tuempresa.com

# LLM
GEMINI_API_KEY=                              # https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-2.5-flash

# DB
POSTGRES_USER=ams_user
POSTGRES_PASSWORD=                            # openssl rand -base64 32
POSTGRES_DB=ams_agent

# Auth
COOKIE_SECRET=                                # openssl rand -hex 32
JWT_SECRET=                                   # openssl rand -hex 32
AUTH_BCRYPT_ROUNDS=12

# Bootstrap admin (solo si DB vacía)
AMS_BOOTSTRAP_ADMIN_EMAIL=admin@tuempresa.com
AMS_BOOTSTRAP_ADMIN_PASSWORD=                # password fuerte 12+ chars

# CORS
CORS_ORIGINS=https://ams.tuempresa.com

# Frontend → API
NEXT_PUBLIC_AGENT_API_URL=https://api.ams.tuempresa.com

# Opcional: integraciones
# JIRA_BASE_URL=
# JIRA_EMAIL=
# JIRA_API_TOKEN=
# SAP_BASE_URL=
# SAP_USER=
# SAP_PASSWORD=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=

# Opcional: observability
# SENTRY_DSN=
# NEXT_PUBLIC_SENTRY_DSN=

# Logging
NODE_ENV=production
LOG_LEVEL=info
```

> **NUNCA** commitear `.env` con valores reales. Sólo `.env.example` con placeholders.

## 13. Qué sigue antes de producción

Bloqueadores P0:
1. **Tests automatizados** — agregar Playwright × 3 happy paths.
2. **Deploy dry-run en VPS sandbox** ejecutando `bootstrap-vps.sh` + `deploy.sh`.
3. **Backup/restore probado** con dataset real.
4. **Migración SQL `audit_events`** validada en DBs existentes (no solo `IF NOT EXISTS`).

Recomendado pre-piloto:
5. Rate-limit con `@fastify/rate-limit`.
6. CSP estricto en Caddyfile.
7. Sentry DSN configurado.
8. Dashboards Grafana de basics (req/s, latency, error rate).
9. Cron de backup automático diario.
10. Documentar manual del cliente (`docs/manual/cliente/`).

---

**Listo para demo controlada en local con guion ensayado** después de
correr el checklist completo (`DEMO_READINESS_CHECKLIST.md`).
**NO listo para producción** sin completar P0.
