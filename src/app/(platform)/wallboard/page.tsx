"use client";

import ClientOnly from "@/components/common/ClientOnly";

import { useEffect, useRef, useState } from "react";
import { useEventSounds } from "@/hooks/useEventSounds";

const QUADS = [
  { id: "war-room", icon: "🌐", label: "WAR ROOM",    href: "/war-room",    color: "#3b82f6" },
  { id: "brain",    icon: "🧠", label: "AGENT BRAIN", href: "/brain",       color: "#a855f7" },
  { id: "terminal", icon: "📟", label: "TERMINAL",    href: "/terminal",    color: "#f1c21b" },
  { id: "hud",      icon: "⚛",  label: "ARC REACTOR", href: "/hud",         color: "#4589ff" },
];

export default function WallboardPage() {
  return (
    <ClientOnly fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Cargando visualizacion...</div>}>
      <WallboardPageInner />
    </ClientOnly>
  );
}

function WallboardPageInner() {
  const [focused, setFocused] = useState<string | null>(null);
  const [autoFocus, setAutoFocus] = useState(false);
  const [now, setNow] = useState(new Date());
  const { muted, toggleMute } = useEventSounds();
  const focusIdx = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-focus rota foco cada 25s
  useEffect(() => {
    if (!autoFocus) return;
    const t = setInterval(() => {
      focusIdx.current = (focusIdx.current + 1) % (QUADS.length + 1);
      setFocused(focusIdx.current === QUADS.length ? null : QUADS[focusIdx.current].id);
    }, 25000);
    return () => clearInterval(t);
  }, [autoFocus]);

  return (
    <div className="wb-root">
      {/* Header overlay */}
      <div className="wb-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 18, letterSpacing: 3, color: "#4589ff", textShadow: "0 0 10px rgba(69,137,255,0.6)" }}>◤ AMS WALLBOARD · QUAD-VIEW ◢</h1>
          <div style={{ fontSize: 9.5, letterSpacing: 2, color: "#94a3b8" }}>SUPPLY-CHAIN · SAP · 4K WALLBOARD MODE</div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {QUADS.map((q) => (
            <button key={q.id} className="wb-focus-btn" onClick={() => setFocused(focused === q.id ? null : q.id)}
              style={{ borderColor: focused === q.id ? q.color : "rgba(69,137,255,0.3)", color: focused === q.id ? q.color : "#94a3b8" }}>
              {q.icon} {q.label}
            </button>
          ))}
          <button className="wb-focus-btn" onClick={() => { setFocused(null); setAutoFocus(!autoFocus); }}
            style={{ borderColor: autoFocus ? "#10b981" : "rgba(69,137,255,0.3)", color: autoFocus ? "#10b981" : "#94a3b8" }}>
            {autoFocus ? "● AUTO ON" : "○ AUTO"}
          </button>
          <button className="wb-focus-btn" onClick={toggleMute} style={{ borderColor: "rgba(69,137,255,0.3)", color: "#94a3b8" }}>
            {muted ? "🔇" : "🔊"}
          </button>
          <div style={{ color: "#4589ff", fontFamily: "var(--font-mono, monospace)", fontSize: 16, letterSpacing: 2, padding: "0 8px" }}>
            {now.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Grid 2x2 */}
      <div className={`wb-grid ${focused ? "focused" : ""}`}>
        {QUADS.map((q) => (
          <div key={q.id} className={`wb-quad ${focused === q.id ? "is-focused" : focused ? "is-blurred" : ""}`}
            style={{ ["--quad-color" as never]: q.color }}>
            <div className="wb-quad-label">
              <span style={{ color: q.color, textShadow: `0 0 6px ${q.color}` }}>{q.icon} {q.label}</span>
            </div>
            <div className="wb-quad-frame">
              <iframe src={`${q.href}?wallboard=1`} className="wb-iframe" />
            </div>
          </div>
        ))}
      </div>

      <div className="wb-footer">
        <span style={{ color: "#10b981", fontWeight: 700 }}>● LIVE</span>
        <span style={{ marginLeft: 12, color: "#94a3b8" }}>4 wallboard panels · todos consumen /api/dashboard/* en vivo</span>
        <span style={{ marginLeft: "auto", color: "#67e8f9", letterSpacing: 2 }}>F11 para fullscreen · click en un panel para focus</span>
      </div>

      <style jsx global>{`
        .wb-root {
          min-height: calc(100vh - 80px);
          background: #04060f;
          color: #cbd5e1;
          padding: 8px;
          display: flex; flex-direction: column;
        }
        .wb-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 12px; margin-bottom: 6px;
          background: linear-gradient(90deg, rgba(69,137,255,0.05), transparent);
          border: 1px solid rgba(69,137,255,0.25);
          border-radius: 4px;
        }
        .wb-focus-btn {
          padding: 4px 10px;
          font-size: 10px;
          background: rgba(15,23,42,0.7);
          border: 1px solid;
          border-radius: 3px;
          cursor: pointer;
          letter-spacing: 1.5px;
          font-family: var(--font-mono, monospace);
          transition: all .15s;
        }
        .wb-focus-btn:hover { background: rgba(69,137,255,0.10); }
        .wb-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 6px;
          min-height: 0;
        }
        .wb-quad {
          position: relative;
          border: 1px solid var(--quad-color);
          border-radius: 4px;
          overflow: hidden;
          background: #04060f;
          transition: all 0.4s ease;
        }
        .wb-quad.is-focused {
          grid-column: 1 / 3;
          grid-row: 1 / 3;
          box-shadow: 0 0 30px var(--quad-color), inset 0 0 20px rgba(255,255,255,0.02);
        }
        .wb-quad.is-blurred {
          opacity: 0.18;
          filter: blur(2px);
        }
        .wb-quad-label {
          position: absolute; top: 6px; left: 8px; z-index: 2;
          font-family: var(--font-mono, monospace);
          font-size: 10px; letter-spacing: 2.5px;
          background: rgba(0,0,0,0.7);
          padding: 4px 8px; border-radius: 3px;
          border: 1px solid var(--quad-color);
        }
        .wb-quad-frame {
          width: 100%; height: 100%;
          overflow: hidden;
          position: relative;
        }
        .wb-iframe {
          width: 200%; height: 200%;
          border: 0;
          transform: scale(0.5);
          transform-origin: 0 0;
          background: transparent;
        }
        .wb-quad.is-focused .wb-iframe {
          width: 142.85%; height: 142.85%;
          transform: scale(0.7);
        }
        .wb-footer {
          display: flex; align-items: center;
          padding: 4px 12px; margin-top: 6px;
          background: rgba(15,23,42,0.4);
          border: 1px solid rgba(69,137,255,0.15);
          border-radius: 3px;
          font-size: 10px;
          font-family: var(--font-mono, monospace);
        }
      `}</style>
    </div>
  );
}
