"use client";

// Tarjeta de una dimensión Clean Core: score, barra, hallazgos abiertos y
// recomendación destacada. Click → filtra la tabla por esta dimensión.

import type { DimensionResult } from "@/lib/clean-core/types";

interface Props {
  dim: DimensionResult;
  active: boolean;
  onSelect: () => void;
}

export default function DimensionCard({ dim, active, onSelect }: Props) {
  const c = dim.band.color;
  const weightPct = Math.round(dim.def.weight * 100);

  return (
    <button
      onClick={onSelect}
      className="card"
      style={{
        textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${c}`,
        outline: active ? `2px solid var(--accent)` : "none",
        outlineOffset: -1,
        display: "flex", flexDirection: "column", gap: 8, width: "100%",
      }}
      title={`Filtrar hallazgos de ${dim.def.label}`}
    >
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{dim.def.icon}</span>{dim.def.label}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>
            peso {weightPct}% · {dim.openCount} abierto{dim.openCount === 1 ? "" : "s"}
            {dim.criticalOpen > 0 && (
              <span style={{ color: "var(--error)", fontWeight: 700 }}> · {dim.criticalOpen} crít.</span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {dim.score}
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden" }}>
        <div style={{ width: `${dim.score}%`, height: "100%", background: c, transition: "width 500ms ease" }} />
      </div>

      {dim.topRecommendation ? (
        <div style={{ fontSize: 10.5, color: "var(--text-soft)", lineHeight: 1.35 }}>
          💡 {dim.topRecommendation}
        </div>
      ) : (
        <div style={{ fontSize: 10.5, color: "var(--ok)", fontWeight: 600 }}>
          ✓ Sin hallazgos abiertos
        </div>
      )}
    </button>
  );
}
