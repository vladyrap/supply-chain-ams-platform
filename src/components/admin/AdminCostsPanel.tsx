"use client";

// =============================================================================
// AdminCostsPanel ULTIMATE — Dashboard nivel S+++ de costos Gemini (v0.14.14)
// =============================================================================
// 14 widgets de telemetría, IA predictiva, salud y recomendaciones:
//   v0.14.13 (mantenidos):
//     1. 4 tiles + tendencias %
//     2. Forecast con confidence
//     3. Savings flash-lite
//     4. Anomalies
//     5. Rate limiter
//     6. Heatmap horario
//     7. Sparkline diario
//     8. Tabla modelos
//     9. Tabla sources
//   v0.14.14 NUEVO:
//    10. 🩺 Health Score circular ring 0-100 con dimensiones
//    11. 🎯 Recommendations panel con sugerencias accionables
//    12. 🔥 Burn rate widget (última hora vs previa)
//    13. 🎟️ Token breakdown (input vs output con %)
//    14. 📊 Cost distribution histogram (micro→large)
//    15. 📅 Same-day-last-week comparison
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import {
  fetchAdminUsageSummary, dailyToCsv, downloadCsv,
  type UsageSummaryResponse, type UsageDelta, type UsageHeatmapHour,
  type UsageHealth, type UsageRecommendation,
} from "@/services/admin-usage.api";

const fmtUSD = (n: number) => `$${n.toFixed(4)}`;
const fmtCLP = (n: number) => `CLP ${n.toLocaleString("es-CL")}`;
const fmtNum = (n: number) => n.toLocaleString("es-CL");

const HEALTH_COLORS = {
  excellent: "#10b981",
  good: "#22d3ee",
  watch: "#f59e0b",
  warning: "#fb923c",
  critical: "#ef4444",
} as const;

const PRIORITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22d3ee",
} as const;

const CATEGORY_ICONS = {
  savings: "💸",
  performance: "⚡",
  safety: "🛡️",
  ops: "🔧",
} as const;

// ============================================================================
// 🩺 HEALTH SCORE RING (circular SVG)
// ============================================================================
function HealthScoreRing({ health }: { health: UsageHealth }) {
  const color = HEALTH_COLORS[health.status];
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (health.score / 100) * circumference;
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 320px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        🩺 HEALTH SCORE
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          <circle cx={60} cy={60} r={45} fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth={10} />
          <circle cx={60} cy={60} r={45} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 0.5s, stroke 0.5s" }}
          />
          <text x={60} y={62} textAnchor="middle" fill={color} fontSize={26} fontWeight={700}>{health.score}</text>
          <text x={60} y={80} textAnchor="middle" fill="var(--text-dim)" fontSize={9} letterSpacing={1}>/100</text>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {health.status}
          </div>
          {health.dimensions.map((d) => (
            <div key={d.name} style={{ marginBottom: 4, fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-soft)" }}>{d.name} <span style={{ color: "var(--text-dim)", fontSize: 9 }}>×{d.weight}</span></span>
                <span style={{ fontWeight: 600, color: d.score >= 80 ? "#10b981" : d.score >= 60 ? "#f59e0b" : "#ef4444" }}>{d.score}</span>
              </div>
              <div style={{ fontSize: 9.5, color: "var(--text-dim)", fontStyle: "italic" }}>{d.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🎯 RECOMMENDATIONS PANEL
// ============================================================================
function RecommendationsPanel({ recs }: { recs: UsageRecommendation[] }) {
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 380px", borderLeft: "4px solid #a855f7" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        🎯 RECOMENDACIONES INTELIGENTES · {recs.length}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recs.map((r) => {
          const color = PRIORITY_COLORS[r.priority];
          const icon = CATEGORY_ICONS[r.category];
          return (
            <div key={r.id} style={{
              padding: 10, borderRadius: 6, background: `${color}11`, border: `1px solid ${color}44`,
            }}>
              <div className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ alignItems: "flex-start", gap: 4 }}>
                    <strong style={{ fontSize: 12, color, lineHeight: 1.3 }}>{r.title}</strong>
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 3,
                      background: color, color: "#fff", fontWeight: 700, flexShrink: 0,
                    }}>{r.priority.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.4 }}>
                    {r.description}
                  </div>
                  {r.estimatedSavingClp ? (
                    <div style={{ fontSize: 10, color: "#10b981", marginTop: 4, fontWeight: 600 }}>
                      💰 Ahorro estimado: CLP {r.estimatedSavingClp.toLocaleString("es-CL")}/mes
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 🔥 BURN RATE WIDGET
// ============================================================================
function BurnRateWidget({ br }: { br: UsageSummaryResponse["burnRate"] }) {
  const arrow = br.deltaPct > 5 ? "↑" : br.deltaPct < -5 ? "↓" : "→";
  const color = br.deltaPct > 50 ? "#ef4444" : br.deltaPct > 0 ? "#f59e0b" : "#10b981";
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #fb923c" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 4 }}>
        🔥 BURN RATE · ÚLTIMA HORA
      </div>
      <div className="row" style={{ gap: 12, alignItems: "baseline" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#fb923c" }}>{br.lastHourCalls}</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>calls</div>
        <div style={{ fontSize: 12, color, fontWeight: 600, marginLeft: "auto" }}>
          {arrow} {Math.abs(br.deltaPct)}% vs hora previa
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 4 }}>
        {fmtUSD(br.lastHourUsd)} consumido · Si sigue así: <strong style={{ color: "var(--text)" }}>{fmtCLP(br.estimateNext24hClp)}/día</strong>
      </div>
    </div>
  );
}

// ============================================================================
// 🎟️ TOKEN BREAKDOWN (input vs output)
// ============================================================================
function TokensWidget({ tokens }: { tokens: UsageSummaryResponse["tokens"] }) {
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #22d3ee" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 6 }}>
        🎟️ TOKENS TOTALES · {fmtNum(tokens.total)}
      </div>
      <div style={{ display: "flex", height: 24, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
        <div title={`Input: ${fmtNum(tokens.input)} (${tokens.inputPct}%)`}
          style={{ width: `${tokens.inputPct}%`, background: "linear-gradient(90deg, #0891b2, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 600 }}>
          IN {tokens.inputPct}%
        </div>
        <div title={`Output: ${fmtNum(tokens.output)} (${tokens.outputPct}%)`}
          style={{ width: `${tokens.outputPct}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 600 }}>
          OUT {tokens.outputPct}%
        </div>
      </div>
      <div className="row between" style={{ fontSize: 11 }}>
        <span style={{ color: "#22d3ee" }}>● Input: {fmtNum(tokens.input)} tok · {fmtUSD(tokens.inputUsd)}</span>
        <span style={{ color: "#a855f7" }}>● Output: {fmtNum(tokens.output)} tok · {fmtUSD(tokens.outputUsd)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// 📅 SAME DAY LAST WEEK
// ============================================================================
function SameDayWidget({ data }: { data: UsageSummaryResponse["sameDayLastWeek"] }) {
  const arrow = data.delta.direction === "up" ? "↑" : data.delta.direction === "down" ? "↓" : "→";
  const color = data.delta.direction === "up" ? "#ef4444" : data.delta.direction === "down" ? "#10b981" : "#94a3b8";
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #0891b2" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 6 }}>
        📅 HOY vs MISMO DÍA SEMANA PASADA
      </div>
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>HOY</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#22d3ee" }}>{fmtCLP(data.today.clp)}</div>
          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{data.today.calls} calls</div>
        </div>
        <div style={{ fontSize: 18, color, fontWeight: 700 }}>
          {arrow} {Math.abs(data.delta.pct)}%
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{data.sameDayLastWeek.date}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-soft)" }}>{fmtCLP(data.sameDayLastWeek.clp)}</div>
          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{data.sameDayLastWeek.calls} calls</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 📊 HISTOGRAM (cost distribution)
// ============================================================================
function HistogramWidget({ hist }: { hist: UsageSummaryResponse["histogram"] }) {
  if (!hist.length) return null;
  const maxCalls = Math.max(...hist.map((h) => h.calls), 1);
  const labels: Record<string, string> = {
    micro: "micro (<$0.0005)",
    tiny: "tiny ($0.001)",
    small: "small ($0.002)",
    medium: "medium ($0.005)",
    large: "large (>$0.005)",
  };
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 360px" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        📊 DISTRIBUCIÓN COSTO POR CALL
      </div>
      {hist.map((h) => {
        const pct = (h.calls / maxCalls) * 100;
        return (
          <div key={h.bucket} style={{ marginBottom: 5, fontSize: 11 }}>
            <div className="row between" style={{ marginBottom: 2 }}>
              <span style={{ color: "var(--text-soft)" }}>{labels[h.bucket] || h.bucket}</span>
              <span style={{ color: "var(--text)" }}>{fmtNum(h.calls)} ({h.pct}%)</span>
            </div>
            <div style={{ height: 10, borderRadius: 3, background: "rgba(100,116,139,0.2)", overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%",
                background: h.bucket === "large" ? "#ef4444" : h.bucket === "medium" ? "#f59e0b" : "#22d3ee",
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// HELPERS REUSADOS de v0.14.13
// ============================================================================
function DeltaBadge({ delta }: { delta: UsageDelta }) {
  const color = delta.direction === "up" ? "#ef4444" : delta.direction === "down" ? "#10b981" : "#94a3b8";
  const arrow = delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→";
  return (
    <span style={{
      fontSize: 11, padding: "2px 6px", borderRadius: 3,
      background: `${color}22`, color, fontWeight: 600, border: `1px solid ${color}44`,
    }}>{arrow} {Math.abs(delta.pct)}%</span>
  );
}

function CostTile({ label, calls, clp, usd, delta, highlight }: {
  label: string; calls: number; clp: number; usd: number; delta?: UsageDelta; highlight?: boolean;
}) {
  return (
    <div className="card" style={{
      padding: 14, borderLeft: `4px solid ${highlight ? "#22d3ee" : "#64748b"}`,
      minWidth: 180, flex: "1 1 200px",
    }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>{label.toUpperCase()}</span>
        {delta ? <DeltaBadge delta={delta} /> : null}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? "#22d3ee" : "var(--text)" }}>
        {fmtCLP(clp)}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
        {fmtUSD(usd)} · {fmtNum(calls)} calls
      </div>
    </div>
  );
}

function ForecastWidget({ forecast }: { forecast: UsageSummaryResponse["forecast"] }) {
  const confColor = forecast.confidence === "high" ? "#10b981" : forecast.confidence === "medium" ? "#22d3ee" : "#f59e0b";
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #a855f7" }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>🔮 FORECAST FIN DE MES</span>
        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${confColor}22`, color: confColor, fontWeight: 600 }}>
          {forecast.confidence.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#a855f7" }}>{fmtCLP(forecast.eomClp)}</div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
        {fmtUSD(forecast.eomUsd)} · ~{fmtNum(forecast.eomCalls)} calls
      </div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>
        Basado en últimos {forecast.basedOnDays} días
      </div>
    </div>
  );
}

function SavingsWidget({ savings }: { savings: UsageSummaryResponse["savings"] }) {
  const s = savings.ifAllFlashLite;
  if (s.savedClp === 0) {
    return (
      <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #64748b" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>💸 AHORRO POTENCIAL</div>
        <div style={{ fontSize: 14, color: "var(--text-soft)", marginTop: 6 }}>Ya optimizado.</div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #10b981" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>💸 AHORRO POTENCIAL (flash-lite)</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>
        {fmtCLP(s.savedClp)} <span style={{ fontSize: 14 }}>(-{s.savedPct}%)</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
        Pasarías a {fmtCLP(s.monthClp)}/mes
      </div>
    </div>
  );
}

function RateLimiterStrip({ rl }: { rl: UsageSummaryResponse["rateLimiter"] }) {
  const warn = (rl.current.day / rl.caps.day) > 0.8 || (rl.current.hour / rl.caps.hour) > 0.8;
  return (
    <div className="card" style={{ padding: 14, borderLeft: `4px solid ${warn ? "#f59e0b" : "#10b981"}`, marginBottom: 14 }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>
            🛡️ RATE LIMITER LOCAL · {rl.enabled ? "ACTIVO" : "DESHABILITADO"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>3 ventanas anti-cobros</div>
        </div>
        {warn ? (
          <span style={{ fontSize: 11, padding: "4px 10px", background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b", borderRadius: 4, color: "#f59e0b", fontWeight: 600 }}>⚠ Cap próximo</span>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5 }}>
        {(["minute", "hour", "day"] as const).map((w) => {
          const cur = rl.current[w], cap = rl.caps[w];
          const pct = Math.min(100, (cur / cap) * 100);
          const color = pct > 80 ? "#f59e0b" : pct > 50 ? "#22d3ee" : "#10b981";
          return (
            <div key={w} style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "var(--text-soft)" }}>por {w === "minute" ? "minuto" : w === "hour" ? "hora" : "día"}</span>
                <span style={{ color, fontWeight: 600 }}>{cur} / {cap}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(100,116,139,0.2)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Heatmap({ heatmap }: { heatmap: UsageHeatmapHour[] }) {
  const max = Math.max(...heatmap.map((h) => h.calls), 1);
  const peak = heatmap.reduce((p, c) => c.calls > p.calls ? c : p, heatmap[0]);
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        🔥 HEATMAP HORARIO · ÚLTIMOS 7 DÍAS (24h)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2, marginBottom: 6 }}>
        {heatmap.map((h) => {
          const intensity = h.calls / max;
          const bg = h.calls === 0 ? "rgba(100,116,139,0.15)" : `rgba(34,211,238,${0.2 + intensity * 0.8})`;
          return (
            <div key={h.hour} title={`${h.hour}h: ${h.calls} calls · ${fmtCLP(h.clp)}`}
              style={{
                height: 32, background: bg, borderRadius: 3, cursor: "help",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: intensity > 0.5 ? "white" : "var(--text-dim)", fontWeight: 600,
              }}>{h.hour}</div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
        <span>00h</span>
        <span>pico: {peak.hour}h ({peak.calls} calls)</span>
        <span>23h</span>
      </div>
    </div>
  );
}

function DailyChart({ daily }: { daily: UsageSummaryResponse["daily"] }) {
  if (!daily.length) return null;
  const max = Math.max(...daily.map((d) => d.clp), 1);
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
        📈 GASTO DIARIO · ÚLTIMOS {daily.length} DÍAS · 🔴 = anomalía
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100, marginBottom: 6 }}>
        {daily.map((d) => {
          const pct = (d.clp / max) * 100;
          return (
            <div key={d.date} title={`${d.date}: ${fmtCLP(d.clp)} · ${d.calls} calls${d.isAnomaly ? " · ⚠ ANOMALÍA" : ""}`}
              style={{
                flex: 1, minWidth: 2, height: `${Math.max(2, pct)}%`,
                background: d.isAnomaly
                  ? "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)"
                  : "linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)",
                borderRadius: "2px 2px 0 0", cursor: "help",
              }}/>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)" }}>
        <span>{daily[0]?.date}</span>
        <span>máx día: {fmtCLP(max)}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function AnomalyList({ anomalies }: { anomalies: UsageSummaryResponse["anomalies"] }) {
  if (!anomalies.length) {
    return (
      <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #10b981" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>🚨 ANOMALÍAS</div>
        <div style={{ fontSize: 13, color: "#10b981", marginTop: 6 }}>✓ Sin anomalías</div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 14, flex: "1 1 280px", borderLeft: "4px solid #ef4444" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 6 }}>
        🚨 {anomalies.length} ANOMALÍA{anomalies.length === 1 ? "" : "S"} (μ+2σ)
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5 }}>
        {anomalies.map((a) => (
          <li key={a.date} style={{ marginBottom: 3 }}>
            <strong>{a.date}</strong> · {fmtUSD(a.usd)} · <span style={{ color: "#ef4444" }}>{a.deviation}σ</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelTable({ byModel }: { byModel: UsageSummaryResponse["byModel"] }) {
  if (!byModel.length) return null;
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>🤖 POR MODELO</div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-soft)", textAlign: "left" }}>
            <th style={{ padding: 6 }}>Modelo</th>
            <th style={{ padding: 6, textAlign: "right" }}>Calls</th>
            <th style={{ padding: 6, textAlign: "right" }}>CLP</th>
            <th style={{ padding: 6, textAlign: "right" }}>%</th>
          </tr>
        </thead>
        <tbody>
          {byModel.map((m) => (
            <tr key={m.model} style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <td style={{ padding: 6, fontFamily: "monospace" }}>{m.model}</td>
              <td style={{ padding: 6, textAlign: "right" }}>{fmtNum(m.calls)}</td>
              <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmtCLP(m.clp)}</td>
              <td style={{ padding: 6, textAlign: "right" }}>
                <div style={{ position: "relative", height: 14, background: "rgba(100,116,139,0.2)", borderRadius: 3 }}>
                  <div style={{ width: `${m.pctOfTotal}%`, height: "100%", background: "#22d3ee", borderRadius: 3 }} />
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 600 }}>
                    {m.pctOfTotal}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourcesTable({ sources }: { sources: UsageSummaryResponse["topSources"] }) {
  if (!sources.length) return null;
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>🎯 TOP SOURCES · 30D</div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-soft)", textAlign: "left" }}>
            <th style={{ padding: 6 }}>Source</th>
            <th style={{ padding: 6, textAlign: "right" }}>Calls</th>
            <th style={{ padding: 6, textAlign: "right" }}>CLP</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source} style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <td style={{ padding: 6, fontFamily: "monospace", color: "var(--text-soft)" }}>{s.source}</td>
              <td style={{ padding: 6, textAlign: "right" }}>{fmtNum(s.calls)}</td>
              <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmtCLP(s.clp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 14 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card" style={{
          padding: 14, minWidth: 180, flex: "1 1 200px", height: 100,
          background: "linear-gradient(90deg, rgba(100,116,139,0.05), rgba(100,116,139,0.15), rgba(100,116,139,0.05))",
          backgroundSize: "200% 100%", animation: "amsPulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================
export default function AdminCostsPanel() {
  const [data, setData] = useState<UsageSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const summary = await fetchAdminUsageSummary();
      setData(summary);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  function handleExport() {
    if (!data) return;
    const csv = dailyToCsv(data.daily);
    downloadCsv(`ams-gemini-usage-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  if (loading && !data) return <SkeletonGrid />;
  if (error && !data) {
    return (
      <div style={{ padding: 14 }}>
        <div className="alert error" style={{ padding: 14, fontSize: 12 }}>⚠ No se pudo cargar: {error}</div>
        <button className="btn primary" onClick={refresh} style={{ marginTop: 10 }}>🔁 Reintentar</button>
      </div>
    );
  }
  if (!data) return null;

  const recent = data.meta.lastCallAt
    ? Date.now() - new Date(data.meta.lastCallAt).getTime() < 60_000 * 5
    : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14 }}>
      {/* Header */}
      <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            💰 Costos del Agente AMS
            <span style={{
              marginLeft: 8, fontSize: 11, padding: "3px 8px", borderRadius: 12,
              background: recent ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.2)",
              color: recent ? "#10b981" : "#94a3b8", fontWeight: 600,
              border: `1px solid ${recent ? "#10b981" : "#64748b"}55`,
            }}>
              {recent ? "● LIVE" : "○ inactivo"}
            </span>
            <span style={{
              marginLeft: 8, fontSize: 10, padding: "3px 8px", borderRadius: 12,
              background: "rgba(168,85,247,0.2)", color: "#a855f7",
              fontWeight: 600, fontFamily: "monospace",
            }}>v{data.meta.version}</span>
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {fmtNum(data.totals.all.calls)} calls totales · Última: {data.meta.lastCallAt ? new Date(data.meta.lastCallAt).toLocaleString("es-CL") : "—"} · USD→CLP: ${data.meta.clpPerUsd} · {fmtNum(data.tokens.total)} tokens totales
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn ghost sm" onClick={refresh} style={{ fontSize: 11 }}>🔁 Refresh</button>
          <button className="btn ghost sm" onClick={handleExport} style={{ fontSize: 11 }}>📥 CSV</button>
        </div>
      </div>

      {/* Fila 1: Health Score + Recommendations (juntos arriba) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <HealthScoreRing health={data.health} />
        <RecommendationsPanel recs={data.recommendations} />
      </div>

      {/* Fila 2: 4 tiles principales con tendencias */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <CostTile label="Hoy" calls={data.totals.today.calls} clp={data.totals.today.clp} usd={data.totals.today.usd} highlight />
        <CostTile label="Semana" calls={data.totals.week.calls} clp={data.totals.week.clp} usd={data.totals.week.usd} delta={data.trends.weekVsPrev} />
        <CostTile label="Mes" calls={data.totals.month.calls} clp={data.totals.month.clp} usd={data.totals.month.usd} delta={data.trends.monthVsPrev} />
        <CostTile label="Total histórico" calls={data.totals.all.calls} clp={data.totals.all.clp} usd={data.totals.all.usd} />
      </div>

      {/* Fila 3: Burn rate + Tokens + Same-day-last-week */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <BurnRateWidget br={data.burnRate} />
        <TokensWidget tokens={data.tokens} />
        <SameDayWidget data={data.sameDayLastWeek} />
      </div>

      {/* Fila 4: Forecast + Savings + Anomalies */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <ForecastWidget forecast={data.forecast} />
        <SavingsWidget savings={data.savings} />
        <AnomalyList anomalies={data.anomalies} />
      </div>

      {/* Strip rate limiter */}
      <RateLimiterStrip rl={data.rateLimiter} />

      {/* Heatmap */}
      <Heatmap heatmap={data.heatmap} />

      {/* Daily chart */}
      <DailyChart daily={data.daily} />

      {/* Fila 5: tablas + histogram */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px" }}><ModelTable byModel={data.byModel} /></div>
        <div style={{ flex: "1 1 360px" }}><SourcesTable sources={data.topSources} /></div>
        <div style={{ flex: "1 1 360px" }}><HistogramWidget hist={data.histogram} /></div>
      </div>

      <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>
        Cache backend: {data.meta.ttlSeconds}s · Refresh local: 30s · Último OK: {lastRefresh?.toLocaleTimeString("es-CL") ?? "—"}{error ? ` · ⚠ ${error}` : ""}
      </div>
    </div>
  );
}
