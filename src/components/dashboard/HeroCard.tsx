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

function greeting(name: string): string {
  const h = new Date().getHours();
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
  const [now, setNow] = useState(() => new Date());
  const { tenant } = useTenant();
  const brandName = tenant?.brand?.name || tenant?.name || "AMS Platform";
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  const clima = climaIcon(activeEscalations, agentResponseRate);

  return (
    <div style={{
      position: "relative",
      borderRadius: 16,
      overflow: "hidden",
      padding: "26px 28px",
      marginBottom: 22,
      background: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(69,137,255,0.12) 50%, rgba(168,85,247,0.10) 100%)",
      border: "1px solid rgba(99,102,241,0.30)",
      boxShadow: "0 12px 40px rgba(15,23,42,0.40), 0 0 0 1px rgba(255,255,255,0.04) inset",
    }}>
      {/* Decoraciones aurora */}
      <div aria-hidden style={{
        position: "absolute", top: -80, right: -80, width: 280, height: 280,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(69,137,255,0.30) 0%, rgba(69,137,255,0) 70%)",
        filter: "blur(20px)", pointerEvents: "none",
      }} />
      <div aria-hidden style={{
        position: "absolute", bottom: -100, left: -50, width: 260, height: 260,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(168,85,247,0) 70%)",
        filter: "blur(28px)", pointerEvents: "none",
      }} />

      <div className="row" style={{ alignItems: "flex-start", gap: 16, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 2.5, color: "#67e8f9", fontFamily: "var(--font-mono, monospace)", marginBottom: 4 }}>
            AMS · {role.toUpperCase()} · {now.toLocaleString("es-CL", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, background: "linear-gradient(90deg, #e0e7ff, #a5f3fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {greeting(userName)}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#cbd5e1", maxWidth: 540 }}>
            Operación {brandName}. Tu equipo, tu agente y tus clientes desde un solo lugar.
          </p>
        </div>

        {/* Clima del sistema */}
        <div style={{
          padding: "10px 16px",
          background: "rgba(15,23,42,0.45)",
          border: `1px solid ${clima.color}40`,
          borderRadius: 10,
          minWidth: 200,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 4 }}>{clima.icon}</div>
          <div style={{ fontSize: 11, color: clima.color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{clima.label}</div>
        </div>
      </div>

      {/* Stats hero (4 grandes) */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14, marginTop: 22, position: "relative", zIndex: 1,
      }}>
        <HeroStat label="Incidentes registrados"     value={totalIncidents}      color="#4589ff" />
        <HeroStat label="Resueltos hoy"              value={resolvedToday}        color="#86efac" suffix="↑" />
        <HeroStat label="Escalaciones N2 activas"    value={activeEscalations}    color={activeEscalations > 3 ? "#fdba74" : "#a5b4fc"} />
        <HeroStat label="% respuestas IA exitosas"   value={`${Math.round(agentResponseRate)}%`} color={agentResponseRate >= 80 ? "#86efac" : "#fcd34d"} />
      </div>
    </div>
  );
}

function HeroStat({ label, value, color, suffix }: { label: string; value: number | string; color: string; suffix?: string }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: "rgba(15,23,42,0.50)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
      transition: "transform 0.18s, border-color 0.18s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = `${color}66`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
      <div style={{ fontSize: 10.5, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
        {value}{suffix && <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
}
