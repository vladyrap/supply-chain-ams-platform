"use client";

// Landing /welcome — primera impresión vendible para clientes nuevos.
// Hero animado + 6 features destacadas + CTAs al dashboard / tour.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { PlatformScreen } from "@/types/rbac";

// Cada feature declara su `screen` RBAC. El grid se filtra fail-closed
// con `canSeeModule`/`can` antes de renderizar — un user sin permiso
// sobre "escalamiento_n2" NO verá esa card aunque el link exista.
interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
  href: string;
  color: string;
  screen: PlatformScreen;
}

const FEATURES: FeatureCard[] = [
  {
    icon: "🤖",
    title: "Agente AMS conversacional",
    desc: "Diagnóstico y RCA de SAP Supply Chain en lenguaje natural. Memoria multi-turno, citas a la base de conocimiento, detección de alucinaciones.",
    href: "/agent",
    color: "#22d3ee",
    screen: "agente_ams",
  },
  {
    icon: "🚨",
    title: "Escalamiento Nivel 2",
    desc: "Motor de derivación con matriz de responsables, reglas SLA y payloads Jira / ServiceNow / SAP Cloud ALM listos para enviar.",
    href: "/escalation-n2",
    color: "#a855f7",
    screen: "escalamiento_n2",
  },
  {
    icon: "🧪",
    title: "Testing Intelligence SAP",
    desc: "Graba pantalla, genera test scripts, organiza evidencias y prepara documentación lista para Cloud ALM. Análisis IA del video opcional.",
    href: "/testing-intelligence",
    color: "#67e8f9",
    screen: "testing_intelligence",
  },
  {
    icon: "📕",
    title: "Playbooks AMS ejecutables",
    desc: "Biblioteca de procedimientos operativos (P1, hypercare, RCA, integraciones) ejecutables como checklist con evidencia paso a paso.",
    href: "/playbooks",
    color: "#34d399",
    screen: "playbooks_ams",
  },
  {
    icon: "🏭",
    title: "Document Factory",
    desc: "14 tipos de documentos AMS: RCA, minutas, especificaciones, manuales, hypercare, cutover, informes ejecutivos. Export Markdown.",
    href: "/document-factory",
    color: "#fdba74",
    screen: "document_factory",
  },
  {
    icon: "🏅",
    title: "Quality Evaluator",
    desc: "Evaluación humana de cada respuesta del agente con scoring multi-eje, detección de alucinación y dashboard de calidad agregada.",
    href: "/quality-evaluator",
    color: "#fcd34d",
    screen: "quality_evaluator",
  },
];

const STATS = [
  { value: "7",   label: "Módulos AMS enterprise" },
  { value: "30+", label: "Vistas operativas" },
  { value: "100%", label: "Datos del cliente en su VPS" },
  { value: "<5min", label: "Tiempo a primer incidente resuelto" },
];

function useTypewriter(words: string[], speed = 90, pause = 1500): string {
  const [text, setText] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => { setText(current.slice(0, charIdx + 1)); setCharIdx((i) => i + 1); }, speed);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => { setText(current.slice(0, charIdx - 1)); setCharIdx((i) => i - 1); }, speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setWordIdx((w) => (w + 1) % words.length);
    }
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return text;
}

export default function WelcomePage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  // Fail-closed: si el user no tiene "view" sobre la screen → la card NO se muestra
  const visibleFeatures = FEATURES.filter((f) => can(f.screen, "view"));
  const animated = useTypewriter([
    "Soporte AMS impulsado por IA",
    "Incidentes SAP resueltos en minutos",
    "Documentos generados al instante",
    "Testing SAP con grabación de pantalla",
    "Escalamiento N2 trazable",
  ]);

  return (
    <div style={{ position: "relative", paddingBottom: 40 }}>
      {/* HERO */}
      <div style={{
        position: "relative",
        padding: "48px 40px 40px",
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(99,102,241,0.20) 0%, rgba(34,211,238,0.14) 50%, rgba(168,85,247,0.16) 100%)",
        border: "1px solid rgba(99,102,241,0.35)",
        boxShadow: "0 20px 60px rgba(15,23,42,0.50)",
        marginBottom: 26,
      }}>
        {/* Aurora decorativa */}
        <div aria-hidden style={{
          position: "absolute", top: -120, right: -100, width: 380, height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)",
          filter: "blur(30px)", pointerEvents: "none",
        }} />
        <div aria-hidden style={{
          position: "absolute", bottom: -120, left: -80, width: 360, height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.32) 0%, rgba(168,85,247,0) 70%)",
          filter: "blur(36px)", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 760 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#67e8f9", fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>
            AMS · SUPPLY CHAIN · SAP
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 42, fontWeight: 800, lineHeight: 1.1,
            background: "linear-gradient(90deg, #e0e7ff, #a5f3fc, #c4b5fd)",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent", color: "transparent",
          }}>
            Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""} —<br />
            <span style={{ minHeight: "1.2em", display: "inline-block" }}>
              {animated}
              <span style={{ borderRight: "2px solid #a5f3fc", marginLeft: 2, animation: "blink 0.9s steps(1) infinite" }} />
            </span>
          </h1>
          <p style={{
            marginTop: 14, fontSize: 16, color: "#cbd5e1",
            maxWidth: 620, lineHeight: 1.55,
          }}>
            La plataforma única para industrializar tu servicio AMS de SAP Supply Chain.
            Agente IA Nivel 1, escalamiento humano Nivel 2, gobierno de IA, generación de documentos,
            testing intelligent y trazabilidad total.
          </p>

          <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            {can("dashboard", "view") && (
              <Link href="/dashboard" className="btn primary" style={{
                padding: "10px 18px", fontSize: 14, fontWeight: 600,
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                borderColor: "#a855f7", boxShadow: "0 8px 24px rgba(99,102,241,0.40)",
              }}>
                Ir al Dashboard →
              </Link>
            )}
            {can("agente_ams", "view") && (
              <Link href="/agent" className="btn" style={{ padding: "10px 18px", fontSize: 14 }}>
                🤖 Chatear con el agente
              </Link>
            )}
            <button className="btn ghost" style={{ padding: "10px 18px", fontSize: 14 }}
              onClick={() => window.dispatchEvent(new CustomEvent("ams-demo-toggle-request"))}>
              🎬 Iniciar tour guiado
            </button>
          </div>
        </div>

        {/* Stats hero */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14, marginTop: 32, paddingTop: 22,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          {STATS.map((s, i) => (
            <div key={i} className="anim-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#e0e7ff", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES GRID */}
      <div style={{
        marginBottom: 16,
        fontSize: 11, letterSpacing: 2.5, color: "var(--text-dim)",
        fontFamily: "var(--font-mono, monospace)",
      }}>
        ▸ MÓDULOS DESTACADOS
      </div>
      {visibleFeatures.length === 0 && (
        <div className="card" style={{ padding: 18, color: "var(--text-soft)", fontSize: 13 }}>
          Tu rol actual no tiene acceso a módulos destacados todavía. Contactá a un administrador para asignarte permisos.
        </div>
      )}
      <div className="anim-stagger" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}>
        {visibleFeatures.map((f) => (
          <Link key={f.title} href={f.href}
            className="glass-card lift-hover"
            style={{
              padding: 20, textDecoration: "none", color: "inherit",
              display: "block",
              borderLeft: `3px solid ${f.color}`,
            }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5 }}>{f.desc}</div>
            <div style={{ marginTop: 12, fontSize: 11, color: f.color, fontWeight: 600 }}>
              Explorar →
            </div>
          </Link>
        ))}
      </div>

      {/* CTA final */}
      <div style={{
        marginTop: 32, padding: "26px 24px",
        borderRadius: 14,
        background: "linear-gradient(90deg, rgba(34,211,238,0.10), rgba(168,85,247,0.08))",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
            ¿Listo para industrializar tu AMS?
          </div>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
            Empezá por chatear con el agente o explorar el dashboard. Todo el sistema funciona con datos demo desde el primer login.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {can("agente_ams", "view") && (
            <Link href="/agent" className="btn primary">🤖 Empezar a chatear</Link>
          )}
          {can("dashboard", "view") && (
            <Link href="/dashboard" className="btn ghost">📊 Ver dashboard</Link>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blink { 50% { border-color: transparent; } }
      `}</style>
    </div>
  );
}
