"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supportApi } from "@/services/support.api";
import { fetchNotifications, type NotificationItem } from "@/services/dashboard.api";

const POLL_MS = 8000;

interface MetricsState {
  total: number;
  closed: number;
  resolvedByAi: number;
  aiRate: number;
  open: number;
  escalated: number;
  ticketsOpen: number;
  ticketsTotal: number;
  slaBreaches: number;
  kbApproved: number;
  kbDraft: number;
  byPriority: { key: string; count: number }[];
  byChannel:  { key: string; count: number }[];
  byTicketStatus: { key: string; count: number }[];
}

const PRIORITY_META: Record<string, { color: string; icon: string }> = {
  critica: { color: "#fa4d56", icon: "🔥" },
  alta:    { color: "#b45309", icon: "⚠" },
  media:   { color: "#4589ff", icon: "●" },
  baja:    { color: "#10b981", icon: "○" },
};

const CHANNEL_META: Record<string, { color: string; icon: string; label: string }> = {
  chat:     { color: "#4589ff", icon: "💬", label: "Chat web" },
  whatsapp: { color: "#10b981", icon: "📱", label: "WhatsApp" },
  voice:    { color: "#a855f7", icon: "📞", label: "Voz" },
  email:    { color: "#8a6d00", icon: "✉",  label: "Email" },
};

const SUPPORT_NOTIF_KINDS = new Set<NotificationItem["kind"]>([
  "ticket_escalated", "ticket_resolved", "kb_approved", "incident_created",
]);

// Hook de pulse cuando un número cambia
function usePulseOnChange<T extends number>(value: T): boolean {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return pulse;
}

export default function SupportDeskOverviewPage() {
  const [m, setM] = useState<MetricsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(async () => {
    setError(null);
    const [r, n] = await Promise.all([
      supportApi.metrics(),
      fetchNotifications(),
    ]);

    if ("success" in r && r.success) {
      const open = r.conversations.byStatus.filter((s) => ["open", "ai_handling", "waiting_user"].includes(s.key)).reduce((a, b) => a + b.count, 0);
      const escalated = r.conversations.byStatus.find((s) => s.key === "escalated")?.count ?? 0;
      const ticketsOpen = r.tickets.byStatus.filter((s) => ["new", "in_progress", "waiting_customer"].includes(s.key)).reduce((a, b) => a + b.count, 0);
      const ticketsTotal = r.tickets.byStatus.reduce((a, b) => a + b.count, 0);
      const kbApproved = r.kb.byStatus.find((s) => s.key === "approved")?.count ?? 0;
      const kbDraft    = r.kb.byStatus.find((s) => s.key === "draft")?.count ?? 0;
      setM({
        total:           r.conversations.total,
        closed:          r.aiResolution.closedConversations,
        resolvedByAi:    r.aiResolution.resolvedByAi,
        aiRate:          r.aiResolution.rate,
        open, escalated, ticketsOpen, ticketsTotal,
        slaBreaches:     r.tickets.slaBreaches,
        kbApproved, kbDraft,
        byPriority:      r.tickets.byPriority,
        byChannel:       r.conversations.byChannel,
        byTicketStatus:  r.tickets.byStatus,
      });
    } else {
      setError("error" in r ? r.error : "Error consultando métricas");
    }

    if (n.ok) {
      setFeed(n.items.filter((it) => SUPPORT_NOTIF_KINDS.has(it.kind)).slice(0, 12));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => { refresh(); setRefreshTick((x) => x + 1); }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      {/* HERO HEADER */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 10, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>SUPPORT · OPS · CENTER</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, letterSpacing: 0.5 }}>📞 Mesa de Soporte AMS</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              IA Nivel 1 con triage · KB curada · escala a Nivel 2 si no resuelve. Backend live polling cada {POLL_MS / 1000}s.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div className="sd-status-strip">
              <span className="sd-dot ok" /> backend
              <span className="sd-dot ok" /> gemini
              <span className="sd-dot ok" /> kb
              <span className="sd-tick"><span className="sd-tick-spin" /> polling</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--text-dim)", letterSpacing: 1 }}>
              {now.toLocaleTimeString()} · refresh #{refreshTick}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}

      {/* MAIN GRID: SLA gauge + KPIs + donut */}
      <div className="sd-main-grid">
        {/* SLA + AI Resolution gauges */}
        <div className="card sd-gauge-card">
          <div className="sd-gauge-head">
            <span style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 2 }}>RESOLUCIÓN · IA</span>
            <span className="sd-dot ok" /> live
          </div>
          <RadialGauge value={m?.aiRate ?? 0} label="% IA" />
          <div className="sd-gauge-sub">
            <div>
              <div className="sd-gauge-stat">{m?.resolvedByAi ?? 0}</div>
              <div className="sd-gauge-sub-lbl">resueltas IA</div>
            </div>
            <div>
              <div className="sd-gauge-stat">{m ? m.closed - m.resolvedByAi : 0}</div>
              <div className="sd-gauge-sub-lbl">resueltas humano</div>
            </div>
            <div>
              <div className="sd-gauge-stat">{m?.closed ?? 0}</div>
              <div className="sd-gauge-sub-lbl">cerradas total</div>
            </div>
          </div>
        </div>

        {/* KPIs principales (6) */}
        <div className="sd-kpi-grid">
          <BigKpi label="Conversaciones" value={m?.total ?? 0} accent="#4589ff" hint="todas históricas" loading={loading} />
          <BigKpi label="Abiertas" value={m?.open ?? 0} accent="#f1c21b" hint="en curso" loading={loading} />
          <BigKpi label="Escaladas N2" value={m?.escalated ?? 0} accent="#a855f7" hint="generaron ticket" loading={loading} />
          <BigKpi label="Tickets activos" value={m?.ticketsOpen ?? 0} accent="#3b82f6" hint={`de ${m?.ticketsTotal ?? 0} total`} loading={loading} />
          <BigKpi label="SLA vencidos" value={m?.slaBreaches ?? 0} accent={m?.slaBreaches ? "#fa4d56" : "#10b981"} hint={m?.slaBreaches ? "atención" : "todo en SLA"} loading={loading} />
          <BigKpi label="KB aprobados" value={m?.kbApproved ?? 0} accent="#10b981" hint={`${m?.kbDraft ?? 0} en draft`} loading={loading} />
        </div>

        {/* Donut by channel */}
        <div className="card sd-donut-card">
          <div className="sd-gauge-head">
            <span style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 2 }}>CANALES · DISTRIBUCIÓN</span>
          </div>
          {m ? <ChannelDonut items={m.byChannel} /> : <div style={{ minHeight: 200 }} />}
        </div>
      </div>

      {/* SECONDARY GRID: priority bars + tickets status + live feed */}
      <div className="sd-secondary-grid">
        <div className="card sd-tech-card">
          <div className="tech-card-head">
            <span style={{ color: "var(--accent)" }}>▼</span>
            <span>TICKETS · POR PRIORIDAD</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>{m?.ticketsTotal ?? 0} total</span>
          </div>
          {m && m.byPriority.length > 0 ? (
            <PriorityBars items={m.byPriority} />
          ) : <div style={{ color: "var(--text-dim)", fontSize: 12 }}>(sin tickets aún)</div>}
        </div>

        <div className="card sd-tech-card">
          <div className="tech-card-head">
            <span style={{ color: "var(--accent)" }}>▼</span>
            <span>TICKETS · ESTADO</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>{m?.ticketsTotal ?? 0} total</span>
          </div>
          {m && m.byTicketStatus.length > 0 ? (
            <StatusFlow items={m.byTicketStatus} />
          ) : <div style={{ color: "var(--text-dim)", fontSize: 12 }}>(sin tickets aún)</div>}
        </div>

        <div className="card sd-tech-card">
          <div className="tech-card-head">
            <span style={{ color: "var(--accent)" }}>▼</span>
            <span>LIVE · ACTIVITY</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#10b981" }}>● {feed.length}</span>
          </div>
          <LiveFeed items={feed} />
        </div>
      </div>

      {/* ACCESOS */}
      <h2 style={{ fontSize: 13, margin: "20px 0 10px", color: "var(--text-soft)", letterSpacing: 2, textTransform: "uppercase" }}>
        ▸ Accesos rápidos
      </h2>
      <div className="sd-accesos">
        <AccessCard href="/support-desk/simulator"     icon="💬" title="Simulador"        desc="Hazte pasar por cliente y prueba flujo end-to-end" badge="probar" badgeColor="#10b981" />
        <AccessCard href="/support-desk/conversations" icon="📋" title="Conversaciones"   desc="Todas las conversaciones con triage IA"            badge={m && m.open > 0 ? `${m.open} abiertas` : null} badgeColor="#f1c21b" />
        <AccessCard href="/support-desk/tickets"       icon="🎫" title="Tickets N2"       desc="Tickets generados al escalar"                       badge={m && m.ticketsOpen > 0 ? `${m.ticketsOpen} activos` : null} badgeColor="#3b82f6" />
        <AccessCard href="/support-desk/kanban"        icon="🗂" title="Kanban"           desc="Drag & drop entre estados"                          badge="visual" badgeColor="#a855f7" />
        <AccessCard href="/support-desk/kb"            icon="📘" title="KB"               desc="Artículos curados problema → solución"              badge={m ? `${m.kbApproved}` : null} badgeColor="#10b981" />
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTES
// ============================================================================

function RadialGauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = pct >= 70 ? "#10b981" : pct >= 40 ? "#f1c21b" : "#fa4d56";
  const r = 70;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor={stroke} />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r} fill="none"
          stroke="url(#gauge-grad)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.7,0,.3,1)", filter: `drop-shadow(0 0 8px ${stroke})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: stroke, lineHeight: 1, textShadow: `0 0 14px ${stroke}` }}>
          {pct}<small style={{ fontSize: 18, color: "var(--text-dim)" }}>%</small>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 2, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function BigKpi({ label, value, accent, hint, loading }: { label: string; value: number; accent: string; hint?: string; loading: boolean }) {
  const pulse = usePulseOnChange(value);
  return (
    <div className={`sd-kpi ${pulse ? "pulse" : ""}`} style={{ ["--accent" as never]: accent }}>
      <div className="sd-kpi-label">{label}</div>
      <div className="sd-kpi-value" style={{ color: accent, textShadow: `0 0 10px ${accent}88` }}>
        {loading && value === 0 ? <span className="sd-kpi-load" /> : value.toLocaleString("es-CL")}
      </div>
      {hint && <div className="sd-kpi-hint">{hint}</div>}
    </div>
  );
}

function ChannelDonut({ items }: { items: { key: string; count: number }[] }) {
  const total = items.reduce((a, b) => a + b.count, 0);
  if (total === 0) {
    return (
      <div style={{ minHeight: 200, display: "grid", placeItems: "center", color: "var(--text-dim)", fontSize: 12 }}>
        Sin conversaciones aún
      </div>
    );
  }
  const r = 60;
  const c = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <div className="row" style={{ gap: 16, alignItems: "center" }}>
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" />
        {items.map((it) => {
          const frac = it.count / total;
          const dash = c * frac;
          const meta = CHANNEL_META[it.key] ?? { color: "#5b6b7d", icon: "•", label: it.key };
          const offset = c * (cumulative);
          cumulative += frac;
          return (
            <circle key={it.key}
              cx="80" cy="80" r={r}
              fill="none" stroke={meta.color} strokeWidth="14"
              strokeDasharray={`${dash} ${c}`} strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke-dasharray 0.8s ease",
                filter: `drop-shadow(0 0 4px ${meta.color})` }} />
          );
        })}
        <text x="80" y="78" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--accent)" style={{ filter: "drop-shadow(0 0 4px var(--accent))" }}>{total}</text>
        <text x="80" y="92" textAnchor="middle" fontSize="9" fill="var(--text-dim)" letterSpacing="1.5">TOTAL</text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it) => {
          const meta = CHANNEL_META[it.key] ?? { color: "#5b6b7d", icon: "•", label: it.key };
          const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
          return (
            <div key={it.key} className="sd-donut-row" style={{ borderLeft: `3px solid ${meta.color}` }}>
              <span style={{ width: 18 }}>{meta.icon}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{meta.label}</span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: meta.color, fontWeight: 700 }}>{it.count}</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)", minWidth: 32, textAlign: "right" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriorityBars({ items }: { items: { key: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it) => {
        const meta = PRIORITY_META[it.key] ?? { color: "#5b6b7d", icon: "•" };
        const pct = (it.count / max) * 100;
        return (
          <div key={it.key}>
            <div className="row between" style={{ marginBottom: 2 }}>
              <span style={{ fontSize: 11.5 }}>{meta.icon} {it.key.toUpperCase()}</span>
              <span style={{ fontSize: 11.5, color: meta.color, fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>{it.count}</span>
            </div>
            <div className="sd-bar"><div className="sd-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`, boxShadow: `0 0 6px ${meta.color}` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function StatusFlow({ items }: { items: { key: string; count: number }[] }) {
  const STATUS_ORDER = ["new", "in_progress", "waiting_customer", "resolved", "closed"];
  const STATUS_LABEL: Record<string, string> = {
    new: "NEW", in_progress: "IN PROGRESS", waiting_customer: "WAITING", resolved: "RESOLVED", closed: "CLOSED",
  };
  const STATUS_COLOR: Record<string, string> = {
    new: "#4589ff", in_progress: "#f1c21b", waiting_customer: "#a855f7", resolved: "#10b981", closed: "#64748b",
  };
  const map = new Map(items.map((i) => [i.key, i.count]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {STATUS_ORDER.map((s) => {
        const count = map.get(s) ?? 0;
        const color = STATUS_COLOR[s];
        return (
          <div key={s} className="sd-status-row">
            <span className="sd-status-pill" style={{ background: `${color}22`, color, border: `1px solid ${color}66` }}>
              {STATUS_LABEL[s]}
            </span>
            <div className="sd-bar" style={{ flex: 1 }}>
              <div className="sd-bar-fill" style={{ width: `${Math.min(100, count * 10)}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
            </div>
            <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 28, textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function LiveFeed({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12, padding: 10, textAlign: "center" }}>(esperando actividad…)</div>;
  }
  const KIND_META: Record<string, { color: string; icon: string }> = {
    ticket_escalated: { color: "#8a6d00", icon: "📤" },
    ticket_resolved:  { color: "#10b981", icon: "✓" },
    kb_approved:      { color: "#a855f7", icon: "📘" },
    incident_created: { color: "#4589ff", icon: "💡" },
  };
  return (
    <div className="sd-feed">
      {items.map((it) => {
        const meta = KIND_META[it.kind] ?? { color: "#5b6b7d", icon: "•" };
        const diff = Date.now() - new Date(it.createdAt).getTime();
        const ago = diff < 60_000 ? `${Math.floor(diff / 1000)}s` : diff < 3_600_000 ? `${Math.floor(diff / 60_000)}m` : `${Math.floor(diff / 3_600_000)}h`;
        return (
          <Link key={it.id} href={it.href} className="sd-feed-row" style={{ borderLeft: `2px solid ${meta.color}` }}>
            <span style={{ width: 18 }}>{meta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
              {it.subtitle && <div style={{ fontSize: 10.5, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.subtitle}</div>}
            </div>
            <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>hace {ago}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AccessCard({ href, icon, title, desc, badge, badgeColor }: { href: string; icon: string; title: string; desc: string; badge: string | null; badgeColor: string }) {
  return (
    <Link href={href} className="sd-access" style={{ ["--access-color" as never]: badgeColor }}>
      <span className="sd-access-icon">{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sd-access-title">{title}</div>
        <div className="sd-access-desc">{desc}</div>
      </div>
      {badge && (
        <span className="sd-access-badge" style={{ borderColor: badgeColor, color: badgeColor, background: `${badgeColor}15` }}>
          {badge}
        </span>
      )}
      <span className="sd-access-arrow">→</span>
    </Link>
  );
}
