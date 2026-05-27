"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchExecutive, fetchAdvanced, fetchNotifications, fetchUsage,
  type DashboardExecutive, type DashboardAdvanced, type NotificationItem, type UsageSummary } from "@/services/dashboard.api";

const POLL_MS = 5000;

// Lat/Lng aproximadas por país; se elige por heurística del nombre del cliente.
// Si no matchea se asigna pseudo-random determinista.
const COUNTRY_COORDS: Array<{ kw: RegExp; lat: number; lng: number; country: string }> = [
  { kw: /chile|santiago|miespejo/i,            lat: -33.45, lng:  -70.66, country: "CL" },
  { kw: /argentina|buenos|baires/i,            lat: -34.61, lng:  -58.38, country: "AR" },
  { kw: /peru|lima/i,                          lat: -12.05, lng:  -77.04, country: "PE" },
  { kw: /colombia|bogota/i,                    lat:   4.71, lng:  -74.07, country: "CO" },
  { kw: /mexico|mexic|cdmx/i,                  lat:  19.43, lng:  -99.13, country: "MX" },
  { kw: /brasil|brazil|sao paulo|rio/i,        lat: -23.55, lng:  -46.63, country: "BR" },
  { kw: /espan|spain|madrid|barcelona/i,       lat:  40.42, lng:   -3.70, country: "ES" },
  { kw: /usa|estados|miami|texas|york/i,       lat:  40.71, lng:  -74.00, country: "US" },
  { kw: /alemania|germany|berlin/i,            lat:  52.52, lng:   13.40, country: "DE" },
  { kw: /uruguay|montevideo/i,                 lat: -34.90, lng:  -56.16, country: "UY" },
  { kw: /ecuador|quito|guayaquil/i,            lat:  -0.18, lng:  -78.47, country: "EC" },
  { kw: /panama/i,                             lat:   8.98, lng:  -79.52, country: "PA" },
];

function hash(s: string): number {
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function coordFor(name: string): { lat: number; lng: number; country: string } {
  for (const c of COUNTRY_COORDS) if (c.kw.test(name)) return { lat: c.lat, lng: c.lng, country: c.country };
  const h = hash(name);
  return {
    lat: ((h % 1200) / 10) - 60,            // -60 a 60
    lng: (((h >> 10) % 3600) / 10) - 180,   // -180 a 180
    country: "??",
  };
}

// Equirectangular projection a viewBox 1000×500
function project(lat: number, lng: number): { x: number; y: number } {
  return { x: (lng + 180) * (1000 / 360), y: (90 - lat) * (500 / 180) };
}

// Continentes simplificados como paths SVG (silueta esquemática, no precisión cartográfica).
// Generados a mano para look futurista, suficiente para que se vea "el mundo".
const WORLD_PATHS = [
  // Norte américa
  "M 130 110 L 200 90 L 260 110 L 290 150 L 270 200 L 240 220 L 210 215 L 190 240 L 170 230 L 155 200 L 140 170 Z",
  // Centro/Sudamérica
  "M 250 245 L 290 240 L 305 270 L 310 320 L 295 380 L 270 410 L 255 390 L 245 330 L 240 280 Z",
  // Europa
  "M 480 110 L 540 100 L 560 130 L 545 160 L 520 170 L 495 155 L 482 135 Z",
  // África
  "M 510 200 L 565 195 L 580 240 L 575 300 L 555 350 L 525 360 L 510 330 L 500 280 L 502 240 Z",
  // Asia
  "M 570 110 L 700 95 L 780 125 L 820 165 L 805 200 L 760 215 L 690 200 L 615 180 L 580 150 Z",
  // India
  "M 660 200 L 695 195 L 700 225 L 685 250 L 670 245 L 660 220 Z",
  // Sudeste asiático
  "M 760 230 L 810 235 L 820 270 L 800 285 L 770 270 Z",
  // Australia
  "M 800 340 L 870 335 L 890 370 L 870 395 L 820 395 L 800 370 Z",
];

interface Arc {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  color: string;
  bornAt: number;
  label: string;
}

const EVENT_COLOR: Record<string, string> = {
  incident_created: "#3b82f6",
  ticket_escalated: "#f59e0b",
  ticket_resolved:  "#10b981",
  kb_approved:      "#fbbf24",
  meeting_done:     "#a855f7",
};

// HQ ficticio = centro del mapa (Atlántico Sur), para que los arcos converjan.
const HQ = project(0, -30);

export default function WarRoomPage() {
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [now, setNow] = useState(new Date());
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const [e, a, u, n] = await Promise.all([fetchExecutive(30), fetchAdvanced(), fetchUsage(30), fetchNotifications()]);
      if (!alive) return;
      if (e.ok) setExec(e.d);
      if (a.ok) setAdv(a.d);
      if (u.ok) setUsage(u.u);
      if (n.ok) {
        setFeed(n.items.slice(0, 8));
        const news: NotificationItem[] = [];
        for (const it of n.items) {
          if (!seenIds.current.has(it.id)) {
            seenIds.current.add(it.id);
            if (!firstLoadRef.current) news.push(it);
          }
        }
        firstLoadRef.current = false;
        news.slice(0, 6).forEach((ev, i) => setTimeout(() => emitArc(ev), i * 200));
      }
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Arcs cleanup (autodestroy a los 4s)
  useEffect(() => {
    if (arcs.length === 0) return;
    const t = setInterval(() => {
      setArcs((a) => a.filter((x) => Date.now() - x.bornAt < 4000));
    }, 500);
    return () => clearInterval(t);
  }, [arcs.length]);

  const clients = useMemo(() => {
    const list = exec?.byClient ?? [];
    return list.map((c) => {
      const co = coordFor(c.name);
      const p = project(co.lat, co.lng);
      return { ...c, ...co, x: p.x, y: p.y, weight: c.total };
    });
  }, [exec]);

  function emitArc(ev: NotificationItem) {
    // Si tenemos clientes con coords, elegir uno al azar como origen (preferimos mayor weight)
    if (clients.length === 0) return;
    const i = Math.floor(Math.random() * clients.length);
    const src = clients[i];
    const id = `${ev.id}-${Date.now()}`;
    setArcs((a) => [...a, {
      id, x1: src.x, y1: src.y, x2: HQ.x, y2: HQ.y,
      color: EVENT_COLOR[ev.kind] ?? "#3b82f6",
      bornAt: Date.now(),
      label: ev.title.slice(0, 36),
    }]);
  }

  function fireTest() {
    const kinds = Object.keys(EVENT_COLOR);
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    emitArc({ id: `t-${Date.now()}`, kind: k as NotificationItem["kind"], title: `🧪 test ${k}`, href: "#", createdAt: new Date().toISOString() });
  }

  // KPIs holo lateral
  const kpis = [
    { label: "INCIDENTS·MES",    value: exec?.kpis.incidentsMonth ?? 0,                 unit: "",   color: "#3b82f6" },
    { label: "RESOLVED·MES",     value: exec?.kpis.ticketsResolvedMonth ?? 0,           unit: "",   color: "#10b981" },
    { label: "% IA",             value: Math.round(exec?.kpis.aiResolutionRate ?? 0),   unit: "%",  color: "#06b6d4" },
    { label: "SLA",              value: Math.round(exec?.kpis.slaCompliancePct ?? 0),   unit: "%",  color: "#fbbf24" },
    { label: "AVG RESP",         value: Math.round(exec?.kpis.avgResponseTimeMin ?? 0), unit: "m",  color: "#a855f7" },
    { label: "TOKENS·MES",       value: usage ? Math.round(usage.totals.totalTokens / 1000) : 0, unit: "k", color: "#f59e0b" },
    { label: "COSTO GEMINI",     value: usage ? Number(usage.totals.costUsd.toFixed(2)) : 0, unit: "USD", color: "#ef4444" },
    { label: "SLA BREACHES",     value: adv?.sla.breaching ?? 0,                        unit: "",   color: adv?.sla.breaching ? "#ef4444" : "#6b7280" },
  ];

  return (
    <div style={{
      minHeight: "calc(100vh - 80px)",
      background: "radial-gradient(circle at 50% 40%, rgba(59,130,246,0.10), transparent 60%), #050714",
      padding: "8px 4px",
      color: "#e2e8f0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Starfield decorativo */}
      <div className="starfield" />

      {/* Header */}
      <div className="row between" style={{ marginBottom: 10, padding: "0 6px", position: "relative", zIndex: 2 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 2 }}>
            🌐 AMS GLOBAL OPS <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>· War Room</span>
          </h1>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            polling {POLL_MS / 1000}s · {clients.length} clientes en mapa · {arcs.length} eventos vivos
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button onClick={fireTest} className="btn ghost" style={{ padding: "4px 12px", fontSize: 11 }}>🧪 test arc</button>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 3, color: "#3b82f6", textShadow: "0 0 12px rgba(59,130,246,0.6)" }}>{now.toLocaleTimeString()}</div>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 2 }}>{now.toUTCString().slice(0, 25)} UTC</div>
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        gap: 10,
        position: "relative", zIndex: 2,
      }}>
        {/* MAPA */}
        <div className="war-frame">
          <svg viewBox="0 0 1000 500" width="100%" height="auto" style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="hq-glow"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></radialGradient>
              <linearGradient id="cont-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(59,130,246,0.15)" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>

            {/* Latitudes / longitudes */}
            {[100, 200, 300, 400].map((y) => (
              <line key={`la-${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(59,130,246,0.10)" strokeWidth="0.5" strokeDasharray="3 6" />
            ))}
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
              <line key={`lo-${x}`} x1={x} y1="0" x2={x} y2="500" stroke="rgba(59,130,246,0.10)" strokeWidth="0.5" strokeDasharray="3 6" />
            ))}

            {/* Continentes */}
            {WORLD_PATHS.map((d, i) => (
              <path key={i} d={d} fill="url(#cont-grad)" stroke="rgba(59,130,246,0.55)" strokeWidth="0.8" />
            ))}

            {/* HQ */}
            <circle cx={HQ.x} cy={HQ.y} r="34" fill="url(#hq-glow)" style={{ animation: "haloPulse 2s ease-in-out infinite" }} />
            <circle cx={HQ.x} cy={HQ.y} r="6" fill="#3b82f6" />
            <text x={HQ.x} y={HQ.y - 14} textAnchor="middle" fontSize="9" fill="#60a5fa" fontWeight="600" letterSpacing="1">AMS · HQ</text>

            {/* Arcos animados */}
            {arcs.map((a) => {
              const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
              const cx = (a.x1 + a.x2) / 2 + dy * 0.25;
              const cy = (a.y1 + a.y2) / 2 - dx * 0.25;
              const path = `M ${a.x1} ${a.y1} Q ${cx} ${cy} ${a.x2} ${a.y2}`;
              return (
                <g key={a.id}>
                  <path d={path} stroke={a.color} strokeWidth="1.6" fill="none" strokeOpacity="0.85"
                    strokeDasharray="2000" strokeDashoffset="2000"
                    style={{ animation: "drawArc 1.6s ease-out forwards", filter: `drop-shadow(0 0 6px ${a.color})` }} />
                  <circle r="4" fill={a.color} style={{ filter: `drop-shadow(0 0 6px ${a.color})` }}>
                    <animateMotion path={path} dur="1.6s" fill="freeze" />
                  </circle>
                </g>
              );
            })}

            {/* Clientes */}
            {clients.map((c) => {
              const r = Math.max(3, Math.min(10, 3 + Math.log10((c.weight ?? 1) + 1) * 3));
              return (
                <g key={c.name}>
                  <circle cx={c.x} cy={c.y} r={r + 6} fill={`rgba(16,185,129,0.10)`} style={{ animation: "haloPulse 2.6s ease-in-out infinite" }} />
                  <circle cx={c.x} cy={c.y} r={r} fill="#10b981" filter="url(#glow)" />
                  <text x={c.x + r + 4} y={c.y + 3} fontSize="8.5" fill="#86efac" letterSpacing="0.5">
                    {c.name.slice(0, 18)} <tspan fill="#475569">·{c.country}</tspan>
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Overlays decorativos */}
          <div className="tracking-corner tl" />
          <div className="tracking-corner tr" />
          <div className="tracking-corner bl" />
          <div className="tracking-corner br" />
          <div className="war-grid" />
        </div>

        {/* LATERAL KPIs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card" style={{ padding: 12, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#60a5fa" }}>▼ TELEMETRY</span>
              <span style={{ fontSize: 9, color: "#10b981" }}>● LIVE</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {kpis.map((k) => (
                <div key={k.label} className="holo" style={{ borderColor: k.color }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1.2 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                    {k.value.toLocaleString("es-CL")}<span style={{ fontSize: 11, color: "#64748b", marginLeft: 2 }}>{k.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 12, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(168,85,247,0.3)", flex: 1, display: "flex", flexDirection: "column", maxHeight: 320 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#c084fc" }}>▼ EVENTS·FEED</span>
              <span style={{ fontSize: 9, color: "#10b981" }}>● {feed.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              {feed.length === 0 && <div style={{ color: "#64748b" }}>(esperando eventos)</div>}
              {feed.map((f) => (
                <div key={f.id} className="feed-row" style={{ borderLeft: `2px solid ${EVENT_COLOR[f.kind] ?? "#60a5fa"}` }}>
                  <span style={{ color: "#64748b" }}>{new Date(f.createdAt).toLocaleTimeString()}</span>{" "}
                  <span style={{ color: EVENT_COLOR[f.kind] ?? "#60a5fa" }}>▶</span>{" "}
                  <span style={{ color: "#cbd5e1" }}>{f.title.slice(0, 40)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ticker inferior con clientes ordenados */}
      <div className="ticker-bar">
        <div className="ticker-content">
          {[...clients, ...clients].map((c, i) => (
            <span key={i} style={{ marginRight: 28, fontSize: 12 }}>
              <span style={{ color: "#64748b" }}>{c.country}</span>{" "}
              <span style={{ color: "#86efac", fontWeight: 600 }}>{c.name}</span>{" "}
              <span style={{ color: "#60a5fa" }}>inc {c.incidents}</span>{" "}
              <span style={{ color: "#fbbf24" }}>tkt {c.tickets}</span>
            </span>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .war-frame {
          position: relative;
          background: radial-gradient(ellipse at center, rgba(15,23,42,0.7) 0%, rgba(5,7,20,0.9) 80%);
          border: 1px solid rgba(59,130,246,0.35);
          border-radius: 12px;
          padding: 6px;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(59,130,246,0.10), inset 0 0 60px rgba(59,130,246,0.05);
        }
        .war-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px);
          background-size: 40px 40px;
          mix-blend-mode: screen;
        }
        .tracking-corner {
          position: absolute; width: 22px; height: 22px;
          border: 2px solid rgba(59,130,246,0.7); pointer-events: none;
        }
        .tracking-corner.tl { top: 4px;    left: 4px;    border-right: 0; border-bottom: 0; }
        .tracking-corner.tr { top: 4px;    right: 4px;   border-left:  0; border-bottom: 0; }
        .tracking-corner.bl { bottom: 4px; left: 4px;    border-right: 0; border-top:    0; }
        .tracking-corner.br { bottom: 4px; right: 4px;   border-left:  0; border-top:    0; }
        .holo {
          background: linear-gradient(135deg, rgba(59,130,246,0.05), rgba(15,23,42,0.4));
          border-left: 2px solid;
          padding: 6px 8px;
          border-radius: 3px;
        }
        .feed-row {
          padding: 4px 6px; margin-bottom: 3px;
          background: rgba(255,255,255,0.02);
          border-radius: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .starfield {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 12% 18%, white, transparent),
            radial-gradient(1px 1px at 27% 42%, white, transparent),
            radial-gradient(1px 1px at 38% 75%, white, transparent),
            radial-gradient(1px 1px at 55% 22%, white, transparent),
            radial-gradient(1px 1px at 72% 67%, white, transparent),
            radial-gradient(1px 1px at 88% 31%, white, transparent),
            radial-gradient(1px 1px at 15% 88%, white, transparent),
            radial-gradient(1.4px 1.4px at 65% 12%, #93c5fd, transparent);
          opacity: 0.4;
        }
        .ticker-bar {
          position: relative; z-index: 2;
          margin-top: 10px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(59,130,246,0.25);
          border-radius: 6px;
          overflow: hidden; height: 28px;
          display: flex; align-items: center;
        }
        .ticker-content {
          display: inline-flex; white-space: nowrap;
          animation: tickerSlide 60s linear infinite;
        }
        @keyframes tickerSlide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes haloPulse {
          0%, 100% { opacity: 0.4; transform-origin: center; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.3); }
        }
        @keyframes drawArc {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
