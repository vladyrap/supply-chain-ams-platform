"use client";

import { useEffect, useRef, useState } from "react";
import { fetchNotifications, type NotificationItem } from "@/services/dashboard.api";
import { useEventSounds } from "@/hooks/useEventSounds";

const POLL_MS = 3000;

interface Lane {
  id: string;
  label: string;
  color: string;        // CSS color
  rgb: [number, number, number]; // para canvas
  kinds: NotificationItem["kind"][];
}

const LANES: Lane[] = [
  { id: "resolved",  label: "RESOLVED",  color: "#10b981", rgb: [16, 185, 129],  kinds: ["ticket_resolved", "kb_approved"] },
  { id: "escalated", label: "ESCALATED", color: "#fa4d56", rgb: [250,77,86],   kinds: ["ticket_escalated", "incident_created"] },
  { id: "info",      label: "INFO·KB",   color: "#f1c21b", rgb: [241,194,27],  kinds: ["meeting_done"] },
];

interface Particle {
  laneIdx: number;
  x: number;
  y: number;
  vx: number;
  size: number;
  life: number;  // 0..1
  hue: number;   // shift dentro del color del lane
  trail: { x: number; y: number; alpha: number }[];
}

export default function FlowPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<{
    particles: Particle[];
    laneCounts: number[];
    laneEmission: number[]; // partículas por segundo pendientes de emitir
    seen: Set<string>;
    width: number;
    height: number;
    lastFrame: number;
    firstLoad: boolean;
  }>({ particles: [], laneCounts: [0, 0, 0], laneEmission: [0, 0, 0], seen: new Set(), width: 0, height: 0, lastFrame: 0, firstLoad: true });

  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [counters, setCounters] = useState({ total: 0, perLane: [0, 0, 0] });
  const [hoveredLane, setHoveredLane] = useState<number | null>(null);
  const [rpm, setRpm] = useState(0);
  const rpmWindow = useRef<number[]>([]);
  const { muted, toggleMute } = useEventSounds();

  // Polling notifications → emitir partículas según kind
  useEffect(() => {
    let alive = true;
    async function tick() {
      const r = await fetchNotifications();
      if (!alive || !r.ok) return;
      setFeed(r.items.slice(0, 12));
      for (const it of r.items) {
        if (stateRef.current.seen.has(it.id)) continue;
        stateRef.current.seen.add(it.id);
        if (stateRef.current.firstLoad) continue;
        const laneIdx = LANES.findIndex((l) => l.kinds.includes(it.kind));
        if (laneIdx < 0) continue;
        // Cantidad de partículas a emitir según tipo
        stateRef.current.laneEmission[laneIdx] += 12 + Math.floor(Math.random() * 6);
        stateRef.current.laneCounts[laneIdx]++;
        rpmWindow.current.push(Date.now());
      }
      stateRef.current.firstLoad = false;
      setCounters((c) => ({ total: c.total, perLane: [...stateRef.current.laneCounts] }));
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // RPM: ventana 60s
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 60_000;
      rpmWindow.current = rpmWindow.current.filter((x) => x > cutoff);
      setRpm(rpmWindow.current.length);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-emisión "idle": para que siempre haya algo de flow incluso sin eventos nuevos
  useEffect(() => {
    const t = setInterval(() => {
      // distribuir 3 partículas aleatorias entre lanes ponderado a resolved (verde)
      const which = Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 2 : 1;
      stateRef.current.laneEmission[which] += 1;
    }, 600);
    return () => clearInterval(t);
  }, []);

  // Canvas init + render loop
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d", { alpha: true }); if (!ctx) return;

    function resize() {
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = c.clientWidth, h = c.clientHeight;
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.width = w;
      stateRef.current.height = h;
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    function frame(now: number) {
      if (!ctx) return;
      const s = stateRef.current;
      const dt = s.lastFrame === 0 ? 0.016 : Math.min(0.05, (now - s.lastFrame) / 1000);
      s.lastFrame = now;

      // emitir partículas pendientes (a tasa razonable)
      for (let li = 0; li < LANES.length; li++) {
        const pendingPerSec = s.laneEmission[li];
        const toEmit = Math.min(pendingPerSec, Math.ceil(pendingPerSec * dt * 6));
        for (let i = 0; i < toEmit; i++) {
          const laneH = s.height / LANES.length;
          const cy = laneH * (li + 0.5);
          const jitter = (Math.random() - 0.5) * laneH * 0.7;
          s.particles.push({
            laneIdx: li,
            x: -10,
            y: cy + jitter,
            vx: 70 + Math.random() * 90, // px/s
            size: 1.5 + Math.random() * 3.5,
            life: 1,
            hue: Math.random() * 0.2 - 0.1,
            trail: [],
          });
        }
        s.laneEmission[li] = Math.max(0, pendingPerSec - toEmit);
      }

      // pintar fondo (trail effect)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(4, 6, 15, 0.18)";
      ctx.fillRect(0, 0, s.width, s.height);

      // dibujar lanes (líneas separadoras)
      const laneH = s.height / LANES.length;
      for (let i = 0; i < LANES.length; i++) {
        const y = laneH * (i + 1);
        const lane = LANES[i];
        const isHover = hoveredLane === i;
        const dimmed = hoveredLane !== null && !isHover;
        const alpha = dimmed ? 0.04 : isHover ? 0.20 : 0.10;
        ctx.strokeStyle = `rgba(${lane.rgb[0]}, ${lane.rgb[1]}, ${lane.rgb[2]}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(s.width, y);
        ctx.stroke();

        // label de la lane (esquina izquierda)
        ctx.font = "10px 'Consolas', monospace";
        ctx.fillStyle = `rgba(${lane.rgb[0]}, ${lane.rgb[1]}, ${lane.rgb[2]}, ${dimmed ? 0.35 : 0.85})`;
        ctx.fillText(`▸ ${lane.label}`, 12, laneH * i + 16);
      }

      // dibujar partículas
      ctx.globalCompositeOperation = "lighter";
      const survivors: Particle[] = [];
      for (const p of s.particles) {
        p.x += p.vx * dt;
        if (p.x > s.width + 20) continue;
        p.life -= dt * 0.20; // viven ~5s (pero suelen salir antes)
        if (p.life < 0) continue;

        const lane = LANES[p.laneIdx];
        const dimmed = hoveredLane !== null && hoveredLane !== p.laneIdx;
        const a = (dimmed ? 0.15 : 1) * p.life;

        // Trail
        p.trail.push({ x: p.x, y: p.y, alpha: a });
        if (p.trail.length > 6) p.trail.shift();
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const ta = (i / p.trail.length) * a * 0.4;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${lane.rgb[0]}, ${lane.rgb[1]}, ${lane.rgb[2]}, ${ta})`;
          ctx.arc(t.x, t.y, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Núcleo
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0,  `rgba(${lane.rgb[0]}, ${lane.rgb[1]}, ${lane.rgb[2]}, ${a})`);
        grad.addColorStop(1,  `rgba(${lane.rgb[0]}, ${lane.rgb[1]}, ${lane.rgb[2]}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.9})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();

        survivors.push(p);
      }
      s.particles = survivors;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [hoveredLane]);

  return (
    <div style={{
      minHeight: "calc(100vh - 80px)",
      background: "#04060f",
      color: "#cbd5e1",
      padding: "8px 6px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div className="row between" style={{ marginBottom: 10, padding: "0 6px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 2 }}>
            🌊 AMS DATA FLOW <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>· río de eventos en vivo</span>
          </h1>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            cada partícula = un evento real · {rpm} eventos/min · hover sobre un carril para aislarlo
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button onClick={toggleMute} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>{muted ? "🔇" : "🔊"}</button>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
            <div style={{ fontSize: 22, color: "#10b981", textShadow: "0 0 10px rgba(16,185,129,0.6)", letterSpacing: 2 }}>{rpm} <span style={{ fontSize: 10, color: "#64748b" }}>EV/MIN</span></div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{now.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 10 }}>
        {/* Canvas */}
        <div style={{
          position: "relative",
          height: "70vh",
          minHeight: 460,
          borderRadius: 10,
          overflow: "hidden",
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(16,185,129,0.25)",
        }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Hover hit areas (3 zonas horizontales) */}
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: "1fr 1fr 1fr" }}>
            {LANES.map((lane, i) => (
              <div key={lane.id}
                onMouseEnter={() => setHoveredLane(i)}
                onMouseLeave={() => setHoveredLane(null)}
                style={{ borderBottom: i < LANES.length - 1 ? `1px dashed ${lane.color}22` : "none", cursor: "crosshair" }}
              />
            ))}
          </div>

          <div className="tracking-corner tl" />
          <div className="tracking-corner tr" />
          <div className="tracking-corner bl" />
          <div className="tracking-corner br" />
        </div>

        {/* Side counters + feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LANES.map((lane, i) => (
            <div key={lane.id}
              onMouseEnter={() => setHoveredLane(i)}
              onMouseLeave={() => setHoveredLane(null)}
              style={{
                padding: "10px 12px",
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${lane.color}55`,
                borderLeft: `4px solid ${lane.color}`,
                borderRadius: 4,
                cursor: "default",
                transition: "transform .15s, box-shadow .15s",
                transform: hoveredLane === i ? "translateX(-4px)" : "translateX(0)",
                boxShadow: hoveredLane === i ? `0 0 24px ${lane.color}55` : "none",
              }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: lane.color }}>{lane.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: lane.color, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${lane.color}66`, lineHeight: 1.1 }}>
                {counters.perLane[i]}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>
                events · {lane.kinds.join(" · ")}
              </div>
            </div>
          ))}

          <div className="card flat" style={{ padding: 12, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(168,85,247,0.3)", flex: 1, maxHeight: 240, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10, color: "#c084fc", letterSpacing: 1.5, marginBottom: 6 }}>▼ STREAM · TAIL</div>
            <div style={{ flex: 1, overflowY: "auto", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              {feed.length === 0 && <div style={{ color: "#64748b" }}>(idle)</div>}
              {feed.map((f) => {
                const lane = LANES.find((l) => l.kinds.includes(f.kind));
                return (
                  <div key={f.id} style={{
                    padding: "3px 6px", marginBottom: 3,
                    background: "rgba(255,255,255,0.02)",
                    borderLeft: `2px solid ${lane?.color ?? "#94a3b8"}`,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    <span style={{ color: "#64748b" }}>{new Date(f.createdAt).toLocaleTimeString().slice(0,8)}</span>{" "}
                    <span style={{ color: lane?.color ?? "#cbd5e1" }}>{f.title.slice(0, 28)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .tracking-corner {
          position: absolute; width: 22px; height: 22px;
          border: 2px solid rgba(16,185,129,0.55); pointer-events: none; z-index: 2;
        }
        .tracking-corner.tl { top: 4px;    left: 4px;    border-right: 0; border-bottom: 0; }
        .tracking-corner.tr { top: 4px;    right: 4px;   border-left:  0; border-bottom: 0; }
        .tracking-corner.bl { bottom: 4px; left: 4px;    border-right: 0; border-top:    0; }
        .tracking-corner.br { bottom: 4px; right: 4px;   border-left:  0; border-top:    0; }
      `}</style>
    </div>
  );
}
