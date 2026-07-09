"use client";

import ClientOnly from "@/components/common/ClientOnly";

import { useEffect, useMemo, useState } from "react";
import { fetchAdvanced, fetchExecutive, fetchUsage,
  type DashboardAdvanced, type DashboardExecutive, type UsageSummary } from "@/services/dashboard.api";
import { useEventSounds } from "@/hooks/useEventSounds";

const POLL_MS = 10000;
const FORECAST_DAYS = 7;

// Regresión lineal mínimos cuadrados
function linearRegression(ys: number[]): { slope: number; intercept: number; stddev: number; r2: number } {
  if (ys.length < 2) return { slope: 0, intercept: ys[0] ?? 0, stddev: 0, r2: 0 };
  const n = ys.length;
  const xs = ys.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, _, i) => a + xs[i] * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yhat = slope * xs[i] + intercept;
    ssRes += Math.pow(ys[i] - yhat, 2);
    ssTot += Math.pow(ys[i] - meanY, 2);
  }
  const stddev = Math.sqrt(ssRes / n);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, stddev, r2 };
}

// Detectar anomalías: puntos > mean + 2·stddev
function detectAnomalies(ys: number[]): { idx: number; value: number; z: number }[] {
  if (ys.length < 4) return [];
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const stddev = Math.sqrt(ys.map((y) => Math.pow(y - mean, 2)).reduce((a, b) => a + b, 0) / ys.length);
  return ys.map((v, i) => ({ idx: i, value: v, z: stddev === 0 ? 0 : (v - mean) / stddev }))
    .filter((p) => Math.abs(p.z) >= 1.8);
}

function fmt(n: number, d = 0): string {
  return n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const day = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()];
  return `${day} ${d.getDate()}/${d.getMonth() + 1}`;
}

function nextDays(n: number): string[] {
  const arr: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

export default function ForecastPage() {
  return (
    <ClientOnly fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Cargando visualizacion...</div>}>
      <ForecastPageInner />
    </ClientOnly>
  );
}

function ForecastPageInner() {
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [now, setNow] = useState(new Date());
  const { muted, toggleMute } = useEventSounds();

  useEffect(() => {
    let alive = true;
    async function tick() {
      const [a, e, u] = await Promise.all([fetchAdvanced(), fetchExecutive(30), fetchUsage(30)]);
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

  const history = useMemo(() => adv?.timeline ?? [], [adv]);
  const incidentsSeries = useMemo(() => history.map((d) => d.incidents), [history]);
  const ticketsSeries   = useMemo(() => history.map((d) => d.tickets), [history]);
  const tokenSeries     = useMemo(() => (usage?.byDay ?? []).map((d) => d.tokens), [usage]);

  const incidentsReg = useMemo(() => linearRegression(incidentsSeries), [incidentsSeries]);
  const ticketsReg   = useMemo(() => linearRegression(ticketsSeries), [ticketsSeries]);
  const tokensReg    = useMemo(() => linearRegression(tokenSeries), [tokenSeries]);

  const anomalies = useMemo(() => detectAnomalies(incidentsSeries).map((p) => ({ ...p, day: history[p.idx]?.day })), [incidentsSeries, history]);

  const future = useMemo(() => {
    const days = nextDays(FORECAST_DAYS);
    return days.map((day, i) => {
      const x = incidentsSeries.length + i;
      const inc = Math.max(0, incidentsReg.slope * x + incidentsReg.intercept);
      const tkt = Math.max(0, ticketsReg.slope * x + ticketsReg.intercept);
      return {
        day,
        incidents: Math.round(inc),
        incidentsLow:  Math.max(0, Math.round(inc - 1.96 * incidentsReg.stddev)),
        incidentsHigh: Math.round(inc + 1.96 * incidentsReg.stddev),
        tickets:    Math.round(tkt),
      };
    });
  }, [incidentsReg, ticketsReg, incidentsSeries.length]);

  // Top 3 "next likely incidents" basado en byModule + topSystems del histórico
  const nextLikely = useMemo(() => {
    const mods = adv?.byModule ?? [];
    const sys  = adv?.topSystems ?? [];
    const total = mods.reduce((a, m) => a + m.count, 0);
    if (total === 0) return [];
    return mods.slice(0, 3).map((m, i) => {
      const s = sys[i] ?? sys[0];
      const prob = Math.round((m.count / total) * 100);
      return { module: m.key, system: s?.key ?? "—", probability: prob };
    });
  }, [adv]);

  // ===========================
  // RENDER del gráfico SVG
  // ===========================
  const W = 980, H = 280, PAD = 40;
  const allValues = [...incidentsSeries, ...future.flatMap((f) => [f.incidentsLow, f.incidentsHigh, f.incidents])];
  const max = Math.max(1, ...allValues);
  const min = 0;
  const totalPoints = incidentsSeries.length + future.length;
  const stepX = (W - PAD * 2) / Math.max(1, totalPoints - 1);

  function ptX(i: number) { return PAD + i * stepX; }
  function ptY(v: number) { return H - PAD - ((v - min) / (max - min)) * (H - PAD * 2); }

  const histPath = incidentsSeries.map((v, i) => `${i === 0 ? "M" : "L"} ${ptX(i)},${ptY(v)}`).join(" ");
  const fcStart = incidentsSeries.length - 1;
  const fcPoints = [
    { i: fcStart, v: incidentsSeries[fcStart] ?? 0 },
    ...future.map((f, i) => ({ i: fcStart + 1 + i, v: f.incidents })),
  ];
  const fcPath = fcPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${ptX(p.i)},${ptY(p.v)}`).join(" ");

  // Banda incertidumbre
  const bandTop = future.map((f, i) => `${ptX(fcStart + 1 + i)},${ptY(f.incidentsHigh)}`).join(" ");
  const bandBot = future.map((f, i) => `${ptX(fcStart + 1 + i)},${ptY(f.incidentsLow)}`).reverse().join(" ");
  const bandPath = future.length ? `M ${ptX(fcStart)},${ptY(incidentsSeries[fcStart] ?? 0)} L ${bandTop} L ${bandBot} L ${ptX(fcStart)},${ptY(incidentsSeries[fcStart] ?? 0)} Z` : "";

  const fcTotal = future.reduce((a, f) => a + f.incidents, 0);
  const histTotal = incidentsSeries.reduce((a, v) => a + v, 0);
  const trend = incidentsReg.slope;
  const trendPct = histTotal === 0 ? 0 : Math.round(((fcTotal - histTotal / incidentsSeries.length * FORECAST_DAYS) / (histTotal / incidentsSeries.length * FORECAST_DAYS || 1)) * 100);

  return (
    <div style={{
      minHeight: "calc(100vh - 80px)",
      background: "radial-gradient(circle at 50% 30%, rgba(168,85,247,0.10), #050714 70%)",
      padding: "10px 6px",
      color: "#e2e8f0",
      position: "relative",
    }}>
      <div className="row between" style={{ marginBottom: 12, padding: "0 6px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 2 }}>
            🔮 AMS FORECAST <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>· proyección IA · {FORECAST_DAYS}d</span>
          </h1>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            regresión lineal sobre {incidentsSeries.length} días reales · R² incidents = {(incidentsReg.r2).toFixed(2)} · {anomalies.length} anomalías detectadas
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button onClick={toggleMute} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>{muted ? "🔇" : "🔊"}</button>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
            <div style={{ fontSize: 20, color: "#a855f7", textShadow: "0 0 10px rgba(168,85,247,0.6)", letterSpacing: 2 }}>{now.toLocaleTimeString()}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>polling {POLL_MS / 1000}s</div>
          </div>
        </div>
      </div>

      {/* Top summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
        <Tile label="INCIDENTS·NEXT 7D" value={fcTotal} color="#a855f7" hint={`tendencia ${trend > 0 ? "+" : ""}${trend.toFixed(1)}/día`} />
        <Tile label="vs 7d previos" value={`${trendPct > 0 ? "+" : ""}${trendPct}%`} color={trendPct > 0 ? "#fa4d56" : "#10b981"} hint={trendPct > 0 ? "subida prevista" : "baja prevista"} />
        <Tile label="ANOMALÍAS" value={anomalies.length} color="#f1c21b" hint={anomalies.length ? "outliers histórico" : "sin anomalías"} />
        <Tile label="TOKENS·NEXT 7D" value={Math.round(future.length * (tokensReg.slope * tokenSeries.length + tokensReg.intercept) / 1000) + "k"} color="#06b6d4" hint={`prom histórico ${Math.round((tokenSeries.reduce((a,b)=>a+b,0)) / Math.max(1, tokenSeries.length) / 1000)}k/día`} />
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: 14, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(168,85,247,0.3)", marginBottom: 10 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "#c084fc", letterSpacing: 2 }}>▼ INCIDENTS · HISTORICAL + PROJECTION</span>
          <span style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>histórico ━━━ proyección — — — · banda 95% confidence</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="fc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#a855f7" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1={PAD} y1={PAD + p * (H - PAD * 2)} x2={W - PAD} y2={PAD + p * (H - PAD * 2)}
              stroke="rgba(255,255,255,0.04)" />
          ))}
          {/* Eje Y labels */}
          {[0, 0.5, 1].map((p, i) => (
            <text key={i} x={6} y={H - PAD - p * (H - PAD * 2) + 4} fontSize="9" fill="#64748b" letterSpacing="1">
              {Math.round(min + (max - min) * p)}
            </text>
          ))}
          {/* Línea divisoria histórico/proyección */}
          {incidentsSeries.length > 0 && (
            <line x1={ptX(fcStart)} y1={PAD} x2={ptX(fcStart)} y2={H - PAD}
              stroke="rgba(69,137,255,0.4)" strokeDasharray="3 4" strokeWidth="1.5" />
          )}
          {incidentsSeries.length > 0 && (
            <text x={ptX(fcStart)} y={PAD - 4} fontSize="9" fill="#4589ff" textAnchor="middle" letterSpacing="1.5">▼ HOY</text>
          )}
          {/* Banda incertidumbre */}
          {bandPath && <path d={bandPath} fill="url(#fc-fill)" />}
          {/* Path histórico */}
          {histPath && (
            <path d={histPath} fill="none" stroke="#60a5fa" strokeWidth="2"
              style={{ filter: "drop-shadow(0 0 4px #60a5fa)" }} />
          )}
          {/* Path proyección */}
          {fcPath && (
            <path d={fcPath} fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="5 3"
              style={{ filter: "drop-shadow(0 0 5px #a855f7)" }} />
          )}
          {/* Puntos */}
          {incidentsSeries.map((v, i) => (
            <circle key={`h${i}`} cx={ptX(i)} cy={ptY(v)} r="3" fill="#60a5fa" />
          ))}
          {future.map((f, i) => (
            <g key={`f${i}`}>
              <circle cx={ptX(fcStart + 1 + i)} cy={ptY(f.incidents)} r="3" fill="#a855f7" stroke="#fff" strokeWidth="0.6" />
              <text x={ptX(fcStart + 1 + i)} y={ptY(f.incidents) - 8} fontSize="9" fill="#c084fc" textAnchor="middle">
                {f.incidents}
              </text>
            </g>
          ))}
          {/* Anomalías marcadas */}
          {anomalies.map((a, i) => (
            <g key={`a${i}`}>
              <circle cx={ptX(a.idx)} cy={ptY(a.value)} r="8" fill="none" stroke="#fa4d56" strokeWidth="1.5" style={{ animation: "anomalyPulse 1.5s ease-out infinite" }} />
              <text x={ptX(a.idx)} y={ptY(a.value) - 14} fontSize="9" fill="#fa4d56" textAnchor="middle" fontWeight="700">!</text>
            </g>
          ))}
          {/* Eje X labels */}
          {[...history, ...future].map((d, i) => i % 3 === 0 ? (
            <text key={i} x={ptX(i)} y={H - PAD + 14} fontSize="8" fill="#64748b" textAnchor="middle">
              {dayLabel(d.day)}
            </text>
          ) : null)}
        </svg>
      </div>

      {/* Bottom row: next-likely + anomalies + tokens forecast */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div className="card" style={{ padding: 14, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(250,77,86,0.3)" }}>
          <div style={{ fontSize: 11, color: "#fca5a5", letterSpacing: 2, marginBottom: 8 }}>⚠ TOP·3 NEXT-LIKELY</div>
          {nextLikely.length === 0 && <div style={{ color: "#64748b", fontSize: 12 }}>(aún sin datos históricos)</div>}
          {nextLikely.map((nl) => (
            <div key={nl.module} className="row between" style={{ padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>{nl.module}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>sistema típico · {nl.system}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: nl.probability >= 40 ? "#fa4d56" : "#f1c21b" }}>{nl.probability}%</div>
                <div style={{ fontSize: 9, color: "#64748b" }}>prob 7d</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 14, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(241,194,27,0.3)" }}>
          <div style={{ fontSize: 11, color: "#fcd34d", letterSpacing: 2, marginBottom: 8 }}>🌡 ANOMALÍAS · HISTÓRICAS</div>
          {anomalies.length === 0 && <div style={{ color: "#64748b", fontSize: 12 }}>(sin outliers significativos)</div>}
          {anomalies.map((a, i) => (
            <div key={i} className="row between" style={{ padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>{a.day ? dayLabel(a.day) : `día ${a.idx + 1}`}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>z-score {a.z.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: a.z > 0 ? "#fa4d56" : "#06b6d4" }}>{a.value}</div>
                <div style={{ fontSize: 9, color: "#64748b" }}>incidents</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 14, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(6,182,212,0.3)" }}>
          <div style={{ fontSize: 11, color: "#67e8f9", letterSpacing: 2, marginBottom: 8 }}>💎 PROYECCIÓN · DETALLE 7D</div>
          <table style={{ width: "100%", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
            <thead>
              <tr style={{ color: "#64748b" }}>
                <th style={{ textAlign: "left", padding: "4px 0" }}>día</th>
                <th style={{ textAlign: "right" }}>inc</th>
                <th style={{ textAlign: "right" }}>min</th>
                <th style={{ textAlign: "right" }}>max</th>
                <th style={{ textAlign: "right" }}>tkt</th>
              </tr>
            </thead>
            <tbody>
              {future.map((f) => (
                <tr key={f.day} style={{ color: "#cbd5e1", borderTop: "1px dashed rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "3px 0" }}>{dayLabel(f.day)}</td>
                  <td style={{ textAlign: "right", color: "#a855f7", fontWeight: 700 }}>{f.incidents}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>{f.incidentsLow}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>{f.incidentsHigh}</td>
                  <td style={{ textAlign: "right", color: "#f1c21b" }}>{f.tickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>
            modelo: regresión lineal {fmt(incidentsReg.slope, 3)}·x + {fmt(incidentsReg.intercept, 2)} · stddev {fmt(incidentsReg.stddev, 2)}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes anomalyPulse {
          0%   { r: 8; opacity: 1; }
          100% { r: 20; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Tile({ label, value, color, hint }: { label: string; value: string | number; color: string; hint?: string }) {
  return (
    <div className="card" style={{ padding: 14, background: "rgba(15,23,42,0.7)", border: `1px solid ${color}55`, borderLeftWidth: 3 }}>
      <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${color}55` }}>{value}</div>
      {hint && <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
