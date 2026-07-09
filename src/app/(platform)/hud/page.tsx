"use client";

import ClientOnly from "@/components/common/ClientOnly";

import { useEffect, useMemo, useState } from "react";
import { fetchAdvanced, fetchExecutive, fetchUsage, fetchNotifications,
  type DashboardAdvanced, type DashboardExecutive, type UsageSummary, type NotificationItem } from "@/services/dashboard.api";

const POLL_MS = 5000;

function ArcGauge({ pct, color, size = 80, stroke = 6, label }: { pct: number; color: string; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - Math.max(0, Math.min(100, pct)) / 100 * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset .8s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size * 0.28, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 8px ${color}66` }}>{Math.round(pct)}</div>
        {label && <div style={{ fontSize: 8, color: "#94a3b8", letterSpacing: 1.5, marginTop: 2 }}>{label}</div>}
      </div>
    </div>
  );
}

function HoloPanel({ children, accent = "#06b6d4", style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div className="holo-panel" style={{ ["--acc" as never]: accent, ...style }}>
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      {children}
    </div>
  );
}

function StatLine({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="row between" style={{ fontSize: 11.5, padding: "3px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" }}>
      <span style={{ color: "#94a3b8", letterSpacing: 1 }}>{label}</span>
      <span style={{ color: accent, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export default function HudPage() {
  return (
    <ClientOnly fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Cargando visualizacion...</div>}>
      <HudPageInner />
    </ClientOnly>
  );
}

function HudPageInner() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, e, u, n] = await Promise.all([fetchAdvanced(), fetchExecutive(30), fetchUsage(30), fetchNotifications()]);
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Particle field deterministic, generamos coords una vez
  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: (i * 173) % 100,
    top:  (i * 97)  % 100,
    delay: (i * 0.13) % 8,
    size: (i % 3) + 1.5,
  })), []);

  const sla = adv?.sla.okPct ?? 0;
  const aiRate = exec?.kpis.aiResolutionRate ?? 0;
  const totalTok = usage?.totals.totalTokens ?? 0;
  const cost = usage?.totals.costUsd ?? 0;
  const interactions = exec?.kpis.totalInteractions ?? 0;
  const tickets = adv?.totals.supportTicketsActive ?? 0;
  const breach = adv?.sla.breaching ?? 0;

  return (
    <div className="hud-root">
      {/* Particle field */}
      <div className="particles">
        {particles.map((p) => (
          <span key={p.id} className="particle"
            style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s`, width: p.size, height: p.size }} />
        ))}
      </div>

      {/* Scanlines + grid */}
      <div className="scanlines" />
      <div className="hex-grid" />

      {/* Header */}
      <div className="hud-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 4, color: "#4589ff", textShadow: "0 0 10px rgba(69,137,255,0.6)" }}>◤ ARC REACTOR OPS ◢</h1>
          <div style={{ fontSize: 10, color: "#67e8f9", letterSpacing: 3, marginTop: 4 }}>S.H.I.E.L.D · AMS SUPPLY-CHAIN DEFENSIVE GRID</div>
        </div>
        <div style={{ textAlign: "right", color: "#67e8f9", fontFamily: "var(--font-mono, monospace)" }}>
          <div style={{ fontSize: 22, letterSpacing: 3, textShadow: "0 0 8px rgba(69,137,255,0.5)" }}>{now.toLocaleTimeString()}</div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#0891b2" }}>SYS·ONLINE · OPS·NOMINAL</div>
        </div>
      </div>

      {/* Center reactor + rings */}
      <div className="reactor-stage">
        <div className="reactor-rings">
          <div className="ring r1" />
          <div className="ring r2" />
          <div className="ring r3" />
          <div className="ring r4" />

          <div className="reactor-core">
            <div style={{ fontSize: 78, fontWeight: 700, color: "#4589ff", lineHeight: 1, textShadow: "0 0 24px rgba(69,137,255,0.9)" }}>
              {Math.round(sla)}<span style={{ fontSize: 28, opacity: 0.6 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: "#67e8f9", letterSpacing: 4, marginTop: 4 }}>SLA · COMPLIANCE</div>
            <div style={{ fontSize: 10, color: "#0891b2", marginTop: 14, letterSpacing: 2 }}>
              {adv?.sla.inSla ?? 0} OK · {breach} BREACH
            </div>
          </div>
        </div>

        {/* Quadrant panels */}
        <HoloPanel accent="#4589ff" style={{ position: "absolute", top: 30, left: 30, width: 220 }}>
          <div className="panel-title">◤ AGENT·CORE</div>
          <div className="panel-body">
            <StatLine label="INTERACTIONS"  value={interactions.toLocaleString("es-CL")} accent="#4589ff" />
            <StatLine label="AI·RESOLVED %" value={`${Math.round(aiRate)}%`} accent="#10b981" />
            <StatLine label="TOKENS"        value={`${(totalTok / 1000).toFixed(1)}k`} accent="#f1c21b" />
            <StatLine label="COSTO USD"     value={`$${cost.toFixed(2)}`} accent="#fa4d56" />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <ArcGauge pct={aiRate} color="#4589ff" label="AI·RES" />
          </div>
        </HoloPanel>

        <HoloPanel accent="#a855f7" style={{ position: "absolute", top: 30, right: 30, width: 220 }}>
          <div className="panel-title">◥ SUPPORT·DESK</div>
          <div className="panel-body">
            <StatLine label="TICKETS·ACTIVE" value={tickets} accent="#f1c21b" />
            <StatLine label="CONV·OPEN"      value={adv?.totals.supportConversationsOpen ?? 0} accent="#a855f7" />
            <StatLine label="CONV·TOT"       value={adv?.totals.supportConversations ?? 0} accent="#a855f7" />
            <StatLine label="SLA·BREACH"     value={breach} accent={breach ? "#fa4d56" : "#6b7280"} />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <ArcGauge pct={breach === 0 ? 100 : Math.max(0, 100 - breach * 10)} color="#a855f7" label="HEALTH" />
          </div>
        </HoloPanel>

        <HoloPanel accent="#10b981" style={{ position: "absolute", bottom: 30, left: 30, width: 220 }}>
          <div className="panel-title">◣ INCIDENTS</div>
          <div className="panel-body">
            <StatLine label="TODAY"           value={adv?.totals.incidentsToday ?? 0} accent="#10b981" />
            <StatLine label="LAST·7D"         value={adv?.totals.incidentsLast7d ?? 0} accent="#10b981" />
            <StatLine label="TOTAL"           value={adv?.totals.incidents ?? 0} accent="#10b981" />
            <StatLine label="W·ATTACHMENTS"   value={adv?.totals.incidentsWithAttachments ?? 0} accent="#06b6d4" />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <ArcGauge pct={Math.min(100, (adv?.totals.incidentsToday ?? 0) * 5)} color="#10b981" label="LOAD" />
          </div>
        </HoloPanel>

        <HoloPanel accent="#f1c21b" style={{ position: "absolute", bottom: 30, right: 30, width: 220 }}>
          <div className="panel-title">◢ KB·KNOWLEDGE</div>
          <div className="panel-body">
            <StatLine label="ARTICLES"     value={adv?.totals.kbApproved ?? 0} accent="#f1c21b" />
            <StatLine label="MEETINGS·DONE" value={adv?.totals.meetingsDone ?? 0} accent="#a855f7" />
            <StatLine label="AVG·RESP·MIN"  value={Math.round(exec?.kpis.avgResponseTimeMin ?? 0)} accent="#06b6d4" />
            <StatLine label="COST/IxN"     value={`$${(exec?.kpis.costPerInteractionUsd ?? 0).toFixed(4)}`} accent="#fa4d56" />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <ArcGauge pct={Math.min(100, (adv?.totals.kbApproved ?? 0))} color="#f1c21b" label="KB" />
          </div>
        </HoloPanel>
      </div>

      {/* Bottom strip event feed */}
      <HoloPanel accent="#4589ff" style={{ margin: "0 30px 18px" }}>
        <div className="panel-title">◤ LIVE·THREAT·FEED ◢</div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 0", fontFamily: "var(--font-mono, monospace)" }}>
          {feed.length === 0 && <span style={{ color: "#64748b", fontSize: 11 }}>(no events)</span>}
          {feed.map((f) => (
            <div key={f.id} style={{ minWidth: 220, padding: "6px 10px", border: "1px solid rgba(69,137,255,0.25)", background: "rgba(69,137,255,0.04)", borderRadius: 4, fontSize: 11 }}>
              <div style={{ color: "#0891b2", fontSize: 9, letterSpacing: 1.5 }}>{new Date(f.createdAt).toLocaleTimeString()} · {f.kind.toUpperCase()}</div>
              <div style={{ color: "#cbd5e1", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</div>
            </div>
          ))}
        </div>
      </HoloPanel>

      <style jsx global>{`
        .hud-root {
          min-height: calc(100vh - 80px);
          background:
            radial-gradient(circle at 50% 50%, rgba(69,137,255,0.10) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(168,85,247,0.06) 0%, transparent 50%),
            #04060f;
          color: #67e8f9;
          font-family: var(--font-mono, "Consolas", monospace);
          position: relative; overflow: hidden;
          padding: 16px 18px;
        }
        .hud-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 10px;
          border-top: 1px solid rgba(69,137,255,0.4);
          border-bottom: 1px solid rgba(69,137,255,0.4);
          margin-bottom: 22px;
          background: linear-gradient(90deg, rgba(69,137,255,0.06), transparent 30%, transparent 70%, rgba(168,85,247,0.06));
          position: relative; z-index: 2;
        }
        .reactor-stage {
          position: relative;
          min-height: 540px;
          margin-bottom: 16px;
        }
        .reactor-rings {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 420px; height: 420px;
        }
        .ring {
          position: absolute; inset: 0;
          border: 1px solid rgba(69,137,255,0.35);
          border-radius: 50%;
          border-style: dashed;
        }
        .ring.r1 { inset: 0;   animation: spin 24s linear infinite; border-style: dashed; border-width: 1px; border-color: rgba(69,137,255,0.45); }
        .ring.r2 { inset: 30px; animation: spin 18s linear infinite reverse; border-style: dotted; border-color: rgba(168,85,247,0.35); }
        .ring.r3 { inset: 60px; animation: spin 14s linear infinite; border-style: dashed; border-color: rgba(69,137,255,0.55); }
        .ring.r4 { inset: 95px; animation: spin 9s  linear infinite reverse; border-style: solid; border-color: rgba(69,137,255,0.25); }
        .reactor-core {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 220px; height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, rgba(69,137,255,0.35), rgba(69,137,255,0.05) 60%, transparent 80%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          box-shadow: 0 0 60px rgba(69,137,255,0.45), inset 0 0 40px rgba(69,137,255,0.25);
          animation: corePulse 3s ease-in-out infinite;
        }
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes corePulse {
          0%, 100% { box-shadow: 0 0 60px rgba(69,137,255,0.45), inset 0 0 40px rgba(69,137,255,0.25); }
          50%      { box-shadow: 0 0 90px rgba(69,137,255,0.7),  inset 0 0 60px rgba(69,137,255,0.4); }
        }
        .holo-panel {
          background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.6));
          border: 1px solid var(--acc);
          border-radius: 4px;
          padding: 12px;
          position: relative;
          backdrop-filter: blur(2px);
          box-shadow: 0 0 14px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02);
          z-index: 3;
        }
        .corner { position: absolute; width: 12px; height: 12px; border: 2px solid var(--acc); }
        .corner.tl { top: -2px; left: -2px;  border-right: 0; border-bottom: 0; }
        .corner.tr { top: -2px; right: -2px; border-left: 0;  border-bottom: 0; }
        .corner.bl { bottom: -2px; left: -2px;  border-right: 0; border-top: 0; }
        .corner.br { bottom: -2px; right: -2px; border-left: 0;  border-top: 0; }
        .panel-title {
          font-size: 10px; letter-spacing: 3px; color: var(--acc);
          margin-bottom: 8px; padding-bottom: 4px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          text-shadow: 0 0 6px var(--acc);
        }
        .panel-body { display: flex; flex-direction: column; gap: 1px; }
        .scanlines {
          position: absolute; inset: 0; pointer-events: none;
          background-image: repeating-linear-gradient(0deg, transparent 0 2px, rgba(69,137,255,0.03) 2px 3px);
          mix-blend-mode: screen;
        }
        .hex-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(69,137,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(69,137,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(circle at 50% 50%, black, transparent 80%);
        }
        .particles { position: absolute; inset: 0; pointer-events: none; }
        .particle {
          position: absolute; display: block;
          border-radius: 50%; background: #4589ff;
          box-shadow: 0 0 6px #4589ff;
          opacity: 0.4;
          animation: drift 12s ease-in-out infinite;
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); opacity: 0.2; }
          50%      { transform: translate(30px, -30px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
