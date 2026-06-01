# 🎫 Tickets · Manual cliente

> **Ruta:** `/tickets`
> **Para quién:** consultor AMS, líder de servicio, key user del cliente.
> **Permiso requerido:** view de `ticket_command_center` (todos los roles excepto GENERAL_USER).

## ¿Qué hace este módulo?

Es el **centro de operación del sistema**. Cada ticket abre un panel completo
(Ticket Command Center) con 14 secciones que cubren todo el ciclo de vida:
desde clasificación con el agente IA hasta el cierre con conocimiento
capitalizado, pasando por escalamiento, RCA, casos de prueba y auditoría.

No tenés que saltar entre 10 herramientas: todo se hace **desde el ticket**.

![Lista de tickets + Command Center](../screens/tickets-list.png)

## La pantalla en 1 vistazo

La pantalla tiene 2 columnas:

- **Izquierda:** lista de tickets con badges de prioridad, módulo SAP y ETA estimada.
- **Derecha:** Ticket Command Center con todo el detalle y acciones del ticket seleccionado.

Arriba del todo el toolbar con:
- 🎬 **Ejecutar demo completa** — corre un flujo end-to-end automático
- **＋ Crear ticket** — abre el modal de creación
- **↻ Refrescar** — recarga la lista

## Cómo crear un ticket

1. Click en **＋ Crear ticket** (toolbar superior).
2. Se abre un modal:

   ![Modal crear ticket](../screens/tickets-create-modal.png)

3. Completá:
   - **Título** (obligatorio, 10+ caracteres descriptivos).
   - **Descripción** (obligatorio, 80+ caracteres con contexto: transacción, pasos, error literal).
   - **Prioridad**: Highest / High / Medium / Low.
   - **Módulo SAP**: MM / SD / PP / WM / EWM / QM / etc.
   - **Ambiente**: DEV / QA / UAT / PRD.
   - **Complejidad** (opcional, el motor la infiere si la dejás vacía).
   - 4 toggles técnicos: requiere desarrollo, integración, UAT, transporte.

4. **Evidencia visual** (opcional pero recomendado):
   - Adjuntá una captura del error SAP (PNG / JPG / WEBP, máx 4 MB c/u, hasta 4 imágenes).
   - Escribí un comentario sobre cada imagen.
   - Click en **🤖 Analizar imagen con IA**: el agente intenta detectar transacción, código de error, módulo SAP, objetos involucrados (material, OC, centro).
   - Confirmá ✓ "Usar este análisis para crear y estimar el ticket".

   > 🔒 **Importante:** las imágenes NO se guardan. Solo se conserva el resumen textual del análisis.

5. Click en **＋ crear ticket**. El sistema:
   - Crea el ticket en `tickets_demo`.
   - Genera la **autoestimación** automáticamente.
   - Te muestra el toast: `✓ Ticket AMS-XXX creado. Estimación: X-Yh (CONFIANZA).`
   - Lo selecciona en el Command Center.

## Anatomía del Ticket Command Center

Una vez seleccionado un ticket, ves el panel completo:

![Command Center completo](../screens/tickets-command-center-full.png)

Al tope hay 2 cards destacadas:

### Card 1 · Next Best Action (NBA)

![Next Best Action](../screens/tickets-nba-card.png)

El **Decision Engine** mira el ticket completo y te dice qué hacer ahora.
Por ejemplo: "Pedir más información", "Escalar a N2", "Generar RCA", "Convertir en conocimiento".

- El botón grande es la acción #1 (más recomendada).
- Los botones secundarios son las acciones #2 a #4.
- Cada acción tiene un peso 0-100 y una razón legible ("Crítico productivo + faltan datos").

**15 acciones posibles**, pero solo verás las que aplican a tu ticket.

### Card 2 · Ticket Readiness Score

![Ticket Readiness](../screens/tickets-readiness-card.png)

Score 0-100 que mide qué tan completo está el ticket para resolverlo.

**10 criterios:**
1. Título claro (≥10 chars) — 10 pts
2. Descripción completa (≥80 chars) — 15 pts
3. Prioridad explícita — 5 pts
4. Ambiente definido — 10 pts
5. Módulo SAP definido — 10 pts
6. Proceso identificado — 10 pts
7. Transacción detectada (texto o imagen) — 10 pts
8. Mensaje de error informado — 10 pts
9. Documento SAP informado — 10 pts
10. Evidencia visual o comentario — 10 pts

**Estados:**
- 🔴 LOW (<40)
- 🟡 MEDIUM (40-69)
- 🔵 HIGH (70-89)
- 🟢 READY (≥90)

Cada criterio faltante tiene un botón clickeable que te lleva a la sección
donde lo arreglás.

## Las 14 secciones colapsables

Debajo de las cards destacadas, el Command Center tiene 14 secciones que
podés abrir/cerrar:

### 1. Resumen
Título y descripción del ticket, como los completaste al crearlo.

### 2. Estimación de Resolución + Explicabilidad de la ETA
Esta es la sección más densa. Tiene 2 partes:

**Parte A · Estimación:**
- Banda horas/días (ej. `3.4–16h · 0.4–2 días`)
- Confianza (LOW / MEDIUM / HIGH con score 0-100)
- Complejidad
- Timeline horizontal de fases con color por status
- Tabla de fases con owner y horas

Botones disponibles según tu rol:
- **↻ Recalcular** (consultor+): vuelve a calcular si cambiaron datos.
- **✎ Ajustar manualmente** (aprobador+): modal para cambiar horas/confianza/complejidad con razón obligatoria.
- **↓ Exportar**: descarga la estimación completa como markdown.

**Parte B · Explicabilidad de ETA:**

![Explicabilidad ETA](../screens/tickets-estimation-section.png)

Dos columnas:
- ↑ **Factores que aumentan ETA**: prioridad High, desarrollo necesario, ambiente PRD, datos faltantes, baja confianza del agente, etc.
- ↓ **Factores que reducen ETA**: existe playbook, módulo detectado, ambiente DEV/QA, análisis visual aportado, ticket recurrente.

Cada factor tiene su impacto display (`+16/+80h`, `×0.85`, `↑ confianza`).

### 3-4. Clasificación AMS · Diagnóstico

Botón **🤖 Clasificar con Agente AMS**: llama al agente Gemini real con el
contexto del ticket. Devuelve diagnóstico estructurado con:
- Módulo SAP detectado
- Proceso / subproceso
- Severidad sugerida
- Próximos pasos recomendados

Abajo del diagnóstico, una card de **trazabilidad** con:
- Versión del agente (`v0.1.0`)
- Versión del knowledge base (`KB-2026-06-01-1430-n42`)
- Modo (demo / real)
- Fuentes RAG consultadas (KB MM-001, Playbook MIGO-001, etc.)
- Confianza %

### 4.5. Análisis visual usado (si hay imagen)
Si al crear el ticket adjuntaste imagen y la analizaste, esta sección muestra
el resumen textual con módulo / transacción / error / objetos detectados.

> 🔒 La imagen ya no existe. Solo este resumen.

### 5. Conocimiento relacionado
Lista de artículos de KB matcheados al ticket por módulo. Si no hay, sugiere
abrir brecha en `/knowledge/training`.

### 6. Scope Items SAP relacionados
Hasta 12-15 scope items SAP S/4HANA Cloud (1A0, BD9, BJE, etc.) detectados
como aplicables al ticket. Muestra cobertura: KB ✓, Playbook ✓, Q&A ✓.

### 7. Playbook AMS

Botón **📕 Aplicar playbook sugerido**: el sistema busca el playbook activo
que coincide con el módulo y título del ticket. Si hay match, lo sugiere.
Al clickear, abre el `PlaybookExecutionChecklist` con los pasos del playbook
asociados a este ticket.

Si ya hay una ejecución activa, el botón muestra `📕 X/Y pasos` con el progreso.

### 8. Escalamiento N2

Botón **🚨 Escalar N2**: abre el modal del módulo Escalamiento N2 con el
ticket pre-cargado. Te pide motivo, canal (Jira / ServiceNow / MANUAL),
asignado y SLA target.

Si ya hay escalación, muestra el badge con el código (ESC-2026-001) y el
status (ESCALATED, ASSIGNED_TO_N2, IN_PROGRESS_N2, RESOLVED_BY_N2).

### 9. Jira / ServiceNow
Si el ticket viene de Jira real, muestra el link `↗ Abrir en Jira`.
Si no, mensaje informativo. Las acciones reales se disparan desde Escalamiento N2.

### 10. Documentos del ticket

Botón **📄 Generar documento**: abre un modal con selector de plantilla.
Plantillas disponibles: RCA, Minuta, Respuesta cliente, Spec funcional,
Spec técnica, Plan cutover, Hypercare, Informe ejecutivo, Estimación,
y más.

El formulario está pre-rellenado con `incidentCode = ticket.key`,
`title = ticket.title`, y el `executiveSummary` con los primeros 200 chars
de la descripción.

Al generar, el documento queda asociado al ticket y aparece en la lista
debajo del botón.

### 11. Testing Intelligence

Botón **🧪 Crear caso de prueba**: abre `TestScenarioFormModal` (componente
del módulo Testing) pre-rellenado con:
- Título: `Caso de prueba · {ticketKey} · {ticketTitle}`
- Módulo SAP del ticket
- Scope items detectados
- Tipo: REGRESSION
- Tags: `ticket:{ticketKey}`

### 12. Quality Evaluator

Botón **🏅 Evaluar respuesta** (habilitado solo si el agente ya respondió):
abre el `EvaluationForm` para rankear la respuesta:
- Precisión 1-5 ★
- Utilidad 1-5 ★
- Claridad 1-5 ★
- Completitud 1-5 ★
- Riesgo de alucinación: LOW / MEDIUM / HIGH
- Fit técnico: simple / adecuado / muy técnico
- Toggles: needsHumanReview, canBecomeKnowledge, wasUsefulForClient, requiresEscalation
- Comentarios

Si ya hay evaluación, muestra el score promedio (ej. `🏅 4.5/5`) y permite reabrir.

### 13. Convertir en Conocimiento

Botón **🎓 Convertir incidente en conocimiento**: abre el `IncidentToKnowledgeWizard`
que guía la creación de un artículo KB curado a partir del ticket resuelto.
Queda en `/knowledge/training` para validar y publicar.

### 14. Auditoría · Timeline

![Audit Timeline](../screens/tickets-audit-section.png)

Timeline cronológico (más reciente arriba) con TODOS los eventos del ticket:
- `🎫 Ticket creado`
- `⏱ Estimación generada`
- `🤖 Clasificado por agente`
- `💬 Respuesta del agente`
- `🔬 Análisis visual ejecutado`
- `🚨 Escalación N2 sugerida / creada`
- `📕 Playbook iniciado`
- `📄 RCA generado`
- `🧪 Caso de prueba creado`
- `🎓 Convertido en conocimiento`
- `🏅 Evaluación calidad`
- 22 tipos totales

Cada evento muestra actor, rol, source (UI / agent / system / integration) y timestamp.

## Demo guiada AMS

Botón **🎬 Ejecutar demo completa** en el toolbar:

![Demo guiada](../screens/tickets-guided-demo.png)

Abre un modal con 13 pasos. Podés ejecutar:
- **▶ Siguiente paso** — uno por uno, para explicar a cliente.
- **⏵⏵ Ejecutar todo** — automático con delay 800ms entre pasos.
- **↺ Reiniciar** — vuelve al inicio.

Los pasos crean datos REALES en el sistema (ticket nuevo con tag `[DEMO_GUIADA]`,
RCA, caso de prueba, evaluación, etc.). Cada paso registra audit event.

Al finalizar, muestra el resumen de valor económico generado (USD evitados, horas ahorradas).

## Permisos por rol (RBAC)

| Acción | ADMIN | SERVICE_LEAD | AMS_CONSULTANT | CLIENT_USER | GENERAL_USER |
|---|:---:|:---:|:---:|:---:|:---:|
| Ver el módulo | ✓ | ✓ | ✓ | ✓ | ✗ |
| Crear ticket | ✓ | ✓ | ✓ | ✓ | ✗ |
| Clasificar con agente | ✓ | ✓ | ✓ | ✓ | — |
| Recalcular estimación | ✓ | ✓ | ✓ | ✗ | ✗ |
| Ajustar manualmente | ✓ | ✓ | ✗ | ✗ | ✗ |
| Escalar N2 | ✓ | ✓ | ✓ | ✗ | ✗ |
| Generar documento | ✓ | ✓ | ✓ | ✗ | ✗ |
| Aprobar escalación | ✓ | ✓ | ✗ | ✗ | ✗ |
| Ejecutar demo guiada | ✓ | ✓ | ✓ | ✗ | ✗ |

## Qué se guarda

- **Ticket completo** en la tabla Postgres `tickets_demo` (sobrevive restarts).
- **Estimación** dentro del ticket como JSON.
- **Imágenes adjuntas**: **NO se guardan**. Solo el resumen textual del análisis.
- **Audit events**: localStorage `supply-chain-ams-ticket-audit-events` (cap 1000 eventos).
- **Documentos generados**: localStorage del Document Factory + sync al backend.
- **Casos de prueba**: localStorage del Testing Intelligence.
- **Evaluaciones**: localStorage del Quality Evaluator.

## Limitaciones conocidas

- **Tickets de Jira real** son read-only desde aquí. Las acciones se hacen vía el módulo Escalamiento N2.
- **Análisis visual con IA** es heurístico hoy (sin Gemini Vision real). Detecta MIGO/M7 022/etc. por patrones de texto del comentario y filename.
- **Demo guiada** llama al agente Gemini real → consume quota.
- Los **mocks AMS-101..105** quedan editables porque se seedearon en DB junto con tus tickets.

## Troubleshooting

**"Body cannot be empty when content-type is set to 'application/json'"**
→ Bug ya corregido. Si aparece, reportá.

**El modal aparece cortado o detrás de un card**
→ Bug del containing block ya corregido con ModalPortal. Si aparece, reportá.

**El agente tarda mucho en responder**
→ Es Gemini real. Esperá 5-10s. Si pasa 30s, revisá conexión.

**No veo el botón "Crear ticket"**
→ Tu rol no tiene permiso. Pedí a un admin que te suba a AMS_CONSULTANT o superior.

**El backend backfill no corrió y faltan campos**
→ Reiniciá el backend del agente. La migración corre al primer GET.
