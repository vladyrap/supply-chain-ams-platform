"use client";

import ClientOnly from "@/components/common/ClientOnly";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAdvanced, fetchUsage, fetchNotifications, fetchExecutive,
  type DashboardAdvanced, type UsageSummary, type NotificationItem, type DashboardExecutive } from "@/services/dashboard.api";

const POLL_MS = 4000;

type Layer = "input" | "triage" | "decision" | "resolver" | "output";

interface Neuron {
  id: string;
  layer: Layer;
  label: string;
  x: number;
  y: number;
  color: string;
}

// 5 capas con neuronas. ViewBox 1100×600
const LAYERS: { layer: Layer; x: number; nodes: { label: string; color: string }[] }[] = [
  { layer: "input",    x: 100, nodes: [
    { label: "USER",      color: "#3b82f6" },
    { label: "EMAIL",     color: "#3b82f6" },
    { label: "VOICE",     color: "#3b82f6" },
    { label: "INCIDENT",  color: "#3b82f6" },
  ]},
  { layer: "triage",   x: 320, nodes: [
    { label: "URGENCY",   color: "#f59e0b" },
    { label: "MODULE",    color: "#f59e0b" },
    { label: "CLIENT",    color: "#f59e0b" },
  ]},
  { layer: "decision", x: 560, nodes: [
    { label: "KB·MATCH",  color: "#a855f7" },
    { label: "RAG·VEC",   color: "#06b6d4" },
    { label: "SAP·READ",  color: "#10b981" },
  ]},
  { layer: "resolver", x: 800, nodes: [
    { label: "REASON",    color: "#f1c21b" },
    { label: "DRAFT",     color: "#f1c21b" },
    { label: "CHECK",     color: "#f1c21b" },
  ]},
  { layer: "output",   x: 1020, nodes: [
    { label: "RESOLVED",  color: "#10b981" },
    { label: "ESCALATED", color: "#fa4d56" },
    { label: "KB·NEW",    color: "#a855f7" },
  ]},
];

function buildNeurons(): Neuron[] {
  const ns: Neuron[] = [];
  for (const L of LAYERS) {
    const n = L.nodes.length;
    const top = 80, bot = 520;
    const step = (bot - top) / Math.max(1, n - 1);
    L.nodes.forEach((node, i) => {
      ns.push({
        id: `${L.layer}-${i}`,
        layer: L.layer,
        label: node.label,
        x: L.x,
        y: n === 1 ? (top + bot) / 2 : top + step * i,
        color: node.color,
      });
    });
  }
  return ns;
}

const NEURONS = buildNeurons();

// Edges: cada nodo de capa N conecta a TODOS los de capa N+1 (red densa)
interface Edge { from: string; to: string; }
const EDGES: Edge[] = (() => {
  const arr: Edge[] = [];
  for (let i = 0; i < LAYERS.length - 1; i++) {
    const a = NEURONS.filter((n) => n.layer === LAYERS[i].layer);
    const b = NEURONS.filter((n) => n.layer === LAYERS[i + 1].layer);
    for (const x of a) for (const y of b) arr.push({ from: x.id, to: y.id });
  }
  return arr;
})();

interface Firing {
  id: string;
  path: string[]; // ids de neurons recorridas en orden
  color: string;
  step: number;
  progress: number;
  bornAt: number;
}

const EVENT_COLORS: Record<string, string> = {
  incident_created: "#3b82f6",
  ticket_escalated: "#f59e0b",
  ticket_resolved:  "#10b981",
  kb_approved:      "#a855f7",
  meeting_done:     "#06b6d4",
};

// Para cada evento, generar un path aleatorio coherente (un nodo por capa)
function pathForEvent(kind: NotificationItem["kind"] | string): string[] {
  const pick = (layer: Layer): string => {
    const choices = NEURONS.filter((n) => n.layer === layer);
    return choices[Math.floor(Math.random() * choices.length)].id;
  };
  const input = (() => {
    // intentar mapping coherente
    if (kind === "meeting_done") return "input-2"; // VOICE
    if (kind === "incident_created") return "input-3"; // INCIDENT
    return pick("input");
  })();
  // output coherente
  const output = (() => {
    if (kind === "ticket_resolved")  return "output-0"; // RESOLVED
    if (kind === "ticket_escalated") return "output-1"; // ESCALATED
    if (kind === "kb_approved")      return "output-2"; // KB·NEW
    return pick("output");
  })();
  return [input, pick("triage"), pick("decision"), pick("resolver"), output];
}

export default function BrainPage() {
  return (
    <ClientOnly fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Cargando visualizacion...</div>}>
      <BrainPageInner />
    </ClientOnly>
  );
}

function BrainPageInner() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [firings, setFirings] = useState<Firing[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [rpm, setRpm] = useState(0);
  const [now, setNow] = useState(new Date());
  const seen = useRef<Set<string>>(new Set());
  const firstRef = useRef(true);
  const firingsCountRef = useRef(0);
  const rpmWindow = useRef<number[]>([]);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, u, e, n] = await Promise.all([fetchAdvanced(), fetchUsage(7), fetchExecutive(7), fetchNotifications()]);
      if (!alive) return;
      if (a.ok) setAdv(a.d);
      if (u.ok) setUsage(u.u);
      if (e.ok) setExec(e.d);
      if (n.ok) {
        setFeed(n.items.slice(0, 12));
        const news: NotificationItem[] = [];
        for (const it of n.items) if (!seen.current.has(it.id)) { seen.current.add(it.id); if (!firstRef.current) news.push(it); }
        firstRef.current = false;
        news.slice(0, 5).forEach((ev, i) => setTimeout(() => fireSignal(ev.kind, ev.id), i * 200));
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

  // RPM windowed sobre últimos 60s
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 60_000;
      rpmWindow.current = rpmWindow.current.filter((x) => x > cutoff);
      setRpm(rpmWindow.current.length);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function fireSignal(kind: string, baseId: string) {
    const path = pathForEvent(kind);
    const color = EVENT_COLORS[kind] ?? "#3b82f6";
    const id = `${baseId}-${++firingsCountRef.current}`;
    setFirings((p) => [...p, { id, path, color, step: 0, progress: 0, bornAt: Date.now() }]);
    rpmWindow.current.push(Date.now());
  }

  // Loop animación firings
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const SPEED = 1.6; // capas por seg
    function step(now: number) {
      const dt = (now - last) / 1000; last = now;
      setFirings((prev) => {
        const next: Firing[] = [];
        const lit = new Set<string>();
        for (const f of prev) {
          let { step, progress } = f;
          progress += dt * SPEED;
          while (progress >= 1 && step < f.path.length - 1) { progress -= 1; step++; }
          if (step >= f.path.length - 1 && progress >= 1) continue;
          lit.add(f.path[step]); lit.add(f.path[step + 1]);
          next.push({ ...f, step, progress });
        }
        setActiveNodes(lit);
        return next;
      });
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-firings sintéticos ligeros para que siempre haya actividad (no fake data,
  // pero el cerebro "respira" cuando no hay eventos recientes)
  useEffect(() => {
    const t = setInterval(() => {
      if (firings.length < 3 && Math.random() < 0.7) {
        const kinds = Object.keys(EVENT_COLORS);
        const k = kinds[Math.floor(Math.random() * kinds.length)];
        fireSignal(k, `idle-${Date.now()}`);
      }
    }, 1800);
    return () => clearInterval(t);
  }, [firings.length]);

  const nodeById = useMemo(() => new Map(NEURONS.map((n) => [n.id, n])), []);

  // KPIs cabezal
  const kpis = [
    { label: "AGENT·RPM", value: rpm, color: "#a855f7" },
    { label: "RESOLVED·RATE", value: `${exec?.kpis.aiResolutionRate ?? 0}%`, color: "#10b981" },
    { label: "TOKENS·7D", value: usage ? `${(usage.totals.totalTokens / 1000).toFixed(1)}k` : "0", color: "#f1c21b" },
    { label: "INTERACTIONS·7D", value: exec?.kpis.totalInteractions ?? 0, color: "#06b6d4" },
    { label: "INCIDENTS·OPEN", value: adv?.totals.supportConversationsOpen ?? 0, color: "#3b82f6" },
    { label: "ESCALATIONS", value: adv?.sla.breaching ?? 0, color: "#fa4d56" },
  ];

  return (
    <div style={{
      minHeight: "calc(100vh - 80px)",
      background: "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.08), #050714 70%)",
      padding: "8px 4px",
      color: "#e2e8f0",
      position: "relative",
    }}>
      {/* Header */}
      <div className="row between" style={{ marginBottom: 10, padding: "0 6px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 2 }}>
            🧠 AGENT BRAIN <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>· Gemini Neural Live</span>
          </h1>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            cada señal viaja por triage → decision → resolver → output. {firings.length} señales en vuelo · {rpm} firings/min
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
          <div style={{ fontSize: 22, color: "#a855f7", textShadow: "0 0 10px rgba(168,85,247,0.6)", letterSpacing: 2 }}>{rpm} <span style={{ fontSize: 11, color: "#94a3b8" }}>RPM</span></div>
          <div style={{ fontSize: 10, color: "#64748b" }}>{now.toLocaleTimeString()}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 10 }}>
        {/* Brain canvas */}
        <div className="brain-frame">
          <svg viewBox="0 0 1100 600" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <radialGradient id="brain-core">
                <stop offset="0%"  stopColor="rgba(168,85,247,0.45)" />
                <stop offset="80%" stopColor="rgba(168,85,247,0.10)" />
                <stop offset="100%" stopColor="rgba(168,85,247,0)" />
              </radialGradient>
              {NEURONS.map((n) => (
                <radialGradient key={`ng-${n.id}`} id={`ng-${n.id}`}>
                  <stop offset="0%" stopColor={n.color} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={n.color} stopOpacity="0" />
                </radialGradient>
              ))}
              <filter id="bglow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>

            {/* Core glow detrás del centro */}
            <circle cx="560" cy="300" r="260" fill="url(#brain-core)" style={{ animation: "brainBreath 3s ease-in-out infinite" }} />

            {/* Etiquetas de capa */}
            {LAYERS.map((L) => (
              <text key={L.layer} x={L.x} y="40" textAnchor="middle" fontSize="11" fill="#64748b" letterSpacing="2">
                {L.layer.toUpperCase()}
              </text>
            ))}

            {/* Edges densos */}
            {EDGES.map((e, i) => {
              const a = nodeById.get(e.from); const b = nodeById.get(e.to);
              if (!a || !b) return null;
              const active = activeNodes.has(a.id) && activeNodes.has(b.id);
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? "rgba(168,85,247,0.7)" : "rgba(168,85,247,0.10)"}
                  strokeWidth={active ? 1.4 : 0.5}
                  style={{ transition: "stroke .25s, stroke-width .25s" }}
                />
              );
            })}

            {/* Neurons */}
            {NEURONS.map((n) => {
              const active = activeNodes.has(n.id);
              return (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  {active && <circle r="28" fill={`url(#ng-${n.id})`} style={{ animation: "haloPulse 1s ease-out infinite" }} />}
                  <circle r={active ? 12 : 8} fill="#0f172a" stroke={n.color} strokeWidth={active ? 2.5 : 1.2} filter={active ? "url(#bglow)" : undefined} style={{ transition: "stroke-width .2s, r .2s" }} />
                  <circle r="3" fill={n.color} style={{ filter: `drop-shadow(0 0 4px ${n.color})` }} />
                  <text textAnchor="middle" y="-16" fontSize="9" fill={n.color} letterSpacing="1" fontWeight="600">{n.label}</text>
                </g>
              );
            })}

            {/* Firings */}
            {firings.map((f) => {
              const a = nodeById.get(f.path[f.step]);
              const b = nodeById.get(f.path[f.step + 1]);
              if (!a || !b) return null;
              const x = a.x + (b.x - a.x) * f.progress;
              const y = a.y + (b.y - a.y) * f.progress;
              return (
                <g key={f.id}>
                  <circle cx={x} cy={y} r="12" fill={f.color} fillOpacity="0.25" />
                  <circle cx={x} cy={y} r="5"  fill={f.color} style={{ filter: `drop-shadow(0 0 8px ${f.color})` }} />
                </g>
              );
            })}
          </svg>

          <div className="tracking-corner tl" />
          <div className="tracking-corner tr" />
          <div className="tracking-corner bl" />
          <div className="tracking-corner br" />
        </div>

        {/* Side panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card" style={{ padding: 12, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#c084fc", letterSpacing: 1.5 }}>▼ NEURAL·METRICS</span>
              <span style={{ fontSize: 9, color: "#10b981" }}>● LIVE</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {kpis.map((k) => (
                <div key={k.label} className="holo" style={{ borderColor: k.color }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1.2 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 12, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(168,85,247,0.3)", flex: 1, maxHeight: 360, display: "flex", flexDirection: "column" }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#c084fc", letterSpacing: 1.5 }}>▼ SYNAPTIC·LOG</span>
              <span style={{ fontSize: 9, color: "#94a3b8" }}>{feed.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              {feed.length === 0 && <div style={{ color: "#64748b" }}>...</div>}
              {feed.map((f) => (
                <div key={f.id} style={{ padding: "3px 6px", marginBottom: 3, background: "rgba(168,85,247,0.06)", borderLeft: `2px solid ${EVENT_COLORS[f.kind] ?? "#a855f7"}`, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "#64748b" }}>{new Date(f.createdAt).toLocaleTimeString().slice(0,8)}</span>{" "}
                  <span style={{ color: EVENT_COLORS[f.kind] ?? "#a855f7" }}>{f.kind}</span>{" "}
                  {f.title.slice(0, 30)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .brain-frame {
          position: relative;
          background: radial-gradient(ellipse at center, rgba(15,23,42,0.7) 0%, rgba(5,7,20,0.95) 80%);
          border: 1px solid rgba(168,85,247,0.35);
          border-radius: 12px;
          padding: 6px;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(168,85,247,0.12), inset 0 0 80px rgba(168,85,247,0.06);
        }
        @keyframes brainBreath {
          0%, 100% { opacity: 0.5; transform-origin: 560px 300px; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
