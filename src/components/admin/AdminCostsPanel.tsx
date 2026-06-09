"use client";

// =============================================================================
// AdminCostsPanel — Panel de costos Gemini (v0.14.12)
// =============================================================================
// Muestra al admin del AMS Platform:
//   - 4 tiles: gasto hoy/semana/mes/total (USD + CLP)
//   - Estado del rate limiter (calls remaining hoy/hora/min)
//   - Gráfica diaria últimos 30 días (sparkline simple)
//   - Tabla breakdown por modelo
//   - Alerta visible si rate limiter > 80% del cap
//
// Defensivo: si el backend no responde o tabla agent_usage está vacía,
// muestra ceros sin romper. Auto-refresh cada 30s.
// =============================================================================

import { useEffect, useState } from "react";
import {
  fetchAdminUsageSummary,
  type UsageSummaryResponse,
} from "@/services/admin-usage.api";

function formatUSD(n: number): string {
  return `$${n.toFixed(4)}`;
}

function formatCLP(n: number): string {
  return `CLP ${n.toLocaleString("es-CL")}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

interface TileProps {
  label: string;
  calls: number;
  usd: number;
  clp: number;
  highlight?: boolean;
}

function CostTile({ label, calls, usd, clp, highlight }: TileProps) {
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderLeft: `4px solid ${highlight ? "#22d3ee" : "#64748b"}`,
        minWidth: 160,
        flex: "1 1 180px",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? "#22d3ee" : "var(--text)" }}>
        {formatCLP(clp)}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
        {formatUSD(usd)} · {formatNumber(calls)} calls
      </div>
    </div>
  );
}

function RateLimiterStrip({ rl }: { rl: UsageSummaryResponse["rateLimiter"] }) {
  const dayPct = (rl.current.day / rl.caps.day) * 100;
  const hourPct = (rl.current.hour / rl.caps.hour) * 100;
  const minPct = (rl.current.minute / rl.caps.minute) * 100;
  const warn = dayPct > 80 || hourPct > 80;
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderLeft: `4px solid ${warn ? "#f59e0b" : "#10b981"}`,
        marginBottom: 14,
      }}
    >
      <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>
            RATE LIMITER LOCAL · {rl.enabled ? "ACTIVO" : "DESHABILITADO"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            🛡️ Defensa anti-cobros: 3 ventanas
          </div>
        </div>
        {warn && (
          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              background: "rgba(245,158,11,0.15)",
              border: "1px solid #f59e0b",
              borderRadius: 4,
              color: "#f59e0b",
              fontWeight: 600,
            }}
          >
            ⚠ Cap se acerca
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5 }}>
        {(["minute", "hour", "day"] as const).map((w) => {
          const cur = rl.current[w];
          const cap = rl.caps[w];
          const pct = Math.min(100, (cur / cap) * 100);
          const color = pct > 80 ? "#f59e0b" : pct > 50 ? "#22d3ee" : "#10b981";
          return (
            <div key={w} style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "var(--text-soft)" }}>{w}</span>
                <span style={{ color }}>{cur} / {cap}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(100,116,139,0.2)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyChart({ daily }: { daily: UsageSummaryResponse["daily"] }) {
  if (!daily.length) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-dim)", padding: 14, textAlign: "center" }}>
        Sin datos de los últimos 30 días.
      </div>
    );
  }
  const max = Math.max(...daily.map((d) => d.clp), 1);
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        GASTO DIARIO (CLP) · ÚLTIMOS {daily.length} DÍAS
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, marginBottom: 6 }}>
        {daily.map((d) => {
          const pct = (d.clp / max) * 100;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${formatCLP(d.clp)} · ${d.calls} calls`}
              style={{
                flex: 1,
                minWidth: 2,
                height: `${Math.max(2, pct)}%`,
                background: "linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)",
                borderRadius: "2px 2px 0 0",
                cursor: "help",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)" }}>
        <span>{daily[0]?.date}</span>
        <span>máx: {formatCLP(max)}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function ModelTable({ byModel }: { byModel: UsageSummaryResponse["byModel"] }) {
  if (!byModel.length) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-dim)", padding: 14, textAlign: "center" }}>
        Sin datos por modelo.
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        BREAKDOWN POR MODELO
      </div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-soft)", textAlign: "left" }}>
            <th style={{ padding: 6 }}>Modelo</th>
            <th style={{ padding: 6, textAlign: "right" }}>Calls</th>
            <th style={{ padding: 6, textAlign: "right" }}>USD</th>
            <th style={{ padding: 6, textAlign: "right" }}>CLP</th>
          </tr>
        </thead>
        <tbody>
          {byModel.map((m) => (
            <tr key={m.model} style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <td style={{ padding: 6, fontFamily: "monospace", color: "var(--text)" }}>{m.model}</td>
              <td style={{ padding: 6, textAlign: "right" }}>{formatNumber(m.calls)}</td>
              <td style={{ padding: 6, textAlign: "right", color: "var(--text-soft)" }}>{formatUSD(m.usd)}</td>
              <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{formatCLP(m.clp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminCostsPanel() {
  const [data, setData] = useState<UsageSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const summary = await fetchAdminUsageSummary();
      setData(summary);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return <div style={{ padding: 20, color: "var(--text-dim)" }}>Cargando métricas de costo…</div>;
  }
  if (error && !data) {
    return (
      <div className="alert error" style={{ padding: 14, fontSize: 12 }}>
        ⚠ No se pudo cargar el resumen: {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>💰 Costos del Agente AMS</h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Gasto real de Gemini API · {data.totals.all.calls.toLocaleString("es-CL")} calls totales · Última: {data.meta.lastCallAt ? new Date(data.meta.lastCallAt).toLocaleString("es-CL") : "—"} · Tipo cambio: $1 USD = CLP {data.meta.clpPerUsd}
        </p>
      </div>

      {/* 4 tiles principales */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <CostTile label="Hoy" calls={data.totals.today.calls} usd={data.totals.today.usd} clp={data.totals.today.clp} highlight />
        <CostTile label="Última semana" calls={data.totals.week.calls} usd={data.totals.week.usd} clp={data.totals.week.clp} />
        <CostTile label="Último mes" calls={data.totals.month.calls} usd={data.totals.month.usd} clp={data.totals.month.clp} />
        <CostTile label="Total histórico" calls={data.totals.all.calls} usd={data.totals.all.usd} clp={data.totals.all.clp} />
      </div>

      <RateLimiterStrip rl={data.rateLimiter} />
      <DailyChart daily={data.daily} />
      <ModelTable byModel={data.byModel} />

      <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>
        Auto-refresh cada 30s · {error ? `⚠ último refresh falló: ${error}` : "ok"}
      </div>
    </div>
  );
}
