"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { fetchGraph, type GraphNode, type GraphEdge, type GraphNodeType } from "@/services/graph.api";

const TYPE_COLOR: Record<GraphNodeType, string> = {
  incident:     "#10b981",
  ticket:       "#3b82f6",
  conversation: "#a855f7",
  kb:           "#fbbf24",
  meeting:      "#06b6d4",
};

const TYPE_ICON: Record<GraphNodeType, string> = {
  incident:     "💡",
  ticket:       "🎫",
  conversation: "💬",
  kb:           "📘",
  meeting:      "🎙",
};

const TYPE_LABEL: Record<GraphNodeType, string> = {
  incident:     "Incidente",
  ticket:       "Ticket",
  conversation: "Conversación",
  kb:           "KB",
  meeting:      "Reunión",
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Force-directed layout muy simple, sin libs.
// - repulsión entre todos los nodos (~Coulomb)
// - atracción solo en edges (~Hooke)
// - centrado al canvas
// Itera durante un tiempo limitado luego frena.
function useForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  w: number, h: number,
): { simNodes: SimNode[]; iterations: number } {
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [iterations, setIterations] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    // Init posiciones (círculo grande aleatorio)
    const init: SimNode[] = nodes.map((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const r = Math.min(w, h) * 0.35;
      return {
        ...n,
        x: w / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 30,
        y: h / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0,
      };
    });
    let current = init;
    let count = 0;

    // Map id -> idx
    const idx = new Map<string, number>();
    init.forEach((n, i) => idx.set(n.id, i));

    function step() {
      const REP = 1800;
      const SPRING = 0.012;
      const SPRING_LEN = 110;
      const DAMP = 0.82;
      const CENTER = 0.005;
      const MAX_V = 6;

      const next = current.map((n) => ({ ...n }));

      // Repulsión todos vs todos
      for (let i = 0; i < next.length; i++) {
        for (let j = i + 1; j < next.length; j++) {
          const a = next[i], b = next[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const d = Math.sqrt(d2);
          const f = REP / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Atracción por edges
      for (const e of edges) {
        const ia = idx.get(e.from); const ib = idx.get(e.to);
        if (ia === undefined || ib === undefined) continue;
        const a = next[ia], b = next[ib];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const delta = d - SPRING_LEN;
        const f = SPRING * delta;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Hacia el centro
      for (const n of next) {
        n.vx += (w / 2 - n.x) * CENTER;
        n.vy += (h / 2 - n.y) * CENTER;
      }

      // Integrar + damping + clamp
      for (const n of next) {
        n.vx *= DAMP;
        n.vy *= DAMP;
        n.vx = Math.max(-MAX_V, Math.min(MAX_V, n.vx));
        n.vy = Math.max(-MAX_V, Math.min(MAX_V, n.vy));
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(w - 30, n.x));
        n.y = Math.max(30, Math.min(h - 30, n.y));
      }

      current = next;
      setSimNodes(next);
      setIterations(++count);

      if (count < 220) {
        animRef.current = requestAnimationFrame(step);
      }
    }

    if (init.length > 0 && w > 0 && h > 0) {
      animRef.current = requestAnimationFrame(step);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, w, h]);

  return { simNodes, iterations };
}

export default function KnowledgeGraphPage() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 600 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [counts, setCounts] = useState<Record<GraphNodeType, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Record<GraphNodeType, boolean>>({
    incident: true, ticket: true, conversation: true, kb: true, meeting: true,
  });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await fetchGraph(limit);
    if (r.ok) {
      setNodes(r.g.nodes);
      setEdges(r.g.edges);
      setCounts(r.g.counts);
    } else {
      setError(r.error);
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  // Medir contenedor
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.round(r.width), h: Math.max(420, Math.round(r.height)) });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // Filtrar por tipo
  const visibleNodes = nodes.filter((n) => activeTypes[n.type]);
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));

  const { simNodes, iterations } = useForceLayout(visibleNodes, visibleEdges, size.w, size.h);
  const nodeById = new Map(simNodes.map((n) => [n.id, n]));

  return (
    <div>
      <div className="page-title">
        <h1>🌳 Knowledge Graph</h1>
        <p>Visualización del conocimiento del sistema: incidents, tickets, conversaciones, KB articles y reuniones, conectados por sus relaciones reales.</p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {(Object.keys(TYPE_COLOR) as GraphNodeType[]).map((t) => (
          <label key={t} className="row" style={{
            gap: 6, padding: "4px 10px",
            background: activeTypes[t] ? "rgba(255,255,255,0.04)" : "transparent",
            borderRadius: 12, cursor: "pointer", fontSize: 12,
            border: `1px solid ${activeTypes[t] ? TYPE_COLOR[t] : "var(--border-soft)"}`,
            opacity: activeTypes[t] ? 1 : 0.5,
          }}>
            <input
              type="checkbox"
              checked={activeTypes[t]}
              onChange={(e) => setActiveTypes((s) => ({ ...s, [t]: e.target.checked }))}
              style={{ accentColor: TYPE_COLOR[t] }}
            />
            <span style={{ color: TYPE_COLOR[t] }}>{TYPE_ICON[t]}</span>
            <span>{TYPE_LABEL[t]}</span>
            {counts && <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{counts[t]}</span>}
          </label>
        ))}

        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          style={{ padding: "4px 8px", marginLeft: "auto", background: "var(--bg-elev)", color: "inherit", border: "1px solid var(--border-soft)", borderRadius: 4 }}
        >
          <option value={15}>15 por tipo</option>
          <option value={30}>30 por tipo</option>
          <option value={60}>60 por tipo</option>
          <option value={100}>100 por tipo</option>
        </select>
        <button onClick={load} className="btn ghost" disabled={loading} style={{ padding: "4px 10px" }}>
          {loading ? <><span className="spinner" /></> : "↻"}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div
        ref={wrapperRef}
        className="card"
        style={{
          padding: 0,
          height: "70vh",
          overflow: "hidden",
          background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.04), transparent 60%)",
          position: "relative",
        }}
      >
        <svg width={size.w} height={size.h} style={{ display: "block" }}>
          {/* Edges */}
          {visibleEdges.map((e, i) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const isActive = hoverId === e.from || hoverId === e.to;
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isActive ? "white" : "rgba(255,255,255,0.18)"}
                strokeWidth={isActive ? 1.5 : 0.8}
                style={{ transition: "stroke .15s" }}
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((n) => {
            const isHover = hoverId === n.id;
            const color = TYPE_COLOR[n.type];
            const r = isHover ? 16 : 11;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId((c) => (c === n.id ? null : c))}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={r}
                  fill={color}
                  fillOpacity={isHover ? 1 : 0.85}
                  stroke={isHover ? "white" : "rgba(255,255,255,0.25)"}
                  strokeWidth={isHover ? 2 : 1}
                  style={{ transition: "r .15s, fill-opacity .15s" }}
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize="10"
                  fill="white"
                  fontWeight="700"
                  pointerEvents="none"
                  style={{ userSelect: "none" }}
                >
                  {TYPE_ICON[n.type]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip / detalle */}
        {hoverId && (() => {
          const n = nodeById.get(hoverId);
          if (!n) return null;
          return (
            <div style={{
              position: "absolute",
              left: Math.min(size.w - 280, n.x + 20),
              top: Math.min(size.h - 140, n.y + 20),
              background: "rgba(0,0,0,0.85)",
              border: `1px solid ${TYPE_COLOR[n.type]}`,
              borderRadius: 6,
              padding: "10px 12px",
              maxWidth: 260,
              fontSize: 12,
              color: "white",
              pointerEvents: "auto",
              backdropFilter: "blur(4px)",
            }}>
              <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                <Badge variant="muted">{TYPE_LABEL[n.type]}</Badge>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{n.label}</div>
              {n.subtitle && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{n.subtitle}</div>}
              {n.href && (
                <Link href={n.href} style={{ display: "inline-block", marginTop: 6, color: TYPE_COLOR[n.type], textDecoration: "none", fontSize: 11 }}>
                  abrir →
                </Link>
              )}
            </div>
          );
        })()}

        {/* Stats overlay */}
        <div style={{
          position: "absolute", left: 10, bottom: 10,
          fontSize: 10.5, color: "var(--text-dim)",
          background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: 4,
        }}>
          {visibleNodes.length} nodos · {visibleEdges.length} conexiones · iter {iterations}
        </div>
      </div>
    </div>
  );
}
