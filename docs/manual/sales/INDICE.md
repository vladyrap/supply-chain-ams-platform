# Manual AMS Platform · Sales / Pre-venta

**Audiencia:** comerciales, líderes de cuenta, consultores que demuestran el sistema al cliente.
**Propósito:** vender la plataforma. Qué problema resuelve, cuánto ahorra, qué mostrar primero en una demo.

## El pitch en 3 frases

> Convertimos el caos de tickets AMS SAP en un proceso **trazable, asistido por IA y medible**.
> Cada ticket pasa por un Command Center que orquesta diagnóstico, escalación, documentación, testing y conocimiento — sin saltar entre 10 herramientas.
> El cliente ve **horas ahorradas y USD evitados** en tiempo real.

## Killer features para demo (orden recomendado · 15 min)

| # | Pantalla | Tiempo | Wow factor |
|---|---|---|---|
| 1 | `/tickets` → **Ejecutar demo completa** | 4 min | El sistema crea ticket, llama al agente Gemini, escala, genera RCA, crea test, evalúa — todo solo, paso a paso, frente al cliente |
| 2 | `/tickets` → seleccionar ticket creado → **Ticket Command Center** | 4 min | 14 secciones en un solo panel: estimación, readiness, NBA, fases, scope items, audit |
| 3 | `/dashboard` → **Valor económico generado** | 2 min | USD evitados + horas ahorradas calculadas en vivo |
| 4 | `/business-value` | 1 min | Vista fullscreen del ROI con breakdown por categoría |
| 5 | `/agent-readiness` | 1 min | Score 0-100 por módulo SAP — "cuán listo está mi agente para resolver MM, SD, PP" |
| 6 | `/mission-control` o `/war-room` | 2 min | Wallboard NASA o globo 3D — wow visual, sirve para sala de operaciones |
| 7 | `Ctrl+K` desde cualquier pantalla | 1 min | Global Intelligence Search: indexa tickets + KB + scope items + playbooks |

## Tabla maestra · 36 módulos (vista comercial)

### 🎯 Productos vendibles (lo central del pitch)

| # | Módulo | Promesa al cliente | ROI ejemplo |
|---|---|---|---|
| 1 | 🎫 **Tickets Command Center** ⭐ | "Cada ticket es un caso completo: el sistema entiende, estima, escala, documenta y aprende sin que el consultor abra 10 herramientas" | 2-6 h ahorradas por ticket asistido por IA |
| 2 | 🤖 Agente AMS | "Diagnóstico SAP Supply Chain instantáneo + RCA + paso a paso con referencias a tu KB" | 0.5-2 h por consulta |
| 3 | 📚 Conocimiento RAG | "Subís tus PDFs/manuales SAP y el agente los usa al responder. Tu conocimiento, no genérico" | Reduce escalaciones 40-60% |
| 4 | 🚨 Escalamiento N2 | "Deriva incidentes críticos al especialista correcto con SLA, trazabilidad y prep para Jira/ServiceNow" | -50% tiempo hasta el responsable correcto |
| 5 | 🏭 Document Factory | "RCA, minutas, specs, manuales generados desde plantillas profesionales en 2 minutos" | 0.5-4 h por documento |
| 6 | 🧪 Testing Intelligence | "Graba el proceso, genera test script y deja listo para Cloud ALM" | 1-3 h por caso de prueba |
| 7 | 🏅 Quality Evaluator | "Cada respuesta del agente se puede evaluar humanamente. Mejora continua medible" | Calidad medible vs prompt opaco |
| 8 | ⏱ Estimador de Tiempos | "Banda horas/días con fases, riesgos y respuesta lista para enviar al cliente" | Cotizaciones consistentes |

### 💎 Métricas de impacto

| Métrica | Cómo se muestra al cliente |
|---|---|
| Tickets asistidos por IA | KPI grande en Dashboard + Top 5 en Command Center |
| Horas ahorradas | Dashboard sección "Valor Generado" + página completa `/business-value` |
| USD evitado | Calculado en vivo con costo hora consultor configurable |
| % respuestas con confianza alta | En Quality Evaluator + Agent Readiness |
| Escalamientos evitados | Diff con/sin sistema |
| Tickets convertidos en KB | "Tu sistema aprende de cada caso" |

### 🌐 Wow factor para presentación

| # | Módulo | Para qué momento |
|---|---|---|
| 9 | 🚀 Launchpad | Abrir presentación. Boot sequence cinematográfica + countdown |
| 10 | 🌍 War Room 3D | Cuenta vendida a múltiples clientes: globo con clientes en mapa |
| 11 | 🧠 Agent Brain | Mostrar inteligencia del agente: red neuronal animada por consulta |
| 12 | 🖥 Wallboard 4K | "Esto va en la TV de tu sala AMS las 24h" |
| 13 | 🎮 Mission Control | NASA wallboard con SLA gauge + heatmap |
| 14 | 📟 Bloomberg | Para clientes financieros — terminal estilo trading |
| 15 | ⚛️ Arc Reactor | "Modo Iron Man" para CIOs que quieran wow |
| 16 | 🌊 Data Flow | Río de partículas con eventos en vivo |

### 🛠 Operación interna (cuesta menos pero importan)

| # | Módulo | Por qué importa al cliente |
|---|---|---|
| 17 | 📜 Audit Trail | Compliance + governance. Cada acción auditada con actor/rol/timestamp |
| 18 | 🛡️ RBAC Administración | "Tu equipo, tus roles, tus permisos". Granular por módulo y acción |
| 19 | 🎯 Agent Readiness Center | "Score de cuán listo está el agente por módulo SAP. Te decimos qué falta" |
| 20 | 📕 Playbooks AMS | Procedimientos ISO-friendly versionados con execution log |
| 21 | 🎓 Entrenamiento IA | "Vos enseñás al agente con feedback humano y conocimiento curado" |

## Argumentario por objeción típica

### "¿Esto reemplaza a mi equipo AMS?"
**No.** Lo asiste. El consultor sigue resolviendo; el sistema le da el contexto que tardaría 30 min en juntar, sugiere la próxima mejor acción y registra todo automáticamente. **Multiplica al equipo, no lo reemplaza.**

### "¿Conecta con nuestro Jira / ServiceNow real?"
Sí, opcional. Hoy funciona en modo demo. Con las credenciales del cliente conecta a Jira Atlassian Cloud y ServiceNow estándar. Se anexa la estimación del agente al description del ticket creado.

### "¿Y SAP? ¿Lee de S/4HANA?"
Sí, modo lectura. SAP Read-Only ejecuta queries OData v2 con un whitelist de 5 endpoints (OC, pedidos, materiales, movimientos, entregas). Nunca escribe en SAP. Las credenciales viven solo en el backend.

### "¿Los datos del cliente quedan seguros?"
RBAC granular (5 roles, 25 screens, 7 acciones por screen). Auth con refresh token rotation + bcrypt 12. Sin Sentry default. Logs locales. Sin tracking. Imágenes adjuntas no se persisten — solo el resumen textual del análisis.

### "¿Qué LLM usa?"
Hoy Gemini 2.5 Flash Lite (free tier o paid). Compatible con Claude (Anthropic) cambiando 1 archivo. Cuando exista Gemini Vision, el análisis de imágenes pasa de heurística demo a IA real sin tocar UI.

### "¿Cuánto cuesta operarlo?"
- VPS 4 vCPU / 8 GB: ~USD 15-50/mes (Hetzner CX31 o Arsys VPS S).
- Gemini API: tier free hasta 1500 RPD. Paid tier ~USD 0.10 por 1M tokens.
- Total típico para AMS chico/mediano: **USD 30-100/mes**.

### "¿Cuánto tarda en implementarse?"
- **Demo lista en VPS**: 30 minutos con el `bootstrap-vps.sh` + `deploy.sh`.
- **Adaptación al cliente** (RBAC, knowledge inicial, dominio): 1-2 días.
- **Roll-out con onboarding**: 1-2 semanas.

## Casos de uso de venta

| Cliente tipo | Pitch focal |
|---|---|
| **AMS chico (1-5 consultores)** | "Multiplicá el equipo sin contratar. El agente te ahorra 2h por ticket. Si atendés 200 tickets/mes son 400h = USD 24k/mes evitados" |
| **AMS mediano (10-30 consultores)** | "Governance + trazabilidad + métricas para reportar al cliente final. Salí de la planilla Excel" |
| **Consultora SAP grande** | "Standardización entre cuentas. Knowledge curado compartido. Quality Evaluator humano + agente medible" |
| **Cliente final con AMS interno** | "Empoderá a tu key user. El agente le responde sin abrir ticket. El que sí escala llega con contexto" |
| **Partner SAP** | "Vendelo a tus clientes como add-on. White label es factible cambiando logo y dominio" |

## Cosas que NO ofrecer todavía

- **No prometemos** que el agente reemplaza al consultor.
- **No prometemos** que adivina causas raíz sin contexto SAP.
- **No prometemos** conexión a SAP que escriba (es solo lectura).
- **No prometemos** SLA real sin medición histórica (los demos son simulados).
- **No prometemos** análisis visual de imágenes con IA hoy (es heurística demo; Gemini Vision queda en roadmap).

## Próximos archivos de este manual

Cada uno con script de demo + screenshots impactantes:

- [ ] `01-tickets.md` — el showroom principal
- [ ] `02-valor-economico.md` — cómo justificar el ROI
- [ ] `03-demo-en-vivo.md` — script de 15 minutos para cliente
- [ ] `04-wallboard-y-war-room.md` — wow para sala de operaciones
- [ ] `05-conocimiento-y-readiness.md` — "tu sistema aprende"
- [ ] `06-objeciones-y-respuestas.md` — argumentario extendido
- [ ] `07-comparacion-vs-competencia.md` — vs ServiceNow ITSM, vs SAP Solution Manager
- [ ] `08-pricing-y-modelos.md` — cómo cotizar
