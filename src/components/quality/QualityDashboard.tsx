"use client";

import type { QualityMetrics } from "@/hooks/useQualityEvaluator";
import type { AgentEvaluation } from "@/types/ams-modules";

interface Props {
  metrics: QualityMetrics;
  evaluations: AgentEvaluation[];
}

function ScoreCard({ label, score, max = 5, color = "#22d3ee", icon = "" }: { label: string; score: number; max?: number; color?: string; icon?: string }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="tc-metric" style={{ ["--tc-acc" as never]: color }}>
      <div className="tc-metric-head">
        {icon && <span className="tc-metric-icon">{icon}</span>}
        <span className="tc-metric-label">{label}</span>
      </div>
      <div className="tc-metric-value">{score}</div>
      <div className="tc-bar" style={{ marginTop: 6 }}>
        <div className="tc-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="tc-metric-foot" style={{ marginTop: 4 }}>{pct}% del óptimo</div>
    </div>
  );
}

export default function QualityDashboard({ metrics, evaluations }: Props) {
  if (metrics.count === 0) {
    return (
      <div className="ticket-empty" style={{ padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 13.5, color: "var(--text-soft)" }}>
          Aún no hay evaluaciones. Activá la tab "Por evaluar" para arrancar.
        </div>
      </div>
    );
  }

  const recent = evaluations.slice(0, 5);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="tc-metric-grid">
        <ScoreCard label="Precisión promedio"     score={metrics.avgAccuracy}     color="#22d3ee" icon="🎯" />
        <ScoreCard label="Utilidad promedio"      score={metrics.avgUsefulness}   color="#10b981" icon="💎" />
        <ScoreCard label="Claridad promedio"      score={metrics.avgClarity}      color="#a855f7" icon="✨" />
        <ScoreCard label="Completitud promedio"   score={metrics.avgCompleteness} color="#fbbf24" icon="📋" />
      </div>

      <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="ticket-section-head">
            <span style={{ color: "#ef4444" }}>⚠</span> RIESGOS Y FLAGS
          </div>
          <div className="col" style={{ gap: 8 }}>
            <FlagRow label="🚨 Riesgo alto de alucinación" pct={metrics.pctHighRisk} color="#ef4444" />
            <FlagRow label="👤 Necesitan revisión humana" pct={metrics.pctNeedsReview} color="#fbbf24" />
            <FlagRow label="🎓 Convertibles en conocimiento" pct={metrics.pctCanBecomeKnowledge} color="#10b981" />
            <FlagRow label="📤 Requieren escalamiento" pct={metrics.pctRequiresEscalation} color="#a855f7" />
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>📉</span> TOP MÓDULOS CON BAJA CALIDAD
          </div>
          {metrics.topModulesLowQuality.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Sin datos suficientes aún.</div>
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {metrics.topModulesLowQuality.map((m) => (
                <div key={m.module} className="row between" style={{ alignItems: "center", fontSize: 12.5 }}>
                  <span className="kanban-tag" style={{ borderColor: "rgba(34,211,238,0.4)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>
                    {m.module}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    score <b style={{ color: m.avgScore >= 3.5 ? "#10b981" : m.avgScore >= 2.5 ? "#fbbf24" : "#ef4444" }}>{m.avgScore.toFixed(1)}</b>
                    <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>· {m.count} evals</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>📜</span> EVALUACIONES RECIENTES
        </div>
        <div className="col" style={{ gap: 6 }}>
          {recent.map((e) => {
            const ov = (e.accuracyScore + e.usefulnessScore + e.clarityScore + e.completenessScore) / 4;
            const color = ov >= 4 ? "#10b981" : ov >= 3 ? "#fbbf24" : "#ef4444";
            return (
              <div key={e.id} className="row between" style={{ alignItems: "center", padding: "6px 10px", background: "rgba(15,23,42,0.4)", borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                  <b>{e.incidentId?.slice(0, 8) ?? "—"}</b> · {e.evaluator} ·{" "}
                  <span style={{ color: "var(--text-dim)" }}>{new Date(e.createdAt).toLocaleString("es-CL").slice(0, 16)}</span>
                </div>
                <span className="tc-pill" style={{ background: `${color}20`, border: `1px solid ${color}66`, color }}>
                  ★ {ov.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FlagRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="row between" style={{ fontSize: 12, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div className="tc-bar"><div className="tc-bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}
