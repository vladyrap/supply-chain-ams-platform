"use client";

// =============================================================================
// AdminRoiPanel — ROI del Agente: Valor Económico ÷ Costo Gemini (v0.14.16)
// =============================================================================
// Combina:
//   - Costos REALES de Gemini (desde /api/admin/usage/summary)
//   - Valor económico estimado (calculateBusinessValue con conteos editables)
//
// Output: ROI ratio, payback, eficiencia $/calls, comparativa visual.
//
// "Por cada $1 USD que pagás de Gemini, el agente te ahorra $X USD en horas
//  de soporte humano evitadas."
// =============================================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchAdminUsageSummary, type UsageSummaryResponse } from "@/services/admin-usage.api";
import { calculateBusinessValue, type BusinessValueInput } from "@/utils/business-value-engine";

const fmtUSD = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCLP = (n: number) => `CLP ${Math.round(n).toLocaleString("es-CL")}`;
const fmtNum = (n: number) => n.toLocaleString("es-CL");

// Valores DEFAULT por mes (estimación demo). User puede editar.
const DEFAULT_INPUTS: BusinessValueInput = {
  ticketsAssistedByIa: 50,
  rcasGenerated: 5,
  meetingMinutesGenerated: 8,
  testCasesGenerated: 20,
  knowledgeConversions: 10,
  avoidedEscalations: 3,
  documentsGenerated: 12,
};

function NumInput({ label, value, onChange, suffix }: {
  label: string; value: number; onChange: (n: number) => void; suffix?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 140px", minWidth: 0, fontSize: 11 }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <input type="number" min={0} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{
          padding: "6px 8px", fontSize: 12, background: "rgba(100,116,139,0.1)",
          border: "1px solid var(--border-soft)", borderRadius: 4, color: "var(--text)",
        }}/>
      {suffix && <span style={{ fontSize: 9, color: "var(--text-dim)" }}>{suffix}</span>}
    </label>
  );
}

export default function AdminRoiPanel() {
  const [costs, setCosts] = useState<UsageSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<BusinessValueInput>(DEFAULT_INPUTS);
  const [hourlyCost, setHourlyCost] = useState(60);

  // FIX M9 (audit v1.1.0): AbortController para que el siguiente interval
  // pueda cancelar un fetch lento y evitar requests encolados.
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchAdminUsageSummary(signal);
      setCosts(data);
      setError(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controllers = new Set<AbortController>();
    const run = () => {
      const ctl = new AbortController();
      controllers.add(ctl);
      refresh(ctl.signal).finally(() => controllers.delete(ctl));
    };
    run();
    const id = setInterval(() => {
      // Cancelar pendientes antes del próximo
      for (const c of controllers) c.abort();
      controllers.clear();
      if (!cancelled) run();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      for (const c of controllers) c.abort();
      controllers.clear();
    };
  }, [refresh]);

  const valueCalc = useMemo(
    () => calculateBusinessValue({ ...inputs, hourlyCostUsd: hourlyCost }),
    [inputs, hourlyCost],
  );

  // Cálculos de ROI
  // FIX M10 (audit v1.1.0): NO inventar 0.001 si el costo real es 0.
  // Si el mes es $0 (sin datos / no se llamó nunca a Gemini) → mostrar "—"
  // en la UI. ROI ratio queda null para que el componente lo skipee.
  const roi = useMemo(() => {
    const monthCostUsd = costs?.totals.month.usd ?? 0;
    const monthCostClp = costs?.totals.month.clp ?? 0;
    const hasCost = monthCostUsd > 0;
    const valueMinUsd = valueCalc.costAvoidedUsd.min;
    const valueMaxUsd = valueCalc.costAvoidedUsd.max;
    const valueAvgUsd = (valueMinUsd + valueMaxUsd) / 2;
    const valueAvgClp = Math.round(valueAvgUsd * (costs?.meta.clpPerUsd ?? 950));
    const roiMinX = hasCost ? valueMinUsd / monthCostUsd : null;
    const roiMaxX = hasCost ? valueMaxUsd / monthCostUsd : null;
    const roiAvgX = hasCost ? valueAvgUsd / monthCostUsd : null;
    // Payback en días: cuánto le toma al valor generado cubrir el costo del mes
    const dailyValueUsd = valueAvgUsd / 30;
    const paybackDays = hasCost && dailyValueUsd > 0 ? monthCostUsd / dailyValueUsd : null;
    return {
      monthCostUsd, monthCostClp, hasCost,
      valueMinUsd, valueMaxUsd, valueAvgUsd, valueAvgClp,
      roiMinX, roiMaxX, roiAvgX,
      paybackDays,
      netGainClpAvg: hasCost ? valueAvgClp - monthCostClp : null,
    };
  }, [costs, valueCalc]);

  if (loading && !costs) {
    return <div style={{ padding: 20, color: "var(--text-dim)" }}>Cargando datos de costos...</div>;
  }
  if (error && !costs) {
    return (
      <div className="alert error" style={{ padding: 14, margin: 14 }}>
        ⚠ No se pudo cargar costos: {error}
      </div>
    );
  }
  if (!costs) return null;

  // FIX M10: si roiAvgX es null (costo=0), color neutral.
  const roiColor =
    roi.roiAvgX == null ? "#64748b" :
    roi.roiAvgX >= 100 ? "#10b981" :
    roi.roiAvgX >= 10 ? "#4589ff" :
    roi.roiAvgX >= 1 ? "#f59e0b" : "#fa4d56";
  const fmtRoi = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("es-CL", { maximumFractionDigits: 0 }) + "×";
  const fmtRoiBare = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("es-CL", { maximumFractionDigits: 0 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          📈 ROI del Agente AMS
          <span style={{
            marginLeft: 8, fontSize: 11, padding: "3px 8px", borderRadius: 12,
            background: "rgba(168,85,247,0.2)", color: "#a855f7",
            fontWeight: 600, fontFamily: "monospace",
          }}>v0.14.16</span>
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Combina costos REALES de Gemini ({fmtCLP(roi.monthCostClp)}/mes) con valor económico estimado del trabajo automatizado.
        </p>
      </div>

      {/* HERO ROI */}
      <div className="card" style={{
        padding: 20, borderLeft: `4px solid ${roiColor}`,
        background: `linear-gradient(135deg, ${roiColor}11 0%, transparent 100%)`,
      }}>
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 4 }}>
              💎 ROI DEL AGENTE · ESTE MES
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, color: roiColor, lineHeight: 1 }}>
              {fmtRoi(roi.roiAvgX)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>
              Rango: {fmtRoi(roi.roiMinX)} — {fmtRoi(roi.roiMaxX)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
              {roi.hasCost ? (
                <>Por cada <span style={{ color: "#fa4d56" }}>$1 USD</span> en Gemini, generás <span style={{ color: "#10b981" }}>${fmtRoiBare(roi.roiAvgX)} USD</span> en valor.</>
              ) : (
                <span style={{ color: "var(--text-dim)" }}>Sin costos Gemini este mes — ROI no calculable.</span>
              )}
            </div>
          </div>
          <div style={{ minWidth: 240, textAlign: "right" }}>
            <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>GANANCIA NETA / MES</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: (roi.netGainClpAvg ?? 0) > 0 ? "#10b981" : "#64748b" }}>
              {roi.netGainClpAvg == null ? "—" : fmtCLP(roi.netGainClpAvg)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
              Payback: <strong style={{ color: "var(--text)" }}>{roi.paybackDays == null ? "—" : `${roi.paybackDays.toFixed(1)} días`}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativa Costo vs Valor */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 10 }}>
          ⚖️ COSTO vs VALOR · ESTE MES (USD)
        </div>
        <div style={{ display: "flex", height: 80, gap: 14, alignItems: "flex-end" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Costo Gemini</div>
            <div style={{
              height: "20%", minHeight: 8, background: "linear-gradient(180deg, #fa4d56, #b91c1c)",
              borderRadius: "4px 4px 0 0", marginInline: "20%",
            }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fa4d56", marginTop: 4 }}>
              {fmtUSD(roi.monthCostUsd)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{fmtCLP(roi.monthCostClp)}</div>
          </div>
          <div style={{ fontSize: 30, color: "var(--text-dim)", alignSelf: "center" }}>vs</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Valor generado (estimado)</div>
            <div style={{
              height: "100%", background: "linear-gradient(180deg, #10b981, #047857)",
              borderRadius: "4px 4px 0 0", marginInline: "20%",
            }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981", marginTop: 4 }}>
              {fmtUSD(roi.valueAvgUsd)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{fmtCLP(roi.valueAvgClp)}</div>
          </div>
        </div>
      </div>

      {/* Configurador de inputs */}
      <div className="card" style={{ padding: 14 }}>
        <div className="row between" style={{ marginBottom: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>
              🎛️ CONFIGURADOR · ESTIMÁ EL VOLUMEN MENSUAL
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>
              Ajustá cuántos casos resuelve tu agente al mes — el ROI se recalcula al instante.
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => setInputs(DEFAULT_INPUTS)} style={{ fontSize: 11 }}>
            🔁 Reset
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <NumInput label="Tickets asistidos IA" value={inputs.ticketsAssistedByIa}
            onChange={(n) => setInputs({ ...inputs, ticketsAssistedByIa: n })} suffix="0.5-2h c/u" />
          <NumInput label="RCAs generados" value={inputs.rcasGenerated}
            onChange={(n) => setInputs({ ...inputs, rcasGenerated: n })} suffix="2-4h c/u" />
          <NumInput label="Minutas reunión" value={inputs.meetingMinutesGenerated}
            onChange={(n) => setInputs({ ...inputs, meetingMinutesGenerated: n })} suffix="0.5-1h c/u" />
          <NumInput label="Casos de prueba" value={inputs.testCasesGenerated}
            onChange={(n) => setInputs({ ...inputs, testCasesGenerated: n })} suffix="1-3h c/u" />
          <NumInput label="Tickets → KB" value={inputs.knowledgeConversions}
            onChange={(n) => setInputs({ ...inputs, knowledgeConversions: n })} suffix="0.5-1.5h c/u" />
          <NumInput label="Escalamientos evitados" value={inputs.avoidedEscalations}
            onChange={(n) => setInputs({ ...inputs, avoidedEscalations: n })} suffix="2-6h c/u" />
          <NumInput label="Documentos generados" value={inputs.documentsGenerated}
            onChange={(n) => setInputs({ ...inputs, documentsGenerated: n })} suffix="0.5-2h c/u" />
          <NumInput label="Costo/hora consultor USD" value={hourlyCost}
            onChange={(n) => setHourlyCost(n)} suffix="$/hora humano" />
        </div>
      </div>

      {/* Breakdown */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
          📋 DESGLOSE POR CATEGORÍA
        </div>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-soft)", textAlign: "left" }}>
              <th style={{ padding: 6 }}>Categoría</th>
              <th style={{ padding: 6, textAlign: "right" }}>Cantidad</th>
              <th style={{ padding: 6, textAlign: "right" }}>Min horas</th>
              <th style={{ padding: 6, textAlign: "right" }}>Max horas</th>
              <th style={{ padding: 6, textAlign: "right" }}>Costo evitado (USD)</th>
            </tr>
          </thead>
          <tbody>
            {valueCalc.breakdown.map((b) => (
              <tr key={b.category} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: 6 }}>{b.category}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{fmtNum(b.count)}</td>
                <td style={{ padding: 6, textAlign: "right", color: "var(--text-soft)" }}>{b.minHoursTotal}h</td>
                <td style={{ padding: 6, textAlign: "right", color: "var(--text-soft)" }}>{b.maxHoursTotal}h</td>
                <td style={{ padding: 6, textAlign: "right", fontWeight: 600, color: "#10b981" }}>
                  ${(b.minHoursTotal * hourlyCost).toLocaleString("en-US")} — ${(b.maxHoursTotal * hourlyCost).toLocaleString("en-US")}
                </td>
              </tr>
            ))}
            <tr style={{ background: "rgba(16,185,129,0.1)", fontWeight: 700 }}>
              <td style={{ padding: 6 }}>TOTAL</td>
              <td style={{ padding: 6, textAlign: "right" }}>—</td>
              <td style={{ padding: 6, textAlign: "right" }}>{valueCalc.hoursSaved.min}h</td>
              <td style={{ padding: 6, textAlign: "right" }}>{valueCalc.hoursSaved.max}h</td>
              <td style={{ padding: 6, textAlign: "right", color: "#10b981" }}>
                ${valueCalc.costAvoidedUsd.min.toLocaleString("en-US")} — ${valueCalc.costAvoidedUsd.max.toLocaleString("en-US")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3 KPIs auxiliares */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: 14, flex: "1 1 240px", borderLeft: "4px solid #4589ff" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>⏱️ HORAS HUMANAS AHORRADAS</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#4589ff" }}>
            {valueCalc.hoursSaved.min}–{valueCalc.hoursSaved.max}h
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Por mes (estimación)</div>
        </div>
        <div className="card" style={{ padding: 14, flex: "1 1 240px", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>💰 EFICIENCIA</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>
            {roi.roiAvgX == null ? "—" : `$${fmtRoiBare(roi.roiAvgX)} valor / $1 costo`}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>USD generado por USD invertido</div>
        </div>
        <div className="card" style={{ padding: 14, flex: "1 1 240px", borderLeft: "4px solid #a855f7" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--text-dim)" }}>⚡ PAYBACK</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#a855f7" }}>
            {roi.paybackDays == null ? "—" : `${roi.paybackDays.toFixed(1)} días`}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Para recuperar costo de Gemini mensual</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>
        Costos reales del último mes · Valor calculado con configurador editable · Costo/hora consultor: ${hourlyCost} USD
      </div>
    </div>
  );
}
