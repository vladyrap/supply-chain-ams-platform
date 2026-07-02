"use client";

// =============================================================================
// /marketplace — v1.3 Agent Hub
// =============================================================================
// Vitrina comercial de apps agénticas estilo IBM Advantage Marketplace:
//   - Hero "Aplicaciones agénticas para transformación empresarial"
//   - Categorías (Industrias, Funciones corporativas, IT, Foundational)
//   - Cards de soluciones empaquetadas — las disponibles linkean al módulo
//     real de la plataforma; las futuras muestran "Solicitar demo".
// =============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

interface MarketplaceApp {
  id: string;
  name: string;
  icon: string;
  category: "operacion" | "finanzas" | "it" | "foundational";
  description: string;
  outcomes: string[];
  status: "available" | "coming_soon";
  href?: string;
}

const APPS: MarketplaceApp[] = [
  {
    id: "support-desk",
    name: "Mesa de Soporte IA Nivel 1",
    icon: "📞",
    category: "operacion",
    description: "Triage automático de tickets SAP con IA: clasifica, busca en KB, responde y escala a N2 solo cuando hace falta.",
    outcomes: ["-40% tickets escalados", "Respuesta inicial < 1 min", "KB que aprende sola"],
    status: "available",
    href: "/support-desk",
  },
  {
    id: "ticket-intelligence",
    name: "Ticket Command Center",
    icon: "🎯",
    category: "operacion",
    description: "Cada ticket llega enriquecido: análisis de causa raíz, ETA con explicabilidad, next best action y paquete N1 listo.",
    outcomes: ["Readiness score por ticket", "ETA calibrada con histórico", "8 especialistas SAP virtuales"],
    status: "available",
    href: "/tickets",
  },
  {
    id: "agent-hub",
    name: "Agent Hub",
    icon: "🧪",
    category: "foundational",
    description: "Creá tus propios agentes en lenguaje natural, asignales base de conocimiento y compartilos con el equipo.",
    outcomes: ["Agentes sin código", "KB por módulo SAP", "Biblioteca compartida"],
    status: "available",
    href: "/agent-library",
  },
  {
    id: "meetings",
    name: "Reuniones AMS",
    icon: "🎙️",
    category: "operacion",
    description: "Subí la grabación de tu reunión: transcripción, minuta ejecutiva y acciones detectadas automáticamente.",
    outcomes: ["Minuta en minutos", "Acciones trazables", "Histórico buscable"],
    status: "available",
    href: "/meetings",
  },
  {
    id: "document-factory",
    name: "Document Factory",
    icon: "📄",
    category: "operacion",
    description: "Genera documentación operativa desde tus tickets: manuales, especificaciones y reportes con plantillas corporativas.",
    outcomes: ["Docs consistentes", "Desde datos reales", "Export a PDF"],
    status: "available",
    href: "/document-factory",
  },
  {
    id: "executive-insights",
    name: "Executive Insights",
    icon: "📈",
    category: "finanzas",
    description: "Dashboard ejecutivo con valor económico del servicio: ahorro IA, SLA compliance, forecast de demanda.",
    outcomes: ["ROI del agente visible", "Forecast de carga", "Reportes de valor"],
    status: "available",
    href: "/executive",
  },
  {
    id: "testing-intelligence",
    name: "Testing Intelligence",
    icon: "🧬",
    category: "it",
    description: "Escenarios de prueba generados desde incidentes reales: regresión dirigida donde históricamente falla.",
    outcomes: ["Cobertura dirigida", "Evidencia automática", "Defectos trazados"],
    status: "available",
    href: "/testing-intelligence",
  },
  {
    id: "close-copilot",
    name: "Copiloto de Cierre Mensual",
    icon: "🗓️",
    category: "finanzas",
    description: "Orquestación multi-agente del cierre FI/CO: checklist vivo, validaciones automáticas y alertas de bloqueos.",
    outcomes: ["Cierre monitoreado", "Bloqueos anticipados", "Menos días de cierre"],
    status: "coming_soon",
  },
  {
    id: "integration-sentinel",
    name: "Integration Sentinel",
    icon: "🛰️",
    category: "it",
    description: "Monitoreo agéntico de interfaces CPI/PI: detecta caídas, diagnostica causa y propone remediación antes del impacto.",
    outcomes: ["MTTR reducido", "Diagnóstico automático", "Alertas accionables"],
    status: "coming_soon",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  all: "Todas",
  operacion: "Operación AMS",
  finanzas: "Finanzas",
  it: "IT",
  foundational: "Foundational",
};

export default function MarketplacePage() {
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(
    () => category === "all" ? APPS : APPS.filter((a) => a.category === category),
    [category],
  );

  return (
    <div>
      {/* Hero comercial */}
      <div style={{
        borderRadius: 14, padding: "44px 36px", marginBottom: 20,
        background: "linear-gradient(120deg, #1023a0, #1d4ed8 65%, #2563eb)",
        border: "1px solid rgba(91,141,239,0.4)",
      }}>
        <div style={{ fontSize: 11.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
          ✦ SOLUCIONES EMPRESARIALES CON IA
        </div>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15, maxWidth: 640 }}>
          Aplicaciones agénticas para transformar tu operación SAP
        </h1>
        <p style={{ margin: "12px 0 22px", color: "rgba(255,255,255,0.8)", fontSize: 14.5, maxWidth: 620, lineHeight: 1.6 }}>
          Soluciones listas para producción con resultados validados.
          Desplegá en días, no en años.
        </p>
        <div className="row" style={{ gap: 10 }}>
          <a href="#apps" className="btn" style={{ background: "white", color: "#1d4ed8", fontWeight: 600 }}>
            Explorar aplicaciones
          </a>
          <Link href="/agent-studio" className="btn ghost" style={{ borderColor: "rgba(255,255,255,0.4)", color: "white" }}>
            Crear la mía →
          </Link>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div id="apps" className="row" style={{ gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            style={{
              fontSize: 13, padding: "7px 16px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${category === key ? "#22d3ee" : "var(--border-soft)"}`,
              background: category === key ? "rgba(34,211,238,0.15)" : "transparent",
              color: category === key ? "#22d3ee" : "var(--text-soft)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid de apps */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {filtered.map((app) => (
          <div key={app.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <span style={{
                fontSize: 24, width: 46, height: 46, display: "grid", placeItems: "center",
                borderRadius: 12, background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.25)",
              }}>
                {app.icon}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{app.name}</div>
                <div className="row" style={{ gap: 6, marginTop: 3 }}>
                  <Badge variant="muted">{CATEGORY_LABELS[app.category]}</Badge>
                  {app.status === "available"
                    ? <Badge variant="ok">Disponible</Badge>
                    : <Badge variant="warn">Próximamente</Badge>}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.55, flex: 1 }}>
              {app.description}
            </div>

            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7 }}>
              {app.outcomes.map((o) => <li key={o}>{o}</li>)}
            </ul>

            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
              {app.status === "available" && app.href ? (
                <Link href={app.href} className="btn primary" style={{ width: "100%", justifyContent: "center", display: "flex" }}>
                  Abrir aplicación →
                </Link>
              ) : (
                <button className="btn ghost" disabled style={{ width: "100%" }}>
                  🔒 Disponible en próxima versión
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
