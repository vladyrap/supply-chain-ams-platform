"use client";

import type { SimilarHistoricalCase } from "@/types/estimation";
import { aggregateSimilarCases } from "@/utils/historical-cases-matcher";

interface Props {
  cases: SimilarHistoricalCase[];
}

/**
 * Muestra los casos históricos AMS similares al actual con su actualHours.
 * Da al consultor benchmark contra lo que SÍ pasó antes.
 */
export default function SimilarCasesCard({ cases }: Props) {
  if (cases.length === 0) {
    return (
      <div className="card" style={{ padding: 14, borderLeft: "3px solid #64748b" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 6 }}>
          📚 CASOS HISTÓRICOS SIMILARES
        </div>
        <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
          Sin casos similares en el histórico. Este puede ser un caso nuevo —
          considerá documentarlo bien al cerrar para acelerar futuros.
        </div>
      </div>
    );
  }

  const agg = aggregateSimilarCases(cases);

  return (
    <div className="card" style={{ padding: 14, borderLeft: "3px solid #a855f7" }}>
      <div className="row between" style={{ alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)" }}>
          📚 CASOS HISTÓRICOS SIMILARES ({cases.length})
        </div>
        <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
          mediana <strong style={{ color: "#a855f7" }}>{agg.medianHours}h</strong>
        </div>
      </div>

      <div style={{
        padding: "8px 10px", borderRadius: 4,
        background: "var(--bg-elev-2)", marginBottom: 10,
        fontSize: 11, color: "var(--text-soft)",
      }}>
        Rango histórico: <strong>{agg.minHours}h – {agg.maxHours}h</strong>{" "}
        · promedio <strong>{agg.avgHours}h</strong>
      </div>

      <div className="col" style={{ gap: 8 }}>
        {cases.map((c) => (
          <div key={c.caseId} style={{
            padding: 10, borderRadius: 6,
            background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
          }}>
            <div className="row between" style={{ marginBottom: 4, alignItems: "baseline" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0 }}>
                {c.title}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  sim {(c.similarityScore * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#a855f7" }}>
                  {c.actualResolutionHours}h
                </span>
              </div>
            </div>

            <div className="row" style={{ gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="badge muted" style={{ fontSize: 10 }}>{c.module}</span>
              <span className="badge muted" style={{ fontSize: 10 }}>{c.complexity}</span>
            </div>

            {c.matchedSignals.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginBottom: 4 }}>
                ✓ {c.matchedSignals.slice(0, 3).join(" · ")}
                {c.matchedSignals.length > 3 && ` (+${c.matchedSignals.length - 3})`}
              </div>
            )}

            <details>
              <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
                Solución aplicada
              </summary>
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 4, padding: "4px 0" }}>
                <strong>Causa raíz:</strong> {c.rootCause}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-soft)", paddingBottom: 4 }}>
                <strong>Resolución:</strong> {c.solutionSummary}
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
