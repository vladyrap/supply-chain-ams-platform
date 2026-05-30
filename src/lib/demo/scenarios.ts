import type { DemoScenario } from "@/types/ams-modules";

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "ams_supply_chain",
    label: "Demo AMS Supply Chain",
    icon: "🚚",
    description: "Flujo end-to-end: incidente MM → diagnóstico → conocimiento → Q&A → versión publicada.",
    steps: [
      { href: "/history",              title: "Incidente MM",                   description: "Abrí el detalle de un incidente reciente." },
      { href: "/history",              title: "Convertir en conocimiento",      description: "Botón ‘Convertir en conocimiento’." },
      { href: "/knowledge/training",   title: "Validar Q&A generadas",          description: "Tab Generador Q&A → aprobar." },
      { href: "/knowledge/training",   title: "Publicar versión",               description: "Tab Versiones → crear + publicar." },
    ],
  },
  {
    id: "executive",
    label: "Demo Ejecutivo",
    icon: "📊",
    description: "Visión para C-Level: métricas, ROI, calidad y valor generado.",
    steps: [
      { href: "/dashboard",            title: "Dashboard",                      description: "KPIs principales del servicio." },
      { href: "/executive",            title: "Vista ejecutiva",                description: "Tendencias y costo del agente." },
      { href: "/quality-evaluator",    title: "Quality Evaluator",              description: "Dashboard de calidad de respuestas." },
      { href: "/forecast",             title: "Forecast IA",                    description: "Proyecciones a 7 días." },
    ],
  },
  {
    id: "training_ia",
    label: "Demo Entrenamiento IA",
    icon: "🎓",
    description: "Cómo se alimenta y mejora el agente con conocimiento real.",
    steps: [
      { href: "/knowledge",            title: "Base de conocimiento",           description: "RAG documental." },
      { href: "/knowledge/training",   title: "Centro de Entrenamiento",        description: "Carga, validación, brechas." },
      { href: "/knowledge/training",   title: "Auto-pulido",                    description: "Tab Aprendizaje → Pulir agente ahora." },
      { href: "/agent-lab",            title: "Agent Lab",                      description: "Playground + adopt prompt activo." },
    ],
  },
  {
    id: "ia_governance",
    label: "Demo Gobierno IA",
    icon: "🛡",
    description: "Roles, permisos, auditoría y versionado del agente.",
    steps: [
      { href: "/admin",                title: "Administración de Accesos",      description: "Usuarios, roles, simulación." },
      { href: "/quality-evaluator",    title: "Quality Evaluator",              description: "Evaluación humana." },
      { href: "/knowledge/training",   title: "Versiones del agente",           description: "Historial + rollback simulado." },
      { href: "/playbooks",            title: "Playbooks AMS",                  description: "Procedimientos auditables." },
    ],
  },
  {
    id: "documentation",
    label: "Demo Documentación",
    icon: "📄",
    description: "Generación industrial de documentos AMS desde incidentes.",
    steps: [
      { href: "/history",              title: "Incidente real",                 description: "Elegí un caso resuelto." },
      { href: "/document-factory",     title: "Generar RCA",                    description: "Document Factory → RCA." },
      { href: "/document-factory",     title: "Minuta de reunión",              description: "Document Factory → Minuta." },
      { href: "/document-factory",     title: "Respuesta al cliente + export",  description: "Generar y descargar como Markdown." },
    ],
  },
];
