# DEMO_READINESS_CHECKLIST — Supply Chain AMS

> Checklist ejecutable antes de mostrar la plataforma a un cliente.
> Marcá cada item al verificar. **No mostrar a cliente con cualquier item
> en rojo (❌).**
>
> Versión: **DH v0.9** · Generado 2026-06-02.

---

## 🏗️ Build & Compile

- [ ] `npx tsc --noEmit` en **platform** → exit 0 sin errores
- [ ] `npx tsc --noEmit` en **agent/backend** → exit 0 sin errores
- [ ] `npm run build` en **platform** → completa sin warnings críticos
- [ ] `npm run build` en **agent/backend** → genera `dist/` OK

## 🐳 Docker

- [ ] `docker compose ps` → 13 contenedores `healthy`
- [ ] `docker compose logs backend 2>&1 | grep ERROR` → sin errores fatales
- [ ] `docker compose logs platform 2>&1 | grep ERROR` → sin errores fatales
- [ ] `docker compose logs db` → schema inicializado (init.sql + migrations)
- [ ] `docker compose exec db psql -U ams_user -d ams_agent -c "\dt"` → muestra `audit_events`

## 🔐 Autenticación

- [ ] `/login` carga sin errores en browser
- [ ] Login con `admin@demo.cl` / password env → redirige a `/welcome`
- [ ] Cookie `ams_session` se setea correctamente (HttpOnly, SameSite)
- [ ] `/api/auth/me` con cookie → 200 + user object
- [ ] Logout funciona y limpia sesión

## 🛡️ RBAC frontend

- [ ] Sidebar muestra los 4 grupos: Operación, Visualizaciones, AMS avanzado, Sistema
- [ ] Login como admin → ve TODOS los módulos en sidebar (37+)
- [ ] `/admin → Vista previa` simula `CLIENT_USER` → sidebar oculta admin, escalation-n2, document-factory, etc
- [ ] `/admin → Vista previa` simula `GENERAL_USER` → sidebar oculta casi todo
- [ ] Grupos vacíos (sin módulos visibles) → header del grupo NO aparece
- [ ] Navegar a URL directa de una page protegida sin permiso → `AccessLockedCard` aparece

## 🛡️ RBAC backend (DH v0.9)

- [ ] `curl http://localhost:6601/api/tickets` sin cookie → `401`
- [ ] `curl -b cookie http://localhost:6601/api/tickets` con admin → `200`
- [ ] `curl -b cookie http://localhost:6601/api/rbac/snapshot` con admin → `200`
- [ ] `curl -b cookie http://localhost:6601/api/rbac/snapshot` con viewer → `403`
- [ ] Smoke `npm run test:smoke:rbac` → all passed

## 🎫 /tickets (Ticket Command Center)

- [ ] `/tickets` carga sin error 401
- [ ] Lista de tickets aparece (jira mirror o mock)
- [ ] **Seleccionar un ticket NO mueve la lista** (fix v0.8.1)
- [ ] Abrir/cerrar secciones del TCC → la lista permanece estática
- [ ] **AmsIntelligenceSummaryCard aparece arriba** (nuevo en DH v0.9) con 4 tiles
- [ ] Card de Intelligence muestra: readiness, ETA, acción, N2 verdict
- [ ] Botón "Ver detalle" del Intelligence expande sin empujar layout
- [ ] Quality Evaluator en sección 12 muestra **máximo 3 evaluaciones** (no 1000) — fix v0.8.1
- [ ] Botón "Ver más" del Quality expande a 20 con scroll interno

## ⏱ Estimador

- [ ] `/time-estimator` carga sin error
- [ ] Crear estimación contextual → resultado en < 2 segundos
- [ ] Resultado muestra min-max + confianza + breakdown
- [ ] Botón "Aplicar al ticket" persiste estimación
- [ ] Audit event `MANUAL_ADJUSTMENT` aparece en `/audit`

## ✉ Customer Response

- [ ] Sección 15 del TCC carga botones (Acknowledgement / Pedir info / Update / Generar)
- [ ] Click "Generar respuesta cliente" → modal abre
- [ ] Generar tipo `ACKNOWLEDGEMENT` → quality gate score > 60
- [ ] Generar tipo `CLOSURE` sin validación → warning (regla nueva DH v0.9)
- [ ] Generar tipo `RCA_PRELIMINARY` sin "preliminar" → warning (regla nueva DH v0.9)
- [ ] Generar tipo `WORKAROUND` sin "temporal" → warning (regla nueva DH v0.9)
- [ ] Generar con confianza LOW y "causa raíz es X" → **bloqueada**
- [ ] Botón "Aprobar" sólo aparece si quality gate canSend=true
- [ ] Copiar a Jira comment funciona (botón ↗ Jira)
- [ ] Copiar a ServiceNow worknote funciona (botón ↗ SN)

## 🏅 Quality Evaluator

- [ ] `/quality-evaluator` carga sin error
- [ ] Dashboard muestra KPIs (avgAccuracy, count, etc)
- [ ] Lista de evaluaciones **no muestra 1000 líneas en sección 12 del TCC** (fix v0.8.1)
- [ ] Crear evaluación manual → persiste en localStorage + backend (si disponible)
- [ ] Si hay duplicados → botón "Compactar" aparece en TCC

## ✅ Close ticket

- [ ] Click "Cerrar y registrar horas" abre modal
- [ ] Completar `actualHours` + close note → ticket cierra
- [ ] `varianceHours` y `variancePct` se calculan
- [ ] Si flag `generateClosureResponse` activa → modal Customer Response abre con tipo CLOSURE
- [ ] Knowledge curation candidate se propone si brilliantScore > 70
- [ ] Audit events: `STATUS_CHANGED`, `KB_CURATION_CANDIDATE_PROPOSED`

## 📜 Audit Trail (DH v0.9)

- [ ] `/audit` carga sin error 401 (requiere `audit_trail.view`)
- [ ] `GlobalAuditCenter` lista eventos del localStorage
- [ ] Click en ticket → timeline cronológico aparece
- [ ] **Backend audit funcionando:** `curl -b cookie http://localhost:6601/api/audit/summary` → `{success: true, summary: {total: N, ...}}`
- [ ] `POST /api/audit/events` con cookie → 201 + record persistido
- [ ] Tab "Log de auditoría" en `/admin` muestra eventos RBAC (filtrable por tipo)

## 🚨 Escalation N2

- [ ] `/escalation-n2` carga sin error 401
- [ ] Sección "Escalamiento N2" en TCC muestra `N2IntelligenceCard`
- [ ] Card muestra verdict + urgencyScore + specialist recomendado
- [ ] Botón "Escalar a N2" abre modal o registra en audit
- [ ] Si hay credenciales Jira/ServiceNow → botón send-jira / send-servicenow funciona

## 📕 Playbooks

- [ ] `/playbooks` carga sin error 401
- [ ] Lista de playbooks aparece (con datos demo)
- [ ] Sección "Playbook AMS" en TCC sugiere playbook por módulo SAP

## 📚 Knowledge

- [ ] `/knowledge` carga sin error 401
- [ ] Lista de documentos aparece
- [ ] Tab "RAG Playground" funciona (búsqueda)
- [ ] Subir PDF/MD → estado "pending" → "indexed" en < 30s (si backend RAG está vivo)

## 🎬 Demo guiada

- [ ] Botón "Ejecutar demo completa" en `/tickets` abre modal portal
- [ ] Modal NO empuja el layout
- [ ] Demo guía paso a paso end-to-end
- [ ] Datos creados quedan marcados con `[DEMO_GUIADA]` tag

## 🧪 Tests smoke

- [ ] `cd platform && npm run test:smoke` → exit 0
- [ ] `cd agent/backend && npm run test:smoke:health` → exit 0
- [ ] Con admin env: `npm run test:smoke` → all passed (rbac + audit + tickets)

## 📦 Deploy scripts revisados

- [ ] `stack/docker-compose.prod.yml` referencia `../supply-chain-ams-agent` y `../supply-chain-ams-platform` correctamente
- [ ] `stack/Caddyfile.prod` apunta a `platform:3000` y `backend:8000`
- [ ] `stack/.env.production.example` cubre todas las variables obligatorias
- [ ] `stack/scripts/bootstrap-vps.sh` no tiene credenciales hardcodeadas
- [ ] `stack/scripts/deploy.sh` asume `/opt/ams/` con 3 repos hermanos
- [ ] `stack/scripts/backup-db.sh` funciona localmente (test con DB local)

## 🔒 Seguridad

- [ ] `.env` NO commiteado (verificar `git status` no muestra `.env`)
- [ ] `.gitignore` cubre `.env`, `*.env.local`, `*.env.production`
- [ ] `git log --all --full-history -- "*.env*"` no muestra leaks históricos
- [ ] Sentry DSN configurado SI se va a desplegar productivo
- [ ] `LOG_LEVEL=info` (no `debug`) en `.env` de producción
- [ ] CORS_ORIGINS restrictivo (no `*`)
- [ ] HTTPS via Caddy con Let's Encrypt automático

## 🖥 UX / visual

- [ ] Cargar la app en pantalla pequeña (<1280px) — sin overflow horizontal
- [ ] Cargar en mobile (375px) — layout responde (visualizaciones pueden no aplicar)
- [ ] Modales centrados (no atrapados detrás de cards)
- [ ] Sin errores rojos en consola del browser
- [ ] Sin warnings de React (key prop, etc)

---

## Veredicto

**Listo para demo si:**
- ✅ Todos los items críticos (Docker, Auth, RBAC frontend, /tickets, Customer Response, Audit) en verde
- ✅ Smoke tests pasan
- ✅ Sin errores fatales en logs

**NO listo si:**
- ❌ Algún item de Build, Auth o RBAC en rojo
- ❌ `/tickets` se mueve al interactuar
- ❌ Quality Evaluator muestra >20 líneas
- ❌ Backend devuelve 5xx en cualquier endpoint del happy path

---

**Última verificación realizada:** _completá aquí fecha + persona que validó_

**Anotaciones de la verificación:** _agregá observaciones, bugs encontrados, decisiones tomadas_
