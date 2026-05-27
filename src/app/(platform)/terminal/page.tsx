"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAdvanced, fetchExecutive, fetchUsage, fetchNotifications,
  type DashboardAdvanced, type DashboardExecutive, type UsageSummary, type NotificationItem } from "@/services/dashboard.api";

const POLL_MS = 4000;

const KIND_TAG: Record<string, { tag: string; color: string }> = {
  incident_created: { tag: "INC", color: "#60a5fa" },
  ticket_escalated: { tag: "ESC", color: "#fbbf24" },
  ticket_resolved:  { tag: "RES", color: "#10b981" },
  kb_approved:      { tag: "KB",  color: "#a855f7" },
  meeting_done:     { tag: "MTG", color: "#06b6d4" },
};

function fmt(n: number | undefined, d = 0): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Cell({ tag, title, children, color = "#fbbf24" }: { tag: string; title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="bb-cell">
      <div className="bb-cell-head">
        <span style={{ color, fontWeight: 700 }}>{tag}</span>
        <span style={{ color: "#94a3b8" }}>· {title}</span>
        <span style={{ marginLeft: "auto", color: "#475569" }}>{new Date().toLocaleTimeString().slice(0, 5)}</span>
      </div>
      <div className="bb-cell-body">{children}</div>
    </div>
  );
}

function Big({ value, unit, color = "#fbbf24" }: { value: string; unit?: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 38, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 6px ${color}55` }}>{value}</span>
      {unit && <span style={{ fontSize: 12, color: "#64748b", letterSpacing: 1 }}>{unit}</span>}
    </div>
  );
}

function MiniBar({ items, color = "#fbbf24" }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
      {items.slice(0, 6).map((it) => (
        <div key={it.label} className="row" style={{ gap: 6 }}>
          <div style={{ width: 80, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", position: "relative", height: 12 }}>
            <div style={{ position: "absolute", inset: 0, width: `${(it.value / max) * 100}%`, background: color, boxShadow: `0 0 8px ${color}88` }} />
          </div>
          <div style={{ width: 30, textAlign: "right", color, fontVariantNumeric: "tabular-nums" }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div style={{ color: "#64748b", fontSize: 11 }}>(no data)</div>;
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const W = 220, H = 60;
  const step = W / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${H - ((v - min) / (max - min || 1)) * H}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={color} fillOpacity="0.10" />
    </svg>
  );
}

export default function TerminalPage() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [logLines, setLogLines] = useState<{ id: string; text: string; color: string }[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const firstRef = useRef(true);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, e, u, n] = await Promise.all([fetchAdvanced(), fetchExecutive(30), fetchUsage(30), fetchNotifications()]);
      if (!alive) return;
      if (a.ok) setAdv(a.d);
      if (e.ok) setExec(e.d);
      if (u.ok) setUsage(u.u);
      if (n.ok) {
        setFeed(n.items.slice(0, 16));
        // Sólo nuevos → log Matrix
        const news: NotificationItem[] = [];
        for (const it of n.items) if (!seen.current.has(it.id)) { seen.current.add(it.id); if (!firstRef.current) news.push(it); }
        firstRef.current = false;
        if (news.length) {
          setLogLines((ls) => {
            const add = news.map((it) => {
              const kt = KIND_TAG[it.kind];
              return { id: it.id, text: `${new Date(it.createdAt).toLocaleTimeString()} ${kt?.tag ?? "EVT"} > ${it.title}`, color: kt?.color ?? "#10b981" };
            });
            return [...add, ...ls].slice(0, 40);
          });
        }
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

  const tokensSpark = (usage?.byDay ?? []).slice(-14).map((d) => d.tokens);
  const interactionsSpark = (exec?.trend ?? []).slice(-14).map((d) => d.interactions);

  return (
    <div className="bb-root">
      {/* Header */}
      <div className="bb-header">
        <span className="bb-brand">AMS TERMINAL</span>
        <span className="bb-sep" />
        <span style={{ color: "#fbbf24" }}>SUPPLY-CHAIN</span>
        <span className="bb-sep" />
        <span style={{ color: "#94a3b8" }}>v0.7 · LIVE</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "#10b981" }}>● MARKET OPEN</span>
        <span className="bb-sep" />
        <span style={{ color: "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>{now.toLocaleString("es-CL")}</span>
      </div>

      <div className="bb-grid">
        <Cell tag="TKT" title="TICKETS·ACTIVE" color="#fbbf24">
          <Big value={fmt(adv?.totals.supportTicketsActive)} unit="open" color="#fbbf24" />
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>
            sla.ok <span style={{ color: "#10b981" }}>{fmt(adv?.sla.inSla)}</span> · brk <span style={{ color: "#ef4444" }}>{fmt(adv?.sla.breaching)}</span>
          </div>
        </Cell>

        <Cell tag="SLA" title="COMPLIANCE %" color="#10b981">
          <Big value={fmt(adv?.sla.okPct)} unit="%" color={adv && adv.sla.okPct >= 90 ? "#10b981" : adv && adv.sla.okPct >= 75 ? "#fbbf24" : "#ef4444"} />
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>last {exec?.period.days ?? 30}d window</div>
        </Cell>

        <Cell tag="TKN" title="TOKENS·30D" color="#a855f7">
          <Big value={fmt(usage ? usage.totals.totalTokens / 1000 : undefined, 1)} unit="k" color="#a855f7" />
          <Sparkline data={tokensSpark} color="#a855f7" />
        </Cell>

        <Cell tag="USD" title="GEMINI·SPEND·30D" color="#ef4444">
          <Big value={fmt(usage?.totals.costUsd, 2)} unit="USD" color="#ef4444" />
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>
            calls <span style={{ color: "#cbd5e1" }}>{fmt(usage?.totals.calls)}</span> · avg/call ${fmt(usage && usage.totals.calls ? usage.totals.costUsd / usage.totals.calls : 0, 4)}
          </div>
        </Cell>

        <Cell tag="MOD" title="TOP·MÓDULOS·SAP" color="#60a5fa">
          <MiniBar items={(adv?.byModule ?? []).map((m) => ({ label: m.key, value: m.count }))} color="#60a5fa" />
        </Cell>

        <Cell tag="SYS" title="TOP·SISTEMAS" color="#06b6d4">
          <MiniBar items={(adv?.topSystems ?? []).map((s) => ({ label: s.key, value: s.count }))} color="#06b6d4" />
        </Cell>

        <Cell tag="URG" title="DISTRIB·URGENCIA" color="#f59e0b">
          <MiniBar items={(adv?.byUrgency ?? []).map((u) => ({ label: u.key, value: u.count }))} color="#f59e0b" />
        </Cell>

        <Cell tag="CLI" title="TOP·CLIENTES" color="#10b981">
          <MiniBar items={(exec?.byClient ?? []).slice(0, 6).map((c) => ({ label: c.name, value: c.total }))} color="#10b981" />
        </Cell>

        <Cell tag="TRN" title="INTERACTIONS·14D" color="#fbbf24">
          <Sparkline data={interactionsSpark} color="#fbbf24" />
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>
            total <span style={{ color: "#fbbf24" }}>{fmt(exec?.kpis.totalInteractions)}</span> ·  ai-resolved <span style={{ color: "#10b981" }}>{fmt(exec?.kpis.aiResolutionRate)}%</span>
          </div>
        </Cell>

        <Cell tag="KPI" title="OPERATIONS" color="#a855f7">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
            <div>incidents·d <span style={{ color: "#60a5fa", float: "right" }}>{fmt(adv?.totals.incidentsToday)}</span></div>
            <div>incidents·7d <span style={{ color: "#60a5fa", float: "right" }}>{fmt(adv?.totals.incidentsLast7d)}</span></div>
            <div>conv·open <span style={{ color: "#a855f7", float: "right" }}>{fmt(adv?.totals.supportConversationsOpen)}</span></div>
            <div>conv·tot <span style={{ color: "#a855f7", float: "right" }}>{fmt(adv?.totals.supportConversations)}</span></div>
            <div>kb·appr <span style={{ color: "#fbbf24", float: "right" }}>{fmt(adv?.totals.kbApproved)}</span></div>
            <div>mtg·done <span style={{ color: "#06b6d4", float: "right" }}>{fmt(adv?.totals.meetingsDone)}</span></div>
          </div>
        </Cell>

        {/* LOG STREAM doble ancho */}
        <div className="bb-cell" style={{ gridColumn: "span 2" }}>
          <div className="bb-cell-head">
            <span style={{ color: "#10b981", fontWeight: 700 }}>LOG</span>
            <span style={{ color: "#94a3b8" }}>· STREAM·LIVE</span>
            <span style={{ marginLeft: "auto", color: "#10b981" }}>● {logLines.length} lines</span>
          </div>
          <div className="bb-cell-body" style={{ height: 200, overflow: "hidden", position: "relative", padding: 0 }}>
            <div className="bb-scanlines" />
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, padding: 8 }}>
              {logLines.length === 0 && <div style={{ color: "#64748b" }}>$ awaiting events from supply-chain-ams-backend...</div>}
              {logLines.map((l) => (
                <div key={l.id} style={{ color: l.color, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", animation: "fadeInUp 0.25s ease-out" }}>
                  <span style={{ color: "#10b981" }}>$</span> {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEED a la derecha */}
        <div className="bb-cell" style={{ gridColumn: "span 2" }}>
          <div className="bb-cell-head">
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>FEED</span>
            <span style={{ color: "#94a3b8" }}>· EVENTS·STREAM</span>
            <span style={{ marginLeft: "auto", color: "#94a3b8" }}>{feed.length} recent</span>
          </div>
          <div className="bb-cell-body" style={{ height: 200, overflow: "auto", padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              <tbody>
                {feed.length === 0 && <tr><td colSpan={3} style={{ color: "#64748b", padding: 8 }}>(no events)</td></tr>}
                {feed.map((f) => {
                  const kt = KIND_TAG[f.kind];
                  return (
                    <tr key={f.id} className="bb-feed-row">
                      <td style={{ padding: "2px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{new Date(f.createdAt).toLocaleTimeString().slice(0, 8)}</td>
                      <td style={{ padding: "2px 6px", color: kt?.color ?? "#cbd5e1", fontWeight: 700 }}>{kt?.tag ?? "EVT"}</td>
                      <td style={{ padding: "2px 6px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 350, whiteSpace: "nowrap" }}>{f.title}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bb-footer">
        AGENT·STATUS <span style={{ color: "#10b981" }}>● OK</span> · DB <span style={{ color: "#10b981" }}>● healthy</span> · REDIS <span style={{ color: "#10b981" }}>● up</span> · WORKER <span style={{ color: "#10b981" }}>● running</span>
        <span style={{ flex: 1 }} />
        polling {POLL_MS / 1000}s · refresh next in ~{POLL_MS / 1000}s · F11 fullscreen
      </div>

      <style jsx global>{`
        .bb-root {
          background: #000;
          color: #fbbf24;
          font-family: var(--font-mono, "Consolas", "Monaco", monospace);
          padding: 6px;
          min-height: calc(100vh - 80px);
          border-radius: 6px;
        }
        .bb-header {
          display: flex; align-items: center; gap: 10px;
          background: #fbbf24; color: #000; padding: 5px 12px;
          font-weight: 700; letter-spacing: 2px; font-size: 12px;
          border-radius: 3px;
        }
        .bb-brand { font-size: 14px; }
        .bb-sep { width: 1px; height: 16px; background: rgba(0,0,0,0.4); }
        .bb-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px; margin-top: 4px;
        }
        .bb-cell {
          background: #0a0a0a;
          border: 1px solid #1f1f1f;
          min-height: 110px;
          display: flex; flex-direction: column;
        }
        .bb-cell-head {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 8px;
          background: #1a1a1a;
          font-size: 10.5px; letter-spacing: 1px;
          border-bottom: 1px solid #2a2a2a;
        }
        .bb-cell-body { padding: 10px; flex: 1; }
        .bb-feed-row:hover { background: #1a1a1a; }
        .bb-footer {
          display: flex; align-items: center; gap: 10px;
          background: #fbbf24; color: #000; padding: 4px 12px;
          font-weight: 700; font-size: 11px; letter-spacing: 1.5px;
          margin-top: 4px;
          border-radius: 3px;
        }
        .bb-scanlines {
          position: absolute; inset: 0;
          background-image: repeating-linear-gradient(
            0deg, transparent 0, transparent 2px, rgba(16,185,129,0.04) 2px, rgba(16,185,129,0.04) 3px
          );
          pointer-events: none;
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 0.9; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
