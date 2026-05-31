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
  {
    id: "ams_full_flow",
    label: "Flujo completo AMS",
    icon: "🚀",
    description: "Ticket MM como centro: autoestimación → Decision Engine → clasificación → escalación → RCA → Q&A → valor económico.",
    steps: [
      { href: "/tickets",              title: "Crear ticket MM MIGO",           description: "Botón ＋ Crear ticket. Ej.: 'MIGO M7 022 al recibir mercancía OC 4500001234' · MM · PRD · High." },
      { href: "/tickets",              title: "Ver autoestimación (4–12h)",     description: "Sección 'ESTIMACIÓN DE RESOLUCIÓN' del Command Center: banda + fases + confianza." },
      { href: "/tickets",              title: "Clasificar con Agente AMS",      description: "Sección 'CLASIFICACIÓN AMS · DIAGNÓSTICO': mirá la metadata (agentVersion, kbVersion, fuentes RAG)." },
      { href: "/tickets",              title: "Scope Items + Playbook",         description: "Secciones automáticas que muestran qué procesos SAP aplican y si hay playbook reutilizable." },
      { href: "/tickets",              title: "Acciones rápidas (Decision Engine)", description: "Card ⚡ ACCIONES RÁPIDAS: el motor recomienda 'Pedir más info', 'Escalar N2', 'Generar RCA', etc., con peso." },
      { href: "/escalation-n2",        title: "Escalación N2 con diff",         description: "Si escalaste el ticket, abrir su detalle: muestra ETA N1 vs ajustada N2." },
      { href: "/document-factory",     title: "Generar RCA del ticket",         description: "Plantilla 'Estimación de resolución' o 'RCA' usando los datos auto-generados." },
      { href: "/testing-intelligence", title: "Crear caso de prueba",           description: "Capturar el escenario para regresión." },
      { href: "/knowledge/training",   title: "Convertir en conocimiento",      description: "El ticket resuelto se vuelve KB + Q&A. Versión publicada del agente sube su readiness." },
      { href: "/tickets",              title: "Auditoría · Timeline",           description: "Volver al ticket: sección AUDITORÍA muestra cada paso registrado con actor y timestamp." },
      { href: "/dashboard",            title: "Valor económico generado",       description: "Sección 'VALOR GENERADO': costo evitado USD + horas ahorradas + readiness por módulo." },
    ],
  },
];
