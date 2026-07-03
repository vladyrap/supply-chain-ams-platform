"use client";

// Hero card animado para el tope del dashboard.
// Muestra greeting + clima del sistema + 4 stats hero + decoraciones aurora.

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";

interface Props {
  userName: string;
  role: string;
  // Stats hero (4 grandes)
  totalIncidents: number;
  resolvedToday: number;
  activeEscalations: number;
  agentResponseRate: number;  // 0-100
}

// Saludo según la hora. Si no hay hora aún (pre-mount en SSR), saludo neutro
// para que el HTML del servidor y el primer render del cliente coincidan
// (evita hydration mismatch por diferencia de timezone/minuto).
function greeting(name: string, date: Date | null): string {
  if (!date) return `Hola, ${name}`;
  const h = date.getHours();
  if (h < 6) return `Buenas noches, ${name}`;
  if (h < 12) return `Buenos días, ${name}`;
  if (h < 19) return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
}

function climaIcon(escalations: number, responseRate: number): { icon: string; label: string; color: string } {
  if (escalations > 5) return { icon: "🌩", label: "Tormenta operativa", color: "#fca5a5" };
  if (escalations > 2) return { icon: "🌧", label: "Carga alta", color: "#fdba74" };
  if (responseRate < 70) return { icon: "⛅", label: "Operación estable", color: "#fcd34d" };
  return { icon: "☀", label: "Operación nominal", color: "#86efac" };
}

export default function HeroCard({ userName, role, totalIncidents, resolvedToday, activeEscalations, agentResponseRate }: Props) {
  // now arranca en null: SSR y el primer render del cliente muestran lo mismo
  // (sin hora), luego useEffect setea la hora real → sin hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);
  const { tenant } = useTenant();
  const brandName = tenant?.brand?.name || tenant?.name || "AMS Platform";
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  const clima = climaIcon(activeEscalations, agentResponseRate);

  return (
    <div style={{
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      padding: "26px 28px",
      marginBottom: 22,
      // Franja azul IBM sólida (estilo hero IBM Consulting Advantage)
      background: "linear-gradient(135deg, #0f62fe 0%, #0043ce 100%)",
      border: "1px solid #0043ce",
      boxShadow: "var(--shadow)",
    }}>
      {/* Decoración sutil */}
      <div aria-hidden style={{
        position: "absolute", top: -80, right: -60, width: 280, height: 280,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)",
        pointerEvents: "none",
      }} />

      <div className="row" style={{ alignItems: "flex-start", gap: 16, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-mono, monospace)", marginBottom: 4 }}>
            AMS · {role.toUpperCase()}
            {now && ` · ${now.toLocaleString("es-CL", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#ffffff" }}>
            {greeting(userName, now)}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "rgba(255,255,255,0.85)", maxWidth: 540 }}>
            Operación {brandName}. Tu equipo, tu agente y tus clientes desde un solo lugar.
          </p>
        </div>

        {/* Clima del sistema */}
        <div style={{
          padding: "10px 16px",
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 6,
          minWidth: 200,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 4 }}>{clima.icon}</div>
          <div style={{ fontSize: 11, color: "#ffffff", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{clima.label}</div>
        </div>
      </div>

      {/* Stats hero (4 grandes) */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14, marginTop: 22, position: "relative", zIndex: 1,
      }}>
        <HeroStat label="Incidentes registrados"     value={totalIncidents}      suffix="" />
        <HeroStat label="Resueltos hoy"              value={resolvedToday}        suffix="↑" />
        <HeroStat label="Escalaciones N2 activas"    value={activeEscalations} />
        <HeroStat label="% respuestas IA exitosas"   value={`${Math.round(agentResponseRate)}%`} />
      </div>
    </div>
  );
}

function HeroStat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  // Tarjetas internas sobre la franja azul IBM: vidrio translúcido blanco,
  // valores en blanco (los colores no contrastan sobre azul).
  return (
    <div style={{
      padding: "12px 14px",
      background: "rgba(255,255,255,0.14)",
      border: "1px solid rgba(255,255,255,0.22)",
      borderRadius: 6,
      transition: "transform 0.18s, border-color 0.18s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 800, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
        {value}{suffix && <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
}
