"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAdvanced, fetchExecutive, fetchUsage,
  type DashboardAdvanced, type DashboardExecutive, type UsageSummary } from "@/services/dashboard.api";
import { useEventSounds } from "@/hooks/useEventSounds";
import { boot, launch, beep, blip } from "@/lib/sounds";

const POLL_MS = 4000;

const BOOT_LINES = [
  "INIT  ▸ ams-platform v0.7 ............................ booting",
  "INIT  ▸ wsl2 kernel @ 6.x ............................. [  OK  ]",
  "INIT  ▸ supply-chain-ams-backend connection ........... [ LINK ]",
  "INIT  ▸ supply-chain-ams-db (pgvector pg16) ........... [  OK  ]",
  "INIT  ▸ supply-chain-ams-redis (bullmq queues) ........ [  OK  ]",
  "INIT  ▸ supply-chain-ams-worker (4 jobs / 4 crons) .... [  OK  ]",
  "AGENT ▸ load model gemini-2.5-flash ................... [  OK  ]",
  "AGENT ▸ load model gemini-2.5-flash-lite .............. [  OK  ]",
  "AGENT ▸ embeddings 768d (gemini-embedding-001) ........ [  OK  ]",
  "AGENT ▸ RAG vector index pgvector ..................... [ MOUNT ]",
  "OPS   ▸ ingest queue knowledge-ingest ................. [ READY ]",
  "OPS   ▸ ingest queue meeting-process .................. [ READY ]",
  "OPS   ▸ cron sla-warnings/anomaly/stale-conv/report ... [ READY ]",
  "DESK  ▸ triage + resolver + orchestrator .............. [  OK  ]",
  "DESK  ▸ KB curada + RAG documental .................... [  OK  ]",
  "SAP   ▸ catalog OData v2 readonly ..................... [ MOCK ]",
  "TELEM ▸ prometheus + grafana .......................... [  UP  ]",
  "TELEM ▸ elasticsearch + kibana + logstash ............. [  UP  ]",
  "SEC   ▸ cookie ams_session HttpOnly SameSite=Lax ...... [  OK  ]",
  "SEC   ▸ HMAC webhook signature ........................ [  OK  ]",
  "ALL SYSTEMS NOMINAL · GO FOR OPS",
];

function fmtTime(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function nextTarget(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function Tile({ label, value, color = "#22d3ee", small = false }: { label: string; value: string | number; color?: string; small?: boolean }) {
  return (
    <div className="lp-tile" style={{ borderColor: color }}>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: small ? 18 : 28, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${color}55` }}>
        {value}
      </div>
    </div>
  );
}

function Waveform({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 40 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, background: color, boxShadow: `0 0 4px ${color}`, opacity: 0.7 + (i / data.length) * 0.3, minHeight: 2 }} />
      ))}
    </div>
  );
}

export default function LaunchpadPage() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [bootStep, setBootStep] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const [target] = useState(nextTarget());
  const [now, setNow] = useState(new Date());
  const [demoFiring, setDemoFiring] = useState(false);
  const bootStarted = useRef(false);
  const { muted, toggleMute, feed } = useEventSounds();

  // Polling
  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, e, u] = await Promise.all([fetchAdvanced(), fetchExecutive(30), fetchUsage(7)]);
      if (!alive) return;
      if (a.ok) setAdv(a.d);
      if (e.ok) setExec(e.d);
      if (u.ok) setUsage(u.u);
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Boot sequence
  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    let i = 0;
    const total = BOOT_LINES.length;
    function step() {
      setBootStep(i);
      if (i === 0 || i === Math.floor(total / 2)) boot();
      i++;
      if (i >= total) {
        setBootDone(true);
        beep();
        return;
      }
      const delay = i < 4 ? 120 : i < 12 ? 80 : 60;
      setTimeout(step, delay);
    }
    step();
  }, []);

  const remaining = target.getTime() - now.getTime();
  const sla = adv?.sla.okPct ?? 0;
  const breach = adv?.sla.breaching ?? 0;
  const alertMode = breach > 0;

  // Auto-demo: dispara una secuencia visual de eventos sintéticos visuales (sonidos)
  function launchDemo() {
    if (demoFiring) return;
    setDemoFiring(true);
    launch();
    const sounds = ["radar", "alert", "beep", "blip"];
    sounds.forEach((_, i) => {
      setTimeout(() => {
        if (i === 0) import("@/lib/sounds").then((m) => m.radar());
        if (i === 1) import("@/lib/sounds").then((m) => m.alert());
        if (i === 2) import("@/lib/sounds").then((m) => m.beep());
        if (i === 3) import("@/lib/sounds").then((m) => m.blip());
      }, 600 + i * 400);
    });
    setTimeout(() => setDemoFiring(false), 3000);
  }

  const tokensSpark = useMemo(() => {
    const d = usage?.byDay ?? [];
    return d.slice(-24).map((x) => x.tokens);
  }, [usage]);

  // Sistemas (visual)
  const systems = [
    { name: "AGENT·CORE",       ok: true,           detail: `${exec?.kpis.totalInteractions ?? 0} ixn / ${exec?.period.days ?? 30}d` },
    { name: "RAG·VECTOR·INDEX", ok: true,           detail: `pgvector 768d` },
    { name: "SUPPORT·DESK",     ok: !alertMode,     detail: `${adv?.totals.supportTicketsActive ?? 0} active · ${breach} breach` },
    { name: "KB·CURATED",       ok: true,           detail: `${adv?.totals.kbApproved ?? 0} approved` },
    { name: "MEETINGS·WHISPER", ok: true,           detail: `${adv?.totals.meetingsDone ?? 0} done` },
    { name: "SAP·READONLY",     ok: true,           detail: `mock · catalog 5 endpoints` },
    { name: "INTEGRATIONS",     ok: true,           detail: `webhook · slack · email` },
    { name: "OBSERVABILITY",    ok: true,           detail: `prometheus · grafana · elk` },
  ];

  return (
    <div className={`lp-root ${alertMode ? "alert" : ""}`}>
      {/* Boot overlay */}
      {!bootDone && (
        <div className="boot-overlay">
          <div className="boot-screen">
            <div className="boot-title">
              <span className="cursor">▌</span> SHIELD·AMS-PLATFORM · COLD-BOOT SEQUENCE
            </div>
            <div className="boot-body">
              {BOOT_LINES.slice(0, bootStep + 1).map((l, i) => (
                <div key={i} className="boot-line">
                  <span style={{ color: "#64748b" }}>{new Date().toLocaleTimeString()}</span>{" "}
                  <span style={{ color: l.includes("NOMINAL") ? "#10b981" : l.includes("[ MOCK ]") ? "#fbbf24" : "#cbd5e1" }}>{l}</span>
                </div>
              ))}
            </div>
            <div className="boot-progress">
              <div className="boot-progress-bar" style={{ width: `${(bootStep / BOOT_LINES.length) * 100}%` }} />
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, letterSpacing: 2 }}>
                LOADING { Math.round((bootStep / BOOT_LINES.length) * 100) }%  · press SPACE to skip
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="lp-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: 4, color: "#22d3ee", textShadow: "0 0 12px rgba(34,211,238,0.7)" }}>◤ MISSION LAUNCHPAD ◢</h1>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#67e8f9", marginTop: 4 }}>AMS SUPPLY-CHAIN · OPERATIONAL READINESS DASHBOARD</div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button onClick={toggleMute} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>{muted ? "🔇" : "🔊"}</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#67e8f9", letterSpacing: 2 }}>T·MINUS · NEXT WINDOW</div>
            <div style={{ fontSize: 38, color: "#22d3ee", fontFamily: "var(--font-mono, monospace)", letterSpacing: 4, textShadow: "0 0 14px rgba(34,211,238,0.8)", fontVariantNumeric: "tabular-nums" }}>
              {fmtTime(remaining)}
            </div>
          </div>
        </div>
      </div>

      {/* 3 columnas */}
      <div className="lp-grid">
        {/* IZQ telemetry */}
        <div className="lp-col">
          <div className="lp-section-title">▸ SYSTEMS·TELEMETRY</div>
          {systems.map((s) => (
            <div key={s.name} className="lp-system-row">
              <span style={{ color: s.ok ? "#10b981" : "#ef4444", fontSize: 14, textShadow: `0 0 6px ${s.ok ? "#10b981" : "#ef4444"}` }}>●</span>
              <span style={{ color: "#cbd5e1", fontSize: 11, letterSpacing: 1.5, flex: 1 }}>{s.name}</span>
              <span style={{ color: "#64748b", fontSize: 10 }}>{s.detail}</span>
            </div>
          ))}
        </div>

        {/* CENTRO control */}
        <div className="lp-col lp-center">
          <div className="lp-section-title">▸ LAUNCH·CONTROL</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Tile label="SLA · %"           value={`${Math.round(sla)}%`} color={sla >= 90 ? "#10b981" : sla >= 75 ? "#fbbf24" : "#ef4444"} />
            <Tile label="ACTIVE · TICKETS"  value={adv?.totals.supportTicketsActive ?? 0} color="#fbbf24" />
            <Tile label="IA RESOLVED · %"   value={`${Math.round(exec?.kpis.aiResolutionRate ?? 0)}%`} color="#06b6d4" />
            <Tile label="INTERACTIONS"      value={(exec?.kpis.totalInteractions ?? 0).toLocaleString("es-CL")} color="#a855f7" />
            <Tile label="TOKENS·7D"         value={usage ? `${(usage.totals.totalTokens / 1000).toFixed(1)}k` : "0"} color="#fbbf24" small />
            <Tile label="COSTO USD"         value={usage ? `$${usage.totals.costUsd.toFixed(2)}` : "$0.00"} color="#ef4444" small />
            <Tile label="AVG·RESP·MIN"      value={Math.round(exec?.kpis.avgResponseTimeMin ?? 0)} color="#22d3ee" small />
            <Tile label="BREACH"            value={breach} color={breach ? "#ef4444" : "#6b7280"} small />
          </div>

          <button className="lp-launch" onClick={launchDemo} disabled={demoFiring}>
            {demoFiring ? "▶ FIRING SEQUENCE..." : "▶ LAUNCH·DEMO"}
          </button>
        </div>

        {/* DER waveform + feed */}
        <div className="lp-col">
          <div className="lp-section-title">▸ TOKENS·WAVEFORM</div>
          <Waveform data={tokensSpark} color="#22d3ee" />
          <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginTop: 6 }}>
            last 7 days · max {Math.max(0, ...tokensSpark).toLocaleString("es-CL")} tok/day
          </div>

          <div className="lp-section-title" style={{ marginTop: 18 }}>▸ EVENT·STREAM</div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 220, fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
            {feed.length === 0 && <div style={{ color: "#64748b" }}>(stream idle)</div>}
            {feed.map((f) => (
              <div key={f.id} className="lp-feed">
                <span style={{ color: "#0891b2" }}>{new Date(f.createdAt).toLocaleTimeString().slice(0,8)}</span>{" "}
                <span style={{ color: "#22d3ee" }}>{f.kind.split("_")[0].toUpperCase()}</span>{" "}
                <span style={{ color: "#cbd5e1" }}>{f.title.slice(0, 30)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status footer */}
      <div className="lp-footer">
        <span style={{ color: alertMode ? "#ef4444" : "#10b981", fontWeight: 700 }}>
          {alertMode ? "⚠ ALERT · SLA BREACH" : "● ALL NOMINAL · GO FOR OPS"}
        </span>
        <span style={{ marginLeft: "auto", color: "#67e8f9", letterSpacing: 2 }}>
          {now.toUTCString().slice(0, 25)} UTC · POLLING {POLL_MS / 1000}s
        </span>
      </div>

      {alertMode && <div className="alert-overlay" />}
      <div className="scanlines" />

      <style jsx global>{`
        .lp-root {
          min-height: calc(100vh - 80px);
          background:
            radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(168,85,247,0.06) 0%, transparent 50%),
            #04060f;
          color: #67e8f9;
          font-family: var(--font-mono, "Consolas", monospace);
          padding: 16px;
          position: relative; overflow: hidden;
        }
        .lp-root.alert {
          animation: alertPulse 1.4s ease-in-out infinite;
        }
        @keyframes alertPulse {
          0%, 100% { box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
          50%      { box-shadow: inset 0 0 120px 0 rgba(239,68,68,0.18); }
        }
        .alert-overlay {
          position: absolute; inset: 0; pointer-events: none;
          border: 3px solid rgba(239,68,68,0.5); border-radius: 8px;
          animation: alertBorder 0.8s ease-in-out infinite;
        }
        @keyframes alertBorder {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 0.7; }
        }
        .lp-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px;
          border-top: 1px solid rgba(34,211,238,0.4);
          border-bottom: 1px solid rgba(34,211,238,0.4);
          margin-bottom: 16px;
        }
        .lp-grid {
          display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 12px;
          min-height: 380px;
        }
        .lp-col {
          background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.6));
          border: 1px solid rgba(34,211,238,0.3);
          border-radius: 4px;
          padding: 14px;
          display: flex; flex-direction: column;
          position: relative;
        }
        .lp-center { align-items: stretch; }
        .lp-section-title {
          font-size: 10px; letter-spacing: 3px; color: #22d3ee;
          margin-bottom: 10px; padding-bottom: 4px;
          border-bottom: 1px solid rgba(34,211,238,0.15);
          text-shadow: 0 0 6px rgba(34,211,238,0.5);
        }
        .lp-system-row {
          display: flex; align-items: center; gap: 10px;
          padding: 5px 0; border-bottom: 1px dashed rgba(255,255,255,0.04);
        }
        .lp-tile {
          background: linear-gradient(135deg, rgba(34,211,238,0.05), rgba(15,23,42,0.4));
          border-left: 2px solid;
          padding: 8px 10px; border-radius: 2px;
        }
        .lp-launch {
          margin-top: auto;
          background: linear-gradient(135deg, #1e293b, #0c4a6e);
          border: 2px solid #22d3ee;
          color: #22d3ee;
          padding: 14px;
          font-family: var(--font-mono, monospace);
          font-size: 14px; letter-spacing: 4px; font-weight: 700;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          text-shadow: 0 0 8px rgba(34,211,238,0.7);
          box-shadow: 0 0 20px rgba(34,211,238,0.2), inset 0 0 20px rgba(34,211,238,0.1);
        }
        .lp-launch:hover:not(:disabled) {
          background: linear-gradient(135deg, #0c4a6e, #155e75);
          box-shadow: 0 0 30px rgba(34,211,238,0.5), inset 0 0 30px rgba(34,211,238,0.2);
        }
        .lp-launch:disabled {
          background: linear-gradient(135deg, #1e293b, #831843);
          border-color: #fbbf24;
          color: #fbbf24;
          animation: launchFire 0.3s ease-in-out infinite alternate;
        }
        @keyframes launchFire {
          from { box-shadow: 0 0 20px rgba(251,191,36,0.4); }
          to   { box-shadow: 0 0 40px rgba(251,191,36,0.9); }
        }
        .lp-feed {
          padding: 3px 6px; margin-bottom: 2px;
          background: rgba(34,211,238,0.04);
          border-left: 2px solid rgba(34,211,238,0.3);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .lp-footer {
          display: flex; align-items: center; padding: 6px 12px; margin-top: 14px;
          border-top: 1px solid rgba(34,211,238,0.4);
          border-bottom: 1px solid rgba(34,211,238,0.4);
          font-size: 11px;
        }
        .scanlines {
          position: absolute; inset: 0; pointer-events: none;
          background-image: repeating-linear-gradient(0deg, transparent 0 2px, rgba(34,211,238,0.025) 2px 3px);
          mix-blend-mode: screen;
        }
        .boot-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: #000;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono, monospace);
        }
        .boot-screen {
          width: 720px; max-width: 92vw; max-height: 80vh;
          background: rgba(0,0,0,0.95);
          border: 1px solid #10b981;
          padding: 24px;
          color: #10b981;
          font-size: 12px;
          box-shadow: 0 0 60px rgba(16,185,129,0.3);
        }
        .boot-title {
          font-size: 12px; letter-spacing: 2px; color: #10b981;
          margin-bottom: 16px;
        }
        .boot-body {
          height: 320px; overflow-y: auto;
          padding: 8px 0;
          line-height: 1.6;
        }
        .boot-line {
          opacity: 0;
          animation: bootLineIn 0.2s ease-out forwards;
        }
        @keyframes bootLineIn {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .boot-progress {
          margin-top: 14px;
          height: 4px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          position: relative;
        }
        .boot-progress-bar {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: linear-gradient(90deg, #10b981, #22d3ee);
          box-shadow: 0 0 8px #10b981;
          transition: width 0.15s linear;
        }
        .cursor { animation: blink 1s steps(2) infinite; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}
