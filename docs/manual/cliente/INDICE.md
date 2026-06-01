# Manual AMS Platform · Cliente / Operativo

**Audiencia:** consultor AMS, key user del cliente, líder de servicio.
**Propósito:** operar la plataforma día a día. Saber qué hace cada módulo,
cuándo abrirlo, cómo resolver un caso típico.

## Cómo usar este manual

- Cada **módulo** tiene su archivo: qué es · cuándo abrirlo · paso a paso con captura · permisos · qué se guarda · limitaciones.
- Capturas en `../screens/`. Si una captura no coincide con tu pantalla, posiblemente cambió de versión — avisanos.
- Lo que diga "DEMO" en alguna pantalla quiere decir que está simulado mientras no se conecten credenciales reales (Jira, ServiceNow, SAP).
- El idioma del sistema es español (Chile). Algunos términos SAP quedan en inglés porque así están en SAP.

## Mapa rápido del sistema

La plataforma se organiza en **4 secciones del sidebar**:

| Sección | Para qué sirve |
|---|---|
| **Operación** | Día a día del consultor: tickets, agente, historial, dashboards principales |
| **Visualizaciones wow** | Vistas para sala de operaciones y presentaciones a cliente |
| **AMS avanzado** | Módulos que cierran el ciclo end-to-end: playbooks, documentos, testing, conocimiento |
| **Sistema** | Administración, auditoría, configuración y métricas ejecutivas |

## Tabla maestra · 36 módulos

### 🎬 Sección Operación

| # | Módulo | Ruta | Qué hace para vos |
|---|---|---|---|
| 1 | 🏠 Bienvenida | `/welcome` | Landing inicial: hero animado con 6 accesos rápidos al sistema. Sirve para mostrar el sistema a cliente nuevo |
| 2 | 📊 Dashboard | `/dashboard` | KPIs globales: incidentes hoy, tickets activos, % resueltos por IA, esfuerzo estimado total, valor económico generado. Es la portada operativa diaria |
| 3 | 🤖 Agente AMS | `/agent` | Chat directo con el agente IA. Hacés una consulta SAP Supply Chain y te responde con diagnóstico, RCA y paso a paso. Acepta capturas de pantalla |
| 4 | 📜 Historial | `/history` | Listado de TODAS las interacciones pasadas con el agente. Filtros por módulo SAP, cliente, ambiente, fecha. Permite reabrir el ticket en el Command Center |
| 5 | 🎮 Mission Control | `/mission-control` | Wallboard estilo NASA con SLA gauge, contadores en vivo, heatmap y feed de eventos. Ideal para proyectar en TV de la sala AMS |
| 6 | 🌍 Topology | `/topology` | Mapa del sistema mostrando todos los nodos (incidentes, tickets, KB, reuniones) con pulsos animados por cada evento real |
| 7 | 🎬 TV Mode | `/tv` | Slideshow automático rotando 6 vistas cada 25s. Para dejar puesto en la TV durante el día |
| 8 | 🎬 Demo en vivo | `/demo` | Reproduce un escenario completo de Mesa de Soporte end-to-end con datos reales. Pensado para presentar a cliente potencial |

### 🌐 Sección Visualizaciones wow

| # | Módulo | Ruta | Qué hace para vos |
|---|---|---|---|
| 9 | 🚀 Launchpad | `/launchpad` | Cockpit estilo NASA con boot sequence cinematográfica, countdown, telemetry y waveform de tokens. Wow effect para abrir presentación |
| 10 | 🖥 Wallboard 4K | `/wallboard` | Quad-view sincronizado de 4 visualizaciones para TV 4K. Auto-rotate cada 25s |
| 11 | 🌐 War Room | `/war-room` | Globo 3D con clientes en el mapa, arcos animados por evento real y KPIs holográficos. Para sala de operaciones AMS global |
| 12 | 🧠 Agent Brain | `/brain` | Visualización de la "red neuronal" del agente: cada consulta se propaga por triage → decision → resolver → output |
| 13 | 📟 Bloomberg | `/terminal` | Terminal estilo financiero con grid 4×3 de widgets vivos, log stream Matrix y sparklines |
| 14 | ⚛️ Arc Reactor | `/hud` | Cockpit Iron Man con SLA en arc reactor, anillos giratorios, gauges holográficos y partículas |
| 15 | 🔮 Forecast IA | `/forecast` | Proyección a 7 días con regresión lineal sobre histórico real, banda de confianza 95% y top 3 incidentes probables |
| 16 | 🌊 Data Flow | `/flow` | Río de partículas: cada evento real fluye por uno de 3 carriles (resuelto/escalado/info) con velocidad según RPM |

### 📞 Sección AMS avanzado

| # | Módulo | Ruta | Qué hace para vos |
|---|---|---|---|
| 17 | 🎫 **Tickets** ⭐ | `/tickets` | **Centro del sistema.** Lista tickets + Command Center con 14 secciones por ticket: estimación, clasificación, playbook, escalación, RCA, testing, KB, evaluación, audit. Acá pasa todo |
| 18 | 📞 Mesa de Soporte | `/support-desk` | Soporte con IA de Nivel 1, escalación automática a Nivel 2 y KB curada por casos |
| 19 | ☎️ Canal Telefónico | `/voice-calls` | Llamadas entrantes atendidas por IA vía Twilio Voice. Transcripción + turnos USER/AI/SYSTEM + detección de derivación a humano |
| 20 | 📚 Conocimiento | `/knowledge` | Base de conocimiento documental con RAG: subís PDFs/Word/Excel/minutas y el agente los usa al responder |
| 21 | 🎓 Entrenamiento IA | `/knowledge/training` | Centro de entrenamiento del agente: carga, valida, versiona y mejora el conocimiento. Pipeline + simulador + brechas + Q&A |
| 22 | 📕 Playbooks AMS | `/playbooks` | Biblioteca de procedimientos operativos: P1, hypercare, RCA, escalamiento, integraciones. Checklist ejecutable en vivo |
| 23 | 🏭 Document Factory | `/document-factory` | Generador de documentos AMS desde plantillas: RCA, minutas, specs funcionales, manuales, hypercare, cutover, ejecutivos |
| 24 | 🏅 Quality Evaluator | `/quality-evaluator` | Evaluación humana 5 estrellas de cada respuesta del agente: precisión, utilidad, claridad, riesgo de alucinación, fit técnico |
| 25 | 🚨 Escalamiento N2 | `/escalation-n2` | Centro de escalamiento Nivel 2: deriva incidentes críticos al especialista correcto, con trazabilidad, SLA y prep Jira/ServiceNow |
| 26 | 🧪 Testing Intelligence | `/testing-intelligence` | Graba procesos SAP, genera test scripts, organiza evidencia y prepara documentación para SAP Cloud ALM |
| 27 | ⏱ Estimador de Tiempos | `/time-estimator` | Convierte un requerimiento en banda horas/días con fases, perfiles, riesgos, supuestos y respuesta lista para el cliente |
| 28 | 🎫 Tickets Jira | `/tickets` (sección Jira) | Lectura de tickets desde Jira real (si hay credenciales) o set de demo |
| 29 | 🔌 Integraciones | `/integrations` | Webhooks salientes, Slack y Email para notificar eventos del agente a sistemas externos |
| 30 | 🏭 SAP Read-Only | `/sap-readonly` | Consultas a S/4HANA en modo lectura: OC, pedidos, materiales, movimientos. Mock o real |
| 31 | 🎙️ Reuniones AMS | `/meetings` | Subís audio, Whisper transcribe local, Gemini extrae minuta + acciones |
| 32 | 🧪 Agent Lab | `/agent-lab` | Enseñá al agente con 👍/👎, replay & debug de conversaciones, casos por curar |

### 🛡️ Sección Sistema

| # | Módulo | Ruta | Qué hace para vos |
|---|---|---|---|
| 33 | 🏢 Ejecutivo | `/executive` | Dashboard C-level: actividad, % IA, SLA, costo Gemini estimado y top clientes |
| 34 | 💎 Valor Económico | `/business-value` | Costo evitado USD y horas ahorradas por la plataforma. ROI demostrable al cliente |
| 35 | 🎯 Agent Readiness | `/agent-readiness` | Score 0-100 de cobertura del agente por módulo SAP (knowledge + Q&A + tests + scope + gaps) |
| 36 | 📜 Audit Trail | `/audit` | Timeline cross-ticket de TODAS las acciones registradas con actor, rol y metadata |
| 37 | ⚙️ Configuración | `/settings` | Cliente actual, ambiente, preferencias de la plataforma |
| 38 | 🛡️ Administración | `/admin` | Gestión de usuarios, roles y permisos RBAC (solo admins) |

## Glosario rápido

| Término | Qué significa |
|---|---|
| **AMS** | Application Management Services. Soporte continuo post-implementación SAP |
| **RAG** | Retrieval Augmented Generation. El agente busca en tus PDFs antes de responder |
| **RCA** | Root Cause Analysis. Documento de análisis de causa raíz |
| **N1 / N2** | Niveles de soporte: N1 atiende, N2 especialista resuelve |
| **SLA** | Service Level Agreement. Tiempo máximo comprometido para resolver |
| **Scope Item** | Pieza de funcionalidad SAP S/4HANA Cloud (ej. "1A0" = Procure-to-Pay) |
| **ETA** | Estimated Time of Arrival. Rango de horas estimado para resolver un ticket |
| **Readiness** | Qué tan completa está la información de un ticket para resolverlo |
| **Decision Engine** | Motor que recomienda la "next best action" sobre un ticket |
| **Demo mode** | Modo simulado cuando no hay credenciales reales conectadas (Jira, SAP, ServiceNow) |
| **Command Center** | Panel del detalle del ticket con todas las acciones |

## Próximos archivos de este manual

Cada uno con su detalle paso a paso + capturas:

- [ ] `01-tickets.md` — el más importante, cubrir primero
- [ ] `02-agente-ams.md`
- [ ] `03-dashboard.md`
- [ ] `04-mesa-de-soporte.md`
- [ ] `05-conocimiento.md`
- [ ] `06-entrenamiento-ia.md`
- [ ] `07-playbooks-ams.md`
- [ ] `08-document-factory.md`
- [ ] `09-quality-evaluator.md`
- [ ] `10-escalamiento-n2.md`
- [ ] `11-testing-intelligence.md`
- [ ] `12-estimador-de-tiempos.md`
- [ ] `13-historial.md`
- [ ] `14-integraciones.md`
- [ ] `15-sap-read-only.md`
- [ ] `16-reuniones-ams.md`
- [ ] `17-canal-telefonico.md`
- [ ] `18-agent-lab.md`
- [ ] `19-mission-control.md`
- [ ] `20-topology.md`
- [ ] `21-tv-mode.md`
- [ ] `22-demo-en-vivo.md`
- [ ] `23-war-room.md`
- [ ] `24-agent-brain.md`
- [ ] `25-bloomberg.md`
- [ ] `26-arc-reactor.md`
- [ ] `27-launchpad.md`
- [ ] `28-wallboard-4k.md`
- [ ] `29-forecast-ia.md`
- [ ] `30-data-flow.md`
- [ ] `31-bienvenida.md`
- [ ] `32-ejecutivo.md`
- [ ] `33-valor-economico.md`
- [ ] `34-agent-readiness.md`
- [ ] `35-audit-trail.md`
- [ ] `36-configuracion.md`
- [ ] `37-administracion.md`
