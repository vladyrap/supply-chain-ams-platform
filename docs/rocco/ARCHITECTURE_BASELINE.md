# ROCCO — Architecture Baseline & Gap Assessment (v1.0)

> Estado real del producto **hoy**, contrastado con la Constitución. Fiel al Artículo 4
> (*nunca inventar*): cada afirmación se ancla en evidencia del código; lo que no se pudo
> verificar se marca **[sin verificar]**. Fecha de corte: 2026-07-07.
>
> Leyenda de madurez: **✅ Construido** · **🟡 Parcial** · **🔴 Ausente**.

---

## 1. Topología del producto (4 repos)

| Repo | Rol | Stack (evidencia) | Estado |
|---|---|---|---|
| `supply-chain-ams-platform` | Superficie de producto (roccoai.cl) | Next.js 14.2.15 App Router, ~40 módulos (`src/lib/modules.ts`), multi-tenant, RBAC | ✅ maduro |
| `supply-chain-ams-agent` | Backend / copiloto AMS | Fastify + Postgres (`backend/src/{controllers,services,intelligence}`), IA conmutable | ✅ maduro |
| `supply-chain-ams-sap-connector` | Capacidad Clean Core (soporte) | FastAPI read-only (55 tests, evidence integrity) | ✅ robusto, aislado |
| `supply-chain-ams-stack` | Deploy / operación | Docker Compose + Caddy, prod en roccoai.cl | 🟡 [sin verificar en detalle] |

**Observación de arquitectura:** ROCCO es hoy un **sistema multi-repo sin repo-meta de
gobierno**. Estos documentos (`docs/rocco/`) son el primer artefacto de gobierno transversal.
No hay contratos de API versionados **entre** repos formalizados (el connector expone su API,
el agente la suya) — es integración por convención, no API-First estricto entre servicios.

## 2. Superficie funcional (evidencia: `src/lib/modules.ts`)

~40 módulos en 5 grupos: **inicio** (welcome, dashboard) · **operación** (tickets/TCC,
support-desk, escalation-n2, voice-calls, meetings, history) · **agentes** (agent, agent-hub,
publisher, marketplace, knowledge/RAG, training, lab, readiness) · **herramientas** (playbooks,
document-factory, testing-intelligence, time-estimator, quality-evaluator, **clean-core**,
sap-readonly, integrations) · **visualizaciones** (mission-control, topology, brain, war-room,
hud, launchpad, wallboard, forecast, flow, tv, demo).

**Lectura estratégica:** la amplitud es alta (riesgo de *diversificación antes que
especialización*, Art. 5). El activo #1 (Memoria/Graph) **no tiene módulo propio de primera
clase**; existe disperso en knowledge (RAG), history, audit y las visualizaciones.

## 3. Scorecard: Constitución → realidad

| Principio (Artículo) | Estado | Evidencia / Nota honesta |
|---|---|---|
| **A5 SAP First** | 🟡 | Dominio SAP fuerte (clean-core, sap-readonly, scope-items, módulos SAP en incidentes) pero la superficie se diversificó a productividad general. |
| **A6 Clean Core = soporte** | ✅ | Connector aislado y read-only; correctamente NO es el centro. Riesgo inverso: se **sobre-invirtió** en él vs. el activo #1. |
| **A7 Productividad** | 🟡 | Módulos claramente productivos (time-estimator, document-factory, customer-response). Falta **métrica sistemática** de tiempo ahorrado / riesgo eliminado por feature. |
| **A8 Memoria Organizacional** | 🟡 **(proto)** | Existen piezas: `kb_articles`, `incidents`, `ticket_intelligence_history`, `audit_events`, RAG por tenant. **No** hay un subsistema "Memoria" unificado con retención, versión y provenance de primera clase. |
| **A9 Knowledge Graph** | 🟡 **(proyección)** | **Existe** `getKnowledgeGraph()` (`agent/backend/src/services/graph.service.ts`): grafo multi-tenant construido **en tiempo de lectura** desde 5 tablas. Nodos: incident/ticket/conversation/kb/meeting. Edges: escalated/uses_kb/kb_from/linked. **No** persiste, **no** incluye entidades SAP-técnicas (objeto, transacción, tabla, transporte, SAP Note, rol, config, decisión). Es ~15% del grafo que pide A9. |
| **A10 Multi-Tenant** | ✅ | `TenantContext`, middleware `tenant.ts`, `scopedWhere`, migración 005, RAG y graph filtran por `tenant_id`. |
| **A10 API-First** | 🟡 | Controllers REST claros; falta versionado de contratos y OpenAPI transversal entre servicios. |
| **A10 DDD / Hexagonal** | 🔴 | Arquitectura **por capas** (controllers→services→db), no dominios/puertos-adaptadores. Sin bounded contexts explícitos. |
| **A10 Zero Trust / Security by Design** | 🟡 | RBAC fino (`usePermissions`, `RequirePermission`, `requirePermission` middleware), SSO Google, CSRF/CORS, secrets fail-fast; falta mTLS entre servicios y política Zero Trust formal. |
| **A10 Observability by Design** | 🟡 | Prometheus (agente + connector), Sentry, audit; falta tracing distribuido y SLOs. |
| **A10/A4 Evidence by Design** | 🟡 | **Fuerte en el connector** (hashes reproducibles, quality gate, "no inventa"). **Débil/ausente** en el resto (las salidas del copiloto/knowledge no llevan provenance ni hash de evidencia todavía). |
| **A11 IA reemplazable** | ✅ | Proveedor conmutable Gemini + Anthropic con whitelist (`intelligence/task-router.ts`, chatWithAgent + modelOverride). *IA propone, consultor decide* es el patrón. |
| **A11 IA explicable/trazable** | 🟡 | Structured output + audit de llamadas (GEMINI_CALL_*); falta trazar cada afirmación de IA a nodos de evidencia del graph. |
| **A12 Propiedad del conocimiento** | 🟡 | Aislamiento por tenant ✅; **portabilidad/export** de la memoria completa del tenant no formalizada. |
| **A13 Gate de gobierno** | 🔴→🟢 | No existía; se instituye con esta Constitución. |

## 4. Los 5 gaps de mayor apalancamiento (priorizados)

1. **Memoria Organizacional como subsistema de primera clase** (A8). Hoy es proto y disperso.
   Es el activo #1 y el menos construido. → *Diseño en
   [`ORGANIZATIONAL_MEMORY_AND_KNOWLEDGE_GRAPH.md`](./ORGANIZATIONAL_MEMORY_AND_KNOWLEDGE_GRAPH.md).*
2. **Knowledge Graph persistido y con ontología SAP** (A9). Pasar de proyección de lectura de
   5 nodos a grafo persistido que incorpore objetos/transacciones/tablas/transportes/Notes/
   roles/decisiones. El connector Clean Core es un **proveedor natural de nodos SAP-técnicos**.
3. **Evidence by Design fuera del connector** (A4). Llevar el patrón "hash + provenance + no
   inventa" del connector al copiloto, knowledge y assessments.
4. **Contratos API versionados entre servicios** (A10). Formalizar la frontera platform↔agent↔
   connector para que evolucione décadas sin acoplarse.
5. **Métrica de productividad por feature** (A7). Instrumentar tiempo-ahorrado / riesgo-
   eliminado para gobernar el catálogo (y podar diversificación).

## 5. Deuda arquitectónica consciente (registrada, no oculta)

- Estado de resiliencia in-memory en el connector (breaker/rate-limit/lock) → no multi-instancia.
- Assessments del connector síncronos (sin cola/worker).
- Sin DDD/hexagonal formal en agent/platform (capas).
- Sin tracing distribuido ni SLOs.
- Graph no persistido (recomputado por request).

## 6. Veredicto

ROCCO tiene una **superficie de producto madura y un copiloto sólido y alineado con la
Constitución en IA-reemplazable y multi-tenant**. Su **núcleo declarado (Memoria + Graph) es
el eslabón más débil**, y la disciplina de **evidencia** vive hoy sólo en el connector. La
prioridad de arquitectura para "evolucionar durante décadas" es **elevar Memoria+Graph a
ciudadano de primera clase** y **propagar Evidence by Design** al resto de la plataforma —
antes de agregar más módulos.
