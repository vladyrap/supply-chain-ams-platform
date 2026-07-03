"use client";

import { useEffect, useRef, useState } from "react";
import { fetchNotifications, type NotificationItem } from "@/services/dashboard.api";

const POLL_MS = 3000;

interface SysNode {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  color: string;
  group: "core" | "ai" | "data" | "ext";
}

interface SysEdge {
  from: string;
  to: string;
  // Quién activa este edge cuando hay un evento del tipo X
  activatedBy?: NotificationItem["kind"][];
}

// Layout fijo, optimizado para visualización. Coordenadas en viewBox 1000×620.
const NODES: SysNode[] = [
  // CORE
  { id: "user",      label: "Usuario",       icon: "👤", x:  60, y: 310, color: "#3b82f6", group: "core" },
  { id: "platform",  label: "Plataforma",    icon: "🖥",  x: 220, y: 310, color: "#3b82f6", group: "core" },
  { id: "backend",   label: "Backend API",   icon: "⚡", x: 400, y: 310, color: "#8b5cf6", group: "core" },
  { id: "worker",    label: "Worker (BullMQ)", icon: "🛠", x: 400, y: 510, color: "#8b5cf6", group: "core" },

  // AI
  { id: "agent",     label: "Agent AMS",     icon: "🤖", x: 600, y: 200, color: "#a855f7", group: "ai" },
  { id: "mesa",      label: "Mesa Soporte",  icon: "📞", x: 600, y: 310, color: "#a855f7", group: "ai" },
  { id: "rag",       label: "RAG pgvector",  icon: "🧠", x: 600, y: 410, color: "#06b6d4", group: "ai" },
  { id: "gemini",    label: "Gemini API",    icon: "✨", x: 820, y: 250, color: "#f1c21b", group: "ext" },
  { id: "whisper",   label: "Whisper",       icon: "🎙", x: 820, y: 510, color: "#06b6d4", group: "ai" },

  // DATA
  { id: "postgres",  label: "PostgreSQL",    icon: "🐘", x: 220, y: 510, color: "#10b981", group: "data" },
  { id: "redis",     label: "Redis",         icon: "📮", x: 220, y: 110, color: "#fa4d56", group: "data" },

  // EXT
  { id: "slack",     label: "Slack",         icon: "💬", x: 820, y: 100, color: "#a855f7", group: "ext" },
  { id: "email",     label: "Email",         icon: "📧", x: 820, y: 370, color: "#a855f7", group: "ext" },
  { id: "sap",       label: "SAP S/4 (RO)",  icon: "🏭", x: 820, y: 600, color: "#3b82f6", group: "ext" },
];

const EDGES: SysEdge[] = [
  { from: "user",      to: "platform" },
  { from: "platform",  to: "backend" },
  { from: "platform",  to: "redis" },
  { from: "backend",   to: "postgres" },
  { from: "backend",   to: "worker" },
  { from: "worker",    to: "redis" },
  { from: "worker",    to: "postgres" },
  { from: "backend",   to: "agent",  activatedBy: ["incident_created"] },
  { from: "backend",   to: "mesa",   activatedBy: ["ticket_escalated", "ticket_resolved"] },
  { from: "mesa",      to: "rag" },
  { from: "agent",     to: "rag" },
  { from: "agent",     to: "gemini", activatedBy: ["incident_created"] },
  { from: "mesa",      to: "gemini", activatedBy: ["ticket_escalated"] },
  { from: "rag",       to: "gemini" },
  { from: "worker",    to: "whisper", activatedBy: ["meeting_done"] },
  { from: "backend",   to: "slack",   activatedBy: ["ticket_escalated", "kb_approved"] },
  { from: "backend",   to: "email",   activatedBy: ["ticket_resolved", "kb_approved"] },
  { from: "agent",     to: "sap" },
  { from: "mesa",      to: "sap" },
];

// Mapping evento → cadena de nodos a recorrer con un pulso
const EVENT_PATHS: Record<NotificationItem["kind"], string[]> = {
  incident_created:  ["user", "platform", "backend", "agent", "gemini"],
  ticket_escalated:  ["user", "platform", "backend", "mesa", "gemini"],
  ticket_resolved:   ["mesa", "backend", "email"],
  kb_approved:       ["backend", "slack"],
  meeting_done:      ["worker", "whisper", "postgres"],
};

const EVENT_COLOR: Record<NotificationItem["kind"], string> = {
  incident_created:  "#3b82f6",
  ticket_escalated:  "#f59e0b",
  ticket_resolved:   "#10b981",
  kb_approved:       "#f1c21b",
  meeting_done:      "#a855f7",
};

interface Pulse {
  id: string;
  path: string[];
  color: string;
  step: number;     // 0..path.length-1
  progress: number; // 0..1 within current edge
  bornAt: number;
  label: string;
}

const nodeById = new Map(NODES.map((n) => [n.id, n]));

export default function TopologyPage() {
  const [events, setEvents] = useState<NotificationItem[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  // Polling notificaciones → detectar nuevas
  useEffect(() => {
    let alive = true;
    async function tick() {
      const r = await fetchNotifications();
      if (!alive) return;
      if (!r.ok) return;
      const items = r.items.slice(0, 20);
      setEvents(items);
      const newOnes: NotificationItem[] = [];
      for (const it of items) {
        if (!seenIds.current.has(it.id)) {
          seenIds.current.add(it.id);
          if (!firstLoadRef.current) newOnes.push(it);
        }
      }
      firstLoadRef.current = false;
      // Disparar pulsos por cada evento nuevo (escalonado para que no se solapen)
      newOnes.forEach((ev, i) => {
        setTimeout(() => emitPulse(ev), i * 250);
      });
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  function emitPulse(ev: NotificationItem) {
    const path = EVENT_PATHS[ev.kind];
    if (!path || path.length < 2) return;
    const id = `${ev.id}-${Date.now()}`;
    setPulses((p) => [...p, {
      id, path, color: EVENT_COLOR[ev.kind] ?? "#3b82f6",
      step: 0, progress: 0, bornAt: Date.now(),
      label: ev.title.slice(0, 40),
    }]);
  }

  // Anim loop: avanza pulsos
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const SPEED_PER_SEC = 1.2; // edges por segundo

    function step(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      setPulses((prev) => {
        const next: Pulse[] = [];
        const lightUp = new Set<string>();
        for (const p of prev) {
          let { step, progress } = p;
          progress += dt * SPEED_PER_SEC;
          while (progress >= 1 && step < p.path.length - 1) {
            progress -= 1;
            step++;
          }
          if (step >= p.path.length - 1 && progress >= 1) {
            // Llegó al final, lo descartamos
            continue;
          }
          lightUp.add(p.path[step]);
          lightUp.add(p.path[step + 1]);
          next.push({ ...p, step, progress });
        }
        setActiveNodes(lightUp);
        return next;
      });
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pulso de prueba (botón)
  function fakePulse() {
    const kinds: NotificationItem["kind"][] = [
      "incident_created", "ticket_escalated", "ticket_resolved", "kb_approved", "meeting_done",
    ];
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    emitPulse({
      id: `fake-${Date.now()}`, kind: k, title: `🧪 Test pulse: ${k}`, href: "#", createdAt: new Date().toISOString(),
    });
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>🌍 Live System Topology</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
            Cada nodo es un subsistema real. Cuando ocurre un evento (incident, ticket, KB, reunión), un pulso luminoso viaja por las conexiones implicadas. Polling cada {POLL_MS / 1000}s.
          </p>
        </div>
        <button onClick={fakePulse} className="btn ghost" style={{ padding: "4px 12px", fontSize: 12 }}>
          🧪 disparar pulso de prueba
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: 0,
          height: "72vh",
          overflow: "hidden",
          background: "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.06), rgba(0,0,0,0.4) 70%)",
          position: "relative",
        }}
      >
        <svg viewBox="0 0 1000 620" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            {NODES.map((n) => (
              <radialGradient key={`g-${n.id}`} id={`g-${n.id}`}>
                <stop offset="0%"  stopColor={n.color} stopOpacity="0.9" />
                <stop offset="80%" stopColor={n.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={n.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {/* Edges */}
          {EDGES.map((e, i) => {
            const a = nodeById.get(e.from); const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const active = activeNodes.has(a.id) && activeNodes.has(b.id);
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.13)"}
                strokeWidth={active ? 1.5 : 0.8}
                style={{ transition: "stroke .3s, stroke-width .3s" }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((n) => {
            const active = activeNodes.has(n.id);
            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                {/* halo */}
                {active && (
                  <circle r={40} fill={`url(#g-${n.id})`} style={{ animation: "halo 1.2s ease-out infinite" }} />
                )}
                {/* base */}
                <circle r={26} fill="rgba(0,0,0,0.7)" stroke={n.color} strokeWidth={active ? 2.5 : 1.5} style={{ transition: "stroke-width .3s" }} />
                <text textAnchor="middle" dy="6" fontSize="20" pointerEvents="none">{n.icon}</text>
                <text textAnchor="middle" y={45} fontSize="10" fill="white" fontWeight="500" pointerEvents="none">{n.label}</text>
              </g>
            );
          })}

          {/* Pulses */}
          {pulses.map((p) => {
            const a = nodeById.get(p.path[p.step]);
            const b = nodeById.get(p.path[p.step + 1]);
            if (!a || !b) return null;
            const x = a.x + (b.x - a.x) * p.progress;
            const y = a.y + (b.y - a.y) * p.progress;
            return (
              <g key={p.id}>
                <circle cx={x} cy={y} r={14} fill={p.color} fillOpacity={0.3} style={{ animation: "pulseGlow .8s ease-in-out infinite" }} />
                <circle cx={x} cy={y} r={6}  fill={p.color} style={{ filter: `drop-shadow(0 0 8px ${p.color})` }} />
              </g>
            );
          })}
        </svg>

        {/* Leyenda inferior */}
        <div style={{
          position: "absolute", bottom: 10, left: 10,
          display: "flex", gap: 10, fontSize: 10.5, color: "var(--text-dim)",
          background: "rgba(0,0,0,0.5)", padding: "6px 10px", borderRadius: 6,
        }}>
          {Object.entries(EVENT_COLOR).map(([k, c]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
              {k}
            </span>
          ))}
        </div>

        {/* Counter de pulsos activos */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          fontSize: 11, color: "var(--text-dim)",
          background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 4,
        }}>
          {events.length} eventos · {pulses.length} pulsos activos
        </div>
      </div>

      <style jsx>{`
        @keyframes halo {
          0%   { transform: scale(0.9); opacity: 0.8; }
          70%  { transform: scale(1.4); opacity: 0.2; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1);   opacity: 0.5; }
          50%      { transform: scale(1.4); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
