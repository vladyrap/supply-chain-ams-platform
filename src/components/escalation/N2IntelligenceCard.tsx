"use client";

// UI completa del N2 Escalation Intelligence — muestra verdict + urgency +
// specialists ranked + SLA + playbook + reasoning + risks + missing data.
// Botones de acción para escalar al specialist primary.

import type {
  N2EscalationAnalysis, EscalationSignal,
} from "@/types/n2-escalation-intelligence";
import {
  VERDICT_LABELS, VERDICT_ICONS, VERDICT_COLORS,
  SLA_TIER_LABELS,
} from "@/types/n2-escalation-intelligence";

interface Props {
  analysis: N2EscalationAnalysis;
  onEscalateToSpecialist?: (responsibleId: string) => void;
  compact?: boolean;
}

export default function N2IntelligenceCard({ analysis, onEscalateToSpecialist, compact = false }: Props) {
  const color = VERDICT_COLORS[analysis.verdict];
  const primary = analysis.specialistRecommendations.find((s) => s.isPrimary);

  return (
    <div className="card" style={{ padding: 14, borderLeft: `4px solid ${color}` }}>
      {/* Header con verdict */}
      <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>
            N2 ESCALATION INTELLIGENCE · v{analysis.engineVersion}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color }}>
            {VERDICT_ICONS[analysis.verdict]} {VERDICT_LABELS[analysis.verdict].toUpperCase()}
          </div>
          {analysis.escalateWithinHours != null && (
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 3 }}>
              Recomendado escalar dentro de las próximas <strong>{analysis.escalateWithinHours}h</strong>
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Stat label="Confianza" value={`${analysis.confidenceScore}/100`} color="#4589ff" />
          <Stat label="Urgencia" value={`${analysis.urgencyScore}/100`} color={analysis.urgencyScore >= 70 ? "#fa4d56" : analysis.urgencyScore >= 40 ? "#f59e0b" : "#10b981"} />
        </div>
      </div>

      {/* Executive summary */}
      <div style={{
        padding: 10, borderRadius: 6, marginBottom: 12,
        background: `${color}11`, border: `1px solid ${color}33`,
      }}>
        <div style={{ fontSize: 10, color, letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
          RESUMEN EJECUTIVO
        </div>
        <div style={{ fontSize: 13, color: "var(--text)" }}>
          {analysis.executiveSummary}
        </div>
      </div>

      {/* SLA + Playbook + Rule */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Chip
          label="SLA"
          value={SLA_TIER_LABELS[analysis.slaRecommendation.tier]}
          color="#a855f7"
          tooltip={analysis.slaRecommendation.reasoning}
        />
        {analysis.playbookRecommendation && (
          <Chip
            label="📕 Playbook"
            value={analysis.playbookRecommendation.playbookTitle}
            color="#10b981"
            tooltip={analysis.playbookRecommendation.reason}
          />
        )}
        {analysis.matchedRule && (
          <Chip
            label="📋 Regla"
            value={analysis.matchedRule.name}
            color="#4589ff"
          />
        )}
      </div>

      {/* Specialists ranked */}
      {analysis.specialistRecommendations.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 6 }}>
            ▸ ESPECIALISTAS RECOMENDADOS ({analysis.specialistRecommendations.length})
          </div>
          <div className="col" style={{ gap: 6 }}>
            {analysis.specialistRecommendations.map((s) => (
              <SpecialistRow
                key={s.responsibleId}
                spec={s}
                onEscalate={onEscalateToSpecialist}
                isPrimary={s.isPrimary}
              />
            ))}
          </div>
        </div>
      )}

      {!compact && (
        <>
          {/* Señales push / stay */}
          {(analysis.pushEscalate.length > 0 || analysis.pushStay.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <SignalList signals={analysis.pushEscalate} title="↑ A favor de escalar" color="#fa4d56" />
              <SignalList signals={analysis.pushStay} title="↓ A favor de N1" color="#10b981" />
            </div>
          )}

          {/* Reasoning */}
          {analysis.reasoning.length > 0 && (
            <details style={{ marginBottom: 10 }}>
              <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer", letterSpacing: 1.5 }}>
                📚 RAZONAMIENTO ({analysis.reasoning.length})
              </summary>
              <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 12, color: "var(--text-soft)" }}>
                {analysis.reasoning.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
              </ul>
            </details>
          )}

          {/* Risks */}
          {analysis.risksIfNotEscalated.length > 0 && (
            <div style={{
              padding: 10, borderRadius: 4, marginBottom: 10,
              background: "#fa4d5611", border: "1px solid #fa4d5633",
            }}>
              <div style={{ fontSize: 10, color: "#fa4d56", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
                ⚠ RIESGOS DE NO ESCALAR
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--text-soft)" }}>
                {analysis.risksIfNotEscalated.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Missing data */}
          {analysis.missingData.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#b45309", marginBottom: 4, fontWeight: 700 }}>
                ❓ DATOS FALTANTES ({analysis.missingData.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--text-soft)" }}>
                {analysis.missingData.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          {/* Debug */}
          <details>
            <summary style={{ fontSize: 10, color: "var(--text-dim)", cursor: "pointer" }}>
              🐛 internal · debug
            </summary>
            <div style={{
              marginTop: 6, padding: 8, borderRadius: 4,
              background: "var(--bg-elev)", fontSize: 11, fontFamily: "monospace",
              color: "var(--text-soft)",
            }}>
              {analysis.internalNotes}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "6px 10px", borderRadius: 6, textAlign: "center",
      background: `${color}11`, border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text-dim)" }}>{label}</div>
    </div>
  );
}

function Chip({ label, value, color, tooltip }: { label: string; value: string; color: string; tooltip?: string }) {
  return (
    <div
      title={tooltip}
      style={{
        padding: "5px 10px", borderRadius: 4, fontSize: 11.5,
        background: `${color}11`, border: `1px solid ${color}55`,
        display: "inline-flex", gap: 6, alignItems: "baseline",
        cursor: tooltip ? "help" : "default",
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: 10 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SpecialistRow({
  spec, onEscalate, isPrimary,
}: {
  spec: import("@/types/n2-escalation-intelligence").SpecialistRecommendation;
  onEscalate?: (id: string) => void;
  isPrimary: boolean;
}) {
  const avColor = spec.availability === "AVAILABLE" ? "#10b981"
    : spec.availability === "BUSY" ? "#f59e0b"
    : spec.availability === "ON_CALL" ? "#4589ff"
    : "#fa4d56";

  return (
    <div style={{
      padding: 10, borderRadius: 6,
      background: isPrimary ? "#4589ff11" : "var(--bg-elev)",
      border: isPrimary ? "2px solid #4589ff55" : "1px solid var(--border-soft)",
    }}>
      <div className="row between" style={{ alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, alignItems: "baseline" }}>
            {isPrimary && <span style={{ fontSize: 11, color: "#4589ff", fontWeight: 700 }}>★</span>}
            <span style={{ fontSize: 14, fontWeight: 600 }}>#{spec.rank} {spec.responsibleName}</span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
              score {spec.matchScore}/100
            </span>
          </div>
          {spec.email && (
            <div style={{ fontSize: 10.5, color: "var(--text-soft)", marginTop: 2 }}>
              {spec.email}
            </div>
          )}

          <div className="row" style={{ gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 3,
              background: `${avColor}22`, color: avColor, fontWeight: 600,
            }}>
              {spec.availability}
            </span>
            <span className="badge muted" style={{ fontSize: 10 }}>
              workload {spec.currentWorkloadPct}%
            </span>
            {spec.sapModules.map((m) => (
              <span key={m} className="badge info" style={{ fontSize: 10 }}>{m}</span>
            ))}
            {spec.historicalCasesCount > 0 && (
              <span className="badge muted" style={{ fontSize: 10 }}>
                {spec.historicalCasesCount} casos recientes
              </span>
            )}
          </div>

          {spec.matchReasons.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 4 }}>
              ✓ {spec.matchReasons.slice(0, 3).join(" · ")}
              {spec.matchReasons.length > 3 && ` (+${spec.matchReasons.length - 3})`}
            </div>
          )}

          {spec.estimatedHoursToResolve && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>
              ⏱ Estimación basada en histórico:{" "}
              <strong>{spec.estimatedHoursToResolve.min.toFixed(1)}h – {spec.estimatedHoursToResolve.max.toFixed(1)}h</strong>
            </div>
          )}
        </div>

        {onEscalate && (
          <button
            className="btn primary sm"
            onClick={() => onEscalate(spec.responsibleId)}
            style={{ fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
          >
            🚨 Escalar
          </button>
        )}
      </div>
    </div>
  );
}

function SignalList({ signals, title, color }: { signals: EscalationSignal[]; title: string; color: string }) {
  if (signals.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 10, color, letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>—</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 10, color, letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
        {title} ({signals.length})
      </div>
      <div className="col" style={{ gap: 4 }}>
        {signals.map((s) => (
          <div key={s.id} style={{
            padding: "4px 6px", borderRadius: 3, fontSize: 11.5,
            background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
          }}>
            <div className="row between" style={{ alignItems: "baseline" }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{s.message}</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                w{(s.weight * 100).toFixed(0)}
              </span>
            </div>
            {s.evidence && (
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>{s.evidence}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
