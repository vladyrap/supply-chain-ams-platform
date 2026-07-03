// =============================================================================
// /marketing — Landing page comercial pública (v1.1.0)
// =============================================================================
// Sin auth · sin RBAC · SEO-friendly.
// Hero + valor + planes + CTA demo + testimonial + footer legal.
// =============================================================================

import Link from "next/link";

// FIX A12 (audit v1.1.0): emails/dominios configurables por env.
// En prod, setear en .env.production:
//   NEXT_PUBLIC_SALES_EMAIL=ventas@tudominio.cl
//   NEXT_PUBLIC_SUPPORT_EMAIL=soporte@tudominio.cl
//   NEXT_PUBLIC_COMPANY_NAME=${COMPANY_NAME}
const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL || "ventas@tuempresa.cl";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "soporte@tuempresa.cl";
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Tu Empresa SpA";
// FIX B1 (audit v1.1.0): year capturado en module init RSC build time.
// Evita hydration mismatch si alguien convierte el componente a "use client".
const COPYRIGHT_YEAR = new Date().getFullYear();

export const metadata = {
  title: "AMS Platform — Soporte SAP con IA · ROI 943×",
  description: "Plataforma SaaS que automatiza el soporte SAP de Nivel 1. Reducí tiempo de resolución de 4h a 1h. Por cada $1 USD invertido en IA, generás $943 USD en valor.",
};

export default function MarketingLandingPage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1e293b", background: "white" }}>
      {/* HERO */}
      <header style={{
        background: "linear-gradient(135deg, #0b1220 0%, #0f1729 100%)",
        color: "white", padding: "80px 20px 60px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <nav style={{ display: "flex", justifyContent: "space-between", marginBottom: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              <span style={{ color: "#4589ff" }}>AMS</span> Platform
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <Link href="/status" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>● Status</Link>
              <Link href="#planes" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Planes</Link>
              <Link href="/login" style={{
                background: "#4589ff", color: "#0b1220", padding: "8px 18px",
                borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 14,
              }}>Iniciar sesión</Link>
            </div>
          </nav>
          <h1 style={{ fontSize: 52, lineHeight: 1.1, fontWeight: 800, maxWidth: 800, marginBottom: 20 }}>
            Tu mesa de soporte SAP con <span style={{ color: "#4589ff" }}>3-5× más productividad</span>
          </h1>
          <p style={{ fontSize: 18, color: "#cbd5e1", maxWidth: 700, marginBottom: 30, lineHeight: 1.5 }}>
            AMS Platform usa IA para clasificar, enriquecer y resolver tickets SAP automáticamente.
            Tu equipo pasa de resolver 3-5 tickets/día a <strong>15-25 tickets/día</strong>.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 60 }}>
            <a href={`mailto:${SALES_EMAIL}?subject=Demo%20AMS%20Platform`}
              style={{ background: "#4589ff", color: "#0b1220", padding: "14px 28px",
                       borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 16 }}>
              🎯 Agendar demo (15 min)
            </a>
            <Link href="#planes" style={{
              background: "transparent", color: "white", padding: "14px 28px",
              border: "2px solid #334155", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 16,
            }}>
              Ver planes
            </Link>
          </div>
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap", paddingTop: 30, borderTop: "1px solid #334155" }}>
            <Metric label="ROI promedio" value="943×" />
            <Metric label="Tiempo medio resolución" value="↓ 75%" />
            <Metric label="Costo IA por ticket" value="<$0.005" />
            <Metric label="Onboarding cliente" value="1.5 h" />
          </div>
        </div>
      </header>

      {/* VALOR */}
      <section style={{ padding: "80px 20px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 14, textAlign: "center" }}>
            ¿Por qué cambiar tu workflow?
          </h2>
          <p style={{ color: "#64748b", fontSize: 17, textAlign: "center", marginBottom: 60, maxWidth: 700, margin: "0 auto 60px" }}>
            Un consultor SAP cuesta $60-150 USD/hora. La mayoría del tiempo se va en triaje y respuestas repetitivas. Eso es lo que automatizamos.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            <ValueCard icon="🎯" title="Clasificación automática"
              desc="IA detecta módulo SAP, proceso y transacción al instante. Sin que tu equipo tenga que pensar." />
            <ValueCard icon="📚" title="Búsqueda en tu KB"
              desc="RAG sobre tu base de conocimiento + casos históricos. Sugerencias contextuales en segundos." />
            <ValueCard icon="⚡" title="Resolución N1 guiada"
              desc="Checklist accionable de qué hacer paso a paso. L1 resuelve 60% sin escalar." />
            <ValueCard icon="🚀" title="Escalamiento inteligente"
              desc="Si tiene que ir a L2, va con paquete completo. L2 nunca pide más info." />
            <ValueCard icon="💬" title="Respuesta al cliente"
              desc="Borrador profesional con Quality Gate de 12 reglas. Tu equipo solo aprueba y envía." />
            <ValueCard icon="📊" title="ROI medible en vivo"
              desc="Panel con costo real Gemini vs valor económico generado. Sin trampa." />
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" style={{ padding: "80px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 14, textAlign: "center" }}>
            Planes desde CLP 200.000 / mes
          </h2>
          <p style={{ color: "#64748b", textAlign: "center", marginBottom: 50, fontSize: 17 }}>
            14 días de prueba gratis · sin tarjeta de crédito · sin compromiso
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            <PlanCard
              name="Starter" price="200K" highlight={false}
              features={["1 cliente · 50 tickets/mes", "Email support", "Knowledge base", "Audit trail", "Dashboard básico"]}
            />
            <PlanCard
              name="Standard" price="500K" highlight={true} badge="Más elegido"
              features={["3 clientes · 200 tickets/mes", "Email + WhatsApp support", "Document factory", "Reuniones AMS (Whisper)", "Dashboard Mission Control", "Panel ROI"]}
            />
            <PlanCard
              name="Premium" price="1.2M" highlight={false}
              features={["Ilimitado clientes/tickets", "SLA 99.9% + WhatsApp 1h", "SSO + multi-tenancy", "White-label opcional", "Soporte 24/7", "Custom integraciones"]}
            />
            <PlanCard
              name="Enterprise" price="A medida" highlight={false}
              features={["Multi-empresa / holding", "SLA negociado", "On-premise opcional", "Compliance regional", "Account manager dedicado", "Custom development"]}
            />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "60px 20px", background: "#0b1220", color: "white" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 14 }}>
            ¿Vemos si te sirve?
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: 16, marginBottom: 30 }}>
            15 minutos de demo + 14 días de trial. Si no te convence, no nos debés nada.
          </p>
          <a href={`mailto:${SALES_EMAIL}?subject=Demo%20AMS%20Platform`} style={{
            background: "#4589ff", color: "#0b1220", padding: "16px 36px",
            borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 18, display: "inline-block",
          }}>
            🎯 Agendar mi demo
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0f1729", color: "#64748b", padding: "40px 20px", textAlign: "center", fontSize: 13 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 14 }}>
            <Link href="/legal/privacidad" style={{ color: "#94a3b8", marginRight: 20 }}>Privacidad</Link>
            <Link href="/legal/terminos" style={{ color: "#94a3b8", marginRight: 20 }}>Términos</Link>
            <Link href="/status" style={{ color: "#94a3b8", marginRight: 20 }}>Status</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#94a3b8" }}>Soporte</a>
          </div>
          {/* FIX B1: year capturado en build (RSC) → consistente para todos los usuarios del bundle */}
          <div>© {COPYRIGHT_YEAR} {COMPANY_NAME} · Hecho en Chile con ❤️</div>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#4589ff" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", letterSpacing: 1 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function ValueCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ padding: 28, background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: "#64748b", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function PlanCard({ name, price, features, highlight, badge }: {
  name: string; price: string; features: string[]; highlight?: boolean; badge?: string;
}) {
  return (
    <div style={{
      padding: 28, borderRadius: 12,
      border: highlight ? "2px solid #4589ff" : "1px solid #e2e8f0",
      background: highlight ? "linear-gradient(180deg, white 0%, #ecfeff 100%)" : "white",
      position: "relative",
    }}>
      {badge && (
        <div style={{
          position: "absolute", top: -12, right: 20, background: "#4589ff", color: "#0b1220",
          padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
        }}>{badge}</div>
      )}
      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{name}</h3>
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 32, fontWeight: 800 }}>{price === "A medida" ? "A medida" : `$${price}`}</span>
        {price !== "A medida" && <span style={{ color: "#64748b" }}> CLP/mes</span>}
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 24, fontSize: 14, lineHeight: 1.8 }}>
        {features.map((f, i) => <li key={i}>✓ {f}</li>)}
      </ul>
      <a href={`mailto:${SALES_EMAIL}?subject=Plan%20${name}%20AMS`} style={{
        display: "block", textAlign: "center", padding: "10px 20px",
        background: highlight ? "#4589ff" : "#0b1220", color: highlight ? "#0b1220" : "white",
        borderRadius: 6, textDecoration: "none", fontWeight: 600,
      }}>Empezar</a>
    </div>
  );
}
