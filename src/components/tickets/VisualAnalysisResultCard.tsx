"use client";

// Card que muestra el resultado del análisis visual sobre una imagen del ticket.
// No es persistente — se renderiza desde TemporaryVisualEvidence.visualAnalysis.

import type { VisualErrorAnalysis } from "@/types/visual-evidence";

interface Props {
  analysis: VisualErrorAnalysis;
  consideredForEstimate: boolean;
  onToggleConsider: (next: boolean) => void;
}

const CONF_COLOR = { HIGH: "#10b981", MEDIUM: "#f1c21b", LOW: "#fa4d56" } as const;
const CONF_LABEL = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" } as const;
const MODE_LABEL = {
  AI_VISION: "IA Visión",
  DEMO_SIMULATED: "Demo (heurística)",
  MANUAL_SUMMARY: "Manual",
} as const;

export default function VisualAnalysisResultCard({ analysis, consideredForEstimate, onToggleConsider }: Props) {
  const c = CONF_COLOR[analysis.confidence];
  return (
    <div className="lab-fb-block" style={{ borderLeft: `3px solid ${c}`, marginTop: 8 }}>
      <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, color: c }}>
          🔬 Análisis visual detectado
          <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--text-dim)", fontWeight: 400 }}>
            modo: {MODE_LABEL[analysis.analysisMode]}
          </span>
        </div>
        <span style={{
          padding: "1px 8px", borderRadius: 4, fontSize: 10.5,
          background: `${c}20`, color: c, border: `1px solid ${c}55`,
        }}>
          Confianza: {CONF_LABEL[analysis.confidence]}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
        <Row label="Transacción"    value={analysis.detectedTransaction} />
        <Row label="Código error"   value={analysis.detectedErrorCode} accent="#fa4d56" />
        <Row label="Módulo"         value={analysis.detectedSapModule} accent="#4589ff" />
        <Row label="Proceso"        value={analysis.detectedProcess} />
        <Row label="Subproceso"     value={analysis.detectedSubProcess} />
        <Row label="Ambiente"       value={analysis.detectedEnvironment} />
        <Row label="Severidad"      value={analysis.detectedSeverity} />
      </div>

      {analysis.detectedObjects && Object.keys(analysis.detectedObjects).length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1 }}>OBJETOS SAP DETECTADOS</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {Object.entries(analysis.detectedObjects).map(([k, v]) => v && (
              <span key={k} className="pill" style={{
                fontSize: 10.5, background: "rgba(69,137,255,0.12)", color: "#4589ff",
                border: "1px solid #4589ff55", padding: "1px 8px", borderRadius: 4,
              }}>
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, padding: 8, background: "rgba(15,23,42,0.45)",
                    border: "1px solid var(--border-soft)", borderRadius: 4, fontSize: 12 }}>
        {analysis.summary}
      </div>

      {analysis.estimationHints.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1 }}>HINTS PARA LA ESTIMACIÓN</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 11.5, color: "var(--text-soft)" }}>
            {analysis.estimationHints.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
      )}

      {analysis.missingData.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1 }}>DATOS FALTANTES SUGERIDOS</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 11.5, color: "#8a6d00" }}>
            {analysis.missingData.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <label className="row" style={{
        marginTop: 10, padding: "6px 8px", borderRadius: 4,
        background: consideredForEstimate ? "rgba(16,185,129,0.08)" : "transparent",
        border: `1px solid ${consideredForEstimate ? "#10b98155" : "var(--border-soft)"}`,
        cursor: "pointer", fontSize: 12, gap: 8,
      }}>
        <input type="checkbox" checked={consideredForEstimate}
          onChange={(e) => onToggleConsider(e.target.checked)} />
        <span><strong>Usar este análisis para crear y estimar el ticket</strong></span>
      </label>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value?: string; accent?: string }) {
  if (!value) return null;
  return (
    <div>
      <span style={{ color: "var(--text-dim)" }}>{label}: </span>
      <span style={{ color: accent || "var(--text)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
