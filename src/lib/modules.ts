import type { ModuleDef, ModuleGroup } from "@/types";
import type { PlatformScreen } from "@/types/rbac";

// =============================================================================
// Catálogo de módulos de la plataforma — fuente única de verdad
// =============================================================================
// Cada módulo declara:
//   - permissionKey: PlatformScreen RBAC con la que se chequea visibilidad.
//   - group: ModuleGroup donde aparece en el sidebar.
//   - public: true sólo para módulos que NO requieren auth/perm (welcome).
//
// El Sidebar consulta hasPermission(user, m.permissionKey, "view") por cada
// módulo. Si permissionKey no está definida → fail-closed (oculto).
//
// Grupos del sidebar derivan de aquí — no hay configuración duplicada en
// Sidebar.tsx (eliminado SECTIONS hardcoded).
// =============================================================================

export const GROUP_LABELS: Record<ModuleGroup, string> = {
  operacion:       "Operación",
  visualizaciones: "Visualizaciones",
  ams_avanzado:    "AMS avanzado",
  sistema:         "Sistema",
};

export const GROUP_ORDER: ModuleGroup[] = [
  "operacion", "visualizaciones", "ams_avanzado", "sistema",
];

export const MODULES: ModuleDef[] = [
  // ───────────────────────── OPERACIÓN ─────────────────────────
  {
    id: "welcome", label: "Bienvenida", icon: "🏠", href: "/welcome",
    description: "Landing del cliente: hero animado + módulos destacados + CTA al agente",
    status: "available", phase: 1,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "dashboard", group: "operacion",
    public: true,
  },
  {
    id: "dashboard", label: "Dashboard", icon: "📊", href: "/dashboard",
    description: "Vista general de actividad, incidentes recientes y KPIs",
    status: "available", phase: 1,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "dashboard", group: "operacion",
  },
  {
    id: "agent", label: "Agente AMS", icon: "🤖", href: "/agent",
    description: "Chat con el agente IA. Diagnóstico, RCA y paso a paso SAP Supply Chain",
    status: "available", phase: 1,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "agente_ams", group: "operacion",
  },
  {
    id: "history", label: "Historial", icon: "📜", href: "/history",
    description: "Listado de incidentes anteriores con filtros y detalle",
    status: "available", phase: 1,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "incidentes", group: "operacion",
  },
  {
    id: "mission-control", label: "Mission Control", icon: "🎮", href: "/mission-control",
    description: "Wallboard tipo NASA: SLA gauge, contadores en vivo, heatmap y feed",
    status: "available", phase: 7,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "reportes", group: "operacion",
  },
  {
    id: "topology", label: "Topology", icon: "🌍", href: "/topology",
    description: "Sistema nervioso en vivo: nodos del sistema + pulsos por cada evento real",
    status: "available", phase: 7,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "reportes", group: "operacion",
  },
  {
    id: "tv", label: "TV Mode", icon: "🎬", href: "/tv",
    description: "Slideshow auto-rotativo con 6 vistas — modo presentación",
    status: "available", phase: 7,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "operacion",
  },
  {
    id: "demo", label: "Demo en vivo", icon: "🎬", href: "/demo",
    description: "Ejecuta un escenario end-to-end con datos reales — para mostrar a clientes",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "reportes", group: "operacion",
  },

  // ────────────────────── VISUALIZACIONES ──────────────────────
  {
    id: "launchpad", label: "Launchpad", icon: "🚀", href: "/launchpad",
    description: "NASA mission control: boot cinematográfico, countdown, telemetry",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "wallboard", label: "Wallboard 4K", icon: "🖥️", href: "/wallboard",
    description: "Quad-view sincronizado para TV 4K. Click focus o auto-rotate",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "war-room", label: "War Room", icon: "🌐", href: "/war-room",
    description: "Globo AMS Global Ops con arcos animados y KPIs holográficos",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "brain", label: "Agent Brain", icon: "🧠", href: "/brain",
    description: "Red neuronal del agente con señales animadas por cada interacción",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "terminal", label: "Bloomberg", icon: "📟", href: "/terminal",
    description: "Terminal estilo Bloomberg AMS: grid 4×3 con widgets vivos",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "hud", label: "Arc Reactor", icon: "⚛️", href: "/hud",
    description: "Cockpit estilo Iron Man con anillos giratorios y particle field",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "forecast", label: "Forecast IA", icon: "🔮", href: "/forecast",
    description: "Proyección 7 días con regresión, banda 95%, anomalías y next-likely",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },
  {
    id: "flow", label: "Data Flow", icon: "🌊", href: "/flow",
    description: "Río de partículas en vivo por cada evento real con 3 carriles",
    status: "available", phase: 8,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "reportes", group: "visualizaciones",
  },

  // ────────────────────── AMS AVANZADO ─────────────────────────
  {
    id: "tickets", label: "Tickets", icon: "🎫", href: "/tickets",
    description: "Conector Jira (real o mock) con Ticket Command Center completo",
    status: "available", phase: 3,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "ticket_command_center", group: "ams_avanzado",
  },
  {
    id: "support-desk", label: "Mesa de Soporte", icon: "📞", href: "/support-desk",
    description: "Soporte AMS con IA de Nivel 1, escalación N2 y KB curada",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "servicios", group: "ams_avanzado",
  },
  {
    id: "voice-calls", label: "Canal Telefónico", icon: "☎️", href: "/voice-calls",
    description: "Llamadas atendidas por IA vía Twilio Voice con transcripción turn-by-turn",
    status: "available", phase: 8,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "canal_telefonico", group: "ams_avanzado",
  },
  {
    id: "knowledge", label: "Conocimiento", icon: "📚", href: "/knowledge",
    description: "Base de conocimiento con RAG. PDFs, Word, Excel, minutas",
    status: "available", phase: 2,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "conocimiento_rag", group: "ams_avanzado",
  },
  {
    id: "agent-training", label: "Entrenamiento IA", icon: "🎓", href: "/knowledge/training",
    description: "Centro de Entrenamiento del Agente: pipeline + simulador + brechas + Q&A",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "entrenamiento_ia", group: "ams_avanzado",
  },
  {
    id: "playbooks", label: "Playbooks AMS", icon: "📕", href: "/playbooks",
    description: "Biblioteca de procedimientos operativos AMS con checklist en vivo",
    status: "available", phase: 7,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "playbooks_ams", group: "ams_avanzado",
  },
  {
    id: "document-factory", label: "Document Factory", icon: "🏭", href: "/document-factory",
    description: "Generador AMS de RCA, minutas, specs, manuales, hypercare, cutover",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "document_factory", group: "ams_avanzado",
  },
  {
    id: "quality-evaluator", label: "Quality Evaluator", icon: "🏅", href: "/quality-evaluator",
    description: "Evaluación humana de cada respuesta del agente",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "quality_evaluator", group: "ams_avanzado",
  },
  {
    id: "escalation-n2", label: "Escalamiento N2", icon: "🚨", href: "/escalation-n2",
    description: "Centro N2: deriva incidentes críticos al especialista correcto",
    status: "available", phase: 7,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "escalamiento_n2", group: "ams_avanzado",
  },
  {
    id: "testing-intelligence", label: "Testing Intelligence", icon: "🧪", href: "/testing-intelligence",
    description: "Graba procesos, genera test scripts, organiza evidencia, Cloud ALM",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "testing_intelligence", group: "ams_avanzado",
  },
  {
    id: "time-estimator", label: "Estimador de Tiempos", icon: "⏱", href: "/time-estimator",
    description: "Convierte requerimiento en banda horas/días con fases, perfiles, riesgos",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "time_estimator", group: "ams_avanzado",
  },
  {
    id: "agent-lab", label: "Agent Lab", icon: "🧪", href: "/agent-lab",
    description: "Enseñá al agente con 👍/👎 + replay & debug + casos por curar",
    status: "available", phase: 7,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "agente_ams", group: "ams_avanzado",
  },
  {
    id: "integrations", label: "Integraciones", icon: "🔌", href: "/integrations",
    description: "Webhooks salientes, Slack y Email para notificar eventos del agente",
    status: "available", phase: 3,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "integraciones", group: "ams_avanzado",
  },
  {
    id: "sap-readonly", label: "SAP Read-Only", icon: "🏭", href: "/sap-readonly",
    description: "Consultas S/4HANA: OC, pedidos, materiales, movimientos. Mock o real",
    status: "available", phase: 4,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "modulos_sap", group: "ams_avanzado",
  },
  {
    id: "meetings", label: "Reuniones AMS", icon: "🎙️", href: "/meetings",
    description: "Sube audio, Whisper transcribe local, Gemini extrae minuta + acciones",
    status: "available", phase: 5,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "servicios", group: "ams_avanzado",
  },

  // ─────────────────────────── SISTEMA ─────────────────────────
  {
    id: "executive", label: "Ejecutivo", icon: "🏢", href: "/executive",
    description: "Dashboard C-level: actividad, % IA, SLA, costo Gemini y top clientes",
    status: "available", phase: 7,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "reportes", group: "sistema",
  },
  {
    id: "business-value", label: "Valor Económico", icon: "💎", href: "/business-value",
    description: "Costo evitado USD y horas ahorradas por la plataforma. Vista ROI C-Level",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "business_value_dashboard", group: "sistema",
  },
  {
    id: "agent-readiness", label: "Agent Readiness", icon: "🎯", href: "/agent-readiness",
    description: "Score 0-100 de cobertura del agente por módulo SAP",
    status: "available", phase: 8,
    rolesAllowed: ["consultor", "aprobador", "admin"],
    permissionKey: "agent_readiness", group: "sistema",
  },
  {
    id: "audit", label: "Audit Trail", icon: "📜", href: "/audit",
    description: "Timeline cross-ticket de todas las acciones registradas",
    status: "available", phase: 8,
    rolesAllowed: ["aprobador", "admin"],
    permissionKey: "audit_trail", group: "sistema",
  },
  {
    id: "settings", label: "Configuración", icon: "⚙️", href: "/settings",
    description: "Cliente, ambiente, voz, branding, firma del tenant",
    status: "available", phase: 1,
    rolesAllowed: ["viewer", "consultor", "aprobador", "admin"],
    permissionKey: "configuracion", group: "sistema",
  },
  {
    id: "admin", label: "Administración", icon: "🛡️", href: "/admin",
    description: "Gestión de usuarios y roles (solo admin)",
    status: "available", phase: 6,
    rolesAllowed: ["admin"],
    permissionKey: "administracion", group: "sistema",
  },
  {
    id: "admin-costs", label: "Costos Gemini", icon: "💰", href: "/admin/costs",
    description: "Dashboard de costos del agente Gemini con health score, recomendaciones IA, forecast y anomalías (solo admin)",
    status: "available", phase: 6,
    rolesAllowed: ["admin"],
    permissionKey: "administracion", group: "sistema",
  },
];

export function moduleById(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}

/** Devuelve módulos filtrados por grupo en orden. */
export function modulesByGroup(group: ModuleGroup): ModuleDef[] {
  return MODULES.filter((m) => (m.group ?? "ams_avanzado") === group);
}

/** Devuelve la permissionKey de un módulo (o null si no tiene). */
export function moduleScreen(moduleId: string): PlatformScreen | null {
  const m = moduleById(moduleId);
  return m?.permissionKey ?? null;
}
