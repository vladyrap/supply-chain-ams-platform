"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import KPI from "@/components/ui/KPI";
import BarList from "@/components/ui/BarList";
import { fetchExecutive, fetchUsage, type DashboardExecutive, type UsageSummary } from "@/services/dashboard.api";
import RequirePermission from "@/components/admin/RequirePermission";

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: "7d",   days: 7 },
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
  { label: "365d", days: 365 },
];

function fmtMoney(v: number): string {
  if (v >= 1) return `$${v.toFixed(2)} USD`;
  if (v >= 0.01) return `$${v.toFixed(3)} USD`;
  return `$${v.toFixed(5)} USD`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtMins(m: number): string {
  if (m === 0) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

function ExecutivePageInner() {
  const [data, setData] = useState<DashboardExecutive | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [r, u] = await Promise.all([fetchExecutive(days), fetchUsage(days)]);
    if (r.ok) setData(r.d);
    else      setError(r.error);
    if (u.ok) setUsage(u.u);
    setLoading(false);
  }, [days]);

  useEffect(() => { refresh(); }, [refresh]);

  const k = data?.kpis;
  const trendMax = data ? Math.max(1, ...data.trend.map((t) => t.interactions)) : 1;

  return (
    <div>
      <div className="page-title">
        <h1>🏢 Dashboard ejecutivo</h1>
        <p>Visión C-level: volumen de actividad, tasa de resolución por IA, costos estimados y SLA por periodo. Pensado para reportar a clientes y dirección.</p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.days}
            className={`btn ${days === o.days ? "primary" : "ghost"}`}
            style={{ padding: "4px 12px" }}
            onClick={() => setDays(o.days)}
          >últimos {o.label}</button>
        ))}
        {data && (
          <Badge variant="muted">
            {data.period.from} → {data.period.to}
          </Badge>
        )}
        <button onClick={refresh} className="btn ghost" disabled={loading} style={{ marginLeft: "auto", padding: "4px 12px" }}>
          {loading ? <><span className="spinner" /> cargando</> : "↻"}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Interacciones totales" value={k?.totalInteractions ?? "—"} accent="info" hint={`${days} días`} />
        <KPI label="Tickets resueltos" value={k?.ticketsResolvedMonth ?? "—"} accent="ok" hint="Nivel 2" />
        <KPI label="% resueltos por IA" value={k ? `${k.aiResolutionRate}%` : "—"} accent={k && k.aiResolutionRate >= 60 ? "ok" : "warn"} hint="sobre cerradas" />
        <KPI label="SLA cumplido" value={k ? `${k.slaCompliancePct}%` : "—"} accent={k && k.slaCompliancePct >= 90 ? "ok" : "warn"} hint="tickets cerrados" />
        <KPI label="Tiempo prom. resolución" value={k ? fmtMins(k.avgResponseTimeMin) : "—"} accent="info" hint="ticket→resuelto" />
        <KPI label="KB articles creados" value={k?.kbArticlesCreated ?? "—"} accent="tech" hint="approved" />
        <KPI
          label={usage && usage.totals.calls > 0 ? "Costo Gemini real" : "Costo Gemini estimado"}
          value={
            usage && usage.totals.calls > 0
              ? fmtMoney(usage.totals.costUsd)
              : k ? fmtMoney(k.estimatedCostUsd) : "—"
          }
          accent="warn"
          hint={
            usage && usage.totals.calls > 0
              ? `${usage.totals.calls} llamadas · ${fmtTokens(usage.totals.totalTokens)} tokens`
              : k ? `~${fmtMoney(k.costPerInteractionUsd)} c/u` : ""
          }
        />
        <KPI label="Incidentes (agente)" value={k?.incidentsMonth ?? "—"} accent="default" hint="consultas al RAG" />
      </div>

      {/* Tendencia */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>📈 Tendencia de actividad</h3>
        {data ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 130, padding: "10px 0" }}>
            {data.trend.map((t) => {
              const h = Math.max(2, Math.round((t.interactions / trendMax) * 100));
              const isWeekend = (() => {
                const d = new Date(t.day).getDay();
                return d === 0 || d === 6;
              })();
              return (
                <div
                  key={t.day}
                  title={`${t.day}: ${t.interactions} interacciones`}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    height: `${h}%`,
                    background: isWeekend ? "var(--text-dim)" : "var(--accent)",
                    borderRadius: 2,
                    transition: "height .2s",
                    opacity: 0.85,
                  }}
                />
              );
            })}
          </div>
        ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        <div className="row between" style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>
          <span>{data?.trend[0]?.day}</span>
          <span>{data?.trend[data.trend.length - 1]?.day}</span>
        </div>
      </div>

      {/* Two columns: clientes + módulos */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>🥇 Top clientes</h3>
          {data && data.byClient.length > 0 ? (
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-soft)", borderBottom: "1px solid var(--border-soft)" }}>
                  <th style={{ padding: "6px 4px" }}>Cliente</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Incidentes</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Tickets mesa</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byClient.map((c) => (
                  <tr key={c.name} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: "6px 4px" }}>{c.name === "NO_INFORMADO" ? <span style={{ color: "var(--text-dim)" }}>sin cliente</span> : c.name}</td>
                    <td style={{ padding: "6px 4px", textAlign: "right" }}>{c.incidents}</td>
                    <td style={{ padding: "6px 4px", textAlign: "right" }}>{c.tickets}</td>
                    <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600 }}>{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>📦 Por módulo SAP</h3>
          {data && data.byModule.length > 0 ? (
            <BarList items={data.byModule.map((m) => ({ label: m.key, value: m.count }))} />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>
      </div>

      {/* Top agentes humanos */}
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>👤 Top agentes Nivel 2</h3>
        {data && data.topAgents.length > 0 ? (
          <BarList items={data.topAgents.map((a) => ({ label: a.name, value: a.resolved }))} />
        ) : <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Aún no hay tickets resueltos por agentes humanos en este periodo.</div>}
      </div>

      {/* Uso & costos reales */}
      {usage && usage.totals.calls > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>💰 Uso & costos reales de Gemini</h3>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Badge variant="ok">{usage.totals.calls} llamadas</Badge>
            <Badge variant="info">{fmtTokens(usage.totals.promptTokens)} input</Badge>
            <Badge variant="info">{fmtTokens(usage.totals.completionTokens)} output</Badge>
            <Badge variant="tech">{fmtTokens(usage.totals.totalTokens)} total</Badge>
            <Badge variant="warn">{fmtMoney(usage.totals.costUsd)}</Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <h4 style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--text-soft)" }}>Por modelo</h4>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-soft)", borderBottom: "1px solid var(--border-soft)" }}>
                    <th style={{ padding: "4px 4px" }}>Modelo</th>
                    <th style={{ padding: "4px 4px", textAlign: "right" }}>Calls</th>
                    <th style={{ padding: "4px 4px", textAlign: "right" }}>Tokens</th>
                    <th style={{ padding: "4px 4px", textAlign: "right" }}>USD</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byModel.map((m) => (
                    <tr key={m.model} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ padding: "4px 4px" }}><code style={{ fontSize: 11 }}>{m.model}</code></td>
                      <td style={{ padding: "4px 4px", textAlign: "right" }}>{m.calls}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right" }}>{fmtTokens(m.tokens)}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: 600 }}>{fmtMoney(m.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--text-soft)" }}>Por origen</h4>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-soft)", borderBottom: "1px solid var(--border-soft)" }}>
                    <th style={{ padding: "4px 4px" }}>Source</th>
                    <th style={{ padding: "4px 4px", textAlign: "right" }}>Calls</th>
                    <th style={{ padding: "4px 4px", textAlign: "right" }}>Tokens</th>
                    <th style={{ padding: "4px 4px", textAlign: "right" }}>USD</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.bySource.map((s) => (
                    <tr key={s.source} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ padding: "4px 4px" }}><Badge variant="muted">{s.source}</Badge></td>
                      <td style={{ padding: "4px 4px", textAlign: "right" }}>{s.calls}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right" }}>{fmtTokens(s.tokens)}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: 600 }}>{fmtMoney(s.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 16, gap: 10, alignItems: "center" }}>
        <Badge variant="muted">
          {usage && usage.totals.calls > 0
            ? `💡 Costo calculado con tokens reales reportados por Gemini. Pricing público por modelo en backend/src/services/usage.service.ts.`
            : `💡 Aún no hay registros de uso reales. Costo se calcula como estimado a ${k ? fmtMoney(k.costPerInteractionUsd) : "$0.001"} / interacción (env EST_USD_PER_INCIDENT).`}
        </Badge>
      </div>
    </div>
  );
}


export default function ExecutivePage() {
  return (
    <RequirePermission screen="reportes" action="view">
      <ExecutivePageInner />
    </RequirePermission>
  );
}
