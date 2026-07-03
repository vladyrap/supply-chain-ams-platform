"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { fetchAdvanced, fetchNotifications, type DashboardAdvanced, type NotificationItem } from "@/services/dashboard.api";

const POLL_MS = 5000;
const HEAT_MAX_HOURS = 24;
const HEAT_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Hook que reproduce un "tick" visual cuando un número aumenta
function usePulseOnChange<T extends number>(value: T): boolean {
  const prev = useRef(value);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 800);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return pulsing;
}

function GaugeSLA({ pct }: { pct: number }) {
  const stroke = pct >= 90 ? "#10b981" : pct >= 75 ? "#f59e0b" : "#fa4d56";
  const r = 70;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={r} fill="none"
          stroke={stroke} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset .8s ease, stroke .4s" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: stroke, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, letterSpacing: 1 }}>SLA OK</div>
      </div>
    </div>
  );
}

function BigCounter({ label, value, accent }: { label: string; value: number; accent: string }) {
  const pulse = usePulseOnChange(value);
  return (
    <div style={{
      textAlign: "center", padding: "16px 8px",
      borderLeft: `4px solid ${accent}`,
      background: "rgba(255,255,255,0.02)",
      borderRadius: 6,
    }}>
      <div style={{
        fontSize: 56, fontWeight: 700, color: accent, lineHeight: 1,
        transform: pulse ? "scale(1.15)" : "scale(1)",
        textShadow: pulse ? `0 0 18px ${accent}` : "none",
        transition: "transform .35s, text-shadow .35s",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function Heatmap({ cells }: { cells: { day: number; hour: number; value: number }[] }) {
  const max = Math.max(1, ...cells.map((c) => c.value));
  const grid: number[][] = Array.from({ length: 7 }, () => Array(HEAT_MAX_HOURS).fill(0));
  for (const c of cells) {
    if (c.day >= 0 && c.day < 7 && c.hour >= 0 && c.hour < HEAT_MAX_HOURS) grid[c.day][c.hour] = c.value;
  }
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `20px repeat(${HEAT_MAX_HOURS}, 1fr)`, gap: 2 }}>
        <div />
        {Array.from({ length: HEAT_MAX_HOURS }).map((_, h) => (
          <div key={h} style={{ fontSize: 8.5, color: "var(--text-dim)", textAlign: "center" }}>
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {grid.map((row, d) => (
          <>
            <div key={`l${d}`} style={{ fontSize: 9.5, color: "var(--text-dim)", textAlign: "right", paddingRight: 4 }}>{HEAT_DAYS[d]}</div>
            {row.map((v, h) => {
              const a = v === 0 ? 0.04 : 0.15 + (v / max) * 0.85;
              return (
                <div
                  key={`${d}-${h}`}
                  title={`${HEAT_DAYS[d]} ${h}:00 · ${v}`}
                  style={{
                    aspectRatio: "1", borderRadius: 2,
                    background: `rgba(59,130,246,${a})`,
                    transition: "background .3s",
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60)   return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60)   return `hace ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24)   return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

const NOTIF_ICON: Record<string, string> = {
  ticket_escalated: "📤",
  ticket_resolved:  "✅",
  kb_approved:      "📘",
  meeting_done:     "🎙",
  incident_created: "💡",
};

export default function MissionControlPage() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Auto-refresh principal
  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, n] = await Promise.all([fetchAdvanced(), fetchNotifications()]);
      if (!alive) return;
      if (a.ok) { setAdv(a.d); setError(null); } else setError(a.error);
      if (n.ok) setFeed(n.items.slice(0, 12));
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const t = adv?.totals;

  return (
    <div style={{
      minHeight: "calc(100vh - 80px)",
      background: "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.08), transparent 50%), radial-gradient(circle at 80% 90%, rgba(168,85,247,0.06), transparent 50%)",
      padding: "8px 4px",
    }}>
      {/* Header */}
      <div className="row between" style={{ marginBottom: 14, padding: "0 4px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 1 }}>
            🎮 MISSION CONTROL <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>· AMS Supply Chain SAP</span>
          </h1>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            actualiza cada {POLL_MS / 1000}s · pulsa F11 para pantalla completa
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--text-soft)" }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 2 }}>{now.toLocaleTimeString()}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{now.toLocaleDateString()}</div>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 10 }}>{error}</div>}

      {/* Grid principal */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 0.6fr) 2fr 1fr",
        gridTemplateRows: "auto auto 1fr",
        gap: 10,
      }}>
        {/* SLA gauge */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gridRow: "1 / 3", padding: 18 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-soft)", letterSpacing: 1.5 }}>SLA TICKETS</h3>
          {adv ? <GaugeSLA pct={adv.sla.okPct} /> : <div style={{ height: 180 }} />}
          <div className="row" style={{ gap: 10, marginTop: 14, fontSize: 11.5 }}>
            <span style={{ color: "var(--ok)" }}>{adv?.sla.inSla ?? 0} en SLA</span>
            <span style={{ color: "var(--error)" }}>{adv?.sla.breaching ?? 0} vencidos</span>
          </div>
        </div>

        {/* Counters row */}
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-soft)", letterSpacing: 1.5 }}>VOLUMEN EN VIVO</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <BigCounter label="Tickets activos"  value={t?.supportTicketsActive ?? 0}     accent="#3b82f6" />
            <BigCounter label="Conv. abiertas"   value={t?.supportConversationsOpen ?? 0} accent="#a855f7" />
            <BigCounter label="Incidents hoy"    value={t?.incidentsToday ?? 0}           accent="#10b981" />
            <BigCounter label="SLA vencidos"     value={t?.supportTicketsSlaBreaches ?? 0} accent={t && t.supportTicketsSlaBreaches > 0 ? "#fa4d56" : "#6b7280"} />
          </div>
        </div>

        {/* Live feed */}
        <div className="card" style={{ gridRow: "1 / 4", padding: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-soft)", letterSpacing: 1.5 }}>
            🛰 LIVE FEED <span style={{ float: "right", fontSize: 9, color: "var(--text-dim)" }}>● vivo</span>
          </h3>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {feed.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: 12 }}>—</div>}
            {feed.map((it) => (
              <Link
                key={it.id}
                href={it.href}
                style={{
                  display: "block",
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 5,
                  borderLeft: "3px solid var(--accent)",
                  textDecoration: "none",
                  color: "inherit",
                  fontSize: 12,
                  animation: "slideIn .4s ease-out",
                }}
              >
                <div className="row between" style={{ marginBottom: 2 }}>
                  <span>{NOTIF_ICON[it.kind] ?? "•"} <b>{it.title}</b></span>
                  <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{relativeTime(it.createdAt)}</span>
                </div>
                {it.subtitle && <div style={{ color: "var(--text-soft)", fontSize: 11 }}>{it.subtitle}</div>}
              </Link>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="card" style={{ gridColumn: "2 / 3", padding: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-soft)", letterSpacing: 1.5 }}>
            🔥 ACTIVIDAD ÚLTIMOS 14 DÍAS (día × hora)
          </h3>
          {adv ? <Heatmap cells={adv.heatmap} /> : <div style={{ height: 140 }} />}
        </div>

        {/* Top alerts / KPIs secundarios */}
        <div className="card" style={{ gridColumn: "1 / 3", padding: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-soft)", letterSpacing: 1.5 }}>📡 ESTADO DE OPERACIÓN</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            <BigCounter label="% IA resuelto"     value={t?.aiResolvedRate ?? 0} accent="#06b6d4" />
            <BigCounter label="Incidents 7d"      value={t?.incidentsLast7d ?? 0} accent="#10b981" />
            <BigCounter label="Reuniones done"    value={t?.meetingsDone ?? 0} accent="#a855f7" />
            <BigCounter label="KB approved"       value={t?.kbApproved ?? 0} accent="#f1c21b" />
            <BigCounter label="Conv. totales"     value={t?.supportConversations ?? 0} accent="#3b82f6" />
            <BigCounter label="Incidents total"   value={t?.incidents ?? 0} accent="#8b5cf6" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          0%   { opacity: 0; transform: translateX(8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
