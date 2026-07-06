"use client";

// =============================================================================
// Refactor Z → Clean Core (HANA)
// =============================================================================
// Pegás código ABAP clásico (objeto Z/Y) y el analizador detecta anti-patrones
// Clean Core / HANA / ABAP Cloud, con el patrón limpio equivalente (antes →
// después) para cada uno. Asistente de triage — la fuente formal sigue siendo
// ATC (variante cloud readiness) + Custom Code Migration.
// =============================================================================

import { useState } from "react";
import { analyzeAbap, SAMPLE_ABAP, type AbapAnalysis, type AbapFinding } from "@/lib/clean-core/abap-analyzer";
import { SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/clean-core/engine";

const CATEGORY_COLORS: Record<string, string> = {
  "HANA performance": "var(--teal, #007d79)",
  "ABAP Cloud": "var(--magenta, #8a3ffc)",
  "Clean Core": "var(--accent, #0f62fe)",
  "Correctness": "#ff832b",
};

function CodeBlock({ label, code, color }: { label: string; code: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <pre style={{
        margin: 0, padding: "8px 10px", borderRadius: 6, fontSize: 11, lineHeight: 1.45,
        background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
        color: "var(--text)", fontFamily: "var(--font-mono, monospace)",
        overflowX: "auto", whiteSpace: "pre",
      }}>{code}</pre>
    </div>
  );
}

function FindingCard({ f }: { f: AbapFinding }) {
  const sc = SEVERITY_COLORS[f.severity];
  const cc = CATEGORY_COLORS[f.category] || "var(--text-dim)";
  return (
    <div className="card" style={{ borderLeft: `3px solid ${sc}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{f.title}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)" }}>línea {f.line}</span>
            <span style={{ color: cc, fontWeight: 700 }}>· {f.category}</span>
          </div>
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, color: sc, border: `1px solid ${sc}`,
          borderRadius: 4, padding: "1px 7px", textTransform: "uppercase", flexShrink: 0,
        }}>{SEVERITY_LABELS[f.severity]}</span>
      </div>

      <div style={{
        fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "var(--text-soft)",
        background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: 4,
        padding: "4px 8px", overflowX: "auto", whiteSpace: "pre",
      }}>{f.snippet}</div>

      <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.45 }}>{f.problem}</div>
      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.45 }}>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>✔ </span>{f.recommendation}
      </div>

      {(f.before || f.after) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {f.before && <CodeBlock label="Antes (clásico)" code={f.before} color="var(--error)" />}
          {f.after && <CodeBlock label="Después (Clean Core / HANA)" code={f.after} color="var(--ok)" />}
        </div>
      )}

      {f.reference && (
        <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
          📎 {f.reference}
        </div>
      )}
    </div>
  );
}

export default function AbapRefactorView() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<AbapAnalysis | null>(null);

  function run(src: string) {
    setResult(analyzeAbap(src));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5 }}>
          Pegá un objeto <b>Z/Y</b> (reporte, include, método, FM…) y ROCCO detecta los anti-patrones que rompen
          Clean Core u optimización HANA, con el patrón limpio equivalente. Es un asistente de triage — la fuente
          formal es <b>ATC</b> (variante cloud readiness) + <b>Custom Code Migration</b>.
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="* Pegá tu código ABAP aquí…&#10;REPORT z_mi_reporte.&#10;  SELECT * FROM mara INTO TABLE lt_mara."
          spellCheck={false}
          style={{
            width: "100%", minHeight: 220, padding: "10px 12px", borderRadius: 6,
            border: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text)",
            fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, lineHeight: 1.5, resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => run(code)} className="btn primary" disabled={!code.trim()} style={{ fontSize: 12.5 }}>
            🔍 Analizar
          </button>
          <button onClick={() => { setCode(SAMPLE_ABAP); run(SAMPLE_ABAP); }} className="btn ghost" style={{ fontSize: 12.5 }}>
            📄 Cargar ejemplo
          </button>
          <button onClick={() => { setCode(""); setResult(null); }} className="btn ghost" style={{ fontSize: 12.5 }}>
            ✕ Limpiar
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Resumen del análisis */}
          <div className="card" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ textAlign: "center", minWidth: 96 }}>
              <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: result.band.color, fontVariantNumeric: "tabular-nums" }}>
                {result.score}
              </div>
              <div style={{ fontSize: 9.5, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase" }}>Readiness HANA/CC</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: result.band.color, marginTop: 2 }}>{result.band.label}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip label="Hallazgos" value={result.findings.length} />
              <Chip label="Críticos" value={result.counts.critical} color={result.counts.critical ? "var(--error)" : undefined} />
              <Chip label="Altos" value={result.counts.high} color={result.counts.high ? "#ff832b" : undefined} />
              <Chip label="LOC" value={result.loc} />
              <div style={{
                padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: result.cloudReady ? "color-mix(in srgb, var(--ok) 14%, transparent)" : "color-mix(in srgb, var(--error) 12%, transparent)",
                color: result.cloudReady ? "var(--ok)" : "var(--error)",
                border: `1px solid ${result.cloudReady ? "var(--ok)" : "var(--error)"}`,
                display: "flex", alignItems: "center",
              }}>
                {result.cloudReady ? "✓ ABAP Cloud ready" : "✗ Bloqueos para ABAP Cloud"}
              </div>
            </div>
          </div>

          {/* Plan de remediación */}
          {result.summary.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>
                ▸ PLAN DE REMEDIACIÓN
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                {result.summary.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.45 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hallazgos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.findings.length === 0 ? (
              <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--ok)", fontSize: 13, fontWeight: 600 }}>
                ✓ Sin anti-patrones detectados. Validá igualmente con ATC (variante cloud readiness).
              </div>
            ) : (
              result.findings.map((f, i) => <FindingCard key={`${f.ruleId}-${f.line}-${i}`} f={f} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 6, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", minWidth: 74 }}>
      <div style={{ fontSize: 9.5, letterSpacing: 0.5, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
