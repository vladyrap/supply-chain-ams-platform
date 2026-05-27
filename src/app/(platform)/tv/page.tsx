"use client";

import { useEffect, useState } from "react";
import { fetchAdvanced, fetchExecutive, fetchUsage, fetchNotifications,
  type DashboardAdvanced, type DashboardExecutive, type UsageSummary, type NotificationItem,
} from "@/services/dashboard.api";

const SLIDE_MS = 10_000;
const POLL_MS = 8_000;

interface SlideDef {
  id: string;
  title: string;
  subtitle?: string;
  bgGradient: string;
}

const SLIDES: SlideDef[] = [
  { id: "hero",     title: "AMS Supply Chain SAP",   subtitle: "Sistema en operación",      bgGradient: "linear-gradient(135deg, #1e3a8a 0%, #6b21a8 100%)" },
  { id: "sla",      title: "Cumplimiento SLA",        subtitle: "tickets cerrados a tiempo", bgGradient: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)" },
  { id: "clients",  title: "Top clientes",            subtitle: "por volumen del periodo",   bgGradient: "linear-gradient(135deg, #581c87 0%, #0f172a 100%)" },
  { id: "ai",       title: "IA en acción",            subtitle: "resolución y costos reales", bgGradient: "linear-gradient(135deg, #7c2d12 0%, #1e1b4b 100%)" },
  { id: "live",     title: "Feed en vivo",            subtitle: "últimos eventos del sistema", bgGradient: "linear-gradient(135deg, #0c4a6e 0%, #312e81 100%)" },
  { id: "thanks",   title: "Gracias",                 subtitle: "AMS · Mesa de Soporte · Knowledge", bgGradient: "linear-gradient(135deg, #1e293b 0%, #581c87 50%, #1e3a8a 100%)" },
];

function fmtMoney(v: number): string {
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(5)}`;
}

export default function TvModePage() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(new Date());

  // Polling datos
  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, e, u, n] = await Promise.all([
        fetchAdvanced(), fetchExecutive(30), fetchUsage(30), fetchNotifications(),
      ]);
      if (!alive) return;
      if (a.ok) setAdv(a.d);
      if (e.ok) setExec(e.d);
      if (u.ok) setUsage(u.u);
      if (n.ok) setFeed(n.items.slice(0, 8));
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Slide rotation
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [paused]);

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const slide = SLIDES[slideIdx];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: slide.bgGradient,
      transition: "background 1.2s ease",
      color: "white",
      overflow: "hidden",
      fontFamily: "inherit",
    }}>
      {/* Particles background */}
      <div className="particles" />

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "20px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: 4, opacity: 0.6 }}>● TV MODE</div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>slide {slideIdx + 1}/{SLIDES.length}</div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <button onClick={() => setPaused((p) => !p)} style={{
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "white", padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12,
          }}>{paused ? "▶ play" : "⏸ pausa"}</button>
          <button onClick={toggleFullscreen} style={{
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "white", padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12,
          }}>⛶ fullscreen</button>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>
            {now.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Slide content */}
      <div key={slide.id} style={{
        position: "absolute", inset: 0,
        padding: "100px 60px 60px",
        display: "flex", flexDirection: "column",
        animation: "slideEnter 1.1s ease-out",
        zIndex: 1,
      }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: 0, fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>{slide.title}</h1>
          {slide.subtitle && <div style={{ marginTop: 8, fontSize: 18, opacity: 0.7 }}>{slide.subtitle}</div>}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {renderSlideContent(slide.id, { adv, exec, usage, feed })}
        </div>
      </div>

      {/* Dots indicador */}
      <div style={{
        position: "absolute", bottom: 24, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 10, zIndex: 10,
      }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            style={{
              width: i === slideIdx ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: i === slideIdx ? "white" : "rgba(255,255,255,0.3)",
              border: "none", cursor: "pointer",
              transition: "width .4s, background .4s",
            }}
            aria-label={`slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      {!paused && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 10 }}>
          <div
            key={slideIdx}
            style={{
              height: "100%", width: 0,
              background: "rgba(255,255,255,0.7)",
              animation: `progress ${SLIDE_MS}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes slideEnter {
          0%   { opacity: 0; transform: translateY(20px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes progress {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
        .particles {
          position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
        }
        .particles::before, .particles::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1px 1px at 85% 20%, rgba(255,255,255,0.4), transparent),
            radial-gradient(2px 2px at 10% 70%, rgba(255,255,255,0.3), transparent);
          background-size: 600px 600px;
          animation: drift 80s linear infinite;
        }
        .particles::after { background-size: 900px 900px; opacity: 0.5; animation-duration: 120s; animation-direction: reverse; }
        @keyframes drift { 0% { transform: translate(0,0); } 100% { transform: translate(-600px,-600px); } }
      `}</style>
    </div>
  );
}

// ============================================================
// Slide content renderer
// ============================================================
function renderSlideContent(
  slideId: string,
  { adv, exec, usage, feed }: {
    adv: DashboardAdvanced | null;
    exec: DashboardExecutive | null;
    usage: UsageSummary | null;
    feed: NotificationItem[];
  }
) {
  if (slideId === "hero") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 30, width: "100%" }}>
        <BigStat label="Incidentes totales" value={adv?.totals.incidents ?? "—"} accent="#10b981" />
        <BigStat label="Conversaciones"     value={adv?.totals.supportConversations ?? "—"} accent="#a855f7" />
        <BigStat label="Tickets activos"    value={adv?.totals.supportTicketsActive ?? "—"} accent="#3b82f6" />
        <BigStat label="KB approved"        value={adv?.totals.kbApproved ?? "—"} accent="#fbbf24" />
      </div>
    );
  }
  if (slideId === "sla") {
    const pct = adv?.sla.okPct ?? 100;
    const color = pct >= 90 ? "#10b981" : pct >= 75 ? "#f59e0b" : "#ef4444";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
        <div style={{ position: "relative", width: 380, height: 380 }}>
          <svg width="380" height="380" viewBox="0 0 380 380">
            <circle cx="190" cy="190" r="160" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="22" />
            <circle cx="190" cy="190" r="160" fill="none" stroke={color} strokeWidth="22" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 160}
              strokeDashoffset={2 * Math.PI * 160 - (pct / 100) * 2 * Math.PI * 160}
              transform="rotate(-90 190 190)"
              style={{ filter: `drop-shadow(0 0 20px ${color})`, transition: "stroke-dashoffset 1.5s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 110, fontWeight: 700, color, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 14, opacity: 0.6, marginTop: 8, letterSpacing: 2 }}>SLA CUMPLIDO</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <BigStat label="En SLA"   value={adv?.sla.inSla ?? 0}     accent="#10b981" />
          <BigStat label="Vencidos" value={adv?.sla.breaching ?? 0} accent="#ef4444" />
        </div>
      </div>
    );
  }
  if (slideId === "clients") {
    const top = exec?.byClient.slice(0, 6) ?? [];
    const max = Math.max(1, ...top.map((c) => c.total));
    return (
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 14 }}>
        {top.length === 0 && <div style={{ fontSize: 18, opacity: 0.6, textAlign: "center" }}>Sin datos en el periodo.</div>}
        {top.map((c, i) => (
          <div key={c.name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 500 }}>
                {i + 1}. {c.name === "NO_INFORMADO" ? <em style={{ opacity: 0.5 }}>sin cliente</em> : c.name}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>{c.total}</span>
            </div>
            <div style={{ height: 22, background: "rgba(255,255,255,0.08)", borderRadius: 11, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${(c.total / max) * 100}%`,
                background: "linear-gradient(90deg, #a855f7, #3b82f6)",
                transition: "width 1s",
                boxShadow: "0 0 18px rgba(168,85,247,0.5)",
              }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (slideId === "ai") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30, width: "100%" }}>
        <BigStat label="% IA resuelto"   value={exec ? `${exec.kpis.aiResolutionRate}%` : "—"} accent="#06b6d4" />
        <BigStat label="Llamadas Gemini" value={usage?.totals.calls ?? 0} accent="#a855f7" hint={usage ? `${Math.round(usage.totals.totalTokens / 1000)}k tokens` : ""} />
        <BigStat label="Costo real"      value={usage ? fmtMoney(usage.totals.costUsd) : "—"} accent="#fbbf24" />
      </div>
    );
  }
  if (slideId === "live") {
    return (
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 12 }}>
        {feed.length === 0 && <div style={{ fontSize: 18, opacity: 0.6, textAlign: "center" }}>No hay eventos recientes.</div>}
        {feed.slice(0, 6).map((it, i) => (
          <div key={it.id} style={{
            padding: "14px 20px", background: "rgba(255,255,255,0.08)", borderRadius: 8,
            borderLeft: "4px solid #fbbf24", fontSize: 18,
            animation: `feedIn .5s ease-out both`, animationDelay: `${i * 100}ms`,
          }}>
            <div style={{ fontWeight: 600 }}>{it.title}</div>
            {it.subtitle && <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>{it.subtitle}</div>}
          </div>
        ))}
        <style jsx>{`@keyframes feedIn { 0% { opacity: 0; transform: translateX(-10px); } 100% { opacity: 1; transform: translateX(0); } }`}</style>
      </div>
    );
  }
  if (slideId === "thanks") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 180, lineHeight: 1, marginBottom: 20 }}>🚀</div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>Gemini · pgvector · BullMQ · Whisper · PostgreSQL</div>
      </div>
    );
  }
  return null;
}

function BigStat({ label, value, accent, hint }: { label: string; value: number | string; accent: string; hint?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 100, fontWeight: 700, color: accent, lineHeight: 1,
        textShadow: `0 0 30px ${accent}88`, fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 14, opacity: 0.7, marginTop: 12, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
      {hint && <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
