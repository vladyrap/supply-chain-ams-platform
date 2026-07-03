"use client";

import { useMemo } from "react";
import type { Ticket } from "@/services/tickets.api";
import { computeCalibrationSnapshot } from "@/lib/estimation/engine";

interface Props {
  tickets: Ticket[];
}

/**
 * Tile honest "Estimación · Desviación promedio" para el dashboard.
 *
 * Lee todos los tickets con `actualHours` registradas y muestra:
 * - Cantidad de cierres con horas reales
 * - Desviación promedio (signed): ¿subestimamos o sobreestimamos?
 * - Error medio absoluto (sin signo): qué tan off está en general
 * - % de tickets cuya hora real cayó dentro de la banda min-max
 * - Recomendación del motor (BOOTSTRAP / CALIBRATED)
 *
 * Si todavía no hay >=5 cierres con actualHours, muestra un mensaje
 * "calibrando — 3 de 20 cierres" sin números falsamente precisos.
 *
 * Diseño honesto: si el motor está mal, lo dice. No esconde.
 */
export default function EstimationCalibrationTile({ tickets }: Props) {
  const snapshot = useMemo(() => {
    const estimates = tickets
      .map((t) => t.estimatedResolution)
      .filter((e): e is NonNullable<typeof e> => !!e);
    return computeCalibrationSnapshot(estimates);
  }, [tickets]);

  const { closedTicketsWithActual: n, averageVariancePct, averageAbsVariancePct, withinBandPct, recommendedMode, suggestedAdjustmentFactor } = snapshot;
  const hasData = n >= 1;
  const enoughForCalibration = n >= 20;

  // Color tone according to absolute error
  const tone: "ok" | "warn" | "error" | "muted" = !hasData
    ? "muted"
    : averageAbsVariancePct <= 20
      ? "ok"
      : averageAbsVariancePct <= 40
        ? "warn"
        : "error";
  const accent = tone === "ok" ? "#10b981" : tone === "warn" ? "#f59e0b" : tone === "error" ? "#fa4d56" : "#6b7280";

  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderLeft: `3px solid ${accent}`,
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 1.6, color: "var(--text-dim)", textTransform: "uppercase" }}>
        Estimación · Desviación
      </div>

      {!hasData && (
        <>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-soft)" }}>
            calibrando…
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Sin cierres con horas reales aún. Capturalas al cerrar tickets para
            empezar a medir.
          </div>
        </>
      )}

      {hasData && (
        <>
          <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontVariantNumeric: "tabular-nums" }}>
              {averageVariancePct > 0 ? "+" : ""}{averageVariancePct.toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
              promedio signed (±{averageAbsVariancePct.toFixed(1)}% abs)
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-soft)", lineHeight: 1.5 }}>
            <strong>{withinBandPct.toFixed(0)}%</strong> dentro de la banda ·{" "}
            <strong>{n}</strong> {n === 1 ? "cierre" : "cierres"} con horas reales
            {!enoughForCalibration && ` · faltan ${20 - n} para CALIBRATED`}
          </div>

          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: recommendedMode === "CALIBRATED" ? "#10b98122" : "#f59e0b22",
                color: recommendedMode === "CALIBRATED" ? "#10b981" : "#f59e0b",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {recommendedMode === "CALIBRATED" ? "✓ LISTO PARA CALIBRADO" : "MODO BOOTSTRAP"}
            </span>
            {Math.abs(suggestedAdjustmentFactor - 1) > 0.1 && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "var(--bg-elev-2)",
                  color: "var(--text-soft)",
                  fontFamily: "monospace",
                }}
                title="Factor sugerido para ajustar el motor cuando promovamos a CALIBRATED"
              >
                ×{suggestedAdjustmentFactor.toFixed(2)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
