"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

type ThinkEvent =
  | { type: "start"; message: string; model: string }
  | { type: "thinking"; iteration: number }
  | { type: "text"; iteration: number; text: string }
  | { type: "tool_call_started"; iteration: number; name: string; args: Record<string, unknown> }
  | { type: "tool_call_done";    iteration: number; name: string; durationMs: number; resultPreview: string }
  | { type: "done"; text: string; iterations: number; toolCalls: number }
  | { type: "error"; message: string };

interface ThinkNode {
  id: string;
  kind: "user" | "thought" | "tool";
  label: string;
  subtitle?: string;
  iteration: number;
  status: "running" | "ok" | "error";
  x: number;
  y: number;
  bornAt: number;
}

interface ThinkEdge {
  from: string;
  to: string;
}

const TOOL_ICON: Record<string, string> = {
  sap_get_purchase_order:   "🛒",
  sap_list_purchase_orders: "📦",
  sap_get_sales_order:      "📋",
  sap_list_sales_orders:    "📚",
  sap_get_material:         "🔩",
  sap_list_materials:       "🗃",
  sap_list_stock_movements: "📈",
  kb_search:                "📘",
  rag_search:               "🔎",
};

const SAMPLES = [
  "Tengo el material MAT-5500. Dime su stock actual y los últimos movimientos.",
  "Lista las OCs abiertas del centro 1100 y dame detalle de la más urgente.",
  "Busca en la base de conocimiento cómo extender un material a un centro nuevo.",
];

export default function AgentThinkPage() {
  const { client, environment } = usePlatform();
  const { user } = useAuth();
  const [message, setMessage] = useState(SAMPLES[0]);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<ThinkEvent[]>([]);
  const [nodes, setNodes] = useState<ThinkNode[]>([]);
  const [edges, setEdges] = useState<ThinkEdge[]>([]);
  const [finalText, setFinalText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function reset() {
    setEvents([]);
    setNodes([]);
    setEdges([]);
    setFinalText("");
    setError(null);
  }

  function placeNode(kind: ThinkNode["kind"], iteration: number, existingCount: number): { x: number; y: number } {
    // Layout: iteración → fila. Dentro de fila, columnas.
    const rowY = 80 + iteration * 140;
    const colX = 80 + (existingCount % 5) * 170;
    if (kind === "user") return { x: 80, y: 30 };
    return { x: colX, y: rowY };
  }

  async function run() {
    if (running) return;
    if (!message.trim()) return;
    reset();
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/ams/research/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          message: message.trim(),
          user: user?.name || "Demo",
          module: "NO_INFORMADO",
          client: client.trim() || "NO_INFORMADO",
          environment,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(`HTTP ${res.status}`);
        setRunning(false);
        return;
      }

      // El primer nodo es la pregunta del usuario
      const userId = "u-0";
      setNodes((n) => [...n, {
        id: userId, kind: "user",
        label: "🗣 Pregunta", subtitle: message.slice(0, 60),
        iteration: 0, status: "ok",
        x: 80, y: 30, bornAt: Date.now(),
      }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const json = dataLine.slice(6).trim();
          if (!json) continue;
          let ev: ThinkEvent;
          try { ev = JSON.parse(json) as ThinkEvent; } catch { continue; }
          setEvents((prev) => [...prev, ev]);

          if (ev.type === "thinking") {
            setNodes((cur) => {
              const id = `t-${ev.iteration}`;
              if (cur.find((n) => n.id === id)) return cur;
              const newNode: ThinkNode = {
                id, kind: "thought",
                label: `🧠 Razonando…`,
                subtitle: `iter ${ev.iteration}`,
                iteration: ev.iteration,
                status: "running",
                ...placeNode("thought", ev.iteration, 0),
                bornAt: Date.now(),
              };
              setEdges((e) => [...e, { from: ev.iteration === 1 ? userId : `t-${ev.iteration - 1}`, to: id }]);
              return [...cur, newNode];
            });
          } else if (ev.type === "text") {
            setNodes((cur) => cur.map((n) =>
              n.id === `t-${ev.iteration}`
                ? { ...n, status: "ok", label: "💭 Pensó", subtitle: ev.text.slice(0, 80) }
                : n
            ));
          } else if (ev.type === "tool_call_started") {
            setNodes((cur) => {
              const sameIterTools = cur.filter((n) => n.iteration === ev.iteration && n.kind === "tool").length;
              const pos = placeNode("tool", ev.iteration, sameIterTools);
              const id = `${ev.name}-${ev.iteration}-${sameIterTools}`;
              const newNode: ThinkNode = {
                id, kind: "tool",
                label: `${TOOL_ICON[ev.name] ?? "🔧"} ${ev.name}`,
                subtitle: Object.keys(ev.args).slice(0, 3).map((k) => `${k}=${String(ev.args[k]).slice(0, 12)}`).join(", "),
                iteration: ev.iteration,
                status: "running",
                x: pos.x, y: pos.y + 50,
                bornAt: Date.now(),
              };
              setEdges((e) => [...e, { from: `t-${ev.iteration}`, to: id }]);
              return [...cur, newNode];
            });
          } else if (ev.type === "tool_call_done") {
            setNodes((cur) => cur.map((n) => {
              if (n.kind === "tool" && n.iteration === ev.iteration && n.label.includes(ev.name) && n.status === "running") {
                return { ...n, status: "ok", subtitle: `${ev.durationMs}ms · ${ev.resultPreview.slice(0, 50)}` };
              }
              return n;
            }));
          } else if (ev.type === "done") {
            setFinalText(ev.text);
            setRunning(false);
          } else if (ev.type === "error") {
            setError(ev.message);
            setRunning(false);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  // Auto-scroll del visualizador hacia el último nodo
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (svgWrapperRef.current) {
      svgWrapperRef.current.scrollTo({ top: svgWrapperRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [nodes]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const maxY = Math.max(400, ...nodes.map((n) => n.y + 120));

  return (
    <div>
      <div className="page-title">
        <h1>🧠 Visualizador — el agente pensando</h1>
        <p>Mira en vivo cómo el agente AMS razona en modo investigación: cada iteración, cada tool que llama, cada resultado. Conexiones aparecen mientras piensa.</p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => setMessage(s)} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>
              ejemplo {i + 1}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={running}
          placeholder="Pregunta para el agente AMS (modo research + tool-use)"
          style={{ width: "100%", minHeight: 70, fontSize: 13 }}
        />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {!running ? (
            <button className="btn primary" onClick={run} disabled={!message.trim()}>
              ▶ Pensar en vivo
            </button>
          ) : (
            <button className="btn" onClick={cancel}>⏹ cancelar</button>
          )}
          {error && <span className="alert error" style={{ fontSize: 12 }}>{error}</span>}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
            {events.length} eventos · {nodes.length} nodos
          </span>
        </div>
      </div>

      {/* Visualizador */}
      <div
        ref={svgWrapperRef}
        className="card"
        style={{
          padding: 0,
          height: "55vh",
          overflow: "auto",
          background: "radial-gradient(circle at 50% 30%, rgba(168,85,247,0.05), transparent 60%)",
        }}
      >
        <svg width="100%" height={maxY} style={{ display: "block", minWidth: 900 }}>
          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodeMap.get(e.from);
            const b = nodeMap.get(e.to);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x + 50} y1={a.y + 25} x2={b.x + 50} y2={b.y + 5}
                stroke="rgba(168,85,247,0.4)"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                style={{ animation: "dashFlow 1s linear infinite" }}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((n) => {
            const color =
              n.kind === "user"   ? "#3b82f6" :
              n.kind === "thought" ? "#a855f7" : "#06b6d4";
            const pulsing = n.status === "running";
            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`} style={{ animation: "popIn .35s ease-out" }}>
                <rect
                  width={210} height={50} rx={8}
                  fill="rgba(0,0,0,0.5)"
                  stroke={color}
                  strokeWidth={pulsing ? 2.5 : 1.2}
                  style={{
                    filter: pulsing ? `drop-shadow(0 0 12px ${color})` : "none",
                    transition: "stroke-width .2s, filter .2s",
                  }}
                />
                {pulsing && (
                  <rect
                    width={210} height={50} rx={8}
                    fill="none" stroke={color} strokeWidth={1}
                    style={{ animation: "pulseRing 1.2s ease-out infinite", transformOrigin: "105px 25px" }}
                  />
                )}
                <text x="10" y="20" fill="white" fontSize="12" fontWeight="600">{n.label}</text>
                {n.subtitle && <text x="10" y="38" fill="rgba(255,255,255,0.6)" fontSize="10">{n.subtitle.slice(0, 38)}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Respuesta final */}
      {finalText && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>🤖 Respuesta final del agente</h3>
            <Badge variant="ok">done</Badge>
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--text-soft)" }}>{finalText}</div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Link href="/agent" style={{ fontSize: 12, color: "var(--text-dim)" }}>← volver al agente</Link>
      </div>

      <style jsx>{`
        @keyframes popIn {
          0%   { opacity: 0; transform: translate(${0}px, -10px) scale(0.85); }
          100% { opacity: 1; transform: translate(0, 0) scale(1); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes dashFlow {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -12; }
        }
      `}</style>
    </div>
  );
}
